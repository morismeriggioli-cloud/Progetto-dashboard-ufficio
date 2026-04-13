import "server-only";

import { getTickaToken } from "@/lib/ticka";

type TickaEmissioniApiRow = Record<string, unknown>;

export type TickaEmissioneNormalizedRow = {
  price: number;
  revenue: number;
  presale: number;
  managementFee: number;
  commissionAmount: number;
  rateoAmount: number;
  rateoPresale: number;
  ticketCount: number;
  subscriptionEventsCount: number;
  titleId: string;
  cardProgressive: string;
  cardSerial: string;
  seal: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  organizer: string;
  organizerCf: string;
  venueCode: string;
  venueName: string;
  venueCity: string;
  venueProvince: string;
  orderNumber: string;
  sectorCode: string;
  sectorSiae: string;
  campaignCode: string;
  emissionDate: string;
  emissionDateTime: string;
  accountingDate: string;
  businessOrderDate: string;
  specieEmissione: string;
  reductionLabel: string;
  cancellationId: string;
  cancellationReason: string;
  isCancelled: boolean;
  hasPriceField: boolean;
  hasPresaleField: boolean;
  hasManagementFeeField: boolean;
  hasCommissionField: boolean;
  hasReductionField: boolean;
};

export type TickaEmissioniNormalized = {
  sourceDate: string;
  priceTotal: number;
  revenueTotal: number;
  presaleTotal: number;
  managementFeeTotal: number;
  commissionTotal: number;
  ticketsTotal: number;
  eventsTotal: number;
  organizersTotal: number;
  activeStores: number;
  transactionsTotal: number;
  revenueSeries: Array<{ date: string; value: number }>;
  ticketsSeries: Array<{ date: string; value: number }>;
  rows: TickaEmissioneNormalizedRow[];
};

type TickaEmissioniResponse = {
  result?: TickaEmissioniApiRow[];
  count?: number;
};

type TickaEmissioniFetchAttempt = {
  name: string;
  finalUrl: string;
  statusCode: number;
  response: TickaEmissioniResponse;
  rows: TickaEmissioniApiRow[];
};

export type TickaEmissioniSourceMode = "live-api" | "fixture-fallback";

type TickaEmissioniFetchResult = {
  finalUrl: string;
  rows: TickaEmissioniApiRow[];
  normalized: TickaEmissioniNormalized;
  sourceMode: TickaEmissioniSourceMode;
  fixtureFileUsed: string | null;
  dailyDetails?: Array<{
    date: string;
    finalUrl: string;
    rawRowCount: number;
  }>;
};

type TickaEmissioniDateCacheEntry = {
  cachedAt: number;
  result: TickaEmissioniFetchResult;
};

export type TickaEmissioniPerformanceTracker = {
  totalDates: number;
  cacheHits: number;
  cacheMisses: number;
  totalRawRows: number;
  totalNormalizedRows: number;
  totalDurationMs: number;
};

export type TickaEmissioniDiagnosticAttempt = {
  name: string;
  endpoint: string;
  method: "GET";
  finalUrl: string;
  queryParams: Record<string, string>;
  requestBody: null;
  headers: Record<string, string>;
  statusCode: number;
  ok: boolean;
  responseShape: {
    contentType: string;
    topLevelKeys: string[];
    hasResultArray: boolean;
    resultCount: number;
  };
  firstThreeRows: TickaEmissioniApiRow[];
};

function getTickaBaseUrl() {
  return process.env.TICKA_BASE_URL || "https://ws-duemondi.ticka.it";
}

const TICKA_EMISSIONI_DATE_CACHE_TTL_MS = 10 * 60 * 1000;
const tickaEmissioniDateCache = new Map<string, TickaEmissioniDateCacheEntry>();

function isDebugTickaEnabled() {
  return parseBooleanEnv(process.env.DEBUG_TICKA);
}

