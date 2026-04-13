import SectionCard from "@/components/dashboard/SectionCard";

type SoldOutEvent = {
  event: string;
  percentage: string;
};

export default function CeoNearSoldOutList({ events }: { events: SoldOutEvent[] }) {
  return (
    <SectionCard
      title="Priorita operative"
      description="Attivita da monitorare per marketing, vendite e operations."
    >
      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event.event}
            className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4"
          >
            <p className="text-sm font-semibold text-slate-900">{event.event}</p>
            <span className="rounded-full bg-secondary/18 px-3 py-1 text-xs font-semibold text-amber-700">
              {event.percentage}
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
