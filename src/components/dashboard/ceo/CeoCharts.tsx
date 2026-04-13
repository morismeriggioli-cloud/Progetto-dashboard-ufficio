"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import SectionCard from "@/components/dashboard/SectionCard";
import type {
  CeoRangeKey,
  CeoSalesByEventPoint,
  CeoSalesTrendPoint,
  CeoSellThroughPoint,
} from "@/lib/ceo-dashboard-data";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getNumericTooltipValue(value: ValueType | undefined) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export default function CeoCharts({
  range,
  salesTrend,
  salesByEvent,
  sellThroughByEvent,
}: {
  range: CeoRangeKey;
  salesTrend: CeoSalesTrendPoint[];
  salesByEvent: CeoSalesByEventPoint[];
  sellThroughByEvent: CeoSellThroughPoint[];
}) {
  const trendTitle =
    range === "oggi"
      ? "Andamento vendite di oggi"
      : range === "7g"
        ? "Andamento vendite ultimi 7 giorni"
        : range === "30g"
          ? "Andamento vendite ultimi 30 giorni"
          : "Andamento vendite";

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr]">
      <SectionCard
        title={trendTitle}
        description="Ricavi, biglietti e ordini sul periodo selezionato."
      >
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesTrend} margin={{ top: 16, right: 14, left: -8, bottom: 4 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4ec4c5" stopOpacity={0.24} />
                  <stop offset="100%" stopColor="#4ec4c5" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#dbe5ea" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#475569", fontSize: 12, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                dy={8}
              />
              <YAxis
                tick={{ fill: "#475569", fontSize: 12, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `EUR ${Math.round(value / 1000)}k`}
                width={72}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 16,
                  borderColor: "#e5e7eb",
                  boxShadow: "0 18px 40px -28px rgba(15,23,42,0.45)",
                }}
                formatter={(_, __, item) => {
                  const row = item.payload as CeoSalesTrendPoint;
                  return [
                    `Ricavi ${formatCurrency(row.sales)} | Biglietti ${row.tickets} | Ordini ${row.orders}`,
                    row.label,
                  ];
                }}
                labelFormatter={(label) => `Periodo ${label}`}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#4ec4c5"
                fill="url(#salesGradient)"
                strokeWidth={3}
                activeDot={{ r: 6, fill: "#4ec4c5", stroke: "#ffffff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-5">
        <SectionCard
          title="Vendite per linea"
          description="Ricavi generati dalle principali linee del portafoglio attivo."
        >
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByEvent} margin={{ top: 10, right: 6, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#e7edf2" vertical={false} />
                <XAxis
                  dataKey="event"
                  tick={{ fill: "#475569", fontSize: 11, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-10}
                  textAnchor="end"
                  height={46}
                />
                <YAxis
                  tick={{ fill: "#475569", fontSize: 11, fontWeight: 500 }}
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
                <Bar dataKey="revenue" fill="#f9b109" radius={[8, 8, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="Sell-through per linea"
          description="Percentuale di venduto sulle principali linee del periodo."
        >
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sellThroughByEvent} margin={{ top: 10, right: 6, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#eef3f6" vertical={false} />
                <XAxis
                  dataKey="event"
                  tick={{ fill: "#475569", fontSize: 11, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-10}
                  textAnchor="end"
                  height={46}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "#475569", fontSize: 11, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${value}%`}
                  width={42}
                />
                <Tooltip
                  formatter={(value) => [`${getNumericTooltipValue(value)}%`, "Sell-through"]}
                  contentStyle={{
                    borderRadius: 16,
                    borderColor: "#e5e7eb",
                    boxShadow: "0 18px 40px -28px rgba(15,23,42,0.45)",
                  }}
                />
                <Bar dataKey="sellThrough" fill="#4ec4c5" radius={[8, 8, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
