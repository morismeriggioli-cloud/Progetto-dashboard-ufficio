/**
 * Componente per mostrare lo stato della connessione TickaWS nella dashboard
 */

"use client";

import { useEffect, useState } from "react";
import {
  IconCircleCheck as CheckCircle,
  IconLoader as LoaderCircle,
  IconWifi as Wifi,
  IconWifiOff as WifiOff,
} from "@tabler/icons-react";

type TickaStatus = {
  success: boolean;
  data?: {
    connection: string;
    user?: string;
    apiVersion?: string;
    expiresAt?: string;
    recordCount?: {
      events: number;
      orders: number;
      venues: number;
    };
    lastSync?: string;
  };
  error?: string;
  metadata?: {
    syncDate: string;
    recordCount: {
      events: number;
      orders: number;
      venues: number;
    };
    apiVersion: string;
  };
};

export default function TickaStatusCard() {
  const [status, setStatus] = useState<TickaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickaStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/ticka/test");
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Errore nel test connessione");
      }
      
      setStatus(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Errore sconosciuto";
      setError(errorMessage);
      console.error("Errore fetch Ticka status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickaStatus();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">TickaWS Connection</h3>
            <p className="text-sm text-gray-600 mt-1">Verifica connessione API...</p>
          </div>
          <LoaderCircle className="h-6 w-6 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !status?.success) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <WifiOff className="h-6 w-6 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">TickaWS Connection</h3>
              <p className="text-sm text-red-700 mt-1">
                {error || status?.error || "Connessione fallita"}
              </p>
            </div>
          </div>
          <button
            onClick={fetchTickaStatus}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-green-50 border border-green-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Wifi className="h-6 w-6 text-green-500" />
          <div>
            <h3 className="text-lg font-semibold text-green-900">TickaWS Connection</h3>
            <p className="text-sm text-green-700 mt-1">
              Connesso come {status.data?.user || "TicketItalia"}
            </p>
            <div className="mt-2 space-y-1">
              <p className="text-xs text-green-600">
                API Version: {status.data?.apiVersion || "1"}
              </p>
              <p className="text-xs text-green-600">
                Token expires: {status.data?.expiresAt ? new Date(status.data.expiresAt).toLocaleString() : "N/A"}
              </p>
              <p className="text-xs text-green-600">
                Last sync: {status.metadata?.syncDate ? new Date(status.metadata.syncDate).toLocaleString() : "N/A"}
              </p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center space-x-1 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Online</span>
          </div>
          <button
            onClick={fetchTickaStatus}
            className="mt-2 px-3 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
      
      {/* Mostra record count se disponibili */}
      {status.data?.recordCount && (
        <div className="mt-4 pt-4 border-t border-green-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-900">{status.data.recordCount.events}</p>
              <p className="text-xs text-green-600">Events</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-900">{status.data.recordCount.orders}</p>
              <p className="text-xs text-green-600">Orders</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-900">{status.data.recordCount.venues}</p>
              <p className="text-xs text-green-600">Venues</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
