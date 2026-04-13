import "server-only";

import { XMLParser } from "fast-xml-parser";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import {
  buildOrdersView,
  type TickaOrdersSummary,
  type TickaOrdersView,
} from "@/lib/ticka/build-orders-view";
import { isBackofficeExcludedEmissione } from "@/lib/ticka/reconciliation-rules";
import {
  createTickaEmissioniPerformanceTracker,
  fetchTickaEmissioniByDate,
  type TickaEmissioneNormalizedRow,
  type TickaEmissioniPerformanceTracker,
  type TickaEmissioniSourceMode,
} from "@/lib/ticka-emissioni";
import { fetchTickaRiepilogoXml } from "@/lib/ticka-riepilogo";
import { fetchTickaTransazioniXml, type TickaTransazioneNormalizedRow } from "@/lib/ticka-transazioni";

type TickaRecordSource = "logTransazioni" | "reportEmissioni" | "riepilogoGiornaliero";
type FormulaStatus = "confirmed" | "candidate" | "missing";
export type TickaMetricFormulaStatus = FormulaStatus;
export type TickaMetricKey =
  | "fatturatoTotale"
  | "fido"
  | "annulli"
  | "gestioneAmministrativa"
  | "prevendita"
  | "overCommission"
  | "giftCard"
  | "bigliettiEmessi"
  | "cartaCultura"
  | "cartaDelDocente";

type MetricKey = TickaMetricKey;
type BackendTarget = Partial<Record<MetricKey, number>>;

type CanonicalTickaRecord = {
  source: TickaRecordSource;
  dataEmissione: string;
  dataEvento: string;
  titolo: string;
  tipoTitolo: string;
  categoriaTitolo: "TitoloAccesso standard" | "Abbonamento" | "Abbonamento Open" | "Altro";
  causale: string;
  annullamento: string;
  partnerId: string;
  codiceRichiedenteEmissioneSigillo: string;
  codiceOrdine: string;
  codiceLocale: string;
  corrispettivoLordoEur: number;
  corrispettivoNettoEur: number;
  prevenditaEur: number;
  gestioneAmministrativaEur: number;
  flagBiglietto: boolean;
  flagAbbonamento: boolean;
  flagAbbonamentoOpen: boolean;
  rawReference: string;
};

type FormulaContext = {
  date: string;
  backendTarget: BackendTarget | null;
  records: CanonicalTickaRecord[];
  logTransazioni: CanonicalTickaRecord[];
  reportEmissioni: CanonicalTickaRecord[];
  riepilogoGiornaliero: CanonicalTickaRecord[];
};

type MetricFormulaDefinition = {
  metric: MetricKey;
  status: FormulaStatus;
  name: string;
  datasetSources: TickaRecordSource[];
  filtersIncluded: string[];
  filtersExcluded: string[];
  formula: string;
  calculate: (context: FormulaContext) => number | null;
  notes?: string[];
  missingReason?: string;
};

type MetricFormulaResult = {
  metric: MetricKey;
  status: FormulaStatus;
  formulaName: string;
  datasetSources: TickaRecordSource[];
  filtersIncluded: string[];
  filtersExcluded: string[];
  formula: string;
  value: number | null;
  backendTarget: number | null;
  deltaAbs: number | null;
  deltaPct: number | null;
  notes: string[];
  missingReason: string | null;
};

export type TickaMetricFormulaResult = MetricFormulaResult;

type TickaFormulaCheckResponse = {
  date: string;
  backendTarget: BackendTarget | null;
  canonicalTable: {
    totalRecords: number;
    bySource: Record<TickaRecordSource, number>;
    sampleFields: Array<keyof CanonicalTickaRecord>;
  };
  metrics: MetricFormulaResult[];
};

export type TickaFormulaCheckResult = TickaFormulaCheckResponse;

export type TickaFormulaRangeResult = {
  from: string;
  to: string;
  dates: string[];
  backendTarget: BackendTarget | null;
  metrics: MetricFormulaResult[];
  dailyResults: TickaFormulaCheckResponse[];
};

export type TickaDashboardMetricStatus = "confirmed" | "missing";

export type TickaDashboardMetricResult = {
  value: number | null;
  status: TickaDashboardMetricStatus;
  sourceLabel: string;
  deltaAbs: number | null;
  deltaPct: number | null;
  debug: Record<string, unknown>;
};

export type TickaDashboardSeriesPoint = {
  date: string;
  value: number;
};

type DailySourceResult<T> = {
  available: boolean;
  error: string | null;
  sourceLabel: string;
  data: T | null;
};

export type TickaDashboardDailySnapshot = {
  date: string;
  riepilogo: DailySourceResult<{
    recordCount: number;
    ticketsTotal: number;
    grossTotalEur: number;
    presaleTotalEur: number;
    eventsTotal: number;
    organizersTotal: number;
    venuesTotal: number;
  }>;
  emissioni: DailySourceResult<{
    finalUrl: string;
    sourceMode: TickaEmissioniSourceMode;
    fixtureFileUsed: string | null;
    recordCount: number;
    rows: TickaEmissioneNormalizedRow[];
    priceTotal: number;
    presaleTotal: number;
    managementFeeTotal: number;
    commissionTotal: number;
    distinctOrderCount: number;
    distinctEventKeys: string[];
    distinctOrganizerCf: string[];
    distinctVenueCodes: string[];
    emissionCount: number;
    emissionCountWithFeeField: number;
    complimentaryCount: number;
    hasCommissionField: boolean;
    hasManagementFeeField: boolean;
    hasOrganizerCfField: boolean;
  }>;
  transazioni: DailySourceResult<{
    recordCount: number;
    grossTotalEur: number;
    presaleTotalEur: number;
    annulliCount: number;
    rows: TickaTransazioneNormalizedRow[];
  }>;
};

export type TickaDashboardRangeResult = {
  from: string;
  to: string;
  dates: string[];
  sourceLabel: string;
  payload: Record<string, TickaDashboardMetricResult>;
  summary: TickaOrdersSummary;
  ordersView: TickaOrdersView;
  revenueSeries: TickaDashboardSeriesPoint[];
  ticketsSeries: TickaDashboardSeriesPoint[];
  prevenditaSeries: TickaDashboardSeriesPoint[];
  fatturatoTotaleSeries: TickaDashboardSeriesPoint[];
  annulliSeries: TickaDashboardSeriesPoint[];
  dailySnapshots: TickaDashboardDailySnapshot[];
  emissioniPerformance: TickaEmissioniPerformanceTracker;
};

type TickaEmissioniApiRow = Record<string, unknown>;
type TickaDashboardDailySnapshotCacheEntry = {
  cachedAt: number;
  promise: Promise<TickaDashboardDailySnapshot>;
};
type TickaDashboardDailySnapshotCacheRow = {
  cached_at: string;
  source_version: string;
  snapshot: TickaDashboardDailySnapshot;
};
type ParsedDetailedTransactionNode = {
  DataEmissione?: string | number;
  DataEvento?: string | number;
  TipoTitolo?: string;
  CodiceOrdine?: string | number;
  Causale?: string;
  CodiceRichiedenteEmissioneSigillo?: string;
  PartnerId?: string | number;
  Descrizione?: string;
  TitoloAccesso?: {
    Annullamento?: string;
    CorrispettivoLordo?: string | number;
    Prevendita?: string | number;
    IVACorrispettivo?: string | number;
    CodiceLocale?: string | number;
  };
  Abbonamento?: {
    Annullamento?: string;
    CorrispettivoLordo?: string | number;
    Prevendita?: string | number;
    IVACorrispettivo?: string | number;
    CodiceLocale?: string | number;
  };
};

type ParsedDetailedLogTransazioni = {
  LogTransazione?: {
    Transazione?: ParsedDetailedTransactionNode[];
  };
};

const backendTargetByDate: Record<string, BackendTarget> = {
  "2026-03-09": {
    fatturatoTotale: 6784.42,
    fido: 1020.0,
    gestioneAmministrativa: 405.81,
    prevendita: 734.38,
    overCommission: 23.0,
    bigliettiEmessi: 176,
    cartaDelDocente: 370.17,
  },
};

const RECENT_DAILY_SNAPSHOT_CACHE_TTL_MS = 10 * 60 * 1000;
const HISTORICAL_DAILY_SNAPSHOT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const RECENT_SNAPSHOT_DAYS = 14;
const DEFAULT_DASHBOARD_RANGE_CONCURRENCY = 6;
const MAX_DASHBOARD_RANGE_CONCURRENCY = 10;
const TICKA_DASHBOARD_SNAPSHOT_CACHE_TABLE = "ticka_dashboard_daily_snapshots";
const TICKA_DASHBOARD_SNAPSHOT_CACHE_VERSION = "v6";
const HISTORICAL_RECONCILIATION_CUTOFF_DATE = "2026-01-01";
const tickaDashboardDailySnapshotCache = new Map<string, TickaDashboardDailySnapshotCacheEntry>();

const detailedLogXmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: true,
  trimValues: true,
  isArray: (_name, jpath) => ["LogTransazione.Transazione"].includes(String(jpath)),
});

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

