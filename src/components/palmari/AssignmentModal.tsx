"use client";

import { useState } from "react";
import { X, Save, UserPlus } from "lucide-react";
import type { PalmareAssignmentForm, PalmareDevice, PalmareOrganizer } from "@/lib/palmari";

type AssignmentModalProps = {
  isOpen: boolean;
  formState: PalmareAssignmentForm;
  devices: PalmareDevice[];
  organizers: PalmareOrganizer[];
  onChange: <K extends keyof PalmareAssignmentForm>(
    key: K,
    value: PalmareAssignmentForm[K]
  ) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function AssignmentModal({
  isOpen,
  formState,
  devices,
  organizers,
  onChange,
  onClose,
  onSubmit,
}: AssignmentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-w-2xl w-full rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Nuova Assegnazione
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Assegna un palmare a un organizzatore
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Palmare *</label>
                <select
                  value={formState.device_id}
                  onChange={(e) => onChange("device_id", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
                  required
                >
                  <option value="">Seleziona palmare</option>
                  {devices.filter(d => d.status === "disponibile").map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.code} - {device.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organizzatore *</label>
                <select
                  value={formState.organizer_id}
                  onChange={(e) => onChange("organizer_id", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
                  required
                >
                  <option value="">Seleziona organizzatore</option>
                  {organizers.map((organizer) => (
                    <option key={organizer.id} value={organizer.id}>
                      {organizer.organizer_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data inizio *</label>
                <input
                  type="date"
                  value={formState.start_date}
                  onChange={(e) => onChange("start_date", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data fine *</label>
                <input
                  type="date"
                  value={formState.end_date}
                  onChange={(e) => onChange("end_date", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
              <textarea
                value={formState.notes}
                onChange={(e) => onChange("notes", e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
                placeholder="Note sull'assegnazione..."
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-gray-200 p-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="rounded-lg bg-[#4ec4c5] px-4 py-2 text-sm font-medium text-white hover:bg-[#3bb3b4]"
          >
            <Save className="mr-2 inline h-4 w-4" />
            Crea Assegnazione
          </button>
        </div>
      </div>
    </div>
  );
}
