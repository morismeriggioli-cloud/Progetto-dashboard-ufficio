import "server-only";

import type { TickaEmissioneNormalizedRow } from "@/lib/ticka-emissioni";
import {
  getEmissioneTitleCategory,
  isOpenSubscriptionCategory,
  isSubscriptionCategory,
} from "@/lib/ticka-title-classification";
import { isBackofficeExcludedEmissione } from "@/lib/ticka/reconciliation-rules";
import type { TickaTransazioneNormalizedRow } from "@/lib/ticka-transazioni";

export type TickaOrderStatus = "COMPLETATO" | "PARZIALMENTE ANNULLATO" | "ANNULLATO";

export type TickaOrderRow = {
  orderId: string;
  eventId: string;
  eventName: string;
  orderDate: string;
  eventDate: string;
  ticketsCount: number;
  subscriptionsCount: number;
  amountTotal: number;
  sectorLabel: string;
  status: TickaOrderStatus;
  venueName: string;
  city: string;
  province: string;
  cancelledLines: number;
  activeLines: number;
};

export type TickaOrdersSummary = {
  ordiniTotali: number;
  bigliettiVenduti: number;
  abbonamentiVenduti: number;
  abbonamentiOpenVenduti: number;
  totaleEmissioni: number;
  totalePrevendita: number;
  totaleGestioneAmministrativa: number;
  totaleCommissioni: number;
  fatturatoTotale: number;
  valoreMedioOrdine: number | null;
  ticketMediPerOrdine: number | null;
};

export type TickaOrdersTrendPoint = {
  date: string;
  ordersCount: number;
};

export type TickaOrdersByEventPoint = {
  eventId: string;
  eventName: string;
  ordersCount: number;
};

export type TickaOrdersView = {
  summary: TickaOrdersSummary;
  andamentoOrdiniNelTempo: TickaOrdersTrendPoint[];
  ordiniPerEvento: TickaOrdersByEventPoint[];
  rows: TickaOrderRow[];
  total: number;
  availableEvents: Array<{ eventId: string; eventName: string }>;
  debug: {
    sourceLabel: string;
    rawRowCount: number;
    rowsWithOrderId: number;
    rowsInAccountingRange: number;
    groupedOrderCount: number;
    filteredRowCount: number;
    selectedEventId: string | null;
    ignoredRowsWithoutOrderId: number;
    ticketRowsWithOrder: number;
    subscriptionRowsWithOrder: number;
    openSubscriptionRowsWithOrder: number;
    openSubscriptionRowsWithoutOrder: number;
    standardSubscriptionDistinctKeys: number;
  };
};

type TickaOrderAccumulator = Omit<TickaOrderRow, "amountTotal"> & {
  amountTotal: number;
  subscriptionKeys: Set<string>;
};

function round(value: number) {
  return Number(value.toFixed(2));
}

function buildSectorLabel(row: TickaEmissioneNormalizedRow) {
  return [row.sectorCode, row.sectorSiae].filter(Boolean).join(" · ");
}

function buildOrderStatus(activeLines: number, cancelledLines: number): TickaOrderStatus {
  if (activeLines === 0 && cancelledLines > 0) {
    return "ANNULLATO";
  }

  if (activeLines > 0 && cancelledLines > 0) {
    return "PARZIALMENTE ANNULLATO";
  }

  return "COMPLETATO";
}

function isSubscriptionRateRow(row: TickaEmissioneNormalizedRow) {
  return isSubscriptionCategory(getEmissioneTitleCategory(row));
}

function isOpenSubscriptionRow(row: TickaEmissioneNormalizedRow) {
  return isOpenSubscriptionCategory(getEmissioneTitleCategory(row));
}

function getSubscriptionDivisor(row: TickaEmissioneNormalizedRow) {
  return row.subscriptionEventsCount > 0 ? row.subscriptionEventsCount : 1;
}

function getEmissionAmount(row: TickaEmissioneNormalizedRow) {
  if (!isSubscriptionRateRow(row)) {
    return row.price;
  }

  return row.rateoAmount > 0 ? row.rateoAmount : row.price / getSubscriptionDivisor(row);
}

