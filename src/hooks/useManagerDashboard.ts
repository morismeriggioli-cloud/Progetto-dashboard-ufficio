"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ManagerDashboardAppliedFilters } from "@/hooks/useManagerDashboardFilters";
import {
  formatCompactCurrency,
  formatCurrency,
  formatDateLabel,
  formatNumber,
  formatPercentage,
} from "@/hooks/useDashboardData";

type FilterOption = {
  value: string;
  label: string;
};

type KpiItem = {
  id:
    | "fatturato-totale"
    | "fido"
    | "annulli"
    | "gestione-amministrativa"
    | "prevendita"
    | "over-commission"
    | "gift-card"
    | "biglietti-emessi"
    | "carta-cultura"
    | "carta-docente";
  label: string;
  value: string;
  delta?: string;
  status: "confirmed" | "candidate" | "missing";
  badge?: string;
  description: string;
  accent: string;
};

type TickaDashboardMetric = {
  value: number | null;
  status: "confirmed" | "candidate" | "missing";
  deltaAbs: number | null;
  deltaPct: number | null;
  sourceLabel?: string | null;
};

type TickaDashboardPayload = {
  fatturatoTotale: TickaDashboardMetric;
  fido: TickaDashboardMetric;
  annulli: TickaDashboardMetric;
  gestioneAmministrativa: TickaDashboardMetric;
  prevendita: TickaDashboardMetric;
  overCommission: TickaDashboardMetric;
  giftCard: TickaDashboardMetric;
  bigliettiEmessi: TickaDashboardMetric;
  cartaCultura: TickaDashboardMetric;
  cartaDocente: TickaDashboardMetric;
  sourceLabel: string;
  warnings: string[];
  summary?: {
    ordiniTotali: number;
    bigliettiVenduti: number;
    valoreMedioOrdine: number | null;
    ticketMediPerOrdine: number | null;
  };
  charts?: {
    andamentoOrdiniNelTempo?: Array<{
      date: string;
      ordersCount: number;
    }>;
  };
  debug?: {
    dataSource?: Record<string, unknown>;
    orders?: Record<string, unknown>;
  };
};

type TickaDashboardResponse = {
  success: boolean;
  hasRealData: boolean;
  payload: TickaDashboardPayload;
  timestamp?: string;
  from?: string;
  to?: string;
  filters?: {
    from: string;
    to: string;
    eventId?: string | null;
  };
  revenueSeries?: Array<{ date: string; value: number }>;
  ticketsSeries?: Array<{ date: string; value: number }>;
  prevenditaSeries?: Array<{ date: string; value: number }>;
  fatturatoTotaleSeries?: Array<{ date: string; value: number }>;
  annulliSeries?: Array<{ date: string; value: number }>;
  rangeUsed?: {
    from: string;
    to: string;
    dates: string[];
  };
};

type TrendPoint = {
  label: string;
  value: number;
};

type ManagerDashboardData = {
  kpis: KpiItem[];
  ordersTrend: TrendPoint[];
  revenueTrend: TrendPoint[];
  ticketsTrend: TrendPoint[];
  prevenditaTrend: TrendPoint[];
  fatturatoTotaleTrend: TrendPoint[];
  hasLiveData: boolean;
  filterOptions: {
    organizers: FilterOption[];
    events: FilterOption[];
    stores: FilterOption[];
    venues: FilterOption[];
    eventStatuses: FilterOption[];
  };
  sourceLabel: string;
  warnings: string[];
  statusNote: string;
};

function getDisplayValue(value: number | null, formatter: (input: number) => string) {
  return value === null ? "-" : formatter(value);
}

function getCandidateBadge(metric: TickaDashboardMetric) {
  return metric.status === "candidate" ? "in validazione" : undefined;
}

function getMissingBadge(metric: TickaDashboardMetric) {
  return metric.status === "missing" ? "dato non disponibile" : undefined;
}

function getPrimaryNote(payload: TickaDashboardPayload, hasRealData: boolean) {
  if (payload.warnings.length > 0) {
    return payload.warnings[0];
  }

  return hasRealData ? payload.sourceLabel : "Dato non disponibile";
}

