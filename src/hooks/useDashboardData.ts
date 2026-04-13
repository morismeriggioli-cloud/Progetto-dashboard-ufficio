"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  MfDataset,
  MfDisponibilitaRecord,
  MfEventoRecord,
  MfOrdineRecord,
  MfVendutoRecord,
} from "@/lib/api-mf";
import {
  buildRangeFromPreset,
  type AppliedDashboardFilters,
  type DateRangePreset,
} from "@/hooks/useDashboardFilters";

type DashboardApiResponse = {
  dataset: MfDataset;
  source: "live" | "mock";
  error: string | null;
};

type EventOption = {
  eventId: string;
  eventName: string;
};

type AggregatedOrder = {
  orderId: string;
  eventId: string;
  eventName: string;
  orderDate: string;
  eventDate: string;
  amount: number;
  tickets: number;
  sectorName: string;
  status?: string;
  venue: string;
  city: string;
};

type AggregatedEvent = {
  eventId: string;
  eventName: string;
  date: string;
  venue: string;
  isActive: boolean;
  revenue: number;
  ticketsSold: number;
  ordersCount: number;
  availableTickets: number;
  sellThrough: number;
  averageTicketPrice: number;
  averageOrderValue: number;
  revenueShare: number;
  targetSellThrough: number;
  paceGap: number;
};

type TrendPoint = {
  date: string;
  revenue: number;
  ticketsSold: number;
  ordersCount: number;
};

type OrdersByEventPoint = {
  eventId: string;
  eventName: string;
  ordersCount: number;
  ticketsSold: number;
  revenue: number;
};

type ListEvent = {
  eventId: string;
  eventName: string;
  venue: string;
  date: string;
  revenue: number;
  ticketsSold: number;
  ordersCount: number;
  availableTickets: number;
  sellThrough: number;
  targetSellThrough: number;
  paceGap: number;
};

export type DashboardDataHookInput =
  | AppliedDashboardFilters
  | {
      appliedDateRange: DateRangePreset;
      appliedStartDate: string;
      appliedEndDate: string;
      appliedEventId: string | null;
    };

function formatDateKey(date: string) {
  return date || "Senza data";
}

function getEventKey(input: { eventId?: string; eventName?: string }) {
  return input.eventId || input.eventName || "evento-sconosciuto";
}

function computeSellThrough(sold: number, available: number) {
  const capacity = sold + available;

  if (capacity <= 0) {
    return 0;
  }

  return (sold / capacity) * 100;
}

function isDateInRange(date: string, range: { from: string; to: string }) {
  if (!date) {
    return false;
  }

  if (range.from && date < range.from) {
    return false;
  }

  if (range.to && date > range.to) {
    return false;
  }

  return true;
}

function aggregateOrders(ordini: MfOrdineRecord[]) {
  const orders = new Map<string, AggregatedOrder>();

  ordini.forEach((row) => {
    const key = row.orderId || `${row.eventId}-${row.orderDate}-${row.amount}`;
    const current = orders.get(key) ?? {
      orderId: key,
      eventId: row.eventId,
      eventName: row.eventName,
      orderDate: row.orderDate,
      eventDate: row.eventDate ?? "",
      amount: 0,
      tickets: 0,
      sectorName: row.sectorName ?? "",
      status: row.status,
      venue: row.venue ?? "",
      city: row.city ?? "",
    };

    current.amount += row.amount;
    current.tickets += row.tickets;
    current.eventName = current.eventName || row.eventName;
    current.eventId = current.eventId || row.eventId;
    current.orderDate = current.orderDate || row.orderDate;
    current.eventDate = current.eventDate || row.eventDate || "";
    current.status = current.status || row.status;
    current.sectorName = current.sectorName || row.sectorName || "";
    current.venue = current.venue || row.venue || "";
    current.city = current.city || row.city || "";

    orders.set(key, current);
  });

  return Array.from(orders.values()).sort((a, b) => b.orderDate.localeCompare(a.orderDate));
}

function getTargetSellThrough(event: Pick<AggregatedEvent, "eventName" | "venue">) {
  const lowerName = event.eventName.toLowerCase();

  if (lowerName.includes("vasco") || lowerName.includes("arena")) {
    return 88;
  }

  if (lowerName.includes("grand prix") || lowerName.includes("summer")) {
    return 80;
  }

  if (event.venue === "Milano" || event.venue === "Roma") {
    return 72;
  }

  return 68;
}

