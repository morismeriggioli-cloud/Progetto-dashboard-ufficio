"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconChevronLeft as ChevronLeft, IconChevronRight as ChevronRight } from "@tabler/icons-react";
import { getSidebarSections } from "@/lib/permissions";

type SidebarProps = {
  isCollapsed: boolean;
  onToggle: () => void;
};

function isPathMatch(pathname: string, href: string) {
  if (pathname === href) {
    return true;
  }

  if (href === "/dashboard") {
    return false;
  }

  return pathname.startsWith(`${href}/`);
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const sections = getSidebarSections();
  const items = sections.flatMap((section) => section.items);
  const activeHref =
    items
      .filter((item) => isPathMatch(pathname, item.href))
      .sort((firstItem, secondItem) => secondItem.href.length - firstItem.href.length)[0]?.href ??
    null;

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-slate-200/70 bg-white/90 backdrop-blur-xl transition-[width] duration-300 ${
        isCollapsed ? "w-[60px]" : "w-56"
      }`}
    >
      <div className={`border-b border-slate-100 ${isCollapsed ? "px-2 py-3" : "px-3 py-4"}`}>
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"} gap-3`}>
          {!isCollapsed ? (
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-inset ring-slate-950/[0.06]">
                <Image
                  src="/logo-ticketitalia.png"
                  alt="TicketItalia"
                  width={30}
                  height={30}
                  className="h-7 w-auto"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold tracking-[-0.02em] text-slate-950">TicketItalia</p>
                <p className="text-xs font-medium text-slate-500">Control Center</p>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={onToggle}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-950/[0.06] transition-all duration-200 hover:bg-slate-50 hover:text-slate-900"
            title={isCollapsed ? "Espandi sidebar" : "Comprimi sidebar"}
            aria-label={isCollapsed ? "Espandi sidebar" : "Comprimi sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <nav className={`flex-1 overflow-y-auto ${isCollapsed ? "px-1 py-4" : "px-2.5 py-5"}`}>
        <div className={isCollapsed ? "space-y-2" : "space-y-2.5"}>
          {sections.map((section) => (
            <section key={section.title ?? "sidebar-section"}>
              <div className="space-y-2.5">
                {section.items.map((item) => {
                  const isActive = item.href === activeHref;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      title={isCollapsed ? item.name : undefined}
                      className={`group relative flex items-center ${
                        isCollapsed ? "justify-center px-0" : "justify-between px-3"
                      } rounded-2xl py-3 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-slate-950 text-white shadow-[0_12px_24px_-18px_rgba(15,23,42,0.28)]"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span className={`flex min-w-0 items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
                        <Icon
                          className={`h-5 w-5 shrink-0 transition-colors duration-200 ${
                            isActive ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                          }`}
                        />
                        {!isCollapsed ? <span className="truncate">{item.name}</span> : null}
                      </span>

                      {isCollapsed ? (
                        <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-20 hidden -translate-y-1/2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-medium text-white shadow-[0_8px_20px_-12px_rgba(15,23,42,0.35)] group-hover:block">
                          {item.name}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </nav>

    </aside>
  );
}
