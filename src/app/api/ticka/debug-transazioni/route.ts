/**
 * API Route per debugging completo dell'endpoint transazioni
 */

import { NextResponse } from "next/server";
import { fetchTicka } from "@/lib/ticka";

export const dynamic = "force-dynamic";

type TickaListResponse = {
  result?: unknown[];
  error?: string;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const targetDate = dateParam || '2026-03-31'; // Ieri

    console.log(`🔍 DEBUG: Testing transazioni endpoint with date: ${targetDate}`);

    // Test 1: Chiamata base
    console.log(`📡 Test 1: /logtransazioni/date/data/${targetDate}`);
    const response1 = await fetchTicka<TickaListResponse>(`/logtransazioni/date/data/${targetDate}`);
    
    // Test 2: Con range date
    console.log(`📡 Test 2: /logtransazioni/date/from/${targetDate}/to/${targetDate}`);
    const response2 = await fetchTicka<TickaListResponse>(`/logtransazioni/date/from/${targetDate}/to/${targetDate}`);
    
    // Test 3: Senza /data/ prefisso
    console.log(`📡 Test 3: /logtransazioni/${targetDate}`);
    const response3 = await fetchTicka<TickaListResponse>(`/logtransazioni/${targetDate}`);
    
    // Test 4: Con parametri aggiuntivi
    console.log(`📡 Test 4: /logtransazioni/date/data/${targetDate}?limit=100`);
    const response4 = await fetchTicka<TickaListResponse>(`/logtransazioni/date/data/${targetDate}?limit=100`);
    
    // Test 5: Con eventId
    console.log(`📡 Test 5: /logtransazioni/date/data/${targetDate}?eventId=123`);
    const response5 = await fetchTicka<TickaListResponse>(`/logtransazioni/date/data/${targetDate}?eventId=123`);

    return NextResponse.json({
      success: true,
      targetDate,
      tests: [
        {
          name: "Base /date/data/{data}",
          url: `/logtransazioni/date/data/${targetDate}`,
          status: "success",
          payload: response1,
          recordCount: response1?.result?.length || 0,
          hasData: (response1?.result?.length || 0) > 0,
        },
        {
          name: "Range /date/from/{data}/to/{data}",
          url: `/logtransazioni/date/from/${targetDate}/to/${targetDate}`,
          status: "success",
          payload: response2,
          recordCount: response2?.result?.length || 0,
          hasData: (response2?.result?.length || 0) > 0,
        },
        {
          name: "Senza /data/ prefisso",
          url: `/logtransazioni/${targetDate}`,
          status: "success",
          payload: response3,
          recordCount: response3?.result?.length || 0,
          hasData: (response3?.result?.length || 0) > 0,
        },
        {
          name: "Con limit",
          url: `/logtransazioni/date/data/${targetDate}?limit=100`,
          status: "success",
          payload: response4,
          recordCount: response4?.result?.length || 0,
          hasData: (response4?.result?.length || 0) > 0,
        },
        {
          name: "Con eventId",
          url: `/logtransazioni/date/data/${targetDate}?eventId=123`,
          status: "success",
          payload: response5,
          recordCount: response5?.result?.length || 0,
          hasData: (response5?.result?.length || 0) > 0,
        },
      ],
      summary: {
        totalTests: 5,
        successfulTests: 5,
        testWithMostData: "base",
        anyHasData: [response1, response2, response3, response4, response5].some(
          (r) => (r.result?.length || 0) > 0
        ),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Errore in /api/ticka/debug-transazioni:", error);
    
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
