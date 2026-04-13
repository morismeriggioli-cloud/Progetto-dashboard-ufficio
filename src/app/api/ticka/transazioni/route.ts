import { NextResponse } from "next/server";
import { fetchTicka, isTickaNotFoundError } from "@/lib/ticka";

export const dynamic = "force-dynamic";

function resolveDate(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("data");
  const fallback = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const value = input || fallback;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Il parametro data deve essere nel formato YYYY-MM-DD.");
  }

  return value;
}

export async function GET(request: Request) {
  try {
    const targetDate = resolveDate(request);
    const finalUrl = `/logtransazioni/date/data/${targetDate}`;
    const rawPayload = await fetchTicka(finalUrl, {
      endpointName: "dashboard.transazioniByDate",
    });

    const result = Array.isArray((rawPayload as { result?: unknown[] }).result)
      ? (rawPayload as { result: unknown[] }).result
      : [];

    return NextResponse.json({
      success: true,
      requestedDate: targetDate,
      finalUrl,
      payload: rawPayload,
      summary: {
        records: result.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const status = isTickaNotFoundError(error) ? 404 : 500;

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Errore interno del server",
        pathVerified: !isTickaNotFoundError(error),
        timestamp: new Date().toISOString(),
      },
      { status }
    );
  }
}
