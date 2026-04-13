"use client";

import {
  IconBell as Bell,
  IconLogout as LogOut,
  IconSearch as Search,
  IconUser as User,
} from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/use-auth";

const pageTitles = [
  { href: "/admin/reconciliation", title: "Controllo KPI" },
  { href: "/dashboard/commercial", title: "Commerciale" },
  { href: "/dashboard/palmari", title: "Palmari" },
  { href: "/dashboard/marketing", title: "Marketing" },
  { href: "/dashboard/ceo", title: "Direzione" },
  { href: "/dashboard/admin", title: "Amministrazione" },
  { href: "/dashboard", title: "Panoramica" },
  { href: "/orders", title: "Ordini" },
  { href: "/marketing", title: "Marketing" },
  { href: "/admin", title: "Amministrazione" },
  { href: "/tasks", title: "Attivita" },
];

function resolvePageTitle(pathname: string) {
  return (
    pageTitles
      .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
      .sort((first, second) => second.href.length - first.href.length)[0]?.title ?? "Panoramica"
  );
}

export default function Header() {
  const { user, profile, logout } = useAuth();
  const pathname = usePathname();
  const pageTitle = resolvePageTitle(pathname);

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white">
      <div className="px-6 py-4 xl:px-8">
        <div className="flex min-h-18 w-full items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
                TicketItalia Office
              </p>
              <h1 className="mt-1 text-[20px] font-semibold tracking-[-0.04em] text-slate-950">
                {pageTitle}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="relative hidden lg:block">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="w-64 rounded-lg bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-700 outline-none ring-1 ring-slate-950/[0.05] transition-all focus:bg-white focus:ring-2 focus:ring-slate-900/10 xl:w-72"
                placeholder="Cerca ordini, lead o ticket..."
              />
            </div>

            <button className="rounded-lg bg-slate-50 p-2.5 text-slate-400 ring-1 ring-slate-950/[0.05] transition-colors hover:bg-slate-100 hover:text-slate-600">
              <Bell className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-slate-950/[0.04]">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <User className="h-4 w-4 text-slate-600" />
              </div>
              <div className="max-w-40 hidden sm:block xl:max-w-none">
                <p className="text-sm font-semibold text-slate-900">
                  {profile?.full_name || user?.name}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {profile?.email || user?.email || "Utente interno"}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              aria-label="Esci"
              className="flex items-center gap-2 rounded-lg bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-white shadow-[0_10px_20px_-16px_rgba(15,23,42,0.2)] transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden xl:inline">Esci</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
