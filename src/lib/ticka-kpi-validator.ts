import "server-only";

import { buildTickaDashboardRange } from "@/lib/ticka-metric-formulas";

type ValidationResult = {
  periodType: "day" | "month" | "year";
  periodStart: string;
  periodEnd: string;
  month: string;
  year: string;
  day: string | null;
  kpiResults: Record<string, {
    status: "success" | "warning" | "error";
    value: number | null;
    message: string;
    name: string;
  }>;
  overallStatus: "success" | "warning" | "error";
  summary: {
    totalKpi: number;
    successfulKpi: number;
    warningKpi: number;
    errorKpi: number;
  };
};

export type KpiValidationResult = ValidationResult;

type KpiValidationRule = {
  key: string;
  name: string;
  validator: (value: number | null, context: { month: string; year: string }) => {
    status: "success" | "warning" | "error";
    message: string;
  };
};

const KPI_VALIDATION_RULES: KpiValidationRule[] = [
  {
    key: "fatturatoTotale",
    name: "Fatturato Totale",
    validator: (value) => {
      if (value === null || value === 0) {
        return {
          status: "error",
          message: "Fatturato totale non disponibile o zero - possibile problema con i dati"
        };
      }
      if (value < 1000) {
        return {
          status: "warning",
          message: `Fatturato totale basso (${value} EUR) - verificare correttezza dati`
        };
      }
      return {
        status: "success",
        message: `Fatturato totale valido (${value} EUR)`
      };
    }
  },
  {
    key: "bigliettiEmessi",
    name: "Biglietti Emessi",
    validator: (value) => {
      if (value === null || value === 0) {
        return {
          status: "error",
          message: "Biglietti emessi non disponibili - possibile problema con i dati"
        };
      }
      if (value < 10) {
        return {
          status: "warning",
          message: `Biglietti emessi molto bassi (${value}) - verificare correttezza dati`
        };
      }
      return {
        status: "success",
        message: `Biglietti emessi validi (${value})`
      };
    }
  },
  {
    key: "prevendita",
    name: "Prevendita",
    validator: (value) => {
      if (value === null) {
        return {
          status: "warning",
          message: "Prevendita non disponibile - potrebbe essere normale per alcuni periodi"
        };
      }
      return {
        status: "success",
        message: `Prevendita valida (${value} EUR)`
      };
    }
  },
  {
    key: "gestioneAmministrativa",
    name: "Gestione Amministrativa",
    validator: (value) => {
      if (value === null) {
        return {
          status: "warning",
          message: "Gestione amministrativa non disponibile - potrebbe essere normale per alcuni periodi"
        };
      }
      return {
        status: "success",
        message: `Gestione amministrativa valida (${value} EUR)`
      };
    }
  },
  {
    key: "fido",
    name: "Fido",
    validator: (value) => {
      if (value === null || value === 0) {
        return {
          status: "warning",
          message: "Fido non disponibile o zero - potrebbe essere normale per alcuni periodi"
        };
      }
      return {
        status: "success",
        message: `Fido valido (${value} EUR)`
      };
    }
  },
  {
    key: "annulli",
    name: "Annulli",
    validator: (value) => {
      if (value === null) {
        return {
          status: "warning",
          message: "Annulli non disponibili - potrebbe essere normale per alcuni periodi"
        };
      }
      if (value > 100) {
        return {
          status: "warning",
          message: `Annulli elevati (${value}) - verificare se è normale per questo periodo`
        };
      }
      return {
        status: "success",
        message: `Annulli validi (${value})`
      };
    }
  },
  {
    key: "giftCard",
    name: "Gift Card",
    validator: (value) => {
      if (value === null || value === 0) {
        return {
          status: "warning",
          message: "Gift card non disponibili o zero - potrebbe essere normale per alcuni periodi"
        };
      }
      return {
        status: "success",
        message: `Gift card valide (${value} EUR)`
      };
    }
  },
  {
    key: "cartaCultura",
    name: "Carta Cultura",
    validator: (value) => {
      if (value === null || value === 0) {
        return {
          status: "warning",
          message: "Carta cultura non disponibile o zero - potrebbe essere normale per alcuni periodi"
        };
      }
      return {
        status: "success",
        message: `Carta cultura valida (${value} EUR)`
      };
    }
  },
  {
    key: "cartaDocente",
    name: "Carta Docente",
    validator: (value) => {
      if (value === null || value === 0) {
        return {
          status: "warning",
          message: "Carta docente non disponibile o zero - potrebbe essere normale per alcuni periodi"
        };
      }
      return {
        status: "success",
        message: `Carta docente valida (${value} EUR)`
      };
    }
  },
  {
    key: "overCommission",
    name: "Over Commission",
    validator: (value) => {
      if (value === null) {
        return {
          status: "warning",
          message: "Over commission non disponibili - potrebbe essere normale per alcuni periodi"
        };
      }
      return {
        status: "success",
        message: `Over commission valide (${value} EUR)`
      };
    }
  }
];

