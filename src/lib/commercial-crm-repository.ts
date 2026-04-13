import { supabase } from "@/lib/supabase";
import {
  COMMERCIAL_LEADS_TABLE,
  COMMERCIAL_OFFERS_BUCKET,
  normalizeCommercialLead,
  type CommercialLead,
  type CommercialLeadInput,
  type CommercialLeadStatus,
} from "@/lib/commercial-crm";

function normalizeLeadList(leads: Partial<CommercialLead>[]) {
  return leads.map(normalizeCommercialLead);
}

export async function fetchCommercialLeads() {
  const { data, error } = await supabase
    .from(COMMERCIAL_LEADS_TABLE)
    .select("*")
    .order("contact_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return normalizeLeadList((data ?? []) as Partial<CommercialLead>[]);
}

export async function createCommercialLead(input: CommercialLeadInput) {
  const { data, error } = await supabase
    .from(COMMERCIAL_LEADS_TABLE)
    .insert(input)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeCommercialLead(data as Partial<CommercialLead>);
}

export async function updateCommercialLead(id: string, input: Partial<CommercialLeadInput>) {
  const { data, error } = await supabase
    .from(COMMERCIAL_LEADS_TABLE)
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeCommercialLead(data as Partial<CommercialLead>);
}

export async function updateCommercialLeadStatus(id: string, status: CommercialLeadStatus) {
  return updateCommercialLead(id, { status });
}

export async function deleteCommercialLead(id: string) {
  const { data, error } = await supabase
    .from(COMMERCIAL_LEADS_TABLE)
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.id) {
    throw new Error(
      "Nessun lead eliminato. Verifica le policy RLS di delete su commercial_leads."
    );
  }
}

export async function uploadCommercialOfferPdf(file: File, userId: string) {
  const fileExtension = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const filePath = `${userId}/${Date.now()}-${safeName}.${fileExtension === "pdf" ? "pdf" : fileExtension}`;

  const { error } = await supabase.storage
    .from(COMMERCIAL_OFFERS_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/pdf",
    });

  if (error) {
    throw new Error(error.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(COMMERCIAL_OFFERS_BUCKET).getPublicUrl(filePath);

  return publicUrl;
}
