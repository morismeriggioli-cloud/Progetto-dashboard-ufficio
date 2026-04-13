import { NextResponse } from "next/server";
import { buildTickaDashboardRange } from "@/lib/ticka-metric-formulas";
import type { TickaEmissioneNormalizedRow } from "@/lib/ticka-emissioni";

export const dynamic = "force-dynamic";

function round(value: number) {
  return Number(value.toFixed(2));
}

function parseDateParam(value: string | null) {
  if (!value) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("I parametri from/to devono essere nel formato YYYY-MM-DD.");
  }

  return value;
}

function listDatesInRange(from: string, to: string) {
  const dates: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function resolveRange(request: Request) {
  const { searchParams } = new URL(request.url);
  const fromParam = parseDateParam(searchParams.get("from"));
  const toParam = parseDateParam(searchParams.get("to"));

  if (!fromParam && !toParam) {
    throw new Error("Specifica almeno un parametro from oppure to.");
  }

  const from = fromParam ?? toParam;
  const to = toParam ?? fromParam;

  if (!from || !to) {
    throw new Error("Impossibile risolvere il range richiesto.");
  }

  if (from > to) {
    throw new Error("Il parametro from non puo' essere successivo a to.");
  }

  const dates = listDatesInRange(from, to);
  if (dates.length > 366) {
    throw new Error("Il range richiesto e' troppo ampio. Usa un intervallo massimo di 366 giorni.");
  }

  return { from, to, dates };
}

function isStandardSubscriptionRow(row: TickaEmissioneNormalizedRow) {
  const specieEmissione = row.specieEmissione.toUpperCase();
  return !row.isCancelled && row.orderNumber && specieEmissione.includes("ABBONAMENTO") && !specieEmissione.includes("OPEN");
}

function getSubscriptionCountKey(row: TickaEmissioneNormalizedRow) {
  return row.cardProgressive || row.seal || row.titleId || row.orderNumber;
}

function getSubscriptionDivisor(row: TickaEmissioneNormalizedRow) {
  return row.subscriptionEventsCount > 0 ? row.subscriptionEventsCount : 1;
}

function getCurrentEmissionAmount(row: TickaEmissioneNormalizedRow) {
  return row.rateoAmount > 0 ? row.rateoAmount : row.price / getSubscriptionDivisor(row);
}

function getCurrentPresaleAmount(row: TickaEmissioneNormalizedRow) {
  return row.rateoPresale > 0 ? row.rateoPresale : row.presale / getSubscriptionDivisor(row);
}

function getCurrentManagementAmount(row: TickaEmissioneNormalizedRow) {
  return row.managementFee / getSubscriptionDivisor(row);
}

type SubscriptionGroup = {
  key: string;
  orderNumber: string;
  titleId: string;
  cardProgressive: string;
  seal: string;
  rows: number;
  specieEmissione: string;
  reductionLabel: string;
  organizer: string;
  emissionDate: string;
  firstEmissionDateTime: string;
  eventIds: string[];
  eventDates: string[];
  eventNames: string[];
  priceFull: number;
  priceCurrent: number;
  presaleFull: number;
  presaleCurrent: number;
  managementFull: number;
  managementCurrent: number;
};

type StandardUnitProfile = {
  priceCurrent: number;
  presaleCurrent: number;
  managementCurrent: number;
  priceFull: number;
  presaleFull: number;
  managementFull: number;
};

function buildGroups(rows: TickaEmissioneNormalizedRow[]) {
  const map = new Map<string, SubscriptionGroup>();

  rows.forEach((row) => {
    const key = getSubscriptionCountKey(row);
    const current = map.get(key) ?? {
      key,
      orderNumber: row.orderNumber,
      titleId: row.titleId,
      cardProgressive: row.cardProgressive,
      seal: row.seal,
      rows: 0,
      specieEmissione: row.specieEmissione,
      reductionLabel: row.reductionLabel,
      organizer: row.organizer,
      emissionDate: row.emissionDate,
      firstEmissionDateTime: row.emissionDateTime,
      eventIds: [],
      eventDates: [],
      eventNames: [],
      priceFull: 0,
      priceCurrent: 0,
      presaleFull: 0,
      presaleCurrent: 0,
      managementFull: 0,
      managementCurrent: 0,
    };

    current.rows += 1;
    current.firstEmissionDateTime =
      !current.firstEmissionDateTime || row.emissionDateTime < current.firstEmissionDateTime
        ? row.emissionDateTime
        : current.firstEmissionDateTime;
    current.priceFull += row.price;
    current.priceCurrent += getCurrentEmissionAmount(row);
    current.presaleFull += row.presale;
    current.presaleCurrent += getCurrentPresaleAmount(row);
    current.managementFull += row.managementFee;
    current.managementCurrent += getCurrentManagementAmount(row);

    if (row.eventId && !current.eventIds.includes(row.eventId)) {
      current.eventIds.push(row.eventId);
    }

    if (row.eventDate && !current.eventDates.includes(row.eventDate)) {
      current.eventDates.push(row.eventDate);
    }

    if (row.eventName && !current.eventNames.includes(row.eventName)) {
      current.eventNames.push(row.eventName);
    }

    map.set(key, current);
  });

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      priceFull: round(group.priceFull),
      priceCurrent: round(group.priceCurrent),
      presaleFull: round(group.presaleFull),
      presaleCurrent: round(group.presaleCurrent),
      managementFull: round(group.managementFull),
      managementCurrent: round(group.managementCurrent),
    }))
    .sort((left, right) => left.firstEmissionDateTime.localeCompare(right.firstEmissionDateTime));
}

