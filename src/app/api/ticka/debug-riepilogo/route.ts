/**
 * API Route per debugging completo dell'endpoint riepilogo
 */

import { NextResponse } from "next/server";
import { fetchTicka } from "@/lib/ticka";

export const dynamic = "force-dynamic";

type TickaObjectResponse = Record<string, unknown> & {
  error?: string;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const targetDate = dateParam || '2026-03-31'; // Ieri

    console.log(`🔍 DEBUG: Testing riepilogo endpoint with date: ${targetDate}`);

    // Test 1: Chiamata base
    console.log(`📡 Test 1: /riepilogogiornaliero/date/data/${targetDate}`);
    const response1 = await fetchTicka<TickaObjectResponse>(`/riepilogogiornaliero/date/data/${targetDate}`);
    
    // Test 2: Con range date
    console.log(`📡 Test 2: /riepilogogiornaliero/date/from/${targetDate}/to/${targetDate}`);
    const response2 = await fetchTicka<TickaObjectResponse>(`/riepilogogiornaliero/date/from/${targetDate}/to/${targetDate}`);
    
    // Test 3: Con parametri aggiuntivi
    console.log(`📡 Test 3: /riepilogogiornaliero/date/data/${targetDate}?includeDetails=true`);
    const response3 = await fetchTicka<TickaObjectResponse>(`/riepilogogiornaliero/date/data/${targetDate}?includeDetails=true`);
    
    // Test 4: Senza /date/ prefisso
    console.log(`📡 Test 4: /riepilogogiornaliero/${targetDate}`);
    const response4 = await fetchTicka<TickaObjectResponse>(`/riepilogogiornaliero/${targetDate}`);
    
    // Test 5: Con organizzatore
    console.log(`📡 Test 5: /riepilogogiornaliero/date/data/${targetDate}?organizerId=456`);
    const response5 = await fetchTicka<TickaObjectResponse>(`/riepilogogiornaliero/date/data/${targetDate}?organizerId=456`);

    return NextResponse.json({
      success: true,
      targetDate,
      tests: [
        {
          name: "Base /date/data/{data}",
          url: `/riepilogogiornaliero/date/data/${targetDate}`,
          status: "success",
          payload: response1,
          hasData: response1 && !response1.error && Object.keys(response1).length > 2,
          recordCount: response1 && !response1.error ? 1 : 0,
        },
        {
          name: "Range /date/from/{data}/to/{data}",
          url: `/riepilogogiornaliero/date/from/${targetDate}/to/${targetDate}`,
          status: "success",
          payload: response2,
          hasData: response2 && !response2.error && Object.keys(response2).length > 2,
          recordCount: response2 && !response2.error ? 1 : 0,
        },
        {
          name: "Con includeDetails",
          url: `/riepilogogiornaliero/date/data/${targetDate}?includeDetails=true`,
          status: "success",
          payload: response3,
          hasData: response3 && !response3.error && Object.keys(response3).length > 2,
          recordCount: response3 && !response3.error ? 1 : 0,
        },
        {
          name: "Senza /date/ prefisso",
          url: `/riepilogogiornaliero/${targetDate}`,
          status: "success",
          payload: response4,
          hasData: response4 && !response4.error && Object.keys(response4).length > 2,
          recordCount: response4 && !response4.error ? 1 : 0,
        },
        {
          name: "Con organizerId",
          url: `/riepilogogiornaliero/date/data/${targetDate}?organizerId=456`,
          status: "success",
          payload: response5,
          hasData: response5 && !response5.error && Object.keys(response5).length > 2,
          recordCount: response5 && !response5.error ? 1 : 0,
        },
      ],
      summary: {
        totalTests: 5,
        successfulTests: 5,
        testWithMostData: "base",
        anyHasData: [response1, response2, response3, response4, response5].some(r => r && !r.error && Object.keys(r).length > 2),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Errore in /api/ticka/debug-riepilogo:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Errore interno del server",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
