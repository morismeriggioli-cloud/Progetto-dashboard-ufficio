import "server-only";

import { XMLParser } from "fast-xml-parser";
import { fetchTicka } from "@/lib/ticka";

type TickaRiepilogoEventRow = {
  organizerName: string;
  eventTitle: string;
  venueName: string;
  venueCode: string;
  eventDate: string;
  quantity: number;
  gross: number;
  presale: number;
};

export type TickaRiepilogoNormalized = {
  sourceDate: string;
  organizers: number;
  events: number;
  venues: number;
  ticketsTotal: number;
  grossTotal: number;
  presaleTotal: number;
  eventRows: TickaRiepilogoEventRow[];
  amountsInCents: boolean;
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: true,
  trimValues: true,
  isArray: (_name, jpath) =>
    [
      "RiepilogoGiornaliero.Organizzatore",
      "RiepilogoGiornaliero.Organizzatore.Evento",
      "RiepilogoGiornaliero.Organizzatore.Evento.OrdineDiPosto",
      "RiepilogoGiornaliero.Organizzatore.Evento.OrdineDiPosto.TitoliAccesso",
      "RiepilogoGiornaliero.Organizzatore.Evento.MultiGenere.TitoliOpere",
    ].includes(String(jpath)),
});

type ParsedRiepilogo = {
  RiepilogoGiornaliero?: {
    Data?: string | number;
    Organizzatore?: Array<{
      Denominazione?: string;
      Evento?: Array<{
        DataEvento?: string | number;
        TitoliOpere?: { Titolo?: string | string[] } | Array<{ Titolo?: string | string[] }>;
        MultiGenere?: {
          TitoliOpere?: { Titolo?: string | string[] } | Array<{ Titolo?: string | string[] }>;
        };
        Locale?: {
          Denominazione?: string;
          CodiceLocale?: string | number;
        };
        OrdineDiPosto?: Array<{
          TitoliAccesso?: Array<{
            Quantita?: string | number;
            CorrispettivoLordo?: string | number;
            Prevendita?: string | number;
          }>;
        }>;
      }>;
    }>;
  };
};

type ParsedOrganizer = NonNullable<NonNullable<ParsedRiepilogo["RiepilogoGiornaliero"]>["Organizzatore"]>[number];
type ParsedEvent = NonNullable<ParsedOrganizer["Evento"]>[number];

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function parseNumber(value: string | number | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeTickaDate(value: string | number | undefined): string {
  const raw = String(value || "").trim();
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  return raw;
}

function firstNonEmpty(values: Array<string | undefined>): string {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() || "";
}

function extractEventTitle(event: ParsedEvent) {
  const directTitles = toArray(event.TitoliOpere).flatMap((item) => toArray(item?.Titolo));
  const multiGenereTitles = toArray(event.MultiGenere?.TitoliOpere).flatMap((item) => toArray(item?.Titolo));

  return firstNonEmpty(
    [...directTitles, ...multiGenereTitles].map((title) => (typeof title === "string" ? title : undefined))
  );
}

export function parseTickaRiepilogoXml(xml: string): TickaRiepilogoNormalized {
  const parsed = xmlParser.parse(xml) as ParsedRiepilogo;
  const root = parsed.RiepilogoGiornaliero;
  const organizers = toArray(root?.Organizzatore);
  const uniqueOrganizers = new Set<string>();
  const uniqueEvents = new Set<string>();
  const uniqueVenues = new Set<string>();
  const eventRows: TickaRiepilogoEventRow[] = [];

  for (const organizer of organizers) {
    const organizerName = organizer?.Denominazione?.trim() || "Organizzatore sconosciuto";
    uniqueOrganizers.add(organizerName);

    for (const event of toArray(organizer?.Evento)) {
      const venueName = event.Locale?.Denominazione?.trim() || "";
      const venueCode = String(event.Locale?.CodiceLocale || "").trim();
      const eventDate = normalizeTickaDate(event.DataEvento);
      const eventTitle = extractEventTitle(event) || "Evento senza titolo";
      const eventKey = `${organizerName}::${eventTitle}::${venueCode}::${eventDate}`;

      uniqueEvents.add(eventKey);

      if (venueCode || venueName) {
        uniqueVenues.add(`${venueCode}::${venueName}`);
      }

      let quantity = 0;
      let gross = 0;
      let presale = 0;

      for (const ordine of toArray(event.OrdineDiPosto)) {
        for (const titolo of toArray(ordine?.TitoliAccesso)) {
          quantity += parseNumber(titolo?.Quantita);
          gross += parseNumber(titolo?.CorrispettivoLordo);
          presale += parseNumber(titolo?.Prevendita);
        }
      }

      eventRows.push({
        organizerName,
        eventTitle,
        venueName,
        venueCode,
        eventDate,
        quantity,
        gross,
        presale,
      });
    }
  }

  const ticketsTotal = eventRows.reduce((sum, row) => sum + row.quantity, 0);
  const grossTotal = eventRows.reduce((sum, row) => sum + row.gross, 0);
  const presaleTotal = eventRows.reduce((sum, row) => sum + row.presale, 0);

  return {
    sourceDate: normalizeTickaDate(root?.Data),
    organizers: uniqueOrganizers.size,
    events: uniqueEvents.size,
    venues: uniqueVenues.size,
    ticketsTotal,
    grossTotal,
    presaleTotal,
    eventRows,
    amountsInCents: true,
  };
}

export async function fetchTickaRiepilogoXml(date: string, endpointName: "dashboard.riepilogoByDate" | "kpi.riepilogoByDate" = "dashboard.riepilogoByDate") {
  const finalUrl = `/riepilogogiornaliero/date/data/${date}`;
  const rawXml = await fetchTicka<string>(finalUrl, {
    endpointName,
  });

  return {
    finalUrl,
    rawXml,
    normalized: parseTickaRiepilogoXml(rawXml),
  };
}
