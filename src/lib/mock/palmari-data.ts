export type DeviceBaseStatus = "active" | "maintenance" | "out_of_service" | "disponibile" | "assegnato" | "in_rientro" | "manutenzione" | "fuori_uso";

export type PalmareDevice = {
  id: string;
  code: string;
  name: string;
  base_location: string;
  assigned_gate: string;
  status: DeviceBaseStatus;
  notes: string;
  created_at?: string | null;
  external_id: string;
  device_name: string;
  default_location: string;
  asset_code: string;
  issuer_enabled: boolean;
  room: string;
};

export type PalmareOrganizer = {
  id: string;
  organizer_name: string;
  contact_name: string;
  email: string;
  phone: string;
  notes: string;
  created_at?: string | null;
};

export type PalmareAssignment = {
  id: string;
  device_id: string;
  organizer_id: string;
  start_date: string;
  end_date: string;
  notes: string;
  created_at: string;
  organizer_name?: string;
};

export type PalmareOrganizerShow = {
  id: string;
  organizer_id: string;
  show_name: string;
  show_date: string;
  location: string;
  notes: string;
  created_at?: string | null;
};

export const mockPalmariDevices: PalmareDevice[] = [
  {
    id: "DEV-001",
    code: "PALM-001",
    name: "Zebra TC26 Ingressi Nord",
    base_location: "Milano Forum",
    assigned_gate: "Varco A1",
    status: "active",
    notes: "Palmare operativo per controllo accessi e accrediti.",
    created_at: "2026-03-01T09:00:00Z",
    external_id: "PALM-001",
    device_name: "Zebra TC26 Ingressi Nord",
    default_location: "Milano Forum",
    asset_code: "101",
    issuer_enabled: true,
    room: "Sala Accrediti",
  },
  {
    id: "DEV-002",
    code: "PALM-002",
    name: "Zebra TC21 Premium Desk",
    base_location: "Milano Forum",
    assigned_gate: "Varco VIP 2",
    status: "active",
    notes: "Configurazione premium per flussi ospitalita.",
    created_at: "2026-03-01T09:30:00Z",
    external_id: "PALM-002",
    device_name: "Zebra TC21 Premium Desk",
    default_location: "Milano Forum",
    asset_code: "102",
    issuer_enabled: true,
    room: "Hospitality",
  },
  {
    id: "DEV-003",
    code: "PALM-003",
    name: "Honeywell CT40 Accrediti",
    base_location: "Roma Arena",
    assigned_gate: "Backstage B",
    status: "maintenance",
    notes: "Bloccato in manutenzione fino a nuovo collaudo.",
    created_at: "2026-03-02T10:00:00Z",
    external_id: "PALM-003",
    device_name: "Honeywell CT40 Accrediti",
    default_location: "Roma Arena",
    asset_code: "207",
    issuer_enabled: false,
    room: "Control Room",
  },
  {
    id: "DEV-004",
    code: "PALM-004",
    name: "Zebra TC26K Hospitality",
    base_location: "Roma Arena",
    assigned_gate: "VIP Lounge",
    status: "active",
    notes: "Unità hospitality multiuso.",
    created_at: "2026-03-02T10:30:00Z",
    external_id: "PALM-004",
    device_name: "Zebra TC26K Hospitality",
    default_location: "Roma Arena",
    asset_code: "209",
    issuer_enabled: true,
    room: "Sala Ospiti",
  },
  {
    id: "DEV-005",
    code: "PALM-005",
    name: "Sunmi L2K Formazione",
    base_location: "Bologna Hub",
    assigned_gate: "Magazzino",
    status: "out_of_service",
    notes: "Fuori servizio ma tracciato in inventario.",
    created_at: "2026-03-03T08:45:00Z",
    external_id: "PALM-005",
    device_name: "Sunmi L2K Formazione",
    default_location: "Bologna Hub",
    asset_code: "305",
    issuer_enabled: false,
    room: "Training Lab",
  },
  {
    id: "DEV-006",
    code: "PALM-006",
    name: "Zebra TC22 Biglietteria",
    base_location: "Torino Live District",
    assigned_gate: "Desk 3",
    status: "active",
    notes: "Palmare polivalente per emissione e controllo accessi.",
    created_at: "2026-03-03T09:30:00Z",
    external_id: "PALM-006",
    device_name: "Zebra TC22 Biglietteria",
    default_location: "Torino Live District",
    asset_code: "411",
    issuer_enabled: true,
    room: "Front Office",
  },
];

export const mockPalmariOrganizers: PalmareOrganizer[] = [
  {
    id: "ORG-001",
    organizer_name: "Live Nation Italia",
    contact_name: "Martina Rinaldi",
    email: "operations@livenation.example",
    phone: "+39 02 5555 1101",
    notes: "Organizer con richieste frequenti su Milano.",
    created_at: "2026-03-10T08:00:00Z",
  },
  {
    id: "ORG-002",
    organizer_name: "Arena Eventi Verona",
    contact_name: "Paolo Fontana",
    email: "desk@arenaeventi.example",
    phone: "+39 045 5500 221",
    notes: "Gestione premium desk e accrediti.",
    created_at: "2026-03-10T08:30:00Z",
  },
  {
    id: "ORG-003",
    organizer_name: "Roma Summer Group",
    contact_name: "Giulia Ferretti",
    email: "show@romasummer.example",
    phone: "+39 06 4400 981",
    notes: "Organizer hospitality per date estive.",
    created_at: "2026-03-10T09:00:00Z",
  },
];

export const mockPalmariAssignments: PalmareAssignment[] = [
  {
    id: "ASS-001",
    device_id: "DEV-001",
    organizer_id: "ORG-001",
    organizer_name: "Live Nation Italia",
    start_date: "2026-03-21",
    end_date: "2026-03-29",
    notes: "Presidio accessi organizer.",
    created_at: "2026-03-19T10:15:00Z",
  },
  {
    id: "ASS-002",
    device_id: "DEV-002",
    organizer_id: "ORG-002",
    organizer_name: "Arena Eventi Verona",
    start_date: "2026-03-24",
    end_date: "2026-03-31",
    notes: "Desk premium e accrediti.",
    created_at: "2026-03-20T08:45:00Z",
  },
  {
    id: "ASS-003",
    device_id: "DEV-004",
    organizer_id: "ORG-003",
    organizer_name: "Roma Summer Group",
    start_date: "2026-03-18",
    end_date: "2026-03-25",
    notes: "Hospitality organizer.",
    created_at: "2026-03-16T12:20:00Z",
  },
];

export const mockPalmariOrganizerShows: PalmareOrganizerShow[] = [
  {
    id: "SHOW-001",
    organizer_id: "ORG-001",
    show_name: "Milano Indie Night",
    show_date: "2026-03-27",
    location: "Milano Forum",
    notes: "Produzione serale con accessi separati.",
    created_at: "2026-03-15T08:00:00Z",
  },
  {
    id: "SHOW-002",
    organizer_id: "ORG-002",
    show_name: "Verona Premium Gala",
    show_date: "2026-03-29",
    location: "Verona Premium Hall",
    notes: "Flusso ospiti e accrediti corporate.",
    created_at: "2026-03-15T08:30:00Z",
  },
  {
    id: "SHOW-003",
    organizer_id: "ORG-003",
    show_name: "Roma Hospitality Preview",
    show_date: "2026-03-18",
    location: "Roma Arena",
    notes: "Evento preview hospitality.",
    created_at: "2026-03-15T09:00:00Z",
  },
];
