"use client";

import { startTransition, useCallback, useMemo, useState } from "react";

export type DateRangePreset = "today" | "7d" | "30d" | "3m" | "6m" | "1y" | "custom";

export type AppliedDashboardFilters = {
  selectedEventId: string | null;
  selectedDateRange: {
    from: string;
    to: string;
  };
  selectedPreset: DateRangePreset;
};

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getTodayDate() {
  return new Date();
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function buildRangeFromPreset(
  preset: DateRangePreset,
  startDate: string,
  endDate: string
) {
  if (preset === "today") {
    const today = formatIsoDate(getTodayDate());
    return { from: today, to: today };
  }

  switch (preset) {
    case "custom":
      return { from: startDate, to: endDate };
    default:
      return { from: startDate, to: endDate };
  }
}

function resolveDashboardRange(
  preset: DateRangePreset,
  startDate: string,
  endDate: string
) {
  const hasCustomRange = Boolean(startDate && endDate);
  const customRangeIsValid =
    hasCustomRange && isIsoDate(startDate) && isIsoDate(endDate) && startDate <= endDate;

  if (customRangeIsValid) {
    return {
      preset: "custom" as const,
      range: { from: startDate, to: endDate },
      isUsingCustomRange: true,
    };
  }

  const todayRange = buildRangeFromPreset("today", "", "");
  return {
    preset: "today" as const,
    range: todayRange,
    isUsingCustomRange: false,
  };
}

export function useDashboardFilters() {
  const initialRange = buildRangeFromPreset("today", "", "");
  const [tempDateRange, setTempDateRange] = useState<DateRangePreset>("today");
  const [tempStartDate, setTempStartDate] = useState(initialRange.from);
  const [tempEndDate, setTempEndDate] = useState(initialRange.to);
  const [tempEventId, setTempEventId] = useState<string | null>(null);

  const [appliedDateRange, setAppliedDateRange] = useState<DateRangePreset>("today");
  const [appliedStartDate, setAppliedStartDate] = useState(initialRange.from);
  const [appliedEndDate, setAppliedEndDate] = useState(initialRange.to);
  const [appliedEventId, setAppliedEventId] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const appliedFilters = useMemo<AppliedDashboardFilters>(
    () => {
      const resolvedRange = resolveDashboardRange(
        appliedDateRange,
        appliedStartDate,
        appliedEndDate
      );

      return {
        selectedEventId: appliedEventId,
        selectedDateRange: resolvedRange.range,
        selectedPreset: resolvedRange.preset,
      };
    },
    [appliedDateRange, appliedEndDate, appliedEventId, appliedStartDate]
  );

  const isDirty = useMemo(
    () =>
      tempDateRange !== appliedDateRange ||
      tempStartDate !== appliedStartDate ||
      tempEndDate !== appliedEndDate ||
      tempEventId !== appliedEventId,
    [
      appliedDateRange,
      appliedEndDate,
      appliedEventId,
      appliedStartDate,
      tempDateRange,
      tempEndDate,
      tempEventId,
      tempStartDate,
    ]
  );

  const validationMessage = useMemo(() => {
    if (!tempStartDate && !tempEndDate) {
      return null;
    }

    if (!tempStartDate || !tempEndDate) {
      return "Inserisci sia la data iniziale sia la data finale.";
    }

    if (!isIsoDate(tempStartDate) || !isIsoDate(tempEndDate)) {
      return "Usa il formato data YYYY-MM-DD.";
    }

    if (tempDateRange !== "custom" && tempStartDate && tempEndDate) {
      return null;
    }

    if (tempStartDate > tempEndDate) {
      return "La data iniziale deve essere precedente o uguale alla data finale.";
    }

    return null;
  }, [tempDateRange, tempEndDate, tempStartDate]);

  const canApply = isDirty && !validationMessage;

  const handleDateRangeChange = useCallback((value: DateRangePreset) => {
    if (value === "today") {
      const resolvedRange = buildRangeFromPreset(value, "", "");
      setTempDateRange("today");
      setTempStartDate(resolvedRange.from);
      setTempEndDate(resolvedRange.to);
      console.log("[dashboard-filters] preset selected", {
        preset: "today",
        from: resolvedRange.from,
        to: resolvedRange.to,
      });
      return;
    }

    setTempDateRange("custom");
    console.log("[dashboard-filters] preset selected", {
      preset: "custom",
      from: tempStartDate,
      to: tempEndDate,
    });
  }, [tempEndDate, tempStartDate]);

  const handleTempStartDateChange = useCallback((value: string) => {
    setTempDateRange("custom");
    setTempStartDate(value);
  }, []);

  const handleTempEndDateChange = useCallback((value: string) => {
    setTempDateRange("custom");
    setTempEndDate(value);
  }, []);

  const applyFilters = useCallback(async () => {
    if (validationMessage) {
      return;
    }

    const resolvedRange = resolveDashboardRange(
      tempDateRange,
      tempStartDate,
      tempEndDate
    );

    console.log("[orders-filters] selected filters before apply", {
      todayPresetActive: tempDateRange === "today",
      customFromDraft: tempStartDate,
      customToDraft: tempEndDate,
      customFromApplied: appliedStartDate,
      customToApplied: appliedEndDate,
      isUsingCustomRange: resolvedRange.isUsingCustomRange,
      draftPreset: tempDateRange,
      appliedPreset: appliedDateRange,
      draftFrom: tempStartDate,
      draftTo: tempEndDate,
      appliedFrom: appliedStartDate,
      appliedTo: appliedEndDate,
      tempDateRange,
      tempStartDate,
      tempEndDate,
      tempEventId,
      selectedRange: resolvedRange.range,
    });

    setIsApplying(true);
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    startTransition(() => {
      setAppliedDateRange(resolvedRange.preset);
      setAppliedStartDate(resolvedRange.range.from);
      setAppliedEndDate(resolvedRange.range.to);
      setAppliedEventId(tempEventId);
    });

    console.log("[orders-filters] applied filters committed", {
      todayPresetActive: resolvedRange.preset === "today",
      customFromDraft: tempStartDate,
      customToDraft: tempEndDate,
      customFromApplied: resolvedRange.range.from,
      customToApplied: resolvedRange.range.to,
      isUsingCustomRange: resolvedRange.isUsingCustomRange,
      draftPreset: tempDateRange,
      appliedPreset: resolvedRange.preset,
      draftFrom: tempStartDate,
      draftTo: tempEndDate,
      appliedFrom: resolvedRange.range.from,
      appliedTo: resolvedRange.range.to,
      appliedDateRange: resolvedRange.preset,
      appliedStartDate: resolvedRange.range.from,
      appliedEndDate: resolvedRange.range.to,
      appliedEventId: tempEventId,
      appliedRange: resolvedRange.range,
    });

    setIsApplying(false);
  }, [
    appliedDateRange,
    appliedEndDate,
    appliedStartDate,
    tempDateRange,
    tempEndDate,
    tempEventId,
    tempStartDate,
    validationMessage,
  ]);

  return {
    tempDateRange,
    tempStartDate,
    tempEndDate,
    tempEventId,
    appliedDateRange,
    appliedStartDate,
    appliedEndDate,
    appliedEventId,
    appliedFilters,
    isDirty,
    canApply,
    isApplying,
    validationMessage,
    setTempDateRange: handleDateRangeChange,
    setTempStartDate: handleTempStartDateChange,
    setTempEndDate: handleTempEndDateChange,
    setTempEventId,
    applyFilters,
  };
}
