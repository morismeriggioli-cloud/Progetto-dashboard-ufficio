import "server-only";

import type { TickaEmissioneNormalizedRow } from "@/lib/ticka-emissioni";
import type { TickaTransazioneNormalizedRow } from "@/lib/ticka-transazioni";

const VERIFIED_BACKOFFICE_EXCLUDED_ORDERS = new Set(["266832"]);

export function isBackofficeExcludedEmissione(
  row: TickaEmissioneNormalizedRow,
  transaction?: TickaTransazioneNormalizedRow
) {
  void transaction;

  if (!row.orderNumber || !VERIFIED_BACKOFFICE_EXCLUDED_ORDERS.has(row.orderNumber)) {
    return false;
  }

  return /only wine 2026/i.test(row.eventName) && row.campaignCode === "SOMM2026";
}
