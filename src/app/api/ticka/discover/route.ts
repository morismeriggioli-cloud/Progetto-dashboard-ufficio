/**
 * API Route per scoprire gli endpoint disponibili in TickaWS
 * 
 * GET /api/ticka/discover
 * Prova a chiamare vari endpoint comuni per scoprire quali sono disponibili
 */

import { NextResponse } from "next/server";
import { getTickaToken } from "@/lib/ticka";

export const dynamic = "force-dynamic";

// Endpoint comuni da testare
const COMMON_ENDPOINTS = [
  "/events",
  "/eventi", 
  "/orders",
  "/ordini",
  "/tickets",
  "/biglietti",
  "/venues",
  "/sale",
  "/vendita",
  "/report",
  "/reportEmissioni",
  "/rie piloghi",
  "/fatturato",
  "/prevendita",
  "/dashboard",
  "/stats",
  "/statistics",
  "/api/v1/events",
  "/api/v1/orders",
  "/api/v1/tickets",
  "/v1/events",
  "/v1/orders",
  "/v1/tickets",
];

export async function GET() {
  const results: Array<{
    endpoint: string;
    status: number;
    success: boolean;
    error?: string;
    sampleData?: unknown;
  }> = [];

  try {
    // Prima testiamo il login
    const loginData = await getTickaToken();
    
    // Poi testiamo ogni endpoint
    for (const endpoint of COMMON_ENDPOINTS) {
      try {
        const response = await fetch(`${process.env.TICKA_BASE_URL || "https://ws-duemondi.ticka.it"}${endpoint}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "api-version": "1",
            "Accept": "application/json",
            "Authorization": `Bearer ${loginData.token}`,
          },
          cache: "no-store",
        });

        let sampleData: unknown = null;
        let error: string | undefined = undefined;

        try {
          const contentType = response.headers.get("content-type");
          if (contentType?.includes("application/json")) {
            sampleData = await response.json();
          } else {
            sampleData = await response.text();
          }
        } catch (parseError) {
          error = `Parse error: ${parseError instanceof Error ? parseError.message : 'Unknown'}`;
        }

        results.push({
          endpoint,
          status: response.status,
          success: response.ok,
          error,
          sampleData: response.ok ? sampleData : null,
        });
      } catch (endpointError) {
        results.push({
          endpoint,
          status: 0,
          success: false,
          error: endpointError instanceof Error ? endpointError.message : "Unknown error",
        });
      }
    }

    // Filtra solo gli endpoint che funzionano
    const workingEndpoints = results.filter(r => r.success && r.status === 200);
    const promisingEndpoints = results.filter(r => r.success && r.status >= 200 && r.status < 300);

    return NextResponse.json({
      success: true,
      login: {
        userName: loginData.userName,
        expireDate: loginData.expireDate,
        validity: loginData.validity,
      },
      summary: {
        totalTested: COMMON_ENDPOINTS.length,
        working: workingEndpoints.length,
        promising: promisingEndpoints.length,
      },
      workingEndpoints: workingEndpoints.map(r => ({
        endpoint: r.endpoint,
        status: r.status,
        sampleKeys: r.sampleData ? (Array.isArray(r.sampleData) 
          ? (r.sampleData.length > 0 ? Object.keys(r.sampleData[0] || {}) : [])
          : Object.keys(r.sampleData || {})
        ) : [],
      })),
      allResults: results,
    });
  } catch (error) {
    console.error("Errore in /api/ticka/discover:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Errore interno del server",
      },
      { status: 500 }
    );
  }
}
