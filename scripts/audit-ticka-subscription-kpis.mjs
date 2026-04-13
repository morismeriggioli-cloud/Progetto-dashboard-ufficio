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

function getTitleCategory(row) {
  const specieEmissione = String(row.specieEmissione || "").toUpperCase();

  if (specieEmissione.includes("OPEN")) {
    return "subscription_open";
  }

  if (specieEmissione.includes("ABBONAMENTO")) {
    return "subscription";
  }

  if (specieEmissione.includes("BIGLIETTO")) {
    return "ticket";
  }

  return "other";
}

async function analyzeDay(date) {
  const response = await fetch(`${baseUrl}/api/ticka/dashboard?from=${date}&to=${date}&debugRaw=1`);
  const data = await response.json();

  if (!data.success) {
    return { date, error: data.error || "Unknown error" };
  }

  const rows = data.payload.debug.raw.emissioniRows || [];
  const activeRows = rows.filter((row) => !row.isCancelled);
  const categories = {
    ticket: { withOrder: 0, withoutOrder: 0 },
    subscription: { withOrder: 0, withoutOrder: 0 },
    subscription_open: { withOrder: 0, withoutOrder: 0 },
    other: { withOrder: 0, withoutOrder: 0 },
  };

  for (const row of activeRows) {
    const category = getTitleCategory(row);
    const bucket = row.orderNumber ? "withOrder" : "withoutOrder";
    categories[category][bucket] += 1;
  }

  return {
    date,
    summary: data.payload.summary,
    categories,
    debug: data.payload.debug?.orders ?? null,
  };
}

async function main() {
  const [from, toArg] = process.argv.slice(2);
  const to = toArg || from;

  if (!from || !to) {
    console.error("Usage: node scripts/audit-ticka-subscription-kpis.mjs YYYY-MM-DD [YYYY-MM-DD]");
    process.exit(1);
  }

  const dates = listDates(from, to);
  const results = await mapWithConcurrency(dates, 4, (date) => analyzeDay(date));

  console.log(JSON.stringify({ from, to, totalDays: results.length, results }, null, 2));
}

await main();
