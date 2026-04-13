"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IconBriefcase as BriefcaseBusiness,
  IconEye as Eye,
  IconFileText as FileText,
  IconFilter as Filter,
  IconMailPlus as MailPlus,
  IconPencil as PenSquare,
  IconRefresh as RefreshCw,
  IconRosetteDiscountCheck as Handshake,
  IconSearch as Search,
  IconTrash as Trash2,
  IconUpload as Upload,
} from "@tabler/icons-react";
import InternalLayout from "@/components/layout/InternalLayout";
import DataTable from "@/components/dashboard/DataTable";
import { useAuth } from "@/lib/use-auth";
import {
  commercialLeadStatuses,
  computeCommercialLeadKpis,
  filterCommercialLeads,
  getCommercialFilterOptions,
  getCommercialStatusTone,
  type CommercialLead,
  type CommercialLeadInput,
  type CommercialLeadStatus,
} from "@/lib/commercial-crm";
import {
  createCommercialLead,
  deleteCommercialLead,
  fetchCommercialLeads,
  updateCommercialLead,
  updateCommercialLeadStatus,
  uploadCommercialOfferPdf,
} from "@/lib/commercial-crm-repository";

const initialFormState: CommercialLeadInput = {
  organizer_name: "",
  company_name: "",
  contact_channel: "",
  email: "",
  phone: "",
  city: "",
  event_type: "",
  contact_date: "",
  status: "Nuovo contatto",
  marketing_proposal_sent: false,
  notes: "",
  offer_pdf_url: null,
};

