"use client";

import { IconArrowUpRight as ArrowUpRight } from "@tabler/icons-react";
import type { AppSection } from "@/lib/permissions";
import type { UserRole } from "@/lib/roles";
import { dashboardContent } from "@/lib/dashboard-mock-data";
import MetricCard from "@/components/dashboard/MetricCard";
import SectionCard from "@/components/dashboard/SectionCard";
import BarList from "@/components/dashboard/BarList";
import DataTable from "@/components/dashboard/DataTable";
import InternalLayout from "@/components/layout/InternalLayout";

interface RoleDashboardPageProps {
  role: UserRole;
  requiredSection?: AppSection;
}

export default function RoleDashboardPage({
  role,
  requiredSection,
}: RoleDashboardPageProps) {
  const content = dashboardContent[role];

  return (
    <InternalLayout requiredSection={requiredSection}>
      <div className="space-y-8">
        <div className="rounded-[28px] border border-white/70 bg-white px-8 py-7 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.45)]">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-secondary">
            Dashboard
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-dark-text">{content.title}</h1>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-gray-600">{content.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
          {content.metrics.map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          {content.sections.map((section) => (
            <SectionCard
              key={section.title}
              title={section.title}
              description={section.description}
              action={
                section.actionLabel ? (
                  <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90">
                    {section.actionLabel}
                  </button>
                ) : undefined
              }
            >
              {section.type === "bars" && section.bars ? <BarList items={section.bars} /> : null}
              {section.type === "list" && section.list ? (
                <div className="space-y-4">
                  {section.list.map((item) => (
                    <div
                      key={item.title}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-dark-text">{item.title}</p>
                        <p className="text-sm text-gray-500">{item.subtitle}</p>
                      </div>
                      <span className="text-sm text-gray-600">{item.meta}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {section.type === "table" && section.columns && section.rows ? (
                <DataTable
                  columns={section.columns.map((column) => ({
                    key: column.key,
                    header: column.header,
                    render: (row: Record<string, string>) => row[column.key],
                  }))}
                  rows={section.rows}
                />
              ) : null}
            </SectionCard>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <SectionCard title="Azioni rapide" description="Collegamenti operativi usati piu spesso durante la giornata.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {content.quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <button
                    key={action.label}
                    className="flex items-center justify-between rounded-2xl border border-gray-100 bg-slate-50 px-4 py-4 text-left transition-colors hover:bg-primary/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-[0_10px_20px_-16px_rgba(15,23,42,0.55)]">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-dark-text">{action.label}</span>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-gray-400" />
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Attivita recenti" description="Aggiornamenti operativi in tempo reale per il team interno.">
            <div className="space-y-4">
              {content.activities.map((activity) => {
                const Icon = activity.icon;

                return (
                  <div
                    key={`${activity.title}-${activity.time}`}
                    className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-[0_10px_20px_-16px_rgba(15,23,42,0.55)]">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold text-dark-text">{activity.title}</p>
                        <span className="whitespace-nowrap text-xs font-medium text-gray-400">
                          {activity.time}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-gray-600">{activity.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      </div>
    </InternalLayout>
  );
}
