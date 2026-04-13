"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import type { DateRangePreset } from "@/hooks/useDashboardFilters";
import { buildRangeFromPreset } from "@/hooks/useDashboardFilters";

export type ManagerDashboardAppliedFilters = {
  selectedPreset: DateRangePreset;
  selectedDateRange: {
    from: string;
    to: string;
  };
  selectedOrganizer: string | null;
  selectedEventId: string | null;
  selectedStore: string | null;
  selectedVenue: string | null;
  selectedEventStatus: string | null;
};

type DashboardRangeState = {
  preset: DateRangePreset;
  from: string;
  to: string;
};

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function resolveAppliedDashboardRange(range: DashboardRangeState) {
  const hasCustomRange = Boolean(range.from && range.to);
  const customRangeIsValid =
    hasCustomRange && isIsoDate(range.from) && isIsoDate(range.to) && range.from <= range.to;

  if (customRangeIsValid) {
    return {
      preset: "custom" as const,
      range: {
        from: range.from,
        to: range.to,
      },
      isUsingCustomRange: true,
    };
  }

  return {
    preset: "today" as const,
    range: buildRangeFromPreset("today", "", ""),
    isUsingCustomRange: false,
  };
}

export function useManagerDashboardFilters() {
  const initialAppliedRange = buildRangeFromPreset("today", "", "");
  const [tempRange, setTempRange] = useState<DashboardRangeState>({
    preset: "today",
    from: initialAppliedRange.from,
    to: initialAppliedRange.to,
  });
  const [tempOrganizer, setTempOrganizer] = useState<string | null>(null);
  const [tempEventId, setTempEventId] = useState<string | null>(null);
  const [tempStore, setTempStore] = useState<string | null>(null);
  const [tempVenue, setTempVenue] = useState<string | null>(null);
  const [tempEventStatus, setTempEventStatus] = useState<string | null>(null);

  const [appliedRange, setAppliedRange] = useState<DashboardRangeState>({
    preset: "today",
    from: initialAppliedRange.from,
    to: initialAppliedRange.to,
  });
  const [appliedOrganizer, setAppliedOrganizer] = useState<string | null>(null);
  const [appliedEventId, setAppliedEventId] = useState<string | null>(null);
  const [appliedStore, setAppliedStore] = useState<string | null>(null);
  const [appliedVenue, setAppliedVenue] = useState<string | null>(null);
  const [appliedEventStatus, setAppliedEventStatus] = useState<string | null>(null);

  const appliedFilters = useMemo<ManagerDashboardAppliedFilters>(
    () => {
      const resolvedRange = resolveAppliedDashboardRange(appliedRange);

      return {
        selectedPreset: resolvedRange.preset,
        selectedDateRange: resolvedRange.range,
        selectedOrganizer: appliedOrganizer,
        selectedEventId: appliedEventId,
        selectedStore: appliedStore,
        selectedVenue: appliedVenue,
        selectedEventStatus: appliedEventStatus,
      };
    },
    [
      appliedEventId,
      appliedOrganizer,
      appliedStore,
      appliedEventStatus,
      appliedVenue,
      appliedRange,
    ]
  );

  const isDirty = useMemo(
    () =>
      tempRange.preset !== appliedRange.preset ||
      tempRange.from !== appliedRange.from ||
      tempRange.to !== appliedRange.to ||
      tempOrganizer !== appliedOrganizer ||
      tempEventId !== appliedEventId ||
      tempStore !== appliedStore ||
      tempVenue !== appliedVenue ||
      tempEventStatus !== appliedEventStatus,
    [
      appliedEventId,
      appliedOrganizer,
      appliedStore,
      appliedEventStatus,
      appliedVenue,
      appliedRange.from,
      appliedRange.preset,
      appliedRange.to,
      tempEventId,
      tempEventStatus,
      tempOrganizer,
      tempRange.from,
      tempRange.preset,
      tempRange.to,
      tempStore,
      tempVenue,
    ]
  );

  const validationMessage = useMemo(() => {
    if (!tempRange.from && !tempRange.to) {
      return null;
    }

    if (!tempRange.from || !tempRange.to) {
      return "Inserisci sia la data iniziale sia la data finale.";
    }

    if (!isIsoDate(tempRange.from) || !isIsoDate(tempRange.to)) {
      return "Usa il formato data YYYY-MM-DD.";
    }

    if (tempRange.from > tempRange.to) {
      return "La data iniziale deve essere precedente o uguale alla data finale.";
    }

    return null;
  }, [tempRange.from, tempRange.to]);

  const canApply = isDirty && !validationMessage;
  const shouldShowApply = true;

  const setPreset = useCallback((value: DateRangePreset) => {
    if (value === "today") {
      const resolvedRange = buildRangeFromPreset("today", "", "");
      console.log("[manager-dashboard-filters] preset selected", {
        draftPreset: "today",
        appliedPreset: appliedRange.preset,
        draftFrom: resolvedRange.from,
        draftTo: resolvedRange.to,
        appliedFrom: appliedRange.from,
        appliedTo: appliedRange.to,
      });
      startTransition(() => {
        setTempRange({
          preset: "today",
          from: resolvedRange.from,
          to: resolvedRange.to,
        });
      });
      return;
    }

    console.log("[manager-dashboard-filters] preset selected", {
      draftPreset: "custom",
      appliedPreset: appliedRange.preset,
      draftFrom: tempRange.from,
      draftTo: tempRange.to,
      appliedFrom: appliedRange.from,
      appliedTo: appliedRange.to,
    });

    setTempRange((current) => ({
      ...current,
      preset: "custom",
    }));
  }, [appliedRange.from, appliedRange.preset, appliedRange.to, tempRange.from, tempRange.to]);

  const setRangeFrom = useCallback((value: string) => {
    startTransition(() => {
      setTempRange((current) => ({
        ...current,
        preset: "custom",
        from: value,
      }));
    });
  }, []);

  const setRangeTo = useCallback((value: string) => {
    startTransition(() => {
      setTempRange((current) => ({
        ...current,
        preset: "custom",
        to: value,
      }));
    });
  }, []);

  const applyFilters = useCallback(async () => {
    if (validationMessage) {
      return;
    }

    const resolvedRange = resolveAppliedDashboardRange(tempRange);

    console.log("[manager-dashboard-filters] apply filters", {
      todayPresetActive: tempRange.preset === "today",
      customFromDraft: tempRange.from,
      customToDraft: tempRange.to,
      customFromApplied: appliedRange.from,
      customToApplied: appliedRange.to,
      isUsingCustomRange: resolvedRange.isUsingCustomRange,
      draftPreset: tempRange.preset,
      appliedPreset: appliedRange.preset,
      draftFrom: tempRange.from,
      draftTo: tempRange.to,
      appliedFrom: appliedRange.from,
      appliedTo: appliedRange.to,
      selectedDateRange: resolvedRange.range,
      selectedOrganizer: tempOrganizer,
      selectedEventId: tempEventId,
      selectedStore: tempStore,
      selectedVenue: tempVenue,
      selectedEventStatus: tempEventStatus,
    });

    startTransition(() => {
      setAppliedRange({
        preset: resolvedRange.preset,
        from: resolvedRange.range.from,
        to: resolvedRange.range.to,
      });
      setAppliedOrganizer(tempOrganizer);
      setAppliedEventId(tempEventId);
      setAppliedStore(tempStore);
      setAppliedVenue(tempVenue);
      setAppliedEventStatus(tempEventStatus);
    });
  }, [
    appliedRange.from,
    appliedRange.preset,
    appliedRange.to,
    tempEventId,
    tempEventStatus,
    tempOrganizer,
    tempRange,
    tempStore,
    tempVenue,
    validationMessage,
  ]);

  useEffect(() => {
    console.log("[manager-dashboard-filters] applied filters state", {
      todayPresetActive: appliedRange.preset === "today",
      customFromApplied: appliedRange.from,
      customToApplied: appliedRange.to,
      isUsingCustomRange: appliedRange.preset === "custom",
      appliedPreset: appliedRange.preset,
      appliedFrom: appliedRange.from,
      appliedTo: appliedRange.to,
      appliedFilters,
    });
  }, [appliedFilters, appliedRange.from, appliedRange.preset, appliedRange.to]);

  return {
    tempPreset: tempRange.preset,
    tempStartDate: tempRange.from,
    tempEndDate: tempRange.to,
    tempOrganizer,
    tempEventId,
    tempStore,
    tempVenue,
    tempEventStatus,
    appliedFilters,
    isDirty,
    canApply,
    shouldShowApply,
    isApplying: false,
    validationMessage,
    setTempPreset: setPreset,
    setTempStartDate: setRangeFrom,
    setTempEndDate: setRangeTo,
    setTempOrganizer,
    setTempEventId,
    setTempStore,
    setTempVenue,
    setTempEventStatus,
    applyFilters,
  };
}
