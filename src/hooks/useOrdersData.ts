"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DashboardDataHookInput } from "@/hooks/useDashboardData";
import { buildRangeFromPreset } from "@/hooks/useDashboardFilters";

type EventOption = {
  eventId: string;
  eventName: string;
};

type OrdersSummaryRow = {
  orderId: string;
  eventId: string;
  eventName: string;
  orderDate: string;
  eventDate: string;
  tickets: number;
  amount: number;
  sectorName: string;
  status: string;
  venue: string;
  city: string;
};

type OrdersSummaryPayload = {
  totalOrders: number;
  totalTickets: number;
  totalSubscriptions: number;
  totalOpenSubscriptions: number;
  totalRevenue: number;
  totalEmissioni: number;
  totalPresale: number;
  totalManagementFee: number;
  totalCommission: number;
  averageOrderValue: number;
  averageTicketsPerOrder: number;
  trend: Array<{
    date: string;
    revenue: number;
    ticketsSold: number;
    ordersCount: number;
    presale: number;
    totalRevenue: number;
  }>;
  ordersByEvent: Array<{
    eventId: string;
    eventName: string;
    ordersCount: number;
    ticketsSold: number;
    revenue: number;
  }>;
  rows: OrdersSummaryRow[];
};

type TickaOrdersResponse = {
  success: boolean;
  error?: string;
  timestamp?: string;
  from?: string;
  to?: string;
  filters?: {
    from?: string;
    to?: string;
    eventId?: string | null;
  };
  availableEvents?: EventOption[];
  ticketsSeries?: Array<{ date: string; value: number }>;
  prevenditaSeries?: Array<{ date: string; value: number }>;
  fatturatoTotaleSeries?: Array<{ date: string; value: number }>;
  payload?: {
    summary?: {
      ordiniTotali: number;
      bigliettiVenduti: number;
      abbonamentiVenduti: number;
      abbonamentiOpenVenduti: number;
      totaleEmissioni: number;
      totalePrevendita: number;
      totaleGestioneAmministrativa: number;
      totaleCommissioni: number;
      fatturatoTotale: number | null;
      valoreMedioOrdine: number | null;
      ticketMediPerOrdine: number | null;
    };
    bigliettiEmessi?: {
      value: number | null;
    };
    fatturatoTotale?: {
      value: number | null;
    };
    prevendita?: {
      value: number | null;
    };
    gestioneAmministrativa?: {
      value: number | null;
    };
    commissioni?: {
      value: number | null;
    };
    incassoComplessivo?: {
      value: number | null;
    };
    charts?: {
      andamentoOrdiniNelTempo?: Array<{
        date: string;
        ordersCount: number;
      }>;
      ordiniPerEvento?: Array<{
        eventId: string;
        eventName: string;
        ordersCount: number;
      }>;
    };
    ordersTable?: {
      total: number;
      rows: Array<{
        orderId: string;
        eventId: string;
        eventName: string;
        orderDate: string;
        eventDate: string;
        ticketsCount: number;
        amountTotal: number;
        sectorLabel: string;
        status: string;
        venueName: string;
        city: string;
      }>;
    };
    debug?: {
      orders?: {
        rawRowCount?: number;
        rowsWithOrderId?: number;
      };
    };
  };
};

function normalizeFilters(filters: DashboardDataHookInput) {
  if ("selectedPreset" in filters) {
    return {
      eventId: filters.selectedEventId,
      range: filters.selectedDateRange,
    };
  }

  return {
    eventId: filters.appliedEventId,
    range: buildRangeFromPreset(
      filters.appliedDateRange,
      filters.appliedStartDate,
      filters.appliedEndDate
    ),
  };
}

