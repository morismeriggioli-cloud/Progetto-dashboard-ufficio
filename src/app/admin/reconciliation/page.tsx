"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { IconArrowLeft, IconRefresh, IconAlertTriangle, IconCheck } from "@tabler/icons-react";
import DataTable from "@/components/dashboard/DataTable";
import MetricCard from "@/components/dashboard/MetricCard";
import SectionCard from "@/components/dashboard/SectionCard";
import InternalLayout from "@/components/layout/InternalLayout";

type ReconciliationRow = {
  date: string;
  summary: {
    ordiniTotali: number;
    bigliettiVenduti: number;
    abbonamentiVenduti: number;
    abbonamentiOpenVenduti: number;
    totaleEmissioni: number;
    totalePrevendita: number;
    totaleGestioneAmministrativa: number;
    totaleCommissioni: number;
    fatturatoTotale: number;
  };
  dashboard: {
    ordini: number | null;
    bigliettiEmessi: number | null;
    prevendita: number | null;
    gestioneAmministrativa: number | null;
    commissioni: number | null;
    fatturatoTotale: number | null;
    incassoComplessivo: number | null;
  };
  debug: {
    rowsWithOrderId: number;
    groupedOrderCount: number;
    ticketRowsWithOrder: number;
    subscriptionRowsWithOrder: number;
    openSubscriptionRowsWithOrder: number;
    openSubscriptionRowsWithoutOrder: number;
    standardSubscriptionDistinctKeys: number;
  };
  comparisons: {
    ordini: { left: number | null; right: number | null; delta: number | null; matches: boolean };
    abbonamentiStandard: { left: number | null; right: number | null; delta: number | null; matches: boolean };
    abbonamentiOpen: { left: number | null; right: number | null; delta: number | null; matches: boolean };
    prevendita: { left: number | null; right: number | null; delta: number | null; matches: boolean };
    gestioneAmministrativa: { left: number | null; right: number | null; delta: number | null; matches: boolean };
    commissioni: { left: number | null; right: number | null; delta: number | null; matches: boolean };
    incassoComplessivo: { left: number | null; right: number | null; delta: number | null; matches: boolean };
  };
  flags: {
    hasOpenWithoutOrder: boolean;
    standardMatchesDistinctKeys: boolean;
    openMatchesRowsWithOrder: boolean;
    ordersAligned: boolean;
    prevenditaAligned: boolean;
    gestioneAligned: boolean;
    commissioniAligned: boolean;
    incassoAligned: boolean;
  };
};

type ReconciliationResponse = {
  success: boolean;
  error?: string;
  validationMode?: string;
  validationNotes?: string[];
  flaggedDays: number;
  totalDays: number;
  flagged: ReconciliationRow[];
  results: ReconciliationRow[];
};

type SubscriptionAuditGroup = {
  key: string;
  orderNumber: string;
  titleId: string;
  cardProgressive: string;
  seal: string;
  rows: number;
  specieEmissione: string;
  reductionLabel: string;
  organizer: string;
  emissionDate: string;
  firstEmissionDateTime: string;
  eventIds: string[];
  eventDates: string[];
  eventNames: string[];
  priceFull: number;
  priceCurrent: number;
  presaleFull: number;
  presaleCurrent: number;
  managementFull: number;
  managementCurrent: number;
};

type SubscriptionAuditRow = {
  date: string;
  summary: {
    abbonamentiVenduti: number;
    standardSubscriptionDistinctKeys: number;
    groupedSubscriptions: number;
    totalRows: number;
    totaleEmissioniCurrent: number;
    totalePrevenditaCurrent: number;
    totaleGestioneCurrent: number;
    totaleEmissioniFull: number;
    totalePrevenditaFull: number;
    totaleGestioneFull: number;
    hasUniformProfile: boolean;
    uniformProfile: {
      priceCurrent: number;
      presaleCurrent: number;
      managementCurrent: number;
      priceFull: number;
      presaleFull: number;
      managementFull: number;
    } | null;
  };
  groups: SubscriptionAuditGroup[];
};

