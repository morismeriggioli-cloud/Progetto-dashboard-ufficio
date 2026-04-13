const baseUrl = process.env.TICKA_AUDIT_BASE_URL || "http://localhost:3000";

function listDates(from, to) {
  const dates = [];
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);

  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    dates.push(cursor.toISOString().slice(0, 10));
  }

  return dates;
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}

function isInternalOpenFlow(row, transMap) {
  if (!String(row.specieEmissione || "").toUpperCase().includes("OPEN")) {
    return false;
  }

  const transaction = transMap.get(row.cardProgressive);
  const richiedente = transaction?.codiceRichiedenteEmissioneSigillo ?? "";
  const causale = transaction?.causale ?? "";
  return richiedente !== "CW000001" || /PASS|ESPOSITOR|FLYER|INVITO/i.test(causale);
}

async function analyzeDay(date) {
  const response = await fetch(`${baseUrl}/api/ticka/dashboard?from=${date}&to=${date}&debugRaw=1`);
  const data = await response.json();

  if (!data.success) {
    return {
      date,
      error: data.error || "Unknown error",
    };
  }

  const emissioni = data.payload.debug.raw.emissioniRows;
  const transazioni = data.payload.debug.raw.transazioniRows;
  const transMap = new Map(transazioni.map((row) => [row.progressivo, row]));
  const noOrderRows = emissioni.filter(
    (row) => !row.isCancelled && !row.orderNumber && (row.presale > 0 || row.rateoPresale > 0)
  );
  const noOrderTotal = noOrderRows.reduce((sum, row) => sum + row.presale + row.rateoPresale, 0);
  const internalOpenCount = emissioni.filter(
    (row) => !row.isCancelled && row.orderNumber && isInternalOpenFlow(row, transMap)
  ).length;

  return {
    date,
    ordiniTotali: data.payload.summary.ordiniTotali,
    abbonamentiOpenVenduti: data.payload.summary.abbonamentiOpenVenduti,
    totaleEmissioni: data.payload.summary.totaleEmissioni,
    totalePrevendita: data.payload.summary.totalePrevendita,
    fatturatoTotale: data.payload.summary.fatturatoTotale,
    noOrderCount: noOrderRows.length,
    noOrderTotal: Number(noOrderTotal.toFixed(2)),
    internalOpenCount,
    flagged:
      noOrderTotal > 50 ||
      internalOpenCount > 50 ||
      data.payload.summary.abbonamentiOpenVenduti > 20,
  };
}

async function main() {
  const [from, to] = process.argv.slice(2);

  if (!from || !to) {
    console.error("Usage: node scripts/audit-ticka-anomalies.mjs YYYY-MM-DD YYYY-MM-DD");
    process.exit(1);
  }

  const dates = listDates(from, to);
  const results = await mapWithConcurrency(dates, 4, (date) => analyzeDay(date));
  const flagged = results.filter((row) => row.flagged || row.error);

  console.log(
    JSON.stringify(
      {
        from,
        to,
        totalDays: results.length,
        flaggedCount: flagged.length,
        flagged,
      },
      null,
      2
    )
  );
}

await main();
