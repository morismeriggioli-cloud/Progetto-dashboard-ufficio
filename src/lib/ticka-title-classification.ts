import type { TickaEmissioneNormalizedRow } from "@/lib/ticka-emissioni";

export type TickaAccessTitleCategory =
  | "ticket"
  | "subscription"
  | "subscription_open"
  | "other";

export function getEmissioneTitleCategory(row: TickaEmissioneNormalizedRow): TickaAccessTitleCategory {
  const specieEmissione = row.specieEmissione.toUpperCase();

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

export function isSubscriptionCategory(category: TickaAccessTitleCategory) {
  return category === "subscription" || category === "subscription_open";
}

export function isOpenSubscriptionCategory(category: TickaAccessTitleCategory) {
  return category === "subscription_open";
}