export function useOrdersData(filters: DashboardDataHookInput, page: number = 1, pageSize: number = 25) {
  const normalizedFilters = useMemo(() => normalizeFilters(filters), [filters]);
  const [payload, setPayload] = useState<TickaOrdersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasPayloadRef = useRef(false);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const hasPayload = hasPayloadRef.current;
    const params = new URLSearchParams();

    params.set("from", normalizedFilters.range.from);
    params.set("to", normalizedFilters.range.to);
    params.set("page", page.toString());
    params.set("pageSize", pageSize.toString());

    if (normalizedFilters.eventId) {
      params.set("eventId", normalizedFilters.eventId);
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const finalUrl = `/api/ticka/dashboard?${params.toString()}`;

    if (hasPayload) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setPayload(null);
    hasPayloadRef.current = false;
    setError(null);

    console.log("[orders-page] applied filters for fetch", {
      requestId,
      from: normalizedFilters.range.from,
      to: normalizedFilters.range.to,
      eventId: normalizedFilters.eventId ?? null,
      finalUrl,
    });

    try {
      const response = await fetch(finalUrl, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Dashboard Ticka ha risposto con stato ${response.status}`);
      }

      const data = (await response.json()) as TickaOrdersResponse;
      if (!data.success) {
        throw new Error(data.error ?? "Risposta Ticka non valida");
      }

      if (requestId !== requestIdRef.current) {
        console.log("[orders-page] stale response ignored", {
          requestId,
          latestRequestId: requestIdRef.current,
          finalUrl,
        });
        return;
      }

      console.log("[orders-page] ticka payload debug", {
        requestId,
        requestedUrl: finalUrl,
        responseTimestamp: data.timestamp ?? null,
        responseFilters: data.filters ?? { from: data.from, to: data.to, eventId: normalizedFilters.eventId ?? null },
        summary: data.payload?.summary ?? null,
        apiRecordCount: data.payload?.debug?.orders?.rawRowCount ?? null,
        rowsWithOrderId: data.payload?.debug?.orders?.rowsWithOrderId ?? null,
        distinctOrders: data.payload?.summary?.ordiniTotali ?? 0,
        tableRows: data.payload?.ordersTable?.rows?.length ?? 0,
      });

      setPayload(data);
      hasPayloadRef.current = true;
    } catch (loadError) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setPayload(null);
      hasPayloadRef.current = false;
      setError(loadError instanceof Error ? loadError.message : "Errore di caricamento");
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [normalizedFilters.eventId, normalizedFilters.range.from, normalizedFilters.range.to, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const computed = useMemo(() => {
    const summary = payload?.payload?.summary;
    const charts = payload?.payload?.charts;
    const ordersTable = payload?.payload?.ordersTable;

    return {
      availableEvents: payload?.availableEvents ?? [],
      selectedEvent:
        (payload?.availableEvents ?? []).find((event) => event.eventId === normalizedFilters.eventId) ?? null,
      ordersSummary: {
        totalOrders: summary?.ordiniTotali ?? 0,
        totalTickets: summary?.bigliettiVenduti ?? 0,
        totalSubscriptions: summary?.abbonamentiVenduti ?? 0,
        totalOpenSubscriptions: summary?.abbonamentiOpenVenduti ?? 0,
        totalRevenue: summary?.fatturatoTotale ?? 0,
        totalEmissioni: summary?.totaleEmissioni ?? 0,
        totalPresale: summary?.totalePrevendita ?? 0,
        totalManagementFee: summary?.totaleGestioneAmministrativa ?? 0,
        totalCommission: summary?.totaleCommissioni ?? 0,
        averageOrderValue: summary?.valoreMedioOrdine ?? 0,
        averageTicketsPerOrder: summary?.ticketMediPerOrdine ?? 0,
        trend: (charts?.andamentoOrdiniNelTempo ?? []).map((point) => ({
          date: point.date,
          revenue: payload?.fatturatoTotaleSeries?.find((seriesPoint) => seriesPoint.date === point.date)?.value ?? 0,
          ticketsSold: payload?.ticketsSeries?.find((seriesPoint) => seriesPoint.date === point.date)?.value ?? 0,
          ordersCount: point.ordersCount,
          presale: payload?.prevenditaSeries?.find((seriesPoint) => seriesPoint.date === point.date)?.value ?? 0,
          totalRevenue: payload?.fatturatoTotaleSeries?.find((seriesPoint) => seriesPoint.date === point.date)?.value ?? 0,
        })),
        ordersByEvent: (charts?.ordiniPerEvento ?? []).map((point) => ({
          eventId: point.eventId,
          eventName: point.eventName,
          ordersCount: point.ordersCount,
          ticketsSold: 0,
          revenue: 0,
        })),
        rows: (ordersTable?.rows ?? []).map((row) => ({
          orderId: row.orderId,
          eventId: row.eventId,
          eventName: row.eventName,
          orderDate: row.orderDate,
          eventDate: row.eventDate,
          tickets: row.ticketsCount,
          amount: row.amountTotal,
          sectorName: row.sectorLabel,
          status: row.status,
          venue: row.venueName,
          city: row.city,
        })),
      } satisfies OrdersSummaryPayload,
      pagination: {
        currentPage: page,
        pageSize: pageSize,
        totalPages: Math.ceil((summary?.ordiniTotali ?? 0) / pageSize),
        totalRecords: summary?.ordiniTotali ?? 0,
        hasNextPage: page < Math.ceil((summary?.ordiniTotali ?? 0) / pageSize),
        hasPreviousPage: page > 1,
      },
    };
  }, [normalizedFilters.eventId, payload, page, pageSize]);

  useEffect(() => {
    console.log("[orders-page] mapped frontend data", {
      appliedFilters: {
        from: normalizedFilters.range.from,
        to: normalizedFilters.range.to,
        eventId: normalizedFilters.eventId ?? null,
      },
      responseTimestamp: payload?.timestamp ?? null,
      totalOrders: computed.ordersSummary.totalOrders,
      totalTickets: computed.ordersSummary.totalTickets,
      trendPoints: computed.ordersSummary.trend.length,
      ordersByEvent: computed.ordersSummary.ordersByEvent.length,
      tableRows: computed.ordersSummary.rows.length,
      firstRow: computed.ordersSummary.rows[0] ?? null,
    });
  }, [computed, normalizedFilters.eventId, normalizedFilters.range.from, normalizedFilters.range.to, payload?.timestamp]);

  return {
    isLoading,
    isRefreshing,
    error,
    isFallback: false,
    source: "live" as const,
    refresh: load,
    availableEvents: computed.availableEvents,
    selectedEvent: computed.selectedEvent,
    ordersSummary: computed.ordersSummary,
    pagination: computed.pagination,
  };
}
