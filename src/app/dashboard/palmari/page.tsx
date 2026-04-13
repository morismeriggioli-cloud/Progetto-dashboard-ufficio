"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconCalendar as Calendar,
  IconCalendarEvent as CalendarRange,
  IconCircleCheck as CheckCircle,
  IconClipboardList as ClipboardList,
  IconDeviceMobile as Smartphone,
  IconEye as Eye,
  IconLoader as LoaderCircle,
  IconPencil as PencilLine,
  IconPlus as Plus,
  IconPower as PowerOff,
  IconRotateClockwise as RotateCcw,
  IconScan as ScanSearch,
  IconSettings2 as Settings2,
  IconShieldExclamation as ShieldAlert,
  IconTrash as Trash2,
  IconUserPlus as UserPlus,
  IconUsers as Users,
} from "@tabler/icons-react";
import DataTable from "@/components/dashboard/DataTable";
import MetricCard from "@/components/dashboard/MetricCard";
import SectionCard from "@/components/dashboard/SectionCard";
import InternalLayout from "@/components/layout/InternalLayout";
import DeviceNoteModal from "@/components/palmari/DeviceNoteModal";
import DeviceReturnModal from "@/components/palmari/DeviceReturnModal";
import DeviceStatusBadge from "@/components/palmari/DeviceStatusBadge";
import DeviceModal from "@/components/palmari/DeviceModal";
import OrganizerModal from "@/components/palmari/OrganizerModal";
import AssignmentModal from "@/components/palmari/AssignmentModal";
import ShowModal from "@/components/palmari/ShowModal";
import {
  buildPalmareDeviceRecord,
  buildPalmareRows,
  computePalmariKpis,
  getPalmariMockState,
  getPalmariOrganizerOptions,
  normalizePalmareDevice,
  type PalmareAssignment,
  type PalmareAssignmentForm,
  type PalmareComputedStatus,
  type PalmareDevice,
  type PalmareDeviceForm,
  type PalmareDeviceStatus,
  type PalmareOrganizer,
  type PalmareOrganizerForm,
  type PalmareOrganizerShow,
  type PalmareOrganizerShowForm,
  type PalmareReturnForm,
} from "@/lib/palmari";
import {
  createPalmareAssignment,
  createPalmareDevice,
  createPalmareOrganizer,
  createPalmareOrganizerShow,
  deletePalmareDevice,
  fetchPalmariAssignments,
  fetchPalmariDevices,
  fetchPalmariOrganizers,
  fetchPalmariOrganizerShows,
  updatePalmareDevice,
  updatePalmareDeviceRecord,
  updatePalmareOrganizer,
  returnPalmareDevice,
  fetchPalmareTracking,
} from "@/lib/palmari-repository";

type PalmariTab = "censimento" | "organizzatori" | "disponibilita";

const initialDeviceForm: PalmareDeviceForm = {
  code: "",
  name: "",
  base_location: "",
  assigned_gate: "",
  status: "disponibile",
  notes: "",
};

const initialOrganizerForm: PalmareOrganizerForm = {
  organizer_name: "",
  contact_name: "",
  email: "",
  phone: "",
  notes: "",
};

const initialAssignmentForm: PalmareAssignmentForm = {
  device_id: "",
  organizer_id: "",
  organizer_name: "",
  start_date: "",
  end_date: "",
  notes: "",
};

const initialShowForm: PalmareOrganizerShowForm = {
  organizer_id: "",
  show_name: "",
  show_date: "",
  location: "",
  notes: "",
};

function formatDateLabel(date: string) {
  if (!date) {
    return "Non disponibile";
  }

  return new Date(`${date}T00:00:00`).toLocaleDateString("it-IT");
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatShows(shows: PalmareOrganizerShow[]) {
  if (shows.length === 0) {
    return "Nessuno spettacolo nel periodo";
  }

  return shows.map((show) => {
    const startDate = formatDateLabel(show.show_date);
    const endDate = show.notes?.split('|')[0] ? formatDateLabel(show.notes.split('|')[0]) : "";
    const dateRange = endDate ? `${startDate} - ${endDate}` : startDate;
    return `${dateRange} ${show.show_name}`;
  }).join(" | ");
}

function shouldUseSessionFallback(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("load failed")
  );
}

