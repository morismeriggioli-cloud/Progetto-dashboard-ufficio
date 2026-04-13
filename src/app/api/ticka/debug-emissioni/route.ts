/**
 * API Route per debugging completo dell'endpoint emissioni
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

    console.log(`🔍 DEBUG: Testing emissioni endpoint with date: ${targetDate}`);

    // Test 1: Chiamata diretta senza parametri
    console.log(`📡 Test 1: /ReportEmissioni/EmissioniPerData?data=${targetDate}`);
    const response1 = await fetchTicka<TickaListResponse>(`/ReportEmissioni/EmissioniPerData?data=${targetDate}`);
    
    // Test 2: Con parametri aggiuntivi possibili
    console.log(`📡 Test 2: /ReportEmissioni/EmissioniPerData?data=${targetDate}&includeDetails=true`);
    const response2 = await fetchTicka<TickaListResponse>(`/ReportEmissioni/EmissioniPerData?data=${targetDate}&includeDetails=true`);
    
    // Test 3: Con range date
    console.log(`📡 Test 3: /ReportEmissioni/EmissioniPerData?from=${targetDate}&to=${targetDate}`);
    const response3 = await fetchTicka<TickaListResponse>(`/ReportEmissioni/EmissioniPerData?from=${targetDate}&to=${targetDate}`);
    
    // Test 4: Senza parametri data
    console.log(`📡 Test 4: /ReportEmissioni/EmissioniPerData`);
    const response4 = await fetchTicka<TickaListResponse>(`/ReportEmissioni/EmissioniPerData`);

    // Test 5: Con idEvento
    console.log(`📡 Test 5: /ReportEmissioni/EmissioniPerData?eventId=123&data=${targetDate}`);
    const response5 = await fetchTicka<TickaListResponse>(`/ReportEmissioni/EmissioniPerData?eventId=123&data=${targetDate}`);

    // Test 6: Con organizzatore
    console.log(`📡 Test 6: /ReportEmissioni/EmissioniPerData?organizerId=456&data=${targetDate}`);
    const response6 = await fetchTicka<TickaListResponse>(`/ReportEmissioni/EmissioniPerData?organizerId=456&data=${targetDate}`);

    return NextResponse.json({
      success: true,
      targetDate,
      tests: [
        {
          name: "Base con data",
          url: `/ReportEmissioni/EmissioniPerData?data=${targetDate}`,
          status: "success",
          payload: response1,
          recordCount: response1?.result?.length || 0,
          hasData: (response1?.result?.length || 0) > 0,
        },
        {
          name: "Con includeDetails",
          url: `/ReportEmissioni/EmissioniPerData?data=${targetDate}&includeDetails=true`,
          status: "success", 
          payload: response2,
          recordCount: response2?.result?.length || 0,
          hasData: (response2?.result?.length || 0) > 0,
        },
        {
          name: "Con range date",
          url: `/ReportEmissioni/EmissioniPerData?from=${targetDate}&to=${targetDate}`,
          status: "success",
          payload: response3,
          recordCount: response3?.result?.length || 0,
          hasData: (response3?.result?.length || 0) > 0,
        },
        {
          name: "Senza data",
          url: `/ReportEmissioni/EmissioniPerData`,
          status: "success",
          payload: response4,
          recordCount: response4?.result?.length || 0,
          hasData: (response4?.result?.length || 0) > 0,
        },
        {
          name: "Con eventId",
          url: `/ReportEmissioni/EmissioniPerData?eventId=123&data=${targetDate}`,
          status: "success",
          payload: response5,
          recordCount: response5?.result?.length || 0,
          hasData: (response5?.result?.length || 0) > 0,
        },
        {
          name: "Con organizerId",
          url: `/ReportEmissioni/EmissioniPerData?organizerId=456&data=${targetDate}`,
          status: "success",
          payload: response6,
          recordCount: response6?.result?.length || 0,
          hasData: (response6?.result?.length || 0) > 0,
        },
      ],
      summary: {
        totalTests: 6,
        successfulTests: 6,
        testWithMostData: "base",
        anyHasData: [response1, response2, response3, response4, response5, response6].some(
          (r) => (r.result?.length || 0) > 0
        ),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Errore in /api/ticka/debug-emissioni:", error);
    
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
