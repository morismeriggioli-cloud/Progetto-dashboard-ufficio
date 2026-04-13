import { supabase } from "@/lib/supabase";
import {
  PALMARI_ASSIGNMENTS_TABLE,
  PALMARI_DEVICES_TABLE,
  PALMARI_ORGANIZERS_TABLE,
  PALMARI_ORGANIZER_SHOWS_TABLE,
  buildPalmareAssignmentRecord,
  buildPalmareDeviceRecord,
  buildPalmareOrganizerRecord,
  buildPalmareOrganizerShowRecord,
  normalizePalmareAssignment,
  normalizePalmareDevice,
  normalizePalmareOrganizer,
  normalizePalmareOrganizerShow,
  type PalmareAssignment,
  type PalmareAssignmentForm,
  type PalmareDevice,
  type PalmareDeviceForm,
  type PalmareDeviceUpdateInput,
  type PalmareImportRecord,
  type PalmareImportSummary,
  type PalmareOrganizer,
  type PalmareOrganizerForm,
  type PalmareOrganizerShow,
  type PalmareOrganizerShowForm,
  type PalmareReturnForm,
  type PalmareTrackingRecord,
} from "@/lib/palmari";

export const PALMARI_TRACKING_TABLE = "device_tracking";

function isRlsError(message: string) {
  return message.toLowerCase().includes("row-level security policy");
}

function withRlsHint(message: string, operation: string, table: string) {
  if (!isRlsError(message)) {
    return message;
  }

  return `${message}. Configura le policy RLS su ${table} per consentire ${operation} agli utenti interni autorizzati.`;
}

export async function fetchPalmariDevices() {
  const { data, error } = await supabase
    .from(PALMARI_DEVICES_TABLE)
    .select("*")
    .order("base_location", { ascending: true })
    .order("code", { ascending: true });

  if (error) {
    throw new Error(withRlsHint(error.message, "select", PALMARI_DEVICES_TABLE));
  }

  return ((data ?? []) as Partial<PalmareDevice>[]).map(normalizePalmareDevice);
}

export async function fetchPalmariOrganizers() {
  const { data, error } = await supabase
    .from(PALMARI_ORGANIZERS_TABLE)
    .select("*")
    .order("organizer_name", { ascending: true });

  if (error) {
    throw new Error(withRlsHint(error.message, "select", PALMARI_ORGANIZERS_TABLE));
  }

  return ((data ?? []) as Partial<PalmareOrganizer>[]).map(normalizePalmareOrganizer);
}

export async function fetchPalmariAssignments() {
  const { data, error } = await supabase
    .from(PALMARI_ASSIGNMENTS_TABLE)
    .select("*")
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(withRlsHint(error.message, "select", PALMARI_ASSIGNMENTS_TABLE));
  }

  return ((data ?? []) as Partial<PalmareAssignment>[]).map(normalizePalmareAssignment);
}

export async function fetchPalmariOrganizerShows() {
  const { data, error } = await supabase
    .from(PALMARI_ORGANIZER_SHOWS_TABLE)
    .select("*")
    .order("show_date", { ascending: true });

  if (error) {
    throw new Error(withRlsHint(error.message, "select", PALMARI_ORGANIZER_SHOWS_TABLE));
  }

  return ((data ?? []) as Partial<PalmareOrganizerShow>[]).map(normalizePalmareOrganizerShow);
}

export async function createPalmareDevice(input: PalmareDeviceForm) {
  const record = buildPalmareDeviceRecord(input);
  const { data, error } = await supabase
    .from(PALMARI_DEVICES_TABLE)
    .insert(record)
    .select("*")
    .single();

  if (error) {
    throw new Error(withRlsHint(error.message, "insert", PALMARI_DEVICES_TABLE));
  }

  return normalizePalmareDevice(data as Partial<PalmareDevice>);
}

export async function createPalmareOrganizer(input: PalmareOrganizerForm) {
  const record = buildPalmareOrganizerRecord(input);
  const { data, error } = await supabase
    .from(PALMARI_ORGANIZERS_TABLE)
    .insert(record)
    .select("*")
    .single();

  if (error) {
    throw new Error(withRlsHint(error.message, "insert", PALMARI_ORGANIZERS_TABLE));
  }

  return normalizePalmareOrganizer(data as Partial<PalmareOrganizer>);
}

export async function createPalmareAssignment(input: PalmareAssignmentForm) {
  const record = buildPalmareAssignmentRecord(input);
  const { data, error } = await supabase
    .from(PALMARI_ASSIGNMENTS_TABLE)
    .insert(record)
    .select("*")
    .single();

  if (error) {
    throw new Error(withRlsHint(error.message, "insert", PALMARI_ASSIGNMENTS_TABLE));
  }

  return normalizePalmareAssignment(data as Partial<PalmareAssignment>);
}

export async function createPalmareOrganizerShow(input: PalmareOrganizerShowForm) {
  const record = buildPalmareOrganizerShowRecord(input);
  const { data, error } = await supabase
    .from(PALMARI_ORGANIZER_SHOWS_TABLE)
    .insert(record)
    .select("*")
    .single();

  if (error) {
    throw new Error(withRlsHint(error.message, "insert", PALMARI_ORGANIZER_SHOWS_TABLE));
  }

  return normalizePalmareOrganizerShow(data as Partial<PalmareOrganizerShow>);
}

