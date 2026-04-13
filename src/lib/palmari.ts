import {
  mockPalmariAssignments,
  mockPalmariDevices,
  mockPalmariOrganizers,
  mockPalmariOrganizerShows,
  type DeviceBaseStatus,
  type PalmareAssignment,
  type PalmareDevice,
  type PalmareOrganizer,
  type PalmareOrganizerShow,
} from "@/lib/mock/palmari-data";

export const PALMARI_DEVICES_TABLE = "devices";
export const PALMARI_ASSIGNMENTS_TABLE = "device_assignments";
export const PALMARI_ORGANIZERS_TABLE = "organizers";
export const PALMARI_ORGANIZER_SHOWS_TABLE = "organizer_shows";

export type PalmareDeviceStatus = 
  | "disponibile"
  | "assegnato" 
  | "in_rientro"
  | "manutenzione"
  | "fuori_uso";

export type PalmareComputedStatus =
  | "Disponibile"
  | "Recuperabile"
  | "Occupato"
  | "In manutenzione"
  | "In rientro"
  | "Fuori uso";

export type PalmareFiltersInput = {
  appliedStatus: "Tutti" | PalmareComputedStatus;
  appliedStartDate: string;
  appliedEndDate: string;
  appliedOrganizerId: string;
};

export type PalmareAssignmentForm = {
  device_id: string;
  organizer_id: string;
  organizer_name: string;
  start_date: string;
  end_date: string;
  notes: string;
};

export type PalmareDeviceForm = {
  code: string;
  name: string;
  base_location: string;
  assigned_gate: string;
  status: PalmareDeviceStatus;
  notes: string;
};

export type PalmareReturnForm = {
  device_id: string;
  notes: string;
  verification_completed: boolean;
  return_date: string;
  returned_by: string;
};

export type PalmareTrackingRecord = {
  id: string;
  palmare_id: string;
  azione: "assegnazione" | "rientro" | "manutenzione" | "disattivazione" | "riattivazione";
  data: string;
  utente: string;
  note: string;
  verificato: boolean;
};

export type PalmareOrganizerForm = {
  organizer_name: string;
  contact_name: string;
  email: string;
  phone: string;
  notes: string;
};

export type PalmareOrganizerShowForm = {
  organizer_id: string;
  show_name: string;
  show_date: string;
  location: string;
  notes: string;
};

export type PalmareDeviceUpdateInput = Pick<PalmareDevice, "notes" | "status">;

export type PalmareImportRecord = Omit<
  PalmareDevice,
  "id" | "created_at" | "code" | "name" | "base_location"
> &
  Partial<Pick<PalmareDevice, "code" | "name" | "base_location">>;

export type PalmareImportSummary = {
  imported: number;
  updated: number;
  failed: number;
};

export type PalmareEnrichedRow = PalmareDevice & {
  computedStatus: PalmareComputedStatus;
  currentOrganizer: PalmareOrganizer | null;
  overlappingAssignment: PalmareAssignment | null;
  organizerShowsInPeriod: PalmareOrganizerShow[];
  outcome: string;
  assignmentHistory: PalmareAssignment[];
};

export type {
  PalmareAssignment,
  PalmareDevice,
  PalmareOrganizer,
  PalmareOrganizerShow,
  DeviceBaseStatus,
};