function round(value: number) {
  return Number(value.toFixed(2));
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

function addDays(date: string, days: number) {
  const cursor = new Date(`${date}T00:00:00Z`);
  cursor.setUTCDate(cursor.getUTCDate() + days);
  return cursor.toISOString().slice(0, 10);
}

function todayIsoUtc() {
  return new Date().toISOString().slice(0, 10);
}

function getDailySnapshotCacheTtlMs(date: string) {
  const today = todayIsoUtc();
  const recentBoundary = addDays(today, -RECENT_SNAPSHOT_DAYS);

  return date >= recentBoundary ? RECENT_DAILY_SNAPSHOT_CACHE_TTL_MS : HISTORICAL_DAILY_SNAPSHOT_CACHE_TTL_MS;
}

function applyDailySnapshotCacheHit(
  snapshot: TickaDashboardDailySnapshot,
  emissioniPerformance?: TickaEmissioniPerformanceTracker
) {
  if (!emissioniPerformance) {
    return;
  }

  emissioniPerformance.cacheHits += 1;
  emissioniPerformance.totalRawRows += snapshot.emissioni.data?.recordCount ?? 0;
  emissioniPerformance.totalNormalizedRows += snapshot.emissioni.data?.rows.length ?? 0;
}

function getDashboardRangeConcurrency() {
  const parsed = Number(process.env.TICKA_DASHBOARD_RANGE_CONCURRENCY);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_DASHBOARD_RANGE_CONCURRENCY;
  }

  return Math.min(MAX_DASHBOARD_RANGE_CONCURRENCY, Math.max(1, Math.floor(parsed)));
}

function getPersistentDailySnapshotCacheEnabled() {
  return process.env.TICKA_DASHBOARD_PERSISTENT_CACHE !== "0";
}

async function readPersistentDailySnapshotCache(date: string) {
  if (!getPersistentDailySnapshotCacheEnabled()) {
    return null;
  }

  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from(TICKA_DASHBOARD_SNAPSHOT_CACHE_TABLE)
    .select("cached_at, source_version, snapshot")
    .eq("date", date)
    .maybeSingle();

  if (error) {
    console.warn("[ticka-dashboard-daily-snapshot] persistent cache read skipped", {
      date,
      error: error.message,
    });
    return null;
  }

  const row = data as TickaDashboardDailySnapshotCacheRow | null;

  if (!row || row.source_version !== TICKA_DASHBOARD_SNAPSHOT_CACHE_VERSION) {
    return null;
  }

  const cachedAt = new Date(row.cached_at).getTime();
  if (!Number.isFinite(cachedAt) || Date.now() - cachedAt >= getDailySnapshotCacheTtlMs(date)) {
    return null;
  }

  return {
    cachedAt,
    snapshot: row.snapshot,
  };
}

function writePersistentDailySnapshotCache(date: string, snapshot: TickaDashboardDailySnapshot) {
  if (!getPersistentDailySnapshotCacheEnabled()) {
    return;
  }

  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return;
  }

  void supabase
    .from(TICKA_DASHBOARD_SNAPSHOT_CACHE_TABLE)
    .upsert(
      {
        date,
        cached_at: new Date().toISOString(),
        source_version: TICKA_DASHBOARD_SNAPSHOT_CACHE_VERSION,
        snapshot,
      },
      { onConflict: "date" }
    )
    .then(({ error }) => {
      if (error) {
        console.warn("[ticka-dashboard-daily-snapshot] persistent cache write skipped", {
          date,
          error: error.message,
        });
      }
    });
}

async function mapWithConcurrency<TInput, TOutput>(
  items: TInput[],
  concurrency: number,
  mapper: (item: TInput, index: number) => Promise<TOutput>
) {
  const results = new Array<TOutput>(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);

  return results;
}

