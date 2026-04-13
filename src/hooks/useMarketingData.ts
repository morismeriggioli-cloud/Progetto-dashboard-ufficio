"use client";

import {
  useDashboardData,
  type DashboardDataHookInput,
} from "@/hooks/useDashboardData";

export function useMarketingData(filters: DashboardDataHookInput) {
  const data = useDashboardData(filters);

  return {
    isLoading: data.isLoading,
    error: data.error,
    isFallback: data.isFallback,
    source: data.source,
    refresh: data.refresh,
    availableEvents: data.availableEvents,
    selectedEvent: data.selectedEvent,
    marketing: data.marketing,
  };
}
