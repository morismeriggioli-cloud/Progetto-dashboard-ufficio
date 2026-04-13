import "server-only";

import { XMLParser } from "fast-xml-parser";
import { fetchTicka } from "@/lib/ticka";

type ParsedTransactionNode = {
  DataEmissione?: string | number;
  NumeroProgressivo?: string | number;
  TipoTitolo?: string | number;
  Causale?: string | number;
  CodiceRichiedenteEmissioneSigillo?: string | number;
  PartnerId?: string | number;
  Descrizione?: string | number;
  TitoloAccesso?: {
    Annullamento?: string;
    CorrispettivoLordo?: string | number;
    Prevendita?: string | number;
  };
  Abbonamento?: {
    Annullamento?: string;
    CorrispettivoLordo?: string | number;
    Prevendita?: string | number;
  };
};

type ParsedLogTransazioni = {
  LogTransazione?: {
    Transazione?: ParsedTransactionNode[];
  };
};

export type TickaTransazioneNormalizedRow = {
  emissionDate: string;
  progressivo: string;
  tipoTitolo: string;
  causale: string;
  codiceRichiedenteEmissioneSigillo: string;
  partnerId: string;
  descrizione: string;
  corrispettivoLordo: number;
  prevendita: number;
  annullamento: string;
};

export type TickaTransazioniNormalized = {
  sourceDate: string;
  transactionsTotal: number;
  grossTotal: number;
  presaleTotal: number;
  rows: TickaTransazioneNormalizedRow[];
  amountsInCents: true;
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: true,
  trimValues: true,
  isArray: (_name, jpath) => ["LogTransazione.Transazione"].includes(String(jpath)),
});

function parseNumber(value: string | number | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeDate(value: string | number | undefined): string {
  const raw = String(value || "").trim();
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  return raw;
}

function getTransactionPayload(transaction: ParsedTransactionNode) {
  return transaction.TitoloAccesso ?? transaction.Abbonamento ?? {};
}

export function parseTickaTransazioniXml(xml: string): TickaTransazioniNormalized {
  const parsed = xmlParser.parse(xml) as ParsedLogTransazioni;
  const transactions = parsed.LogTransazione?.Transazione ?? [];

  const rows = transactions.map((transaction) => {
    const payload = getTransactionPayload(transaction);

    return {
      emissionDate: normalizeDate(transaction.DataEmissione),
      progressivo: String(transaction.NumeroProgressivo || "").trim(),
      tipoTitolo: String(transaction.TipoTitolo || "").trim(),
      causale: String(transaction.Causale || "").trim(),
      codiceRichiedenteEmissioneSigillo: String(transaction.CodiceRichiedenteEmissioneSigillo || "").trim(),
      partnerId: String(transaction.PartnerId || "").trim(),
      descrizione: String(transaction.Descrizione || "").trim(),
      corrispettivoLordo: parseNumber(payload.CorrispettivoLordo),
      prevendita: parseNumber(payload.Prevendita),
      annullamento: String(payload.Annullamento || "").trim(),
    };
  });

  return {
    sourceDate: rows[0]?.emissionDate || "",
    transactionsTotal: rows.length,
    grossTotal: rows.reduce((sum, row) => sum + row.corrispettivoLordo, 0),
    presaleTotal: rows.reduce((sum, row) => sum + row.prevendita, 0),
    rows,
    amountsInCents: true,
  };
}

export async function fetchTickaTransazioniXml(
  date: string,
  endpointName: "dashboard.transazioniByDate" | "kpi.transazioniByDate" = "dashboard.transazioniByDate"
) {
  const finalUrl = `/logtransazioni/date/data/${date}`;
  const rawXml = await fetchTicka<string>(finalUrl, {
    endpointName,
    headers: {
      Accept: "application/xml, text/xml, application/json",
    },
  });

  return {
    finalUrl,
    statusCode: 200,
    rawXml,
    normalized: parseTickaTransazioniXml(rawXml),
  };
}
