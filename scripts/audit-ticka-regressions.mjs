const baseUrl = process.env.TICKA_AUDIT_BASE_URL || "http://localhost:3000";

const expectations = [
  {
    date: "2026-03-04",
    expected: {
      ordiniTotali: 406,
      totaleEmissioni: 7871.63,
      totalePrevendita: 792.33,
      totaleGestioneAmministrativa: 511.89,
    },
  },
  {
    date: "2026-03-31",
    expected: {
      totalePrevendita: 562.76,
    },
  },
];

function round(value) {
  return Number(value.toFixed(2));
}

async function loadSummary(date) {
  const response = await fetch(`${baseUrl}/api/ticka/dashboard?from=${date}&to=${date}`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || `Errore nel caricamento di ${date}`);
  }

  return data.payload.summary;
}

async function main() {
  const failures = [];
  const results = [];

  for (const { date, expected } of expectations) {
    const summary = await loadSummary(date);
    const checks = Object.entries(expected).map(([key, value]) => {
      const actual = summary[key];
      const matches =
        typeof value === "number" && typeof actual === "number"
          ? round(actual) === round(value)
          : actual === value;

      if (!matches) {
        failures.push({
          date,
          field: key,
          expected: value,
          actual,
        });
      }

      return {
        field: key,
        expected: value,
        actual,
        matches,
      };
    });

    results.push({ date, checks });
  }

  console.log(
    JSON.stringify(
      {
        baseUrl,
        totalChecks: results.reduce((sum, result) => sum + result.checks.length, 0),
        failedChecks: failures.length,
        results,
        failures,
      },
      null,
      2
    )
  );

  if (failures.length > 0) {
    process.exit(1);
  }
}

await main();
