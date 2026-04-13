"use client";

import { useState } from "react";
import { X, Save, Smartphone } from "lucide-react";
import type { PalmareDeviceForm, PalmareDeviceStatus } from "@/lib/palmari";

type DeviceModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  formState: PalmareDeviceForm;
  onChange: <K extends keyof PalmareDeviceForm>(
    key: K,
    value: PalmareDeviceForm[K]
  ) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function DeviceModal({
  isOpen,
  mode,
  formState,
  onChange,
  onClose,
  onSubmit,
}: DeviceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-w-2xl w-full rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {mode === "create" ? "Nuovo" : "Modifica"} Palmare
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Compila i campi per {mode === "create" ? "creare" : "modificare"} un palmare
              <br />
              <span className="text-xs">(DCA = Descrizione Completa Apparato)</span>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Licenza Palmare *</label>
                <input
                  type="text"
                  value={formState.code}
                  onChange={(e) => onChange("code", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
                  placeholder="es: DEV001"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DCA *</label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(e) => onChange("name", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
                  placeholder="es: Palmare Android 10 pollici"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Locale/Base *</label>
                <input
                  type="text"
                  value={formState.base_location}
                  onChange={(e) => onChange("base_location", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
                  placeholder="es: Magazzino Centrale"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SIM</label>
                <select
                  value={formState.assigned_gate}
                  onChange={(e) => onChange("assigned_gate", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
                >
                  <option value="">Non assegnato</option>
                  <option value="SI">SI</option>
                  <option value="NO">NO</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numero Telefonico SIM</label>
                <input
                  type="tel"
                  value={formState.notes?.split('|')[0] || ""}
                  onChange={(e) => {
                    const currentNotes = formState.notes || "";
                    const simNumber = e.target.value;
                    const otherNotes = currentNotes.includes('|') ? currentNotes.split('|')[1] : "";
                    onChange("notes", simNumber ? (otherNotes ? `${simNumber}|${otherNotes}` : simNumber) : otherNotes);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
                  placeholder="es: 3331234567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
              <select
                value={formState.status}
                onChange={(e) => onChange("status", e.target.value as PalmareDeviceStatus)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
              >
                <option value="disponibile">Disponibile</option>
                <option value="assegnato">Assegnato</option>
                <option value="in_rientro">In rientro</option>
                <option value="manutenzione">Manutenzione</option>
                <option value="fuori_uso">Fuori uso</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
              <textarea
                value={formState.notes?.split('|')[1] || ""}
                onChange={(e) => {
                  const currentNotes = formState.notes || "";
                  const simNumber = currentNotes.includes('|') ? currentNotes.split('|')[0] : "";
                  const otherNotes = e.target.value;
                  onChange("notes", simNumber ? (otherNotes ? `${simNumber}|${otherNotes}` : simNumber) : otherNotes);
                }}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
                placeholder="Note aggiuntive sul dispositivo..."
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
            {mode === "create" ? "Crea" : "Salva"}
          </button>
        </div>
      </div>
    </div>
  );
}