function getEmissionKpiAmount(row: TickaEmissioneNormalizedRow) {
  if (!isSubscriptionRateRow(row)) {
    return row.price;
  }

  if (isOpenSubscriptionRow(row)) {
    return row.price;
  }

  return row.rateoAmount > 0 ? row.rateoAmount : row.price / getSubscriptionDivisor(row);
}

function getPresaleAmount(row: TickaEmissioneNormalizedRow) {
  if (isOpenSubscriptionRow(row)) {
    return 0;
  }

  if (!isSubscriptionRateRow(row)) {
    return row.presale;
  }

  return row.rateoPresale > 0 ? row.rateoPresale : row.presale / getSubscriptionDivisor(row);
}

function getManagementFeeAmount(row: TickaEmissioneNormalizedRow) {
  if (!isSubscriptionRateRow(row)) {
    return row.managementFee;
  }

  return row.managementFee / getSubscriptionDivisor(row);
}

function getCommissionAmount(row: TickaEmissioneNormalizedRow) {
  if (!isSubscriptionRateRow(row) || isOpenSubscriptionRow(row)) {
    return row.commissionAmount;
  }

  return row.commissionAmount / getSubscriptionDivisor(row);
}

function isExcludedPresaleRow(
  row: TickaEmissioneNormalizedRow,
  transactionMetaByProgressive?: Map<string, TickaTransazioneNormalizedRow>
) {
  return isBackofficeExcludedEmissione(row, transactionMetaByProgressive?.get(row.cardProgressive));
}

function isCountableSubscriptionRow(row: TickaEmissioneNormalizedRow) {
  if (!isSubscriptionRateRow(row)) {
    return false;
  }

  const hasEconomicValue =
    getEmissionAmount(row) > 0 ||
    getPresaleAmount(row) > 0 ||
    getManagementFeeAmount(row) > 0 ||
    getCommissionAmount(row) > 0;
  const reduction = row.reductionLabel.toLowerCase();
  const isInternalFreeRow = !hasEconomicValue && /(servizio|omaggio|inviti|invito)/i.test(reduction);

  return !isInternalFreeRow;
}

function getSubscriptionSoldCount(row: TickaEmissioneNormalizedRow) {
  return row.ticketCount > 0 ? row.ticketCount : 1;
}

function getSubscriptionCountKey(row: TickaEmissioneNormalizedRow) {
  return row.cardProgressive || row.seal || row.titleId;
}

function matchesSelectedEvent(row: TickaEmissioneNormalizedRow, selectedEventId: string | null) {
  if (!selectedEventId) {
    return true;
  }

  return row.eventId === selectedEventId || row.eventName === selectedEventId;
}

function isCancelledByTransaction(
  row: TickaEmissioneNormalizedRow,
  transactionMetaByProgressive?: Map<string, TickaTransazioneNormalizedRow>
) {
  const transaction = transactionMetaByProgressive?.get(row.cardProgressive);
  return row.isCancelled || transaction?.annullamento === "S";
}

function isRowInBusinessOrderRange(
  row: TickaEmissioneNormalizedRow,
  selectedEventId: string | null,
  fromDate: string | null,
  toDate: string | null,
  transactionMetaByProgressive?: Map<string, TickaTransazioneNormalizedRow>
) {
  const transaction = transactionMetaByProgressive?.get(row.cardProgressive);
  if (
    !row.orderNumber ||
    isCancelledByTransaction(row, transactionMetaByProgressive) ||
    isBackofficeExcludedEmissione(row, transaction)
  ) {
    return false;
  }

  const businessOrderDate = row.businessOrderDate || row.emissionDate;
  if (fromDate && businessOrderDate < fromDate) {
    return false;
  }

  if (toDate && businessOrderDate > toDate) {
    return false;
  }

  if (!matchesSelectedEvent(row, selectedEventId)) {
    return false;
  }

  return true;
}

