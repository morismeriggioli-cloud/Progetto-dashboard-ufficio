"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconCalendar as CalendarDays,
  IconCheck as Check,
  IconChevronDown as ChevronDown,
  IconChevronLeft as ChevronLeft,
  IconChevronRight as ChevronRight,
} from "@tabler/icons-react";
import type { DateRangePreset } from "@/hooks/useDashboardFilters";

type FilterOption = {
  value: string;
  label: string;
};

type ManagerDashboardFiltersProps = {
  tempPreset: DateRangePreset;
  tempStartDate: string;
  tempEndDate: string;
  tempOrganizer: string | null;
  tempEventId: string | null;
  tempStore: string | null;
  tempVenue: string | null;
  tempEventStatus: string | null;
  appliedPreset: DateRangePreset;
  appliedStartDate: string;
  appliedEndDate: string;
  appliedEventId: string | null;
  organizers: FilterOption[];
  events: FilterOption[];
  stores: FilterOption[];
  venues: FilterOption[];
  eventStatuses: FilterOption[];
  isDirty: boolean;
  canApply: boolean;
  shouldShowApply: boolean;
  isApplying: boolean;
  validationMessage: string | null;
  onPresetChange: (value: DateRangePreset) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onOrganizerChange: (value: string | null) => void;
  onEventChange: (value: string | null) => void;
  onStoreChange: (value: string | null) => void;
  onVenueChange: (value: string | null) => void;
  onEventStatusChange: (value: string | null) => void;
  onApply: () => void;
};

const presetOptions: Array<{ value: DateRangePreset; label: string }> = [
  { value: "today", label: "Oggi" },
];

const calendarWeekdays = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function formatIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateString(value: string) {
  if (!value) {
    return null;
  }

  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return null;
  }

  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function toDateString(value: Date) {
  return formatIsoDate(value);
}

