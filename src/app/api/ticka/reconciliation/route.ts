import { NextResponse } from "next/server";
import { buildTickaDashboardRange } from "@/lib/ticka-metric-formulas";

export const dynamic = "force-dynamic";

function round(value: number) {
  return Number(value.toFixed(2));
}

function buildNumericComparison(left: number | null, right: number | null) {
  if (left === null || right === null) {
    return {
      left,
      right,
      delta: null,
      matches: false,
    };
  }

  return {
    left,
    right,
    delta: round(Math.abs(left - right)),
    matches: round(left) === round(right),
  };
}

function parseDateParam(value: string | null) {
  if (!value) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("I parametri from/to devono essere nel formato YYYY-MM-DD.");
  }

  return value;
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

function resolveRange(request: Request) {
  const { searchParams } = new URL(request.url);
  const fromParam = parseDateParam(searchParams.get("from"));
  const toParam = parseDateParam(searchParams.get("to"));

  if (!fromParam && !toParam) {
    throw new Error("Specifica almeno un parametro from oppure to.");
  }

  const from = fromParam ?? toParam;
  const to = toParam ?? fromParam;

  if (!from || !to) {
    throw new Error("Impossibile risolvere il range richiesto.");
  }

  if (from > to) {
    throw new Error("Il parametro from non puo' essere successivo a to.");
  }

  const dates = listDatesInRange(from, to);
  if (dates.length > 366) {
    throw new Error("Il range richiesto e' troppo ampio. Usa un intervallo massimo di 366 giorni.");
  }

  return { from, to, dates };
}

export async function GET(request: Request) {
  try {
    const { from, to, dates } = resolveRange(request);
    const results = [];
    const validationNotes = [
      "Questo endpoint confronta KPI derivati dalla dashboard con summary costruiti dalla stessa pipeline applicativa.",
      "Il risultato indica coerenza interna della nostra logica, non allineamento certificato con un totale ufficiale esterno Ticka.",
      "Per una riconciliazione reale serve un target indipendente per giorno o una formula confermata con il backoffice.",
    ];

    for (const date of dates) {
      const result = await buildTickaDashboardRange(date, date);
      const ordersDebug = result.ordersView.debug;
      const summary = result.summary;
      const payload = result.payload;
      const comparisons = {
        ordini: buildNumericComparison(payload.ordini.value, summary.ordiniTotali),
        abbonamentiStandard: buildNumericComparison(
          ordersDebug.standardSubscriptionDistinctKeys,
          summary.abbonamentiVenduti
        ),
        abbonamentiOpen: buildNumericComparison(
          ordersDebug.openSubscriptionRowsWithOrder,
          summary.abbonamentiOpenVenduti
        ),
        prevendita: buildNumericComparison(payload.prevendita.value, summary.totalePrevendita),
        gestioneAmministrativa: buildNumericComparison(
          payload.gestioneAmministrativa.value,
          summary.totaleGestioneAmministrativa
        ),
        commissioni: buildNumericComparison(payload.commissioni.value, summary.totaleCommissioni),
        incassoComplessivo: buildNumericComparison(payload.incassoComplessivo.value, summary.fatturatoTotale),
      };

      results.push({
        date,
        verification: {
          mode: "derived-self-check",
          independentTargetAvailable: false,
          notes: validationNotes,
        },
        summary: {
          ordiniTotali: summary.ordiniTotali,
          bigliettiVenduti: summary.bigliettiVenduti,
          abbonamentiVenduti: summary.abbonamentiVenduti,
          abbonamentiOpenVenduti: summary.abbonamentiOpenVenduti,
          totaleEmissioni: summary.totaleEmissioni,
          totalePrevendita: summary.totalePrevendita,
          totaleGestioneAmministrativa: summary.totaleGestioneAmministrativa,
          totaleCommissioni: summary.totaleCommissioni,
          fatturatoTotale: summary.fatturatoTotale,
        },
        dashboard: {
          ordini: payload.ordini.value,
          bigliettiEmessi: payload.bigliettiEmessi.value,
          prevendita: payload.prevendita.value,
          gestioneAmministrativa: payload.gestioneAmministrativa.value,
          commissioni: payload.commissioni.value,
          fatturatoTotale: payload.fatturatoTotale.value,
          incassoComplessivo: payload.incassoComplessivo.value,
        },
        debug: {
          rowsWithOrderId: ordersDebug.rowsWithOrderId,
          groupedOrderCount: ordersDebug.groupedOrderCount,
          ticketRowsWithOrder: ordersDebug.ticketRowsWithOrder,
          subscriptionRowsWithOrder: ordersDebug.subscriptionRowsWithOrder,
          openSubscriptionRowsWithOrder: ordersDebug.openSubscriptionRowsWithOrder,
          openSubscriptionRowsWithoutOrder: ordersDebug.openSubscriptionRowsWithoutOrder,
          standardSubscriptionDistinctKeys: ordersDebug.standardSubscriptionDistinctKeys,
        },
        comparisons,
        flags: {
          hasOpenWithoutOrder: ordersDebug.openSubscriptionRowsWithoutOrder > 0,
          standardMatchesDistinctKeys: comparisons.abbonamentiStandard.matches,
          openMatchesRowsWithOrder: comparisons.abbonamentiOpen.matches,
          ordersAligned: comparisons.ordini.matches,
          prevenditaAligned: comparisons.prevendita.matches,
          gestioneAligned: comparisons.gestioneAmministrativa.matches,
          commissioniAligned: comparisons.commissioni.matches,
          incassoAligned: comparisons.incassoComplessivo.matches,
        },
      });
    }

    const flagged = results.filter(
      (row) =>
        row.flags.hasOpenWithoutOrder ||
        !row.flags.standardMatchesDistinctKeys ||
        !row.flags.openMatchesRowsWithOrder ||
        !row.flags.ordersAligned ||
        !row.flags.prevenditaAligned ||
        !row.flags.gestioneAligned ||
        !row.flags.commissioniAligned ||
        !row.flags.incassoAligned
    );

    return NextResponse.json({
      success: true,
      validationMode: "derived-self-check",
      validationNotes,
      from,
      to,
      totalDays: results.length,
      flaggedDays: flagged.length,
      flagged,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Errore interno del server",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