export function createTickaEmissioniPerformanceTracker(totalDates: number): TickaEmissioniPerformanceTracker {
  return {
    totalDates,
    cacheHits: 0,
    cacheMisses: 0,
    totalRawRows: 0,
    totalNormalizedRows: 0,
    totalDurationMs: 0,
  };
}

function parseBooleanEnv(value: string | undefined) {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function subtractOneDay(date: string) {
  const cursor = new Date(`${date}T00:00:00Z`);
  cursor.setUTCDate(cursor.getUTCDate() - 1);
  return cursor.toISOString().slice(0, 10);
}

function parseLocalTimeParts(rawEmissionDate: string) {
  const match = rawEmissionDate.match(/^\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) {
    return null;
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
    second: Number(match[3] || 0),
  };
}

function isOnlineSalesChannel(values: string[]) {
  return values.some((value) => /online/i.test(value));
}

function shouldBackshiftOnlineMidnightOrder(rawEmissionDate: string, salesChannelValues: string[]) {
  const time = parseLocalTimeParts(rawEmissionDate);
  if (!time) {
    return false;
  }

  // Keep the carryover limited to the first 5 minutes window strictly before 00:05:00.
  return isOnlineSalesChannel(salesChannelValues) && time.hour === 0 && time.minute < 5;
}

function buildAccountingDate(
  rawEmissionDate: string,
  normalizedEmissionDate: string,
  salesChannelValues: string[]
) {
  const time = parseLocalTimeParts(rawEmissionDate);
  if (time?.hour === 2) {
    return subtractOneDay(normalizedEmissionDate);
  }

  if (shouldBackshiftOnlineMidnightOrder(rawEmissionDate, salesChannelValues)) {
    return subtractOneDay(normalizedEmissionDate);
  }

  return normalizedEmissionDate;
}

function buildBusinessOrderDate(
  rawEmissionDate: string,
  normalizedEmissionDate: string,
  salesChannelValues: string[]
) {
  if (shouldBackshiftOnlineMidnightOrder(rawEmissionDate, salesChannelValues)) {
    return subtractOneDay(normalizedEmissionDate);
  }

  return normalizedEmissionDate;
}

async function performDiagnosticAttempt(
  name: string,
  endpoint: string,
  queryParams: Record<string, string>
): Promise<TickaEmissioniDiagnosticAttempt> {
  const { token } = await getTickaToken();
  const finalUrl = new URL(`${getTickaBaseUrl()}${endpoint}`);

  Object.entries(queryParams).forEach(([key, value]) => {
    finalUrl.searchParams.set(key, value);
  });

  const headers = {
    "Content-Type": "application/json",
    "api-version": "1",
    Accept: "application/json",
    Authorization: `Bearer ${token.slice(0, 6)}...${token.slice(-4)}`,
  };

  const response = await fetch(finalUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "api-version": "1",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();
  let parsed: unknown = null;

  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = rawText;
  }

  const result = parsed && typeof parsed === "object" && Array.isArray((parsed as TickaEmissioniResponse).result)
    ? (parsed as TickaEmissioniResponse).result ?? []
    : [];
  const topLevelKeys =
    parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.keys(parsed as Record<string, unknown>) : [];

  console.log("[ticka-emissioni] diagnostic attempt", {
    name,
    endpoint,
    finalUrl: finalUrl.toString(),
    method: "GET",
    queryParams,
    requestBody: null,
    headers,
    statusCode: response.status,
    responseShape: {
      contentType,
      topLevelKeys,
      hasResultArray: Array.isArray(result),
      resultCount: result.length,
    },
  });
  if (isDebugTickaEnabled()) {
    console.log("[ticka-emissioni] diagnostic sample", {
      name,
      firstThreeRows: result.slice(0, 3),
    });
  }

  return {
    name,
    endpoint,
    method: "GET",
    finalUrl: finalUrl.toString(),
    queryParams,
    requestBody: null,
    headers,
    statusCode: response.status,
    ok: response.ok,
    responseShape: {
      contentType,
      topLevelKeys,
      hasResultArray: Array.isArray(result),
      resultCount: result.length,
    },
    firstThreeRows: result.slice(0, 3),
  };
}

async function executeEmissioniAttempt(
  name: string,
  finalUrl: string,
  endpointName:
    | "dashboard.emissioniByDate"
    | "emissioni.byDate"
    | "kpi.emissioniByDate"
    | "dateUtils.emissioniByDate"
): Promise<TickaEmissioniFetchAttempt> {
  const { token } = await getTickaToken();
  const requestUrl = new URL(`${getTickaBaseUrl()}${finalUrl}`);

  if (isDebugTickaEnabled()) {
    console.log("[ticka-emissioni] attempting fetch", {
      name,
      finalUrl,
      endpointName,
    });
  }

  const response = await fetch(requestUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "api-version": "1",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  const parsed = (await response.json()) as TickaEmissioniResponse;
  const rows = Array.isArray(parsed.result) ? parsed.result : [];

  console.log("[ticka-emissioni] attempt result", {
    name,
    finalUrl: requestUrl.toString(),
    status: response.status,
    resultCount: rows.length,
  });
  if (isDebugTickaEnabled()) {
    console.log("[ticka-emissioni] attempt sample", {
      name,
      sampleKeys: rows[0] ? Object.keys(rows[0]).slice(0, 20) : [],
      firstThreeRows: rows.slice(0, 3),
    });
  }

  return {
    name,
    finalUrl: requestUrl.toString(),
    statusCode: response.status,
    response: parsed,
    rows,
  };
}

export async function diagnoseTickaEmissioniRequests(date: string) {
  const attempts: Array<{
    name: string;
    endpoint: string;
    queryParams: Record<string, string>;
  }> = [
    {
      name: "report-emissioni giorno iso",
      endpoint: "/ReportEmissioni/EmissioniPerData",
      queryParams: { giorno: `${date}T00:00:00` },
    },
    {
      name: "report-emissioni giorno zulu",
      endpoint: "/ReportEmissioni/EmissioniPerData",
      queryParams: { giorno: `${date}T00:00:00Z` },
    },
    {
      name: "report-emissioni giorno offset",
      endpoint: "/ReportEmissioni/EmissioniPerData",
      queryParams: { giorno: `${date}T00:00:00+01:00` },
    },
  ];

  const results: TickaEmissioniDiagnosticAttempt[] = [];

  for (const attempt of attempts) {
    try {
      results.push(
        await performDiagnosticAttempt(attempt.name, attempt.endpoint, attempt.queryParams)
      );
    } catch (error) {
      console.error("[ticka-emissioni] diagnostic attempt failed", {
        name: attempt.name,
        endpoint: attempt.endpoint,
        queryParams: attempt.queryParams,
        error: error instanceof Error ? error.message : String(error),
      });
      results.push({
        name: attempt.name,
        endpoint: attempt.endpoint,
        method: "GET",
        finalUrl: `${getTickaBaseUrl()}${attempt.endpoint}`,
        queryParams: attempt.queryParams,
        requestBody: null,
        headers: {},
        statusCode: 0,
        ok: false,
        responseShape: {
          contentType: "",
          topLevelKeys: [],
          hasResultArray: false,
          resultCount: 0,
        },
        firstThreeRows: [],
      });
    }
  }

  return {
    inputDate: date,
    attempts: results,
    bestMatch: results.reduce<TickaEmissioniDiagnosticAttempt | null>((best, current) => {
      if (!best) {
        return current;
      }

      return current.responseShape.resultCount > best.responseShape.resultCount ? current : best;
    }, null),
    discoveredAlternativeEndpoints: [
      "/ReportEmissioni/EmissioniPerData",
      "/ReportEmissioni/EmissioniPerData?giorno=YYYY-MM-DDT00:00:00",
      "/ReportEmissioni/EmissioniPerData?giorno=YYYY-MM-DDT00:00:00Z",
      "/ReportEmissioni/EmissioniPerData?giorno=YYYY-MM-DDT00:00:00+01:00",
    ],
  };
}

function parseNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const normalized = value.replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function readValue(record: TickaEmissioniApiRow, keys: string[]) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return record[key];
    }
  }

  return undefined;
}

