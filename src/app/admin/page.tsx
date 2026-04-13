"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Eye,
  FileSpreadsheet,
  RefreshCw,
  Upload,
} from "lucide-react";
import DataTable from "@/components/dashboard/DataTable";
import InternalLayout from "@/components/layout/InternalLayout";
import {
  adminInvoiceDateFilters,
  filterInvoicesByCategory,
  filterInvoicesByState,
  computeAdminInvoiceKpis,
  DEFAULT_INVOICE_CATEGORY,
  filterInvoicesByDate,
  formatCurrency,
  formatDate,
  getCategoryOptions,
  getInvoiceStateOptions,
  isInvoicePaid,
  mapWorksheetToAdminInvoices,
  type AdminInvoiceRecord,
  type AdminInvoiceRow,
  type DateFilterKey,
} from "@/lib/admin-invoices";
import {
  fetchAdminInvoices,
  upsertAdminInvoices,
} from "@/lib/admin-invoices-repository";

type UploadSummary = {
  importedCount: number;
  lastFileName: string;
};

const initialSummary: UploadSummary = {
  importedCount: 0,
  lastFileName: "",
};

export default function AdminImportPage() {
  const [rows, setRows] = useState<AdminInvoiceRecord[]>([]);
  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterKey>("30d");
  const [invoiceStateFilter, setInvoiceStateFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isInvoiceStateFilterOpen, setIsInvoiceStateFilterOpen] = useState(false);
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [uploadSummary, setUploadSummary] = useState<UploadSummary>(initialSummary);

  const loadInvoices = async () => {
    setIsFetching(true);
    setError("");

    try {
      const data = await fetchAdminInvoices();
      setRows(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? `Impossibile caricare le fatture da Supabase: ${loadError.message}`
          : "Impossibile caricare le fatture da Supabase."
      );
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    void loadInvoices();
  }, []);

  const filteredRows = useMemo(() => {
    const dateFilteredRows = filterInvoicesByDate(rows, dateFilter, customFrom, customTo);
    const stateFilteredRows = filterInvoicesByState(dateFilteredRows, invoiceStateFilter);
    return filterInvoicesByCategory(stateFilteredRows, categoryFilter);
  }, [rows, dateFilter, customFrom, customTo, invoiceStateFilter, categoryFilter]);

  const kpis = useMemo(() => computeAdminInvoiceKpis(filteredRows), [filteredRows]);
  const categoryOptions = useMemo(() => getCategoryOptions(rows), [rows]);
  const invoiceStateOptions = useMemo(() => getInvoiceStateOptions(rows), [rows]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccessMessage("");
    setFileName(file.name);

    try {
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array", cellDates: false });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json<AdminInvoiceRow>(worksheet, {
        raw: true,
        defval: "",
      });

      const mappedRecords = mapWorksheetToAdminInvoices(jsonData);
      const savedRecords = await upsertAdminInvoices(mappedRecords);
      await loadInvoices();

      setUploadSummary({
        importedCount: savedRecords.length,
        lastFileName: file.name,
      });
      setSuccessMessage(`Import completato: ${savedRecords.length} fatture salvate.`);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? `Import non completato: ${uploadError.message}`
          : "Import non completato. Verifica il file Excel e la tabella Supabase."
      );
    } finally {
      setIsLoading(false);
      event.target.value = "";
    }
  };

  const columns = [
    {
      key: "invoice_date",
      header: "Data fattura",
      render: (row: AdminInvoiceRecord) => (
        <span className="font-medium text-dark-text">{formatDate(row.invoice_date)}</span>
      ),
    },
    {
      key: "invoice_number",
      header: "Numero fattura",
      render: (row: AdminInvoiceRecord) => (
        <p className="font-medium text-dark-text">{row.invoice_number || "Non disponibile"}</p>
      ),
    },
    {
      key: "supplier_name",
      header: "Fornitore",
      render: (row: AdminInvoiceRecord) => (
        <p className="font-medium text-dark-text">{row.supplier_name || "Non disponibile"}</p>
      ),
    },
    {
      key: "payment_amount",
      header: "Importo",
      render: (row: AdminInvoiceRecord) => (
        <span className="font-semibold text-dark-text">{formatCurrency(row.payment_amount)}</span>
      ),
    },
    {
      key: "category",
      header: "Categoria",
      render: (row: AdminInvoiceRecord) => (
        <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-sky-800 ring-1 ring-inset ring-primary/20">
          {row.category}
        </span>
      ),
    },
    {
      key: "invoice_state",
      header: "Stato",
      render: (row: AdminInvoiceRecord) => (
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
          {row.invoice_state || "Non disponibile"}
        </span>
      ),
    },
    {
      key: "is_paid",
      header: "Pagata",
      render: (row: AdminInvoiceRecord) => (
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
            isInvoicePaid(row)
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-slate-100 text-slate-700 ring-slate-200"
          }`}
        >
          {isInvoicePaid(row) ? "SI" : "NO"}
        </span>
      ),
    },
  ];

  return (
    <InternalLayout requiredSection="administration">
      <div className="space-y-6">
        <section className="rounded-[28px] border border-white/70 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 p-7 text-white shadow-[0_30px_80px_-48px_rgba(15,23,42,0.9)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/90">
                Amministrazione
              </p>
              <h1 className="mt-3 text-3xl font-semibold">Import fatture fornitori</h1>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                Carica il file Excel del gestionale, salva le fatture in Supabase e analizza KPI
                e dettaglio documenti per intervallo data.
              </p>
              <div className="mt-4">
                <Link
                  href="/admin/reconciliation"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
                >
                  <Eye className="h-4 w-4" />
                  Apri riconciliazione Ticka
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Ultimo import</p>
              <p className="mt-2 text-lg font-semibold">
                {uploadSummary.lastFileName || "Nessun file caricato in questa sessione"}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                {uploadSummary.importedCount > 0
                  ? `${uploadSummary.importedCount} record salvati`
                  : `${rows.length} fatture disponibili in archivio`}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.35)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-dark-text">Carica file fatture</h2>
                <p className="text-sm text-gray-500">
                  Formati supportati: Excel `.xlsx`, `.xls` e `.csv`
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadInvoices()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-primary hover:text-primary"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Aggiorna archivio
            </button>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <label
              htmlFor="file-upload"
              className="group flex cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-slate-300 bg-slate-50 px-8 py-10 text-center transition hover:border-primary hover:bg-primary/5"
            >
              <FileSpreadsheet className="h-12 w-12 text-slate-400 transition group-hover:text-primary" />
              <span className="mt-4 text-base font-semibold text-dark-text">
                Seleziona o trascina il file fatture
              </span>
              <span className="mt-2 text-sm text-gray-500">
                Il sistema legge la prima tabella del foglio e importa stato fattura e categoria.
              </span>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="sr-only"
                disabled={isLoading}
              />
            </label>

            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
                  Stato import
                </h3>
              </div>

              <div className="mt-4 space-y-3 text-sm text-gray-600">
                <p>
                  <span className="font-medium text-dark-text">File selezionato:</span>{" "}
                  {fileName || "Nessuno"}
                </p>
                <p>
                  <span className="font-medium text-dark-text">Archivio corrente:</span> {rows.length}{" "}
                  fatture
                </p>
                <p>
                  <span className="font-medium text-dark-text">Categoria iniziale:</span>{" "}
                  {DEFAULT_INVOICE_CATEGORY}
                </p>
              </div>

              {isLoading && (
                <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-slate-700">
                  Elaborazione file e salvataggio in Supabase in corso.
                </div>
              )}

              {successMessage && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
                  <span>{successMessage}</span>
                </div>
              )}

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.32)]">
          <div className="flex flex-col gap-5">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px_280px] xl:items-end">
              <div className="rounded-2xl bg-slate-50 px-5 py-4">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Filtri elenco fatture
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  KPI e tabella si aggiornano per data fattura, stato e categoria.
                </p>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-dark-text">Stato fattura</span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsInvoiceStateFilterOpen((current) => !current)}
                    className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <span>{invoiceStateFilter || "Tutti gli stati"}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-gray-400 transition ${isInvoiceStateFilterOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isInvoiceStateFilterOpen && (
                    <div className="absolute left-0 top-[calc(100%+8px)] z-20 max-h-72 w-full overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-[0_24px_48px_-24px_rgba(15,23,42,0.35)]">
                      <button
                        type="button"
                        onClick={() => {
                          setInvoiceStateFilter("");
                          setIsInvoiceStateFilterOpen(false);
                        }}
                        className={`flex w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                          invoiceStateFilter === ""
                            ? "bg-slate-900 text-white"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        Tutti gli stati
                      </button>
                      {invoiceStateOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setInvoiceStateFilter(option);
                            setIsInvoiceStateFilterOpen(false);
                          }}
                          className={`mt-1 flex w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                            invoiceStateFilter === option
                              ? "bg-slate-900 text-white"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-dark-text">Categoria</span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCategoryFilterOpen((current) => !current)}
                    className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <span>{categoryFilter || "Tutte le categorie"}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-gray-400 transition ${isCategoryFilterOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isCategoryFilterOpen && (
                    <div className="absolute left-0 top-[calc(100%+8px)] z-20 max-h-72 w-full overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-[0_24px_48px_-24px_rgba(15,23,42,0.35)]">
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryFilter("");
                          setIsCategoryFilterOpen(false);
                        }}
                        className={`flex w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                          categoryFilter === ""
                            ? "bg-slate-900 text-white"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        Tutte le categorie
                      </button>
                      {categoryOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setCategoryFilter(option);
                            setIsCategoryFilterOpen(false);
                          }}
                          className={`mt-1 flex w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                            categoryFilter === option
                              ? "bg-slate-900 text-white"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </label>
            </div>

            <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-50 p-2">
              {adminInvoiceDateFilters.map((option) => {
                const isActive = dateFilter === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setDateFilter(option.key)}
                    className={`rounded-full px-4 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-slate-900 text-white shadow-[0_16px_28px_-18px_rgba(15,23,42,0.85)]"
                        : "bg-white text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {dateFilter === "custom" && (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-dark-text">Data da</span>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(event) => setCustomFrom(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-dark-text">Data a</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(event) => setCustomTo(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1.2fr)]">
          <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.35)]">
            <p className="text-sm font-medium text-gray-500">Fatture pagate</p>
            <p className="mt-4 text-4xl font-semibold text-dark-text">{kpis.paidInvoices}</p>
            <p className="mt-2 text-sm text-gray-500">
              Fatture con stato `pagata` nel periodo selezionato
            </p>
          </article>

          <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.35)]">
            <p className="text-sm font-medium text-gray-500">Totale in euro fatture pagate</p>
            <p className="mt-4 text-4xl font-semibold text-dark-text">
              {formatCurrency(kpis.totalPaidAmount)}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Somma di `ImportoPagamento` per fatture con stato `pagata`
            </p>
          </article>

          <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Fatture pagate per categoria</p>
              <span className="rounded-full bg-secondary/15 px-3 py-1 text-xs font-semibold text-amber-700">
                {kpis.paidByCategory.length} categorie
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {kpis.paidByCategory.length > 0 ? (
                kpis.paidByCategory.slice(0, 5).map((item) => (
                  <div
                    key={item.category}
                    className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-dark-text">{item.category}</p>
                      <p className="text-sm font-semibold text-dark-text">
                        {formatCurrency(item.amount)}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{item.count} fatture pagate</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-gray-500">
                  Nessuna fattura pagata nel filtro selezionato.
                </div>
              )}
            </div>
          </article>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.35)]">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-dark-text">Elenco fatture fornitori</h2>
              <p className="mt-1 text-sm text-gray-500">
                Vista filtrata per data fattura, stato fattura e categoria.
              </p>
            </div>
            <p className="text-sm text-gray-500">{filteredRows.length} record nel periodo</p>
          </div>

          <div className="mt-6">
            <DataTable columns={columns} rows={filteredRows} />
          </div>
        </section>

      </div>
    </InternalLayout>
  );
}
