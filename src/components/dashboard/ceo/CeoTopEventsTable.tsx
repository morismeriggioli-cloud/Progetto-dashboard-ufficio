import SectionCard from "@/components/dashboard/SectionCard";

type TopEventRow = {
  event: string;
  city: string;
  ticketsSold: string;
  revenue: string;
  sellThrough: string;
};

export default function CeoTopEventsTable({ rows }: { rows: TopEventRow[] }) {
  return (
    <SectionCard
      title="Top performance"
      description="Voci che trainano ricavi e volume di biglietti venduti."
    >
      <div className="overflow-hidden rounded-2xl border border-slate-100">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/90">
            <tr>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Voce
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Citta
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Biglietti venduti
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Ricavi
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Sell-through
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => (
              <tr key={row.event} className="transition-colors duration-150 hover:bg-slate-50/90">
                <td className="px-5 py-4">
                  <p className="text-[14px] font-semibold text-slate-900">{row.event}</p>
                </td>
                <td className="px-5 py-4 text-[14px] text-slate-600">{row.city}</td>
                <td className="px-5 py-4 text-[14px] font-medium text-slate-800">{row.ticketsSold}</td>
                <td className="px-5 py-4 text-[14px] font-semibold text-slate-900">{row.revenue}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[12px] font-semibold text-primary">
                    {row.sellThrough}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
