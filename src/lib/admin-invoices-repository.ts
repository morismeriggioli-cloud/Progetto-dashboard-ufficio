import { supabase } from "@/lib/supabase";
import {
  ADMIN_INVOICES_TABLE,
  deduplicateInvoicesByNumber,
  normalizeCategory,
  type AdminInvoiceRecord,
} from "@/lib/admin-invoices";

function isMissingInvoiceNumberConstraintError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("invoice_number") && normalized.includes("schema cache");
}

function isRlsError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("row-level security policy");
}

function sortInvoices(records: AdminInvoiceRecord[]) {
  return [...deduplicateInvoicesByNumber(records.map((record) => ({
    ...record,
    category: normalizeCategory(record.category),
  })))].sort((left, right) =>
    (right.invoice_date ?? "").localeCompare(left.invoice_date ?? "")
  );
}

export async function fetchAdminInvoices() {
  const { data, error } = await supabase
    .from(ADMIN_INVOICES_TABLE)
    .select("*")
    .order("invoice_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return sortInvoices((data ?? []) as AdminInvoiceRecord[]);
}

async function fallbackSaveByInvoiceNumber(records: AdminInvoiceRecord[]) {
  const invoiceNumbers = records.map((record) => record.invoice_number);

  const { data: existingRows, error: existingRowsError } = await supabase
    .from(ADMIN_INVOICES_TABLE)
    .select("*")
    .in("invoice_number", invoiceNumbers);

  if (existingRowsError) {
    if (isRlsError(existingRowsError.message)) {
      throw new Error(
        `${existingRowsError.message}. Configura le policy RLS su admin_invoices per consentire select agli utenti interni autorizzati.`
      );
    }

    throw new Error(existingRowsError.message);
  }

  const existingByInvoiceNumber = new Map<string, AdminInvoiceRecord[]>();
  ((existingRows ?? []) as AdminInvoiceRecord[]).forEach((record) => {
    const key = record.invoice_number.toLowerCase();
    const currentRecords = existingByInvoiceNumber.get(key) ?? [];
    currentRecords.push(record);
    existingByInvoiceNumber.set(key, currentRecords);
  });

  const toInsert = records.filter(
    (record) => !existingByInvoiceNumber.has(record.invoice_number.toLowerCase())
  );
  const toUpdate = records.filter((record) =>
    existingByInvoiceNumber.has(record.invoice_number.toLowerCase())
  );

  const savedRows: AdminInvoiceRecord[] = [];

  if (toInsert.length > 0) {
    const { data: insertedRows, error: insertError } = await supabase
      .from(ADMIN_INVOICES_TABLE)
      .insert(toInsert)
      .select("*");

    if (insertError) {
      if (isRlsError(insertError.message)) {
        throw new Error(
          `${insertError.message}. Configura le policy RLS su admin_invoices per consentire insert agli utenti interni autorizzati.`
        );
      }

      throw new Error(insertError.message);
    }

    savedRows.push(...((insertedRows ?? []) as AdminInvoiceRecord[]));
  }

  for (const record of toUpdate) {
    const { data: updatedRows, error: updateError } = await supabase
      .from(ADMIN_INVOICES_TABLE)
      .update({
        supplier_name: record.supplier_name,
        invoice_date: record.invoice_date,
        payment_amount: record.payment_amount,
        invoice_state: record.invoice_state,
        is_paid: record.is_paid,
        category: record.category,
      })
      .eq("invoice_number", record.invoice_number)
      .select("*");

    if (updateError) {
      if (isRlsError(updateError.message)) {
        throw new Error(
          `${updateError.message}. Configura le policy RLS su admin_invoices per consentire update agli utenti interni autorizzati.`
        );
      }

      throw new Error(updateError.message);
    }

    savedRows.push(...((updatedRows ?? []) as AdminInvoiceRecord[]));
  }

  return sortInvoices(savedRows);
}

export async function upsertAdminInvoices(records: AdminInvoiceRecord[]) {
  if (records.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from(ADMIN_INVOICES_TABLE)
    .upsert(records, { onConflict: "invoice_number" })
    .select("*");

  if (error && isMissingInvoiceNumberConstraintError(error.message)) {
    return fallbackSaveByInvoiceNumber(records);
  }

  if (error) {
    if (isRlsError(error.message)) {
      throw new Error(
        `${error.message}. Configura le policy RLS su admin_invoices per consentire insert/select/update agli utenti interni autorizzati.`
      );
    }

    throw new Error(error.message);
  }

  return sortInvoices((data ?? []) as AdminInvoiceRecord[]);
}

export async function updateAdminInvoiceCategory(id: string, category: string) {
  const { data, error } = await supabase
    .from(ADMIN_INVOICES_TABLE)
    .update({ category })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (isRlsError(error.message)) {
      throw new Error(
        `${error.message}. Configura le policy RLS su admin_invoices per consentire update agli utenti interni autorizzati.`
      );
    }

    throw new Error(error.message);
  }

  return data as AdminInvoiceRecord;
}
