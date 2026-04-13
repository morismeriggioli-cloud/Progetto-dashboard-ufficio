"use client";

import { X } from "lucide-react";
import type { PalmareAssignmentForm, PalmareDevice } from "@/lib/palmari";

type DeviceAssignmentModalProps = {
  isOpen: boolean;
  mode: "assign" | "edit";
  title: string;
  devices: PalmareDevice[];
  formState: PalmareAssignmentForm;
  onChange: <K extends keyof PalmareAssignmentForm>(
    key: K,
    value: PalmareAssignmentForm[K]
  ) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function DeviceAssignmentModal({
  isOpen,
  mode,
  title,
  devices,
  formState,
  onChange,
  onClose,
  onSubmit,
}: DeviceAssignmentModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.75)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#158184]">
              Palmari
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">{title}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {mode === "assign"
                ? "Assegna un palmare a un organizzatore con validita temporale definita."
                : "Aggiorna l'assegnazione attiva dell'organizzatore senza perdere lo storico."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="Chiudi finestra"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-800">Palmare</span>
            <select
              value={formState.device_id}
              onChange={(event) => onChange("device_id", event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#4ec4c5] focus:ring-2 focus:ring-[#4ec4c5]/20"
            >
              <option value="">Seleziona un palmare</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.external_id} | {device.device_name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-800">Organizzatore</span>
            <input
              type="text"
              value={formState.organizer_name}
              onChange={(event) => {
                onChange("organizer_name", event.target.value);
                onChange(
                  "organizer_id",
                  event.target.value
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/(^-|-$)/g, "")
                );
              }}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#4ec4c5] focus:ring-2 focus:ring-[#4ec4c5]/20"
              placeholder="Nome organizzatore"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-800">Data inizio</span>
            <input
              type="date"
              value={formState.start_date}
              onChange={(event) => onChange("start_date", event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#4ec4c5] focus:ring-2 focus:ring-[#4ec4c5]/20"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-800">Data fine</span>
            <input
              type="date"
              value={formState.end_date}
              onChange={(event) => onChange("end_date", event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#4ec4c5] focus:ring-2 focus:ring-[#4ec4c5]/20"
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-medium text-slate-800">Note</span>
          <textarea
            value={formState.notes}
            onChange={(event) => onChange("notes", event.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#4ec4c5] focus:ring-2 focus:ring-[#4ec4c5]/20"
            placeholder="Annotazioni operative"
          />
        </label>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="rounded-2xl bg-[#158184] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_-20px_rgba(21,129,132,0.9)] transition hover:bg-[#116b6d]"
          >
            {mode === "assign" ? "Salva assegnazione" : "Aggiorna assegnazione"}
          </button>
        </div>
      </div>
    </div>
  );
}