function buildKpis(payload: TickaDashboardPayload, hasRealData: boolean): KpiItem[] {
  const primaryNote = getPrimaryNote(payload, hasRealData);
  const kpis: KpiItem[] = [
    {
      id: "fatturato-totale",
      label: "Fatturato Totale",
      value: getDisplayValue(payload.fatturatoTotale.value, formatCurrency),
      status: payload.fatturatoTotale.status,
      badge: getCandidateBadge(payload.fatturatoTotale) ?? getMissingBadge(payload.fatturatoTotale),
      delta: payload.fatturatoTotale.sourceLabel ?? payload.sourceLabel ?? primaryNote,
      description: "Valore attuale da formula-check Ticka.",
      accent: "bg-[#146c6d]",
    },
    {
      id: "fido",
      label: "Fido",
      value: getDisplayValue(payload.fido.value, formatCurrency),
      status: payload.fido.status,
      badge: getCandidateBadge(payload.fido) ?? getMissingBadge(payload.fido),
      delta: payload.fido.sourceLabel ?? payload.sourceLabel ?? primaryNote,
      description: "Non disponibile nei payload reali correnti.",
      accent: "bg-[#1d4ed8]",
    },
    {
      id: "annulli",
      label: "Annulli",
      value: getDisplayValue(payload.annulli.value, formatNumber),
      status: payload.annulli.status,
      badge: getCandidateBadge(payload.annulli) ?? getMissingBadge(payload.annulli),
      delta: payload.annulli.sourceLabel ?? payload.sourceLabel ?? primaryNote,
      description: "Conteggio annullamenti da formula-check Ticka.",
      accent: "bg-[#b91c1c]",
    },
    {
      id: "gestione-amministrativa",
      label: "Gestione Amministrativa",
      value: getDisplayValue(payload.gestioneAmministrativa.value, formatCurrency),
      status: payload.gestioneAmministrativa.status,
      badge:
        getCandidateBadge(payload.gestioneAmministrativa) ?? getMissingBadge(payload.gestioneAmministrativa),
      delta: payload.gestioneAmministrativa.sourceLabel ?? payload.sourceLabel ?? primaryNote,
      description: "Non disponibile nei payload reali correnti.",
      accent: "bg-[#0f766e]",
    },
    {
      id: "prevendita",
      label: "Prevendita",
      value: getDisplayValue(payload.prevendita.value, formatCurrency),
      status: payload.prevendita.status,
      badge: getCandidateBadge(payload.prevendita) ?? getMissingBadge(payload.prevendita),
      delta: payload.prevendita.sourceLabel ?? payload.sourceLabel ?? primaryNote,
      description: "Valore attuale da formula-check Ticka.",
      accent: "bg-[#f59e0b]",
    },
    {
      id: "over-commission",
      label: "Over Commission",
      value: getDisplayValue(payload.overCommission.value, formatCurrency),
      status: payload.overCommission.status,
      badge: getCandidateBadge(payload.overCommission) ?? getMissingBadge(payload.overCommission),
      delta: payload.overCommission.sourceLabel ?? payload.sourceLabel ?? primaryNote,
      description: "Non disponibile nei payload reali correnti.",
      accent: "bg-[#7c3aed]",
    },
    {
      id: "gift-card",
      label: "Gift Card",
      value: getDisplayValue(payload.giftCard.value, formatCurrency),
      status: payload.giftCard.status,
      badge: getCandidateBadge(payload.giftCard) ?? getMissingBadge(payload.giftCard),
      delta: payload.giftCard.sourceLabel ?? payload.sourceLabel ?? primaryNote,
      description: "Non disponibile nei payload reali correnti.",
      accent: "bg-[#9333ea]",
    },
    {
      id: "biglietti-emessi",
      label: "Biglietti Emessi",
      value: getDisplayValue(payload.bigliettiEmessi.value, formatNumber),
      status: payload.bigliettiEmessi.status,
      badge: getCandidateBadge(payload.bigliettiEmessi) ?? getMissingBadge(payload.bigliettiEmessi),
      delta: payload.bigliettiEmessi.sourceLabel ?? payload.sourceLabel ?? primaryNote,
      description: "Metrica confermata da formula-check Ticka.",
      accent: "bg-[#0369a1]",
    },
    {
      id: "carta-cultura",
      label: "Carta Cultura",
      value: getDisplayValue(payload.cartaCultura.value, formatCurrency),
      status: payload.cartaCultura.status,
      badge: getCandidateBadge(payload.cartaCultura) ?? getMissingBadge(payload.cartaCultura),
      delta: payload.cartaCultura.sourceLabel ?? payload.sourceLabel ?? primaryNote,
      description: "Non disponibile nei payload reali correnti.",
      accent: "bg-[#15803d]",
    },
    {
      id: "carta-docente",
      label: "Carta del Docente",
      value: getDisplayValue(payload.cartaDocente.value, formatCurrency),
      status: payload.cartaDocente.status,
      badge: getCandidateBadge(payload.cartaDocente) ?? getMissingBadge(payload.cartaDocente),
      delta: payload.cartaDocente.sourceLabel ?? payload.sourceLabel ?? primaryNote,
      description: "Non disponibile nei payload reali correnti.",
      accent: "bg-[#be185d]",
    },
  ];

  console.log("[manager-dashboard] buildKpis source metrics", {
    fatturatoTotale: payload.fatturatoTotale,
    prevendita: payload.prevendita,
    bigliettiEmessi: payload.bigliettiEmessi,
    hasRealData,
  });
  console.log("[manager-dashboard] buildKpis final card values", {
    fatturatoTotale: kpis.find((item) => item.id === "fatturato-totale")?.value,
    prevendita: kpis.find((item) => item.id === "prevendita")?.value,
    bigliettiEmessi: kpis.find((item) => item.id === "biglietti-emessi")?.value,
  });

  return kpis;
}

