import type { MfDataset } from "@/lib/api-mf";
import {
  mockDashboardDisponibilita,
  mockDashboardEventi,
  mockDashboardVenduto,
} from "@/lib/mock/dashboard-data";

export function getMockMarketingDataset(): Pick<
  MfDataset,
  "venduto" | "eventi" | "disponibilita"
> {
  return {
    venduto: mockDashboardVenduto,
    eventi: mockDashboardEventi,
    disponibilita: mockDashboardDisponibilita,
  };
}
