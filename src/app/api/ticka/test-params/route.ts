/**
 * API Route per testare parametri alternativi
 */

import { NextResponse } from "next/server";
import { fetchTicka } from "@/lib/ticka";

export const dynamic = "force-dynamic";

type TickaListResponse = {
  result?: unknown[];
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    console.log(`🔍 Testing alternative parameter patterns...`);

    const tests = [
      // Test con underscore invece di slash
      { name: "data_underscore", url: "/ReportEmissioni/EmissioniPerData?data_2026-03-31" },
      
      // Test con camelCase
      { name: "dataCamel", url: "/ReportEmissioni/EmissioniPerData?dataDate=2026-03-31" },
      
      // Test con formato diverso
      { name: "dataSlash", url: "/ReportEmissioni/EmissioniPerData/2026-03-31" },
      
      // Test con parametro dataInizio
      { name: "dataInizio", url: "/ReportEmissioni/EmissioniPerData?dataInizio=2026-03-31" },
      
      // Test con parametro startDate
      { name: "startDate", url: "/ReportEmissioni/EmissioniPerData?startDate=2026-03-31" },
      
      // Test con parametro from/to
      { name: "fromTo", url: "/ReportEmissioni/EmissioniPerData?from=2026-03-31&to=2026-03-31" },
      
      // Test con parametro dateRange
      { name: "dateRange", url: "/ReportEmissioni/EmissioniPerData?dateRange=2026-03-31" },
      
      // Test con formato YYYYMMDD
      { name: "yyyymmdd", url: "/ReportEmissioni/EmissioniPerData?data=20260331" },
      
      // Test con formato DD-MM-YYYY
      { name: "ddmmyyyy", url: "/ReportEmissioni/EmissioniPerData?data=31-03-2026" },
      
      // Test con POST invece di GET
      { name: "postMethod", url: "/ReportEmissioni/EmissioniPerData", method: "POST", body: { data: "2026-03-31" } },
    ];

    const results = [];

    for (const test of tests) {
      try {
        let response: TickaListResponse;
        
        if (test.method === "POST") {
          response = await fetchTicka<TickaListResponse>(test.url, {
            method: "POST",
            body: JSON.stringify(test.body),
          });
        } else {
          response = await fetchTicka<TickaListResponse>(test.url);
        }

        const hasData = Array.isArray(response.result) && response.result.length > 0;
        const recordCount = hasData ? response.result?.length || 0 : 0;

        results.push({
          name: test.name,
          url: test.url,
          method: test.method || "GET",
          status: "success",
          payload: response,
          recordCount,
          hasData,
        });
      } catch (error) {
        results.push({
          name: test.name,
          url: test.url,
          method: test.method || "GET",
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
          recordCount: 0,
          hasData: false,
        });
      }
    }

    return NextResponse.json({
      success: true,
      tests,
      summary: {
        totalTests: tests.length,
        successfulTests: results.filter(r => r.status === "success").length,
        testWithMostData: results.find(r => r.hasData)?.name || "none",
        anyHasData: results.some(r => r.hasData),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Errore in /api/ticka/test-params:", error);
    
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