function buildStatusNote(payload: TickaDashboardPayload, hasRealData: boolean) {
  if (hasRealData) {
    return payload.warnings[0] ?? `Connessione Ticka attiva. Fonte primaria: ${payload.sourceLabel}.`;
  }

  if (payload.warnings.length > 0) {
    return payload.warnings[0];
  }

  return "Connessione Ticka attiva, ma nessuna metrica reale e' disponibile per il periodo richiesto.";
}

function createEmptyPayload(): TickaDashboardPayload {
  const emptyMetric: TickaDashboardMetric = {
    value: null,
    status: "missing",
    deltaAbs: null,
    deltaPct: null,
  };

  return {
    fatturatoTotale: emptyMetric,
    fido: emptyMetric,
    annulli: emptyMetric,
    gestioneAmministrativa: emptyMetric,
    prevendita: emptyMetric,
    overCommission: emptyMetric,
    giftCard: emptyMetric,
    bigliettiEmessi: emptyMetric,
    cartaCultura: emptyMetric,
    cartaDocente: emptyMetric,
    sourceLabel: "Ticka formula-check",
    warnings: [],
  };
}

export function useManagerDashboard(filters: ManagerDashboardAppliedFilters) {
  const [payload, setPayload] = useState<TickaDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasPayloadRef = useRef(false);
  const currentRequestKeyRef = useRef<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    const hasPayload = hasPayloadRef.current;
    const from = filters.selectedDateRange.from;
    const to = filters.selectedDateRange.to;
    const isUsingCustomRange = filters.selectedPreset === "custom";

    console.log("[manager-dashboard] preset resolved to range", {
      todayPresetActive: filters.selectedPreset === "today",
      customFromDraft: null,
      customToDraft: null,
      customFromApplied: from,
      customToApplied: to,
      isUsingCustomRange,
      draftPreset: null,
      appliedPreset: filters.selectedPreset,
      draftFrom: null,
      draftTo: null,
      appliedFrom: from,
      appliedTo: to,
      selectedDateRange: filters.selectedDateRange,
    });

    if (!from || !to) {
      setPayload(null);
      setIsLoading(false);
      setIsRefreshing(false);
      setError("Range non risolto: from/to mancanti prima del fetch.");
      return;
    }

    if (filters.selectedPreset === "custom" && from > to) {
      setPayload(null);
      setIsLoading(false);
      setIsRefreshing(false);
      setError(null);
      return;
    }

    const requestKey = `${filters.selectedPreset}:${from}:${to}`;
    const params = new URLSearchParams();

    if (from) {
      params.set("from", from);
    }

    if (to) {
      params.set("to", to);
    }

    currentRequestKeyRef.current = requestKey;

    if (hasPayload) {
      setPayload(null);
      setIsLoading(true);
      setIsRefreshing(false);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const query = params.toString();
      const finalUrl = `/api/ticka/dashboard${query ? `?${query}` : ""}`;
      console.log("[manager-dashboard] range lato client", {
        todayPresetActive: filters.selectedPreset === "today",
        customFromDraft: null,
        customToDraft: null,
        customFromApplied: from,
        customToApplied: to,
        isUsingCustomRange,
        finalRequestUrl: finalUrl,
        draftPreset: null,
        appliedPreset: filters.selectedPreset,
        draftFrom: null,
        draftTo: null,
        fromApplied: from,
        toApplied: to,
        finalUrl,
      });

      const response = await fetch(finalUrl, {
        method: "GET",
        cache: "no-store",
        signal,
      });

      if (!response.ok) {
        throw new Error(`Dashboard Ticka ha risposto con stato ${response.status}`);
      }

      const data = (await response.json()) as TickaDashboardResponse;
      if (currentRequestKeyRef.current !== requestKey) {
        return;
      }
      console.log("[manager-dashboard] payload /api/ticka/dashboard", data);
      console.log("[manager-dashboard] response meta", {
        preset: filters.selectedPreset,
        requestedFrom: from,
        requestedTo: to,
        responseFrom: data.from ?? data.filters?.from ?? null,
        responseTo: data.to ?? data.filters?.to ?? null,
        responseTimestamp: data.timestamp ?? null,
        summary: data.payload.summary ?? null,
        dataSourceDebug: data.payload.debug?.dataSource ?? null,
      });
      console.log("[manager-dashboard] metric fatturatoTotale", data.payload.fatturatoTotale);
      console.log("[manager-dashboard] metric prevendita", data.payload.prevendita);
      console.log("[manager-dashboard] metric bigliettiEmessi", data.payload.bigliettiEmessi);
      console.log("[manager-dashboard] cards source path check", {
        usesPayloadSummary: false,
        usesPayloadMetrics: {
          fatturatoTotale: data.payload.fatturatoTotale?.value ?? null,
          prevendita: data.payload.prevendita?.value ?? null,
          bigliettiEmessi: data.payload.bigliettiEmessi?.value ?? null,
        },
        payloadSummary: data.payload.summary ?? null,
      });
      setPayload(data);
      hasPayloadRef.current = true;
    } catch (loadError) {
      if (loadError instanceof Error && loadError.name === "AbortError") {
        return;
      }
      setError(loadError instanceof Error ? loadError.message : "Errore di caricamento");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filters.selectedDateRange, filters.selectedPreset]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);

    return () => {
      controller.abort();
    };
  }, [load]);

  const computed = useMemo<ManagerDashboardData>(() => {
    const response = payload ?? {
      success: true,
      hasRealData: false,
      payload: createEmptyPayload(),
      revenueSeries: [],
      ticketsSeries: [],
      prevenditaSeries: [],
      fatturatoTotaleSeries: [],
    };

    return {
      kpis: buildKpis(response.payload, response.hasRealData),
      ordersTrend: (response.payload.charts?.andamentoOrdiniNelTempo ?? []).map((point) => ({
        label: point.date,
        value: point.ordersCount,
      })),
      revenueTrend: (response.revenueSeries ?? []).map((point) => ({
        label: point.date,
        value: point.value,
      })),
      ticketsTrend: (response.ticketsSeries ?? []).map((point) => ({
        label: point.date,
        value: point.value,
      })),
      prevenditaTrend: (response.prevenditaSeries ?? []).map((point) => ({
        label: point.date,
        value: point.value,
      })),
      fatturatoTotaleTrend: (response.fatturatoTotaleSeries ?? []).map((point) => ({
        label: point.date,
        value: point.value,
      })),
      hasLiveData: response.hasRealData,
      filterOptions: {
        organizers: [],
        events: [],
        stores: [],
        venues: [],
        eventStatuses: [],
      },
      sourceLabel: response.payload.sourceLabel,
      warnings: response.payload.warnings,
      statusNote: buildStatusNote(response.payload, response.hasRealData),
    };
  }, [payload]);

  return {
    isLoading,
    isRefreshing,
    error,
    isFallback: false,
    refresh: load,
    ...computed,
  };
}

export type { KpiItem };
export { formatCompactCurrency, formatCurrency, formatDateLabel, formatNumber, formatPercentage };
