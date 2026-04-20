import "server-only";

import type { TickaEmissioneNormalizedRow } from "@/lib/ticka-emissioni";
import type { TickaTransazioneNormalizedRow } from "@/lib/ticka-transazioni";

const VERIFIED_BACKOFFICE_EXCLUDED_ORDERS = new Set(["266832"]);
const VERIFIED_NON_BUSINESS_FREE_ORDERS = new Set(["261359"]);

function isZeroValueInternalFreeRow(row: TickaEmissioneNormalizedRow) {
  const hasEconomicValue =
    row.price > 0 ||
    row.presale > 0 ||
    row.managementFee > 0 ||
    row.commissionAmount > 0 ||
    row.rateoAmount > 0 ||
    row.rateoPresale > 0;
  return (
    !hasEconomicValue &&
    Boolean(row.orderNumber) &&
    VERIFIED_NON_BUSINESS_FREE_ORDERS.has(row.orderNumber) &&
    /omaggio/i.test(row.reductionLabel)
  );
}

export function isBackofficeExcludedEmissione(
  row: TickaEmissioneNormalizedRow,
  transaction?: TickaTransazioneNormalizedRow
) {
  void transaction;

  if (isZeroValueInternalFreeRow(row)) {
    return true;
  }

  if (!row.orderNumber || !VERIFIED_BACKOFFICE_EXCLUDED_ORDERS.has(row.orderNumber)) {
    return false;
  }

  return /only wine 2026/i.test(row.eventName) && row.campaignCode === "SOMM2026";
}
