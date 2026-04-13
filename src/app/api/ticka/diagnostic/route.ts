import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import { fetchTickaEmissioniByDate } from "@/lib/ticka-emissioni";
import { fetchTickaRiepilogoXml } from "@/lib/ticka-riepilogo";
import { fetchTickaTransazioniXml } from "@/lib/ticka-transazioni";

export const dynamic = "force-dynamic";

type BackendTarget = {
  fatturatoTotale: number;
  fido: number;
  gestioneAmministrativa: number;
  prevendita: number;
  overCommission: number;
  bigliettiEmessi: number;
  cartaDelDocente: number;
};

type ParsedDiagnosticTransactionNode = {
  TipoTitolo?: string;
  CodiceOrdine?: string;
  Causale?: string;
  CodiceRichiedenteEmissioneSigillo?: string;
  PartnerId?: string | number;
  TitoloAccesso?: {
    Annullamento?: string;
    CorrispettivoLordo?: string | number;
    Prevendita?: string | number;
    CodiceLocale?: string | number;
    IVACorrispettivo?: string | number;
    IVAPrevendita?: string | number;
  };
  Abbonamento?: {
    Annullamento?: string;
    CorrispettivoLordo?: string | number;
    Prevendita?: string | number;
    CodiceLocale?: string | number;
    IVACorrispettivo?: string | number;
    IVAPrevendita?: string | number;
  };
};

type ParsedDiagnosticLogTransazioni = {
  LogTransazione?: {
    Transazione?: ParsedDiagnosticTransactionNode[];
  };
};

type DiagnosticRow = {
  nodeType: "TitoloAccesso" | "Abbonamento" | "Unknown";
  categoriaTitolo: "TitoloAccesso standard" | "Abbonamento" | "Abbonamento Open" | "Altro";
  tipoTitolo: string;
  annullamento: string;
  codiceOrdine: string;
  codiceLocale: string;
  richiedente: string;
  partnerId: string;
  causale: string;
  corrispettivoLordo: number;
  prevendita: number;
  ivaCorrispettivo: number;
  ivaPrevendita: number;
};

type CandidateFormulaRow = {
  formulaId: string;
  filters: {
    annullamento: string;
    categoriaTitolo: string;
    tipoTitolo: string[];
    causaliIncluse: string[];
    causaliEscluse: string[];
    partnerIdEsclusi: string[];
    richiedentiEsclusi: string[];
  };
  ticketCount: number;
  distinctCodiceOrdine: number;
  gross: number;
  grossNet: number;
  presale: number;
  includedByCategory: Record<string, number>;
  excludedByCategory: Record<string, number>;
  delta: {
    bigliettiEmessi: ReturnType<typeof buildDiffEntry>;
    fatturatoTotale: ReturnType<typeof buildDiffEntry>;
    prevendita: ReturnType<typeof buildDiffEntry>;
  };
};

type InvestigationWorkspaceMatch = {
  path: string;
  reason: string;
  matchedTerms: string[];
};

type InvestigationRawCandidate = {
  source: string;
  pattern: string;
  metric: "gross" | "grossNet" | "presale" | "count" | "managementFee";
  value: number;
  recordCount: number;
  deltaAbs: number | null;
  deltaPct: number | null;
};

type InvestigationHypothesis = {
  statement: string;
  confidence: "high" | "medium" | "low";
  evidence: string[];
};

type MissingMetricInvestigationEntry = {
  workspaceMatches: InvestigationWorkspaceMatch[];
  rawCandidates: InvestigationRawCandidate[];
  hypotheses: InvestigationHypothesis[];
  status: "found" | "candidate" | "missing";
};

const diagnosticXmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: true,
  trimValues: true,
  isArray: (_name, jpath) => ["LogTransazione.Transazione"].includes(String(jpath)),
});

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

function resolveDate(request: Request) {
  const { searchParams } = new URL(request.url);
  const value = searchParams.get("date") || "2026-03-09";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Il parametro date deve essere nel formato YYYY-MM-DD.");
  }

  return value;
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

function toEuro(valueInCents: number) {
  return Number((valueInCents / 100).toFixed(2));
}

function round(value: number) {
  return Number(value.toFixed(2));
}

