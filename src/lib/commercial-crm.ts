export const COMMERCIAL_LEADS_TABLE = "commercial_leads";
export const COMMERCIAL_OFFERS_BUCKET = "commercial-offers";

export const commercialLeadStatuses = [
  "Nuovo contatto",
  "In valutazione",
  "Offerta inviata",
  "In trattativa",
  "Contratto firmato",
  "Perso",
] as const;

export type CommercialLeadStatus = (typeof commercialLeadStatuses)[number];

export type CommercialLead = {
  id: string;
  organizer_name: string;
  company_name: string;
  contact_channel: string;
  email: string;
  phone: string;
  city: string;
  event_type: string;
  contact_date: string | null;
  status: CommercialLeadStatus;
  marketing_proposal_sent: boolean;
  notes: string;
  offer_pdf_url: string | null;
  created_by: string | null;
  created_at: string;
};

export type CommercialLeadInput = {
  organizer_name: string;
  company_name: string;
  contact_channel: string;
  email: string;
  phone: string;
  city: string;
  event_type: string;
  contact_date: string;
  status: CommercialLeadStatus;
  marketing_proposal_sent: boolean;
  notes: string;
  offer_pdf_url: string | null;
  created_by?: string | null;
};

export type CommercialLeadKpis = {
  newContacts: number;
  offersSent: number;
  activeNegotiations: number;
  signedContracts: number;
};

export function normalizeCommercialLead(lead: Partial<CommercialLead>): CommercialLead {
  return {
    id: lead.id ?? "",
    organizer_name: lead.organizer_name ?? "",
    company_name: lead.company_name ?? "",
    contact_channel: lead.contact_channel ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    city: lead.city ?? "",
    event_type: lead.event_type ?? "",
    contact_date: lead.contact_date ?? null,
    status: commercialLeadStatuses.includes(lead.status as CommercialLeadStatus)
      ? (lead.status as CommercialLeadStatus)
      : "Nuovo contatto",
    marketing_proposal_sent: lead.marketing_proposal_sent ?? false,
    notes: lead.notes ?? "",
    offer_pdf_url: lead.offer_pdf_url ?? null,
    created_by: lead.created_by ?? null,
    created_at: lead.created_at ?? "",
  };
}

export function computeCommercialLeadKpis(leads: CommercialLead[]): CommercialLeadKpis {
  return {
    newContacts: leads.filter((lead) => lead.status === "Nuovo contatto").length,
    offersSent: leads.filter((lead) => lead.status === "Offerta inviata").length,
    activeNegotiations: leads.filter((lead) => lead.status === "In trattativa").length,
    signedContracts: leads.filter((lead) => lead.status === "Contratto firmato").length,
  };
}

export function filterCommercialLeads(
  leads: CommercialLead[],
  filters: {
    status: string;
    city: string;
    eventType: string;
    contactChannel: string;
    dateFrom: string;
    dateTo: string;
  }
) {
  return leads.filter((lead) => {
    if (filters.status && lead.status !== filters.status) {
      return false;
    }

    if (filters.city && lead.city !== filters.city) {
      return false;
    }

    if (filters.eventType && lead.event_type !== filters.eventType) {
      return false;
    }

    if (filters.contactChannel && lead.contact_channel !== filters.contactChannel) {
      return false;
    }

    if (filters.dateFrom && lead.contact_date && lead.contact_date < filters.dateFrom) {
      return false;
    }

    if (filters.dateTo && lead.contact_date && lead.contact_date > filters.dateTo) {
      return false;
    }

    return true;
  });
}

export function getCommercialFilterOptions(leads: CommercialLead[]) {
  const cities = new Set<string>();
  const eventTypes = new Set<string>();
  const contactChannels = new Set<string>();

  leads.forEach((lead) => {
    if (lead.city) {
      cities.add(lead.city);
    }

    if (lead.event_type) {
      eventTypes.add(lead.event_type);
    }

    if (lead.contact_channel) {
      contactChannels.add(lead.contact_channel);
    }
  });

  return {
    cities: Array.from(cities).sort((a, b) => a.localeCompare(b, "it")),
    eventTypes: Array.from(eventTypes).sort((a, b) => a.localeCompare(b, "it")),
    contactChannels: Array.from(contactChannels).sort((a, b) => a.localeCompare(b, "it")),
  };
}

export function getCommercialStatusTone(status: CommercialLeadStatus) {
  switch (status) {
    case "Nuovo contatto":
      return "bg-sky-50 text-sky-700 ring-sky-200";
    case "In valutazione":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "Offerta inviata":
      return "bg-indigo-50 text-indigo-700 ring-indigo-200";
    case "In trattativa":
      return "bg-violet-50 text-violet-700 ring-violet-200";
    case "Contratto firmato":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "Perso":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}