function aggregateEvents(
  venduto: MfVendutoRecord[],
  eventi: MfEventoRecord[],
  disponibilita: MfDisponibilitaRecord[],
  ordini: AggregatedOrder[]
) {
  const eventMap = new Map<string, AggregatedEvent>();

  eventi.forEach((event) => {
    const key = getEventKey(event);
    eventMap.set(key, {
      eventId: event.eventId,
      eventName: event.eventName || "Evento senza nome",
      date: event.date,
      venue: event.venue,
      isActive: event.isActive,
      revenue: 0,
      ticketsSold: 0,
      ordersCount: 0,
      availableTickets: 0,
      sellThrough: 0,
      averageTicketPrice: 0,
      averageOrderValue: 0,
      revenueShare: 0,
      targetSellThrough: 0,
      paceGap: 0,
    });
  });

  venduto.forEach((row) => {
    const key = getEventKey(row);
    const current = eventMap.get(key) ?? {
      eventId: row.eventId,
      eventName: row.eventName || "Evento senza nome",
      date: row.date,
      venue: "",
      isActive: true,
      revenue: 0,
      ticketsSold: 0,
      ordersCount: 0,
      availableTickets: 0,
      sellThrough: 0,
      averageTicketPrice: 0,
      averageOrderValue: 0,
      revenueShare: 0,
      targetSellThrough: 0,
      paceGap: 0,
    };

    current.revenue += row.amount;
    current.ticketsSold += row.tickets;
    current.date = current.date || row.date;
    current.eventName = current.eventName || row.eventName;
    eventMap.set(key, current);
  });

  disponibilita.forEach((row) => {
    const key = getEventKey(row);
    const current = eventMap.get(key) ?? {
      eventId: row.eventId,
      eventName: row.eventName || "Evento senza nome",
      date: row.date,
      venue: "",
      isActive: true,
      revenue: 0,
      ticketsSold: 0,
      ordersCount: 0,
      availableTickets: 0,
      sellThrough: 0,
      averageTicketPrice: 0,
      averageOrderValue: 0,
      revenueShare: 0,
      targetSellThrough: 0,
      paceGap: 0,
    };

    current.availableTickets += row.availableTickets;
    current.date = current.date || row.date;
    current.eventName = current.eventName || row.eventName;
    eventMap.set(key, current);
  });

  ordini.forEach((row) => {
    const key = getEventKey(row);
    const current = eventMap.get(key) ?? {
      eventId: row.eventId,
      eventName: row.eventName || "Evento senza nome",
      date: row.eventDate || "",
      venue: row.venue || "",
      isActive: true,
      revenue: 0,
      ticketsSold: 0,
      ordersCount: 0,
      availableTickets: 0,
      sellThrough: 0,
      averageTicketPrice: 0,
      averageOrderValue: 0,
      revenueShare: 0,
      targetSellThrough: 0,
      paceGap: 0,
    };

    current.ordersCount += 1;
    current.date = current.date || row.eventDate || "";
    current.eventName = current.eventName || row.eventName;
    current.venue = current.venue || row.venue || "";
    eventMap.set(key, current);
  });

  const rows = Array.from(eventMap.values());
  const totalRevenue = rows.reduce((sum, event) => sum + event.revenue, 0);

  return rows
    .map((event) => {
      const sellThrough = computeSellThrough(event.ticketsSold, event.availableTickets);
      const targetSellThrough = getTargetSellThrough(event);

      return {
        ...event,
        sellThrough,
        averageTicketPrice: event.ticketsSold > 0 ? event.revenue / event.ticketsSold : 0,
        averageOrderValue: event.ordersCount > 0 ? event.revenue / event.ordersCount : 0,
        revenueShare: totalRevenue > 0 ? (event.revenue / totalRevenue) * 100 : 0,
        targetSellThrough,
        paceGap: sellThrough - targetSellThrough,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

function bucketDate(date: string, preset: DateRangePreset) {
  if (!date) {
    return "Senza data";
  }

  if (preset === "3m" || preset === "6m" || preset === "1y") {
    return date.slice(0, 7);
  }

  return date;
}

function aggregateTrend(
  venduto: MfVendutoRecord[],
  ordini: AggregatedOrder[],
  preset: DateRangePreset
) {
  const trendMap = new Map<string, TrendPoint>();

  venduto.forEach((row) => {
    const key = bucketDate(formatDateKey(row.date), preset);
    const current = trendMap.get(key) ?? {
      date: key,
      revenue: 0,
      ticketsSold: 0,
      ordersCount: 0,
    };
    current.revenue += row.amount;
    current.ticketsSold += row.tickets;
    trendMap.set(key, current);
  });

  ordini.forEach((row) => {
    const key = bucketDate(formatDateKey(row.orderDate), preset);
    const current = trendMap.get(key) ?? {
      date: key,
      revenue: 0,
      ticketsSold: 0,
      ordersCount: 0,
    };
    current.ordersCount += 1;
    trendMap.set(key, current);
  });

  return Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function buildSalesByEventRows(events: AggregatedEvent[], selectedEventId: string | null) {
  if (!selectedEventId) {
    return events.slice(0, 6);
  }

  const selected = events.find((event) => event.eventId === selectedEventId);
  const peers = events.filter((event) => event.eventId !== selectedEventId).slice(0, 4);

  return selected ? [selected, ...peers] : peers;
}

function buildNearSoldOut(events: AggregatedEvent[], isSingleEvent: boolean) {
  const rows = events
    .filter((event) => event.sellThrough >= 74)
    .sort((a, b) => b.sellThrough - a.sellThrough)
    .slice(0, isSingleEvent ? 1 : 5);

  return rows.length > 0 ? rows : events.slice(0, isSingleEvent ? 1 : 3);
}

function buildUnderPerformance(events: AggregatedEvent[], isSingleEvent: boolean) {
  const rows = events
    .filter((event) => event.paceGap < 0)
    .sort((a, b) => a.paceGap - b.paceGap)
    .slice(0, isSingleEvent ? 1 : 5);

  return rows.length > 0 ? rows : events.slice().reverse().slice(0, isSingleEvent ? 1 : 3);
}

function buildInsights(
  selectedEvent: AggregatedEvent | null,
  strongestEvent: AggregatedEvent | null,
  totalRevenue: number,
  ticketsSold: number,
  totalOrders: number,
  averageSellThrough: number,
  averageTicketPrice: number
) {
  if (selectedEvent) {
    return [
      `${selectedEvent.eventName} genera ${formatCurrency(totalRevenue)} nel periodo applicato.`,
      `Prezzo medio ticket a ${formatCurrency(averageTicketPrice)} con ${formatNumber(ticketsSold)} biglietti emessi.`,
      `Sell-through evento al ${formatPercentage(averageSellThrough)} con ${formatNumber(totalOrders)} ordini confermati.`,
    ];
  }

  return [
    strongestEvent
      ? `${strongestEvent.eventName} traina il periodo con ${formatCurrency(strongestEvent.revenue)} di fatturato.`
      : "Nessun evento disponibile nel periodo applicato.",
    `${formatNumber(ticketsSold)} biglietti venduti e ${formatNumber(totalOrders)} ordini registrati nel periodo.`,
    `Prezzo medio ticket portfolio a ${formatCurrency(averageTicketPrice)} con sell-through medio al ${formatPercentage(averageSellThrough)}.`,
  ];
}

function buildAlerts(
  selectedEvent: AggregatedEvent | null,
  nearSoldOut: ListEvent[],
  underPerformance: ListEvent[],
  availableTickets: number,
  activeEvents: number
) {
  if (selectedEvent) {
    return [
      availableTickets <= 1500
        ? `Disponibilita sotto soglia: restano ${formatNumber(availableTickets)} biglietti.`
        : `Disponibilita ancora gestibile: ${formatNumber(availableTickets)} biglietti residui.`,
      selectedEvent.paceGap < 0
        ? `L'evento e sotto il target di ${(Math.abs(selectedEvent.paceGap)).toFixed(1)} pt di sell-through.`
        : "L'evento e sopra il target di sell-through e puo sostenere un push finale.",
      nearSoldOut[0]
        ? `${nearSoldOut[0].eventName} richiede presidio operativo sul residuo disponibilita.`
        : "Nessun alert operativo rilevante nel periodo applicato.",
    ];
  }

  return [
    nearSoldOut[0]
      ? `${nearSoldOut[0].eventName} supera il ${formatPercentage(nearSoldOut[0].sellThrough)}: verificare pricing e inventory.`
      : "Nessun evento vicino al sold-out nel periodo applicato.",
    underPerformance[0]
      ? `${underPerformance[0].eventName} e sotto benchmark di ${formatPercentage(Math.abs(underPerformance[0].paceGap))}.`
      : "Nessuna criticita evidente di performance nel periodo applicato.",
    `${formatNumber(activeEvents)} eventi risultano attivi nel portafoglio corrente.`,
  ];
}

function toListEvents(events: AggregatedEvent[]) {
  return events.map(
    (event) =>
      ({
        eventId: event.eventId,
        eventName: event.eventName,
        venue: event.venue,
        date: event.date,
        revenue: event.revenue,
        ticketsSold: event.ticketsSold,
        ordersCount: event.ordersCount,
        availableTickets: event.availableTickets,
        sellThrough: event.sellThrough,
        targetSellThrough: event.targetSellThrough,
        paceGap: event.paceGap,
      }) satisfies ListEvent
  );
}

export function formatCurrency(value: number) {
  const hasDecimals = Math.abs(value % 1) > 0;

  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatNumber(value: number) {
  const hasDecimals = Math.abs(value % 1) > 0;

  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: hasDecimals ? 1 : 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercentage(value: number) {
  return `${new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

export function formatDateLabel(value: string) {
  if (!value || value === "Senza data") {
    return value || "Senza data";
  }

  if (/^\d{4}-\d{2}$/.test(value)) {
    return new Date(`${value}-01T00:00:00`).toLocaleDateString("it-IT", {
      month: "short",
      year: "2-digit",
    });
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
  });
}

export function useDashboardData(appliedFilters: DashboardDataHookInput) {
  const [payload, setPayload] = useState<DashboardApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasPayloadRef = useRef(false);

  const load = useCallback(async () => {
    const hasPayload = hasPayloadRef.current;

    if (hasPayload) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const response = await fetch("/api/mf/dashboard", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Dashboard API ha risposto con stato ${response.status}`);
      }

      const data = (await response.json()) as DashboardApiResponse;
      setPayload(data);
      hasPayloadRef.current = true;
      setError(data.error);
    } catch (loadError) {
      setPayload((current) => current);
      setError(loadError instanceof Error ? loadError.message : "Errore di caricamento");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const normalizedFilters = useMemo<AppliedDashboardFilters>(() => {
    if ("selectedPreset" in appliedFilters) {
      return appliedFilters;
    }

    return {
      selectedEventId: appliedFilters.appliedEventId,
      selectedPreset: appliedFilters.appliedDateRange,
      selectedDateRange: buildRangeFromPreset(
        appliedFilters.appliedDateRange,
        appliedFilters.appliedStartDate,
        appliedFilters.appliedEndDate
      ),
    };
  }, [appliedFilters]);

  const computed = useMemo(() => {
    const dataset = payload?.dataset ?? {
      venduto: [],
      eventi: [],
      ordini: [],
      disponibilita: [],
    };

    const eventOptions: EventOption[] = dataset.eventi
      .map((event) => ({
        eventId: event.eventId,
        eventName: event.eventName || "Evento senza nome",
      }))
      .filter(
        (event, index, self) =>
          event.eventId &&
          self.findIndex((entry) => entry.eventId === event.eventId) === index
      )
      .sort((a, b) => a.eventName.localeCompare(b.eventName, "it"));

    const filteredVenduto = dataset.venduto.filter(
      (row) =>
        (!normalizedFilters.selectedEventId || row.eventId === normalizedFilters.selectedEventId) &&
        isDateInRange(row.date, normalizedFilters.selectedDateRange)
    );
    const filteredOrdiniRaw = dataset.ordini.filter(
      (row) =>
        (!normalizedFilters.selectedEventId || row.eventId === normalizedFilters.selectedEventId) &&
        isDateInRange(row.orderDate, normalizedFilters.selectedDateRange)
    );

    const relevantEventIds = new Set<string>();

    filteredVenduto.forEach((row) => {
      if (row.eventId) {
        relevantEventIds.add(row.eventId);
      }
    });

    filteredOrdiniRaw.forEach((row) => {
      if (row.eventId) {
        relevantEventIds.add(row.eventId);
      }
    });

    if (normalizedFilters.selectedEventId) {
      relevantEventIds.add(normalizedFilters.selectedEventId);
    }

    const filteredEventi = dataset.eventi.filter((row) =>
      normalizedFilters.selectedEventId
        ? row.eventId === normalizedFilters.selectedEventId
        : relevantEventIds.size === 0
          ? true
          : relevantEventIds.has(row.eventId)
    );
    const filteredDisponibilita = dataset.disponibilita.filter((row) =>
      normalizedFilters.selectedEventId
        ? row.eventId === normalizedFilters.selectedEventId
        : relevantEventIds.size === 0
          ? true
          : relevantEventIds.has(row.eventId)
    );

    const aggregatedOrders = aggregateOrders(filteredOrdiniRaw);
    const aggregatedEvents = aggregateEvents(
      filteredVenduto,
      filteredEventi,
      filteredDisponibilita,
      aggregatedOrders
    );
    const trend = aggregateTrend(
      filteredVenduto,
      aggregatedOrders,
      normalizedFilters.selectedPreset
    );

    const totalRevenue = filteredVenduto.reduce((sum, row) => sum + row.amount, 0);
    const ticketsSold = filteredVenduto.reduce((sum, row) => sum + row.tickets, 0);
    const totalOrders = aggregatedOrders.length;
    const availableTickets = filteredDisponibilita.reduce(
      (sum, row) => sum + row.availableTickets,
      0
    );
    const activeEvents = filteredEventi.filter((event) => event.isActive).length;
    const averageSellThrough = computeSellThrough(ticketsSold, availableTickets);
    const averageTicketPrice = ticketsSold > 0 ? totalRevenue / ticketsSold : 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const averageRevenuePerEvent =
      aggregatedEvents.length > 0 ? totalRevenue / aggregatedEvents.length : 0;
    const strongestEvent = aggregatedEvents[0] ?? null;
    const weakestEvent =
      aggregatedEvents.length > 0 ? aggregatedEvents[aggregatedEvents.length - 1] : null;
    const selectedEvent =
      !normalizedFilters.selectedEventId
        ? null
        : aggregatedEvents.find((event) => event.eventId === normalizedFilters.selectedEventId) ??
          null;

    const nearSoldOutEvents = toListEvents(
      buildNearSoldOut(aggregatedEvents, Boolean(normalizedFilters.selectedEventId))
    );
    const underPerformanceEvents = toListEvents(
      buildUnderPerformance(aggregatedEvents, Boolean(normalizedFilters.selectedEventId))
    );
    const trendDelta =
      trend.length > 1 && trend[0].revenue > 0
        ? ((trend[trend.length - 1].revenue - trend[0].revenue) / trend[0].revenue) * 100
        : 0;
    const growthEvents = aggregatedEvents.filter((event) => event.paceGap >= 0).slice(0, 5);
    const underTargetEvents = aggregatedEvents.filter((event) => event.paceGap < 0).slice(0, 5);

    return {
      availableEvents: eventOptions,
      selectedEvent,
      trend,
      ceo: {
        isSingleEvent: Boolean(normalizedFilters.selectedEventId),
        totalRevenue,
        ticketsSold,
        totalOrders,
        activeEvents,
        availableTickets,
        averageSellThrough,
        averageTicketPrice,
        averageOrderValue,
        salesByEvent: buildSalesByEventRows(aggregatedEvents, normalizedFilters.selectedEventId),
        topEvents: aggregatedEvents.slice(0, 8),
        nearSoldOutEvents,
        underPerformanceEvents,
        insights: buildInsights(
          selectedEvent,
          strongestEvent,
          totalRevenue,
          ticketsSold,
          totalOrders,
          averageSellThrough,
          averageTicketPrice
        ),
        alerts: buildAlerts(
          selectedEvent,
          nearSoldOutEvents,
          underPerformanceEvents,
          availableTickets,
          activeEvents
        ),
        strongestEvent,
        weakestEvent,
      },
      marketing: {
        isSingleEvent: Boolean(normalizedFilters.selectedEventId),
        monitoredEvents: aggregatedEvents.length,
        totalRevenue,
        averageSellThrough,
        availableTickets,
        averageRevenuePerEvent,
        averageOrderValue,
        trendDelta,
        strongestEvent,
        weakestEvent,
        salesByEvent: aggregatedEvents.slice(0, 8),
        performanceRows: aggregatedEvents.slice(0, 10),
        growthEvents,
        underTargetEvents,
        insights: buildInsights(
          selectedEvent,
          strongestEvent,
          totalRevenue,
          ticketsSold,
          totalOrders,
          averageSellThrough,
          averageTicketPrice
        ),
        trend,
      },
      ordersSummary: {
        totalOrders,
        totalTickets: ticketsSold,
        averageOrderValue,
        averageTicketsPerOrder: totalOrders > 0 ? ticketsSold / totalOrders : 0,
        trend,
        ordersByEvent: aggregatedEvents
          .map(
            (event) =>
              ({
                eventId: event.eventId,
                eventName: event.eventName,
                ordersCount: event.ordersCount,
                ticketsSold: event.ticketsSold,
                revenue: event.revenue,
              }) satisfies OrdersByEventPoint
          )
          .sort((a, b) => b.ordersCount - a.ordersCount)
          .slice(0, normalizedFilters.selectedEventId ? 5 : 8),
        rows: aggregatedOrders,
      },
    };
  }, [normalizedFilters, payload]);

  return {
    isLoading,
    isRefreshing,
    error,
    isFallback: payload?.source === "mock",
    source: payload?.source ?? "mock",
    refresh: load,
    ...computed,
  };
}
