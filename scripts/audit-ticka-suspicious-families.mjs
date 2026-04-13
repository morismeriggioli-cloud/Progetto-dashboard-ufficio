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

function round(value) {
  return Number(value.toFixed(2));
}

function isSubscription(row) {
  return String(row.specieEmissione || "").toUpperCase().includes("ABBONAMENTO");
}

function isOpenSubscription(row) {
  return String(row.specieEmissione || "").toUpperCase().includes("OPEN");
}

function getSubscriptionDivisor(row) {
  return row.subscriptionEventsCount > 0 ? row.subscriptionEventsCount : 1;
}

function getRateoEmissionAmount(row) {
  if (!isSubscription(row)) {
    return row.price;
  }

  if (isOpenSubscription(row)) {
    return row.price;
  }

  return row.rateoAmount > 0 ? row.rateoAmount : row.price / getSubscriptionDivisor(row);
}

function getRateoPresaleAmount(row) {
  if (!isSubscription(row)) {
    return row.presale;
  }

  if (isOpenSubscription(row)) {
    return row.presale;
  }

  return row.rateoPresale > 0 ? row.rateoPresale : row.presale / getSubscriptionDivisor(row);
}

function getRateoManagementAmount(row) {
  if (!isSubscription(row)) {
    return row.managementFee;
  }

  return row.managementFee / getSubscriptionDivisor(row);
}

function isInternalOpenFlow(row, transaction) {
  if (!isOpenSubscription(row)) {
    return false;
  }

  const richiedente = transaction?.codiceRichiedenteEmissioneSigillo ?? "";
  const causale = transaction?.causale ?? "";
  const hasZeroEconomicValue =
    row.price <= 0 &&
    row.presale <= 0 &&
    row.managementFee <= 0 &&
    row.commissionAmount <= 0 &&
    row.rateoAmount <= 0 &&
    row.rateoPresale <= 0;

  return (
    richiedente !== "CW000001" ||
    /PASS|ESPOSITOR|FLYER|INVITO|SERVIZIO/i.test(causale) ||
    (hasZeroEconomicValue && /GENERICO/i.test(causale))
  );
}

function buildStandardSubscriptionAdjustment(rows) {
  const groups = new Map();

  for (const row of rows) {
    if (row.isCancelled || !row.orderNumber || !isSubscription(row) || isOpenSubscription(row)) {
      continue;
    }

    const key = row.cardProgressive || row.seal || row.titleId || row.orderNumber;
    const current = groups.get(key) ?? {
      rows: 0,
      organizer: row.organizer,
      reductionLabel: row.reductionLabel,
      specieEmissione: row.specieEmissione,
      priceCurrent: 0,
      presaleCurrent: 0,
      managementCurrent: 0,
    };

    current.rows += 1;
    current.priceCurrent += getRateoEmissionAmount(row);
    current.presaleCurrent += getRateoPresaleAmount(row);
    current.managementCurrent += getRateoManagementAmount(row);
    groups.set(key, current);
  }

  const values = Array.from(groups.values()).map((group) => ({
    ...group,
    priceCurrent: round(group.priceCurrent),
    presaleCurrent: round(group.presaleCurrent),
    managementCurrent: round(group.managementCurrent),
  }));

  if (values.length !== 3) {
    return null;
  }

  const [first] = values;
  const applies = values.every(
    (group) =>
      group.specieEmissione === "RATEO ABBONAMENTO" &&
      group.organizer === first.organizer &&
      group.reductionLabel === first.reductionLabel &&
      group.priceCurrent === first.priceCurrent &&
      group.presaleCurrent === first.presaleCurrent &&
      group.managementCurrent === first.managementCurrent &&
      group.rows >= 5
  );

  if (!applies) {
    return null;
  }

  return {
    extraEmissioni: first.priceCurrent,
    extraPrevendita: first.presaleCurrent,
    extraGestione: first.managementCurrent,
  };
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

  const rows = data.payload.debug.raw.emissioniRows || [];
  const transazioni = data.payload.debug.raw.transazioniRows || [];
  const transactionMap = new Map(transazioni.map((row) => [row.progressivo, row]));

  const internalOpenRows = rows.filter(
    (row) => !row.isCancelled && row.orderNumber && isInternalOpenFlow(row, transactionMap.get(row.cardProgressive))
  );
  const standardSubscriptionAdjustment = buildStandardSubscriptionAdjustment(rows);

  return {
    date,
    summary: data.payload.summary,
    suspiciousFamilies: {
      internalOpen: {
        rows: internalOpenRows.length,
        emissioni: round(internalOpenRows.reduce((sum, row) => sum + row.price, 0)),
        prevendita: round(internalOpenRows.reduce((sum, row) => sum + row.presale, 0)),
        gestione: round(internalOpenRows.reduce((sum, row) => sum + row.managementFee, 0)),
      },
      standardSubscriptionAdjustment,
    },
  };
}

async function main() {
  const [from, toArg] = process.argv.slice(2);
  const to = toArg || from;

  if (!from || !to) {
    console.error("Usage: node scripts/audit-ticka-suspicious-families.mjs YYYY-MM-DD [YYYY-MM-DD]");
    process.exit(1);
  }

  const dates = listDates(from, to);
  const results = [];

  for (const date of dates) {
    results.push(await analyzeDay(date));
  }

  console.log(
    JSON.stringify(
      {
        baseUrl,
        from,
        to,
        totalDays: results.length,
        results,
      },
      null,
      2
    )
  );
}

await main();
