"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import {
  IconActivity as Activity,
  IconArrowUpRight as ArrowUpRight,
  IconRefresh as RefreshCw,
  IconShieldExclamation as ShieldAlert,
  IconSpeakerphone as Megaphone,
  IconTicket as Ticket,
  IconTrendingUp as TrendingUp,
} from "@tabler/icons-react";
import InternalLayout from "@/components/layout/InternalLayout";
import DashboardFiltersBar from "@/components/dashboard/DashboardFiltersBar";
import MetricCard from "@/components/dashboard/MetricCard";
import SectionCard from "@/components/dashboard/SectionCard";
import DataTable from "@/components/dashboard/DataTable";
import {
  formatCurrency,
  formatDateLabel,
  formatNumber,
  formatPercentage,
} from "@/hooks/useDashboardData";
import { useMarketingData } from "@/hooks/useMarketingData";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";

function getNumericTooltipValue(value: ValueType | undefined) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export default function MarketingDashboardView() {
  const {
    tempDateRange,
    tempStartDate,
    tempEndDate,
    tempEventId,
    appliedDateRange,
    appliedStartDate,
    appliedEndDate,
    appliedEventId,
    isDirty,
    canApply,
    isApplying,
    validationMessage,
    setTempDateRange,
    setTempStartDate,
    setTempEndDate,
    setTempEventId,
    applyFilters,
  } = useDashboardFilters();
  const {
    isLoading,
    isFallback,
    error,
    refresh,
    marketing,
    availableEvents,
    selectedEvent,
  } = useMarketingData({
    appliedDateRange,
    appliedStartDate,
    appliedEndDate,
    appliedEventId,
  });

  const performanceRows = useMemo(
    () => marketing.performanceRows,
    [marketing.performanceRows]
  );

  const insightRows = useMemo(() => marketing.insights, [marketing.insights]);

  if (isLoading) {
    return (
      <InternalLayout requiredSection="marketing">
        <div className="rounded-3xl border border-white/80 bg-white p-10 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.45)]">
          <div className="flex items-center gap-3 text-slate-600">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Caricamento dati marketing da MFapi...</span>
          </div>
        </div>
      </InternalLayout>
    );
  }

  return (
    <InternalLayout requiredSection="marketing">
      <div className="space-y-6">
        <section className="rounded-[28px] border border-white/80 bg-white px-7 py-6 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.45)]">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-secondary">
                Marketing
              </p>
              <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.03em] text-slate-950">
                {appliedEventId
                  ? `Marketing evento: ${selectedEvent?.eventName ?? "Evento selezionato"}`
                  : "Panoramica marketing"}
              </h1>
              <p className="mt-2 max-w-3xl text-[15px] leading-7 text-slate-600">
                Analisi marketing su venduto, disponibilita e trend temporali con struttura pronta per MFapi live.
              </p>
              <p className="mt-3 text-sm font-medium text-slate-500">
                {appliedEventId ? `Evento: ${selectedEvent?.eventName ?? "Evento selezionato"}` : "Vista complessiva"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-[#4ec4c5] hover:text-[#4ec4c5]"
            >
              <RefreshCw className="h-4 w-4" />
              Aggiorna
            </button>
          </div>
        </section>

        {isFallback || error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {isFallback
              ? `MFapi non disponibile o non configurata. Visualizzazione fallback attiva${error ? `: ${error}` : "."}`
              : error}
          </div>
        ) : null}

        <DashboardFiltersBar
          tempDateRange={tempDateRange}
          tempStartDate={tempStartDate}
          tempEndDate={tempEndDate}
          tempEventId={tempEventId}
          appliedDateRange={appliedDateRange}
          appliedStartDate={appliedStartDate}
          appliedEndDate={appliedEndDate}
          appliedEventId={appliedEventId}
          events={availableEvents}
          onDateRangeChange={setTempDateRange}
          onStartDateChange={setTempStartDate}
          onEndDateChange={setTempEndDate}
          onEventChange={setTempEventId}
          onApply={() => void applyFilters()}
          isApplyDisabled={!canApply}
          isApplying={isApplying}
          hasPendingChanges={isDirty}
          validationMessage={validationMessage}
        />

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            title={marketing.isSingleEvent ? "Andamento vendite evento" : "Performance eventi"}
            value={
              marketing.isSingleEvent
                ? `${marketing.trendDelta >= 0 ? "+" : ""}${formatPercentage(marketing.trendDelta)}`
                : formatCurrency(marketing.averageRevenuePerEvent)
            }
            description={
              marketing.isSingleEvent
                ? `Direzione del trend vendite per ${selectedEvent?.eventName ?? "evento selezionato"}.`
                : "Ricavo medio per evento nel periodo selezionato."
            }
            icon={Megaphone}
            accentClass="bg-[#4ec4c5]"
          />
          <MetricCard
            title={marketing.isSingleEvent ? "Performance evento" : "Sell-through medio"}
            value={
              marketing.isSingleEvent
                ? formatCurrency(marketing.totalRevenue)
                : formatPercentage(marketing.averageSellThrough)
            }
            description={
              marketing.isSingleEvent
                ? "Ricavi complessivi dell'evento selezionato."
                : "Media calcolata su venduti e disponibilita residue."
            }
            icon={TrendingUp}
            accentClass="bg-[#f9b109]"
          />
          <MetricCard
            title={marketing.isSingleEvent ? "Sell-through evento" : "Top eventi"}
            value={
              marketing.isSingleEvent
                ? formatPercentage(marketing.averageSellThrough)
                : marketing.strongestEvent?.eventName ?? "Nessun evento"
            }
            description={
              marketing.isSingleEvent
                ? "Percentuale venduti/disponibili dell'evento selezionato."
                : marketing.strongestEvent
                  ? `Leader per ricavi con ${formatCurrency(marketing.strongestEvent.revenue)}.`
                  : "Nessun leader disponibile nel periodo selezionato."
            }
            icon={Activity}
            accentClass="bg-emerald-500"
          />
          <MetricCard
            title={marketing.isSingleEvent ? "Disponibilita residua" : "Eventi in crescita"}
            value={
              marketing.isSingleEvent
                ? formatNumber(marketing.availableTickets)
                : formatNumber(marketing.growthEvents.length)
            }
            description={
              marketing.isSingleEvent
                ? "Biglietti ancora disponibili sull'evento selezionato."
                : "Eventi con trend positivo nel periodo filtrato."
            }
            icon={Ticket}
            accentClass="bg-slate-700"
          />
          <MetricCard
            title={marketing.isSingleEvent ? "Trend temporale evento" : "Eventi sotto target"}
            value={
              marketing.isSingleEvent
                ? formatNumber(marketing.trend.length)
                : formatNumber(marketing.underTargetEvents.length)
            }
            description={
              marketing.isSingleEvent
                ? "Punti temporali disponibili per leggere il comportamento vendite."
                : "Eventi con sell-through inferiore alla soglia operativa."
            }
            icon={ShieldAlert}
            accentClass="bg-rose-500"
          />
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SectionCard
            title={marketing.isSingleEvent ? "Andamento vendite evento" : "Trend vendite"}
            description={
              marketing.isSingleEvent
                ? "Andamento temporale dell'evento selezionato."
                : "Lettura del trend vendite aggregato sul periodo selezionato."
            }
          >
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={marketing.trend} margin={{ top: 16, right: 12, left: -6, bottom: 4 }}>
                  <CartesianGrid stroke="#dbe5ea" strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateLabel}
                    tick={{ fill: "#475569", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#475569", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `EUR ${Math.round(value / 1000)}k`}
                    width={72}
                  />
                  <Tooltip
                    formatter={(value) => [
                      formatCurrency(getNumericTooltipValue(value)),
                      "Vendite",
                    ]}
                    labelFormatter={(value) => formatDateLabel(String(value))}
                    contentStyle={{
                      borderRadius: 16,
                      borderColor: "#e5e7eb",
                      boxShadow: "0 18px 40px -28px rgba(15,23,42,0.45)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#f9b109"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard
            title={marketing.isSingleEvent ? "Performance evento" : "Performance eventi"}
            description={
              marketing.isSingleEvent
                ? "Ricavi e sell-through dell'evento selezionato."
                : "Confronto ricavi per evento nel periodo filtrato."
            }
          >
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marketing.salesByEvent} margin={{ top: 10, right: 8, left: -10, bottom: 20 }}>
                  <CartesianGrid stroke="#eef3f6" vertical={false} />
                  <XAxis
                    dataKey="eventName"
                    tick={{ fill: "#475569", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-10}
                    textAnchor="end"
                    height={54}
                  />
                  <YAxis
                    tick={{ fill: "#475569", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                    width={42}
                  />
                  <Tooltip
                    formatter={(value) => [
                      formatCurrency(getNumericTooltipValue(value)),
                      marketing.isSingleEvent ? "Ricavi evento" : "Ricavi",
                    ]}
                    contentStyle={{
                      borderRadius: 16,
                      borderColor: "#e5e7eb",
                      boxShadow: "0 18px 40px -28px rgba(15,23,42,0.45)",
                    }}
                  />
                  <Bar dataKey="revenue" fill="#4ec4c5" radius={[8, 8, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title={marketing.isSingleEvent ? "Performance evento" : "Performance eventi"}
          description={
            marketing.isSingleEvent
              ? "Dettaglio marketing completo dell'evento selezionato."
              : "Classifica eventi con dati utili per lettura marketing."
          }
        >
          <DataTable
            columns={[
              {
                key: "eventName",
                header: "Evento",
                render: (row: (typeof performanceRows)[number]) => (
                  <div>
                    <p className="font-medium text-dark-text">{row.eventName}</p>
                    <p className="text-xs text-gray-500">{row.venue || "Citta non disponibile"}</p>
                  </div>
                ),
              },
              {
                key: "revenue",
                header: "Ricavi",
                render: (row: (typeof performanceRows)[number]) =>
                  formatCurrency(row.revenue),
              },
              {
                key: "ticketsSold",
                header: "Biglietti",
                render: (row: (typeof performanceRows)[number]) =>
                  formatNumber(row.ticketsSold),
              },
              {
                key: "ordersCount",
                header: "Ordini",
                render: (row: (typeof performanceRows)[number]) => formatNumber(row.ordersCount),
              },
              {
                key: "availableTickets",
                header: "Disponibili",
                render: (row: (typeof performanceRows)[number]) =>
                  formatNumber(row.availableTickets),
              },
              {
                key: "sellThrough",
                header: "Sell-through",
                render: (row: (typeof performanceRows)[number]) =>
                  formatPercentage(row.sellThrough),
              },
            ]}
            rows={performanceRows}
          />
        </SectionCard>

        <SectionCard
          title="Insight marketing"
          description="Lettura rapida delle priorita marketing derivate dai dati attualmente filtrati."
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {insightRows.map((insight) => (
              <article
                key={insight}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#4ec4c5]/15 text-[#12989a]">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <p className="text-sm leading-6 text-slate-700">{insight}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </InternalLayout>
  );
}
