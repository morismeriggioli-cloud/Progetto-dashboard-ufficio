const baseUrl = process.env.TICKA_AUDIT_BASE_URL || "http://localhost:3000";

function monthRange(year, monthIndex) {
  const month = String(monthIndex + 1).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

function getMonths(fromYear, toYear) {
  const months = [];

  for (let year = fromYear; year <= toYear; year += 1) {
    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      months.push(monthRange(year, monthIndex));
    }
  }

  return months;
}

async function loadMonth(range) {
  const url = `${baseUrl}/api/ticka/dashboard?from=${range.from}&to=${range.to}`;
  const response = await fetch(url);
  const data = await response.json();

  if (!data.success) {
    return {
      ...range,
      ok: false,
      error: data.error || `HTTP ${response.status}`,
    };
  }

  return {
    ...range,
    ok: true,
    hasRealData: data.hasRealData,
    sourceLabel: data.payload?.sourceLabel ?? data.sourceLabel ?? null,
    sourceMode: data.payload?.debug?.dataSource?.sourceMode ?? null,
    ordiniTotali: data.payload?.summary?.ordiniTotali ?? null,
    bigliettiVenduti: data.payload?.summary?.bigliettiVenduti ?? null,
    fatturatoTotale: data.payload?.summary?.fatturatoTotale ?? null,
    revenuePoints: data.revenueSeries?.length ?? 0,
    ticketPoints: data.ticketsSeries?.length ?? 0,
    orderTrendPoints: data.payload?.charts?.andamentoOrdiniNelTempo?.length ?? 0,
    availableEvents: data.availableEvents?.length ?? 0,
  };
}

async function main() {
  const [fromYearRaw = "2025", toYearRaw = "2026"] = process.argv.slice(2);
  const fromYear = Number(fromYearRaw);
  const toYear = Number(toYearRaw);
  const results = [];

  for (const range of getMonths(fromYear, toYear)) {
    results.push(await loadMonth(range));
  }

  const flagged = results.filter(
    (row) =>
      !row.ok ||
      !row.hasRealData ||
      !row.ordiniTotali ||
      row.ordiniTotali <= 0 ||
      row.revenuePoints <= 0 ||
      row.ticketPoints <= 0 ||
      row.orderTrendPoints <= 0
  );

  console.log(
    JSON.stringify(
      {
        baseUrl,
        fromYear,
        toYear,
        totalMonths: results.length,
        flaggedCount: flagged.length,
        flagged,
        results,
      },
      null,
      2
    )
  );

  if (flagged.length > 0) {
    process.exit(1);
  }
}

await main();
