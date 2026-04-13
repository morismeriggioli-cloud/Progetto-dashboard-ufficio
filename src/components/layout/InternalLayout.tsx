"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ProtectedRoute from "@/components/ProtectedRoute";
import type { AppSection } from "@/lib/permissions";
import type { UserRole } from "@/lib/roles";

interface InternalLayoutProps {
  children: ReactNode;
  requiredSection?: AppSection;
  allowedRoles?: UserRole[];
}

const SIDEBAR_STORAGE_KEY = "ticketitalia:sidebar:collapsed";
const SIDEBAR_EXPANDED_WIDTH = 224;
const SIDEBAR_COLLAPSED_WIDTH = 60;
export default function InternalLayout({
  children,
  requiredSection,
  allowedRoles,
}: InternalLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  });
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  return (
    <ProtectedRoute requiredSection={requiredSection} allowedRoles={allowedRoles}>
      <div className="min-h-screen bg-[#F1F3F6]">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed((current) => !current)}
        />

        <div
          className="min-h-screen transition-[padding-left] duration-300"
          style={{
            paddingLeft: isSidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH,
          }}
        >
          <div className="flex h-screen flex-col overflow-y-auto">
            <Header />
            <main className="flex-1 px-6 py-8 xl:px-8 xl:py-10">{children}</main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
