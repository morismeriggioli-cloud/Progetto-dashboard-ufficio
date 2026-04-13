"use client";

import { useState } from "react";
import {
  IconCards,
  IconCashBanknote,
  IconChevronLeft,
  IconChevronRight,
  IconCoins,
  IconCreditCard,
  IconReceipt2,
  IconReceiptEuro,
  IconRefresh,
  IconShoppingCart,
  IconTicket,
  IconTicketOff,
} from "@tabler/icons-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import InternalLayout from "@/components/layout/InternalLayout";
import DashboardFiltersBar from "@/components/dashboard/DashboardFiltersBar";
import MetricCard from "@/components/dashboard/MetricCard";
import SectionCard from "@/components/dashboard/SectionCard";
import DataTable from "@/components/dashboard/DataTable";
import {
  formatCurrency,
  formatDateLabel,
  formatNumber,
} from "@/hooks/useDashboardData";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import { useOrdersData } from "@/hooks/useOrdersData";

const PAGE_SIZE = 25;

type OrderRow = {
  orderId: string;
  eventId: string;
  eventName: string;
  orderDate: string;
  eventDate: string;
  tickets: number;
  amount: number;
  sectorName: string;
  status: string;
  venue: string;
  city: string;
};

type TrendMetricKey = "ordersCount" | "ticketsSold" | "presale" | "totalRevenue";

function getStatusStyles(status?: string) {
  const normalized = status?.toLowerCase() ?? "";

  if (normalized.includes("complet") || normalized.includes("confer")) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (normalized.includes("parzial") || normalized.includes("verifica") || normalized.includes("attesa")) {
    return "bg-amber-100 text-amber-800";
  }

  if (normalized.includes("annull") || normalized.includes("cancell")) {
    return "bg-red-100 text-red-800";
  }

  return "bg-slate-100 text-slate-800";
}

