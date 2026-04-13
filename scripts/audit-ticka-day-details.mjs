const baseUrl = process.env.TICKA_AUDIT_BASE_URL || "http://localhost:3000";

function round(value) {
  return Number(value.toFixed(2));
}

function isSubscription(row) {
  return String(row.specieEmissione || "").toUpperCase().includes("ABBONAMENTO");
}

function isOpen(row) {
  return String(row.specieEmissione || "").toUpperCase().includes("OPEN");
}

function getEmissionAmount(row) {
  if (!isSubscription(row)) {
    return row.price;
  }

  if (isOpen(row)) {
    return row.price;
  }

  const divisor = row.subscriptionEventsCount > 0 ? row.subscriptionEventsCount : 1;
  return row.rateoAmount > 0 ? row.rateoAmount : row.price / divisor;
}

function getPresaleAmount(row) {
  if (isOpen(row)) {
    return 0;
  }

  if (!isSubscription(row)) {
    return row.presale;
  }

  const divisor = row.subscriptionEventsCount > 0 ? row.subscriptionEventsCount : 1;
  return row.rateoPresale > 0 ? row.rateoPresale : row.presale / divisor;
}

function buildKey(row, transaction) {
  const partnerId = transaction?.partnerId || "(vuoto)";
  const richiedente = transaction?.codiceRichiedenteEmissioneSigillo || "(vuoto)";
  const causale = transaction?.causale || "(vuoto)";
  const flow = isOpen(row) ? "open" : isSubscription(row) ? "sub" : "ticket";
  return `${partnerId}|${richiedente}|${causale}|${flow}`;
}

async function main() {
  const [date] = process.argv.slice(2);

  if (!date) {
    console.error("Usage: node scripts/audit-ticka-day-details.mjs YYYY-MM-DD");
    process.exit(1);
  }

  const response = await fetch(`${baseUrl}/api/ticka/dashboard?from=${date}&to=${date}&debugRaw=1`);
  const data = await response.json();

  if (!data.success) {
    console.error(data.error || "Unknown error");
    process.exit(1);
  }

  const emissioni = data.payload.debug.raw.emissioniRows;
  const transazioni = data.payload.debug.raw.transazioniRows;
  const transMap = new Map(transazioni.map((row) => [row.progressivo, row]));

  const byEmissionGroup = Object.entries(
    emissioni
      .filter((row) => !row.isCancelled && row.orderNumber)
      .reduce((accumulator, row) => {
        const transaction = transMap.get(row.cardProgressive);
        const key = buildKey(row, transaction);

        accumulator[key] ||= { rows: 0, emissioni: 0, prevendita: 0 };
        accumulator[key].rows += 1;
        accumulator[key].emissioni += getEmissionAmount(row);
        accumulator[key].prevendita += getPresaleAmount(row);
        return accumulator;
      }, {})
  )
    .map(([key, value]) => ({
      key,
      rows: value.rows,
      emissioni: round(value.emissioni),
      prevendita: round(value.prevendita),
    }))
    .sort((left, right) => right.emissioni - left.emissioni);

  const byNoOrderGroup = Object.entries(
    emissioni
      .filter((row) => !row.isCancelled && !row.orderNumber && (row.presale > 0 || row.rateoPresale > 0))
      .reduce((accumulator, row) => {
        const transaction = transMap.get(row.cardProgressive);
        const key = buildKey(row, transaction);

        accumulator[key] ||= { rows: 0, prevendita: 0 };
        accumulator[key].rows += 1;
        accumulator[key].prevendita += row.presale + row.rateoPresale;
        return accumulator;
      }, {})
  )
    .map(([key, value]) => ({
      key,
      rows: value.rows,
      prevendita: round(value.prevendita),
    }))
    .sort((left, right) => right.prevendita - left.prevendita);

  console.log(
    JSON.stringify(
      {
        date,
        summary: data.payload.summary,
        topEmissionGroups: byEmissionGroup.slice(0, 40),
        topNoOrderGroups: byNoOrderGroup.slice(0, 40),
      },
      null,
      2
    )
  );
}

await main();