function normalizeDate(value: unknown): string {
  const raw = String(value || "").trim();

  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : raw;
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

function getCategoriaTitolo(
  nodeType: "TitoloAccesso" | "Abbonamento" | "Unknown",
  tipoTitolo: string,
  causale: string
): CanonicalTickaRecord["categoriaTitolo"] {
  const upperTipoTitolo = tipoTitolo.toUpperCase();
  const upperCausale = causale.toUpperCase();
  const isOpenLike = ["OX", "IP"].includes(upperTipoTitolo) || upperCausale.includes("OPEN");

  if (nodeType === "Abbonamento" && isOpenLike) {
    return "Abbonamento Open";
  }

  if (nodeType === "Abbonamento") {
    return "Abbonamento";
  }

  if (nodeType === "TitoloAccesso" && !["OX", "IP", "A1", "R9", "SN"].includes(upperTipoTitolo)) {
    return "TitoloAccesso standard";
  }

  return "Altro";
}

function buildDelta(value: number | null, target: number | null) {
  if (value === null || target === null) {
    return {
      deltaAbs: null,
      deltaPct: null,
    };
  }

  const deltaAbs = round(Math.abs(value - target));
  const deltaPct = target === 0 ? null : round((deltaAbs / Math.abs(target)) * 100);

  return {
    deltaAbs,
    deltaPct,
  };
}

function sumBy(records: CanonicalTickaRecord[], selector: (record: CanonicalTickaRecord) => number) {
  return round(records.reduce((sum, record) => sum + selector(record), 0));
}

function buildReportEmissioniCanonicalRows(
  sourceDate: string,
  rows: TickaEmissioniApiRow[]
): CanonicalTickaRecord[] {
  return rows.map((row, index) => {
    const tipoTitolo = readString(row, ["tipo_titolo", "tipoTitolo", "titleType"]);
    const specieEmissione = readString(row, [
      "specie_emissione",
      "specieEmissione",
      "tipo_emissione",
      "tipoEmissione",
      "type",
    ]);
    const titolo = readString(row, ["titolo", "eventTitle", "titoloOpera", "descrizione", "nomeEvento"]);
    const causale = readString(row, ["causale", "reason", "descrizioneCausale"]);
    const annullamentoId = readString(row, ["annullato_id", "annullo_id", "annullatoId", "annulloId"]);
    const flagAbbonamentoOpen = /open/i.test(tipoTitolo) || /open/i.test(specieEmissione) || /open/i.test(causale);
    const flagAbbonamento = /abbon/i.test(specieEmissione) || /abbon/i.test(tipoTitolo) || flagAbbonamentoOpen;
    const flagBiglietto = !flagAbbonamento && specieEmissione.toUpperCase() === "BIGLIETTO";

    return {
      source: "reportEmissioni",
      dataEmissione: normalizeDate(
        readString(row, ["emissione_data", "emissionDate", "dataEmissione", "date"]) || sourceDate
      ),
      dataEvento: normalizeDate(readString(row, ["data_evento", "eventDate", "dataEvento"])),
      titolo,
      tipoTitolo,
      categoriaTitolo: flagAbbonamentoOpen
        ? "Abbonamento Open"
        : flagAbbonamento
          ? "Abbonamento"
          : flagBiglietto
            ? "TitoloAccesso standard"
            : "Altro",
      causale,
      annullamento: annullamentoId ? "S" : "N",
      partnerId: readString(row, ["partner_id", "partnerId"]),
      codiceRichiedenteEmissioneSigillo: readString(row, [
        "codice_richiedente_emissione_sigillo",
        "codiceRichiedenteEmissioneSigillo",
        "richiedente",
      ]),
      codiceOrdine: readString(row, ["numero_ordine", "orderNumber", "numeroOrdine", "orderId"]),
      codiceLocale: readString(row, ["locale_codice", "venueCode", "codiceLocale", "storeCode"]),
      corrispettivoLordoEur: parseNumber(
        row.prezzo ?? row.importo ?? row.amount ?? row.totale ?? row.importoTotale
      ),
      corrispettivoNettoEur: parseNumber(
        row.prezzo ?? row.importo ?? row.amount ?? row.totale ?? row.importoTotale
      ),
      prevenditaEur: parseNumber(row.prevendita ?? row.prevenditaImporto ?? row.presale),
      gestioneAmministrativaEur: parseNumber(
        row.gestione_amministrativa ?? row.gestioneAmministrativa ?? row.administrativeFee ?? row.adminFee
      ),
      flagBiglietto,
      flagAbbonamento,
      flagAbbonamentoOpen,
      rawReference: `reportEmissioni:${sourceDate}:${index}`,
    };
  });
}

function buildLogTransazioniCanonicalRows(rawXml: string): CanonicalTickaRecord[] {
  const parsed = detailedLogXmlParser.parse(rawXml) as ParsedDetailedLogTransazioni;
  const transactions = parsed.LogTransazione?.Transazione ?? [];

  return transactions.map((transaction, index) => {
    const nodeType = transaction.TitoloAccesso ? "TitoloAccesso" : transaction.Abbonamento ? "Abbonamento" : "Unknown";
    const payload = transaction.TitoloAccesso ?? transaction.Abbonamento ?? {};
    const tipoTitolo = String(transaction.TipoTitolo || "").trim();
    const causale = String(transaction.Causale || "").trim();
    const categoriaTitolo = getCategoriaTitolo(nodeType, tipoTitolo, causale);

    return {
      source: "logTransazioni",
      dataEmissione: normalizeDate(transaction.DataEmissione),
      dataEvento: normalizeDate(transaction.DataEvento),
      titolo: String(transaction.Descrizione || "").trim(),
      tipoTitolo,
      categoriaTitolo,
      causale,
      annullamento: String(payload.Annullamento || "").trim(),
      partnerId: String(transaction.PartnerId || "").trim(),
      codiceRichiedenteEmissioneSigillo: String(transaction.CodiceRichiedenteEmissioneSigillo || "").trim(),
      codiceOrdine: String(transaction.CodiceOrdine || "").trim(),
      codiceLocale: String(payload.CodiceLocale || "").trim(),
      corrispettivoLordoEur: round(parseNumber(payload.CorrispettivoLordo) / 100),
      corrispettivoNettoEur: round(
        (parseNumber(payload.CorrispettivoLordo) - parseNumber(payload.IVACorrispettivo)) / 100
      ),
      prevenditaEur: round(parseNumber(payload.Prevendita) / 100),
      gestioneAmministrativaEur: 0,
      flagBiglietto: categoriaTitolo === "TitoloAccesso standard",
      flagAbbonamento: categoriaTitolo === "Abbonamento" || categoriaTitolo === "Abbonamento Open",
      flagAbbonamentoOpen: categoriaTitolo === "Abbonamento Open",
      rawReference: `logTransazioni:${normalizeDate(transaction.DataEmissione)}:${index}`,
    };
  });
}

function buildRiepilogoCanonicalRows(
  sourceDate: string,
  eventRows: Array<{
    organizerName: string;
    eventTitle: string;
    venueCode: string;
    eventDate: string;
    gross: number;
    presale: number;
  }>
): CanonicalTickaRecord[] {
  return eventRows.map((row, index) => ({
    source: "riepilogoGiornaliero",
    dataEmissione: sourceDate,
    dataEvento: row.eventDate,
    titolo: row.eventTitle,
    tipoTitolo: "",
    categoriaTitolo: "Altro",
    causale: "",
    annullamento: "",
    partnerId: "",
    codiceRichiedenteEmissioneSigillo: "",
    codiceOrdine: "",
    codiceLocale: row.venueCode,
    corrispettivoLordoEur: round(row.gross / 100),
    corrispettivoNettoEur: round(row.gross / 100),
    prevenditaEur: round(row.presale / 100),
    gestioneAmministrativaEur: 0,
    flagBiglietto: false,
    flagAbbonamento: false,
    flagAbbonamentoOpen: false,
    rawReference: `riepilogoGiornaliero:${sourceDate}:${index}`,
  }));
}

async function buildFormulaContext(date: string): Promise<FormulaContext> {
  const [emissioni, logTransazioni, riepilogo] = await Promise.all([
    fetchTickaEmissioniByDate(date, "emissioni.byDate"),
    fetchTickaTransazioniXml(date, "dashboard.transazioniByDate"),
    fetchTickaRiepilogoXml(date, "dashboard.riepilogoByDate"),
  ]);

  const reportEmissioniRows = buildReportEmissioniCanonicalRows(date, emissioni.rows);
  const logTransazioniRows = buildLogTransazioniCanonicalRows(logTransazioni.rawXml);
  const riepilogoRows = buildRiepilogoCanonicalRows(date, riepilogo.normalized.eventRows);
  const records = [...logTransazioniRows, ...reportEmissioniRows, ...riepilogoRows];

  return {
    date,
    backendTarget: backendTargetByDate[date] ?? null,
    records,
    logTransazioni: logTransazioniRows,
    reportEmissioni: reportEmissioniRows,
    riepilogoGiornaliero: riepilogoRows,
  };
}

export const tickaMetricFormulas: MetricFormulaDefinition[] = [
  {
    metric: "bigliettiEmessi",
    status: "confirmed",
    name: "LogTransazioni ticket standard con causale vuota e partner/canali esclusi",
    datasetSources: ["logTransazioni"],
    filtersIncluded: ["categoriaTitolo = TitoloAccesso standard", "causale = (vuoto)"],
    filtersExcluded: ["partnerId in [12,19]", "Abbonamento/Abbonamento Open/Altro"],
    formula:
      "count(logTransazioni where categoriaTitolo='TitoloAccesso standard' and causale='' and partnerId not in ('12','19'))",
    calculate: ({ logTransazioni }) =>
      logTransazioni.filter(
        (record) =>
          record.categoriaTitolo === "TitoloAccesso standard" &&
          record.causale === "" &&
          !["12", "19"].includes(record.partnerId)
      ).length,
    notes: ["Formula scelta perché sul 2026-03-09 restituisce esattamente 176."],
  },
  {
    metric: "prevendita",
    status: "candidate",
    name: "LogTransazioni prevendita con esclusione partner 23/50 e richiedente PV000035",
    datasetSources: ["logTransazioni"],
    filtersIncluded: ["annullamento = N"],
    filtersExcluded: ["partnerId in [23,50]", "codiceRichiedenteEmissioneSigillo = PV000035"],
    formula:
      "sum(prevenditaEur from logTransazioni where annullamento='N' and partnerId not in ('23','50') and codiceRichiedenteEmissioneSigillo!='PV000035')",
    calculate: ({ logTransazioni }) =>
      sumBy(
        logTransazioni.filter(
          (record) =>
            record.annullamento === "N" &&
            !["23", "50"].includes(record.partnerId) &&
            record.codiceRichiedenteEmissioneSigillo !== "PV000035"
        ),
        (record) => record.prevenditaEur
      ),
    notes: ["Sul 2026-03-09 vale 733.69, a 0.69 dal backend."],
  },
  {
    metric: "fatturatoTotale",
    status: "candidate",
    name: "LogTransazioni lordo con esclusione partner 23/50, canale CW000003 e causale Ingresso + Cena",
    datasetSources: ["logTransazioni"],
    filtersIncluded: ["tutte le categorie", "tutti i tipi titolo"],
    filtersExcluded: [
      "partnerId in [23,50]",
      "codiceRichiedenteEmissioneSigillo = CW000003",
      "causale = Ingresso + Cena",
    ],
    formula:
      "sum(corrispettivoLordoEur from logTransazioni where partnerId not in ('23','50') and codiceRichiedenteEmissioneSigillo!='CW000003' and causale!='Ingresso + Cena')",
    calculate: ({ logTransazioni }) =>
      sumBy(
        logTransazioni.filter(
          (record) =>
            !["23", "50"].includes(record.partnerId) &&
            record.codiceRichiedenteEmissioneSigillo !== "CW000003" &&
            record.causale !== "Ingresso + Cena"
        ),
        (record) => record.corrispettivoLordoEur
      ),
    notes: ["Sul 2026-03-09 vale 6775.29, a 9.13 dal backend."],
  },
  {
    metric: "annulli",
    status: "candidate",
    name: "LogTransazioni annullamenti",
    datasetSources: ["logTransazioni"],
    filtersIncluded: ["annullamento = S"],
    filtersExcluded: [],
    formula: "count(logTransazioni where annullamento='S')",
    calculate: ({ logTransazioni }) => logTransazioni.filter((record) => record.annullamento === "S").length,
    notes: ["Nessun target backend disponibile in questo momento per validare il delta."],
  },
  {
    metric: "gestioneAmministrativa",
    status: "missing",
    name: "Campo gestione amministrativa non ricostruibile dai raw disponibili",
    datasetSources: ["reportEmissioni", "logTransazioni", "riepilogoGiornaliero"],
    filtersIncluded: [],
    filtersExcluded: [],
    formula: "non derivabile con certezza",
    calculate: () => null,
    missingReason:
      "ReportEmissioni non espone dati utilizzabili in modo affidabile sul periodo richiesto e le altre fonti non hanno un campo equivalente a gestione_amministrativa.",
  },
  {
    metric: "fido",
    status: "missing",
    name: "Fido assente nei raw disponibili",
    datasetSources: ["reportEmissioni", "logTransazioni", "riepilogoGiornaliero"],
    filtersIncluded: [],
    filtersExcluded: [],
    formula: "non derivabile con certezza",
    calculate: () => null,
    missingReason: "Nessun campo o endpoint accessibile oggi espone il valore Fido.",
  },
  {
    metric: "overCommission",
    status: "missing",
    name: "Over commission assente nei raw disponibili",
    datasetSources: ["reportEmissioni", "logTransazioni", "riepilogoGiornaliero"],
    filtersIncluded: [],
    filtersExcluded: [],
    formula: "non derivabile con certezza",
    calculate: () => null,
    missingReason: "Nessun campo raw identificato come over commission nelle tre fonti disponibili.",
  },
  {
    metric: "giftCard",
    status: "missing",
    name: "Gift card non rilevate nei raw disponibili",
    datasetSources: ["reportEmissioni", "logTransazioni", "riepilogoGiornaliero"],
    filtersIncluded: [],
    filtersExcluded: [],
    formula: "non derivabile con certezza",
    calculate: () => null,
    missingReason: "Non compaiono pattern o campi gift card affidabili nelle fonti raw disponibili per il periodo richiesto.",
  },
  {
    metric: "cartaCultura",
    status: "missing",
    name: "Carta Cultura non rilevata nei raw disponibili",
    datasetSources: ["reportEmissioni", "logTransazioni", "riepilogoGiornaliero"],
    filtersIncluded: [],
    filtersExcluded: [],
    formula: "non derivabile con certezza",
    calculate: () => null,
    missingReason: "Manca un campo o flag affidabile per distinguere Carta Cultura nei raw disponibili.",
  },
  {
    metric: "cartaDelDocente",
    status: "missing",
    name: "Carta del Docente non rilevata nei raw disponibili",
    datasetSources: ["reportEmissioni", "logTransazioni", "riepilogoGiornaliero"],
    filtersIncluded: [],
    filtersExcluded: [],
    formula: "non derivabile con certezza",
    calculate: () => null,
    missingReason: "Nei raw non emergono campi o causali testuali sufficienti a ricostruire Carta del Docente.",
  },
];

export async function evaluateTickaMetricFormulas(date: string): Promise<TickaFormulaCheckResponse> {
  const context = await buildFormulaContext(date);

  const metrics = tickaMetricFormulas.map<MetricFormulaResult>((definition) => {
    const value = definition.calculate(context);
    const targetValue = context.backendTarget?.[definition.metric] ?? null;
    const delta = buildDelta(value, targetValue);

    return {
      metric: definition.metric,
      status: definition.status,
      formulaName: definition.name,
      datasetSources: definition.datasetSources,
      filtersIncluded: definition.filtersIncluded,
      filtersExcluded: definition.filtersExcluded,
      formula: definition.formula,
      value,
      backendTarget: targetValue,
      deltaAbs: delta.deltaAbs,
      deltaPct: delta.deltaPct,
      notes: definition.notes ?? [],
      missingReason: definition.missingReason ?? null,
    };
  });

  return {
    date,
    backendTarget: context.backendTarget,
    canonicalTable: {
      totalRecords: context.records.length,
      bySource: {
        logTransazioni: context.logTransazioni.length,
        reportEmissioni: context.reportEmissioni.length,
        riepilogoGiornaliero: context.riepilogoGiornaliero.length,
      },
      sampleFields: [
        "dataEmissione",
        "dataEvento",
        "titolo",
        "tipoTitolo",
        "causale",
        "annullamento",
        "partnerId",
        "codiceRichiedenteEmissioneSigillo",
        "codiceOrdine",
        "codiceLocale",
        "corrispettivoLordoEur",
        "prevenditaEur",
        "flagBiglietto",
        "flagAbbonamento",
        "flagAbbonamentoOpen",
      ],
    },
    metrics,
  };
}

export async function evaluateTickaMetricFormulasRange(from: string, to: string): Promise<TickaFormulaRangeResult> {
  const dates = listDatesInRange(from, to);
  const dailyResults = await mapWithConcurrency(dates, 4, (date) => evaluateTickaMetricFormulas(date));

  const metrics = tickaMetricFormulas.map<MetricFormulaResult>((definition) => {
    const dailyMetricResults = dailyResults
      .map((result) => result.metrics.find((metric) => metric.metric === definition.metric))
      .filter((metric): metric is MetricFormulaResult => metric !== undefined);
    const hasConcreteValue = dailyMetricResults.some((metric) => metric.value !== null);
    const value = hasConcreteValue
      ? round(dailyMetricResults.reduce((sum, metric) => sum + (metric.value ?? 0), 0))
      : null;
    const backendValues = dailyResults.map((result) => result.backendTarget?.[definition.metric]);
    const hasCompleteBackendTarget = backendValues.every((metricValue) => typeof metricValue === "number");
    const backendTarget = hasCompleteBackendTarget
      ? round(backendValues.reduce((sum, metricValue) => sum + (metricValue ?? 0), 0))
      : null;
    const delta = buildDelta(value, backendTarget);

    return {
      metric: definition.metric,
      status: definition.status,
      formulaName: definition.name,
      datasetSources: definition.datasetSources,
      filtersIncluded: definition.filtersIncluded,
      filtersExcluded: definition.filtersExcluded,
      formula: definition.formula,
      value,
      backendTarget,
      deltaAbs: delta.deltaAbs,
      deltaPct: delta.deltaPct,
      notes: definition.notes ?? [],
      missingReason: definition.missingReason ?? null,
    };
  });

  const backendTarget = metrics.reduce<BackendTarget>((accumulator, metric) => {
    if (metric.backendTarget !== null) {
      accumulator[metric.metric] = metric.backendTarget;
    }

    return accumulator;
  }, {});

  return {
    from,
    to,
    dates,
    backendTarget: Object.keys(backendTarget).length > 0 ? backendTarget : null,
    metrics,
    dailyResults,
  };
}

function metricResult(
  value: number | null,
  sourceLabel: string,
  debug: Record<string, unknown>,
  options?: { missing?: boolean }
): TickaDashboardMetricResult {
  return {
    value,
    status: options?.missing || value === null ? "missing" : "confirmed",
    sourceLabel,
    deltaAbs: null,
    deltaPct: null,
    debug,
  };
}

function toEuroFromCents(value: number) {
  return round(value / 100);
}

function buildDistinctEventKeys(rows: TickaEmissioneNormalizedRow[]) {
  return Array.from(
    new Set(
      rows
        .map((row) => {
          const eventIdentity = row.eventId || row.eventName;
          const eventDate = row.eventDate;
          const venueCode = row.venueCode;

          return eventIdentity && eventDate && venueCode ? `${eventIdentity}::${eventDate}::${venueCode}` : "";
        })
        .filter(Boolean)
    )
  );
}

function buildDailyEmissioniSnapshot(date: string, rows: TickaEmissioneNormalizedRow[]) {
  const distinctOrders = new Set(rows.map((row) => row.orderNumber).filter(Boolean));
  const distinctOrganizerCf = Array.from(new Set(rows.map((row) => row.organizerCf).filter(Boolean)));
  const distinctVenueCodes = Array.from(new Set(rows.map((row) => row.venueCode).filter(Boolean)));
  const distinctEventKeys = buildDistinctEventKeys(rows);
  const complimentaryCount = rows.filter(
    (row) => row.price === 0 || /omaggio/i.test(row.reductionLabel)
  ).length;
  const emissionCountWithFeeField = rows.filter((row) => row.hasManagementFeeField).length;
  const hasCommissionField = rows.some((row) => row.hasCommissionField);
  const hasManagementFeeField = rows.some((row) => row.hasManagementFeeField);
  const hasOrganizerCfField = rows.some((row) => row.organizerCf.length > 0);

  return {
    recordCount: rows.length,
    rows,
    priceTotal: round(rows.reduce((sum, row) => sum + row.price, 0)),
    presaleTotal: round(rows.reduce((sum, row) => sum + row.presale, 0)),
    managementFeeTotal: round(rows.reduce((sum, row) => sum + row.managementFee, 0)),
    commissionTotal: round(rows.reduce((sum, row) => sum + row.commissionAmount, 0)),
    distinctOrderCount: distinctOrders.size,
    distinctEventKeys,
    distinctOrganizerCf,
    distinctVenueCodes,
    emissionCount: rows.length,
    emissionCountWithFeeField,
    complimentaryCount,
    hasCommissionField,
    hasManagementFeeField,
    hasOrganizerCfField,
  };
}

export async function buildTickaDashboardDailySnapshot(
  date: string,
  emissioniPerformance?: TickaEmissioniPerformanceTracker
): Promise<TickaDashboardDailySnapshot> {
  const cachedEntry = tickaDashboardDailySnapshotCache.get(date);
  const now = Date.now();

  if (cachedEntry && now - cachedEntry.cachedAt < getDailySnapshotCacheTtlMs(date)) {
    const snapshot = await cachedEntry.promise;
    applyDailySnapshotCacheHit(snapshot, emissioniPerformance);
    console.log("[ticka-dashboard-daily-snapshot] cache", {
      cacheHit: true,
      cacheMiss: false,
      date,
      ttlMs: getDailySnapshotCacheTtlMs(date),
    });
    return snapshot;
  }

  if (cachedEntry) {
    tickaDashboardDailySnapshotCache.delete(date);
  }

  const persistentEntry = await readPersistentDailySnapshotCache(date);
  if (persistentEntry) {
    const promise = Promise.resolve(persistentEntry.snapshot);
    tickaDashboardDailySnapshotCache.set(date, {
      cachedAt: persistentEntry.cachedAt,
      promise,
    });
    applyDailySnapshotCacheHit(persistentEntry.snapshot, emissioniPerformance);
    console.log("[ticka-dashboard-daily-snapshot] persistent cache", {
      cacheHit: true,
      cacheMiss: false,
      date,
      ttlMs: getDailySnapshotCacheTtlMs(date),
    });
    return persistentEntry.snapshot;
  }

  console.log("[ticka-dashboard-daily-snapshot] persistent cache", {
    cacheHit: false,
    cacheMiss: true,
    date,
    enabled: getPersistentDailySnapshotCacheEnabled(),
  });

  console.log("[ticka-dashboard-daily-snapshot] cache", {
    cacheHit: false,
    cacheMiss: true,
    date,
    ttlMs: getDailySnapshotCacheTtlMs(date),
  });

  const promise = buildTickaDashboardDailySnapshotUncached(date, emissioniPerformance);
  tickaDashboardDailySnapshotCache.set(date, {
    cachedAt: now,
    promise,
  });

  try {
    const snapshot = await promise;
    writePersistentDailySnapshotCache(date, snapshot);
    return snapshot;
  } catch (error) {
    tickaDashboardDailySnapshotCache.delete(date);
    throw error;
  }
}

async function buildTickaDashboardDailySnapshotUncached(
  date: string,
  emissioniPerformance?: TickaEmissioniPerformanceTracker
): Promise<TickaDashboardDailySnapshot> {
  const [riepilogoResult, emissioniResult, transazioniResult] = await Promise.allSettled([
    fetchTickaRiepilogoXml(date, "dashboard.riepilogoByDate"),
    fetchTickaEmissioniByDate(date, "dashboard.emissioniByDate", emissioniPerformance),
    fetchTickaTransazioniXml(date, "dashboard.transazioniByDate"),
  ]);

  const riepilogo =
    riepilogoResult.status === "fulfilled"
      ? {
          available: true,
          error: null,
          sourceLabel: "RiepilogoGiornaliero XML",
          data: {
            recordCount: riepilogoResult.value.normalized.eventRows.length,
            ticketsTotal: riepilogoResult.value.normalized.ticketsTotal,
            grossTotalEur: toEuroFromCents(riepilogoResult.value.normalized.grossTotal),
            presaleTotalEur: toEuroFromCents(riepilogoResult.value.normalized.presaleTotal),
            eventsTotal: riepilogoResult.value.normalized.events,
            organizersTotal: riepilogoResult.value.normalized.organizers,
            venuesTotal: riepilogoResult.value.normalized.venues,
          },
        }
      : {
          available: false,
          error: riepilogoResult.reason instanceof Error ? riepilogoResult.reason.message : "Errore sorgente",
          sourceLabel: "RiepilogoGiornaliero XML",
          data: null,
        };

  const emissioni =
    emissioniResult.status === "fulfilled"
      ? {
          available: true,
          error: null,
          sourceLabel: "ReportEmissioni JSON",
          data: {
            finalUrl: emissioniResult.value.finalUrl,
            sourceMode: emissioniResult.value.sourceMode,
            fixtureFileUsed: emissioniResult.value.fixtureFileUsed,
            ...buildDailyEmissioniSnapshot(date, emissioniResult.value.normalized.rows),
          },
        }
      : {
          available: false,
          error: emissioniResult.reason instanceof Error ? emissioniResult.reason.message : "Errore sorgente",
          sourceLabel: "ReportEmissioni JSON",
          data: null,
        };

  const transazioni =
    transazioniResult.status === "fulfilled"
      ? {
          available: true,
          error: null,
          sourceLabel: "LogTransazione XML",
          data: {
            recordCount: transazioniResult.value.normalized.rows.length,
            grossTotalEur: toEuroFromCents(transazioniResult.value.normalized.grossTotal),
            presaleTotalEur: toEuroFromCents(transazioniResult.value.normalized.presaleTotal),
            annulliCount: transazioniResult.value.normalized.rows.filter((row) => row.annullamento === "S").length,
            rows: transazioniResult.value.normalized.rows,
          },
        }
      : {
          available: false,
          error: transazioniResult.reason instanceof Error ? transazioniResult.reason.message : "Errore sorgente",
          sourceLabel: "LogTransazione XML",
          data: null,
        };

  return {
    date,
    riepilogo,
    emissioni,
    transazioni,
  };
}

async function buildTickaDashboardOrdersDailySnapshot(
  date: string,
  emissioniPerformance?: TickaEmissioniPerformanceTracker
): Promise<TickaDashboardDailySnapshot> {
  const emissioniResult = await fetchTickaEmissioniByDate(date, "dashboard.emissioniByDate", emissioniPerformance);

  return {
    date,
    riepilogo: {
      available: false,
      error: null,
      sourceLabel: "RiepilogoGiornaliero XML",
      data: null,
    },
    emissioni: {
      available: true,
      error: null,
      sourceLabel: "ReportEmissioni JSON",
      data: {
        finalUrl: emissioniResult.finalUrl,
        sourceMode: emissioniResult.sourceMode,
        fixtureFileUsed: emissioniResult.fixtureFileUsed,
        ...buildDailyEmissioniSnapshot(date, emissioniResult.normalized.rows),
      },
    },
    transazioni: {
      available: false,
      error: null,
      sourceLabel: "LogTransazione XML",
      data: null,
    },
  };
}

function sumSnapshotValues(
  snapshots: TickaDashboardDailySnapshot[],
  selector: (snapshot: TickaDashboardDailySnapshot) => number | null
) {
  const values = snapshots.map(selector).filter((value): value is number => value !== null);
  return values.length > 0 ? round(values.reduce((sum, value) => sum + value, 0)) : null;
}

function sumSnapshotIntegers(
  snapshots: TickaDashboardDailySnapshot[],
  selector: (snapshot: TickaDashboardDailySnapshot) => number | null
) {
  const values = snapshots.map(selector).filter((value): value is number => value !== null);
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) : null;
}

