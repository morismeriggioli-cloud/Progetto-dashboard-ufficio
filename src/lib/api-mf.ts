import "server-only";

import { getMockDashboardDataset } from "@/lib/mock/dashboard-data";
import { getMockMarketingDataset } from "@/lib/mock/marketing-data";
import { getMockOrdersDataset } from "@/lib/mock/orders-data";

export type MfVendutoRecord = {
  eventId: string;
  eventName: string;
  date: string;
  amount: number;
  tickets: number;
  orderId: string;
};

export type MfEventoRecord = {
  eventId: string;
  eventName: string;
  date: string;
  isActive: boolean;
  venue: string;
};

export type MfOrdineRecord = {
  orderId: string;
  eventId: string;
  eventName: string;
  orderDate: string;
  eventDate?: string;
  amount: number;
  tickets: number;
  sectorName?: string;
  status?: string;
  venue?: string;
  city?: string;
};

export type MfDisponibilitaRecord = {
  eventId: string;
  eventName: string;
  date: string;
  availableTickets: number;
};

export type MfDataset = {
  venduto: MfVendutoRecord[];
  eventi: MfEventoRecord[];
  ordini: MfOrdineRecord[];
  disponibilita: MfDisponibilitaRecord[];
};

export type MfDatasetResult = {
  dataset: MfDataset;
  source: "live" | "mock";
  error: string | null;
};

type EndpointName = "venduto" | "eventi" | "ordini" | "disponibilita";

const ENDPOINT_ENV: Record<EndpointName, string> = {
  venduto: "MF_API_VENDUTO_URL",
  eventi: "MF_API_EVENTI_URL",
  ordini: "MF_API_ORDINI_URL",
  disponibilita: "MF_API_DISPONIBILITA_URL",
};

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const cleaned = value.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) {
    return 0;
  }

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    const decimalSeparator = lastComma > lastDot ? "," : ".";

    if (decimalSeparator === ",") {
      return Number(cleaned.replace(/\./g, "").replace(",", ".")) || 0;
    }

    return Number(cleaned.replace(/,/g, "")) || 0;
  }

  if (hasComma) {
    const normalized = cleaned.replace(/\./g, "").replace(",", ".");
    return Number(normalized) || 0;
  }

  return Number(cleaned) || 0;
}

function parseInteger(value: unknown) {
  return Math.max(0, Math.round(parseNumber(value)));
}

function parseString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseDate(value: unknown) {
  const raw = parseString(value);

  if (!raw) {
    return "";
  }

  const match = raw.match(/\d{4}-\d{2}-\d{2}/);
  if (match) {
    return match[0];
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

function pickFirst<T extends Record<string, unknown>>(row: T, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key];
    }
  }

  return undefined;
}

function extractRows(payload: unknown, preferredKeys: string[] = []): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const source = payload as Record<string, unknown>;

  for (const key of preferredKeys) {
    if (Array.isArray(source[key])) {
      return source[key].filter(
        (item): item is Record<string, unknown> => typeof item === "object" && item !== null
      );
    }
  }

  for (const key of ["data", "items", "results", "result", "records"]) {
    if (Array.isArray(source[key])) {
      return source[key].filter(
        (item): item is Record<string, unknown> => typeof item === "object" && item !== null
      );
    }
  }

  return [];
}

function inferActiveEvent(row: Record<string, unknown>, date: string) {
  const status = String(
    pickFirst(row, ["status", "stato", "eventStatus", "statoEvento", "active"])
  ).toLowerCase();

  if (status.includes("annull") || status.includes("cancel")) {
    return false;
  }

  if (
    status.includes("attiv") ||
    status.includes("active") ||
    status.includes("pubblic") ||
    status.includes("vendita")
  ) {
    return true;
  }

  if (date) {
    return date >= new Date().toISOString().slice(0, 10);
  }

  return true;
}

function normalizeVenduto(payload: unknown) {
  return extractRows(payload, ["venduto", "reportVenduto", "ReportVenduto"]).map((row) => ({
    eventId: parseString(
      pickFirst(row, ["idEvento", "eventoId", "eventId", "id_evento", "codiceEvento"])
    ),
    eventName: parseString(
      pickFirst(row, ["evento", "nomeEvento", "eventName", "titoloEvento", "nome"])
    ),
    date: parseDate(
      pickFirst(row, ["dataVendita", "data", "saleDate", "giorno", "dataEvento"])
    ),
    amount: parseNumber(
      pickFirst(row, ["importo", "totale", "venduto", "amount", "incasso", "revenue"])
    ),
    tickets: parseInteger(
      pickFirst(row, ["biglietti", "tickets", "quantita", "qty", "postiVenduti"])
    ),
    orderId: parseString(
      pickFirst(row, ["idOrdine", "ordineId", "orderId", "id_ordine", "ordine"])
    ),
  }));
}

function normalizeEventi(payload: unknown) {
  return extractRows(payload, ["eventi", "events", "Eventi"]).map((row) => {
    const date = parseDate(
      pickFirst(row, ["dataEvento", "data", "eventDate", "inizio", "startDate"])
    );

    return {
      eventId: parseString(
        pickFirst(row, ["idEvento", "eventoId", "eventId", "id_evento", "codiceEvento"])
      ),
      eventName: parseString(
        pickFirst(row, ["evento", "nomeEvento", "eventName", "titolo", "nome"])
      ),
      date,
      isActive: inferActiveEvent(row, date),
      venue: parseString(
        pickFirst(row, ["location", "venue", "sede", "luogo", "teatro"])
      ),
    };
  });
}

