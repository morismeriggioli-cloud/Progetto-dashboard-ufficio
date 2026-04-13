/**
 * API Route per discovery avanzata - cerca endpoint non documentati
 */

import { NextResponse } from "next/server";
import { getTickaToken } from "@/lib/ticka";

export const dynamic = "force-dynamic";

// Possibili pattern di endpoint basati su naming convention
const ADVANCED_PATTERNS = [
  // REST patterns
  "/api/v1/events",
  "/api/v1/orders", 
  "/api/v1/tickets",
  "/api/v1/venues",
  "/api/v1/reports",
  "/api/v1/statistics",
  "/api/v1/dashboard",
  "/api/v1/sales",
  "/api/v1/revenue",
  "/api/v1/emissioni",
  "/api/v1/rie piloghi",
  "/api/v1/fatturato",
  "/api/v1/prevendita",
  
  // Direct patterns
  "/v1/events",
  "/v1/orders",
  "/v1/tickets", 
  "/v1/venues",
  "/v1/reports",
  "/v1/statistics",
  "/v1/dashboard",
  "/v1/sales",
  "/v1/revenue",
  "/v1/emissioni",
  "/v1/rie piloghi",
  "/v1/fatturato",
  "/v1/prevendita",
  
  // Italian patterns
  "/api/eventi",
  "/api/ordini",
  "/api/biglietti",
  "/api/locali",
  "/api/report",
  "/api/rie piloghi",
  "/api/fatturato", 
  "/api/prevendita",
  "/api/vendite",
  
  // English patterns
  "/api/events",
  "/api/orders",
  "/api/tickets",
  "/api/venues",
  "/api/reports",
  "/api/statistics",
  "/api/dashboard",
  "/api/sales",
  "/api/revenue",
  
  // Business specific patterns
  "/report/emissioni",
  "/report/rie piloghi", 
  "/report/fatturato",
  "/report/prevendita",
  "/report/vendite",
  "/dashboard/sales",
  "/dashboard/revenue",
  "/dashboard/tickets",
  "/dashboard/orders",
  
  // Controller patterns
  "/Event/GetEvents",
  "/Order/GetOrders", 
  "/Ticket/GetTickets",
  "/Report/GetEmissioni",
  "/Report/GetRiepilogo",
  
  // Query parameters patterns
  "/events?from=2026-01-01&to=2026-12-31",
  "/orders?startDate=2026-01-01",
  "/tickets?eventId=123",
];

export async function GET() {
  try {
    const loginData = await getTickaToken();
    const results = [];
    
    // Testiamo tutti i pattern
    for (const endpoint of ADVANCED_PATTERNS) {
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

        let sampleData = null;
        let fields: string[] = [];
        
        if (response.ok) {
          try {
            const contentType = response.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
              sampleData = await response.json();
              if (Array.isArray(sampleData) && sampleData.length > 0) {
                fields = Object.keys(sampleData[0] || {});
              } else if (typeof sampleData === 'object' && sampleData !== null) {
                fields = Object.keys(sampleData);
              }
            }
          } catch (parseError) {
            // Ignore parse errors for now
          }
        }

        results.push({
          endpoint,
          method: "GET",
          status: response.status,
          success: response.ok,
          contentType: response.headers.get("content-type") || "",
          fields: fields,
          hasData: sampleData !== null,
          sampleSize: Array.isArray(sampleData) ? sampleData.length : (sampleData ? 1 : 0),
        });
      } catch (error) {
        results.push({
          endpoint,
          method: "GET", 
          status: 0,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Testiamo anche POST su alcuni endpoint
    const postEndpoints = ["/api/v1/events", "/api/v1/reports", "/api/v1/dashboard"];
    for (const endpoint of postEndpoints) {
      try {
        const response = await fetch(`${process.env.TICKA_BASE_URL || "https://ws-duemondi.ticka.it"}${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-version": "1", 
            "Accept": "application/json",
            "Authorization": `Bearer ${loginData.token}`,
          },
          body: JSON.stringify({}),
          cache: "no-store",
        });

        results.push({
          endpoint,
          method: "POST",
          status: response.status,
          success: response.ok,
          contentType: response.headers.get("content-type") || "",
        });
      } catch (error) {
        results.push({
          endpoint,
          method: "POST",
          status: 0,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const workingEndpoints = results.filter(r => r.success && r.status >= 200 && r.status < 300);
    const promisingEndpoints = workingEndpoints.filter(r => r.fields && r.fields.length > 0);

    return NextResponse.json({
      success: true,
      login: {
        userName: loginData.userName,
        tokenValid: !!loginData.token,
      },
      summary: {
        totalTested: results.length,
        working: workingEndpoints.length,
        promising: promisingEndpoints.length,
      },
      workingEndpoints: workingEndpoints.map(r => ({
        endpoint: r.endpoint,
        method: r.method,
        status: r.status,
        fields: r.fields || [],
        hasData: r.hasData || false,
        sampleSize: r.sampleSize || 0,
      })),
      promisingEndpoints: promisingEndpoints.map(r => r.endpoint),
      allResults: results,
      recommendations: {
        nextSteps: workingEndpoints.length > 0 
          ? [
              "Analizza i working endpoints per struttura dati",
              "Implementa tipi TypeScript basati sui campi trovati",
              "Crea funzioni di mapping per i dati business",
            ]
          : [
              "L'API sembra esporre solo l'autenticazione",
              "Potrebbe essere necessaria una chiave API diversa",
              "Controlla se esistono endpoint con parametri speciali",
              "Verifica se servono headers aggiuntivi",
            ]
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Errore durante discovery avanzata",
      },
      { status: 500 }
    );
  }
}
