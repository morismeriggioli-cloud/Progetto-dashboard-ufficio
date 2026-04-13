import {
  IconBriefcase as BriefcaseBusiness,
  IconDeviceMobile as Smartphone,
  IconLayoutDashboard as LayoutDashboard,
  IconSettings as Settings,
  IconShoppingCart as ShoppingCart,
  IconSpeakerphone as Megaphone,
} from "@tabler/icons-react";
import type { ComponentType, SVGProps } from "react";
export type AppSection =
  | "dashboard"
  | "orders"
  | "devices"
  | "administration"
  | "marketing"
  | "commercial";

export type SidebarItem = {
  section: AppSection;
  name: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  group: string | null;
  badge?: string;
};

export type SidebarSection = {
  title: string | null;
  items: SidebarItem[];
};

const sectionDefinitions: Record<
  AppSection,
  Omit<SidebarItem, "section">
> = {
  dashboard: {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    group: "Dashboard",
  },
  orders: {
    name: "Ordini",
    href: "/orders",
    icon: ShoppingCart,
    group: "Operativo",
    badge: "Live",
  },
  devices: {
    name: "Palmari",
    href: "/dashboard/palmari",
    icon: Smartphone,
    group: "Operativo",
    badge: "Ops",
  },
  administration: {
    name: "Amministrazione",
    href: "/admin",
    icon: Settings,
    group: "Azienda",
  },
  marketing: {
    name: "Marketing",
    href: "/marketing",
    icon: Megaphone,
    group: "Business",
  },
  commercial: {
    name: "Commerciale",
    href: "/dashboard/commercial",
    icon: BriefcaseBusiness,
    group: "Business",
    badge: "CRM",
  },
};

const allSections: AppSection[] = [
  "dashboard",
  "orders",
  "devices",
  "administration",
  "marketing",
  "commercial",
];

export function canAccessSection() {
  return true;
}

export function getRoleDashboardRoute() {
  return "/dashboard";
}

export function getDefaultDashboardRoute() {
  return "/dashboard";
}

export function getSidebarSections(): SidebarSection[] {
  const items = allSections.map((section) => ({
    section,
    ...sectionDefinitions[section],
  }));

  const groups = ["Dashboard", "Operativo", "Business", "Azienda"] as const;

  return groups
    .map((group) => ({
      title: group,
      items: items.filter((item) => item.group === group),
    }))
    .filter((section) => section.items.length > 0);
}
