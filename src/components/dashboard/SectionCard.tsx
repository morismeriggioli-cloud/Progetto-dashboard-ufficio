import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

export default function SectionCard({
  title,
  description,
  action,
  children,
}: SectionCardProps) {
  return (
    <section className="rounded-[20px] bg-white shadow-[0_14px_34px_-26px_rgba(15,23,42,0.18)] ring-1 ring-slate-950/[0.04] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_20px_40px_-26px_rgba(15,23,42,0.2)]">
      <div className="flex items-start justify-between gap-5 border-b border-slate-100/90 px-5 py-5">
        <div className="max-w-3xl">
          <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-slate-950">{title}</h2>
          {description ? <p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