export async function updatePalmareDeviceRecord(id: string, input: PalmareDeviceForm) {
  const record = buildPalmareDeviceRecord(input, id);
  const { data, error } = await supabase
    .from(PALMARI_DEVICES_TABLE)
    .update(record)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(withRlsHint(error.message, "update", PALMARI_DEVICES_TABLE));
  }

  return normalizePalmareDevice(data as Partial<PalmareDevice>);
}

export async function updatePalmareOrganizer(id: string, input: PalmareOrganizerForm) {
  const record = buildPalmareOrganizerRecord(input, id);
  const { data, error } = await supabase
    .from(PALMARI_ORGANIZERS_TABLE)
    .update(record)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(withRlsHint(error.message, "update", PALMARI_ORGANIZERS_TABLE));
  }

  return normalizePalmareOrganizer(data as Partial<PalmareOrganizer>);
}

export async function deletePalmareDevice(id: string) {
  const { error } = await supabase.from(PALMARI_DEVICES_TABLE).delete().eq("id", id);

  if (error) {
    throw new Error(withRlsHint(error.message, "delete", PALMARI_DEVICES_TABLE));
  }
}

export async function updatePalmareDevice(id: string, input: Partial<PalmareDeviceUpdateInput>) {
  const { data, error } = await supabase
    .from(PALMARI_DEVICES_TABLE)
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(withRlsHint(error.message, "update", PALMARI_DEVICES_TABLE));
  }

  return normalizePalmareDevice(data as Partial<PalmareDevice>);
}

export async function upsertPalmariDevices(records: PalmareImportRecord[]): Promise<PalmareImportSummary> {
  if (records.length === 0) {
    return { imported: 0, updated: 0, failed: 0 };
  }

  const dedupedMap = new Map<string, PalmareImportRecord>();
  records.forEach((record) => {
    dedupedMap.set(record.external_id.toLowerCase(), record);
  });

  const dedupedRecords = Array.from(dedupedMap.values());
  const externalIds = dedupedRecords.map((record) => record.external_id);

  const { data: existingRows, error: existingError } = await supabase
    .from(PALMARI_DEVICES_TABLE)
    .select("external_id")
    .in("external_id", externalIds);

  if (existingError) {
    throw new Error(withRlsHint(existingError.message, "select", PALMARI_DEVICES_TABLE));
  }

  const existingIds = new Set(
    ((existingRows ?? []) as { external_id: string }[]).map((row) => row.external_id.toLowerCase())
  );

  const { error } = await supabase
    .from(PALMARI_DEVICES_TABLE)
    .upsert(dedupedRecords, { onConflict: "external_id" });

  if (error) {
    throw new Error(withRlsHint(error.message, "insert/update", PALMARI_DEVICES_TABLE));
  }

  const updated = dedupedRecords.filter((record) => existingIds.has(record.external_id.toLowerCase())).length;
  const imported = dedupedRecords.length - updated;

  return {
    imported,
    updated,
    failed: 0,
  };
}

export async function returnPalmareDevice(returnForm: PalmareReturnForm): Promise<void> {
  const { error } = await supabase
    .from(PALMARI_DEVICES_TABLE)
    .update({ 
      status: "disponibile",
      notes: returnForm.notes 
    })
    .eq("id", returnForm.device_id);

  if (error) {
    throw new Error(withRlsHint(error.message, "update", PALMARI_DEVICES_TABLE));
  }

  // Crea record di tracking
  const trackingRecord: Omit<PalmareTrackingRecord, "id"> = {
    palmare_id: returnForm.device_id,
    azione: "rientro",
    data: returnForm.return_date,
    utente: returnForm.returned_by,
    note: returnForm.notes,
    verificato: returnForm.verification_completed,
  };

  const { error: trackingError } = await supabase
    .from(PALMARI_TRACKING_TABLE)
    .insert(trackingRecord);

  if (trackingError) {
    throw new Error(withRlsHint(trackingError.message, "insert", PALMARI_TRACKING_TABLE));
  }
}

export async function fetchPalmareTracking(deviceId?: string): Promise<PalmareTrackingRecord[]> {
  let query = supabase
    .from(PALMARI_TRACKING_TABLE)
    .select("*")
    .order("data", { ascending: false });

  if (deviceId) {
    query = query.eq("palmare_id", deviceId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(withRlsHint(error.message, "select", PALMARI_TRACKING_TABLE));
  }

  return data || [];
}

export async function updatePalmareStatus(deviceId: string, status: string, notes: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from(PALMARI_DEVICES_TABLE)
    .update({ status, notes })
    .eq("id", deviceId);

  if (error) {
    throw new Error(withRlsHint(error.message, "update", PALMARI_DEVICES_TABLE));
  }

  // Crea record di tracking
  const trackingRecord: Omit<PalmareTrackingRecord, "id"> = {
    palmare_id: deviceId,
    azione: status === "manutenzione" ? "manutenzione" : status === "fuori_uso" ? "disattivazione" : "riattivazione",
    data: new Date().toISOString(),
    utente: userId,
    note: notes,
    verificato: false,
  };

  const { error: trackingError } = await supabase
    .from(PALMARI_TRACKING_TABLE)
    .insert(trackingRecord);

  if (trackingError) {
    throw new Error(withRlsHint(trackingError.message, "insert", PALMARI_TRACKING_TABLE));
  }
}
