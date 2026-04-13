import { NextResponse } from "next/server";
import { buildTickaDashboardRange } from "@/lib/ticka-metric-formulas";

export const dynamic = "force-dynamic";

function isDebugTickaEnabled() {
  const value = process.env.DEBUG_TICKA?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
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

function resolveRange(request: Request) {
  const { searchParams } = new URL(request.url);
  const fromParam = parseDateParam(searchParams.get("from"));
  const toParam = parseDateParam(searchParams.get("to"));
  const eventId = searchParams.get("eventId");
  const includeRawDebug = searchParams.get("debugRaw") === "1";
  const mode: "orders" | "full" = searchParams.get("mode") === "orders" ? "orders" : "full";

  if (!fromParam && !toParam) {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const fallbackDate = yesterday.toISOString().slice(0, 10);

    return { from: fallbackDate, to: fallbackDate, eventId, includeRawDebug, mode };
  }

  const from = fromParam ?? toParam;
  const to = toParam ?? fromParam;

  if (!from || !to) {
    throw new Error("Impossibile risolvere il range richiesto.");
  }

  if (from > to) {
    throw new Error("Il parametro from non puo' essere successivo a to.");
  }

  return { from, to, eventId, includeRawDebug, mode };
}

export async function GET(request: Request) {
  try {
    const startedAt = Date.now();
    const { from, to, eventId, includeRawDebug, mode } = resolveRange(request);
    console.log("[ticka-dashboard] request params received", {
      from,
      to,
      eventId,
      mode,
    });
    console.log("[ticka-dashboard] resolved range", {
      from,
      to,
      eventId,
      mode,
      filterField: "emissione_data",
    });
    const result = await buildTickaDashboardRange(from, to, { eventId, mode });
    const ordersView = result.ordersView;
    const emissioniRows = result.dailySnapshots.flatMap((snapshot) => snapshot.emissioni.data?.rows ?? []);
    const normalizedEmissionDates = emissioniRows
      .map((row) => row.emissionDate)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    const minEmissionDate = normalizedEmissionDates[0] ?? null;
    const maxEmissionDate = normalizedEmissionDates[normalizedEmissionDates.length - 1] ?? null;
    const emissioniDailyFinalUrls = result.dailySnapshots
      .filter((snapshot) => snapshot.emissioni.data)
      .map((snapshot) => ({
        date: snapshot.date,
        finalUrl: snapshot.emissioni.data?.finalUrl ?? "",
        rawRowCount: snapshot.emissioni.data?.recordCount ?? 0,
      }));
    const emissioniRawRowCount = result.dailySnapshots.reduce(
      (sum, snapshot) => sum + (snapshot.emissioni.data?.recordCount ?? 0),
      0
    );
    const emissioniSourceMode = result.dailySnapshots.some(
      (snapshot) => snapshot.emissioni.data?.sourceMode === "fixture-fallback"
    )
      ? "fixture-fallback"
      : "live-api";
    const fixtureFileUsed =
      result.dailySnapshots.find((snapshot) => snapshot.emissioni.data?.fixtureFileUsed)?.emissioni.data?.fixtureFileUsed ??
      null;
    const ordersDebug = {
      sourceMode: emissioniSourceMode,
      fixtureFileUsed,
      emissioniRangeFinalUrl: `${from}:${to}`,
      emissioniDailyFinalUrls,
      emissioniRawRowCount,
      emissioniNormalizedRowCount: emissioniRows.length,
      emissioniDateMin: minEmissionDate,
      emissioniDateMax: maxEmissionDate,
      normalizedRowsSample: emissioniRows.slice(0, 5),
      eventIdFilterApplied: eventId ?? null,
      rowsAfterEventFilter: ordersView.debug.filteredRowCount,
      rowsWithOrderNumber: ordersView.debug.rowsWithOrderId,
      groupedOrderCount: ordersView.debug.groupedOrderCount,
      ticketRowsWithOrder: ordersView.debug.ticketRowsWithOrder,
      subscriptionRowsWithOrder: ordersView.debug.subscriptionRowsWithOrder,
      openSubscriptionRowsWithOrder: ordersView.debug.openSubscriptionRowsWithOrder,
      openSubscriptionRowsWithoutOrder: ordersView.debug.openSubscriptionRowsWithoutOrder,
      standardSubscriptionDistinctKeys: ordersView.debug.standardSubscriptionDistinctKeys,
      ordersTableRowsCount: ordersView.rows.length,
      ordersTableRowsSample: ordersView.rows.slice(0, 5),
    };
    console.log("[ticka-dashboard] orders debug", {
      from,
      to,
      eventId,
      totalDates: result.emissioniPerformance.totalDates,
      cacheHits: result.emissioniPerformance.cacheHits,
      cacheMisses: result.emissioniPerformance.cacheMisses,
      generatedDatesCount: result.dates.length,
      rawCountTotal: result.emissioniPerformance.totalRawRows,
      normalizedRowCount: result.emissioniPerformance.totalNormalizedRows,
      totalDurationMs: Date.now() - startedAt,
      sourceMode: ordersDebug.sourceMode,
      fixtureFileUsed: ordersDebug.fixtureFileUsed,
      emissioniDateMin: ordersDebug.emissioniDateMin,
      emissioniDateMax: ordersDebug.emissioniDateMax,
      rowsAfterEventFilter: ordersDebug.rowsAfterEventFilter,
      rowsWithOrderNumber: ordersDebug.rowsWithOrderNumber,
      groupedOrderCount: ordersDebug.groupedOrderCount,
      ticketRowsWithOrder: ordersDebug.ticketRowsWithOrder,
      subscriptionRowsWithOrder: ordersDebug.subscriptionRowsWithOrder,
      openSubscriptionRowsWithOrder: ordersDebug.openSubscriptionRowsWithOrder,
      openSubscriptionRowsWithoutOrder: ordersDebug.openSubscriptionRowsWithoutOrder,
      standardSubscriptionDistinctKeys: ordersDebug.standardSubscriptionDistinctKeys,
      ordersTableRowsCount: ordersDebug.ordersTableRowsCount,
      ordiniTotali: ordersView.summary.ordiniTotali,
      bigliettiVenduti: ordersView.summary.bigliettiVenduti,
    });
    if (isDebugTickaEnabled()) {
      console.log("[ticka-dashboard] orders debug detail", {
        tickaDailyUrls: emissioniDailyFinalUrls,
        normalizedRowsSample: ordersDebug.normalizedRowsSample,
        ordersTableRowsSample: ordersDebug.ordersTableRowsSample,
      });
    }
    const hasRealData = Object.values(result.payload).some((metric) => metric.value !== null);
    const warnings = Object.entries(result.payload)
      .filter(([, metric]) => metric.status === "missing")
      .map(([metricKey, metric]) => `${metricKey}: ${String(metric.debug.reason ?? "Dato non disponibile")}`);

    return NextResponse.json({
      success: true,
      hasRealData,
      from,
      to,
      filters: {
        from,
        to,
        eventId,
      },
      payload: {
        ...result.payload,
        sourceLabel: result.sourceLabel,
        warnings,
        summary: result.summary,
        charts: {
          andamentoOrdiniNelTempo: ordersView.andamentoOrdiniNelTempo,
          ordiniPerEvento: ordersView.ordiniPerEvento,
        },
        ordersTable: {
          total: ordersView.total,
          page: 1,
          pageSize: ordersView.total,
          rows: ordersView.rows,
        },
        debug: {
          orders: ordersDebug,
          dataSource: {
            sourceMode: emissioniSourceMode,
            fixtureFileUsed,
            generatedDatesCount: result.dates.length,
            totalDates: result.emissioniPerformance.totalDates,
            cacheHits: result.emissioniPerformance.cacheHits,
            cacheMisses: result.emissioniPerformance.cacheMisses,
            rawRowCount: result.emissioniPerformance.totalRawRows,
            normalizedRowCount: result.emissioniPerformance.totalNormalizedRows,
            ordiniTotali: result.summary.ordiniTotali,
            bigliettiVenduti: result.summary.bigliettiVenduti,
            emissioniDateMin: minEmissionDate,
            emissioniDateMax: maxEmissionDate,
            totalDurationMs: Date.now() - startedAt,
          },
          ...(includeRawDebug
            ? {
                raw: {
                  emissioniRows: emissioniRows,
                  transazioniRows: result.dailySnapshots.flatMap((snapshot) => snapshot.transazioni.data?.rows ?? []),
                },
              }
            : {}),
        },
      },
      sourceLabel: result.sourceLabel,
      availableEvents: ordersView.availableEvents,
      revenueSeries: result.revenueSeries,
      ticketsSeries: result.ticketsSeries,
      prevenditaSeries: result.prevenditaSeries,
      fatturatoTotaleSeries: result.fatturatoTotaleSeries,
      annulliSeries: result.annulliSeries,
      rangeUsed: {
        from,
        to,
        dates: result.dates,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Errore in /api/ticka/dashboard:", error);

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
