/**
 * API Route per testare la connessione con TickaWS
 * 
 * GET /api/ticka/test
 * Restituisce lo stato della connessione e metadati del test
 */

import { NextResponse } from "next/server";
import { testTickaConnection } from "@/lib/ticka";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await testTickaConnection();
    const data = result.data as
      | {
          login?: {
            userName?: string;
            expireDate?: string;
          };
        }
      | undefined;
    
    // Maschera informazioni sensibili prima di inviare al client
    const safeResponse = {
      success: result.success,
      data: result.success ? {
        connection: "OK",
        user: data?.login?.userName,
        apiVersion: result.metadata?.apiVersion,
        expiresAt: data?.login?.expireDate,
        // TODO: Aggiungere dati reali quando disponibili
        recordCount: result.metadata?.recordCount || { events: 0, orders: 0, venues: 0 },
        lastSync: result.metadata?.syncDate,
      } : null,
      error: result.error,
      metadata: result.metadata,
    };

    return NextResponse.json(safeResponse);
  } catch (error) {
    console.error("Errore in /api/ticka/test:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Errore interno del server",
      },
      { status: 500 }
    );
  }
}
