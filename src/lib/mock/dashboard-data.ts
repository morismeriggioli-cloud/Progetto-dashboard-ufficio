import type {
  MfDataset,
  MfDisponibilitaRecord,
  MfEventoRecord,
  MfOrdineRecord,
  MfVendutoRecord,
} from "@/lib/api-mf";

type EventBlueprint = {
  eventId: string;
  eventName: string;
  venue: string;
  city: string;
  eventDateOffsetDays: number;
  capacity: number;
  baseTicketPrice: number;
  baselineDemand: number;
  demandTrend: number;
  seasonalOffset: number;
  isActive?: boolean;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SALES_LOOKBACK_DAYS = 365;
const sectorNames = [
  "Platea Gold",
  "Platea",
  "Tribuna Centrale",
  "Tribuna Laterale",
  "Gradinata",
  "VIP Lounge",
];

const eventBlueprints: EventBlueprint[] = [
  {
    eventId: "EV001",
    eventName: "Vasco Live 2026",
    venue: "Milano",
    city: "Milano",
    eventDateOffsetDays: 45,
    capacity: 42000,
    baseTicketPrice: 78,
    baselineDemand: 116,
    demandTrend: 0.32,
    seasonalOffset: 0,
  },
  {
    eventId: "EV002",
    eventName: "Arena Opera Gala",
    venue: "Verona",
    city: "Verona",
    eventDateOffsetDays: 28,
    capacity: 18500,
    baseTicketPrice: 92,
    baselineDemand: 58,
    demandTrend: 0.18,
    seasonalOffset: 1,
  },
  {
    eventId: "EV003",
    eventName: "Grand Prix Night",
    venue: "Monza",
    city: "Monza",
    eventDateOffsetDays: 52,
    capacity: 24000,
    baseTicketPrice: 71,
    baselineDemand: 74,
    demandTrend: 0.22,
    seasonalOffset: 2,
  },
  {
    eventId: "EV004",
    eventName: "Roma Summer Fest",
    venue: "Roma",
    city: "Roma",
    eventDateOffsetDays: 76,
    capacity: 21000,
    baseTicketPrice: 64,
    baselineDemand: 62,
    demandTrend: 0.16,
    seasonalOffset: 3,
  },
  {
    eventId: "EV005",
    eventName: "Milano Jazz Week",
    venue: "Milano",
    city: "Milano",
    eventDateOffsetDays: 19,
    capacity: 8200,
    baseTicketPrice: 52,
    baselineDemand: 24,
    demandTrend: 0.1,
    seasonalOffset: 4,
  },
  {
    eventId: "EV006",
    eventName: "Napoli Comedy Lab",
    venue: "Napoli",
    city: "Napoli",
    eventDateOffsetDays: 34,
    capacity: 6400,
    baseTicketPrice: 38,
    baselineDemand: 17,
    demandTrend: 0.08,
    seasonalOffset: 5,
  },
  {
    eventId: "EV007",
    eventName: "Florence Indie Nights",
    venue: "Firenze",
    city: "Firenze",
    eventDateOffsetDays: 61,
    capacity: 9600,
    baseTicketPrice: 48,
    baselineDemand: 20,
    demandTrend: 0.09,
    seasonalOffset: 6,
  },
  {
    eventId: "EV008",
    eventName: "Torino Tech Expo",
    venue: "Torino",
    city: "Torino",
    eventDateOffsetDays: 88,
    capacity: 11800,
    baseTicketPrice: 56,
    baselineDemand: 14,
    demandTrend: 0.05,
    seasonalOffset: 7,
    isActive: false,
  },
];

function startOfDay(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function formatIsoDate(date: Date) {
  return startOfDay(date).toISOString().slice(0, 10);
}

function splitAmount(total: number, parts: number, index: number) {
  const base = Math.floor(total / parts);
  const distributed = base * parts;
  const remainder = total - distributed;
  return base + (index < remainder ? 1 : 0);
}

function splitTickets(total: number, parts: number, index: number) {
  const base = Math.floor(total / parts);
  const distributed = base * parts;
  const remainder = total - distributed;
  return base + (index < remainder ? 1 : 0);
}

function buildMockMfDataset(): MfDataset {
  const today = startOfDay(new Date());
  const firstSalesDay = addDays(today, -(SALES_LOOKBACK_DAYS - 1));

  const venduto: MfVendutoRecord[] = [];
  const ordini: MfOrdineRecord[] = [];
  const eventi: MfEventoRecord[] = [];
  const disponibilita: MfDisponibilitaRecord[] = [];

  let orderSequence = 1000;

  eventBlueprints.forEach((blueprint, eventIndex) => {
    const eventDate = addDays(today, blueprint.eventDateOffsetDays);
    const eventDateIso = formatIsoDate(eventDate);
    let cumulativeTickets = 0;

    for (let dayIndex = 0; dayIndex < SALES_LOOKBACK_DAYS; dayIndex += 1) {
      const currentDate = addDays(firstSalesDay, dayIndex);
      const currentDateIso = formatIsoDate(currentDate);
      const daysToEvent = Math.max(
        1,
        Math.round((eventDate.getTime() - currentDate.getTime()) / MS_PER_DAY)
      );
      const proximityBoost = Math.max(0, 1 - daysToEvent / 140);
      const monthlySeasonality =
        Math.sin((dayIndex + blueprint.seasonalOffset * 9) / 7.4) * 0.18 +
        Math.cos((dayIndex + eventIndex * 11) / 18) * 0.12;
      const weekendBoost = currentDate.getDay() === 0 || currentDate.getDay() === 6 ? 1.18 : 1;
      const growthFactor = 1 + (dayIndex / SALES_LOOKBACK_DAYS) * blueprint.demandTrend;
      const rawTickets =
        blueprint.baselineDemand * growthFactor * (1 + proximityBoost * 1.55 + monthlySeasonality);
      const ticketsForDay = Math.max(0, Math.round(rawTickets * weekendBoost));

      if (ticketsForDay === 0 || cumulativeTickets >= blueprint.capacity) {
        continue;
      }

      const remainingCapacity = blueprint.capacity - cumulativeTickets;
      const soldToday = Math.min(remainingCapacity, ticketsForDay);
      const dynamicPrice =
        blueprint.baseTicketPrice *
        (1 + proximityBoost * 0.16 + Math.max(0, monthlySeasonality) * 0.07);
      const totalAmount = Math.round(soldToday * dynamicPrice);
      const orderCount = Math.max(3, Math.round(soldToday / 2.7));

      for (let orderIndex = 0; orderIndex < orderCount; orderIndex += 1) {
        const orderId = `ORD-${orderSequence}`;
        orderSequence += 1;

        const amount = splitAmount(totalAmount, orderCount, orderIndex);
        const tickets = splitTickets(soldToday, orderCount, orderIndex);

        if (tickets <= 0 || amount <= 0) {
          continue;
        }

        venduto.push({
          eventId: blueprint.eventId,
          eventName: blueprint.eventName,
          date: currentDateIso,
          amount,
          tickets,
          orderId,
        });

        ordini.push({
          orderId,
          eventId: blueprint.eventId,
          eventName: blueprint.eventName,
          orderDate: currentDateIso,
          eventDate: eventDateIso,
          amount,
          tickets,
          sectorName: sectorNames[(orderIndex + eventIndex) % sectorNames.length],
          status: orderIndex % 17 === 0 ? "In verifica" : "Confermato",
          venue: blueprint.venue,
          city: blueprint.city,
        });
      }

      cumulativeTickets += soldToday;
    }

    eventi.push({
      eventId: blueprint.eventId,
      eventName: blueprint.eventName,
      date: eventDateIso,
      isActive: blueprint.isActive ?? true,
      venue: blueprint.venue,
    });

    disponibilita.push({
      eventId: blueprint.eventId,
      eventName: blueprint.eventName,
      date: eventDateIso,
      availableTickets: Math.max(0, blueprint.capacity - cumulativeTickets),
    });
  });

  return {
    venduto,
    eventi,
    ordini,
    disponibilita,
  };
}

const mockDataset = buildMockMfDataset();

export const mockDashboardVenduto = mockDataset.venduto;
export const mockDashboardEventi = mockDataset.eventi;
export const mockDashboardDisponibilita = mockDataset.disponibilita;
export const mockDashboardOrdini = mockDataset.ordini;

export function getMockMfDataset(): MfDataset {
  return mockDataset;
}

export function getMockDashboardDataset(): Pick<
  MfDataset,
  "venduto" | "eventi" | "disponibilita"
> {
  return {
    venduto: mockDataset.venduto,
    eventi: mockDataset.eventi,
    disponibilita: mockDataset.disponibilita,
  };
}

export function getMockOrdersDataset(): Pick<MfDataset, "ordini"> {
  return {
    ordini: mockDataset.ordini,
  };
}
