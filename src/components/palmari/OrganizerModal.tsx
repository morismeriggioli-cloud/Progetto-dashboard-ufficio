"use client";

import { useState } from "react";
import { X, Save, Users } from "lucide-react";
import type { PalmareOrganizerForm } from "@/lib/palmari";

type OrganizerModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  formState: PalmareOrganizerForm;
  onChange: <K extends keyof PalmareOrganizerForm>(
    key: K,
    value: PalmareOrganizerForm[K]
  ) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function OrganizerModal({
  isOpen,
  mode,
  formState,
  onChange,
  onClose,
  onSubmit,
}: OrganizerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-w-2xl w-full rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {mode === "create" ? "Nuovo" : "Modifica"} Organizzatore
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Compila i campi per {mode === "create" ? "creare" : "modificare"} un organizzatore
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome organizzatore *</label>
              <input
                type="text"
                value={formState.organizer_name}
                onChange={(e) => onChange("organizer_name", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
                placeholder="es: Eventi SRL"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referente</label>
                <input
                  type="text"
                  value={formState.contact_name}
                  onChange={(e) => onChange("contact_name", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
                  placeholder="es: Mario Rossi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                <input
                  type="tel"
                  value={formState.phone}
                  onChange={(e) => onChange("phone", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
                  placeholder="es: 3331234567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formState.email}
                onChange={(e) => onChange("email", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
                placeholder="es: info@eventisrl.it"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
              <textarea
                value={formState.notes}
                onChange={(e) => onChange("notes", e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
                placeholder="Note sull'organizzatore..."
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
