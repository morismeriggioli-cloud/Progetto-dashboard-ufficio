/**
 * Utilita per la gestione delle date nell'API TickaWS.
 */

import "server-only";

import { isTickaNotFoundError } from "./ticka";
import { fetchTickaEmissioniByDate } from "./ticka-emissioni";

export function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
}

export function getDaysAgoDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split("T")[0];
}

export async function getLastValidTickaDate(): Promise<{
  requestedDate: string;
  effectiveDate: string;
  hasData: boolean;
  sourceEndpoint: string;
  recordCount: number;
  attempts: number;
}> {
  const datesToTry = [
    { days: 1, name: "ieri" },
    { days: 2, name: "2 giorni fa" },
    { days: 3, name: "3 giorni fa" },
    { days: 4, name: "4 giorni fa" },
    { days: 5, name: "5 giorni fa" },
    { days: 6, name: "6 giorni fa" },
    { days: 7, name: "7 giorni fa" },
  ];

  console.log("[ticka/date-utils] Searching for last valid TickaWS date...");

  for (let i = 0; i < datesToTry.length; i += 1) {
    const { days, name } = datesToTry[i];
    const testDate = getDaysAgoDate(days);

    try {
      console.log(`[ticka/date-utils] Testing date: ${testDate} (${name})`);

      const emissioniResponse = await fetchTickaEmissioniByDate(testDate, "dateUtils.emissioniByDate");

      if (emissioniResponse.rows.length > 0) {
        return {
          requestedDate: testDate,
          effectiveDate: testDate,
          hasData: true,
          sourceEndpoint: "/ReportEmissioni/EmissioniPerData",
          recordCount: emissioniResponse.rows.length,
          attempts: i + 1,
        };
      }

      console.log(`[ticka/date-utils] No data found for date: ${testDate}`);
    } catch (error) {
      console.log(`[ticka/date-utils] Error testing date ${testDate}:`, error);

      if (isTickaNotFoundError(error)) {
        console.log("[ticka/date-utils] Stop retry on date scan because path is not verified.");
        break;
      }
    }
  }

  const fallbackDate = getYesterdayDate();
  console.log(`[ticka/date-utils] No data found in last 7 days, using fallback: ${fallbackDate}`);

  return {
    requestedDate: fallbackDate,
    effectiveDate: fallbackDate,
    hasData: false,
    sourceEndpoint: "fallback",
    recordCount: 0,
    attempts: datesToTry.length,
  };
}

export function formatDateItalian(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("it-IT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