function countBy(items: string[]) {
  return items.reduce<Record<string, number>>((accumulator, item) => {
    const key = item || "(vuoto)";
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
}

function countByRows(rows: DiagnosticRow[], selector: (row: DiagnosticRow) => string) {
  return countBy(rows.map(selector));
}

function getCategoriaTitolo(
  nodeType: DiagnosticRow["nodeType"],
  tipoTitolo: string,
  causale: string
): DiagnosticRow["categoriaTitolo"] {
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

function buildLimitedVariants(values: string[], limit: number) {
  const normalized = values.filter(Boolean);
  const singles = normalized.map((value) => [value]);
  const pairs: string[][] = [];

  for (let index = 0; index < normalized.length; index += 1) {
    for (let innerIndex = index + 1; innerIndex < normalized.length; innerIndex += 1) {
      pairs.push([normalized[index], normalized[innerIndex]]);
    }
  }

  return [[], ...singles, ...pairs].slice(0, limit);
}

function summarizeRows(rows: DiagnosticRow[]) {
  return {
    ticketCount: rows.length,
    distinctCodiceOrdine: new Set(rows.map((row) => row.codiceOrdine).filter(Boolean)).size,
    gross: round(rows.reduce((sum, row) => sum + row.corrispettivoLordo, 0) / 100),
    grossNet: round(rows.reduce((sum, row) => sum + row.corrispettivoLordo - row.ivaCorrispettivo, 0) / 100),
    presale: round(rows.reduce((sum, row) => sum + row.prevendita, 0) / 100),
  };
}

function buildCandidateFormulaEntry(
  formulaId: string,
  filters: CandidateFormulaRow["filters"],
  rows: DiagnosticRow[],
  excludedRows: DiagnosticRow[],
  backendTarget: BackendTarget
): CandidateFormulaRow {
  const summary = summarizeRows(rows);

  return {
    formulaId,
    filters,
    ...summary,
    includedByCategory: countByRows(rows, (row) => row.categoriaTitolo),
    excludedByCategory: countByRows(excludedRows, (row) => row.categoriaTitolo),
    delta: {
      bigliettiEmessi: buildDiffEntry(`${formulaId}.ticketCount`, summary.ticketCount, backendTarget.bigliettiEmessi),
      fatturatoTotale: buildDiffEntry(`${formulaId}.gross`, summary.gross, backendTarget.fatturatoTotale),
      prevendita: buildDiffEntry(`${formulaId}.presale`, summary.presale, backendTarget.prevendita),
    },
  };
}

function topCandidatesByMetric(rows: CandidateFormulaRow[], metric: keyof CandidateFormulaRow["delta"]) {
  return [...rows].sort((left, right) => left.delta[metric].deltaAbs - right.delta[metric].deltaAbs).slice(0, 20);
}

function buildCommonBestMatch(rows: CandidateFormulaRow[]) {
  return [...rows]
    .map((row) => ({
      ...row,
      combinedDeltaScore: round(
        row.delta.bigliettiEmessi.deltaAbs +
          row.delta.fatturatoTotale.deltaAbs +
          row.delta.prevendita.deltaAbs
      ),
    }))
    .sort((left, right) => left.combinedDeltaScore - right.combinedDeltaScore)[0] ?? null;
}

function buildCandidateFormulas(rows: DiagnosticRow[], backendTarget: BackendTarget) {
  const partnerIds = Array.from(new Set(rows.map((row) => row.partnerId || "(vuoto)"))).sort();
  const richiedenti = Array.from(new Set(rows.map((row) => row.richiedente || "(vuoto)"))).sort();
  const tipoTitoloCodes = Array.from(new Set(rows.map((row) => row.tipoTitolo).filter(Boolean))).sort();
  const codiceOrdineBreakdown = countBy(rows.map((row) => row.codiceOrdine));
  const partnerBreakdown = countBy(rows.map((row) => row.partnerId));
  const richiedenteBreakdown = countBy(rows.map((row) => row.richiedente));
  const causaleBreakdown = countBy(rows.map((row) => row.causale));
  const tipoTitoloBreakdown = countBy(rows.map((row) => row.tipoTitolo));
  const categoryBreakdown = rows.reduce<
    Record<string, { count: number; gross: number; grossNet: number; presale: number }>
  >((accumulator, row) => {
    accumulator[row.categoriaTitolo] ||= { count: 0, gross: 0, grossNet: 0, presale: 0 };
    accumulator[row.categoriaTitolo].count += 1;
    accumulator[row.categoriaTitolo].gross += row.corrispettivoLordo;
    accumulator[row.categoriaTitolo].grossNet += row.corrispettivoLordo - row.ivaCorrispettivo;
    accumulator[row.categoriaTitolo].presale += row.prevendita;
    return accumulator;
  }, {});
  const specialFlowBreakdown = {
    canaliPV: summarizeRows(rows.filter((row) => row.richiedente.startsWith("PV"))),
    canaliCW: summarizeRows(rows.filter((row) => row.richiedente.startsWith("CW"))),
    voucherGiftLike: summarizeRows(
      rows.filter((row) => /(DOCENTE|CULTURA|VOUCHER|GIFT|BONUS)/i.test(`${row.causale} ${row.tipoTitolo}`))
    ),
  };

  const topRichiedenti = Object.entries(richiedenteBreakdown)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([key]) => key);
  const targetedRichiedenti = Array.from(new Set([...topRichiedenti, "PV000086", "CW000003", "PV000035"])).filter(
    (value) => richiedenti.includes(value)
  );

  const topCausali = Object.entries(causaleBreakdown)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([key]) => key);
  const topTipoTitoloCodes = Array.from(
    new Set(
      ["I1", ...Object.entries(tipoTitoloBreakdown).sort((left, right) => right[1] - left[1]).slice(0, 4).map(([key]) => key)]
    )
  ).filter(Boolean);

  const annullamentoVariants = [
    { key: "tutti", label: "tutti", predicate: () => true },
    { key: "soloN", label: "solo N", predicate: (row: DiagnosticRow) => row.annullamento === "N" },
    { key: "soloY", label: "solo Y", predicate: (row: DiagnosticRow) => row.annullamento === "S" },
  ];

  const categoriaVariants = [
    { key: "tutteCategorie", label: "tutte", predicate: () => true },
    {
      key: "soloTitoloAccessoStandard",
      label: "solo TitoloAccesso standard",
      predicate: (row: DiagnosticRow) => row.categoriaTitolo === "TitoloAccesso standard",
    },
    {
      key: "soloAbbonamento",
      label: "solo Abbonamento",
      predicate: (row: DiagnosticRow) => row.categoriaTitolo === "Abbonamento",
    },
    {
      key: "soloAbbonamentoOpen",
      label: "solo Abbonamento Open",
      predicate: (row: DiagnosticRow) => row.categoriaTitolo === "Abbonamento Open",
    },
    {
      key: "soloAltro",
      label: "solo Altro",
      predicate: (row: DiagnosticRow) => row.categoriaTitolo === "Altro",
    },
  ];

  const tipoTitoloVariants = [
    { key: "tuttiTipi", label: ["tutti"], predicate: () => true },
    { key: "soloI1", label: ["I1"], predicate: (row: DiagnosticRow) => row.tipoTitolo === "I1" },
    {
      key: "esclusiAbbonamentiOpen",
      label: tipoTitoloCodes.filter((code) => !["OX", "IP", "A1", "R9", "SN"].includes(code)),
      predicate: (row: DiagnosticRow) =>
        row.nodeType === "TitoloAccesso" && !["OX", "IP", "A1", "R9", "SN"].includes(row.tipoTitolo),
    },
    ...topTipoTitoloCodes.map((code) => ({
      key: `tipo_${code}`,
      label: [code],
      predicate: (row: DiagnosticRow) => row.tipoTitolo === code,
    })),
  ];

  const partnerExclusionSets = buildLimitedVariants(partnerIds, 22);
  const richiedenteExclusionSets = buildLimitedVariants(targetedRichiedenti, 16);
  const causaleVariants = [
    { key: "tutteCausali", include: [] as string[], exclude: [] as string[] },
    ...topCausali.map((causale) => ({
      key: `soloCausale_${causale || "vuoto"}`,
      include: [causale],
      exclude: [] as string[],
    })),
    ...topCausali.map((causale) => ({
      key: `excludeCausale_${causale || "vuoto"}`,
      include: [] as string[],
      exclude: [causale],
    })),
  ];

  const formulas: CandidateFormulaRow[] = [];

  for (const annullamentoVariant of annullamentoVariants) {
    for (const categoriaVariant of categoriaVariants) {
      for (const tipoTitoloVariant of tipoTitoloVariants) {
        for (const partnerExclusionSet of partnerExclusionSets) {
          for (const richiedenteExclusionSet of richiedenteExclusionSets) {
            for (const causaleVariant of causaleVariants) {
              const filteredRows = rows
                .filter(annullamentoVariant.predicate)
                .filter(categoriaVariant.predicate)
                .filter(tipoTitoloVariant.predicate)
                .filter((row) =>
                  partnerExclusionSet.length === 0 ? true : !partnerExclusionSet.includes(row.partnerId || "(vuoto)")
                )
                .filter((row) =>
                  richiedenteExclusionSet.length === 0
                    ? true
                    : !richiedenteExclusionSet.includes(row.richiedente || "(vuoto)")
                )
                .filter((row) =>
                  causaleVariant.include.length === 0 ? true : causaleVariant.include.includes(row.causale || "(vuoto)")
                )
                .filter((row) =>
                  causaleVariant.exclude.length === 0 ? true : !causaleVariant.exclude.includes(row.causale || "(vuoto)")
                );

              const filteredSet = new Set(filteredRows);
              const excludedRows = rows.filter((row) => !filteredSet.has(row));

              formulas.push(
                buildCandidateFormulaEntry(
                  [
                    annullamentoVariant.key,
                    categoriaVariant.key,
                    tipoTitoloVariant.key,
                    partnerExclusionSet.length ? `excludePartner_${partnerExclusionSet.join("+")}` : "partnerAll",
                    richiedenteExclusionSet.length
                      ? `excludeRichiedente_${richiedenteExclusionSet.join("+")}`
                      : "richiedenteAll",
                    causaleVariant.key,
                  ].join("__"),
                  {
                    annullamento: annullamentoVariant.label,
                    categoriaTitolo: categoriaVariant.label,
                    tipoTitolo: tipoTitoloVariant.label,
                    causaliIncluse: causaleVariant.include,
                    causaliEscluse: causaleVariant.exclude,
                    partnerIdEsclusi: partnerExclusionSet,
                    richiedentiEsclusi: richiedenteExclusionSet,
                  },
                  filteredRows,
                  excludedRows,
                  backendTarget
                )
              );
            }
          }
        }
      }
    }
  }

  const byBigliettiEmessi = topCandidatesByMetric(formulas, "bigliettiEmessi");
  const byFatturatoTotale = topCandidatesByMetric(formulas, "fatturatoTotale");
  const byPrevendita = topCandidatesByMetric(formulas, "prevendita");

  return {
    combinationCount: formulas.length,
    breakdownPerPartnerId: partnerBreakdown,
    breakdownPerRichiedente: richiedenteBreakdown,
    breakdownPerCausale: causaleBreakdown,
    breakdownPerCodiceOrdine: codiceOrdineBreakdown,
    kpiPerCategoriaTitolo: Object.fromEntries(
      Object.entries(categoryBreakdown).map(([key, value]) => [
        key,
        {
          count: value.count,
          gross: round(value.gross / 100),
          grossNet: round(value.grossNet / 100),
          presale: round(value.presale / 100),
        },
      ])
    ),
    specialFlowBreakdown,
    top20: {
      bigliettiEmessi: byBigliettiEmessi,
      fatturatoTotale: byFatturatoTotale,
      prevendita: byPrevendita,
    },
    bestMatch: {
      bigliettiEmessi: byBigliettiEmessi[0] ?? null,
      fatturatoTotale: byFatturatoTotale[0] ?? null,
      prevendita: byPrevendita[0] ?? null,
    },
    commonBestMatch: buildCommonBestMatch(formulas),
  };
}

function parseTransazioniDiagnostic(rawXml: string) {
  const parsed = diagnosticXmlParser.parse(rawXml) as ParsedDiagnosticLogTransazioni;
  const transazioni = parsed.LogTransazione?.Transazione ?? [];

  const normalizedRows: DiagnosticRow[] = transazioni.map((transaction) => {
    const payload = transaction.TitoloAccesso ?? transaction.Abbonamento ?? {};
    const annullamento = String(payload.Annullamento || "").trim();
    const tipoTitolo = String(transaction.TipoTitolo || "").trim();
    const codiceOrdine = String(transaction.CodiceOrdine || "").trim();
    const codiceLocale = String(payload.CodiceLocale || "").trim();
    const richiedente = String(transaction.CodiceRichiedenteEmissioneSigillo || "").trim();
    const partnerId = String(transaction.PartnerId || "").trim();

    return {
      nodeType: transaction.TitoloAccesso ? "TitoloAccesso" : transaction.Abbonamento ? "Abbonamento" : "Unknown",
      categoriaTitolo: getCategoriaTitolo(
        transaction.TitoloAccesso ? "TitoloAccesso" : transaction.Abbonamento ? "Abbonamento" : "Unknown",
        tipoTitolo,
        String(transaction.Causale || "").trim()
      ),
      tipoTitolo,
      annullamento,
      codiceOrdine,
      codiceLocale,
      richiedente,
      partnerId,
      causale: String(transaction.Causale || "").trim(),
      corrispettivoLordo: parseNumber(payload.CorrispettivoLordo),
      prevendita: parseNumber(payload.Prevendita),
      ivaCorrispettivo: parseNumber(payload.IVACorrispettivo),
      ivaPrevendita: parseNumber(payload.IVAPrevendita),
    };
  });

  const all = normalizedRows;
  const onlyAnnullamentoN = all.filter((row) => row.annullamento === "N");
  const onlyTipoTitoloI1 = all.filter((row) => row.tipoTitolo === "I1");
  const annullamentoNAndTipoTitoloI1 = all.filter(
    (row) => row.annullamento === "N" && row.tipoTitolo === "I1"
  );

  const anomalousChannelPredicate = (row: (typeof normalizedRows)[number]) =>
    row.annullamento === "N" &&
    row.tipoTitolo === "I1" &&
    !(
      (row.richiedente === "PV000107" && row.partnerId === "35") ||
      (row.richiedente === "PV000055" && row.partnerId === "23")
    );

  const anomalousExcluded = all.filter(anomalousChannelPredicate);

  return {
    rows: normalizedRows,
    section: {
      rawCount: all.length,
      transazioneCount: all.length,
      sumCorrispettivoLordo: round(all.reduce((sum, row) => sum + row.corrispettivoLordo, 0) / 100),
      sumPrevendita: round(all.reduce((sum, row) => sum + row.prevendita, 0) / 100),
      sumCorrispettivoLordoNetto: round(
        all.reduce((sum, row) => sum + row.corrispettivoLordo - row.ivaCorrispettivo, 0) / 100
      ),
      sumPrevenditaIncassi: round(
        all.reduce((sum, row) => sum + row.prevendita - row.ivaPrevendita, 0) / 100
      ),
      countTipoTitoloByCode: countBy(all.map((row) => row.tipoTitolo)),
      countAnnullamentoN: all.filter((row) => row.annullamento === "N").length,
      countAnnullamentoY: all.filter((row) => row.annullamento === "S").length,
      distinctCodiceOrdine: new Set(all.map((row) => row.codiceOrdine).filter(Boolean)).size,
      distinctCodiceLocale: new Set(all.map((row) => row.codiceLocale).filter(Boolean)).size,
      countsByPartnerId: countBy(all.map((row) => row.partnerId)),
      countsByCanale: countBy(all.map((row) => row.richiedente)),
      countsByRichiedente: countBy(all.map((row) => row.richiedente)),
      countsByRichiedentePartner: countBy(
        all.map((row) => `${row.richiedente || "(vuoto)"}|${row.partnerId || "(vuoto)"}`)
      ),
      candidateBigliettiEmessi: {
        tutteLeTransazioni: all.length,
        soloAnnullamentoN: onlyAnnullamentoN.length,
        soloTipoTitoloI1: onlyTipoTitoloI1.length,
        annullamentoNAndTipoTitoloI1: annullamentoNAndTipoTitoloI1.length,
        esclusionePartnerCanaliAnomali: anomalousExcluded.length,
      },
      candidateFatturatoTotale: {
        lordoTutteLeTransazioni: round(all.reduce((sum, row) => sum + row.corrispettivoLordo, 0) / 100),
        nettoTutteLeTransazioni: round(
          all.reduce((sum, row) => sum + row.corrispettivoLordo - row.ivaCorrispettivo, 0) / 100
        ),
        lordoAnnullamentoNAndTipoTitoloI1: round(
          annullamentoNAndTipoTitoloI1.reduce((sum, row) => sum + row.corrispettivoLordo, 0) / 100
        ),
        nettoAnnullamentoNAndTipoTitoloI1: round(
          annullamentoNAndTipoTitoloI1.reduce(
            (sum, row) => sum + row.corrispettivoLordo - row.ivaCorrispettivo,
            0
          ) / 100
        ),
        lordoEsclusionePartnerCanaliAnomali: round(
          anomalousExcluded.reduce((sum, row) => sum + row.corrispettivoLordo, 0) / 100
        ),
        nettoEsclusionePartnerCanaliAnomali: round(
          anomalousExcluded.reduce(
            (sum, row) => sum + row.corrispettivoLordo - row.ivaCorrispettivo,
            0
          ) / 100
        ),
      },
      candidatePrevendita: {
        lordaTutteLeTransazioni: round(all.reduce((sum, row) => sum + row.prevendita, 0) / 100),
        incassiTutteLeTransazioni: round(
          all.reduce((sum, row) => sum + row.prevendita - row.ivaPrevendita, 0) / 100
        ),
        lordaAnnullamentoNAndTipoTitoloI1: round(
          annullamentoNAndTipoTitoloI1.reduce((sum, row) => sum + row.prevendita, 0) / 100
        ),
        incassiAnnullamentoNAndTipoTitoloI1: round(
          annullamentoNAndTipoTitoloI1.reduce(
            (sum, row) => sum + row.prevendita - row.ivaPrevendita,
            0
          ) / 100
        ),
        lordaEsclusionePartnerCanaliAnomali: round(
          anomalousExcluded.reduce((sum, row) => sum + row.prevendita, 0) / 100
        ),
        incassiEsclusionePartnerCanaliAnomali: round(
          anomalousExcluded.reduce((sum, row) => sum + row.prevendita - row.ivaPrevendita, 0) / 100
        ),
      },
    },
  };
}

function buildDiffEntry(candidateName: string, candidateValue: number, targetValue: number) {
  const deltaAbs = round(Math.abs(candidateValue - targetValue));
  const deltaPct = targetValue === 0 ? null : round((deltaAbs / Math.abs(targetValue)) * 100);

  return {
    candidateName,
    candidateValue,
    targetValue,
    deltaAbs,
    deltaPct,
  };
}

function sortDiffEntries(entries: ReturnType<typeof buildDiffEntry>[]) {
  return entries.sort((left, right) => left.deltaAbs - right.deltaAbs);
}

function buildWorkspaceMatches(metric: "fido" | "gestioneAmministrativa" | "cartaCultura" | "cartaDelDocente") {
  const matches: Record<typeof metric, InvestigationWorkspaceMatch[]> = {
    fido: [
      {
        path: "src/lib/ticka-metric-formulas.ts",
        reason: "Valore target backend hardcoded usato solo per confronto diagnostico.",
        matchedTerms: ["fido"],
      },
      {
        path: "src/app/api/ticka/diagnostic/route.ts",
        reason: "Target backend presente nel diagnostico, nessuna sorgente reale collegata.",
        matchedTerms: ["fido"],
      },
    ],
    gestioneAmministrativa: [
      {
        path: "src/lib/ticka-emissioni.ts",
        reason: "Mapping di possibili campi raw: gestione_amministrativa, gestioneAmministrativa, administrativeFee, adminFee.",
        matchedTerms: ["gestione_amministrativa", "management fee", "admin fee"],
      },
      {
        path: "src/lib/ticka-metric-formulas.ts",
        reason: "Investigazione formula-check: il campo esiste a livello teorico ma il dataset reale per la data analizzata e' vuoto.",
        matchedTerms: ["gestioneAmministrativa"],
      },
    ],
    cartaCultura: [
      {
        path: "src/app/api/ticka/diagnostic/route.ts",
        reason: "Regex investigativa gia' presente per pattern voucher/bonus/cultura/docente.",
        matchedTerms: ["cultura", "voucher", "bonus", "gift"],
      },
      {
        path: "src/lib/ticka-metric-formulas.ts",
        reason: "La metrica e' marcata missing per assenza di campi o flag affidabili.",
        matchedTerms: ["cartaCultura"],
      },
    ],
    cartaDelDocente: [
      {
        path: "src/app/api/ticka/diagnostic/route.ts",
        reason: "Regex investigativa gia' presente per pattern voucher/bonus/cultura/docente.",
        matchedTerms: ["docente", "teacher", "voucher", "bonus"],
      },
      {
        path: "src/lib/ticka-metric-formulas.ts",
        reason: "La metrica e' marcata missing per assenza di campi o causali testuali affidabili.",
        matchedTerms: ["cartaDelDocente"],
      },
    ],
  };

  return matches[metric];
}

function buildGroupCandidates(
  rows: DiagnosticRow[],
  groupBy: (row: DiagnosticRow) => string,
  sourcePrefix: string,
  targetValue: number | null
) {
  const grouped = rows.reduce<
    Record<string, { count: number; gross: number; grossNet: number; presale: number }>
  >((accumulator, row) => {
    const key = groupBy(row) || "(vuoto)";
    accumulator[key] ||= { count: 0, gross: 0, grossNet: 0, presale: 0 };
    accumulator[key].count += 1;
    accumulator[key].gross += row.corrispettivoLordo;
    accumulator[key].grossNet += row.corrispettivoLordo - row.ivaCorrispettivo;
    accumulator[key].presale += row.prevendita;
    return accumulator;
  }, {});

  const candidates = Object.entries(grouped).flatMap(([pattern, value]) => {
    const gross = round(value.gross / 100);
    const grossNet = round(value.grossNet / 100);
    const presale = round(value.presale / 100);

    return ([
      ["gross", gross],
      ["grossNet", grossNet],
      ["presale", presale],
    ] as const).map(([metric, metricValue]) => {
      const delta = targetValue === null ? { deltaAbs: null, deltaPct: null } : buildDiffEntry("", metricValue, targetValue);

      return {
        source: sourcePrefix,
        pattern,
        metric,
        value: metricValue,
        recordCount: value.count,
        deltaAbs: delta.deltaAbs,
        deltaPct: delta.deltaPct,
      } satisfies InvestigationRawCandidate;
    });
  });

  return candidates.sort((left, right) => {
    const leftDelta = left.deltaAbs ?? Number.POSITIVE_INFINITY;
    const rightDelta = right.deltaAbs ?? Number.POSITIVE_INFINITY;
    return leftDelta - rightDelta;
  });
}

function buildMissingMetricInvestigation(
  rows: DiagnosticRow[],
  reportEmissioniSection: {
    recordCount: number;
    sumGestioneAmministrativa: number;
  },
  backendTarget: BackendTarget | null
) {
  const voucherRegex = /(18APP|APP18|CULTURA|DOCENTE|TEACHER|VOUCHER|BUONO|BONUS|MERITO|WELFARE|MINISTERO|GIFT)/i;
  const voucherLikeRows = rows.filter((row) =>
    voucherRegex.test(`${row.causale} ${row.tipoTitolo} ${row.richiedente} ${row.partnerId}`)
  );
  const byPartner = buildGroupCandidates(rows, (row) => row.partnerId, "logTransazioni.partnerId", backendTarget?.fido ?? null);
  const byRichiedente = buildGroupCandidates(
    rows,
    (row) => row.richiedente,
    "logTransazioni.codiceRichiedenteEmissioneSigillo",
    backendTarget?.cartaDelDocente ?? null
  );
  const byCausaleDocente = buildGroupCandidates(rows, (row) => row.causale, "logTransazioni.causale", backendTarget?.cartaDelDocente ?? null);
  const byCausaleFido = buildGroupCandidates(rows, (row) => row.causale, "logTransazioni.causale", backendTarget?.fido ?? null);
  const byCategoriaGestione = buildGroupCandidates(
    rows,
    (row) => row.categoriaTitolo,
    "logTransazioni.categoriaTitolo",
    backendTarget?.gestioneAmministrativa ?? null
  );
  const byTipoTitoloDocente = buildGroupCandidates(
    rows,
    (row) => row.tipoTitolo,
    "logTransazioni.tipoTitolo",
    backendTarget?.cartaDelDocente ?? null
  );

  return {
    fido: {
      workspaceMatches: buildWorkspaceMatches("fido"),
      rawCandidates: [
        ...byPartner.slice(0, 3),
        ...byCausaleFido.slice(0, 3),
        ...buildGroupCandidates(rows, (row) => row.categoriaTitolo, "logTransazioni.categoriaTitolo", backendTarget?.fido ?? null).slice(0, 2),
      ],
      hypotheses: [
        {
          statement: "Nel workspace non esiste una sorgente diretta per Fido; se e' reale, probabilmente proviene da un report contabile separato o da uno stato di regolazione esterno ai raw Ticka.",
          confidence: "medium",
          evidence: [
            "Nessuna route/query/tabella reale trovata nel progetto.",
            "Nessun gruppo singolo di partner, causale o categoria combacia chiaramente con 1020.00.",
          ],
        },
      ],
      status: "missing",
    } satisfies MissingMetricInvestigationEntry,
    gestioneAmministrativa: {
      workspaceMatches: buildWorkspaceMatches("gestioneAmministrativa"),
      rawCandidates: [
        {
          source: "reportEmissioni.managementFee",
          pattern: "sumGestioneAmministrativa",
          metric: "managementFee",
          value: reportEmissioniSection.sumGestioneAmministrativa,
          recordCount: reportEmissioniSection.recordCount,
          deltaAbs:
            backendTarget?.gestioneAmministrativa === undefined
              ? null
              : round(Math.abs(reportEmissioniSection.sumGestioneAmministrativa - backendTarget.gestioneAmministrativa)),
          deltaPct:
            backendTarget?.gestioneAmministrativa === undefined
              ? null
              : round(
                  (Math.abs(reportEmissioniSection.sumGestioneAmministrativa - backendTarget.gestioneAmministrativa) /
                    Math.abs(backendTarget.gestioneAmministrativa)) *
                    100
                ),
        },
        ...byCategoriaGestione.slice(0, 3),
      ],
      hypotheses: [
        {
          statement: "La pista piu' concreta resta il campo gestione_amministrativa di ReportEmissioni, ma sul 2026-03-09 l'endpoint restituisce zero righe.",
          confidence: "high",
          evidence: [
            "Il mapping del campo esiste in src/lib/ticka-emissioni.ts.",
            "Nel report reale del 2026-03-09 recordCount = 0, quindi il valore non e' leggibile da questa sorgente.",
          ],
        },
        {
          statement: "LogTransazioni e riepilogo non mostrano una componente fee/amministrativa separata con semantica affidabile.",
          confidence: "medium",
          evidence: [
            "Nessun campo esplicito fee/management nei parser XML correnti.",
            "I gruppi per categoria titolo non si avvicinano al target con una semantica convincente.",
          ],
        },
      ],
      status: reportEmissioniSection.recordCount > 0 ? "candidate" : "missing",
    } satisfies MissingMetricInvestigationEntry,
    cartaCultura: {
      workspaceMatches: buildWorkspaceMatches("cartaCultura"),
      rawCandidates: voucherLikeRows.length
        ? buildGroupCandidates(voucherLikeRows, (row) => row.causale, "logTransazioni.voucherLike.causale", null).slice(0, 5)
        : [],
      hypotheses: [
        {
          statement: "Nei raw del 2026-03-09 non compaiono pattern testuali coerenti con Carta Cultura, 18app, bonus cultura o voucher equivalenti.",
          confidence: "high",
          evidence: [
            `Regex voucher/benefit matched rows: ${voucherLikeRows.length}.`,
            "Nessun match testuale nel workspace oltre al codice diagnostico.",
          ],
        },
      ],
      status: voucherLikeRows.length > 0 ? "candidate" : "missing",
    } satisfies MissingMetricInvestigationEntry,
    cartaDelDocente: {
      workspaceMatches: buildWorkspaceMatches("cartaDelDocente"),
      rawCandidates: [
        ...byCausaleDocente.slice(0, 3),
        ...byRichiedente.slice(0, 3),
        ...byTipoTitoloDocente.slice(0, 2),
      ],
      hypotheses: [
        {
          statement: "Non emergono causali o partner con etichette esplicite docente/teacher/ministero; se la metrica esiste, e' probabilmente classificata da un mapping esterno.",
          confidence: "medium",
          evidence: [
            `Regex voucher/benefit matched rows: ${voucherLikeRows.length}.`,
            "I gruppi piu' vicini al target 370.17 non hanno pattern semantici riconoscibili come Carta del Docente.",
          ],
        },
      ],
      status: voucherLikeRows.length > 0 ? "candidate" : "missing",
    } satisfies MissingMetricInvestigationEntry,
  };
}

export async function GET(request: Request) {
  const date = resolveDate(request);
  const backendTarget = backendTargetByDate[date] ?? null;

  const [reportEmissioni, logTransazioni, riepilogoGiornaliero] = await Promise.all([
    fetchTickaEmissioniByDate(date, "emissioni.byDate"),
    fetchTickaTransazioniXml(date, "dashboard.transazioniByDate"),
    fetchTickaRiepilogoXml(date, "dashboard.riepilogoByDate"),
  ]);

  const reportRows = reportEmissioni.normalized.rows;
  const reportEmissioniSection = {
    recordCount: reportRows.length,
    sumPrezzo: round(reportRows.reduce((sum, row) => sum + row.revenue, 0)),
    sumPrevendita: round(reportRows.reduce((sum, row) => sum + row.presale, 0)),
    sumGestioneAmministrativa: round(reportRows.reduce((sum, row) => sum + row.managementFee, 0)),
    distinctNumeroOrdine: new Set(reportRows.map((row) => row.orderNumber).filter(Boolean)).size,
    distinctEventoId: new Set(reportRows.map((row) => row.eventId).filter(Boolean)).size,
    distinctOrganizzatore: new Set(reportRows.map((row) => row.organizer).filter(Boolean)).size,
    distinctLocaleCodice: new Set(reportRows.map((row) => row.venueCode).filter(Boolean)).size,
    countBiglietti: reportRows.filter((row) => row.specieEmissione === "BIGLIETTO").length,
    countAnnullati: reportRows.filter((row) => row.isCancelled).length,
  };

  const parsedLogTransazioni = parseTransazioniDiagnostic(logTransazioni.rawXml);
  const logTransazioniSection = parsedLogTransazioni.section;

  const breakdownPerOrganizzatore = riepilogoGiornaliero.normalized.eventRows.reduce<
    Record<string, { quantity: number; grossTotal: number; presaleTotal: number; events: number }>
  >((accumulator, row) => {
    accumulator[row.organizerName] ||= { quantity: 0, grossTotal: 0, presaleTotal: 0, events: 0 };
    accumulator[row.organizerName].quantity += row.quantity;
    accumulator[row.organizerName].grossTotal += row.gross;
    accumulator[row.organizerName].presaleTotal += row.presale;
    accumulator[row.organizerName].events += 1;
    return accumulator;
  }, {});

  const breakdownPerEvento = riepilogoGiornaliero.normalized.eventRows.reduce<
    Record<string, { organizerName: string; quantity: number; grossTotal: number; presaleTotal: number }>
  >((accumulator, row) => {
    const key = `${row.eventTitle} | ${row.eventDate} | ${row.venueCode}`;
    accumulator[key] ||= {
      organizerName: row.organizerName,
      quantity: 0,
      grossTotal: 0,
      presaleTotal: 0,
    };
    accumulator[key].quantity += row.quantity;
    accumulator[key].grossTotal += row.gross;
    accumulator[key].presaleTotal += row.presale;
    return accumulator;
  }, {});

  const riepilogoGiornalieroSection = {
    grossTotal: toEuro(riepilogoGiornaliero.normalized.grossTotal),
    presaleTotal: toEuro(riepilogoGiornaliero.normalized.presaleTotal),
    ticketsTotal: riepilogoGiornaliero.normalized.ticketsTotal,
    organizersTotal: riepilogoGiornaliero.normalized.organizers,
    eventsTotal: riepilogoGiornaliero.normalized.events,
    venuesTotal: riepilogoGiornaliero.normalized.venues,
    breakdownPerOrganizzatore: Object.fromEntries(
      Object.entries(breakdownPerOrganizzatore).map(([key, value]) => [
        key,
        {
          quantity: value.quantity,
          grossTotal: toEuro(value.grossTotal),
          presaleTotal: toEuro(value.presaleTotal),
          events: value.events,
        },
      ])
    ),
    breakdownPerEvento: Object.fromEntries(
      Object.entries(breakdownPerEvento).map(([key, value]) => [
        key,
        {
          organizerName: value.organizerName,
          quantity: value.quantity,
          grossTotal: toEuro(value.grossTotal),
          presaleTotal: toEuro(value.presaleTotal),
        },
      ])
    ),
  };

  const diffAnalysis = backendTarget
    ? {
        fatturatoTotale: sortDiffEntries([
          buildDiffEntry("reportEmissioni.sumPrezzo", reportEmissioniSection.sumPrezzo, backendTarget.fatturatoTotale),
          buildDiffEntry(
            "logTransazioni.sumCorrispettivoLordo",
            logTransazioniSection.sumCorrispettivoLordo,
            backendTarget.fatturatoTotale
          ),
          buildDiffEntry(
            "logTransazioni.sumCorrispettivoLordoNetto",
            logTransazioniSection.sumCorrispettivoLordoNetto,
            backendTarget.fatturatoTotale
          ),
          buildDiffEntry(
            "logTransazioni.candidateFatturatoTotale.lordoAnnullamentoNAndTipoTitoloI1",
            logTransazioniSection.candidateFatturatoTotale.lordoAnnullamentoNAndTipoTitoloI1,
            backendTarget.fatturatoTotale
          ),
          buildDiffEntry(
            "logTransazioni.candidateFatturatoTotale.nettoAnnullamentoNAndTipoTitoloI1",
            logTransazioniSection.candidateFatturatoTotale.nettoAnnullamentoNAndTipoTitoloI1,
            backendTarget.fatturatoTotale
          ),
          buildDiffEntry(
            "logTransazioni.candidateFatturatoTotale.lordoEsclusionePartnerCanaliAnomali",
            logTransazioniSection.candidateFatturatoTotale.lordoEsclusionePartnerCanaliAnomali,
            backendTarget.fatturatoTotale
          ),
          buildDiffEntry(
            "logTransazioni.candidateFatturatoTotale.nettoEsclusionePartnerCanaliAnomali",
            logTransazioniSection.candidateFatturatoTotale.nettoEsclusionePartnerCanaliAnomali,
            backendTarget.fatturatoTotale
          ),
          buildDiffEntry(
            "riepilogoGiornaliero.grossTotal",
            riepilogoGiornalieroSection.grossTotal,
            backendTarget.fatturatoTotale
          ),
        ]),
        prevendita: sortDiffEntries([
          buildDiffEntry(
            "reportEmissioni.sumPrevendita",
            reportEmissioniSection.sumPrevendita,
            backendTarget.prevendita
          ),
          buildDiffEntry(
            "logTransazioni.sumPrevendita",
            logTransazioniSection.sumPrevendita,
            backendTarget.prevendita
          ),
          buildDiffEntry(
            "logTransazioni.sumPrevenditaIncassi",
            logTransazioniSection.sumPrevenditaIncassi,
            backendTarget.prevendita
          ),
          buildDiffEntry(
            "logTransazioni.candidatePrevendita.lordaAnnullamentoNAndTipoTitoloI1",
            logTransazioniSection.candidatePrevendita.lordaAnnullamentoNAndTipoTitoloI1,
            backendTarget.prevendita
          ),
          buildDiffEntry(
            "logTransazioni.candidatePrevendita.incassiAnnullamentoNAndTipoTitoloI1",
            logTransazioniSection.candidatePrevendita.incassiAnnullamentoNAndTipoTitoloI1,
            backendTarget.prevendita
          ),
          buildDiffEntry(
            "logTransazioni.candidatePrevendita.lordaEsclusionePartnerCanaliAnomali",
            logTransazioniSection.candidatePrevendita.lordaEsclusionePartnerCanaliAnomali,
            backendTarget.prevendita
          ),
          buildDiffEntry(
            "logTransazioni.candidatePrevendita.incassiEsclusionePartnerCanaliAnomali",
            logTransazioniSection.candidatePrevendita.incassiEsclusionePartnerCanaliAnomali,
            backendTarget.prevendita
          ),
          buildDiffEntry(
            "riepilogoGiornaliero.presaleTotal",
            riepilogoGiornalieroSection.presaleTotal,
            backendTarget.prevendita
          ),
        ]),
        bigliettiEmessi: sortDiffEntries([
          buildDiffEntry(
            "reportEmissioni.countBiglietti",
            reportEmissioniSection.countBiglietti,
            backendTarget.bigliettiEmessi
          ),
          buildDiffEntry(
            "logTransazioni.candidateBigliettiEmessi.tutteLeTransazioni",
            logTransazioniSection.candidateBigliettiEmessi.tutteLeTransazioni,
            backendTarget.bigliettiEmessi
          ),
          buildDiffEntry(
            "logTransazioni.candidateBigliettiEmessi.soloAnnullamentoN",
            logTransazioniSection.candidateBigliettiEmessi.soloAnnullamentoN,
            backendTarget.bigliettiEmessi
          ),
          buildDiffEntry(
            "logTransazioni.candidateBigliettiEmessi.soloTipoTitoloI1",
            logTransazioniSection.candidateBigliettiEmessi.soloTipoTitoloI1,
            backendTarget.bigliettiEmessi
          ),
          buildDiffEntry(
            "logTransazioni.candidateBigliettiEmessi.annullamentoNAndTipoTitoloI1",
            logTransazioniSection.candidateBigliettiEmessi.annullamentoNAndTipoTitoloI1,
            backendTarget.bigliettiEmessi
          ),
          buildDiffEntry(
            "logTransazioni.candidateBigliettiEmessi.esclusionePartnerCanaliAnomali",
            logTransazioniSection.candidateBigliettiEmessi.esclusionePartnerCanaliAnomali,
            backendTarget.bigliettiEmessi
          ),
          buildDiffEntry(
            "riepilogoGiornaliero.ticketsTotal",
            riepilogoGiornalieroSection.ticketsTotal,
            backendTarget.bigliettiEmessi
          ),
        ]),
        gestioneAmministrativa: sortDiffEntries([
          buildDiffEntry(
            "reportEmissioni.sumGestioneAmministrativa",
            reportEmissioniSection.sumGestioneAmministrativa,
            backendTarget.gestioneAmministrativa
          ),
        ]),
        fido: [],
        overCommission: [],
        cartaDelDocente: [],
      }
    : null;

  const candidateFormulas = backendTarget ? buildCandidateFormulas(parsedLogTransazioni.rows, backendTarget) : null;
  const missingMetricInvestigation = buildMissingMetricInvestigation(
    parsedLogTransazioni.rows,
    reportEmissioniSection,
    backendTarget
  );

  return NextResponse.json({
    success: true,
    date,
    reportEmissioni: reportEmissioniSection,
    logTransazioni: logTransazioniSection,
    riepilogoGiornaliero: riepilogoGiornalieroSection,
    backendTarget,
    diffAnalysis,
    candidateFormulas,
    missingMetricInvestigation,
    sources: {
      reportEmissioni: reportEmissioni.finalUrl,
      logTransazioni: logTransazioni.finalUrl,
      riepilogoGiornaliero: riepilogoGiornaliero.finalUrl,
    },
    timestamp: new Date().toISOString(),
  });
}