function buildUniformProfile(groups: SubscriptionGroup[]): StandardUnitProfile | null {
  if (groups.length === 0) {
    return null;
  }

  const [first] = groups;
  const isUniform = groups.every(
    (group) =>
      group.priceCurrent === first.priceCurrent &&
      group.presaleCurrent === first.presaleCurrent &&
      group.managementCurrent === first.managementCurrent &&
      group.priceFull === first.priceFull &&
      group.presaleFull === first.presaleFull &&
      group.managementFull === first.managementFull
  );

  if (!isUniform) {
    return null;
  }

  return {
    priceCurrent: first.priceCurrent,
    presaleCurrent: first.presaleCurrent,
    managementCurrent: first.managementCurrent,
    priceFull: first.priceFull,
    presaleFull: first.presaleFull,
    managementFull: first.managementFull,
  };
}

export async function GET(request: Request) {
  try {
    const { from, to, dates } = resolveRange(request);
    const results = [];

    for (const date of dates) {
      const result = await buildTickaDashboardRange(date, date);
      const rows = result.dailySnapshots
        .flatMap((snapshot) => snapshot.emissioni.data?.rows ?? [])
        .filter(isStandardSubscriptionRow);
      const groups = buildGroups(rows);
      const uniformProfile = buildUniformProfile(groups);

      results.push({
        date,
        summary: {
          abbonamentiVenduti: result.summary.abbonamentiVenduti,
          standardSubscriptionDistinctKeys: result.ordersView.debug.standardSubscriptionDistinctKeys,
          groupedSubscriptions: groups.length,
          totalRows: rows.length,
          totaleEmissioniCurrent: round(groups.reduce((sum, group) => sum + group.priceCurrent, 0)),
          totalePrevenditaCurrent: round(groups.reduce((sum, group) => sum + group.presaleCurrent, 0)),
          totaleGestioneCurrent: round(groups.reduce((sum, group) => sum + group.managementCurrent, 0)),
          totaleEmissioniFull: round(groups.reduce((sum, group) => sum + group.priceFull, 0)),
          totalePrevenditaFull: round(groups.reduce((sum, group) => sum + group.presaleFull, 0)),
          totaleGestioneFull: round(groups.reduce((sum, group) => sum + group.managementFull, 0)),
          hasUniformProfile: uniformProfile !== null,
          uniformProfile,
        },
        groups,
      });
    }

    return NextResponse.json({
      success: true,
      from,
      to,
      totalDays: results.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
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
