import type { MfDataset } from "@/lib/api-mf";
import { getMockMfDataset } from "@/lib/mock/dashboard-data";

export function getMockOrdersDataset(): Pick<MfDataset, "ordini"> {
  return {
    ordini: getMockMfDataset().ordini,
  };
}