function formatFieldDate(value: string) {
  const parsed = parseDateString(value);

  if (!parsed) {
    return "Seleziona data";
  }

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatSummaryDate(value: string) {
  const parsed = parseDateString(value);

  if (!parsed) {
    return value;
  }

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function isSameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function buildCalendarDays(month: Date) {
  const firstDay = startOfMonth(month);
  const offset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - offset);

  return Array.from({ length: 42 }).map((_, index) => {
    const current = new Date(gridStart);
    current.setDate(gridStart.getDate() + index);
    return current;
  });
}

function useOutsideClose<T extends HTMLElement>(isOpen: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  return ref;
}

function FieldShell({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex min-w-0 flex-1 flex-col gap-1.5", className)}>
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function TriggerButton({
  isOpen,
  disabled,
  children,
  onClick,
}: {
  isOpen: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-11 w-full items-center justify-between rounded-2xl bg-white px-4 text-left text-sm text-slate-700 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.18)] ring-1 ring-slate-950/[0.06] transition-all duration-200",
        "hover:-translate-y-px hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/8",
        isOpen && "bg-slate-50 ring-slate-900/12",
        disabled && "cursor-not-allowed bg-slate-50 text-slate-400"
      )}
    >
      {children}
    </button>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = "Tutti gli eventi",
  className,
}: {
  label: string;
  value: string | null;
  options: FilterOption[];
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(isOpen, () => setIsOpen(false));
  const selectedLabel = options.find((option) => option.value === value)?.label ?? placeholder;

  return (
    <FieldShell label={label} className={className}>
      <div ref={ref} className="relative">
        <TriggerButton isOpen={isOpen} onClick={() => setIsOpen((current) => !current)}>
          <span className={cn("truncate", !value && "text-slate-400")}>{selectedLabel}</span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", isOpen && "rotate-180")} />
        </TriggerButton>

        {isOpen ? (
          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-[18px] bg-white p-2 shadow-[0_24px_48px_-24px_rgba(15,23,42,0.28)] ring-1 ring-slate-950/[0.08]">
            <div className="max-h-72 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <span>{placeholder}</span>
                {!value ? <Check className="h-4 w-4 text-slate-500" /> : null}
              </button>

              {options.length === 0 ? (
                <div className="px-3 py-3 text-sm text-slate-400">Dato non disponibile</div>
              ) : (
                options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    <span className="truncate">{option.label}</span>
                    {value === option.value ? <Check className="h-4 w-4 text-slate-500" /> : null}
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
    </FieldShell>
  );
}

function DatePickerField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const initialMonth = useMemo(() => parseDateString(value) ?? new Date(), [value]);
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(initialMonth));
  const ref = useOutsideClose<HTMLDivElement>(isOpen, () => setIsOpen(false));
  const selectedDate = parseDateString(value);
  const today = new Date();
  const calendarDays = buildCalendarDays(visibleMonth);

  return (
    <FieldShell label={label} className={className}>
      <div ref={ref} className="relative">
        <TriggerButton
          isOpen={isOpen}
          onClick={() => {
            const nextOpen = !isOpen;
            if (nextOpen) {
              setVisibleMonth(startOfMonth(parseDateString(value) ?? new Date()));
            }
            setIsOpen(nextOpen);
          }}
        >
          <span className={cn("truncate", !value && "text-slate-400")}>{formatFieldDate(value)}</span>
          <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
        </TriggerButton>

        {isOpen ? (
          <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-[304px] overflow-hidden rounded-[18px] bg-white p-4 shadow-[0_24px_48px_-24px_rgba(15,23,42,0.28)] ring-1 ring-slate-950/[0.08]">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold text-slate-900">
                {new Intl.DateTimeFormat("it-IT", {
                  month: "long",
                  year: "numeric",
                }).format(visibleMonth)}
              </p>
              <button
                type="button"
                onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1">
              {calendarWeekdays.map((weekday) => (
                <div key={weekday} className="px-1 py-2 text-center text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                  {weekday}
                </div>
              ))}

              {calendarDays.map((day) => {
                const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                const isToday = isSameDay(day, today);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => {
                      onChange(toDateString(day));
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-xl text-sm transition-all duration-150",
                      isSelected && "bg-slate-950 text-white shadow-[0_10px_20px_-16px_rgba(15,23,42,0.35)]",
                      !isSelected && isCurrentMonth && "text-slate-700 hover:bg-slate-50",
                      !isSelected && !isCurrentMonth && "text-slate-300 hover:bg-slate-50",
                      isToday && !isSelected && "ring-1 ring-slate-950/[0.08]"
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
              >
                Pulisci
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(toDateString(today));
                  setIsOpen(false);
                }}
                className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-medium text-white shadow-[0_10px_20px_-16px_rgba(15,23,42,0.22)] transition hover:bg-slate-800"
              >
                Oggi
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </FieldShell>
  );
}

export default function ManagerDashboardFilters({
  tempStartDate,
  tempEndDate,
  tempEventId,
  appliedPreset,
  appliedStartDate,
  appliedEndDate,
  appliedEventId,
  events,
  canApply,
  shouldShowApply,
  isApplying,
  validationMessage,
  onPresetChange,
  onStartDateChange,
  onEndDateChange,
  onEventChange,
  onApply,
}: ManagerDashboardFiltersProps) {
  const todayIso = formatIsoDate(new Date());
  const isTodayActive = tempStartDate === todayIso && tempEndDate === todayIso;
  const appliedEventLabel =
    events.find((event) => event.value === appliedEventId)?.label ?? "Tutti gli eventi";
  const activeSummary =
    appliedPreset === "today" || (appliedStartDate === todayIso && appliedEndDate === todayIso)
      ? "Filtri attivi: Oggi"
      : `Filtri attivi: ${formatSummaryDate(appliedStartDate)} - ${formatSummaryDate(appliedEndDate)} | ${appliedEventLabel}`;

  return (
    <section className="flex flex-col gap-3">
      <div className="rounded-[22px] bg-white/95 p-4 shadow-[0_24px_54px_-38px_rgba(15,23,42,0.22)] ring-1 ring-slate-950/[0.05] backdrop-blur">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Filtri dashboard
            </p>
            <p className="text-sm text-slate-600">{activeSummary}</p>
          </div>

          <div className="grid gap-3 lg:grid-cols-[auto_minmax(320px,1.6fr)_180px_180px_auto] lg:items-end lg:gap-4">
            <div className="shrink-0">
              <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-transparent">
                Oggi
              </div>
              <div className="flex items-center rounded-[18px] bg-slate-100/80 p-1">
                {presetOptions.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => onPresetChange(preset.value)}
                    className={cn(
                      "h-10 rounded-2xl px-4 text-sm font-medium transition-all duration-200",
                      isTodayActive
                        ? "bg-white text-slate-950 shadow-[0_10px_22px_-16px_rgba(15,23,42,0.18)] ring-1 ring-slate-950/[0.06]"
                        : "text-slate-500 hover:bg-white/70 hover:text-slate-900"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <SelectField
              label="Evento"
              value={tempEventId}
              options={events}
              onChange={onEventChange}
              className="min-w-[280px] lg:min-w-0"
            />

            <DatePickerField
              label="Data da"
              value={tempStartDate}
              onChange={onStartDateChange}
              className="min-w-[180px] lg:min-w-0"
            />

            <DatePickerField
              label="Data a"
              value={tempEndDate}
              onChange={onEndDateChange}
              className="min-w-[180px] lg:min-w-0"
            />

            {shouldShowApply ? (
              <button
                type="button"
                onClick={onApply}
                disabled={!canApply || isApplying}
                className="h-11 shrink-0 rounded-2xl bg-slate-950 px-5 text-sm font-medium text-white shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isApplying ? "Applico..." : "Applica filtri"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {validationMessage ? (
        <div className="inline-flex max-w-fit rounded-full border border-amber-200/80 bg-amber-50/90 px-3 py-1.5 text-[11px] font-medium text-amber-900">
          {validationMessage}
        </div>
      ) : null}
    </section>
  );
}
