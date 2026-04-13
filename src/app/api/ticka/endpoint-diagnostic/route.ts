import { NextResponse } from "next/server";

import { getTickaToken } from "@/lib/ticka";

export const dynamic = "force-dynamic";

type CandidateTest = {
  name: string;
  path: string;
  method?: "GET" | "POST";
  body?: Record<string, string> | null;
};

type CandidateResult = {
  name: string;
  method: "GET" | "POST";
  path: string;
  params: Record<string, string>;
  status: number;
  ok: boolean;
  resultCount: number;
  sampleRow: Record<string, unknown> | null;
  sampleKeys: string[];
  responseShape: {
    topLevelKeys: string[];
    hasResultArray: boolean;
  };
};

function getBaseUrl() {
  return process.env.TICKA_BASE_URL || "https://ws-duemondi.ticka.it";
}

function compactDate(date: string) {
  return date.replace(/-/g, "");
}

function extractParamsFromPath(path: string) {
  const url = new URL(`${getBaseUrl()}${path}`);
  return Object.fromEntries(url.searchParams.entries());
}

async function runCandidate(token: string, candidate: CandidateTest): Promise<CandidateResult> {
  const url = `${getBaseUrl()}${candidate.path}`;
  const method = candidate.method ?? "GET";
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "api-version": "1",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: method === "POST" && candidate.body ? JSON.stringify(candidate.body) : undefined,
    cache: "no-store",
  });

  const rawText = await response.text();
  let parsed: unknown = null;

  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = rawText;
  }

  const resultRows =
    parsed && typeof parsed === "object" && !Array.isArray(parsed) && Array.isArray((parsed as { result?: unknown[] }).result)
      ? ((parsed as { result?: unknown[] }).result ?? [])
      : [];
  const sampleRow =
    resultRows.length > 0 && resultRows[0] && typeof resultRows[0] === "object" && !Array.isArray(resultRows[0])
      ? (resultRows[0] as Record<string, unknown>)
      : null;
  const topLevelKeys =
    parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.keys(parsed as Record<string, unknown>) : [];

  return {
    name: candidate.name,
    method,
    path: candidate.path,
    params: extractParamsFromPath(candidate.path),
    status: response.status,
    ok: response.ok,
    resultCount: resultRows.length,
    sampleRow,
    sampleKeys: sampleRow ? Object.keys(sampleRow).slice(0, 20) : [],
    responseShape: {
      topLevelKeys,
      hasResultArray: Array.isArray(resultRows),
    },
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || "2026-01-01";
    const dateCompact = compactDate(date);
    const login = await getTickaToken();

    const swaggerResponse = await fetch(`${getBaseUrl()}/swagger/v1/swagger.json`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const swaggerJson = (await swaggerResponse.json()) as { paths?: Record<string, unknown> };
    const swaggerPaths = Object.keys(swaggerJson.paths ?? {});

    const candidates: CandidateTest[] = [
      { name: "report-emissioni data compact", path: `/ReportEmissioni/EmissioniPerData?data=${dateCompact}` },
      { name: "report-emissioni data iso", path: `/ReportEmissioni/EmissioniPerData?data=${date}` },
      { name: "report-emissioni from/to compact", path: `/ReportEmissioni/EmissioniPerData?from=${dateCompact}&to=${dateCompact}` },
      { name: "report-emissioni from/to iso", path: `/ReportEmissioni/EmissioniPerData?from=${date}&to=${date}` },
      { name: "report-emissioni includeDetails", path: `/ReportEmissioni/EmissioniPerData?data=${date}&includeDetails=true` },
      { name: "report-emissioni limit", path: `/ReportEmissioni/EmissioniPerData?data=${date}&limit=50` },
      { name: "report-emissioni stato tutti", path: `/ReportEmissioni/EmissioniPerData?data=${date}&stato=TUTTI` },
      { name: "report-emissioni no params", path: "/ReportEmissioni/EmissioniPerData" },
      { name: "report-get-emissioni data compact", path: `/Report/GetEmissioni?data=${dateCompact}` },
      { name: "report-get-emissioni data iso", path: `/Report/GetEmissioni?data=${date}` },
      { name: "reportemissioni data iso", path: `/reportEmissioni?data=${date}` },
      { name: "order-get-orders", path: `/Order/GetOrders?from=${date}&to=${date}` },
      { name: "orders-get-orders", path: `/Orders/GetOrders?from=${date}&to=${date}` },
      { name: "ordine-get-ordini", path: `/Ordine/GetOrdini?from=${date}&to=${date}` },
      { name: "ordini-get-ordini", path: `/Ordini/GetOrdini?from=${date}&to=${date}` },
      { name: "report-get-ordini", path: `/Report/GetOrdini?from=${date}&to=${date}` },
      { name: "report-ordini-per-data", path: `/ReportOrdini/OrdiniPerData?data=${date}` },
      {
        name: "report-emissioni post iso",
        path: "/ReportEmissioni/EmissioniPerData",
        method: "POST",
        body: { data: date },
      },
      {
        name: "report-emissioni post compact",
        path: "/ReportEmissioni/EmissioniPerData",
        method: "POST",
        body: { data: dateCompact },
      },
      {
        name: "report-emissioni post from/to",
        path: "/ReportEmissioni/EmissioniPerData",
        method: "POST",
        body: { from: date, to: date },
      },
    ];

    const results: CandidateResult[] = [];

    for (const candidate of candidates) {
      try {
        const result = await runCandidate(login.token, candidate);
        results.push(result);
      } catch (error) {
        results.push({
          name: candidate.name,
          method: candidate.method ?? "GET",
          path: candidate.path,
          params: extractParamsFromPath(candidate.path),
          status: 0,
          ok: false,
          resultCount: -1,
          sampleRow: error instanceof Error ? { error: error.message } : { error: String(error) },
          sampleKeys: [],
          responseShape: {
            topLevelKeys: [],
            hasResultArray: false,
          },
        });
      }
    }

    const endpointsWithRows = results.filter((result) => result.resultCount > 0);
    const existingEndpoints = results.filter((result) => result.status !== 404);

    return NextResponse.json({
      success: true,
      testedDate: date,
      swagger: {
        url: `${getBaseUrl()}/swagger/v1/swagger.json`,
        status: swaggerResponse.status,
        documentedPathsCount: swaggerPaths.length,
        documentedPaths: swaggerPaths,
      },
      summary: {
        totalCandidates: results.length,
        existingEndpoints: existingEndpoints.length,
        endpointsWithRows: endpointsWithRows.length,
        bestCandidate: endpointsWithRows[0] ?? null,
      },
      candidates: results,
      recommendation:
        endpointsWithRows.length > 0
          ? {
              endpoint: endpointsWithRows[0].path,
              params: endpointsWithRows[0].params,
              reason: "Primo endpoint reale che restituisce result[] non vuoto.",
            }
          : {
              endpoint: null,
              params: null,
              reason:
                "Nessun endpoint provato restituisce righe reali. L'unico endpoint esistente per emissioni resta /ReportEmissioni/EmissioniPerData, ma su questo tenant risponde con result vuoto.",
            },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
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
