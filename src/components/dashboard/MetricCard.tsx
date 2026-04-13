import type { ComponentType, SVGProps } from "react";

type MetricCardProps = {
  title: string;
  value: string;
  delta?: string;
  badge?: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  accentClass: string;
};

export default function MetricCard({
  title,
  value,
  delta,
  badge,
  icon: Icon,
  accentClass,
}: MetricCardProps) {
  const displayValue = value.includes("Dato non disponibile") ? "-" : value;
  const normalizedDelta =
    delta && !delta.includes("Dato non disponibile") && delta !== "n.d." ? delta : null;
  const deltaTone = !delta
    ? "text-slate-400"
    : delta.startsWith("+")
      ? "text-emerald-600"
      : delta.startsWith("-")
        ? "text-rose-600"
        : "text-slate-500";

  return (
    <div className="rounded-[20px] bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.2)] ring-1 ring-slate-950/[0.04] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-28px_rgba(15,23,42,0.22)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400">{title}</p>
            {badge ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-700 ring-1 ring-amber-200">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-[36px] font-semibold tracking-[-0.06em] text-slate-950">{displayValue}</p>
          {normalizedDelta ? (
            <p className={`mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${deltaTone}`}>
              {normalizedDelta}
            </p>
          ) : null}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] ${accentClass} shadow-[0_12px_22px_-16px_rgba(15,23,42,0.28)]`}
        >
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
    </div>
  );
}
