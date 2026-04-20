import { NextResponse } from "next/server";
import { getMockMfDataset } from "@/lib/mock/dashboard-data";
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

function round(value: number) {
  return Number(value.toFixed(2));
}

function createFallbackMetric(value: number | null, sourceLabel: string, reason: string) {
  return {
    value,
    status: value === null ? "missing" : "confirmed",
    sourceLabel,
    deltaAbs: null,
    deltaPct: null,
    debug: {
      reason,
    },
  };
}

function buildMockDashboardFallback(from: string, to: string, eventId: string | null, startedAt: number) {
  const dataset = getMockMfDataset();
  const sourceLabel = "Mock MF 2025/2026";
  const venduto = dataset.venduto.filter(
    (row) => row.date >= from && row.date <= to && (!eventId || row.eventId === eventId)
  );
  const ordini = dataset.ordini.filter(
    (row) => row.orderDate >= from && row.orderDate <= to && (!eventId || row.eventId === eventId)
  );

  if (venduto.length === 0 && ordini.length === 0) {
    return null;
  }

  const revenueByDate = new Map<string, number>();
  const ticketsByDate = new Map<string, number>();
  const ordersByDate = new Map<string, number>();
  const ordersByEvent = new Map<string, { eventId: string; eventName: string; ordersCount: number }>();
  const availableEvents = new Map<string, { eventId: string; eventName: string }>();

  venduto.forEach((row) => {
    revenueByDate.set(row.date, round((revenueByDate.get(row.date) ?? 0) + row.amount));
    ticketsByDate.set(row.date, round((ticketsByDate.get(row.date) ?? 0) + row.tickets));
    availableEvents.set(row.eventId, { eventId: row.eventId, eventName: row.eventName });
  });

  ordini.forEach((row) => {
    ordersByDate.set(row.orderDate, (ordersByDate.get(row.orderDate) ?? 0) + 1);
    const currentEvent = ordersByEvent.get(row.eventId) ?? {
      eventId: row.eventId,
      eventName: row.eventName,
      ordersCount: 0,
    };
    currentEvent.ordersCount += 1;
    ordersByEvent.set(row.eventId, currentEvent);
    availableEvents.set(row.eventId, { eventId: row.eventId, eventName: row.eventName });
  });

  const orderRows = ordini
    .map((row) => ({
      orderId: row.orderId,
      eventId: row.eventId,
      eventName: row.eventName,
      orderDate: row.orderDate,
      eventDate: row.eventDate ?? "",
      ticketsCount: row.tickets,
      subscriptionsCount: 0,
      amountTotal: round(row.amount),
      sectorLabel: row.sectorName ?? "",
      status: "COMPLETATO",
      venueName: row.venue ?? "",
      city: row.city ?? "",
      province: "",
      cancelledLines: 0,
      activeLines: 1,
    }))
    .sort((a, b) => b.orderDate.localeCompare(a.orderDate));

  const fatturatoTotale = round(venduto.reduce((sum, row) => sum + row.amount, 0));
  const bigliettiVenduti = venduto.reduce((sum, row) => sum + row.tickets, 0);
  const ordiniTotali = orderRows.length;
  const valoreMedioOrdine = ordiniTotali > 0 ? round(fatturatoTotale / ordiniTotali) : null;
  const ticketMediPerOrdine = ordiniTotali > 0 ? round(bigliettiVenduti / ordiniTotali) : null;
  const dates = Array.from(new Set([...revenueByDate.keys(), ...ordersByDate.keys()])).sort((a, b) =>
    a.localeCompare(b)
  );
  const revenueSeries = Array.from(revenueByDate.entries())
    .map(([date, value]) => ({ date, value: round(value) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const ticketsSeries = Array.from(ticketsByDate.entries())
    .map(([date, value]) => ({ date, value: round(value) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const andamentoOrdiniNelTempo = Array.from(ordersByDate.entries())
    .map(([date, ordersCount]) => ({ date, ordersCount }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const fallbackReason = "Fallback usato per date senza righe Ticka live ma presenti nel mock MF.";
  const payload = {
    fatturatoTotale: createFallbackMetric(fatturatoTotale, sourceLabel, fallbackReason),
    fido: createFallbackMetric(null, sourceLabel, "Dato non presente nel mock MF."),
    annulli: createFallbackMetric(0, sourceLabel, "Nessun annullo nel mock MF."),
    gestioneAmministrativa: createFallbackMetric(0, sourceLabel, "Dato non separato nel mock MF."),
    prevendita: createFallbackMetric(0, sourceLabel, "Dato non separato nel mock MF."),
    overCommission: createFallbackMetric(0, sourceLabel, "Dato non separato nel mock MF."),
    giftCard: createFallbackMetric(null, sourceLabel, "Dato non presente nel mock MF."),
    cartaCultura: createFallbackMetric(null, sourceLabel, "Dato non presente nel mock MF."),
    cartaDocente: createFallbackMetric(null, sourceLabel, "Dato non presente nel mock MF."),
    bigliettiEmessi: createFallbackMetric(bigliettiVenduti, sourceLabel, fallbackReason),
    sourceLabel,
    warnings: [
      "Ticka non ha restituito righe per il periodo richiesto: dati caricati dal mock MF 2025/2026.",
    ],
    summary: {
      ordiniTotali,
      bigliettiVenduti,
      abbonamentiVenduti: 0,
      abbonamentiOpenVenduti: 0,
      totaleEmissioni: fatturatoTotale,
      totalePrevendita: 0,
      totaleGestioneAmministrativa: 0,
      totaleCommissioni: 0,
      fatturatoTotale,
      valoreMedioOrdine,
      ticketMediPerOrdine,
    },
    charts: {
      andamentoOrdiniNelTempo,
      ordiniPerEvento: Array.from(ordersByEvent.values())
        .sort((a, b) => b.ordersCount - a.ordersCount)
        .slice(0, 8),
    },
    ordersTable: {
      total: orderRows.length,
      page: 1,
      pageSize: orderRows.length,
      rows: orderRows,
    },
    debug: {
      orders: {
        sourceMode: "mock-mf-fallback",
        fixtureFileUsed: null,
        emissioniRangeFinalUrl: `${from}:${to}`,
        emissioniRawRowCount: venduto.length,
        emissioniNormalizedRowCount: venduto.length,
        eventIdFilterApplied: eventId,
        rowsAfterEventFilter: ordini.length,
        groupedOrderCount: orderRows.length,
        ordersTableRowsCount: orderRows.length,
      },
      dataSource: {
        sourceMode: "mock-mf-fallback",
        fixtureFileUsed: null,
        generatedDatesCount: dates.length,
        totalDates: dates.length,
        cacheHits: 0,
        cacheMisses: 0,
        rawRowCount: venduto.length,
        normalizedRowCount: venduto.length,
        ordiniTotali,
        bigliettiVenduti,
        emissioniDateMin: dates[0] ?? null,
        emissioniDateMax: dates[dates.length - 1] ?? null,
        totalDurationMs: Date.now() - startedAt,
      },
    },
  };

  return {
    success: true,
    hasRealData: true,
    from,
    to,
    filters: {
      from,
      to,
      eventId,
    },
    payload,
    sourceLabel,
    availableEvents: Array.from(availableEvents.values()).sort((a, b) =>
      a.eventName.localeCompare(b.eventName, "it")
    ),
    revenueSeries,
    ticketsSeries,
    prevenditaSeries: revenueSeries.map((point) => ({ date: point.date, value: 0 })),
    fatturatoTotaleSeries: revenueSeries,
    annulliSeries: revenueSeries.map((point) => ({ date: point.date, value: 0 })),
    rangeUsed: {
      from,
      to,
      dates,
    },
    timestamp: new Date().toISOString(),
  };
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
    const isTickaEmpty =
      result.summary.ordiniTotali === 0 &&
      result.summary.bigliettiVenduti === 0 &&
      result.summary.fatturatoTotale === 0;
    const isTickaOrderless = result.summary.ordiniTotali === 0 || ordersView.rows.length === 0;
    const todayIso = new Date().toISOString().slice(0, 10);
    const includesFuture = to > todayIso;
    const mockFallback = isTickaEmpty || isTickaOrderless || includesFuture
      ? buildMockDashboardFallback(from, to, eventId, startedAt)
      : null;

    if (mockFallback) {
      return NextResponse.json(mockFallback);
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
