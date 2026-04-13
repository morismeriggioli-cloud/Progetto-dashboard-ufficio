export const ADMIN_INVOICES_TABLE = "admin_invoices";
export const DEFAULT_INVOICE_CATEGORY = "Da classificare";

export type DateFilterKey =
  | "today"
  | "7d"
  | "30d"
  | "3m"
  | "6m"
  | "1y"
  | "custom";

export type AdminInvoiceRow = {
  [key: string]: unknown;
  MittenteFattura?: unknown;
  NumeroFattura?: unknown;
  DataFattura?: unknown;
  ImportoPagamento?: unknown;
  ElectronicInvoiceState?: unknown;
  Categoria?: unknown;
};

export type AdminInvoiceRecord = {
  id?: string;
  supplier_name: string;
  invoice_number: string;
  invoice_date: string | null;
  payment_amount: number;
  invoice_state: string;
  is_paid: boolean;
  category: string;
  created_at?: string;
  updated_at?: string;
};

export type AdminInvoiceKpi = {
  paidInvoices: number;
  totalPaidAmount: number;
  paidByCategory: Array<{
    category: string;
    count: number;
    amount: number;
  }>;
};

export const adminInvoiceDateFilters: Array<{ key: DateFilterKey; label: string }> = [
  { key: "today", label: "Oggi" },
  { key: "7d", label: "7g" },
  { key: "30d", label: "30g" },
  { key: "3m", label: "3M" },
  { key: "6m", label: "6M" },
  { key: "1y", label: "1A" },
  { key: "custom", label: "Personalizzato" },
];

export const adminInvoiceStateOptions = [
  "da scaricare",
  "scaricata",
  "pagata",
  "pagamento autorizzato",
] as const;

export const adminInvoiceCategoryOptions = [
  DEFAULT_INVOICE_CATEGORY,
  "Commissioni Nexi",
  "Commissioni SumUp",
  "Commissioni PayPal",
  "Rivendite",
  "Bollette",
  "Auto",
  "Organizzatore",
  "Ristorante",
  "Mobilio",
  "Marketing",
  "Sviluppo e assistenza",
  "Carburanti",
  "Server",
] as const;

function normalizeText(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normalizeHeaderKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function getRowValue(row: AdminInvoiceRow, ...candidateKeys: string[]) {
  const rowEntries = Object.entries(row);
  const normalizedCandidates = new Set(candidateKeys.map(normalizeHeaderKey));

  for (const [key, value] of rowEntries) {
    if (normalizedCandidates.has(normalizeHeaderKey(key))) {
      return value;
    }
  }

  return undefined;
}

function normalizeDateString(value: string) {
  return value.replace(/[.\-]/g, "/").replace(/\s+/g, " ").trim();
}

function normalizeInvoiceState(value: unknown) {
  return normalizeText(value).toLowerCase();
}

export function normalizeCategory(value: unknown) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return DEFAULT_INVOICE_CATEGORY;
  }

  const normalizedKey = normalizeHeaderKey(normalized);

  if (
    normalizedKey === "commissioninexi" ||
    normalizedKey === "comissioninexi" ||
    normalizedKey === "commissionenexi"
  ) {
    return "Commissioni Nexi";
  }

  if (
    normalizedKey === "commissionisumup" ||
    normalizedKey === "comissionisumup" ||
    normalizedKey === "commissionesumup"
  ) {
    return "Commissioni SumUp";
  }

  if (normalizedKey === "commissionipaypal" || normalizedKey === "comissionipaypal") {
    return "Commissioni PayPal";
  }

  if (normalizedKey === "sviluppoeassistenza") {
    return "Sviluppo e assistenza";
  }

  return normalized;
}

function isPaidFromInvoiceState(value: string) {
  return value === "pagata";
}

function excelSerialToIsoDate(value: number) {
  const excelEpoch = Date.UTC(1899, 11, 30);
  const wholeDays = Math.trunc(value);
  const milliseconds = wholeDays * 24 * 60 * 60 * 1000;
  const date = new Date(excelEpoch + milliseconds);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function parseExcelDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return excelSerialToIsoDate(value);
  }

  const text = normalizeDateString(String(value));

  if (!text) {
    return null;
  }

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const [, dayRaw, monthRaw, yearRaw] = slashMatch;
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
    return `${year.padStart(4, "0")}-${monthRaw.padStart(2, "0")}-${dayRaw.padStart(2, "0")}`;
  }

  const isoMatch = text.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