type SubscriptionAuditResponse = {
  success: boolean;
  error?: string;
  totalDays: number;
  results: SubscriptionAuditRow[];
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function startOfMonthIso() {
  const today = new Date();
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function startOfYearIso() {
  const today = new Date();
  return new Date(Date.UTC(today.getUTCFullYear(), 0, 1)).toISOString().slice(0, 10);
}

export default function TickaReconciliationPage() {
  const [from, setFrom] = useState(() => startOfYearIso());
  const [to, setTo] = useState(() => todayIso());
  const [payload, setPayload] = useState<ReconciliationResponse | null>(null);
  const [subscriptionAudit, setSubscriptionAudit] = useState<SubscriptionAuditResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ from, to });
      const [reconciliationResponse, subscriptionsResponse] = await Promise.all([
        fetch(`/api/ticka/reconciliation?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        }),
        fetch(`/api/ticka/subscriptions-audit?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        }),
      ]);

      if (!reconciliationResponse.ok) {
        throw new Error(`Riconciliazione Ticka ha risposto con stato ${reconciliationResponse.status}`);
      }

      if (!subscriptionsResponse.ok) {
        throw new Error(`Audit abbonamenti Ticka ha risposto con stato ${subscriptionsResponse.status}`);
      }

      const reconciliationData = (await reconciliationResponse.json()) as ReconciliationResponse;
      const subscriptionsData = (await subscriptionsResponse.json()) as SubscriptionAuditResponse;

      if (!reconciliationData.success) {
        throw new Error(reconciliationData.error ?? "Risposta riconciliazione non valida");
      }

      if (!subscriptionsData.success) {
        throw new Error(subscriptionsData.error ?? "Risposta audit abbonamenti non valida");
      }

      setPayload(reconciliationData);
      setSubscriptionAudit(subscriptionsData);
    } catch (loadError) {
      setPayload(null);
      setSubscriptionAudit(null);
      setError(loadError instanceof Error ? loadError.message : "Errore di caricamento");
    } finally {
      setIsLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => payload?.flagged ?? [], [payload]);
  const subscriptionRows = useMemo(
    () => subscriptionAudit?.results.filter((row) => row.summary.groupedSubscriptions > 0) ?? [],
    [subscriptionAudit]
  );
  const uniformSubscriptionRows = useMemo(
    () => subscriptionRows.filter((row) => row.summary.hasUniformProfile),
    [subscriptionRows]
  );
  const summary = useMemo(() => {
    const totalOpenWithoutOrder = rows.reduce((sum, row) => sum + row.debug.openSubscriptionRowsWithoutOrder, 0);
    const totalOpenWithOrder = rows.reduce((sum, row) => sum + row.debug.openSubscriptionRowsWithOrder, 0);
    const totalSubscriptions = rows.reduce((sum, row) => sum + row.summary.abbonamentiVenduti, 0);
    const financialMismatchDays = rows.filter(
      (row) =>
        !row.flags.prevenditaAligned ||
        !row.flags.gestioneAligned ||
        !row.flags.commissioniAligned ||
        !row.flags.incassoAligned
    ).length;

    return {
      flaggedDays: payload?.flaggedDays ?? 0,
      totalDays: payload?.totalDays ?? 0,
      totalOpenWithoutOrder,
      totalOpenWithOrder,
      totalSubscriptions,
      financialMismatchDays,
    };
  }, [payload, rows]);
  const subscriptionSummary = useMemo(() => {
    return {
      daysWithStandardSubscriptions: subscriptionRows.length,
      groupedSubscriptions: subscriptionRows.reduce((sum, row) => sum + row.summary.groupedSubscriptions, 0),
      uniformProfileDays: uniformSubscriptionRows.length,
      totaleEmissioniCurrent: subscriptionRows.reduce((sum, row) => sum + row.summary.totaleEmissioniCurrent, 0),
      totalePrevenditaCurrent: subscriptionRows.reduce((sum, row) => sum + row.summary.totalePrevenditaCurrent, 0),
      totaleGestioneCurrent: subscriptionRows.reduce((sum, row) => sum + row.summary.totaleGestioneCurrent, 0),
    };
  }, [subscriptionRows, uniformSubscriptionRows]);

  return (
    <InternalLayout requiredSection="administration">
      <div className="space-y-6">
        <section className="rounded-[28px] border border-white/70 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 p-7 text-white shadow-[0_30px_80px_-48px_rgba(15,23,42,0.9)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-200 transition hover:text-white"
              >
                <IconArrowLeft className="h-4 w-4" />
                Torna ad amministrazione
              </Link>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-amber-300/90">
                Ticka Reconciliation
              </p>
              <h1 className="mt-3 text-3xl font-semibold">Controllo KPI e anomalie sorgente</h1>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                Evidenzia anomalie della pipeline Ticka e segnala i giorni in cui esistono abbonamenti open
                senza ordine. La riconciliazione mostrata qui e&apos; una coerenza interna della nostra logica,
                non una certificazione contro un totale ufficiale esterno.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <label className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <span className="block text-xs uppercase tracking-[0.18em] text-slate-300">Da</span>
                <input
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  className="mt-2 rounded-lg bg-transparent text-sm text-white outline-none"
                />
              </label>
              <label className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <span className="block text-xs uppercase tracking-[0.18em] text-slate-300">A</span>
                <input
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  className="mt-2 rounded-lg bg-transparent text-sm text-white outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/15"
              >
                <IconRefresh className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                Aggiorna
              </button>
            </div>
          </div>
        </section>

        {payload?.validationMode === "derived-self-check" ? (
          <section className="rounded-[24px] border border-amber-300/60 bg-amber-50 px-5 py-4 text-amber-950 shadow-sm">
            <div className="flex items-start gap-3">
              <IconAlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-1 text-sm leading-6">
                <p className="font-semibold">Riconciliazione non indipendente</p>
                <p>
                  Questo report confronta numeri derivati dalla stessa pipeline applicativa. Se i valori
                  ufficiali Ticka o del backoffice sono diversi, il verde qui non basta a dichiarare il dato
                  allineato.
                </p>
                {(payload.validationNotes ?? []).map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            title="Giorni Analizzati"
            value={String(summary.totalDays)}
            description="Totale giorni processati nel range."
            icon={IconCheck}
            accentClass="bg-slate-700"
          />
          <MetricCard
            title="Giorni Segnalati"
            value={String(summary.flaggedDays)}
            description="Giorni con open senza ordine o altre anomalie sorgente."
            icon={IconAlertTriangle}
            accentClass="bg-amber-600"
          />
          <MetricCard
            title="Open con Ordine"
            value={String(summary.totalOpenWithOrder)}
            description="Somma degli abbonamenti open con orderNumber nei giorni segnalati."
            icon={IconCheck}
            accentClass="bg-emerald-600"
          />
          <MetricCard
            title="Open senza Ordine"
            value={String(summary.totalOpenWithoutOrder)}
            description="Somma degli abbonamenti open privi di orderNumber nei giorni segnalati."
            icon={IconAlertTriangle}
            accentClass="bg-rose-600"
          />
          <MetricCard
            title="Abbonamenti Std."
            value={String(summary.totalSubscriptions)}
            description="Somma degli abbonamenti standard nei giorni segnalati."
            icon={IconCheck}
            accentClass="bg-cyan-700"
          />
          <MetricCard
            title="Mismatch Finanziari"
            value={String(summary.financialMismatchDays)}
            description="Giorni in cui prevendita, gestione, commissioni o incasso non coincidono."
            icon={IconAlertTriangle}
            accentClass="bg-fuchsia-700"
          />
          <MetricCard
            title="Giorni Std."
            value={String(subscriptionSummary.daysWithStandardSubscriptions)}
            description="Giorni con almeno un abbonamento standard nei raw Ticka."
            icon={IconCheck}
            accentClass="bg-indigo-700"
          />
          <MetricCard
            title="Std. Raggruppati"
            value={String(subscriptionSummary.groupedSubscriptions)}
            description="Totale abbonamenti standard distinti raggruppati nel range."
            icon={IconCheck}
            accentClass="bg-sky-700"
          />
          <MetricCard
            title="Profili Uniformi"
            value={String(subscriptionSummary.uniformProfileDays)}
            description="Giorni in cui ogni abbonamento standard del giorno ha lo stesso valore unitario."
            icon={IconCheck}
            accentClass="bg-violet-700"
          />
          <MetricCard
            title="Emiss. Std."
            value={subscriptionSummary.totaleEmissioniCurrent.toFixed(2)}
            description="Totale emissioni current dei soli abbonamenti standard."
            icon={IconCheck}
            accentClass="bg-emerald-700"
          />
          <MetricCard
            title="Prev. Std."
            value={subscriptionSummary.totalePrevenditaCurrent.toFixed(2)}
            description="Totale prevendita current dei soli abbonamenti standard."
            icon={IconCheck}
            accentClass="bg-amber-700"
          />
          <MetricCard
            title="Gest. Std."
            value={subscriptionSummary.totaleGestioneCurrent.toFixed(2)}
            description="Totale gestione current dei soli abbonamenti standard."
            icon={IconCheck}
            accentClass="bg-teal-700"
          />
        </div>

        <SectionCard
          title="Anomalie Ordini E Abbonamenti"
          description="Allineamento tra KPI ordini, abbonamenti standard, abbonamenti open e relativi raw di controllo."
          action={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setFrom(startOfYearIso());
                  setTo(todayIso());
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                Anno corrente
              </button>
              <button
                type="button"
                onClick={() => {
                  setFrom(startOfMonthIso());
                  setTo(todayIso());
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                Mese corrente
              </button>
            </div>
          }
        >
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : rows.length === 0 && !isLoading ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Nessuna anomalia trovata nel range selezionato.
            </div>
          ) : (
            <DataTable<ReconciliationRow>
              columns={[
                { key: "date", header: "Data", render: (row) => row.date },
                {
                  key: "ordini",
                  header: "Ordini",
                  align: "right",
                  render: (row) => row.summary.ordiniTotali,
                },
                {
                  key: "abbonamenti",
                  header: "Abbonamenti",
                  align: "right",
                  render: (row) => row.summary.abbonamentiVenduti,
                },
                {
                  key: "open",
                  header: "Abbon. Open",
                  align: "right",
                  render: (row) => row.summary.abbonamentiOpenVenduti,
                },
                {
                  key: "open-with-order",
                  header: "Open con Ordine",
                  align: "right",
                  render: (row) => row.debug.openSubscriptionRowsWithOrder,
                },
                {
                  key: "open-without-order",
                  header: "Open senza Ordine",
                  align: "right",
                  render: (row) => row.debug.openSubscriptionRowsWithoutOrder,
                },
                {
                  key: "std-keys",
                  header: "Chiavi Std.",
                  align: "right",
                  render: (row) => row.debug.standardSubscriptionDistinctKeys,
                },
                {
                  key: "flags",
                  header: "Stato",
                  render: (row) => (
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        row.flags.hasOpenWithoutOrder || !row.flags.ordersAligned
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {row.flags.hasOpenWithoutOrder
                        ? "Open senza ordine"
                        : !row.flags.ordersAligned
                          ? "Ordini non allineati"
                          : "Allineato"}
                    </span>
                  ),
                },
              ]}
              rows={rows}
            />
          )}
        </SectionCard>

        <SectionCard
          title="Scostamenti KPI Finanziari"
          description="Confronto tra valori dashboard e valori summary/ordini per prevendita, gestione, commissioni e incasso complessivo."
        >
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : rows.length === 0 && !isLoading ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Nessuna anomalia trovata nel range selezionato.
            </div>
          ) : (
            <DataTable<ReconciliationRow>
              columns={[
                { key: "date", header: "Data", render: (row) => row.date },
                {
                  key: "prev-summary",
                  header: "Prev. Summary",
                  align: "right",
                  render: (row) => row.summary.totalePrevendita.toFixed(2),
                },
                {
                  key: "prev-dashboard",
                  header: "Prev. Dashboard",
                  align: "right",
                  render: (row) => row.dashboard.prevendita?.toFixed(2) ?? "-",
                },
                {
                  key: "prev-delta",
                  header: "Delta Prev.",
                  align: "right",
                  render: (row) => row.comparisons.prevendita.delta?.toFixed(2) ?? "-",
                },
                {
                  key: "gest-delta",
                  header: "Delta Gest.",
                  align: "right",
                  render: (row) => row.comparisons.gestioneAmministrativa.delta?.toFixed(2) ?? "-",
                },
                {
                  key: "comm-delta",
                  header: "Delta Comm.",
                  align: "right",
                  render: (row) => row.comparisons.commissioni.delta?.toFixed(2) ?? "-",
                },
                {
                  key: "incasso-delta",
                  header: "Delta Incasso",
                  align: "right",
                  render: (row) => row.comparisons.incassoComplessivo.delta?.toFixed(2) ?? "-",
                },
                {
                  key: "status",
                  header: "Stato",
                  render: (row) => {
                    const hasMismatch =
                      !row.flags.prevenditaAligned ||
                      !row.flags.gestioneAligned ||
                      !row.flags.commissioniAligned ||
                      !row.flags.incassoAligned;

                    return (
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          hasMismatch ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {hasMismatch ? "Da allineare" : "Allineato"}
                      </span>
                    );
                  },
                },
              ]}
              rows={rows}
            />
          )}
        </SectionCard>

        <SectionCard
          title="Audit Abbonamenti Standard"
          description="Raggruppamento dei ratei/abbonamenti standard per chiave reale, con importi current e full. Serve a capire subito se manca un abbonamento business oppure se il parser sta spezzando male i raw."
        >
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : subscriptionRows.length === 0 && !isLoading ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Nessun abbonamento standard trovato nel range selezionato.
            </div>
          ) : (
            <DataTable<SubscriptionAuditRow>
              columns={[
                { key: "date", header: "Data", render: (row) => row.date },
                {
                  key: "grouped",
                  header: "Std. Distinti",
                  align: "right",
                  render: (row) => row.summary.groupedSubscriptions,
                },
                {
                  key: "rows",
                  header: "Righe Raw",
                  align: "right",
                  render: (row) => row.summary.totalRows,
                },
                {
                  key: "em-current",
                  header: "Emiss. Current",
                  align: "right",
                  render: (row) => row.summary.totaleEmissioniCurrent.toFixed(2),
                },
                {
                  key: "pre-current",
                  header: "Prev. Current",
                  align: "right",
                  render: (row) => row.summary.totalePrevenditaCurrent.toFixed(2),
                },
                {
                  key: "gest-current",
                  header: "Gest. Current",
                  align: "right",
                  render: (row) => row.summary.totaleGestioneCurrent.toFixed(2),
                },
                {
                  key: "profile",
                  header: "Profilo Unitario",
                  render: (row) =>
                    row.summary.uniformProfile
                      ? `${row.summary.uniformProfile.priceCurrent.toFixed(2)} / ${row.summary.uniformProfile.presaleCurrent.toFixed(2)} / ${row.summary.uniformProfile.managementCurrent.toFixed(2)}`
                      : "Misto",
                },
                {
                  key: "orders",
                  header: "Ordini",
                  render: (row) => row.groups.map((group) => group.orderNumber).join(", "),
                },
                {
                  key: "reductions",
                  header: "Riduzioni",
                  render: (row) => row.groups.map((group) => group.reductionLabel).join(", "),
                },
                {
                  key: "profile-flag",
                  header: "Segnale",
                  render: (row) => (
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        row.summary.hasUniformProfile
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {row.summary.hasUniformProfile ? "Profilo uniforme" : "Profilo misto"}
                    </span>
                  ),
                },
              ]}
              rows={subscriptionRows}
            />
          )}
        </SectionCard>

        <SectionCard
          title="Date Con Profilo Uniforme"
          description="Giorni in cui tutti gli abbonamenti standard del giorno hanno lo stesso valore unitario. Sono le date piu' utili per capire subito quanto vale un eventuale abbonamento standard business mancante."
        >
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : uniformSubscriptionRows.length === 0 && !isLoading ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Nessuna data con profilo uniforme nel range selezionato.
            </div>
          ) : (
            <DataTable<SubscriptionAuditRow>
              columns={[
                { key: "date", header: "Data", render: (row) => row.date },
                {
                  key: "count",
                  header: "Std. Distinti",
                  align: "right",
                  render: (row) => row.summary.groupedSubscriptions,
                },
                {
                  key: "profile",
                  header: "Profilo Unitario",
                  render: (row) =>
                    row.summary.uniformProfile
                      ? `${row.summary.uniformProfile.priceCurrent.toFixed(2)} / ${row.summary.uniformProfile.presaleCurrent.toFixed(2)} / ${row.summary.uniformProfile.managementCurrent.toFixed(2)}`
                      : "-",
                },
                {
                  key: "delta-if-one-more",
                  header: "Se Ne Manca 1",
                  render: (row) =>
                    row.summary.uniformProfile
                      ? `+${row.summary.uniformProfile.priceCurrent.toFixed(2)} / +${row.summary.uniformProfile.presaleCurrent.toFixed(2)} / +${row.summary.uniformProfile.managementCurrent.toFixed(2)}`
                      : "-",
                },
                {
                  key: "orders",
                  header: "Ordini",
                  render: (row) => row.groups.map((group) => group.orderNumber).join(", "),
                },
                {
                  key: "organizer",
                  header: "Organizzatori",
                  render: (row) => Array.from(new Set(row.groups.map((group) => group.organizer))).join(", "),
                },
              ]}
              rows={uniformSubscriptionRows}
            />
          )}
        </SectionCard>
      </div>
    </InternalLayout>
  );
}
