/**
 * Componente per mostrare dati reali da TickaWS nella dashboard
 */

"use client";

import { useEffect, useState } from "react";
import {
  IconAlertCircle as AlertCircle,
  IconCalendar as Calendar,
  IconCircleCheck as CheckCircle,
  IconCreditCard as CreditCard,
  IconLoader as LoaderCircle,
  IconTicket as Ticket,
  IconTrendingUp as TrendingUp,
} from "@tabler/icons-react";

type TickaKPI = {
  fatturatoTotale: number;
  numeroBiglietti: number;
  numeroTransazioni: number;
  numeroEventi: number;
  mediaPerTransazione: number;
  dataRiferimento: string;
};

type TickaResponse = {
  success: boolean;
  data?: string;
  payload?: {
    result?: TickaEmissioneRow[];
    error?: string;
  } | null;
  error?: string;
  timestamp?: string;
};

type TickaEmissioneRow = {
  importo?: number;
  quantita?: number;
  eventId?: string;
  eventName?: string;
};

export default function TickaRealDataCard() {
  const [data, setData] = useState<TickaKPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<TickaResponse | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const fetchTickaData = async () => {
    try {
      setLoading(true);
      setError(null);
      setRawData(null);

      // Proviamo a recuperare dati da una data passata (es. 30 giorni fa)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dataString = thirtyDaysAgo.toISOString().split('T')[0];

      console.log(`🔄 Fetching TickaWS data for date: ${dataString}`);

      // Proviamo prima le emissioni
      const emissioniResponse = await fetch(`/api/ticka/emissioni?data=${dataString}`);
      const emissioniData: TickaResponse = await emissioniResponse.json();

      if (emissioniData.success && emissioniData.payload?.result) {
        // Mappiamo i dati delle emissioni a KPI
        const emissioni = emissioniData.payload.result || [];
        const totaleFatturato = emissioni.reduce((sum: number, e: TickaEmissioneRow) => sum + (e.importo || 0), 0);
        const totaleBiglietti = emissioni.reduce((sum: number, e: TickaEmissioneRow) => sum + (e.quantita || 0), 0);
        const numeroEventi = new Set(emissioni.map((e: TickaEmissioneRow) => e.eventId || e.eventName || "unknown")).size;

        const kpi: TickaKPI = {
          fatturatoTotale: totaleFatturato,
          numeroBiglietti: totaleBiglietti,
          numeroTransazioni: emissioni.length,
          numeroEventi,
          mediaPerTransazione: emissioni.length > 0 ? totaleFatturato / emissioni.length : 0,
          dataRiferimento: emissioniData.data || dataString,
        };

        setData(kpi);
        setRawData(emissioniData);
      } else {
        // Proviamo il riepilogo
        const riepilogoResponse = await fetch(`/api/ticka/riepilogo?data=${dataString}`);
        const riepilogoData: TickaResponse = await riepilogoResponse.json();
        
        if (riepilogoData.success && riepilogoData.payload && !riepilogoData.payload.error) {
          // Se abbiamo dati di riepilogo, li usiamo
          setRawData(riepilogoData);
          setError("Dati riepilogo disponibili ma struttura da mappare");
        } else {
          setRawData(riepilogoData);
          setError(riepilogoData.payload?.error || "Nessun dato disponibile per la data selezionata");
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Errore sconosciuto";
      setError(errorMessage);
      console.error("Errore fetch Ticka data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickaData();
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

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">TickaWS Dati Reali</h3>
            <p className="text-sm text-gray-600 mt-1">Caricamento dati da API...</p>
          </div>
          <LoaderCircle className="h-6 w-6 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-amber-500" />
            <div>
              <h3 className="text-lg font-semibold text-amber-900">TickaWS Dati Reali</h3>
              <p className="text-sm text-amber-700 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchTickaData}
            className="px-3 py-1 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-green-50 border border-green-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <CheckCircle className="h-6 w-6 text-green-500" />
          <div>
            <h3 className="text-lg font-semibold text-green-900">TickaWS Dati Reali</h3>
            <p className="text-sm text-green-700 mt-1">
              {data ? `Dati del ${data.dataRiferimento}` : "Dati caricati"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
          >
            {showRaw ? "Hide" : "Show"} Raw
          </button>
          <button
            onClick={fetchTickaData}
            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <CreditCard className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-xs text-green-600 font-medium">Fatturato</p>
            </div>
            <p className="text-2xl font-bold text-green-900">{formatCurrency(data.fatturatoTotale)}</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Ticket className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-xs text-green-600 font-medium">Biglietti</p>
            </div>
            <p className="text-2xl font-bold text-green-900">{formatNumber(data.numeroBiglietti)}</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-xs text-green-600 font-medium">Transazioni</p>
            </div>
            <p className="text-2xl font-bold text-green-900">{formatNumber(data.numeroTransazioni)}</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-xs text-green-600 font-medium">Eventi</p>
            </div>
            <p className="text-2xl font-bold text-green-900">{formatNumber(data.numeroEventi)}</p>
          </div>
        </div>
      )}

      {/* Raw JSON Toggle */}
      {showRaw && rawData && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-green-900 mb-2">Raw JSON Response</h4>
          <div className="bg-green-100 p-4 rounded-lg border border-green-200 overflow-x-auto">
            <pre className="text-xs text-green-800 whitespace-pre-wrap">
              {JSON.stringify(rawData, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
