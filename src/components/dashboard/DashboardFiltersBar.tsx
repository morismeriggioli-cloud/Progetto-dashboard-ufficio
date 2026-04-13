"use client";

import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DateRangePreset } from "@/hooks/useDashboardFilters";

type EventOption = {
  eventId: string;
  eventName: string;
};

type DashboardFiltersBarProps = {
  tempDateRange: DateRangePreset;
  tempStartDate: string;
  tempEndDate: string;
  tempEventId: string | null;
  appliedDateRange: DateRangePreset;
  appliedStartDate: string;
  appliedEndDate: string;
  appliedEventId: string | null;
  events: EventOption[];
  onDateRangeChange: (value: DateRangePreset) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onEventChange: (eventId: string | null) => void;
  onApply: () => void;
  isApplyDisabled: boolean;
  isApplying: boolean;
  hasPendingChanges: boolean;
  validationMessage?: string | null;
};

function formatSummaryDate(value: string) {
  const parsed = value ? new Date(`${value}T00:00:00`) : null;

  if (!parsed || Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
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

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function isSameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
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

function formatIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  children,
  onClick,
}: {
  isOpen: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-11 w-full items-center justify-between rounded-2xl bg-white px-4 text-left text-sm text-slate-700 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.18)] ring-1 ring-slate-950/[0.06] transition-all duration-200",
        "hover:-translate-y-px hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/8",
        isOpen && "bg-slate-50 ring-slate-900/12"
      )}
    >
      {children}
    </button>
  );
}

const calendarWeekdays = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

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
          <IconCalendar className="h-4 w-4 shrink-0 text-slate-400" />
        </TriggerButton>

        {isOpen ? (
          <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-[304px] overflow-hidden rounded-[18px] bg-white p-4 shadow-[0_24px_48px_-24px_rgba(15,23,42,0.28)] ring-1 ring-slate-950/[0.08]">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <IconChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold capitalize text-slate-900">
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
                <IconChevronRight className="h-4 w-4" />
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
                      onChange(formatIsoDate(day));
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
                  onChange(formatIsoDate(today));
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

export default function DashboardFiltersBar({
  tempStartDate,
  tempEndDate,
  tempEventId,
  appliedDateRange,
  appliedStartDate,
  appliedEndDate,
  appliedEventId,
  events,
  onDateRangeChange,
  onStartDateChange,
  onEndDateChange,
  onEventChange,
  onApply,
  isApplyDisabled,
  isApplying,
  validationMessage,
}: DashboardFiltersBarProps) {
  const [searchValue, setSearchValue] = useState("");
  const [isEventMenuOpen, setIsEventMenuOpen] = useState(false);

  const todayIso = new Date().toISOString().slice(0, 10);
  const appliedEventName =
    events.find((event) => event.eventId === appliedEventId)?.eventName ?? "Tutti gli eventi";
  const selectedEventName =
    events.find((event) => event.eventId === tempEventId)?.eventName ?? "Tutti gli eventi";
  const isTodayActive = tempStartDate === todayIso && tempEndDate === todayIso;
  const activeSummary =
    appliedDateRange === "today" || (appliedStartDate === todayIso && appliedEndDate === todayIso)
      ? "Filtri attivi: Oggi"
      : `Filtri attivi: ${formatSummaryDate(appliedStartDate)} - ${formatSummaryDate(appliedEndDate)} | ${appliedEventName}`;

  useEffect(() => {
    setSearchValue(selectedEventName);
  }, [selectedEventName]);

  const visibleEvents = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (!query || query === "tutti gli eventi") {
      return events;
    }

    return events.filter((event) => event.eventName.toLowerCase().includes(query));
  }, [events, searchValue]);

  return (
    <section className="rounded-[28px] border border-white/75 bg-white/95 p-5 shadow-[0_20px_48px_-34px_rgba(15,23,42,0.38)] backdrop-blur">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#158184]">
            Filtri dashboard
          </p>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {activeSummary}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[auto_minmax(320px,1.6fr)_180px_180px_auto] lg:items-end">
          <div className="shrink-0">
            <div className="mb-2 block text-sm font-medium text-transparent">Oggi</div>
            <div className="flex items-center rounded-[18px] bg-slate-100/80 p-1">
              <button
                type="button"
                onClick={() => onDateRangeChange("today")}
                className={`inline-flex min-h-10 items-center justify-center rounded-2xl px-4 text-sm font-medium transition ${
                  isTodayActive
                    ? "bg-[#158184] text-white shadow-[0_10px_24px_-18px_rgba(21,129,132,0.7)]"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-[#4ec4c5]/50 hover:text-slate-900"
                }`}
              >
                Oggi
              </button>
            </div>
          </div>

          <div className="min-w-[280px]">
            <span className="mb-2 block text-sm font-medium text-slate-800">Evento</span>
            <div className="relative">
              <div className="relative">
                <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchValue}
                  onFocus={() => setIsEventMenuOpen(true)}
                  onBlur={() => {
                    window.setTimeout(() => {
                      setIsEventMenuOpen(false);
                      setSearchValue(selectedEventName);
                    }, 120);
                  }}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setSearchValue(nextValue);
                    setIsEventMenuOpen(true);

                    if (nextValue.trim() === "" || nextValue === "Tutti gli eventi") {
                      onEventChange(null);
                      return;
                    }

                    const matchedEvent = events.find((item) => item.eventName === nextValue);
                    onEventChange(matchedEvent?.eventId ?? null);
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-11 text-sm text-slate-800 outline-none transition focus:border-[#4ec4c5] focus:ring-2 focus:ring-[#4ec4c5]/20"
                  placeholder="Cerca evento..."
                />
                {searchValue && searchValue !== "Tutti gli eventi" ? (
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      setSearchValue("Tutti gli eventi");
                      onEventChange(null);
                      setIsEventMenuOpen(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Azzera filtro evento"
                  >
                    <IconX className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              {isEventMenuOpen ? (
                <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.3)]">
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onEventChange(null);
                      setSearchValue("Tutti gli eventi");
                      setIsEventMenuOpen(false);
                    }}
                    className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition ${
                      tempEventId === null
                        ? "bg-[#4ec4c5]/10 font-medium text-[#158184]"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Tutti gli eventi
                  </button>

                  {visibleEvents.length > 0 ? (
                    visibleEvents.map((event) => (
                      <button
                        type="button"
                        key={event.eventId}
                        onMouseDown={(mouseEvent) => {
                          mouseEvent.preventDefault();
                          onEventChange(event.eventId);
                          setSearchValue(event.eventName);
                          setIsEventMenuOpen(false);
                        }}
                        className={`mt-1 flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition ${
                          tempEventId === event.eventId
                            ? "bg-[#4ec4c5]/10 font-medium text-[#158184]"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {event.eventName}
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-sm text-slate-500">Nessun evento trovato.</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>

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

          <button
            type="button"
            onClick={onApply}
            disabled={isApplyDisabled || isApplying}
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl bg-[#158184] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_-20px_rgba(21,129,132,0.9)] transition hover:bg-[#116b6d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isApplying ? "Applicazione..." : "Applica filtri"}
          </button>
        </div>

        {validationMessage ? <p className="text-sm font-medium text-amber-700">{validationMessage}</p> : null}
      </div>
    </section>
  );
}