function isRowInAccountingRange(
  row: TickaEmissioneNormalizedRow,
  selectedEventId: string | null,
  fromDate: string | null,
  toDate: string | null,
  transactionMetaByProgressive?: Map<string, TickaTransazioneNormalizedRow>
) {
  const transaction = transactionMetaByProgressive?.get(row.cardProgressive);
  if (
    !row.orderNumber ||
    isCancelledByTransaction(row, transactionMetaByProgressive) ||
    isBackofficeExcludedEmissione(row, transaction)
  ) {
    return false;
  }

  const accountingDate = row.accountingDate || row.emissionDate;
  if (fromDate && accountingDate < fromDate) {
    return false;
  }

  if (toDate && accountingDate > toDate) {
    return false;
  }

  if (!matchesSelectedEvent(row, selectedEventId)) {
    return false;
  }

  return true;
}

function countSubscriptionsByType(
  rows: TickaEmissioneNormalizedRow[],
  options?: {
    openOnly?: boolean;
    excludeOpen?: boolean;
  }
) {
  const uniqueKeys = new Set<string>();
  let total = 0;

  rows.forEach((row) => {
    if (row.isCancelled) {
      return;
    }

    const isSubscription = isSubscriptionRateRow(row);
    if (!isSubscription) {
      return;
    }

    const isOpen = isOpenSubscriptionRow(row);
    if (options?.openOnly && !isOpen) {
      return;
    }

    if (options?.excludeOpen && isOpen) {
      return;
    }

    if (!isOpen && !isCountableSubscriptionRow(row)) {
      return;
    }

    const subscriptionKey = getSubscriptionCountKey(row);
    if (!subscriptionKey) {
      total += getSubscriptionSoldCount(row);
      return;
    }

    if (!uniqueKeys.has(subscriptionKey)) {
      uniqueKeys.add(subscriptionKey);
      total += 1;
    }
  });

  return round(total);
}