function readString(record: TickaEmissioniApiRow, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
}

function normalizeDate(value: string) {
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : value;
}

function listDatesInRange(from: string, to: string) {
  const dates: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function detectCustomerFieldKeys(rows: TickaEmissioniApiRow[]) {
  const customerPatterns = [
    "cliente",
    "customer",
    "buyer",
    "telefono",
    "phone",
    "anagrafica",
  ];

  const matchingKeys = new Set<string>();

  for (const row of rows.slice(0, 25)) {
    for (const key of Object.keys(row)) {
      const normalizedKey = key.toLowerCase();
      if (customerPatterns.some((pattern) => normalizedKey.includes(pattern))) {
        matchingKeys.add(key);
      }
    }
  }

  return Array.from(matchingKeys).sort((a, b) => a.localeCompare(b));
}

function normalizeEmissioneRow(row: TickaEmissioniApiRow): TickaEmissioneNormalizedRow {
  const cancellationId = readString(row, [
    "annullato_id",
    "annullo_id",
    "annullatoId",
    "annulloId",
    "cancellationId",
  ]);
  const priceValue = readValue(row, ["prezzo", "importo", "amount", "totale", "importoTotale"]);
  const presaleValue = readValue(row, ["prevendita", "prevenditaImporto", "presale"]);
  const managementFeeValue = readValue(row, [
    "gestione_amministrativa",
    "gestioneAmministrativa",
    "administrativeFee",
    "adminFee",
  ]);
  const commissionValue = readValue(row, [
    "commissioni",
    "commissione",
    "commissioniTotali",
    "commissioni_totali",
    "commissioneTotale",
    "commissione_totale",
    "commissionAmount",
    "serviceCommission",
    "paymentCommission",
  ]);
  const reductionValue = readValue(row, [
    "riduzione",
    "riduzioneDescrizione",
    "riduzione_descrizione",
    "reduction",
    "reductionLabel",
  ]);
  const eventDate = normalizeDate(
    readString(row, ["evento_data", "data_evento", "eventDate", "dataEvento", "data_spettacolo"])
  );
  const cancellationReason = readString(row, [
    "annullato_causale",
    "annullo_causale",
    "annullatoCausale",
    "annulloCausale",
    "cancellationReason",
  ]);
  const rawEmissionDateTime = readString(row, ["emissione_data", "emissionDate", "dataEmissione", "date"]);
  const emissionDate = normalizeDate(rawEmissionDateTime);
  const salesChannelValues = [
    readString(row, ["operatore", "operatorName"]),
    readString(row, ["terminale", "terminalName"]),
    readString(row, ["punto_vendita", "salesPointName", "pointOfSale"]),
  ].filter(Boolean);

  return {
    price: parseNumber(priceValue),
    revenue: parseNumber(priceValue),
    presale: parseNumber(presaleValue),
    managementFee: parseNumber(managementFeeValue),
    commissionAmount: parseNumber(commissionValue),
    rateoAmount: parseNumber(readValue(row, ["rateo"])),
    rateoPresale: parseNumber(readValue(row, ["rateo_prevendita", "rateoPrevendita"])),
    ticketCount: Math.max(
      1,
      parseNumber(row.quantita ?? row.tickets ?? row.numeroBiglietti ?? row.qta ?? 1)
    ),
    subscriptionEventsCount: Math.max(1, parseNumber(readValue(row, ["n_eventi", "nEventi"]))),
    titleId: readString(row, ["titolo_id", "titoloId", "titleId"]),
    cardProgressive: readString(row, ["card_progressivo", "cardProgressivo"]),
    cardSerial: readString(row, ["card_sn", "cardSn"]),
    seal: readString(row, ["sigillo", "seal"]),
    eventId: readString(row, ["evento_id", "eventId", "idEvento", "eventoId", "eventCode"]),
    eventName: readString(row, ["evento", "nomeEvento", "eventName", "titolo", "titoloOpera", "descrizione"]),
    eventDate,
    organizer: readString(row, ["organizzatore", "organizer", "organizerName", "denominazioneOrganizzatore"]),
    organizerCf: readString(row, ["organizzatore_cf", "organizerCf", "cfOrganizzatore", "organizerFiscalCode"]),
    venueCode: readString(row, ["locale_codice", "venueCode", "codiceLocale", "storeCode"]),
    venueName: readString(row, ["locale_denominazione", "venueName", "denominazioneLocale", "locale"]),
    venueCity: readString(row, ["locale_comune", "venueCity", "comuneLocale", "city"]),
    venueProvince: readString(row, ["locale_provincia", "venueProvince", "provinciaLocale", "province"]),
    orderNumber: readString(row, ["numero_ordine", "orderNumber", "numeroOrdine", "orderId"]),
    sectorCode: readString(row, ["ordine_posto_codice", "orderSeatCode", "postoCodice", "seatCode"]),
    sectorSiae: readString(row, ["ordine_posto_siae", "orderSeatSiae", "postoSiae", "seatSiae"]),
    campaignCode: readString(row, ["codice_campagna", "codiceCampagna", "campaignCode"]),
    emissionDate,
    emissionDateTime: rawEmissionDateTime,
    accountingDate: buildAccountingDate(rawEmissionDateTime, emissionDate, salesChannelValues),
    businessOrderDate: buildBusinessOrderDate(rawEmissionDateTime, emissionDate, salesChannelValues),
    specieEmissione: readString(row, [
      "specie_emissione",
      "specieEmissione",
      "tipo_emissione",
      "tipoEmissione",
      "type",
    ]),
    reductionLabel: typeof reductionValue === "string" ? reductionValue.trim() : "",
    cancellationId,
    cancellationReason,
    isCancelled: cancellationId.length > 0,
    hasPriceField: priceValue !== undefined && priceValue !== null && String(priceValue).trim() !== "",
    hasPresaleField: presaleValue !== undefined && presaleValue !== null && String(presaleValue).trim() !== "",
    hasManagementFeeField:
      managementFeeValue !== undefined && managementFeeValue !== null && String(managementFeeValue).trim() !== "",
    hasCommissionField:
      commissionValue !== undefined && commissionValue !== null && String(commissionValue).trim() !== "",
    hasReductionField: reductionValue !== undefined && reductionValue !== null && String(reductionValue).trim() !== "",
  };
}

export function normalizeTickaEmissioni(sourceDate: string, rows: TickaEmissioniApiRow[]): TickaEmissioniNormalized {
  const customerFieldKeys = detectCustomerFieldKeys(rows);

  if (customerFieldKeys.length === 0) {
    console.log("[ticka-emissioni] customer data not available in ReportEmissioni", {
      sourceDate,
      scannedRows: Math.min(rows.length, 25),
    });
  } else {
    console.log("[ticka-emissioni] customer-like fields detected in ReportEmissioni", {
      sourceDate,
      scannedRows: Math.min(rows.length, 25),
      customerFieldKeys,
    });
  }

  const normalizedRows = rows.map(normalizeEmissioneRow).filter((row) => row.emissionDate);
  const eventIds = new Set<string>();
  const organizers = new Set<string>();
  const stores = new Set<string>();
  const transactions = new Set<string>();
  const revenueByDate = new Map<string, number>();
  const ticketsByDate = new Map<string, number>();

  for (const row of normalizedRows) {
    if (row.eventId) {
      eventIds.add(row.eventId);
    }

    if (row.organizer) {
      organizers.add(row.organizer);
    }

    if (row.venueCode) {
      stores.add(row.venueCode);
    }

    if (row.orderNumber) {
      transactions.add(row.orderNumber);
    }

    revenueByDate.set(row.emissionDate, (revenueByDate.get(row.emissionDate) || 0) + row.revenue);
    ticketsByDate.set(row.emissionDate, (ticketsByDate.get(row.emissionDate) || 0) + 1);
  }

  return {
    sourceDate,
    priceTotal: normalizedRows.reduce((sum, row) => sum + row.price, 0),
    revenueTotal: normalizedRows.reduce((sum, row) => sum + row.revenue, 0),
    presaleTotal: normalizedRows.reduce((sum, row) => sum + row.presale, 0),
    managementFeeTotal: normalizedRows.reduce((sum, row) => sum + row.managementFee, 0),
    commissionTotal: normalizedRows.reduce((sum, row) => sum + row.commissionAmount, 0),
    ticketsTotal: normalizedRows.length,
    eventsTotal: eventIds.size,
    organizersTotal: organizers.size,
    activeStores: stores.size,
    transactionsTotal: transactions.size,
    revenueSeries: Array.from(revenueByDate.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    ticketsSeries: Array.from(ticketsByDate.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    rows: normalizedRows,
  };
}

export async function fetchTickaEmissioniByDate(
  date: string,
  endpointName:
    | "dashboard.emissioniByDate"
    | "emissioni.byDate"
    | "kpi.emissioniByDate"
    | "dateUtils.emissioniByDate" = "dashboard.emissioniByDate",
  performanceTracker?: TickaEmissioniPerformanceTracker
) {
  const startedAt = Date.now();
  const cachedEntry = tickaEmissioniDateCache.get(date);
  const now = Date.now();

  if (cachedEntry && now - cachedEntry.cachedAt < TICKA_EMISSIONI_DATE_CACHE_TTL_MS) {
    if (performanceTracker) {
      performanceTracker.cacheHits += 1;
      performanceTracker.totalRawRows += cachedEntry.result.rows.length;
      performanceTracker.totalNormalizedRows += cachedEntry.result.normalized.rows.length;
      performanceTracker.totalDurationMs += Date.now() - startedAt;
    }
    console.log("[ticka-emissioni] daily cache", {
      cacheHit: true,
      cacheMiss: false,
      date,
    });
    return cachedEntry.result;
  }

  if (cachedEntry) {
    tickaEmissioniDateCache.delete(date);
  }

  if (performanceTracker) {
    performanceTracker.cacheMisses += 1;
  }
  console.log("[ticka-emissioni] daily cache", {
    cacheHit: false,
    cacheMiss: true,
    date,
  });

  const attempts = [
    {
      name: "report-emissioni giorno iso",
      finalUrl: `/ReportEmissioni/EmissioniPerData?giorno=${date}T00:00:00`,
    },
    {
      name: "report-emissioni giorno zulu",
      finalUrl: `/ReportEmissioni/EmissioniPerData?giorno=${date}T00:00:00Z`,
    },
    {
      name: "report-emissioni giorno offset",
      finalUrl: `/ReportEmissioni/EmissioniPerData?giorno=${date}T00:00:00+01:00`,
    },
  ];

  if (isDebugTickaEnabled()) {
    console.log("[ticka-emissioni] requesting ReportEmissioni with giorno DateTime", {
      date,
      endpointName,
      attempts: attempts.map((attempt) => attempt.finalUrl),
    });
  }

  const attemptResults: Array<{
    name: string;
    finalUrl: string;
    resultCount: number;
    error?: string;
  }> = [];
  let selectedAttempt: TickaEmissioniFetchAttempt | null = null;

  for (const attempt of attempts) {
    try {
      const result = await executeEmissioniAttempt(attempt.name, attempt.finalUrl, endpointName);
      attemptResults.push({
        name: result.name,
        finalUrl: result.finalUrl,
        resultCount: result.rows.length,
      });

      if (result.rows.length > 0) {
        selectedAttempt = result;
        break;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[ticka-emissioni] attempt failed", {
        name: attempt.name,
        finalUrl: attempt.finalUrl,
        error: message,
      });
      attemptResults.push({
        name: attempt.name,
        finalUrl: attempt.finalUrl,
        resultCount: 0,
        error: message,
      });
    }
  }

  if (!selectedAttempt) {
    console.warn("[ticka-emissioni] all giorno attempts returned empty", { date, attempts: attemptResults });
  }

  const finalUrl = selectedAttempt?.finalUrl ?? attempts[0].finalUrl;
  const rows = selectedAttempt?.rows ?? [];
  const normalized = normalizeTickaEmissioni(date, rows);

  if (performanceTracker) {
    performanceTracker.totalRawRows += rows.length;
    performanceTracker.totalNormalizedRows += normalized.rows.length;
    performanceTracker.totalDurationMs += Date.now() - startedAt;
  }

  console.log("[ticka-emissioni] daily fetch summary", {
    date,
    finalUrl,
    rawRowCount: rows.length,
    normalizedRowCount: normalized.rows.length,
    durationMs: Date.now() - startedAt,
  });
  if (isDebugTickaEnabled()) {
    console.log("[ticka-emissioni] normalized date check", {
      routeDate: date,
      apiDateSent: selectedAttempt?.finalUrl ?? null,
      localFilterDateUsed: date,
      normalizedRowCount: normalized.rows.length,
      normalizedEmissionDatesSample: normalized.rows.slice(0, 3).map((row) => row.emissionDate),
    });
  }

  const result: TickaEmissioniFetchResult = {
    finalUrl,
    rows,
    normalized,
    sourceMode: "live-api",
    fixtureFileUsed: null,
  };

  tickaEmissioniDateCache.set(date, {
    cachedAt: now,
    result,
  });

  return result;
}

export async function fetchTickaEmissioniByRange(from: string, to: string) {
  const dates = listDatesInRange(from, to);
  const batchSize = 5;
  const startedAt = Date.now();
  const performanceTracker = createTickaEmissioniPerformanceTracker(dates.length);
  const dailyResults: Awaited<ReturnType<typeof fetchTickaEmissioniByDate>>[] = [];

  for (let index = 0; index < dates.length; index += batchSize) {
    const batchDates = dates.slice(index, index + batchSize);
    const batchResults = await Promise.all(
      batchDates.map((date) =>
        fetchTickaEmissioniByDate(date, "dashboard.emissioniByDate", performanceTracker)
      )
    );
    dailyResults.push(...batchResults);
  }

  const rows = dailyResults.flatMap((result) => result.rows);
  const normalized = normalizeTickaEmissioni(`${from}:${to}`, rows);
  const fixtureFileUsed = null;
  const sourceMode = "live-api";
  const dailyDetails = dailyResults.map((result, index) => ({
    date: dates[index],
    finalUrl: result.finalUrl,
    rawRowCount: result.rows.length,
  }));

  console.log("[ticka-emissioni] range fetch summary", {
    from,
    to,
    totalDates: performanceTracker.totalDates,
    batchSize,
    cacheHits: performanceTracker.cacheHits,
    cacheMisses: performanceTracker.cacheMisses,
    totalRawRows: performanceTracker.totalRawRows,
    totalNormalizedRows: performanceTracker.totalNormalizedRows,
    totalDurationMs: Date.now() - startedAt,
    sourceMode,
    fixtureFileUsed,
  });
  if (isDebugTickaEnabled()) {
    console.log("[ticka-emissioni] range fetch detail", {
      from,
      to,
      dates,
      dailyCounts: dailyDetails.map((item) => ({
        date: item.date,
        finalUrl: item.finalUrl,
        resultCount: item.rawRowCount,
      })),
    });
  }

  return {
    finalUrl: `${from}:${to}`,
    rows,
    normalized,
    sourceMode,
    fixtureFileUsed,
    dailyDetails,
  };
}