function assertIsoDate(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} deve essere nel formato YYYY-MM-DD.`);
  }
}

function listDatesInRange(from: string, to: string) {
  assertIsoDate(from, "from");
  assertIsoDate(to, "to");

  if (from > to) {
    throw new Error("La data iniziale non puo' essere successiva alla data finale.");
  }

  const dates: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

async function validateKpiForPeriod(from: string, to: string, periodType: "day" | "month" | "year"): Promise<ValidationResult> {
  const [yearStr, monthStr, dayStr] = from.split("-");
  const periodKey = from === to ? from : `${from}:${to}`;

  console.log(`[kpi-validator] Validating KPI for ${periodKey}`, {
    year: yearStr,
    month: monthStr,
    day: periodType === "day" ? dayStr : null,
    from,
    to,
  });

  try {
    const result = await buildTickaDashboardRange(from, to);

    const kpiResults: ValidationResult["kpiResults"] = {};
    let successCount = 0;
    let warningCount = 0;
    let errorCount = 0;

    for (const rule of KPI_VALIDATION_RULES) {
      const kpiValue = result.payload[rule.key];
      const validation = rule.validator(kpiValue?.value ?? null, {
        month: monthStr,
        year: yearStr,
      });

      kpiResults[rule.key] = {
        status: validation.status,
        value: kpiValue?.value ?? null,
        message: validation.message,
        name: rule.name
      };

      switch (validation.status) {
        case "success":
          successCount++;
          break;
        case "warning":
          warningCount++;
          break;
        case "error":
          errorCount++;
          break;
      }
    }

    const overallStatus = errorCount > 0 ? "error" : warningCount > 0 ? "warning" : "success";

    return {
      periodType,
      periodStart: from,
      periodEnd: to,
      month: monthStr,
      year: yearStr,
      day: periodType === "day" ? dayStr : null,
      kpiResults,
      overallStatus,
      summary: {
        totalKpi: KPI_VALIDATION_RULES.length,
        successfulKpi: successCount,
        warningKpi: warningCount,
        errorKpi: errorCount
      }
    };

  } catch (error) {
    console.error(`[kpi-validator] Error validating KPI for ${periodKey}:`, error);

    const errorResults: ValidationResult["kpiResults"] = {};
    for (const rule of KPI_VALIDATION_RULES) {
      errorResults[rule.key] = {
        status: "error",
        value: null,
        message: `Errore durante il recupero dati: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
        name: rule.name
      };
    }

    return {
      periodType,
      periodStart: from,
      periodEnd: to,
      month: monthStr,
      year: yearStr,
      day: periodType === "day" ? dayStr : null,
      kpiResults: errorResults,
      overallStatus: "error",
      summary: {
        totalKpi: KPI_VALIDATION_RULES.length,
        successfulKpi: 0,
        warningKpi: 0,
        errorKpi: KPI_VALIDATION_RULES.length
      }
    };
  }
}

export async function validateKpiForDay(date: string): Promise<ValidationResult> {
  assertIsoDate(date, "date");
  return validateKpiForPeriod(date, date, "day");
}

export async function validateKpiForMonth(year: number, month: number): Promise<ValidationResult> {
  const monthStr = month.toString().padStart(2, "0");
  const yearStr = year.toString();
  const firstDay = `${yearStr}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).toISOString().slice(0, 10);

  return validateKpiForPeriod(firstDay, lastDay, "month");
}

export async function validateKpiForYear(year: number): Promise<ValidationResult[]> {
  const yearStr = year.toString();
  const result = await validateKpiForPeriod(`${yearStr}-01-01`, `${yearStr}-12-31`, "year");
  return [result];
}

export async function validateKpiForYears(years: number[]): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  for (const year of years) {
    results.push(...(await validateKpiForYear(year)));
  }

  return results;
}

export async function validateKpiForDateRange(from: string, to: string): Promise<ValidationResult[]> {
  const dates = listDatesInRange(from, to);
  const results: ValidationResult[] = [];

  for (const date of dates) {
    results.push(await validateKpiForDay(date));
  }

  return results;
}

export function generateValidationReport(results: ValidationResult[]): string {
  const report = [
    "# REPORT VALIDAZIONE KPI TICKA",
    `Generato il: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "## RIEPILOGO GENERALE",
    `Periodi validati: ${results.length}`,
    `Status complessivo: ${results.every(r => r.overallStatus === "success") ? "SUCCESS" : results.some(r => r.overallStatus === "error") ? "ERROR" : "WARNING"}`,
    "",
    "## DETTAGLIO",
    ""
  ];

  for (const result of results) {
    const periodLabel =
      result.periodType === "day"
        ? result.periodStart
        : result.periodType === "year"
          ? result.year
          : `${result.year}-${result.month}`;
    report.push(`### ${periodLabel} - Status: ${result.overallStatus.toUpperCase()}`);
    report.push(`- KPI totali: ${result.summary.totalKpi}`);
    report.push(`- Success: ${result.summary.successfulKpi}`);
    report.push(`- Warning: ${result.summary.warningKpi}`);
    report.push(`- Error: ${result.summary.errorKpi}`);
    report.push("");

    for (const kpi of Object.values(result.kpiResults)) {
      const statusIcon = kpi.status === "success" ? "OK" : kpi.status === "warning" ? "WARN" : "ERR";
      report.push(`  - ${kpi.name}: ${statusIcon} - ${kpi.message}`);
    }
    report.push("");
  }

  return report.join("\n");
}