function normalizeOrdini(payload: unknown) {
  return extractRows(payload, ["ordineposto", "ordini", "orders", "OrdinePosto"]).map((row) => ({
    orderId: parseString(
      pickFirst(row, ["idOrdine", "ordineId", "orderId", "id_ordine", "ordine"])
    ),
    eventId: parseString(
      pickFirst(row, ["idEvento", "eventoId", "eventId", "id_evento", "codiceEvento"])
    ),
    eventName: parseString(
      pickFirst(row, ["evento", "nomeEvento", "eventName", "titoloEvento", "nome"])
    ),
    orderDate: parseDate(
      pickFirst(row, ["dataOrdine", "data", "orderDate", "dataEvento"])
    ),
    eventDate: parseDate(
      pickFirst(row, ["dataEvento", "eventDate", "giornoEvento", "event_day"])
    ),
    amount: parseNumber(
      pickFirst(row, ["importo", "totale", "amount", "totaleOrdine", "incasso"])
    ),
    tickets: parseInteger(
      pickFirst(row, ["biglietti", "tickets", "quantita", "qty", "posti"])
    ) || 1,
    sectorName: parseString(
      pickFirst(row, ["settore", "sector", "sectorName", "ordineDiPosto", "seatSection"])
    ),
    status: parseString(
      pickFirst(row, ["stato", "status", "orderStatus", "statoOrdine"])
    ),
    venue: parseString(
      pickFirst(row, ["location", "venue", "sede", "luogo", "teatro"])
    ),
    city: parseString(
      pickFirst(row, ["city", "citta", "comune", "venueCity"])
    ),
  }));
}

function normalizeDisponibilita(payload: unknown) {
  return extractRows(payload, ["disponibilita", "availability", "Disponibilita"]).map((row) => ({
    eventId: parseString(
      pickFirst(row, ["idEvento", "eventoId", "eventId", "id_evento", "codiceEvento"])
    ),
    eventName: parseString(
      pickFirst(row, ["evento", "nomeEvento", "eventName", "titoloEvento", "nome"])
    ),
    date: parseDate(
      pickFirst(row, ["dataEvento", "data", "eventDate", "giorno"])
    ),
    availableTickets: parseInteger(
      pickFirst(row, ["disponibili", "available", "availability", "postiDisponibili"])
    ),
  }));
}

function getAuthHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const token = process.env.MF_API_TOKEN;
  const username = process.env.MF_API_USERNAME;
  const password = process.env.MF_API_PASSWORD;
  const apiKey = process.env.MF_API_KEY;
  const apiKeyHeader = process.env.MF_API_KEY_HEADER;

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (username && password) {
    const encoded = Buffer.from(`${username}:${password}`).toString("base64");
    headers.Authorization = `Basic ${encoded}`;
  }

  if (apiKey && apiKeyHeader) {
    headers[apiKeyHeader] = apiKey;
  }

  return headers;
}

async function fetchJson(endpoint: EndpointName) {
  const url = process.env[ENDPOINT_ENV[endpoint]];

  if (!url) {
    throw new Error(`Endpoint MFapi non configurato: ${ENDPOINT_ENV[endpoint]}`);
  }

  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`MFapi ${endpoint} ha risposto con stato ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(`MFapi ${endpoint} non ha restituito JSON`);
  }

  return response.json();
}

export async function getVenduto() {
  return normalizeVenduto(await fetchJson("venduto"));
}

export async function getEventi() {
  return normalizeEventi(await fetchJson("eventi"));
}

export async function getOrdini() {
  return normalizeOrdini(await fetchJson("ordini"));
}

export async function getDisponibilita() {
  return normalizeDisponibilita(await fetchJson("disponibilita"));
}

function buildMockDataset(): MfDataset {
  const dashboardDataset = getMockDashboardDataset();
  const marketingDataset = getMockMarketingDataset();
  const ordersDataset = getMockOrdersDataset();

  return {
    venduto:
      dashboardDataset.venduto.length > 0
        ? dashboardDataset.venduto
        : marketingDataset.venduto,
    eventi:
      dashboardDataset.eventi.length > 0
        ? dashboardDataset.eventi
        : marketingDataset.eventi,
    ordini: ordersDataset.ordini,
    disponibilita:
      dashboardDataset.disponibilita.length > 0
        ? dashboardDataset.disponibilita
        : marketingDataset.disponibilita,
  };
}

const mockDataset: MfDataset = buildMockDataset();

export async function loadMfApiDataset(): Promise<MfDatasetResult> {
  try {
    const [venduto, eventi, ordini, disponibilita] = await Promise.all([
      getVenduto(),
      getEventi(),
      getOrdini(),
      getDisponibilita(),
    ]);

    return {
      dataset: {
        venduto,
        eventi,
        ordini,
        disponibilita,
      },
      source: "live",
      error: null,
    };
  } catch (error) {
    return {
      dataset: mockDataset,
      source: "mock",
      error: error instanceof Error ? error.message : "Errore sconosciuto MFapi",
    };
  }
}
