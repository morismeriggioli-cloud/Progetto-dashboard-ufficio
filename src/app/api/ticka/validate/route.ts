import { NextResponse } from "next/server";
import {
  validateKpiForDateRange,
  validateKpiForMonth,
  validateKpiForYears,
  validateKpiForYear,
  generateValidationReport,
} from "@/lib/ticka-kpi-validator";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const yearsParam = searchParams.get("years");
    const monthParam = searchParams.get("month");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const format = searchParams.get("format");

    // Se non sono specificati parametri, valida l'anno corrente
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    let results;

    if (yearsParam) {
      const years = yearsParam
        .split(",")
        .map((value) => parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value));

      if (years.length === 0 || years.some((year) => year < 2020 || year > 2030)) {
        return NextResponse.json(
          {
            success: false,
            error: "Parametro years non valido (usa una lista tipo 2025,2024,2023,2022)",
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }

      results = await validateKpiForYears(years);

    } else if (fromParam || toParam) {
      const from = fromParam ?? toParam;
      const to = toParam ?? fromParam;

      if (!from || !to) {
        return NextResponse.json(
          {
            success: false,
            error: "Impossibile risolvere il range richiesto",
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }

      results = await validateKpiForDateRange(from, to);

    } else if (yearParam && monthParam) {
      // Validazione per un mese specifico
      const year = parseInt(yearParam, 10);
      const month = parseInt(monthParam, 10);
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return NextResponse.json(
          {
            success: false,
            error: "Parametri year e month non validi",
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }

      const result = await validateKpiForMonth(year, month);
      results = [result];

    } else if (yearParam) {
      // Validazione per un anno intero
      const year = parseInt(yearParam, 10);
      
      if (isNaN(year) || year < 2020 || year > 2030) {
        return NextResponse.json(
          {
            success: false,
            error: "Parametro year non valido (deve essere tra 2020 e 2030)",
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }

      results = await validateKpiForYear(year);

    } else {
      // Validazione per il mese corrente
      const result = await validateKpiForMonth(currentYear, currentMonth);
      results = [result];
    }

    // Se richiesto il formato testo, genera il report
    if (format === "text") {
      const report = generateValidationReport(results);
      
      return new NextResponse(report, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="kpi-validation-report-${new Date().toISOString().slice(0, 10)}.txt"`,
        },
      });
    }

    // Calcola statistiche aggregate
    const totalKpi = results.reduce((sum, r) => sum + r.summary.totalKpi, 0);
    const totalSuccess = results.reduce((sum, r) => sum + r.summary.successfulKpi, 0);
    const totalWarning = results.reduce((sum, r) => sum + r.summary.warningKpi, 0);
    const totalError = results.reduce((sum, r) => sum + r.summary.errorKpi, 0);

    const overallStatus = totalError > 0 ? "error" : totalWarning > 0 ? "warning" : "success";

    return NextResponse.json({
      success: true,
      data: {
        validationResults: results,
        summary: {
          totalMonths: results.length,
          totalKpi,
          totalSuccess,
          totalWarning,
          totalError,
          overallStatus,
          successRate: totalKpi > 0 ? Math.round((totalSuccess / totalKpi) * 100) : 0,
        },
        metadata: {
          validatedAt: new Date().toISOString(),
          currentYear,
          currentMonth,
        },
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("[api/validate] Error:", error);
    
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
