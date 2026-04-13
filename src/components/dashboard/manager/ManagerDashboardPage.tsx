"use client";

import { IconRefresh as RefreshCw } from "@tabler/icons-react";
import { useEffect } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import SectionCard from "@/components/dashboard/SectionCard";
import ManagerDashboardFilters from "@/components/dashboard/manager/ManagerDashboardFilters";
import ManagerKpiGrid from "@/components/dashboard/manager/ManagerKpiGrid";
import InternalLayout from "@/components/layout/InternalLayout";
import { useManagerDashboardFilters } from "@/hooks/useManagerDashboardFilters";
import {
  formatCurrency,
  formatDateLabel,
  formatNumber,
  useManagerDashboard,
} from "@/hooks/useManagerDashboard";

function getNumericTooltipValue(value: ValueType | undefined) {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value ?? Number.NaN);
  return Number.isFinite(parsed) ? parsed : 0;
}

function UnavailableState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[18px] bg-slate-50/80 px-5 py-8 text-center ring-1 ring-slate-950/[0.05]">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="rounded-[18px] bg-white p-5 shadow-[0_14px_34px_-26px_rgba(15,23,42,0.18)] ring-1 ring-slate-950/[0.04]">
            <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
            <div className="mt-4 h-10 w-24 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-3 w-28 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-[20px] bg-white p-5 shadow-[0_14px_34px_-26px_rgba(15,23,42,0.18)] ring-1 ring-slate-950/[0.04]">
          <div className="h-[320px] animate-pulse rounded-[18px] bg-slate-100" />
        </div>
        <div className="rounded-[20px] bg-white p-5 shadow-[0_14px_34px_-26px_rgba(15,23,42,0.18)] ring-1 ring-slate-950/[0.04]">
          <div className="h-[320px] animate-pulse rounded-[18px] bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

function TrendChart({
  title,
  description,
  data,
  color,
  formatter,
}: {
  title: string;
  description: string;
  data: Array<{ label: string; value: number }>;
  color: string;
  formatter: (value: number) => string;
}) {
  return (
    <SectionCard title={title} description={description}>
      {data.length > 0 ? (
        <div className="h-[320px] rounded-[18px] bg-slate-50/45 p-3 ring-1 ring-slate-950/[0.04]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="#eef2f7" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatDateLabel(String(value))}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={82}
                tickFormatter={(value) => formatter(Number(value))}
              />
              <Tooltip
                labelFormatter={(value) => formatDateLabel(String(value))}
                formatter={(value) => [formatter(getNumericTooltipValue(value)), title]}
                contentStyle={{
                  borderRadius: 18,
                  borderColor: "#e2e8f0",
                  boxShadow: "0 16px 32px -24px rgba(15,23,42,0.22)",
                }}
              />
              <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.25} strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <UnavailableState
          title="Dati non disponibili dall'API Ticka"
          description={description}
        />
      )}
    </SectionCard>
  );
}

export default function ManagerDashboardPage() {
  const {
    tempPreset,
    tempStartDate,
    tempEndDate,
    tempOrganizer,
    tempEventId,
    tempStore,
    tempVenue,
    tempEventStatus,
    appliedFilters,
    isDirty,
    canApply,
    shouldShowApply,
    isApplying,
    validationMessage,
    setTempPreset,
    setTempStartDate,
    setTempEndDate,
    setTempOrganizer,
    setTempEventId,
    setTempStore,
    setTempVenue,
    setTempEventStatus,
    applyFilters,
  } = useManagerDashboardFilters();

  const {
    isLoading,
    isRefreshing,
    error,
    refresh,
    kpis,
    revenueTrend,
    ticketsTrend,
    filterOptions,
    hasLiveData,
    sourceLabel,
    warnings,
    statusNote,
  } = useManagerDashboard(appliedFilters);

  useEffect(() => {
    console.log("[manager-dashboard-page] hook sync check", {
      hook: "useManagerDashboard",
      usesAppliedFilters: true,
      appliedPreset: appliedFilters.selectedPreset,
      appliedFrom: appliedFilters.selectedDateRange.from,
      appliedTo: appliedFilters.selectedDateRange.to,
    });
  }, [
    appliedFilters.selectedDateRange.from,
    appliedFilters.selectedDateRange.to,
    appliedFilters.selectedPreset,
  ]);

  if (isLoading) {
    return (
      <InternalLayout>
        <LoadingSkeleton />
      </InternalLayout>
    );
  }

  return (
    <InternalLayout>
      <div className="space-y-10">
        <section className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="inline-flex max-w-fit items-center rounded-full bg-white px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 ring-1 ring-slate-950/[0.05] shadow-[0_12px_28px_-24px_rgba(15,23,42,0.2)]">
              TicketItalia Platform
            </div>

            <button
              type="button"
              onClick={() => void refresh()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-[0_10px_24px_-18px_rgba(15,23,42,0.2)] transition hover:bg-slate-800 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Aggiornamento..." : "Aggiorna"}
            </button>
          </div>

          <ManagerDashboardFilters
            tempPreset={tempPreset}
            tempStartDate={tempStartDate}
            tempEndDate={tempEndDate}
            tempOrganizer={tempOrganizer}
            tempEventId={tempEventId}
            tempStore={tempStore}
            tempVenue={tempVenue}
            tempEventStatus={tempEventStatus}
            appliedPreset={appliedFilters.selectedPreset}
            appliedStartDate={appliedFilters.selectedDateRange.from}
            appliedEndDate={appliedFilters.selectedDateRange.to}
            appliedEventId={appliedFilters.selectedEventId}
            organizers={filterOptions.organizers}
            events={filterOptions.events}
            stores={filterOptions.stores}
            venues={filterOptions.venues}
            eventStatuses={filterOptions.eventStatuses}
            isDirty={isDirty}
            canApply={canApply}
            shouldShowApply={shouldShowApply}
            isApplying={isApplying}
            validationMessage={validationMessage}
            onPresetChange={setTempPreset}
            onStartDateChange={setTempStartDate}
            onEndDateChange={setTempEndDate}
            onOrganizerChange={setTempOrganizer}
            onEventChange={setTempEventId}
            onStoreChange={setTempStore}
            onVenueChange={setTempVenue}
            onEventStatusChange={setTempEventStatus}
            onApply={() => void applyFilters()}
          />
        </section>

        <div className="rounded-[18px] border border-slate-200/80 bg-white px-4 py-4 text-sm text-slate-600 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.18)]">
          <p className="font-semibold text-slate-900">{hasLiveData ? "Connessione Ticka attiva" : "Dati Ticka non disponibili"}</p>
          <p className="mt-1">{error ?? statusNote}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-400">{sourceLabel}</p>
          {warnings.length > 1 ? (
            <div className="mt-3 space-y-1 text-xs text-slate-500">
              {warnings.slice(1).map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}
        </div>

        <ManagerKpiGrid items={kpis} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <TrendChart
            title="Fatturato nel tempo"
            description="Serie reale aggregata sul range temporale selezionato."
            data={revenueTrend}
            color="#0f766e"
            formatter={formatCurrency}
          />

          <TrendChart
            title="Biglietti nel tempo"
            description="Serie reale aggregata sul range temporale selezionato."
            data={ticketsTrend}
            color="#2563eb"
            formatter={formatNumber}
          />
        </div>
      </div>
    </InternalLayout>
  );
}