function TrendLineChart({
  title,
  data,
  dataKey,
  color,
  formatter,
  tooltipLabel,
}: {
  title: string;
  data: Array<Record<TrendMetricKey | "date", string | number>>;
  dataKey: TrendMetricKey;
  color: string;
  formatter: (value: number) => string;
  tooltipLabel: string;
}) {
  return (
    <SectionCard title={title}>
      <div className="h-80">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 24, right: 20, left: 18, bottom: 18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => formatDateLabel(value as string)}
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickMargin={14}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={{ stroke: "#cbd5e1" }}
              />
              <YAxis
                tickFormatter={(value) => formatter(value as number)}
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickMargin={14}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={{ stroke: "#cbd5e1" }}
                width={72}
              />
              <Tooltip
                formatter={(value) => [
                  formatter(typeof value === "number" ? value : Number(value ?? 0)),
                  tooltipLabel,
                ]}
                labelFormatter={(label) => formatDateLabel(label as string)}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                dot={{ fill: color, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-slate-500">
            Nessun dato disponibile per il periodo selezionato
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function OrdersPage() {
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
  
  const [page, setPage] = useState(1);
  const {
    ordersSummary,
    pagination,
    isLoading,
    error,
    refresh,
    availableEvents,
    selectedEvent,
  } = useOrdersData({
    appliedDateRange: appliedFilters.selectedPreset,
    appliedStartDate: appliedFilters.selectedDateRange.from,
    appliedEndDate: appliedFilters.selectedDateRange.to,
    appliedEventId: appliedFilters.selectedEventId,
  }, page, PAGE_SIZE);

  // Non e piu necessario fare slice() lato client - i dati sono gia paginati
  const paginatedRows = ordersSummary.rows;
  const visibleRangeStart = pagination.totalRecords === 0 ? 0 : (pagination.currentPage - 1) * pagination.pageSize + 1;
  const visibleRangeEnd = Math.min(pagination.currentPage * pagination.pageSize, pagination.totalRecords);

  if (isLoading) {
    return (
      <InternalLayout requiredSection="orders">
        <div className="rounded-3xl border border-white/80 bg-white p-10 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.45)]">
          <div className="flex items-center gap-3 text-slate-600">
            <IconRefresh className="h-5 w-5 animate-spin" />
            <span>Caricamento ordini...</span>
          </div>
        </div>
      </InternalLayout>
    );
  }

  if (error) {
    return (
      <InternalLayout requiredSection="orders">
        <div className="rounded-3xl border border-white/80 bg-white p-10 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.45)]">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="text-red-600 font-medium">Errore nel caricamento degli ordini</div>
            <div className="text-sm text-slate-600">{error}</div>
            <button
              onClick={() => refresh()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-white transition-colors hover:bg-slate-800"
            >
              Riprova
            </button>
          </div>
        </div>
      </InternalLayout>
    );
  }

  return (
    <InternalLayout requiredSection="orders">
      <div className="space-y-6">
        {/* Filtri */}
        <DashboardFiltersBar
          events={availableEvents}
          tempDateRange={tempDateRange}
          tempStartDate={tempStartDate}
          tempEndDate={tempEndDate}
          tempEventId={tempEventId}
          appliedDateRange={appliedDateRange}
          appliedStartDate={appliedStartDate}
          appliedEndDate={appliedEndDate}
          appliedEventId={appliedEventId}
          onDateRangeChange={setTempDateRange}
          onStartDateChange={setTempStartDate}
          onEndDateChange={setTempEndDate}
          onEventChange={setTempEventId}
          onApply={async () => {
            setPage(1);
            await applyFilters();
          }}
          isApplyDisabled={!canApply}
          isApplying={isApplying}
          hasPendingChanges={isDirty}
          validationMessage={validationMessage}
        />

        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
          <MetricCard
            title="Ordini Totali"
            value={formatNumber(ordersSummary.totalOrders)}
            description="Ordini unici registrati nel periodo filtrato."
            icon={IconShoppingCart}
            accentClass="bg-emerald-500"
          />
          <MetricCard
            title="Biglietti Venduti"
            value={formatNumber(ordersSummary.totalTickets)}
            description="Biglietti collegati agli ordini del periodo."
            icon={IconTicket}
            accentClass="bg-[#f9b109]"
          />
          <MetricCard
            title="Abbonamenti"
            value={formatNumber(ordersSummary.totalSubscriptions)}
            description="Abbonamenti ricostruiti dai ratei ordine Ticka."
            icon={IconCards}
            accentClass="bg-amber-700"
          />
          <MetricCard
            title="Abbonamenti Open"
            value={formatNumber(ordersSummary.totalOpenSubscriptions)}
            description="Abbonamenti open conteggiati separatamente dagli altri abbonamenti."
            icon={IconCards}
            accentClass="bg-orange-600"
          />
          <MetricCard
            title="Totale Emissioni"
            value={formatCurrency(ordersSummary.totalEmissioni)}
            description="Emissioni ordine: biglietti pieni e ratei abbonamento corretti."
            icon={IconReceiptEuro}
            accentClass="bg-cyan-600"
          />
          <MetricCard
            title="Prevendita"
            value={formatCurrency(ordersSummary.totalPresale)}
            description="Prevendita ordini con ratei abbonamento non duplicati."
            icon={IconCreditCard}
            accentClass="bg-indigo-600"
          />
          <MetricCard
            title="Gestione Amm."
            value={formatCurrency(ordersSummary.totalManagementFee)}
            description="Totale gestione amministrativa degli ordini nel periodo."
            icon={IconCoins}
            accentClass="bg-violet-600"
          />
          <MetricCard
            title="Over Commission"
            value={formatCurrency(ordersSummary.totalCommission)}
            description="Commissioni aggiuntive separate dal totale gestione amministrativa."
            icon={IconCoins}
            accentClass="bg-fuchsia-600"
          />
          <MetricCard
            title="Fatturato Totale"
            value={formatCurrency(ordersSummary.totalRevenue)}
            description="Totale incassato: emissioni, prevendita, gestione e over commission."
            icon={IconCashBanknote}
            accentClass="bg-[#158184]"
          />
          <MetricCard
            title="Valore Medio Ordine"
            value={formatCurrency(ordersSummary.averageOrderValue)}
            description="Incasso medio per ordine nel periodo selezionato."
            icon={IconReceipt2}
            accentClass="bg-rose-600"
          />
          <MetricCard
            title="Ticket Medi per Ordine"
            value={formatNumber(ordersSummary.averageTicketsPerOrder)}
            description="Biglietti e abbonamenti medi associati a ciascun ordine."
            icon={IconTicketOff}
            accentClass="bg-sky-700"
          />
        </div>

        {/* Grafici andamento */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <TrendLineChart
            title="Andamento Ordini nel Tempo"
            data={ordersSummary.trend}
            dataKey="ordersCount"
            color="#3b82f6"
            formatter={formatNumber}
            tooltipLabel="Ordini"
          />
          <TrendLineChart
            title="Andamento Biglietti nel Tempo"
            data={ordersSummary.trend}
            dataKey="ticketsSold"
            color="#f59e0b"
            formatter={formatNumber}
            tooltipLabel="Biglietti"
          />
          <TrendLineChart
            title="Andamento Prevendita nel Tempo"
            data={ordersSummary.trend}
            dataKey="presale"
            color="#4f46e5"
            formatter={formatCurrency}
            tooltipLabel="Prevendita"
          />
          <TrendLineChart
            title="Andamento Fatturato Totale"
            data={ordersSummary.trend}
            dataKey="totalRevenue"
            color="#158184"
            formatter={formatCurrency}
            tooltipLabel="Fatturato totale"
          />
        </div>

        {/* Tabella Ordini */}
        <SectionCard 
          title={`Ordini (${visibleRangeStart}-${visibleRangeEnd} di ${pagination.totalRecords})`}
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={() => refresh()}
                className="rounded-lg bg-white px-3 py-2 text-slate-700 border border-slate-200 transition-colors hover:bg-slate-50"
                disabled={isLoading}
              >
                <IconRefresh className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          }
        >
          {paginatedRows.length > 0 ? (
            <>
              <DataTable<OrderRow>
                columns={[
                  { key: "orderId", header: "ID Ordine", render: (row) => row.orderId },
                  { key: "eventName", header: "Evento", render: (row) => row.eventName },
                  { key: "orderDate", header: "Data Ordine", render: (row) => formatDateLabel(row.orderDate) },
                  { key: "eventDate", header: "Data Evento", render: (row) => formatDateLabel(row.eventDate) },
                  { key: "tickets", header: "Biglietti", render: (row) => row.tickets },
                  { key: "amount", header: "Importo", render: (row) => formatCurrency(row.amount) },
                  { key: "sectorName", header: "Settore", render: (row) => row.sectorName },
                  { key: "status", header: "Stato", render: (row) => (
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusStyles(row.status)}`}>
                      {row.status}
                    </span>
                  )},
                  { key: "venue", header: "Luogo", render: (row) => row.venue },
                  { key: "city", header: "Citta", render: (row) => row.city },
                ]}
                rows={paginatedRows}
              />

              {/* Paginazione */}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Mostrando {visibleRangeStart}-{visibleRangeEnd} di {pagination.totalRecords} ordini
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={!pagination.hasPreviousPage}
                    className="rounded-lg bg-white px-3 py-2 text-slate-700 border border-slate-200 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <IconChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-slate-600">
                    Pagina {pagination.currentPage} di {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={!pagination.hasNextPage}
                    className="rounded-lg bg-white px-3 py-2 text-slate-700 border border-slate-200 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <IconChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <IconShoppingCart className="mb-4 h-12 w-12 text-slate-400" />
              <div className="text-lg font-medium text-slate-900 mb-2">
                Nessun ordine trovato
              </div>
              <div className="text-sm text-slate-600">
                {selectedEvent
                  ? `Nessun ordine trovato per l'evento "${selectedEvent.eventName}"`
                  : "Nessun ordine trovato per il periodo selezionato"}
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </InternalLayout>
  );
}

export default OrdersPage;