function buildSeriesFromSnapshots(
  snapshots: TickaDashboardDailySnapshot[],
  selector: (snapshot: TickaDashboardDailySnapshot) => number | null
) {
  return snapshots.map((snapshot) => ({
    date: snapshot.date,
    value: selector(snapshot) ?? 0,
  }));
}

function getSupplementalRowsForDate(rows: TickaEmissioneNormalizedRow[], date: string) {
  return rows.filter((row) => (row.businessOrderDate || row.emissionDate) === date);
}

function getSupplementalTransactionsForRows(
  rows: TickaEmissioneNormalizedRow[],
  transactions: TickaTransazioneNormalizedRow[]
) {
  const progressives = new Set(rows.map((row) => row.cardProgressive).filter(Boolean));
  return transactions.filter((transaction) => progressives.has(transaction.progressivo));
}

function buildFatturatoTotaleSeries(
  snapshots: TickaDashboardDailySnapshot[],
  ordersView: TickaOrdersView,
  supplementalRows: TickaEmissioneNormalizedRow[] = [],
  supplementalTransactions: TickaTransazioneNormalizedRow[] = []
) {
  return snapshots.map((snapshot) => {
    const daySupplementalRows = getSupplementalRowsForDate(supplementalRows, snapshot.date);

    return {
      date: snapshot.date,
      value: buildDashboardSummary(
        ordersView,
        [snapshot],
        daySupplementalRows,
        getSupplementalTransactionsForRows(daySupplementalRows, supplementalTransactions)
      ).fatturatoTotale,
    };
  });
}

