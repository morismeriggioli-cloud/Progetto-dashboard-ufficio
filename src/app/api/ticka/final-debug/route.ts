/**
 * API Route per debugging definitivo dell'endpoint reale
 */

import { NextResponse } from "next/server";
import { fetchTicka } from "@/lib/ticka";

export const dynamic = "force-dynamic";

type TickaListResponse = {
  result?: unknown[];
};

export async function GET() {
  try {
    console.log(`🔍 DEBUG FINALE: /ReportEmissioni/EmissioniPerData`);
    
    // Test 1: Base con data di ieri
    const yesterday = '2026-03-31';
    console.log(`📡 Test 1: Base con data=${yesterday}`);
    const response1 = await fetchTicka<TickaListResponse>(`/ReportEmissioni/EmissioniPerData?data=${yesterday}`);
    
    // Test 2: Con includeDetails=true
    console.log(`📡 Test 2: Con includeDetails=true`);
    const response2 = await fetchTicka<TickaListResponse>(`/ReportEmissioni/EmissioniPerData?data=${yesterday}&includeDetails=true`);
    
    // Test 3: Con limit=50
    console.log(`📡 Test 3: Con limit=50`);
    const response3 = await fetchTicka<TickaListResponse>(`/ReportEmissioni/EmissioniPerData?data=${yesterday}&limit=50`);
    
    // Test 4: Con organizzatore (se supportato)
    console.log(`📡 Test 4: Con organizzatore=1`);
    const response4 = await fetchTicka<TickaListResponse>(`/ReportEmissioni/EmissioniPerData?data=${yesterday}&organizzatore=1`);
    
    // Test 5: Con puntoVendita (se supportato)
    console.log(`📡 Test 5: Con puntoVendita=1`);
    const response5 = await fetchTicka<TickaListResponse>(`/ReportEmissioni/EmissioniPerData?data=${yesterday}&puntoVendita=1`);
    
    // Test 6: Con stato=TUTTI (se supportato)
    console.log(`📡 Test 6: Con stato=TUTTI`);
    const response6 = await fetchTicka<TickaListResponse>(`/ReportEmissioni/EmissioniPerData?data=${yesterday}&stato=TUTTI`);
    
    // Test 7: Con range date ultima settimana
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    console.log(`📡 Test 7: Range ultima settimana ${weekAgoStr} - ${yesterday}`);
    const response7 = await fetchTicka<TickaListResponse>(`/ReportEmissioni/EmissioniPerData?from=${weekAgoStr}&to=${yesterday}`);

    return NextResponse.json({
      success: true,
      endpoint: "/ReportEmissioni/EmissioniPerData",
      tests: [
        {
          name: "Base con data",
          url: `/ReportEmissioni/EmissioniPerData?data=${yesterday}`,
          status: "success",
          payload: response1,
          recordCount: response1?.result?.length || 0,
          hasData: (response1?.result?.length || 0) > 0,
        },
        {
          name: "Con includeDetails=true",
          url: `/ReportEmissioni/EmissioniPerData?data=${yesterday}&includeDetails=true`,
          status: "success", 
          payload: response2,
          recordCount: response2?.result?.length || 0,
          hasData: (response2?.result?.length || 0) > 0,
        },
        {
          name: "Con limit=50",
          url: `/ReportEmissioni/EmissioniPerData?data=${yesterday}&limit=50`,
          status: "success",
          payload: response3,
          recordCount: response3?.result?.length || 0,
          hasData: (response3?.result?.length || 0) > 0,
        },
        {
          name: "Con organizzatore=1",
          url: `/ReportEmissioni/EmissioniPerData?data=${yesterday}&organizzatore=1`,
          status: "success",
          payload: response4,
          recordCount: response4?.result?.length || 0,
          hasData: (response4?.result?.length || 0) > 0,
        },
        {
          name: "Con puntoVendita=1",
          url: `/ReportEmissioni/EmissioniPerData?data=${yesterday}&puntoVendita=1`,
          status: "success",
          payload: response5,
          recordCount: response5?.result?.length || 0,
          hasData: (response5?.result?.length || 0) > 0,
        },
        {
          name: "Con stato=TUTTI",
          url: `/ReportEmissioni/EmissioniPerData?data=${yesterday}&stato=TUTTI`,
          status: "success",
          payload: response6,
          recordCount: response6?.result?.length || 0,
          hasData: (response6?.result?.length || 0) > 0,
        },
        {
          name: "Range ultima settimana",
          url: `/ReportEmissioni/EmissioniPerData?from=${weekAgoStr}&to=${yesterday}`,
          status: "success",
          payload: response7,
          recordCount: response7?.result?.length || 0,
          hasData: (response7?.result?.length || 0) > 0,
        },
      ],
      summary: {
        totalTests: 7,
        successfulTests: 7,
        testWithMostData: "base",
        anyHasData: [response1, response2, response3, response4, response5, response6, response7].some(
          (r) => (r.result?.length || 0) > 0
        ),
        conclusion: (response1.result?.length || 0) > 0 ? "Dati trovati" : "Nessun dato trovato con nessun parametro",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Errore in /api/ticka/final-debug:", error);
    
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