export function buildOrdersView(
  rows: TickaEmissioneNormalizedRow[],
  options?: {
    eventId?: string | null;
    accountingEmissionRows?: TickaEmissioneNormalizedRow[];
    transactionMetaByProgressive?: Map<string, TickaTransazioneNormalizedRow>;
    fromDate?: string | null;
    toDate?: string | null;
    sourceLabel?: string;
    topEventsLimit?: number;
  }
): TickaOrdersView {
  const sourceLabel = options?.sourceLabel ?? "ReportEmissioni JSON";
  const selectedEventId = options?.eventId ?? null;
  const accountingEmissionRows = options?.accountingEmissionRows ?? rows;
  const transactionMetaByProgressive = options?.transactionMetaByProgressive;
  const fromDate = options?.fromDate ?? null;
  const toDate = options?.toDate ?? null;
  const orderRowsSource = fromDate || toDate ? accountingEmissionRows : rows;
  const rowsWithOrderId = orderRowsSource.filter((row) => row.orderNumber);
  const availableEvents = Array.from(
    new Map(
      rowsWithOrderId
        .filter((row) => row.eventId || row.eventName)
        .map((row) => [row.eventId || row.eventName, { eventId: row.eventId, eventName: row.eventName || "Evento senza nome" }])
    ).values()
  ).sort((a, b) => a.eventName.localeCompare(b.eventName, "it"));
  const filteredRows = rowsWithOrderId.filter((row) =>
    isRowInBusinessOrderRange(row, selectedEventId, fromDate, toDate, transactionMetaByProgressive)
  );
  const orderMap = new Map<string, TickaOrderAccumulator>();

  console.log("[ticka-orders] buildOrdersView input", {
    sourceLabel,
    rawRowCount: rows.length,
    rowsWithOrderId: rowsWithOrderId.length,
    selectedEventId,
    filteredRowCount: filteredRows.length,
  });

  filteredRows.forEach((row) => {
    const emissionAmount = getEmissionAmount(row);
    const presaleAmount = getPresaleAmount(row);
    const managementFeeAmount = getManagementFeeAmount(row);
    const commissionAmount = getCommissionAmount(row);
    const amount = emissionAmount + presaleAmount + managementFeeAmount + commissionAmount;
    const current = orderMap.get(row.orderNumber) ?? {
      orderId: row.orderNumber,
      eventId: row.eventId,
      eventName: row.eventName || "Evento non disponibile",
      orderDate: row.businessOrderDate || row.emissionDate,
      eventDate: row.eventDate,
      ticketsCount: 0,
      subscriptionsCount: 0,
      amountTotal: 0,
      sectorLabel: buildSectorLabel(row),
      status: "COMPLETATO",
      venueName: row.venueName,
      city: row.venueCity,
      province: row.venueProvince,
      cancelledLines: 0,
      activeLines: 0,
      subscriptionKeys: new Set<string>(),
    };

    current.eventId = current.eventId || row.eventId;
    current.eventName = current.eventName || row.eventName || "Evento non disponibile";
    current.orderDate =
      !current.orderDate || ((row.businessOrderDate || row.emissionDate) && (row.businessOrderDate || row.emissionDate) < current.orderDate)
        ? (row.businessOrderDate || row.emissionDate)
        : current.orderDate;
    current.eventDate = current.eventDate || row.eventDate;
    current.venueName = current.venueName || row.venueName;
    current.city = current.city || row.venueCity;
    current.province = current.province || row.venueProvince;
    current.sectorLabel = current.sectorLabel || buildSectorLabel(row);

    if (isCancelledByTransaction(row, transactionMetaByProgressive)) {
      current.cancelledLines += 1;
    } else {
      current.activeLines += 1;
      if (isSubscriptionRateRow(row)) {
        if (isCountableSubscriptionRow(row)) {
          const subscriptionKey = getSubscriptionCountKey(row);
          if (!subscriptionKey || isOpenSubscriptionRow(row)) {
            current.subscriptionsCount += getSubscriptionSoldCount(row);
          } else if (!current.subscriptionKeys.has(subscriptionKey)) {
            current.subscriptionKeys.add(subscriptionKey);
            current.subscriptionsCount += 1;
          }
        }
      } else {
        current.ticketsCount += row.ticketCount;
      }
      current.amountTotal += amount;
    }

    current.status = buildOrderStatus(current.activeLines, current.cancelledLines);
    orderMap.set(row.orderNumber, current);
  });

  const aggregatedRows = Array.from(orderMap.values())
    .map((row) => {
      const { subscriptionKeys, ...publicRow } = row;
      void subscriptionKeys;

      return {
        ...publicRow,
        subscriptionsCount: round(publicRow.subscriptionsCount),
        amountTotal: round(publicRow.amountTotal),
      };
    })
    .sort((a, b) => b.orderDate.localeCompare(a.orderDate));
  const ordiniTotali = aggregatedRows.length;
  const bigliettiVenduti = aggregatedRows.reduce((sum, row) => sum + row.ticketsCount, 0);
  const abbonamentiOpenVenduti = countSubscriptionsByType(filteredRows, { openOnly: true });
  const abbonamentiVenduti = countSubscriptionsByType(filteredRows, { excludeOpen: true });
  const amountTotal = aggregatedRows.reduce((sum, row) => sum + row.amountTotal, 0);
  const ticketRowsWithOrder = filteredRows.filter(
    (row) => !isCancelledByTransaction(row, transactionMetaByProgressive) && getEmissioneTitleCategory(row) === "ticket"
  ).length;
  const subscriptionRowsWithOrder = filteredRows.filter(
    (row) => !isCancelledByTransaction(row, transactionMetaByProgressive) && isSubscriptionCategory(getEmissioneTitleCategory(row))
  ).length;
  const openSubscriptionRowsWithOrder = filteredRows.filter(
    (row) => !isCancelledByTransaction(row, transactionMetaByProgressive) && isOpenSubscriptionCategory(getEmissioneTitleCategory(row))
  ).length;
  const openSubscriptionRowsWithoutOrder = rows.filter(
    (row) => !row.orderNumber && !row.isCancelled && isOpenSubscriptionCategory(getEmissioneTitleCategory(row))
  ).length;
  const standardSubscriptionDistinctKeys = new Set(
    filteredRows
      .filter(
        (row) =>
          !row.isCancelled &&
          !isCancelledByTransaction(row, transactionMetaByProgressive) &&
          getEmissioneTitleCategory(row) === "subscription" &&
          isCountableSubscriptionRow(row)
      )
      .map((row) => getSubscriptionCountKey(row))
      .filter(Boolean)
  ).size;
  const accountingRows = accountingEmissionRows.filter((row) =>
    isRowInAccountingRange(row, selectedEventId, fromDate, toDate, transactionMetaByProgressive)
  );
  const presaleSummaryRows = rows.filter((row) => {
    if (
      isCancelledByTransaction(row, transactionMetaByProgressive) ||
      isBackofficeExcludedEmissione(row, transactionMetaByProgressive?.get(row.cardProgressive))
    ) {
      return false;
    }

    if (!matchesSelectedEvent(row, selectedEventId)) {
      return false;
    }

    if (row.orderNumber) {
      return true;
    }

    return row.presale > 0 || row.rateoPresale > 0;
  });
  const totaleEmissioni = round(
    accountingRows.reduce((sum, row) => sum + getEmissionKpiAmount(row), 0)
  );
  const totalePrevendita = round(
    presaleSummaryRows.reduce(
      (sum, row) =>
        sum +
        (row.isCancelled || isExcludedPresaleRow(row, transactionMetaByProgressive) ? 0 : getPresaleAmount(row)),
      0
    )
  );
  const totaleGestioneAmministrativa = round(
    accountingRows.reduce((sum, row) => sum + getManagementFeeAmount(row), 0)
  );
  const totaleCommissioni = round(
    accountingRows.reduce((sum, row) => sum + getCommissionAmount(row), 0)
  );
  const trendMap = new Map<string, number>();
  const eventMap = new Map<string, TickaOrdersByEventPoint>();

  aggregatedRows.forEach((row) => {
    trendMap.set(row.orderDate, (trendMap.get(row.orderDate) ?? 0) + 1);

    const eventKey = row.eventId || row.eventName;
    if (!eventKey) {
      return;
    }

    const current = eventMap.get(eventKey) ?? {
      eventId: row.eventId,
      eventName: row.eventName || "Evento non disponibile",
      ordersCount: 0,
    };
    current.ordersCount += 1;
    eventMap.set(eventKey, current);
  });

  console.log("[ticka-orders] buildOrdersView output", {
    distinctOrders: aggregatedRows.length,
    tableRows: aggregatedRows.length,
    topRow: aggregatedRows[0] ?? null,
  });

  return {
    summary: {
      ordiniTotali,
      bigliettiVenduti,
      abbonamentiVenduti,
      abbonamentiOpenVenduti,
      totaleEmissioni,
      totalePrevendita,
      totaleGestioneAmministrativa,
      totaleCommissioni,
      fatturatoTotale: round(
        totaleEmissioni + totalePrevendita + totaleGestioneAmministrativa + totaleCommissioni
      ),
      valoreMedioOrdine: ordiniTotali > 0 ? round(amountTotal / ordiniTotali) : null,
      ticketMediPerOrdine:
        ordiniTotali > 0
          ? round((bigliettiVenduti + abbonamentiVenduti + abbonamentiOpenVenduti) / ordiniTotali)
          : null,
    },
    andamentoOrdiniNelTempo: Array.from(trendMap.entries())
      .map(([date, ordersCount]) => ({ date, ordersCount }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    ordiniPerEvento: Array.from(eventMap.values())
      .sort((a, b) => b.ordersCount - a.ordersCount)
      .slice(0, options?.topEventsLimit ?? 8),
    rows: aggregatedRows,
    total: aggregatedRows.length,
    availableEvents,
    debug: {
      sourceLabel,
      rawRowCount: rows.length,
      rowsWithOrderId: rowsWithOrderId.length,
      rowsInAccountingRange: accountingRows.length,
      groupedOrderCount: aggregatedRows.length,
      filteredRowCount: filteredRows.length,
      selectedEventId,
      ignoredRowsWithoutOrderId: rows.filter((row) => !row.orderNumber).length,
      ticketRowsWithOrder,
      subscriptionRowsWithOrder,
      openSubscriptionRowsWithOrder,
      openSubscriptionRowsWithoutOrder,
      standardSubscriptionDistinctKeys,
    },
  };
}
