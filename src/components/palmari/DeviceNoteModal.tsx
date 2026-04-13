"use client";

import { X } from "lucide-react";
import type { PalmareDeviceStatus } from "@/lib/palmari";

type DeviceNoteModalProps = {
  isOpen: boolean;
  deviceName: string;
  notes: string;
  status: PalmareDeviceStatus;
  onChange: (value: string) => void;
  onStatusChange: (value: PalmareDeviceStatus) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function DeviceNoteModal({
  isOpen,
  deviceName,
  notes,
  status,
  onChange,
  onStatusChange,
  onClose,
  onSubmit,
}: DeviceNoteModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.75)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#158184]">
              Nota palmare
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">{deviceName}</h2>
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

        <div className="mt-6 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-800">Stato dispositivo</span>
            <select
              value={status}
              onChange={(event) => onStatusChange(event.target.value as PalmareDeviceStatus)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#4ec4c5] focus:ring-2 focus:ring-[#4ec4c5]/20"
            >
              <option value="disponibile">Disponibile</option>
              <option value="assegnato">Assegnato</option>
              <option value="in_rientro">In rientro</option>
              <option value="manutenzione">Manutenzione</option>
              <option value="fuori_uso">Fuori uso</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-800">Note</span>
            <textarea
              value={notes}
              onChange={(event) => onChange(event.target.value)}
              rows={6}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#4ec4c5] focus:ring-2 focus:ring-[#4ec4c5]/20"
              placeholder="Aggiungi note operative, manutenzione o consegna."
            />
          </label>
        </div>

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
            Salva nota
          </button>
        </div>
      </div>
    </div>
  );
}