export default function PalmariPage() {
  const mockState = useMemo(() => getPalmariMockState(), []);
  const [devices, setDevices] = useState<PalmareDevice[]>([]);
  const [organizers, setOrganizers] = useState<PalmareOrganizer[]>([]);
  const [assignments, setAssignments] = useState<PalmareAssignment[]>([]);
  const [organizerShows, setOrganizerShows] = useState<PalmareOrganizerShow[]>([]);
  const [, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [tempStartDate, setTempStartDate] = useState(todayIso());
  const [tempEndDate, setTempEndDate] = useState(addDaysIso(14));
  const [tempOrganizerId, setTempOrganizerId] = useState("");
  const [tempStatus, setTempStatus] = useState<"Tutti" | PalmareComputedStatus>("Tutti");
  const [appliedStartDate, setAppliedStartDate] = useState(todayIso());
  const [appliedEndDate, setAppliedEndDate] = useState(addDaysIso(14));
  const [appliedOrganizerId, setAppliedOrganizerId] = useState("");
  const [appliedStatus, setAppliedStatus] = useState<"Tutti" | PalmareComputedStatus>("Tutti");
  const [activeTab, setActiveTab] = useState<PalmariTab>("censimento");
  const [deviceForm, setDeviceForm] = useState<PalmareDeviceForm>(initialDeviceForm);
  const [organizerForm, setOrganizerForm] = useState<PalmareOrganizerForm>(initialOrganizerForm);
  const [assignmentForm, setAssignmentForm] = useState<PalmareAssignmentForm>(initialAssignmentForm);
  const [showForm, setShowForm] = useState<PalmareOrganizerShowForm>(initialShowForm);
  const [deviceEditorMode, setDeviceEditorMode] = useState<"create" | "edit">("create");
  const [deviceEditorDeviceId, setDeviceEditorDeviceId] = useState<string | null>(null);
  const [organizerEditId, setOrganizerEditId] = useState<string | null>(null);
  const [noteDeviceId, setNoteDeviceId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<PalmareDeviceStatus>("disponibile");
  const [returnModalDeviceId, setReturnModalDeviceId] = useState<string | null>(null);
  
  // Stati per modali separati
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isOrganizerModalOpen, setIsOrganizerModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isShowModalOpen, setIsShowModalOpen] = useState(false);

  const loadPalmariData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    setInfoMessage("");

    const [devicesResult, organizersResult, assignmentsResult, showsResult] =
      await Promise.allSettled([
        fetchPalmariDevices(),
        fetchPalmariOrganizers(),
        fetchPalmariAssignments(),
        fetchPalmariOrganizerShows(),
      ]);

    const warnings: string[] = [];

    if (devicesResult.status === "fulfilled") {
      setDevices(devicesResult.value);
    } else {
      setDevices(mockState.devices);
      warnings.push("devices");
    }

    if (organizersResult.status === "fulfilled") {
      setOrganizers(organizersResult.value);
    } else {
      setOrganizers(mockState.organizers);
      warnings.push("organizers");
    }

    if (assignmentsResult.status === "fulfilled") {
      setAssignments(assignmentsResult.value);
    } else {
      setAssignments(mockState.assignments);
      warnings.push("device_assignments");
    }

    if (showsResult.status === "fulfilled") {
      setOrganizerShows(showsResult.value);
    } else {
      setOrganizerShows(mockState.organizerShows);
      warnings.push("organizer_shows");
    }

    if (warnings.length > 0) {
      setInfoMessage(
        `Alcune tabelle non sono disponibili su Supabase. La dashboard sta usando fallback locale per: ${warnings.join(", ")}.`
      );
    }

    setIsLoading(false);
  }, [mockState]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPalmariData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadPalmariData]);

  const validationMessage = useMemo(() => {
    if (!tempStartDate || !tempEndDate) {
      return "Inserisci Data da e Data a per la verifica disponibilita.";
    }

    if (tempStartDate > tempEndDate) {
      return "La Data da deve essere precedente o uguale alla Data a.";
    }

    return null;
  }, [tempEndDate, tempStartDate]);

  const rows = useMemo(
    () =>
      buildPalmareRows(devices, organizers, assignments, organizerShows, {
        appliedStatus,
        appliedStartDate,
        appliedEndDate,
        appliedOrganizerId,
      }),
    [devices, organizers, assignments, organizerShows, appliedStatus, appliedStartDate, appliedEndDate, appliedOrganizerId]
  );

  const kpis = useMemo(() => computePalmariKpis(rows), [rows]);

  const inventoryRows = useMemo(
    () =>
      rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        base_location: row.base_location,
        assigned_gate: row.assigned_gate,
        status: row.status,
        notes: row.notes,
        computedStatus: row.computedStatus,
        currentOrganizer: row.currentOrganizer,
        overlappingAssignment: row.overlappingAssignment,
        organizerShowsInPeriod: row.organizerShowsInPeriod,
        outcome: row.outcome,
        assignmentHistory: row.assignmentHistory,
      })),
    [rows]
  );

  const organizerSummaries = useMemo(() => {
    const organizerMap = new Map<string, PalmareOrganizer & { activeDevices: number; showsCount: number }>();

    organizers.forEach((organizer) => {
      organizerMap.set(organizer.id, {
        ...organizer,
        activeDevices: 0,
        showsCount: 0,
      });
    });

    assignments.forEach((assignment) => {
      const organizer = organizerMap.get(assignment.organizer_id);
      if (organizer) {
        organizer.activeDevices += 1;
      }
    });

    organizerShows.forEach((show) => {
      const organizer = organizerMap.get(show.organizer_id);
      if (organizer) {
        organizer.showsCount += 1;
      }
    });

    return Array.from(organizerMap.values()).sort((a, b) =>
      a.organizer_name.localeCompare(b.organizer_name, "it")
    );
  }, [organizers, assignments, organizerShows]);

  const openNoteModal = (deviceId: string) => {
    const device = devices.find((item) => item.id === deviceId);
    setNoteDeviceId(deviceId);
    setNoteDraft(device?.notes ?? "");
    setStatusDraft((device?.status ?? "disponibile") as PalmareDeviceStatus);
  };

  const closeDeviceEditor = () => {
    setDeviceEditorMode("create");
    setDeviceEditorDeviceId(null);
    setDeviceForm(initialDeviceForm);
  };

  const saveDevice = async () => {
    if (!deviceForm.code || !deviceForm.name || !deviceForm.base_location) {
      setError("Compila codice, descrizione e base location del palmare.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      if (deviceEditorMode === "create") {
        await createPalmareDevice(deviceForm);
        setSuccessMessage("Palmare creato correttamente.");
      } else {
        await updatePalmareDevice(deviceEditorDeviceId!, deviceForm);
        setSuccessMessage("Palmare aggiornato correttamente.");
      }
      await loadPalmariData();
      closeDeviceEditor();
    } catch (error) {
      setError(shouldUseSessionFallback(error) ? "Errore di rete. Riprova più tardi." : `Errore: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
      setNoteDeviceId(null);
      setNoteDraft("");
      setStatusDraft("disponibile");
    }
  };

  const openReturnModal = (deviceId: string) => {
    setReturnModalDeviceId(deviceId);
  };

  const closeReturnModal = () => {
    setReturnModalDeviceId(null);
  };

  const handleDeviceReturn = async (returnForm: PalmareReturnForm) => {
    try {
      await returnPalmareDevice(returnForm);
      setSuccessMessage("Dispositivo segnato come rientrato correttamente.");
      await loadPalmariData();
      closeReturnModal();
    } catch (error) {
      setError(shouldUseSessionFallback(error) ? "Errore di rete. Riprova più tardi." : `Errore: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const openTrackingModal = async (deviceId: string) => {
    try {
      const records = await fetchPalmareTracking(deviceId);
      setInfoMessage(`Storico palmare caricato: ${records.length} movimenti trovati.`);
    } catch (error) {
      setError(shouldUseSessionFallback(error) ? "Errore di rete. Riprova più tardi." : `Errore: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const openDeviceEditor = (deviceId?: string) => {
    if (deviceId) {
      const row = inventoryRows.find((item) => item.id === deviceId);
      if (!row) return;
      
      setDeviceEditorMode("edit");
      setDeviceEditorDeviceId(deviceId);
      setDeviceForm({
        code: row.code,
        name: row.name,
        base_location: row.base_location,
        assigned_gate: row.assigned_gate,
        status: row.status as PalmareDeviceStatus,
        notes: row.notes,
      });
    } else {
      setDeviceEditorMode("create");
      setDeviceEditorDeviceId(null);
      setDeviceForm(initialDeviceForm);
    }
    setIsDeviceModalOpen(true);
  };

  const openOrganizerEditor = (organizerId?: string) => {
    if (organizerId) {
      const organizer = organizers.find((o) => o.id === organizerId);
      if (!organizer) return;
      
      setOrganizerEditId(organizerId);
      setOrganizerForm({
        organizer_name: organizer.organizer_name,
        contact_name: organizer.contact_name || "",
        email: organizer.email || "",
        phone: organizer.phone || "",
        notes: organizer.notes || "",
      });
    } else {
      setOrganizerEditId(null);
      setOrganizerForm(initialOrganizerForm);
    }
    setIsOrganizerModalOpen(true);
  };

  const openAssignmentEditor = () => {
    setAssignmentForm(initialAssignmentForm);
    setIsAssignmentModalOpen(true);
  };

  const openShowEditor = () => {
    setShowForm(initialShowForm);
    setIsShowModalOpen(true);
  };

  const closeDeviceModal = () => {
    setIsDeviceModalOpen(false);
    setDeviceEditorMode("create");
    setDeviceEditorDeviceId(null);
    setDeviceForm(initialDeviceForm);
  };

  const closeOrganizerModal = () => {
    setIsOrganizerModalOpen(false);
    setOrganizerEditId(null);
    setOrganizerForm(initialOrganizerForm);
  };

  const closeAssignmentModal = () => {
    setIsAssignmentModalOpen(false);
    setAssignmentForm(initialAssignmentForm);
  };

  const closeShowModal = () => {
    setIsShowModalOpen(false);
    setShowForm(initialShowForm);
  };

  const saveOrganizer = async () => {
    if (!organizerForm.organizer_name) {
      setError("Compila il nome dell'organizzatore.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      if (organizerEditId) {
        await updatePalmareOrganizer(organizerEditId, organizerForm);
        setSuccessMessage("Organizzatore aggiornato correttamente.");
      } else {
        await createPalmareOrganizer(organizerForm);
        setSuccessMessage("Organizzatore creato correttamente.");
      }
      await loadPalmariData();
      closeOrganizerModal();
    } catch (error) {
      setError(shouldUseSessionFallback(error) ? "Errore di rete. Riprova più tardi." : `Errore: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const saveAssignment = async () => {
    if (!assignmentForm.device_id || !assignmentForm.organizer_id || !assignmentForm.start_date || !assignmentForm.end_date) {
      setError("Compila tutti i campi obbligatori dell'assegnazione.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await createPalmareAssignment(assignmentForm);
      setSuccessMessage("Assegnazione creata correttamente.");
      await loadPalmariData();
      closeAssignmentModal();
    } catch (error) {
      setError(shouldUseSessionFallback(error) ? "Errore di rete. Riprova più tardi." : `Errore: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const saveShow = async () => {
    if (!showForm.organizer_id || !showForm.show_name || !showForm.show_date) {
      setError("Compila tutti i campi obbligatori dello spettacolo.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await createPalmareOrganizerShow(showForm);
      setSuccessMessage("Spettacolo creato correttamente.");
      await loadPalmariData();
      closeShowModal();
    } catch (error) {
      setError(shouldUseSessionFallback(error) ? "Errore di rete. Riprova più tardi." : `Errore: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const saveDeviceState = async () => {
    if (!noteDeviceId) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await updatePalmareDeviceRecord(noteDeviceId, {
        code: noteDevice?.code || "",
        name: noteDevice?.name || "",
        base_location: noteDevice?.base_location || "",
        assigned_gate: noteDevice?.assigned_gate || "",
        status: statusDraft,
        notes: noteDraft,
      });

      setDevices((current) =>
        current.map((device) =>
          device.id === noteDeviceId
            ? {
                ...device,
                notes: noteDraft,
                status: statusDraft,
              }
            : device
        )
      );

      setSuccessMessage("Stato palmare aggiornato correttamente.");
    } catch (error) {
      setError(shouldUseSessionFallback(error) ? "Errore di rete. Riprova più tardi." : `Errore: ${error instanceof Error ? error.message : String(error)}`);

      const localDevice = normalizePalmareDevice({
        ...buildPalmareDeviceRecord(
          {
            code: "",
            name: "",
            base_location: "",
            assigned_gate: "",
            status: statusDraft,
            notes: noteDraft,
          },
          noteDeviceId
        ),
        created_at: new Date().toISOString(),
      });

      setDevices((current) =>
        current.map((device) => (device.id === noteDeviceId ? localDevice : device))
      );

      setSuccessMessage("Stato palmare aggiornato in locale.");
      setInfoMessage(
        "Aggiornamento Supabase non disponibile per questo palmare. La modifica resta nella sessione corrente."
      );
    } finally {
      setIsSaving(false);
      setNoteDeviceId(null);
      setNoteDraft("");
      setStatusDraft("disponibile");
    }
  };

  const deleteDevice = async (deviceId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo palmare?")) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await deletePalmareDevice(deviceId);
      setSuccessMessage("Palmare eliminato correttamente.");
      await loadPalmariData();
    } catch (error) {
      setError(shouldUseSessionFallback(error) ? "Errore di rete. Riprova più tardi." : `Errore: ${error instanceof Error ? error.message : String(error)}`);

      setDevices((current) => current.filter((device) => device.id !== deviceId));
      setSuccessMessage("Palmare eliminato in locale.");
      setInfoMessage(
        "Eliminazione Supabase non disponibile per questo palmare. La modifica resta nella sessione corrente."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const noteDevice = inventoryRows.find((row) => row.id === noteDeviceId);

  const returnDevice = returnModalDeviceId ? inventoryRows.find((row) => row.id === returnModalDeviceId) : null;

  return (
    <InternalLayout requiredSection="devices">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[30px] border border-[#d8eceb] bg-[linear-gradient(135deg,#f8fbfb_0%,#ffffff_52%,#edf7f5_100%)] shadow-[0_24px_60px_-44px_rgba(15,23,42,0.45)]">
          <div className="grid gap-6 px-7 py-7 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#158184]">
                Gestione Palmari
              </p>
              <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.03em] text-slate-950">
                Dispositivi Mobile
              </h1>
              <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-600">
                Gestisci l&apos;inventario dei palmari, le assegnazioni agli organizzatori e traccia lo stato di
                ogni dispositivo.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                title="Dispositivi"
                value={String(kpis.total)}
                description="Numero totale di palmari nel sistema"
                icon={Smartphone}
                accentClass="bg-[#4ec4c5]"
              />
              <MetricCard
                title="Disponibili"
                value={String(kpis.available)}
                description="Palmari disponibili per nuove assegnazioni"
                icon={CheckCircle}
                accentClass="bg-emerald-500"
              />
              <MetricCard
                title="In rientro"
                value={String(kpis.inReturn)}
                description="Palmari in fase di rientro"
                icon={RotateCcw}
                accentClass="bg-blue-500"
              />
              <MetricCard
                title="Fuori uso"
                value={String(kpis.outOfService)}
                description="Palmari non funzionanti o dismessi"
                icon={PowerOff}
                accentClass="bg-red-500"
              />
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white px-7 py-6 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.45)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("censimento")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  activeTab === "censimento"
                    ? "bg-[#4ec4c5] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Smartphone className="mr-2 inline h-4 w-4" />
                Censimento
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("organizzatori")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  activeTab === "organizzatori"
                    ? "bg-[#4ec4c5] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Users className="mr-2 inline h-4 w-4" />
                Organizzatori
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("disponibilita")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  activeTab === "disponibilita"
                    ? "bg-[#4ec4c5] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <CalendarRange className="mr-2 inline h-4 w-4" />
                Disponibilità
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => openDeviceEditor()}
                className="rounded-xl bg-[#4ec4c5] px-4 py-2 text-sm font-medium text-white hover:bg-[#3bb3b4] transition"
              >
                <Plus className="mr-2 inline h-4 w-4" />
                Nuovo Palmare
              </button>
              <button
                type="button"
                onClick={() => openOrganizerEditor()}
                className="rounded-xl border border-[#4ec4c5] bg-white px-4 py-2 text-sm font-medium text-[#4ec4c5] hover:bg-[#4ec4c5] hover:text-white transition"
              >
                <Users className="mr-2 inline h-4 w-4" />
                Nuovo Organizzatore
              </button>
              <button
                type="button"
                onClick={() => openAssignmentEditor()}
                className="rounded-xl border border-[#4ec4c5] bg-white px-4 py-2 text-sm font-medium text-[#4ec4c5] hover:bg-[#4ec4c5] hover:text-white transition"
              >
                <UserPlus className="mr-2 inline h-4 w-4" />
                Nuova Assegnazione
              </button>
              <button
                type="button"
                onClick={() => openShowEditor()}
                className="rounded-xl border border-[#4ec4c5] bg-white px-4 py-2 text-sm font-medium text-[#4ec4c5] hover:bg-[#4ec4c5] hover:text-white transition"
              >
                <Calendar className="mr-2 inline h-4 w-4" />
                Nuovo Spettacolo
              </button>
            </div>
          </div>
        </section>

        {activeTab === "censimento" && (
          <SectionCard
            title="Inventario Dispositivi"
            description="Elenco completo dei palmari con stato e assegnazioni correnti."
          >
            <DataTable
              columns={[
                { key: "code", header: "Licenza Palmare", render: (row: (typeof inventoryRows)[number]) => row.code },
                { key: "name", header: "DCA", render: (row: (typeof inventoryRows)[number]) => row.name },
                { key: "base", header: "Locale/base", render: (row: (typeof inventoryRows)[number]) => row.base_location || "Non disponibile" },
                { key: "gate", header: "SIM", render: (row: (typeof inventoryRows)[number]) => row.assigned_gate || "Non assegnato" },
                { key: "sim", header: "Tel. SIM", render: (row: (typeof inventoryRows)[number]) => row.notes?.split('|')[0] || "Non disponibile" },
                {
                  key: "status",
                  header: "Stato",
                  render: (row: (typeof inventoryRows)[number]) => (
                    <DeviceStatusBadge status={row.computedStatus} />
                  ),
                },
                {
                  key: "org",
                  header: "Organizzatore attuale",
                  render: (row: (typeof inventoryRows)[number]) => row.currentOrganizer?.organizer_name ?? "Nessuno",
                },
                {
                  key: "actions",
                  header: "Azioni",
                  render: (row: (typeof inventoryRows)[number]) => (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openDeviceEditor(row.id)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-[#4ec4c5] hover:text-[#158184]"
                        >
                          <PencilLine className="mr-1 inline h-3 w-3" />
                          Modifica
                        </button>
                        <button
                          type="button"
                          onClick={() => openNoteModal(row.id)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-[#4ec4c5] hover:text-[#158184]"
                        >
                          <Settings2 className="mr-1 inline h-3 w-3" />
                          Stato
                        </button>
                        {row.computedStatus === "Occupato" && (
                          <button
                            type="button"
                            onClick={() => openReturnModal(row.id)}
                            className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                          >
                            <RotateCcw className="mr-1 inline h-3 w-3" />
                            Rientra
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openTrackingModal(row.id)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-[#4ec4c5] hover:text-[#158184]"
                        >
                          <ClipboardList className="mr-1 inline h-3 w-3" />
                          Storico
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteDevice(row.id)}
                          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100"
                        >
                          <Trash2 className="mr-1 inline h-3 w-3" />
                          Elimina
                        </button>
                      </div>
                    </div>
                  ),
                },
              ]}
              rows={inventoryRows}
            />
          </SectionCard>
        )}

        {activeTab === "organizzatori" && (
          <SectionCard
            title="Organizzatori"
            description="Gestisci gli organizzatori e visualizza i dispositivi assegnati."
          >
            <DataTable
              columns={[
                { key: "name", header: "Nome organizzatore", render: (row: (typeof organizerSummaries)[number]) => row.organizer_name },
                { key: "contact", header: "Referente", render: (row: (typeof organizerSummaries)[number]) => row.contact_name || "Non disponibile" },
                { key: "email", header: "Email", render: (row: (typeof organizerSummaries)[number]) => row.email || "Non disponibile" },
                { key: "phone", header: "Telefono", render: (row: (typeof organizerSummaries)[number]) => row.phone || "Non disponibile" },
                { key: "active", header: "Palmari attivi", render: (row: (typeof organizerSummaries)[number]) => String(row.activeDevices) },
                { key: "shows", header: "Numero spettacoli", render: (row: (typeof organizerSummaries)[number]) => String(row.showsCount) },
                {
                  key: "actions",
                  header: "Azioni",
                  render: (row: (typeof organizerSummaries)[number]) => (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("disponibilita");
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-[#4ec4c5] hover:text-[#158184]"
                      >
                        <Eye className="mr-1 inline h-3 w-3" />
                        Dettagli
                      </button>
                      <button
                        type="button"
                        onClick={() => openOrganizerEditor(row.id)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-[#4ec4c5] hover:text-[#158184]"
                      >
                        <PencilLine className="mr-1 inline h-3 w-3" />
                        Modifica
                      </button>
                    </div>
                  ),
                },
              ]}
              rows={organizerSummaries}
            />
          </SectionCard>
        )}

        {activeTab === "disponibilita" && (
          <SectionCard
            title="Verifica Disponibilità"
            description="Controlla la disponibilità dei palmari in un periodo specifico."
          >
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Data da</label>
                  <input
                    type="date"
                    value={tempStartDate}
                    onChange={(e) => setTempStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Data a</label>
                  <input
                    type="date"
                    value={tempEndDate}
                    onChange={(e) => setTempEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Organizzatore</label>
                  <select
                    value={tempOrganizerId}
                    onChange={(e) => setTempOrganizerId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
                  >
                    <option value="">Tutti</option>
                    {getPalmariOrganizerOptions(organizers).map((organizer) => (
                      <option key={organizer.id} value={organizer.id}>
                        {organizer.organizer_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Stato</label>
                  <select
                    value={tempStatus}
                    onChange={(e) => setTempStatus(e.target.value as "Tutti" | PalmareComputedStatus)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
                  >
                    <option value="Tutti">Tutti</option>
                    <option value="Disponibile">Disponibile</option>
                    <option value="Occupato">Occupato</option>
                    <option value="Recuperabile">Recuperabile</option>
                    <option value="In manutenzione">In manutenzione</option>
                    <option value="In rientro">In rientro</option>
                    <option value="Fuori uso">Fuori uso</option>
                  </select>
                </div>
              </div>
              {validationMessage && (
                <div className="rounded-xl border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <ShieldAlert className="mr-2 inline h-4 w-4" />
                  {validationMessage}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAppliedStartDate(tempStartDate);
                    setAppliedEndDate(tempEndDate);
                    setAppliedOrganizerId(tempOrganizerId);
                    setAppliedStatus(tempStatus);
                  }}
                  disabled={!!validationMessage}
                  className="rounded-xl bg-[#4ec4c5] px-4 py-2 text-sm font-medium text-white hover:bg-[#3bb3b4] transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ScanSearch className="mr-2 inline h-4 w-4" />
                  Verifica Disponibilità
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTempStatus("Tutti");
                    setTempOrganizerId("");
                    setTempStartDate(todayIso());
                    setTempEndDate(addDaysIso(14));
                    setAppliedStatus("Tutti");
                    setAppliedOrganizerId("");
                    setAppliedStartDate(todayIso());
                    setAppliedEndDate(addDaysIso(14));
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Reset Filtri
                </button>
              </div>
            </div>

            {rows.length > 0 && (
              <div className="mt-6">
                <DataTable
                  columns={[
                    { key: "code", header: "Licenza", render: (row: (typeof rows)[number]) => row.code },
                    { key: "name", header: "DCA", render: (row: (typeof rows)[number]) => row.name },
                    { key: "base", header: "Base", render: (row: (typeof rows)[number]) => row.base_location },
                    { key: "sim", header: "Tel. SIM", render: (row: (typeof rows)[number]) => row.notes?.split('|')[0] || "Non disponibile" },
                    {
                      key: "status",
                      header: "Stato",
                      render: (row: (typeof rows)[number]) => (
                        <DeviceStatusBadge status={row.computedStatus} />
                      ),
                    },
                    {
                      key: "org",
                      header: "Organizzatore",
                      render: (row: (typeof rows)[number]) => row.currentOrganizer?.organizer_name ?? "Nessuno",
                    },
                    {
                      key: "from",
                      header: "Assegnazione",
                      render: (row: (typeof rows)[number]) =>
                        row.overlappingAssignment
                          ? `${formatDateLabel(row.overlappingAssignment.start_date)} - ${formatDateLabel(
                              row.overlappingAssignment.end_date
                            )}`
                          : "Nessuna",
                    },
                    {
                      key: "shows",
                      header: "Spettacoli",
                      render: (row: (typeof rows)[number]) => formatShows(row.organizerShowsInPeriod),
                    },
                    {
                      key: "outcome",
                      header: "Esito",
                      render: (row: (typeof rows)[number]) => (
                        <span className="text-sm text-slate-600">{row.outcome}</span>
                      ),
                    },
                  ]}
                  rows={rows}
                />
              </div>
            )}
          </SectionCard>
        )}
      </div>

      <DeviceNoteModal
        isOpen={Boolean(noteDevice)}
        deviceName={noteDevice?.name ?? ""}
        notes={noteDraft}
        status={statusDraft}
        onChange={setNoteDraft}
        onStatusChange={setStatusDraft}
        onClose={() => {
          setNoteDeviceId(null);
          setNoteDraft("");
          setStatusDraft("disponibile");
        }}
        onSubmit={() => void saveDeviceState()}
      />

      <DeviceReturnModal
        isOpen={Boolean(returnModalDeviceId)}
        onClose={closeReturnModal}
        onConfirm={handleDeviceReturn}
        deviceCode={returnDevice?.id ?? ""}
        deviceName={returnDevice?.name ?? ""}
        currentUserId="current-user" // TODO: Get from auth context
      />

      {/* Modali separati per ogni tipo */}
      <DeviceModal
        isOpen={isDeviceModalOpen}
        mode={deviceEditorMode}
        formState={deviceForm}
        onChange={(key, value) => setDeviceForm(prev => ({ ...prev, [key]: value }))}
        onClose={closeDeviceModal}
        onSubmit={() => void saveDevice()}
      />

      <OrganizerModal
        isOpen={isOrganizerModalOpen}
        mode={organizerEditId ? "edit" : "create"}
        formState={organizerForm}
        onChange={(key, value) => setOrganizerForm(prev => ({ ...prev, [key]: value }))}
        onClose={closeOrganizerModal}
        onSubmit={() => void saveOrganizer()}
      />

      <AssignmentModal
        isOpen={isAssignmentModalOpen}
        formState={assignmentForm}
        devices={devices}
        organizers={organizers}
        onChange={(key, value) => setAssignmentForm(prev => ({ ...prev, [key]: value }))}
        onClose={closeAssignmentModal}
        onSubmit={() => void saveAssignment()}
      />

      <ShowModal
        isOpen={isShowModalOpen}
        formState={showForm}
        organizers={organizers}
        onChange={(key, value) => setShowForm(prev => ({ ...prev, [key]: value }))}
        onClose={closeShowModal}
        onSubmit={() => void saveShow()}
      />

      {isSaving ? (
        <div className="pointer-events-none fixed bottom-6 right-6 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-lg">
          <LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />
          Salvataggio in corso
        </div>
      ) : null}

      {error && (
        <div className="fixed bottom-6 right-6 rounded-2xl bg-red-500 px-4 py-3 text-sm font-medium text-white shadow-lg">
          <ShieldAlert className="mr-2 inline h-4 w-4" />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="fixed bottom-6 right-6 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg">
          <CheckCircle className="mr-2 inline h-4 w-4" />
          {successMessage}
        </div>
      )}

      {infoMessage && (
        <div className="fixed bottom-6 right-6 rounded-2xl bg-blue-500 px-4 py-3 text-sm font-medium text-white shadow-lg">
          <ShieldAlert className="mr-2 inline h-4 w-4" />
          {infoMessage}
        </div>
      )}
    </InternalLayout>
  );
}