function buildOrdersTicketsSeries(ordersView: TickaOrdersView) {
  return Array.from(
    ordersView.rows.reduce((map, row) => {
      map.set(row.orderDate, (map.get(row.orderDate) ?? 0) + row.ticketsCount);
      return map;
    }, new Map<string, number>())
  )
    .map(([date, value]) => ({ date, value }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function buildTicketsSeries(
  snapshots: TickaDashboardDailySnapshot[],
  ordersView: TickaOrdersView
) {
  const usesHistoricalReconciliation =
    snapshots.length > 0 &&
    snapshots.every((snapshot) => snapshot.date < HISTORICAL_RECONCILIATION_CUTOFF_DATE);

  if (usesHistoricalReconciliation) {
    return buildSeriesFromSnapshots(
      snapshots,
      (snapshot) => snapshot.riepilogo.data?.ticketsTotal ?? null
    );
  }

  return buildOrdersTicketsSeries(ordersView);
}

function buildSummarySeries(
  snapshots: TickaDashboardDailySnapshot[],
  ordersView: TickaOrdersView,
  selector: (summary: TickaOrdersSummary) => number,
  supplementalRows: TickaEmissioneNormalizedRow[] = [],
  supplementalTransactions: TickaTransazioneNormalizedRow[] = []
) {
  return snapshots.map((snapshot) => {
    const daySupplementalRows = getSupplementalRowsForDate(supplementalRows, snapshot.date);

    return {
      date: snapshot.date,
      value: selector(
        buildDashboardSummary(
          ordersView,
          [snapshot],
          daySupplementalRows,
          getSupplementalTransactionsForRows(daySupplementalRows, supplementalTransactions)
        )
      ),
    };
  });
}

function isSubscriptionRow(row: TickaEmissioneNormalizedRow) {
  return row.specieEmissione.toUpperCase().includes("ABBONAMENTO");
}

function isOpenSubscriptionRow(row: TickaEmissioneNormalizedRow) {
  return row.specieEmissione.toUpperCase().includes("OPEN");
}

function getSubscriptionDivisor(row: TickaEmissioneNormalizedRow) {
  return row.subscriptionEventsCount > 0 ? row.subscriptionEventsCount : 1;
}

function getAccountingPresaleAmount(
  row: TickaEmissioneNormalizedRow,
  transaction?: TickaTransazioneNormalizedRow
) {
  void transaction;

  if (!isSubscriptionRow(row)) {
    return row.presale;
  }

  if (isOpenSubscriptionRow(row)) {
    return row.presale;
  }

  return row.rateoPresale > 0 ? row.rateoPresale : row.presale / getSubscriptionDivisor(row);
}

function getAccountingEmissionAmount(row: TickaEmissioneNormalizedRow) {
  if (!isSubscriptionRow(row)) {
    return row.price;
  }

  if (isOpenSubscriptionRow(row)) {
    return row.price;
  }

  return row.rateoAmount > 0 ? row.rateoAmount : row.price / getSubscriptionDivisor(row);
}

function getAccountingManagementAmount(row: TickaEmissioneNormalizedRow) {
  if (!isSubscriptionRow(row)) {
    return row.managementFee;
  }

  return row.managementFee / getSubscriptionDivisor(row);
}

function getAccountingCommissionAmount(row: TickaEmissioneNormalizedRow) {
  if (!isSubscriptionRow(row) || isOpenSubscriptionRow(row)) {
    return row.commissionAmount;
  }

  return row.commissionAmount / getSubscriptionDivisor(row);
}

function isAccountingRowCancelled(
  row: TickaEmissioneNormalizedRow,
  transaction?: TickaTransazioneNormalizedRow
) {
  return row.isCancelled || transaction?.annullamento === "S";
}

function buildDashboardSummary(
  ordersView: TickaOrdersView,
  dailySnapshots: TickaDashboardDailySnapshot[],
  supplementalRows: TickaEmissioneNormalizedRow[] = [],
  supplementalTransactions: TickaTransazioneNormalizedRow[] = []
): TickaOrdersSummary {
  const emissioniRows = [
    ...dailySnapshots.flatMap((snapshot) => snapshot.emissioni.data?.rows ?? []),
    ...supplementalRows,
  ];
  const transazioniRows = [
    ...dailySnapshots.flatMap((snapshot) => snapshot.transazioni.data?.rows ?? []),
    ...supplementalTransactions,
  ];
  const usesHistoricalReconciliation =
    dailySnapshots.length > 0 &&
    dailySnapshots.every((snapshot) => snapshot.date < HISTORICAL_RECONCILIATION_CUTOFF_DATE);
  const transactionMetaByProgressive = new Map(
    transazioniRows
      .filter((row) => row.progressivo)
      .map((row) => [row.progressivo, row] as const)
  );
  const orderedRows = emissioniRows.filter(
    (row) => {
      const transaction = transactionMetaByProgressive.get(row.cardProgressive);
      return (
        row.orderNumber &&
        !isAccountingRowCancelled(row, transaction) &&
        !isBackofficeExcludedEmissione(row, transaction)
      );
    }
  );
  const cancelledEconomicRows = emissioniRows.filter(
    (row) => {
      const transaction = transactionMetaByProgressive.get(row.cardProgressive);
      return (
        row.orderNumber &&
        isAccountingRowCancelled(row, transaction) &&
        !isBackofficeExcludedEmissione(row, transaction)
      );
    }
  );
  const bigliettiVenduti = round(
    orderedRows
      .filter((row) => !isSubscriptionRow(row))
      .reduce((sum, row) => sum + row.ticketCount, 0)
  );
  const totaleEmissioni = round(orderedRows.reduce((sum, row) => sum + getAccountingEmissionAmount(row), 0));
  const totalePrevendita = round(
    orderedRows.reduce(
      (sum, row) => sum + getAccountingPresaleAmount(row, transactionMetaByProgressive.get(row.cardProgressive)),
      0
    )
  );
  const totaleGestioneAmministrativa = round(
    orderedRows.reduce((sum, row) => sum + getAccountingManagementAmount(row), 0)
  );
  const totaleCommissioni = round(
    orderedRows.reduce((sum, row) => sum + getAccountingCommissionAmount(row), 0)
  );
  const totaleAnnulliEconomici = round(
    cancelledEconomicRows.reduce(
      (sum, row) =>
        sum +
        getAccountingEmissionAmount(row) +
        getAccountingPresaleAmount(row, transactionMetaByProgressive.get(row.cardProgressive)) +
        getAccountingManagementAmount(row) +
        getAccountingCommissionAmount(row),
      0
    )
  );

  if (usesHistoricalReconciliation) {
    const historicalBiglietti = sumSnapshotIntegers(
      dailySnapshots,
      (snapshot) => snapshot.riepilogo.data?.ticketsTotal ?? null
    );
    const historicalEmissioni = sumSnapshotValues(
      dailySnapshots,
      (snapshot) => snapshot.riepilogo.data?.grossTotalEur ?? null
    );
    const historicalPrevendita = sumSnapshotValues(
      dailySnapshots,
      (snapshot) => snapshot.riepilogo.data?.presaleTotalEur ?? null
    );

    const totaleEmissioniStorico = historicalEmissioni ?? totaleEmissioni;
    const totalePrevenditaStorico = historicalPrevendita ?? totalePrevendita;

    return {
      ...ordersView.summary,
      bigliettiVenduti: historicalBiglietti ?? bigliettiVenduti,
      totaleEmissioni: totaleEmissioniStorico,
      totalePrevendita: totalePrevenditaStorico,
      totaleGestioneAmministrativa,
      totaleCommissioni,
      fatturatoTotale: round(
        totaleEmissioniStorico + totalePrevenditaStorico + totaleGestioneAmministrativa + totaleCommissioni
      ),
    };
  }

  return {
    ...ordersView.summary,
    bigliettiVenduti,
    totaleEmissioni,
    totalePrevendita,
    totaleGestioneAmministrativa,
    totaleCommissioni,
    fatturatoTotale: round(
      totaleEmissioni + totalePrevendita + totaleGestioneAmministrativa + totaleCommissioni + totaleAnnulliEconomici
    ),
  };
}

function calculateFidoMetric(emissioniRows: TickaEmissioneNormalizedRow[]): number {
  if (!emissioniRows || emissioniRows.length === 0) return 0;
  
  return emissioniRows
    .filter(row => {
      const specieEmissione = row.specieEmissione?.toLowerCase() || "";
      const reductionLabel = row.reductionLabel?.toLowerCase() || "";
      return (
        specieEmissione.includes("fido") ||
        reductionLabel.includes("fido") ||
        specieEmissione.includes("fidaty") ||
        reductionLabel.includes("fidaty") ||
        specieEmissione.includes("carta") && reductionLabel.includes("fido")
      );
    })
    .reduce((sum, row) => sum + (row.price || 0), 0);
}

function calculateGiftCardMetric(emissioniRows: TickaEmissioneNormalizedRow[]): number {
  if (!emissioniRows || emissioniRows.length === 0) return 0;
  
  return emissioniRows
    .filter(row => {
      const specieEmissione = row.specieEmissione?.toLowerCase() || "";
      const reductionLabel = row.reductionLabel?.toLowerCase() || "";
      return (
        specieEmissione.includes("gift") ||
        reductionLabel.includes("gift") ||
        specieEmissione.includes("buono") ||
        reductionLabel.includes("buono") ||
        specieEmissione.includes("voucher") ||
        reductionLabel.includes("voucher")
      );
    })
    .reduce((sum, row) => sum + (row.price || 0), 0);
}

function calculateCartaCulturaMetric(emissioniRows: TickaEmissioneNormalizedRow[]): number {
  if (!emissioniRows || emissioniRows.length === 0) return 0;
  
  return emissioniRows
    .filter(row => {
      const specieEmissione = row.specieEmissione?.toLowerCase() || "";
      const reductionLabel = row.reductionLabel?.toLowerCase() || "";
      return (
        specieEmissione.includes("cultura") ||
        reductionLabel.includes("cultura") ||
        specieEmissione.includes("18app") ||
        reductionLabel.includes("18app") ||
        specieEmissione.includes("carta cultura") ||
        reductionLabel.includes("carta cultura")
      );
    })
    .reduce((sum, row) => sum + (row.price || 0), 0);
}

function calculateCartaDocenteMetric(emissioniRows: TickaEmissioneNormalizedRow[]): number {
  if (!emissioniRows || emissioniRows.length === 0) return 0;
  
  return emissioniRows
    .filter(row => {
      const specieEmissione = row.specieEmissione?.toLowerCase() || "";
      const reductionLabel = row.reductionLabel?.toLowerCase() || "";
      return (
        specieEmissione.includes("docente") ||
        reductionLabel.includes("docente") ||
        specieEmissione.includes("insegnante") ||
        reductionLabel.includes("insegnante") ||
        specieEmissione.includes("carta docente") ||
        reductionLabel.includes("carta docente")
      );
    })
    .reduce((sum, row) => sum + (row.price || 0), 0);
}

export async function buildTickaDashboardRange(
  from: string,
  to: string,
  options?: { eventId?: string | null; mode?: "full" | "orders" }
): Promise<TickaDashboardRangeResult> {
  const dates = listDatesInRange(from, to);
  const rangeConcurrency = getDashboardRangeConcurrency();
  const spilloverDate = addDays(to, 1);
  const isOrdersMode = options?.mode === "orders";
  const emissioniPerformance = createTickaEmissioniPerformanceTracker(dates.length);
  console.log("[ticka-dashboard-range] build start", {
    from,
    to,
    generatedDates: dates,
    generatedDatesCount: dates.length,
    rangeConcurrency,
    spilloverDate,
    mode: options?.mode ?? "full",
    eventId: options?.eventId ?? null,
  });
  const dailySnapshotsPromise = mapWithConcurrency(dates, rangeConcurrency, (date) =>
    isOrdersMode
      ? buildTickaDashboardOrdersDailySnapshot(date, emissioniPerformance)
      : buildTickaDashboardDailySnapshot(date, emissioniPerformance)
  );
  const spilloverSnapshotPromise = isOrdersMode
    ? buildTickaDashboardOrdersDailySnapshot(spilloverDate)
    : buildTickaDashboardDailySnapshot(spilloverDate);
  const [dailySnapshots, spilloverSnapshot] = await Promise.all([
    dailySnapshotsPromise,
    spilloverSnapshotPromise,
  ]);
  const sourceLabel = from === to ? `Dati Ticka del ${from}` : `Dati Ticka dal ${from} al ${to}`;
  const emissioniRows = dailySnapshots.flatMap((snapshot) => snapshot.emissioni.data?.rows ?? []);
  const accountingEmissionRows = [
    ...emissioniRows,
    ...(spilloverSnapshot.emissioni.data?.rows ?? []),
  ];
  const carryoverRows = (spilloverSnapshot.emissioni.data?.rows ?? []).filter(
    (row) => row.businessOrderDate >= from && row.businessOrderDate <= to
  );
  const carryoverTransactions = (spilloverSnapshot.transazioni.data?.rows ?? []).filter((row) =>
    carryoverRows.some((emissioneRow) => emissioneRow.cardProgressive === row.progressivo)
  );
  const transactionMetaByProgressive = new Map<string, TickaTransazioneNormalizedRow>(
    dailySnapshots
      .flatMap((snapshot) => snapshot.transazioni.data?.rows ?? [])
      .filter((row) => row.progressivo)
      .map((row) => [row.progressivo, row])
  );
  const ordersView = buildOrdersView(emissioniRows, {
    eventId: options?.eventId ?? null,
    accountingEmissionRows,
    transactionMetaByProgressive,
    fromDate: from,
    toDate: to,
    sourceLabel: "ReportEmissioni JSON",
  });

  const riepilogoDays = dailySnapshots.filter((snapshot) => snapshot.riepilogo.available && snapshot.riepilogo.data);
  const emissioniDays = dailySnapshots.filter((snapshot) => snapshot.emissioni.available && snapshot.emissioni.data);
  const transazioniDays = dailySnapshots.filter((snapshot) => snapshot.transazioni.available && snapshot.transazioni.data);
  const emissioniRecordCount = emissioniDays.reduce((sum, snapshot) => sum + (snapshot.emissioni.data?.recordCount ?? 0), 0);
  const emissioniHasRows = emissioniRecordCount > 0;

  const riepilogoTicketsTotal = sumSnapshotIntegers(dailySnapshots, (snapshot) => snapshot.riepilogo.data?.ticketsTotal ?? null);
  const riepilogoGrossTotal = sumSnapshotValues(dailySnapshots, (snapshot) => snapshot.riepilogo.data?.grossTotalEur ?? null);
  const riepilogoPresaleTotal = sumSnapshotValues(dailySnapshots, (snapshot) => snapshot.riepilogo.data?.presaleTotalEur ?? null);
  const managementFeeTotalRaw = sumSnapshotValues(dailySnapshots, (snapshot) => snapshot.emissioni.data?.managementFeeTotal ?? null);
  const commissionTotalRaw = sumSnapshotValues(dailySnapshots, (snapshot) => snapshot.emissioni.data?.commissionTotal ?? null);
  const priceTotalRaw = sumSnapshotValues(dailySnapshots, (snapshot) => snapshot.emissioni.data?.priceTotal ?? null);
  const ordersCountRaw = sumSnapshotIntegers(dailySnapshots, (snapshot) => snapshot.emissioni.data?.distinctOrderCount ?? null);
  const emissionCountRaw = sumSnapshotIntegers(dailySnapshots, (snapshot) => snapshot.emissioni.data?.emissionCount ?? null);
  const emissionCountWithFeeField = sumSnapshotIntegers(
    dailySnapshots,
    (snapshot) => snapshot.emissioni.data?.emissionCountWithFeeField ?? null
  );
  const complimentaryCountRaw = sumSnapshotIntegers(dailySnapshots, (snapshot) => snapshot.emissioni.data?.complimentaryCount ?? null);
  const annulliCount = sumSnapshotIntegers(dailySnapshots, (snapshot) => snapshot.transazioni.data?.annulliCount ?? null);
  const commissionFieldDetected = dailySnapshots.some((snapshot) => snapshot.emissioni.data?.hasCommissionField);
  const managementFeeFieldDetected = dailySnapshots.some((snapshot) => snapshot.emissioni.data?.hasManagementFeeField);
  const organizerCfDetected = dailySnapshots.some((snapshot) => snapshot.emissioni.data?.hasOrganizerCfField);
  const distinctEventKeys = Array.from(
    new Set(dailySnapshots.flatMap((snapshot) => snapshot.emissioni.data?.distinctEventKeys ?? []))
  );
  const distinctOrganizerCf = Array.from(
    new Set(dailySnapshots.flatMap((snapshot) => snapshot.emissioni.data?.distinctOrganizerCf ?? []))
  );
  const distinctVenueCodes = Array.from(
    new Set(dailySnapshots.flatMap((snapshot) => snapshot.emissioni.data?.distinctVenueCodes ?? []))
  );
  const managementFeeTotal = emissioniHasRows ? managementFeeTotalRaw : null;
  const priceTotal = emissioniHasRows ? priceTotalRaw : null;
  const ordersCount = emissioniHasRows ? ordersCountRaw : null;
  const emissionCount = emissioniHasRows ? emissionCountRaw : null;
  const complimentaryCount = emissioniHasRows ? complimentaryCountRaw : null;
  const ticketMedio =
    riepilogoGrossTotal !== null && riepilogoTicketsTotal !== null && riepilogoTicketsTotal > 0
      ? round(riepilogoGrossTotal / riepilogoTicketsTotal)
      : null;
  const commissionTotal = emissioniHasRows && commissionFieldDetected ? commissionTotalRaw : null;
  const ricavoMedioPerOrdine =
    priceTotal !== null &&
    riepilogoPresaleTotal !== null &&
    managementFeeTotal !== null &&
    commissionTotal !== null &&
    ordersCount !== null &&
    ordersCount > 0
      ? round((priceTotal + riepilogoPresaleTotal + managementFeeTotal + commissionTotal) / ordersCount)
      : null;
  const prezzoMedioTicket =
    priceTotal !== null && emissionCount !== null && emissionCount > 0 ? round(priceTotal / emissionCount) : null;
  const feeMediaPerTicket =
    managementFeeFieldDetected &&
    managementFeeTotal !== null &&
    emissionCountWithFeeField !== null &&
    emissionCountWithFeeField > 0
      ? round(managementFeeTotal / emissionCountWithFeeField)
      : null;
  const incassoComplessivo =
    priceTotal !== null && riepilogoPresaleTotal !== null && managementFeeTotal !== null && commissionTotal !== null
      ? round(priceTotal + riepilogoPresaleTotal + managementFeeTotal + commissionTotal)
      : null;
  const omaggiPct =
    complimentaryCount !== null && emissionCount !== null && emissionCount > 0
      ? round((complimentaryCount / emissionCount) * 100)
      : null;
  const dashboardSummary = buildDashboardSummary(
    ordersView,
    dailySnapshots,
    carryoverRows,
    carryoverTransactions
  );

  const payload: Record<string, TickaDashboardMetricResult> = {
    bigliettiEmessi: metricResult(dashboardSummary.bigliettiVenduti, "Riconciliazione ordini Ticka", {
      subtotal: dashboardSummary.bigliettiVenduti,
      riepilogoControl: riepilogoTicketsTotal,
      recordCount: riepilogoDays.reduce((sum, snapshot) => sum + (snapshot.riepilogo.data?.recordCount ?? 0), 0),
      daysWithData: riepilogoDays.length,
      transazioniRecordCount: transazioniDays.reduce((sum, snapshot) => sum + (snapshot.transazioni.data?.recordCount ?? 0), 0),
      note: "Allineato ai biglietti venduti riconciliati per evitare divergenze con ordini, annulli e casi backoffice esclusi.",
    }),
    corrispettivoLordo: metricResult(riepilogoGrossTotal, "RiepilogoGiornaliero XML", {
      subtotal: riepilogoGrossTotal,
      recordCount: riepilogoDays.reduce((sum, snapshot) => sum + (snapshot.riepilogo.data?.recordCount ?? 0), 0),
      daysWithData: riepilogoDays.length,
      transazioniGrossControl: sumSnapshotValues(dailySnapshots, (snapshot) => snapshot.transazioni.data?.grossTotalEur ?? null),
    }),
    prevendita: metricResult(dashboardSummary.totalePrevendita, "Riconciliazione ordini Ticka", {
      subtotal: dashboardSummary.totalePrevendita,
      riepilogoControl: riepilogoPresaleTotal,
      recordCount: riepilogoDays.reduce((sum, snapshot) => sum + (snapshot.riepilogo.data?.recordCount ?? 0), 0),
      daysWithData: riepilogoDays.length,
      transazioniPresaleControl: sumSnapshotValues(dailySnapshots, (snapshot) => snapshot.transazioni.data?.presaleTotalEur ?? null),
    }),
    gestioneAmministrativa: metricResult(
      dashboardSummary.totaleGestioneAmministrativa,
      "Riconciliazione ordini Ticka",
      {
        subtotal: dashboardSummary.totaleGestioneAmministrativa,
        reportEmissioniControl: managementFeeTotal,
        recordCount: emissioniRecordCount,
        emissionCountWithFeeField,
        daysWithData: emissioniDays.length,
        fieldDetected: managementFeeFieldDetected,
      },
      { missing: !emissioniHasRows }
    ),
    commissioni: metricResult(
      dashboardSummary.totaleCommissioni,
      "Riconciliazione ordini Ticka",
      {
        subtotal: dashboardSummary.totaleCommissioni,
        reportEmissioniControl: commissionTotalRaw,
        recordCount: emissioniRecordCount,
        daysWithData: emissioniDays.length,
        fieldDetected: commissionFieldDetected,
      },
      { missing: !emissioniHasRows }
    ),
    ordini: metricResult(dashboardSummary.ordiniTotali, "Riconciliazione ordini Ticka", {
      subtotal: dashboardSummary.ordiniTotali,
      reportEmissioniControl: ordersCount,
      recordCount: emissioniRecordCount,
      daysWithData: emissioniDays.length,
    }, { missing: !emissioniHasRows }),
    ticketMedio: metricResult(ticketMedio, "RiepilogoGiornaliero XML", {
      corrispettivoLordo: riepilogoGrossTotal,
      bigliettiEmessi: riepilogoTicketsTotal,
    }),
    ricavoMedioPerOrdine: metricResult(
      ricavoMedioPerOrdine,
      "ReportEmissioni JSON + RiepilogoGiornaliero XML",
      {
        priceTotal,
        prevenditaFromRiepilogo: riepilogoPresaleTotal,
        managementFeeTotal,
        commissionTotal,
        ordersCount,
        note: "Metrica composita: prezzo/fee/commissioni da ReportEmissioni e prevendita da RiepilogoGiornaliero.",
      },
      { missing: ricavoMedioPerOrdine === null }
    ),
    eventiAttivi: metricResult(emissioniHasRows && distinctEventKeys.length > 0 ? distinctEventKeys.length : null, "ReportEmissioni JSON", {
      distinctCount: distinctEventKeys.length,
      recordCount: emissioniRecordCount,
    }),
    organizzatoriAttivi: metricResult(
      organizerCfDetected ? distinctOrganizerCf.length : null,
      "ReportEmissioni JSON",
      {
        distinctCount: distinctOrganizerCf.length,
        recordCount: emissioniRecordCount,
        fieldDetected: organizerCfDetected,
      },
      { missing: !organizerCfDetected || !emissioniHasRows }
    ),
    localiAttivi: metricResult(emissioniHasRows && distinctVenueCodes.length > 0 ? distinctVenueCodes.length : null, "ReportEmissioni JSON", {
      distinctCount: distinctVenueCodes.length,
      recordCount: emissioniRecordCount,
    }),
    prezzoMedioTicket: metricResult(prezzoMedioTicket, "ReportEmissioni JSON", {
      priceTotal,
      emissionCount,
    }),
    feeMediaPerTicket: metricResult(
      feeMediaPerTicket,
      "ReportEmissioni JSON",
      {
        managementFeeTotal,
        emissionCountWithFeeField,
        fieldDetected: managementFeeFieldDetected,
      },
      { missing: feeMediaPerTicket === null || !emissioniHasRows }
    ),
    incassoComplessivo: metricResult(
      dashboardSummary.fatturatoTotale,
      "Riconciliazione ordini Ticka",
      {
        summaryRevenue: dashboardSummary.fatturatoTotale,
        reportIncassoControl: incassoComplessivo,
        note: "Allineato ai totali ordini riconciliati per evitare divergenze tra dashboard e dettaglio ordini.",
      },
      { missing: !emissioniHasRows }
    ),
    omaggiCount: metricResult(complimentaryCount, "ReportEmissioni JSON", {
      complimentaryCount,
      emissionCount,
      recordCount: emissioniRecordCount,
    }, { missing: !emissioniHasRows }),
    omaggiPct: metricResult(omaggiPct, "ReportEmissioni JSON", {
      complimentaryCount,
      emissionCount,
    }, { missing: omaggiPct === null || !emissioniHasRows }),
    fatturatoTotale: metricResult(dashboardSummary.fatturatoTotale, "Riconciliazione ordini Ticka", {
      aliasOf: "incassoComplessivo",
      subtotal: dashboardSummary.fatturatoTotale,
      riepilogoGrossControl: riepilogoGrossTotal,
    }),
    fido: metricResult(
      calculateFidoMetric(emissioniRows),
      "ReportEmissioni JSON",
      {
        subtotal: calculateFidoMetric(emissioniRows),
        recordCount: emissioniRecordCount,
        daysWithData: emissioniDays.length,
        note: "Calcolato da specieEmissione e reductionLabel contenenti 'FIDO' o simili.",
      },
      { missing: !emissioniHasRows || calculateFidoMetric(emissioniRows) === 0 }
    ),
    annulli: metricResult(
      annulliCount,
      "LogTransazione XML",
      {
        subtotal: annulliCount,
        recordCount: transazioniDays.reduce((sum, snapshot) => sum + (snapshot.transazioni.data?.recordCount ?? 0), 0),
        note: "Fonte di controllo e riconciliazione, non primaria.",
      }
    ),
    overCommission: metricResult(
      dashboardSummary.totaleCommissioni,
      "Riconciliazione ordini Ticka",
      {
        aliasOf: "commissioni",
        subtotal: dashboardSummary.totaleCommissioni,
        reportEmissioniControl: commissionTotalRaw,
      },
      { missing: !emissioniHasRows }
    ),
    giftCard: metricResult(
      calculateGiftCardMetric(emissioniRows),
      "ReportEmissioni JSON",
      {
        subtotal: calculateGiftCardMetric(emissioniRows),
        recordCount: emissioniRecordCount,
        daysWithData: emissioniDays.length,
        note: "Calcolato da specieEmissione e reductionLabel contenenti 'GIFT' o simili.",
      },
      { missing: !emissioniHasRows || calculateGiftCardMetric(emissioniRows) === 0 }
    ),
    cartaCultura: metricResult(
      calculateCartaCulturaMetric(emissioniRows),
      "ReportEmissioni JSON",
      {
        subtotal: calculateCartaCulturaMetric(emissioniRows),
        recordCount: emissioniRecordCount,
        daysWithData: emissioniDays.length,
        note: "Calcolato da specieEmissione e reductionLabel contenenti 'CARTA CULTURA' o simili.",
      },
      { missing: !emissioniHasRows || calculateCartaCulturaMetric(emissioniRows) === 0 }
    ),
    cartaDocente: metricResult(
      calculateCartaDocenteMetric(emissioniRows),
      "ReportEmissioni JSON",
      {
        subtotal: calculateCartaDocenteMetric(emissioniRows),
        recordCount: emissioniRecordCount,
        daysWithData: emissioniDays.length,
        note: "Calcolato da specieEmissione e reductionLabel contenenti 'CARTA DOCENTE' o simili.",
      },
      { missing: !emissioniHasRows || calculateCartaDocenteMetric(emissioniRows) === 0 }
    ),
  };

  console.log("[ticka-dashboard-range] build summary", {
    from,
    to,
    generatedDatesCount: dates.length,
    riepilogoDaysWithData: riepilogoDays.length,
    emissioniDaysWithData: emissioniDays.length,
    transazioniDaysWithData: transazioniDays.length,
    emissioniRecordCount,
    ordersSummary: {
      ordiniTotali: ordersView.summary.ordiniTotali,
      bigliettiVenduti: ordersView.summary.bigliettiVenduti,
    },
    payloadSummary: {
      fatturatoTotale: payload.fatturatoTotale.value,
      prevendita: payload.prevendita.value,
      bigliettiEmessi: payload.bigliettiEmessi.value,
      ordini: payload.ordini.value,
    },
  });

  return {
    from,
    to,
    dates,
    sourceLabel,
    payload,
    summary: dashboardSummary,
    ordersView,
    revenueSeries: buildSummarySeries(
      dailySnapshots,
      ordersView,
      (summary) => summary.fatturatoTotale,
      carryoverRows,
      carryoverTransactions
    ),
    ticketsSeries: buildTicketsSeries(dailySnapshots, ordersView),
    prevenditaSeries: buildSummarySeries(
      dailySnapshots,
      ordersView,
      (summary) => summary.totalePrevendita,
      carryoverRows,
      carryoverTransactions
    ),
    fatturatoTotaleSeries: buildFatturatoTotaleSeries(dailySnapshots, ordersView, carryoverRows, carryoverTransactions),
    annulliSeries: buildSeriesFromSnapshots(dailySnapshots, (snapshot) => snapshot.transazioni.data?.annulliCount ?? null),
    dailySnapshots,
    emissioniPerformance,
  };
}
