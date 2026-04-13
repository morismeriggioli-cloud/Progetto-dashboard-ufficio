"use client";

import {
  IconActivity as Activity,
  IconBan as Ban,
  IconBriefcase as Briefcase,
  IconCashBanknote as Banknote,
  IconCreditCard as CreditCard,
  IconGift as Gift,
  IconReceipt as Receipt,
  IconSchool as GraduationCap,
  IconShoppingBag as Store,
  IconTicket as Ticket,
  IconBook as BookOpen,
} from "@tabler/icons-react";
import MetricCard from "@/components/dashboard/MetricCard";
import type { KpiItem } from "@/hooks/useManagerDashboard";

const icons = {
  "fatturato-totale": Banknote,
  fido: CreditCard,
  annulli: Ban,
  "gestione-amministrativa": Briefcase,
  prevendita: Receipt,
  "over-commission": Store,
  "gift-card": Gift,
  "biglietti-emessi": Ticket,
  "carta-cultura": BookOpen,
  "carta-docente": GraduationCap,
};

export default function ManagerKpiGrid({ items }: { items: KpiItem[] }) {
  return (
    <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => {
        const Icon = icons[item.id as keyof typeof icons] ?? Activity;

        return (
          <div key={item.id}>
            <MetricCard
              title={item.label}
              value={item.value}
              delta={item.delta}
              badge={item.badge}
              description={item.description}
              icon={Icon}
              accentClass={item.accent}
            />
          </div>
        );
      })}
    </section>
  );
}