export default function CommercialDashboardPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<CommercialLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [contactChannelFilter, setContactChannelFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedLead, setSelectedLead] = useState<CommercialLead | null>(null);
  const [formState, setFormState] = useState<CommercialLeadInput>(initialFormState);

  const loadLeads = async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await fetchCommercialLeads();
      setLeads(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? `Impossibile caricare i contatti commerciali: ${loadError.message}`
          : "Impossibile caricare i contatti commerciali."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLeads();
  }, []);

  const filterOptions = useMemo(() => getCommercialFilterOptions(leads), [leads]);

  const filteredLeads = useMemo(() => {
    const baseFiltered = filterCommercialLeads(leads, {
      status: statusFilter,
      city: cityFilter,
      eventType: eventTypeFilter,
      contactChannel: contactChannelFilter,
      dateFrom,
      dateTo,
    });

    if (!searchTerm.trim()) {
      return baseFiltered;
    }

    const query = searchTerm.trim().toLowerCase();
    return baseFiltered.filter((lead) =>
      [
        lead.organizer_name,
        lead.company_name,
        lead.contact_channel,
        lead.email,
        lead.city,
        lead.event_type,
        lead.status,
      ].some((value) => value.toLowerCase().includes(query))
    );
  }, [
    leads,
    statusFilter,
    cityFilter,
    eventTypeFilter,
    contactChannelFilter,
    dateFrom,
    dateTo,
    searchTerm,
  ]);

  const kpis = useMemo(() => computeCommercialLeadKpis(leads), [leads]);

  const resetForm = () => {
    setFormState(initialFormState);
    setSelectedLead(null);
  };

  const handleInputChange = <K extends keyof CommercialLeadInput>(
    key: K,
    value: CommercialLeadInput[K]
  ) => {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) {
      return;
    }

    setIsUploadingPdf(true);
    setError("");

    try {
      const pdfUrl = await uploadCommercialOfferPdf(file, user.id);
      setFormState((current) => ({
        ...current,
        offer_pdf_url: pdfUrl,
      }));
      setSuccessMessage("PDF offerta caricato correttamente.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? `Upload PDF non riuscito: ${uploadError.message}`
          : "Upload PDF non riuscito."
      );
    } finally {
      setIsUploadingPdf(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      if (selectedLead) {
        await updateCommercialLead(selectedLead.id, formState);
        await loadLeads();
        setSuccessMessage("Lead commerciale aggiornato.");
      } else {
        await createCommercialLead({
          ...formState,
          created_by: user?.id ?? null,
        });
        await loadLeads();
        setSuccessMessage("Lead commerciale creato.");
      }

      resetForm();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? `Salvataggio non riuscito: ${saveError.message}`
          : "Salvataggio non riuscito."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditLead = (lead: CommercialLead) => {
    setSelectedLead(lead);
    setFormState({
      organizer_name: lead.organizer_name,
      company_name: lead.company_name,
      contact_channel: lead.contact_channel,
      email: lead.email,
      phone: lead.phone,
      city: lead.city,
      event_type: lead.event_type,
      contact_date: lead.contact_date ?? "",
      status: lead.status,
      marketing_proposal_sent: lead.marketing_proposal_sent,
      notes: lead.notes,
      offer_pdf_url: lead.offer_pdf_url,
    });
  };

  const handleStatusChange = async (leadId: string, status: CommercialLeadStatus) => {
    setError("");

    try {
      const updatedLead = await updateCommercialLeadStatus(leadId, status);
      setLeads((current) => current.map((lead) => (lead.id === leadId ? updatedLead : lead)));
      await loadLeads();
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? `Aggiornamento stato non riuscito: ${statusError.message}`
          : "Aggiornamento stato non riuscito."
      );
    }
  };

  const handleDeleteLead = async (lead: CommercialLead) => {
    const shouldDelete = window.confirm(
      `Vuoi eliminare il lead "${lead.organizer_name}"? Questa azione non puo essere annullata.`
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingLeadId(lead.id);
    setError("");
    setSuccessMessage("");

    try {
      await deleteCommercialLead(lead.id);
      setLeads((current) => current.filter((item) => item.id !== lead.id));

      if (selectedLead?.id === lead.id) {
        resetForm();
      }

      setSuccessMessage("Lead commerciale eliminato.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? `Eliminazione non riuscita: ${deleteError.message}`
          : "Eliminazione non riuscita."
      );
    } finally {
      setDeletingLeadId(null);
    }
  };

  const columns = [
    {
      key: "organizer_name",
      header: "Organizzatore",
      render: (lead: CommercialLead) => (
        <div>
          <p className="font-medium text-dark-text">{lead.organizer_name}</p>
          <p className="text-xs text-gray-500">{lead.email || "Email non indicata"}</p>
        </div>
      ),
    },
    {
      key: "company_name",
      header: "Referente",
      render: (lead: CommercialLead) => <span>{lead.company_name || "Non disponibile"}</span>,
    },
    {
      key: "contact_channel",
      header: "Canale contatto",
      render: (lead: CommercialLead) => (
        <span>{lead.contact_channel || "Non disponibile"}</span>
      ),
    },
    {
      key: "city",
      header: "Citta",
      render: (lead: CommercialLead) => <span>{lead.city || "Non disponibile"}</span>,
    },
    {
      key: "event_type",
      header: "Tipo evento",
      render: (lead: CommercialLead) => <span>{lead.event_type || "Non disponibile"}</span>,
    },
    {
      key: "status",
      header: "Stato",
      render: (lead: CommercialLead) => (
        <select
          value={lead.status}
          onChange={(event) =>
            void handleStatusChange(lead.id, event.target.value as CommercialLeadStatus)
          }
          className={`rounded-full border-0 px-3 py-2 text-xs font-semibold ring-1 ring-inset ${getCommercialStatusTone(
            lead.status
          )}`}
        >
          {commercialLeadStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "contact_date",
      header: "Data contatto",
      render: (lead: CommercialLead) => (
        <span>
          {lead.contact_date
            ? new Date(`${lead.contact_date}T00:00:00`).toLocaleDateString("it-IT")
            : "Non disponibile"}
        </span>
      ),
    },
    {
      key: "offer_pdf_url",
      header: "Offerta PDF",
      render: (lead: CommercialLead) =>
        lead.offer_pdf_url ? (
          <a
            href={lead.offer_pdf_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            <FileText className="h-4 w-4" />
            Apri PDF
          </a>
        ) : (
          <span className="text-xs text-gray-400">Non caricato</span>
        ),
    },
    {
      key: "marketing_proposal_sent",
      header: "Proposta marketing",
      render: (lead: CommercialLead) => (
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
            lead.marketing_proposal_sent
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-slate-100 text-slate-600 ring-slate-200"
          }`}
        >
          {lead.marketing_proposal_sent ? "Inviata" : "Non inviata"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Azioni",
      render: (lead: CommercialLead) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedLead(lead)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
          >
            <Eye className="mr-1 inline h-3 w-3" />
            View
          </button>
          <button
            type="button"
            onClick={() => handleEditLead(lead)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
          >
            <PenSquare className="mr-1 inline h-3 w-3" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => void handleDeleteLead(lead)}
            disabled={deletingLeadId === lead.id}
            className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="mr-1 inline h-3 w-3" />
            {deletingLeadId === lead.id ? "Elimino..." : "Elimina"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <InternalLayout requiredSection="commercial">
      <div className="space-y-6">
        <section className="rounded-[28px] border border-white/70 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 p-7 text-white shadow-[0_30px_80px_-48px_rgba(15,23,42,0.9)]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/90">
                Commerciale
              </p>
              <h1 className="mt-3 text-3xl font-semibold">CRM organizer TicketItalia</h1>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                Traccia organizer interessati alla piattaforma, gestisci trattative e allega le
                offerte commerciali in PDF in un’unica vista operativa.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Archivio CRM</p>
              <p className="mt-2 text-lg font-semibold">{leads.length} lead totali</p>
              <p className="mt-1 text-sm text-slate-300">Aggiornato in tempo reale da Supabase</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.35)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100">
                <MailPlus className="h-5 w-5 text-sky-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Nuovi contatti</p>
                <p className="text-3xl font-semibold text-dark-text">{kpis.newContacts}</p>
              </div>
            </div>
          </article>
          <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.35)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100">
                <Upload className="h-5 w-5 text-indigo-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Offerte inviate</p>
                <p className="text-3xl font-semibold text-dark-text">{kpis.offersSent}</p>
              </div>
            </div>
          </article>
          <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.35)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100">
                <Handshake className="h-5 w-5 text-violet-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Trattative in corso</p>
                <p className="text-3xl font-semibold text-dark-text">{kpis.activeNegotiations}</p>
              </div>
            </div>
          </article>
          <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.35)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
                <BriefcaseBusiness className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Contratti firmati</p>
                <p className="text-3xl font-semibold text-dark-text">{kpis.signedContracts}</p>
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.9fr)]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.35)]">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Filtri CRM
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Filtra i lead per stato, citta, tipo evento, canale e data contatto.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadLeads()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-primary hover:text-primary"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  Aggiorna
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="block xl:col-span-3">
                  <span className="mb-2 block text-sm font-medium text-dark-text">Ricerca</span>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="Cerca organizzatore, azienda, email o citta"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-dark-text">Stato</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Tutti gli stati</option>
                    {commercialLeadStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-dark-text">Citta</span>
                  <select
                    value={cityFilter}
                    onChange={(event) => setCityFilter(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Tutte le citta</option>
                    {filterOptions.cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-dark-text">Tipo evento</span>
                  <select
                    value={eventTypeFilter}
                    onChange={(event) => setEventTypeFilter(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Tutti i tipi</option>
                    {filterOptions.eventTypes.map((eventType) => (
                      <option key={eventType} value={eventType}>
                        {eventType}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-dark-text">
                    Canale contatto
                  </span>
                  <select
                    value={contactChannelFilter}
                    onChange={(event) => setContactChannelFilter(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Tutti i canali</option>
                    {filterOptions.contactChannels.map((channel) => (
                      <option key={channel} value={channel}>
                        {channel}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-dark-text">Data da</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-dark-text">Data a</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("");
                      setCityFilter("");
                      setEventTypeFilter("");
                      setContactChannelFilter("");
                      setDateFrom("");
                      setDateTo("");
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm font-medium text-gray-700 transition hover:border-primary hover:text-primary"
                  >
                    <Filter className="h-4 w-4" />
                    Reset filtri
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.35)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-dark-text">Elenco organizer</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Vista operativa dei lead commerciali attivi sulla piattaforma.
                  </p>
                </div>
                <p className="text-sm text-gray-500">{filteredLeads.length} lead nel filtro</p>
              </div>

              {error ? (
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="mt-6">
                <DataTable columns={columns} rows={filteredLeads} />
              </div>
            </section>
          </div>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-dark-text">
                  {selectedLead ? "Modifica lead" : "Nuovo lead commerciale"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Registra organizer, stato della trattativa e offerta PDF allegata.
                </p>
              </div>

              {selectedLead ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-primary hover:text-primary"
                >
                  Nuovo lead
                </button>
              ) : null}
            </div>

            {successMessage ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            ) : null}

            <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-dark-text">Organizzatore</span>
                  <input
                    type="text"
                    value={formState.organizer_name}
                    onChange={(event) => handleInputChange("organizer_name", event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-dark-text">Referente</span>
                  <input
                    type="text"
                    value={formState.company_name}
                    onChange={(event) => handleInputChange("company_name", event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-dark-text">
                    Canale contatto
                  </span>
                  <input
                    type="text"
                    value={formState.contact_channel}
                    onChange={(event) => handleInputChange("contact_channel", event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Instagram, email, telefono, passaparola..."
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-dark-text">Email</span>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(event) => handleInputChange("email", event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-dark-text">Telefono</span>
                  <input
                    type="text"
                    value={formState.phone}
                    onChange={(event) => handleInputChange("phone", event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-dark-text">Citta</span>
                  <input
                    type="text"
                    value={formState.city}
                    onChange={(event) => handleInputChange("city", event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-dark-text">Tipo evento</span>
                  <input
                    type="text"
                    value={formState.event_type}
                    onChange={(event) => handleInputChange("event_type", event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-dark-text">Data contatto</span>
                  <input
                    type="date"
                    value={formState.contact_date}
                    onChange={(event) => handleInputChange("contact_date", event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-dark-text">Stato</span>
                  <select
                    value={formState.status}
                    onChange={(event) =>
                      handleInputChange("status", event.target.value as CommercialLeadStatus)
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    {commercialLeadStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-dark-text">Note</span>
                <textarea
                  value={formState.notes}
                  onChange={(event) => handleInputChange("notes", event.target.value)}
                  rows={5}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-slate-50 px-4 py-4">
                <input
                  type="checkbox"
                  checked={formState.marketing_proposal_sent}
                  onChange={(event) =>
                    handleInputChange("marketing_proposal_sent", event.target.checked)
                  }
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-[#4ec4c5] focus:ring-[#4ec4c5]/30"
                />
                <div>
                  <span className="block text-sm font-medium text-dark-text">
                    Proposta marketing inviata
                  </span>
                  <span className="mt-1 block text-sm text-gray-500">
                    Spunta se e stata inviata una proposta marketing al contatto.
                  </span>
                </div>
              </label>

              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-dark-text">Upload PDF offerta</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Carica il PDF commerciale su Supabase Storage e salva il link nella lead.
                    </p>
                  </div>
                  <label className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_-20px_rgba(15,23,42,0.9)] transition hover:bg-slate-800 md:w-auto">
                    <Upload className="h-4 w-4" />
                    <span>{isUploadingPdf ? "Caricamento..." : "Carica PDF"}</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(event) => void handlePdfUpload(event)}
                      className="sr-only"
                      disabled={isUploadingPdf || !user?.id}
                    />
                  </label>
                </div>

                {formState.offer_pdf_url ? (
                  <a
                    href={formState.offer_pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-100 md:w-auto"
                  >
                    <FileText className="h-4 w-4" />
                    Visualizza PDF caricato
                  </a>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4ec4c5] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(78,196,197,0.95)] transition hover:bg-[#3db3b4] focus:outline-none focus:ring-2 focus:ring-[#4ec4c5]/30 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? "Salvataggio..." : selectedLead ? "Aggiorna lead" : "Crea lead"}
              </button>
            </form>

            {selectedLead ? (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Dettaglio lead selezionata
                </p>
                <p className="mt-3 text-base font-semibold text-dark-text">{selectedLead.organizer_name}</p>
                <p className="mt-1 text-sm text-gray-500">{selectedLead.notes || "Nessuna nota inserita."}</p>
              </div>
            ) : null}
          </section>
        </section>
      </div>
    </InternalLayout>
  );
}
