"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/use-auth";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    router.replace(isAuthenticated ? "/dashboard" : "/login");
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="rounded-2xl border border-white/70 bg-white p-8 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.4)]">
        <h1 className="text-2xl font-semibold text-dark-text">TicketItalia Office</h1>
        <p className="mt-2 text-gray-600">
          Reindirizzamento all&apos;area riservata in corso...
        </p>
      </div>
    </div>
  );
}
