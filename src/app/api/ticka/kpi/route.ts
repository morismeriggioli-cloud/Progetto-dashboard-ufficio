import { NextResponse } from "next/server";
import { formatDateItalian, getLastValidTickaDate } from "@/lib/ticka-date-utils";
import { isTickaNotFoundError } from "@/lib/ticka";
import { fetchTickaRiepilogoXml } from "@/lib/ticka-riepilogo";
import { fetchTickaEmissioniByDate } from "@/lib/ticka-emissioni";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dateInfo = await getLastValidTickaDate();
    const emissioni = await fetchTickaEmissioniByDate(dateInfo.effectiveDate, "kpi.emissioniByDate");

    const payload = {
      revenueTotal: emissioni.normalized.revenueTotal,
      ticketsTotal: emissioni.normalized.ticketsTotal,
      transactionsTotal: emissioni.normalized.transactionsTotal,
      eventsTotal: emissioni.normalized.eventsTotal,
      sourceDate: emissioni.normalized.sourceDate || dateInfo.effectiveDate,
      hasRealData: emissioni.normalized.rows.length > 0,
      notes: [`Dati da emissioni JSON del ${formatDateItalian(emissioni.normalized.sourceDate || dateInfo.effectiveDate)}`],
      warnings: [] as string[],
      sources: ["/ReportEmissioni/EmissioniPerData?data={data}"],
    };

    try {
      const riepilogo = await fetchTickaRiepilogoXml(dateInfo.effectiveDate, "kpi.riepilogoByDate");
      const riepilogoRevenue = riepilogo.normalized.grossTotal / 100;
      if (Math.abs(riepilogoRevenue - payload.revenueTotal) > 0.01) {
        payload.warnings.push(
          `Validazione riepilogo: emissioni ${payload.revenueTotal.toFixed(2)} vs riepilogo ${riepilogoRevenue.toFixed(2)}`
        );
      }
      payload.sources.push("/riepilogogiornaliero/date/data/{data}");
    } catch (error) {
      payload.warnings.push(
        isTickaNotFoundError(error) ? "Riepilogo endpoint path non verificato" : "Riepilogo endpoint failed"
      );
    }

    return NextResponse.json({
      success: true,
      requestedDate: dateInfo.requestedDate,
      effectiveDate: dateInfo.effectiveDate,
      hasRealData: payload.hasRealData,
      payload,
      metadata: {
        dateInfo,
        searchAttempts: dateInfo.attempts,
        dataSources: payload.sources,
        lastUpdated: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore interno del server";

    return NextResponse.json(
      {
        success: false,
        error: isTickaNotFoundError(error) ? `${message} (path non verificato)` : message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
