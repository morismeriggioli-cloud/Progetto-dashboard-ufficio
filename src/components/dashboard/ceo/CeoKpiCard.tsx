"use client";

import { useRouter } from "next/navigation";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { IconTrendingDown as TrendingDown, IconTrendingUp as TrendingUp } from "@tabler/icons-react";
import type { CeoTrend } from "@/lib/ceo-dashboard-data";

type CeoKpiCardProps = {
  title: string;
  value: string;
  change: string;
  comparison: string;
  trend: CeoTrend;
  accent: string;
  href?: string;
  sparkline: { value: number }[];
};

export default function CeoKpiCard({
  title,
  value,
  change,
  comparison,
  trend,
  accent,
  href,
  sparkline,
}: CeoKpiCardProps) {
  const router = useRouter();
  const TrendIcon = trend === "up" ? TrendingUp : TrendingDown;
  const trendTextClass = trend === "up" ? "text-emerald-600" : "text-rose-600";

  return (
    <button
      type="button"
      onClick={() => {
        if (href) {
          router.push(href);
        }
      }}
      className="group w-full cursor-pointer rounded-2xl border border-white/80 bg-white px-4 py-4 text-left shadow-[0_16px_34px_-30px_rgba(15,23,42,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-28px_rgba(15,23,42,0.5)]"
    >
      <div className={`mb-3 h-1 w-12 rounded ${accent}`} />
      <p className="text-[12px] font-medium text-gray-500">{title}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-[24px] font-semibold leading-none tracking-tight text-slate-900">
          {value}
        </p>
        <TrendIcon className={`h-4 w-4 ${trendTextClass}`} />
      </div>
      <div className={`mt-2 flex items-center gap-1.5 text-[12px] font-medium ${trendTextClass}`}>
        <span>{change}</span>
        <span className="text-gray-400">{comparison}</span>
      </div>
      <div className="mt-3 h-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkline}>
            <Area
              type="monotone"
              dataKey="value"
              stroke={trend === "up" ? "#4ec4c5" : "#ef4444"}
              fill={trend === "up" ? "rgba(78,196,197,0.14)" : "rgba(239,68,68,0.12)"}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </button>
  );
}
