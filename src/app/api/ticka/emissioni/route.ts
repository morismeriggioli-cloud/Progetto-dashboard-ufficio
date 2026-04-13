import { NextResponse } from "next/server";
import { isTickaNotFoundError } from "@/lib/ticka";
import { getLastValidTickaDate } from "@/lib/ticka-date-utils";
import {
  diagnoseTickaEmissioniRequests,
  fetchTickaEmissioniByDate,
} from "@/lib/ticka-emissioni";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dataParam = searchParams.get("data");
    const diagnosticMode = searchParams.get("diagnostic") === "1";
    const dateInfo = await getLastValidTickaDate();
    const targetDate = dataParam || dateInfo.effectiveDate;

    if (diagnosticMode) {
      const diagnostic = await diagnoseTickaEmissioniRequests(targetDate);

      return NextResponse.json({
        success: true,
        mode: "diagnostic",
        requestedDate: targetDate,
        diagnostic,
        timestamp: new Date().toISOString(),
      });
    }

    const emissioniData = await fetchTickaEmissioniByDate(targetDate, "emissioni.byDate");
    const hasData = emissioniData.rows.length > 0;

    return NextResponse.json({
      success: true,
      requestedDate: targetDate,
      effectiveDate: dateInfo.effectiveDate,
      hasData,
      payload: {
        result: emissioniData.rows,
        normalized: emissioniData.normalized,
      },
      summary: {
        records: emissioniData.rows.length,
        sourceEndpoint: "/ReportEmissioni/EmissioniPerData?data={data}",
        attempts: dateInfo.attempts,
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
