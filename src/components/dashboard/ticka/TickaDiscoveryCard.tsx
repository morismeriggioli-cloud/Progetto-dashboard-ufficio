/**
 * Componente per mostrare i risultati della discovery degli endpoint TickaWS
 */

"use client";

import { useEffect, useState } from "react";
import {
  IconAlertCircle as AlertCircle,
  IconCircleCheck as CheckCircle,
  IconCode as Code,
  IconEye as Eye,
  IconLoader as LoaderCircle,
} from "@tabler/icons-react";

type EndpointResult = {
  endpoint: string;
  status: number;
  success: boolean;
  error?: string;
  sampleKeys?: string[];
};

type DiscoveryData = {
  success: boolean;
  login?: {
    userName: string;
    expireDate: string;
    validity: string;
  };
  summary?: {
    totalTested: number;
    working: number;
    promising: number;
  };
  workingEndpoints?: EndpointResult[];
  allResults?: EndpointResult[];
  error?: string;
};

export default function TickaDiscoveryCard() {
  const [data, setData] = useState<DiscoveryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const fetchDiscoveryData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/ticka/discover");
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Errore nella discovery degli endpoint");
      }
      
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Errore sconosciuto";
      setError(errorMessage);
      console.error("Errore fetch Ticka discovery:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscoveryData();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">TickaWS Endpoint Discovery</h3>
            <p className="text-sm text-gray-600 mt-1">Scansione endpoint disponibili...</p>
          </div>
          <LoaderCircle className="h-6 w-6 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">TickaWS Discovery</h3>
              <p className="text-sm text-red-700 mt-1">
                {error || data?.error || "Discovery fallita"}
              </p>
            </div>
          </div>
          <button
            onClick={fetchDiscoveryData}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const workingEndpoints = data.workingEndpoints || [];
  const summary = data.summary || { totalTested: 0, working: 0, promising: 0 };

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">TickaWS Endpoint Discovery</h3>
          <p className="text-sm text-gray-600 mt-1">
            {summary.working} di {summary.totalTested} endpoint funzionanti
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Code className="h-3 w-3" />
            <span>{showRaw ? "Hide" : "Show"} Raw</span>
          </button>
          <button
            onClick={fetchDiscoveryData}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{summary.totalTested}</p>
          <p className="text-xs text-gray-600">Tested</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{summary.working}</p>
          <p className="text-xs text-gray-600">Working</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{summary.promising}</p>
          <p className="text-xs text-gray-600">Promising</p>
        </div>
      </div>

      {/* Working Endpoints */}
      {workingEndpoints.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Endpoint Funzionanti</h4>
          <div className="space-y-2">
            {workingEndpoints.map((endpoint, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-900">{endpoint.endpoint}</span>
                  <span className="text-xs text-green-600">({endpoint.status})</span>
                </div>
                {endpoint.sampleKeys && endpoint.sampleKeys.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <Eye className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-green-600">
                      {endpoint.sampleKeys.length > 0 ? `${endpoint.sampleKeys.length} fields` : "No fields"}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw JSON Toggle */}
      {showRaw && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Raw JSON Response</h4>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-x-auto">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {workingEndpoints.length === 0 && (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Nessun endpoint funzionante trovato</p>
          <p className="text-sm text-gray-500 mt-1">
            Potrebbe essere necessario configurare le credenziali o gli endpoint potrebbero essere diversi
          </p>
        </div>
      )}
    </div>
  );
}