export function parsePaymentAmount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const text = normalizeText(value);
  if (!text) {
    return 0;
  }

  const normalized = text
    .replace(/[\u20AC\s]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mapExcelRowToAdminInvoice(row: AdminInvoiceRow): AdminInvoiceRecord {
  const invoiceState = normalizeInvoiceState(
    getRowValue(row, "ElectronicInvoiceState", "Electronic Invoice State", "Stato Fattura")
  );

  return {
    supplier_name: normalizeText(getRowValue(row, "MittenteFattura", "Mittente Fattura")),
    invoice_number: normalizeText(getRowValue(row, "NumeroFattura", "Numero Fattura")),
    invoice_date: parseExcelDate(getRowValue(row, "DataFattura", "Data Fattura")),
    payment_amount: parsePaymentAmount(getRowValue(row, "ImportoPagamento", "Importo Pagamento")),
    invoice_state: invoiceState,
    is_paid: isPaidFromInvoiceState(invoiceState),
    category: normalizeCategory(getRowValue(row, "Categoria")),
  };
}

export function mapWorksheetToAdminInvoices(rows: AdminInvoiceRow[]) {
  const mappedRows = rows
    .map(mapExcelRowToAdminInvoice)
    .filter((record) => Boolean(record.invoice_number));

  return deduplicateInvoicesByNumber(mappedRows);
}

export function deduplicateInvoicesByNumber(records: AdminInvoiceRecord[]) {
  const deduplicatedRows = new Map<string, AdminInvoiceRecord>();

  records.forEach((record) => {
    deduplicatedRows.set(record.invoice_number.toLowerCase(), record);
  });

  return Array.from(deduplicatedRows.values());
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Non disponibile";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function getCategoryOptions(records: AdminInvoiceRecord[]) {
  const options = new Set<string>(adminInvoiceCategoryOptions);

  records.forEach((record) => {
    if (record.category) {
      options.add(record.category);
    }
  });

  return Array.from(options).sort((a, b) => a.localeCompare(b, "it"));
}

export function getInvoiceStateOptions(records: AdminInvoiceRecord[]) {
  const options = new Set<string>(adminInvoiceStateOptions);

  records.forEach((record) => {
    if (record.invoice_state) {
      options.add(record.invoice_state);
    }
  });

  return Array.from(options).sort((a, b) => a.localeCompare(b, "it"));
}

export function isInvoicePaid(record: AdminInvoiceRecord) {
  return isPaidFromInvoiceState(normalizeInvoiceState(record.invoice_state));
}

export function filterInvoicesByState(records: AdminInvoiceRecord[], invoiceState: string) {
  if (!invoiceState) {
    return records;
  }

  const normalizedState = normalizeInvoiceState(invoiceState);
  return records.filter(
    (record) => normalizeInvoiceState(record.invoice_state) === normalizedState
  );
}

export function filterInvoicesByCategory(records: AdminInvoiceRecord[], category: string) {
  if (!category) {
    return records;
  }

  return records.filter((record) => record.category === category);
}

function getTodayReference() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function shiftMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

function getDateRange(key: DateFilterKey, customFrom: string, customTo: string) {
  const end = getTodayReference();

  switch (key) {
    case "today":
      return { from: end, to: end };
    case "7d":
      return { from: new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6), to: end };
    case "30d":
      return { from: new Date(end.getFullYear(), end.getMonth(), end.getDate() - 29), to: end };
    case "3m":
      return { from: shiftMonths(end, -3), to: end };
    case "6m":
      return { from: shiftMonths(end, -6), to: end };
    case "1y":
      return { from: shiftMonths(end, -12), to: end };
    case "custom": {
      const from = customFrom ? new Date(`${customFrom}T00:00:00`) : null;
      const to = customTo ? new Date(`${customTo}T00:00:00`) : null;
      return { from, to };
    }
    default:
      return { from: null, to: null };
  }
}

export function filterInvoicesByDate(
  records: AdminInvoiceRecord[],
  key: DateFilterKey,
  customFrom: string,
  customTo: string
) {
  const { from, to } = getDateRange(key, customFrom, customTo);

  return records.filter((record) => {
    if (!record.invoice_date) {
      return false;
    }

    const current = new Date(`${record.invoice_date}T00:00:00`);
    if (Number.isNaN(current.getTime())) {
      return false;
    }

    if (from && current < from) {
      return false;
    }

    if (to) {
      const inclusiveTo = new Date(to);
      inclusiveTo.setHours(23, 59, 59, 999);
      if (current > inclusiveTo) {
        return false;
      }
    }

    return true;
  });
}

export function computeAdminInvoiceKpis(records: AdminInvoiceRecord[]): AdminInvoiceKpi {
  const paidRecords = records.filter(isInvoicePaid);
  const paidByCategoryMap = new Map<string, { count: number; amount: number }>();

  paidRecords.forEach((record) => {
    const key = record.category || DEFAULT_INVOICE_CATEGORY;
    const current = paidByCategoryMap.get(key) ?? { count: 0, amount: 0 };
    current.count += 1;
    current.amount += record.payment_amount;
    paidByCategoryMap.set(key, current);
  });

  return {
    paidInvoices: paidRecords.length,
    totalPaidAmount: paidRecords.reduce((sum, record) => sum + record.payment_amount, 0),
    paidByCategory: Array.from(paidByCategoryMap.entries())
      .map(([category, value]) => ({
        category,
        count: value.count,
        amount: value.amount,
      }))
      .sort((left, right) => right.amount - left.amount),
  };
}
