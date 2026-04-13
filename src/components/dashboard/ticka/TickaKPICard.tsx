/**
 * Componente principale per KPI da TickaWS nella dashboard manager
 */

"use client";

import { useEffect, useState } from "react";
import {
  IconActivity as Activity,
  IconAlertCircle as AlertCircle,
  IconCalendar as Calendar,
  IconCreditCard as CreditCard,
  IconLoader as LoaderCircle,
  IconTicket as Ticket,
} from "@tabler/icons-react";
import { IconCircleCheck as CheckIcon, IconAlertCircle as AlertIcon } from "@tabler/icons-react";
import React from "react";

type TickaKPIData = {
  revenueTotal: number;
  ticketsTotal: number;
  transactionsTotal: number;
  eventsTotal: number;
  sourceDate: string;
  hasRealData: boolean;
  notes: string[];
  warnings: string[];
  sources: string[];
};

type TickaKPIResponse = {
  success: boolean;
  requestedDate: string;
  effectiveDate: string;
  hasRealData: boolean;
  payload: TickaKPIData;
  metadata?: {
    dateInfo: Record<string, unknown> | null;
    searchAttempts: number;
    dataSources: string[];
    lastUpdated: string;
  };
  timestamp?: string;
  error?: string;
};

export default function TickaKPICard() {
  const [data, setData] = useState<TickaKPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<TickaKPIResponse["metadata"] | null>(null);

  const fetchTickaKPI = async () => {
    try {
      setLoading(true);
      setError(null);
      setMetadata(null);

      console.log(`🔄 Fetching TickaWS KPI...`);

      const response = await fetch('/api/ticka/kpi');
      const result: TickaKPIResponse = await response.json();

      if (result.success && result.payload) {
        setData(result.payload);
        setMetadata(result.metadata);
      } else {
        setError(result.error || "Errore nel recupero KPI");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Errore sconosciuto";
      setError(errorMessage);
      console.error("Errore fetch Ticka KPI:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickaKPI();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('it-IT').format(num);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">KPI TickaWS</h3>
            <p className="text-sm text-gray-600 mt-1">Caricamento dati aggregati...</p>
          </div>
          <LoaderCircle className="h-6 w-6 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">KPI TickaWS</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchTickaKPI}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-amber-500" />
            <div>
              <h3 className="text-lg font-semibold text-amber-900">KPI TickaWS</h3>
              <p className="text-sm text-amber-700 mt-1">Nessun dato disponibile</p>
            </div>
          </div>
          <button
            onClick={fetchTickaKPI}
            className="px-3 py-1 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const statusColor = data.hasRealData ? "green" : "amber";
  const statusBg = data.hasRealData ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200";
  const statusText = data.hasRealData ? "green-900" : "amber-900";
  const statusIcon = data.hasRealData ? CheckIcon : AlertIcon;

  return (
    <div className={`rounded-xl ${statusBg} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
            {React.createElement(statusIcon, { className: `h-6 w-6 text-${statusColor}-500` })}
            <div>
            <h3 className={`text-lg font-semibold text-${statusText}`}>KPI TickaWS</h3>
            <p className={`text-sm text-${statusColor}-700 mt-1`}>
              {data.hasRealData 
                ? `Dati reali al ${formatDate(data.sourceDate)}`
                : `Dati aggregati del ${formatDate(data.sourceDate)}`
              }
            </p>
          </div>
        </div>
        <button
          onClick={fetchTickaKPI}
          className={`px-3 py-1 text-sm bg-${statusColor}-100 text-${statusColor}-700 rounded-lg hover:bg-${statusColor}-200 transition-colors`}
        >
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <CreditCard className="h-5 w-5 text-green-600 mr-2" />
            <p className="text-xs text-green-600 font-medium">Fatturato</p>
          </div>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(data.revenueTotal)}</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Ticket className="h-5 w-5 text-blue-600 mr-2" />
            <p className="text-xs text-blue-600 font-medium">Biglietti</p>
          </div>
          <p className="text-2xl font-bold text-blue-900">{formatNumber(data.ticketsTotal)}</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Activity className="h-5 w-5 text-purple-600 mr-2" />
            <p className="text-xs text-purple-600 font-medium">Transazioni</p>
          </div>
          <p className="text-2xl font-bold text-purple-900">{formatNumber(data.transactionsTotal)}</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Calendar className="h-5 w-5 text-orange-600 mr-2" />
            <p className="text-xs text-orange-600 font-medium">Eventi</p>
          </div>
          <p className="text-2xl font-bold text-orange-900">{formatNumber(data.eventsTotal)}</p>
        </div>
      </div>

      {/* Notes and Warnings */}
      {(data.notes.length > 0 || data.warnings.length > 0) && (
        <div className="mt-4 space-y-2">
          {data.notes.map((note, index) => (
            <div key={index} className="text-sm text-green-700 bg-green-100 px-3 py-2 rounded-lg">
              ℹ️ {note}
            </div>
          ))}
          
          {data.warnings.map((warning, index) => (
            <div key={index} className="text-sm text-amber-700 bg-amber-100 px-3 py-2 rounded-lg">
              ⚠️ {warning}
            </div>
          ))}
        </div>
      )}

      {/* Metadata */}
      {metadata && (
        <div className="mt-4 text-xs text-gray-600 border-t border-gray-200 pt-4">
          <div className="flex justify-between">
            <span>Fonti: {metadata.dataSources?.join(', ') || 'Nessuna'}</span>
            <span>Tentativi: {metadata.searchAttempts}</span>
            <span>Ultimo aggiornamento: {new Date(metadata.lastUpdated).toLocaleString('it-IT')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