export function getPalmariMockState() {
  return {
    devices: mockPalmariDevices,
    organizers: mockPalmariOrganizers,
    assignments: mockPalmariAssignments,
    organizerShows: mockPalmariOrganizerShows,
  };
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function generateLegacyFields(input: {
  code: string;
  name: string;
  base_location: string;
  assigned_gate: string;
  status: DeviceBaseStatus;
  notes: string;
  id?: string;
  created_at?: string | null;
  asset_code?: string;
}) {
  return {
    id: String(input.id ?? ""),
    code: input.code,
    name: input.name,
    base_location: input.base_location,
    assigned_gate: input.assigned_gate,
    status: input.status,
    notes: input.notes,
    created_at: input.created_at ?? null,
    external_id: input.code,
    device_name: input.name,
    default_location: input.base_location,
    asset_code: input.asset_code ?? "",
    issuer_enabled: false,
    room: "",
  } satisfies PalmareDevice;
}

function buildDeviceShape(input: {
  id?: string;
  code: string;
  name: string;
  base_location: string;
  assigned_gate: string;
  status: DeviceBaseStatus;
  notes: string;
  created_at?: string | null;
}) {
  return {
    ...(input.id ? { id: String(input.id) } : {}),
    code: input.code,
    name: input.name,
    base_location: input.base_location,
    assigned_gate: input.assigned_gate,
    status: input.status,
    notes: input.notes,
    created_at: input.created_at ?? null,
  };
}

export function normalizePalmareDevice(input: Partial<PalmareDevice>): PalmareDevice {
  const code = normalizeText(input.code || input.external_id);
  const name = normalizeText(input.name || input.device_name);
  const baseLocation = normalizeText(input.base_location || input.default_location);
  const assignedGate = normalizeText(input.assigned_gate);

  return {
    ...generateLegacyFields({
      id: String(input.id ?? ""),
      code,
      name,
      base_location: baseLocation,
      assigned_gate: assignedGate,
      status: normalizeDeviceStatus(input.status),
      notes: normalizeText(input.notes),
      created_at: input.created_at ?? null,
      asset_code: normalizeText(input.asset_code),
    }),
    issuer_enabled: Boolean(input.issuer_enabled),
    room: normalizeText(input.room),
  };
}

export function normalizePalmareOrganizer(input: Partial<PalmareOrganizer>): PalmareOrganizer {
  return {
    id: String(input.id ?? ""),
    organizer_name: normalizeText(input.organizer_name),
    contact_name: normalizeText(input.contact_name),
    email: normalizeText(input.email),
    phone: normalizeText(input.phone),
    notes: normalizeText(input.notes),
    created_at: input.created_at ?? null,
  };
}

export function normalizePalmareAssignment(input: Partial<PalmareAssignment>): PalmareAssignment {
  return {
    id: String(input.id ?? ""),
    device_id: String(input.device_id ?? ""),
    organizer_id: String(input.organizer_id ?? ""),
    start_date: String(input.start_date ?? ""),
    end_date: String(input.end_date ?? ""),
    notes: normalizeText(input.notes),
    created_at: String(input.created_at ?? new Date().toISOString()),
    organizer_name: normalizeText(input.organizer_name),
  };
}

export function normalizePalmareOrganizerShow(
  input: Partial<PalmareOrganizerShow>
): PalmareOrganizerShow {
  return {
    id: String(input.id ?? ""),
    organizer_id: String(input.organizer_id ?? ""),
    show_name: normalizeText(input.show_name),
    show_date: String(input.show_date ?? ""),
    location: normalizeText(input.location),
    notes: normalizeText(input.notes),
    created_at: input.created_at ?? null,
  };
}

export function normalizeDeviceStatus(value: unknown): DeviceBaseStatus {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (
    normalized === "maintenance" ||
    normalized === "manutenzione" ||
    normalized === "in manutenzione"
  ) {
    return "maintenance";
  }

  if (
    normalized === "out_of_service" ||
    normalized === "fuori servizio" ||
    normalized === "non disponibile"
  ) {
    return "out_of_service";
  }

  return "active";
}

export function normalizeIssuerEnabled(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  return ["true", "1", "si", "s", "yes", "y", "attivo", "abilitato"].includes(normalized);
}

export function buildPalmareDeviceRecord(
  form: PalmareDeviceForm,
  existingId?: string
): ReturnType<typeof buildDeviceShape> {
  return buildDeviceShape({
    id: existingId,
    code: form.code,
    name: form.name,
    base_location: form.base_location,
    assigned_gate: form.assigned_gate,
    status: form.status,
    notes: form.notes,
    created_at: new Date().toISOString(),
  });
}

export function buildPalmareOrganizerRecord(
  form: PalmareOrganizerForm,
  existingId?: string
) {
  return {
    ...(existingId ? { id: existingId } : {}),
    organizer_name: form.organizer_name,
    contact_name: form.contact_name,
    email: form.email,
    phone: form.phone,
    notes: form.notes,
    created_at: new Date().toISOString(),
  };
}

export function buildPalmareAssignmentRecord(
  form: PalmareAssignmentForm,
  existingId?: string
) {
  return {
    ...(existingId ? { id: existingId } : {}),
    device_id: form.device_id,
    organizer_id: form.organizer_id,
    organizer_name: form.organizer_name,
    start_date: form.start_date,
    end_date: form.end_date,
    notes: form.notes,
    created_at: new Date().toISOString(),
  };
}

export function buildPalmareOrganizerShowRecord(
  form: PalmareOrganizerShowForm,
  existingId?: string
) {
  return {
    ...(existingId ? { id: existingId } : {}),
    organizer_id: form.organizer_id,
    show_name: form.show_name,
    show_date: form.show_date,
    location: form.location,
    notes: form.notes,
    created_at: new Date().toISOString(),
  };
}

function overlapsRange(assignment: PalmareAssignment, range: { from: string; to: string }) {
  return !(assignment.end_date < range.from || assignment.start_date > range.to);
}

function getOrganizerShowsInPeriod(
  organizerShows: PalmareOrganizerShow[],
  organizerId: string,
  range: { from: string; to: string }
) {
  return organizerShows
    .filter(
      (show) =>
        show.organizer_id === organizerId &&
        show.show_date >= range.from &&
        show.show_date <= range.to
    )
    .sort((a, b) => a.show_date.localeCompare(b.show_date));
}

export function computePalmareStatus(
  device: PalmareDevice,
  overlappingAssignment: PalmareAssignment | null,
  organizerShowsInPeriod: PalmareOrganizerShow[]
): PalmareComputedStatus {
  // Stati diretti dal dispositivo
  if (device.status === "maintenance" || device.status === "out_of_service") {
    return "In manutenzione";
  }
  
  if (device.status === "in_rientro") {
    return "In rientro";
  }
  
  if (device.status === "fuori_uso") {
    return "Fuori uso";
  }
  
  if (device.status === "disponibile") {
    return "Disponibile";
  }
  
  if (device.status === "assegnato") {
    return "Occupato";
  }

  // Logica legacy per stati "active"
  if (overlappingAssignment) {
    return "Occupato";
  }

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const hasRecentShow = organizerShowsInPeriod.some(
    (show) => new Date(show.show_date) >= yesterday
  );

  if (hasRecentShow) {
    return "Recuperabile";
  }

  return "Disponibile";
}

export function getAvailabilityOutcome(status: PalmareComputedStatus) {
  switch (status) {
    case "Disponibile":
      return "Nessuna assegnazione nel periodo, palmare disponibile a magazzino.";
    case "Recuperabile":
      return "Assegnazione sovrapposta ma nessuno spettacolo nel periodo: palmare recuperabile.";
    case "Occupato":
      return "Assegnazione sovrapposta con almeno uno spettacolo nel periodo: palmare impegnato.";
    case "In manutenzione":
      return "Palmare escluso dalla disponibilita per stato tecnico.";
    default:
      return "";
  }
}

export function getPalmareStatusClasses(status: PalmareComputedStatus) {
  switch (status) {
    case "Disponibile":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Recuperabile":
      return "border border-amber-200 bg-amber-50 text-amber-700";
    case "Occupato":
      return "border border-rose-200 bg-rose-50 text-rose-700";
    case "In manutenzione":
      return "border border-slate-200 bg-slate-100 text-slate-700";
    case "In rientro":
      return "border border-blue-200 bg-blue-50 text-blue-700";
    case "Fuori uso":
      return "border border-red-200 bg-red-50 text-red-700";
    default:
      return "border border-slate-200 bg-slate-100 text-slate-700";
  }
}

export function buildPalmareRows(
  devices: PalmareDevice[],
  organizers: PalmareOrganizer[],
  assignments: PalmareAssignment[],
  organizerShows: PalmareOrganizerShow[],
  filters: PalmareFiltersInput
) {
  const range = {
    from: filters.appliedStartDate,
    to: filters.appliedEndDate,
  };

  return devices
    .map((device) => {
      const assignmentHistory = assignments
        .filter((assignment) => assignment.device_id === device.id)
        .sort((a, b) => b.start_date.localeCompare(a.start_date));
      const overlappingAssignment =
        assignmentHistory.find((assignment) => overlapsRange(assignment, range)) ?? null;
      const currentOrganizer =
        organizers.find((organizer) => organizer.id === overlappingAssignment?.organizer_id) ?? null;
      const organizerShowsInPeriod = overlappingAssignment
        ? getOrganizerShowsInPeriod(organizerShows, overlappingAssignment.organizer_id, range)
        : [];
      const computedStatus = computePalmareStatus(
        device,
        overlappingAssignment,
        organizerShowsInPeriod
      );

      return {
        ...device,
        computedStatus,
        currentOrganizer,
        overlappingAssignment,
        organizerShowsInPeriod,
        outcome: getAvailabilityOutcome(computedStatus),
        assignmentHistory,
      } satisfies PalmareEnrichedRow;
    })
    .filter((row) => {
      if (filters.appliedStatus !== "Tutti" && row.computedStatus !== filters.appliedStatus) {
        return false;
      }

      if (filters.appliedOrganizerId && row.currentOrganizer?.id !== filters.appliedOrganizerId) {
        return false;
      }

      return true;
    });
}

export function computePalmariKpis(rows: PalmareEnrichedRow[]) {
  return {
    total: rows.length,
    available: rows.filter((row) => row.computedStatus === "Disponibile").length,
    recoverable: rows.filter((row) => row.computedStatus === "Recuperabile").length,
    occupied: rows.filter((row) => row.computedStatus === "Occupato").length,
    maintenance: rows.filter((row) => row.computedStatus === "In manutenzione").length,
    inReturn: rows.filter((row) => row.computedStatus === "In rientro").length,
    outOfService: rows.filter((row) => row.computedStatus === "Fuori uso").length,
  };
}

export function getPalmariOrganizerOptions(organizers: PalmareOrganizer[]) {
  return [...organizers].sort((a, b) =>
    a.organizer_name.localeCompare(b.organizer_name, "it")
  );
}

export function getPalmariLocationOptions(devices: PalmareDevice[]) {
  return Array.from(new Set(devices.map((device) => device.base_location)))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "it"));
}

export function createEntityId(prefix: string, size: number) {
  return `${prefix}-${String(size + 1).padStart(3, "0")}`;
}

export function getBaseStatusLabel(status: DeviceBaseStatus) {
  switch (status) {
    case "maintenance":
      return "In manutenzione";
    case "out_of_service":
      return "Fuori servizio";
    default:
      return "Attivo";
  }
}
