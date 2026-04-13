"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/use-auth";
import type { AppSection } from "@/lib/permissions";
import type { UserRole } from "@/lib/roles";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredSection?: AppSection;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let hardRedirectId: NodeJS.Timeout;

    const navigate = (target: string) => {
      if (pathname === target) {
        return;
      }

      router.replace(target);
      hardRedirectId = setTimeout(() => {
        window.location.replace(target);
      }, 250);
    };

    if (isLoading) {
      timeoutId = setTimeout(() => {
        console.error("[ProtectedRoute] Loading timeout - redirecting to login");
        navigate("/login");
      }, 10000);
      return;
    }

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (hardRedirectId) {
        clearTimeout(hardRedirectId);
      }
    };
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent px-8 py-8">
        <div className="rounded-2xl border border-white/70 bg-white p-8 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.4)]">
          <h1 className="text-2xl font-semibold text-dark-text">Caricamento dashboard</h1>
          <p className="mt-2 text-gray-600">Stiamo verificando la sessione utente.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
