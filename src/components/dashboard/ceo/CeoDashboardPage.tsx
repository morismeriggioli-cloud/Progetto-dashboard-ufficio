"use client";

import {
  IconAlertTriangle as AlertTriangle,
  IconCashBanknote as Banknote,
  IconCalendarEvent as CalendarRange,
  IconRefresh as RefreshCw,
  IconShoppingCart as ShoppingCart,
  IconTicket as Ticket,
  IconTrendingUp as TrendingUp,
} from "@tabler/icons-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import InternalLayout from "@/components/layout/InternalLayout";
import DashboardFiltersBar from "@/components/dashboard/DashboardFiltersBar";
import MetricCard from "@/components/dashboard/MetricCard";
import SectionCard from "@/components/dashboard/SectionCard";
import DataTable from "@/components/dashboard/DataTable";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import {
  formatCompactCurrency,
  formatCurrency,
  formatDateLabel,
  formatNumber,
  formatPercentage,
  useDashboardData,
} from "@/hooks/useDashboardData";

function getNumericTooltipValue(value: ValueType | undefined) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function formatPaceGap(value: number) {
  const formatted = Math.abs(value).toFixed(1).replace(".", ",");
  return `${value >= 0 ? "+" : "-"}${formatted} pt`;
}

export default function CeoDashboardPage() {
  const {
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
    setTempDateRange,
    setTempStartDate,
    setTempEndDate,
    setTempEventId,
    applyFilters,
  } = useDashboardFilters();
  const {
    isLoading,
    isRefreshing,
    isFallback,
    error,
    refresh,
    ceo,
    trend,
    availableEvents,
    selectedEvent,
  } = useDashboardData(appliedFilters);

  if (isLoading) {
    return (
      <InternalLayout>
        <div className="rounded-[28px] border border-white/80 bg-white p-10 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.45)]">
          <div className="flex items-center gap-3 text-slate-700">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Caricamento dashboard TicketItalia in corso...</span>
          </div>
        </div>
      </InternalLayout>
    );
  }

  return (
    <InternalLayout>
      <div className="space-y-6">
        <section className="rounded-[30px] border border-white/80 bg-white px-7 py-6 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.45)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#158184]">
                TicketItalia Dashboard
              </p>
              <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.03em] text-slate-950">
                {ceo.isSingleEvent ? "Executive view evento" : "Executive view globale"}
              </h1>
              <p className="mt-2 max-w-3xl text-[15px] leading-7 text-slate-600">
                {ceo.isSingleEvent
                  ? `Monitoraggio dedicato per ${selectedEvent?.eventName ?? "l'evento selezionato"}, con KPI, trend e disponibilita residua.`
                  : "Vista aggregata del portafoglio TicketItalia con metriche direzionali, trend di vendita e focus sui segnali operativi."}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <span className="rounded-full bg-[#4ec4c5]/12 px-3 py-1 font-medium text-[#116b6d]">
                  {ceo.isSingleEvent ? "Vista evento" : "Vista portfolio"}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                  {ceo.isSingleEvent
                    ? selectedEvent?.eventName ?? "Evento selezionato"
                    : `${formatNumber(ceo.activeEvents)} eventi attivi`}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void refresh()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-[#4ec4c5] hover:text-[#116b6d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Aggiornamento..." : "Aggiorna dati"}
            </button>
          </div>
        </section>

        {isFallback || error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {isFallback
              ? `MF API non disponibile o non configurata. Vista mock attiva${error ? `: ${error}` : "."}`
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
            title={ceo.isSingleEvent ? "Fatturato evento" : "Fatturato totale"}
            value={formatCurrency(ceo.totalRevenue)}
            description={
              ceo.isSingleEvent
                ? "Venduto cumulato dell'evento nel periodo applicato."
                : "Venduto cumulato del portafoglio nel periodo applicato."
            }
            icon={Banknote}
            accentClass="bg-[#158184]"
          />
          <MetricCard
            title={ceo.isSingleEvent ? "Biglietti venduti evento" : "Biglietti venduti"}
            value={formatNumber(ceo.ticketsSold)}
            description="Biglietti contabilizzati dalla base ordini/venduto filtrata."
            icon={Ticket}
            accentClass="bg-[#f9b109]"
          />
          <MetricCard
            title={ceo.isSingleEvent ? "Ordini evento" : "Ordini totali"}
            value={formatNumber(ceo.totalOrders)}
            description="Ordini unici registrati sul perimetro corrente."
            icon={ShoppingCart}
            accentClass="bg-emerald-500"
          />
          <MetricCard
            title={ceo.isSingleEvent ? "Disponibilita residua" : "Eventi attivi"}
            value={formatNumber(ceo.isSingleEvent ? ceo.availableTickets : ceo.activeEvents)}
            description={
              ceo.isSingleEvent
                ? "Disponibilita residua corrente dell'evento selezionato."
                : "Numero eventi attivi rilevati nel portafoglio filtrato."
            }
            icon={CalendarRange}
            accentClass="bg-orange-500"
          />
          <MetricCard
            title={ceo.isSingleEvent ? "Sell-through evento" : "Sell-through medio"}
            value={formatPercentage(ceo.averageSellThrough)}
            description="Rapporto venduto/capacita residua sul perimetro applicato."
            icon={TrendingUp}
            accentClass="bg-slate-800"
          />
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_1fr]">
          <SectionCard
            title={ceo.isSingleEvent ? "Andamento vendite evento" : "Andamento vendite"}
            description="Evoluzione di ricavi, biglietti e ordini sul periodo applicato."
          >
            <div className="h-[320px] transition-opacity duration-300">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 16, right: 12, left: -6, bottom: 4 }}>
                  <defs>
                    <linearGradient id="ceoRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ec4c5" stopOpacity={0.34} />
                      <stop offset="100%" stopColor="#4ec4c5" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
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
                    tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                    width={52}
                  />
                  <Tooltip
                    formatter={(value, key) => {
                      const numericValue = getNumericTooltipValue(value);

                      if (key === "ticketsSold" || key === "ordersCount") {
                        return [formatNumber(numericValue), key === "ticketsSold" ? "Biglietti" : "Ordini"];
                      }

                      return [formatCurrency(numericValue), "Ricavi"];
                    }}
                    labelFormatter={(value) => formatDateLabel(String(value))}
                    contentStyle={{
                      borderRadius: 16,
                      borderColor: "#e5e7eb",
                      boxShadow: "0 18px 40px -28px rgba(15,23,42,0.45)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#158184"
                    fill="url(#ceoRevenue)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard
            title="Vendite per evento"
            description={
              ceo.isSingleEvent
                ? "Confronto tra evento selezionato e benchmark del periodo."
                : "Distribuzione ricavi tra gli eventi principali del periodo."
            }
          >
            <div className="h-[320px] transition-opacity duration-300">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ceo.salesByEvent} margin={{ top: 10, right: 8, left: -10, bottom: 20 }}>
                  <CartesianGrid stroke="#eef3f6" vertical={false} />
                  <XAxis
                    dataKey="eventName"
                    tick={{ fill: "#475569", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-12}
                    textAnchor="end"
                    height={58}
                  />
                  <YAxis
                    tick={{ fill: "#475569", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                    width={42}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(getNumericTooltipValue(value)), "Ricavi"]}
                    contentStyle={{
                      borderRadius: 16,
                      borderColor: "#e5e7eb",
                      boxShadow: "0 18px 40px -28px rgba(15,23,42,0.45)",
                    }}
                  />
                  <Bar dataKey="revenue" radius={[10, 10, 0, 0]} maxBarSize={42}>
                    {ceo.salesByEvent.map((row) => (
                      <Cell
                        key={row.eventId}
                        fill={
                          appliedEventId && row.eventId === appliedEventId ? "#158184" : "#f9b109"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title={ceo.isSingleEvent ? "Dettaglio evento" : "Top eventi"}
          description={
            ceo.isSingleEvent
              ? "Scheda sintetica dell'evento selezionato con metriche operative."
              : "Eventi ordinati per ricavi nel periodo applicato."
          }
        >
          <DataTable
            columns={[
              {
                key: "eventName",
                header: "Evento",
                render: (row: (typeof ceo.topEvents)[number]) => (
                  <div>
                    <p className="font-medium text-slate-900">{row.eventName}</p>
                    <p className="text-xs text-slate-500">{formatDateLabel(row.date)}</p>
                  </div>
                ),
              },
              {
                key: "venue",
                header: "Citta",
                render: (row: (typeof ceo.topEvents)[number]) => row.venue || "Non disponibile",
              },
              {
                key: "revenue",
                header: "Ricavi",
                render: (row: (typeof ceo.topEvents)[number]) => formatCurrency(row.revenue),
              },
              {
                key: "ticketsSold",
                header: "Biglietti",
                render: (row: (typeof ceo.topEvents)[number]) => formatNumber(row.ticketsSold),
              },
              {
                key: "ordersCount",
                header: "Ordini",
                render: (row: (typeof ceo.topEvents)[number]) => formatNumber(row.ordersCount),
              },
              {
                key: "sellThrough",
                header: "Sell-through",
                render: (row: (typeof ceo.topEvents)[number]) => formatPercentage(row.sellThrough),
              },
            ]}
            rows={ceo.topEvents}
          />
        </SectionCard>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
          <SectionCard
            title={ceo.isSingleEvent ? "Presidio disponibilita" : "Eventi quasi sold-out"}
            description={
              ceo.isSingleEvent
                ? "Indicatori di disponibilita residua dell'evento selezionato."
                : "Eventi che richiedono attenzione su inventory e pricing."
            }
          >
            <div className="space-y-3">
              {ceo.nearSoldOutEvents.map((event) => (
                <div
                  key={event.eventId}
                  className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4"
                >
                  <div>
                    <p className="font-medium text-slate-900">{event.eventName}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {event.venue} · {formatDateLabel(event.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold text-emerald-800">
                      {formatPercentage(event.sellThrough)}
                    </p>
                    <p className="text-sm text-emerald-700">
                      Residuo {formatNumber(event.availableTickets)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title={ceo.isSingleEvent ? "Pressione sul target" : "Eventi sotto performance"}
            description={
              ceo.isSingleEvent
                ? "Gap rispetto al target di sell-through dell'evento selezionato."
                : "Eventi sotto benchmark commerciale nel periodo."
            }
          >
            <div className="space-y-3">
              {ceo.underPerformanceEvents.map((event) => (
                <div
                  key={event.eventId}
                  className="flex items-center justify-between rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4"
                >
                  <div>
                    <p className="font-medium text-slate-900">{event.eventName}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Ricavi {formatCompactCurrency(event.revenue)} · Target {formatPercentage(event.targetSellThrough)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold text-rose-800">{formatPaceGap(event.paceGap)}</p>
                    <p className="text-sm text-rose-700">
                      Sell-through {formatPercentage(event.sellThrough)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
          <SectionCard
            title="Insight del giorno"
            description="Lettura rapida dei segnali piu rilevanti del perimetro corrente."
          >
            <div className="space-y-3">
              {ceo.insights.map((insight) => (
                <div
                  key={insight}
                  className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4"
                >
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-[#4ec4c5]/12">
                    <TrendingUp className="h-4 w-4 text-[#158184]" />
                  </div>
                  <p className="text-sm leading-6 text-slate-700">{insight}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Alert operativi"
            description="Elementi da presidiare senza interrompere la lettura del dashboard."
          >
            <div className="space-y-3">
              {ceo.alerts.map((alert) => (
                <div
                  key={alert}
                  className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4"
                >
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  </div>
                  <p className="text-sm leading-6 text-amber-900">{alert}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </InternalLayout>
  );
}
