"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Save, Users, Smartphone, Calendar, UserPlus } from "lucide-react";
import type { 
  PalmareDeviceForm, 
  PalmareOrganizerForm, 
  PalmareAssignmentForm, 
  PalmareOrganizerShowForm,
  PalmareDevice,
  PalmareOrganizer 
} from "@/lib/palmari";

type EntryMode = "device" | "organizer" | "assignment" | "show";

type PalmariEditorModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  entryMode: EntryMode;
  deviceForm: PalmareDeviceForm;
  organizerForm: PalmareOrganizerForm;
  assignmentForm: PalmareAssignmentForm;
  showForm: PalmareOrganizerShowForm;
  devices: PalmareDevice[];
  organizers: PalmareOrganizer[];
  onClose: () => void;
  onSubmit: () => void;
  onDeviceFormChange: <K extends keyof PalmareDeviceForm>(key: K, value: PalmareDeviceForm[K]) => void;
  onOrganizerFormChange: <K extends keyof PalmareOrganizerForm>(key: K, value: PalmareOrganizerForm[K]) => void;
  onAssignmentFormChange: <K extends keyof PalmareAssignmentForm>(key: K, value: PalmareAssignmentForm[K]) => void;
  onShowFormChange: <K extends keyof PalmareOrganizerShowForm>(key: K, value: PalmareOrganizerShowForm[K]) => void;
};

export default function PalmariEditorModal({
  isOpen,
  mode,
  entryMode,
  deviceForm,
  organizerForm,
  assignmentForm,
  showForm,
  devices,
  organizers,
  onClose,
  onSubmit,
  onDeviceFormChange,
  onOrganizerFormChange,
  onAssignmentFormChange,
  onShowFormChange,
}: PalmariEditorModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<EntryMode>(entryMode);

  // Resetta la tab quando entryMode cambia
  useEffect(() => {
    setActiveSubTab(entryMode);
  }, [entryMode]);

  if (!isOpen) return null;

  const renderDeviceEditor = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Licenza Palmare *</label>
          <input
            type="text"
            value={deviceForm.code}
            onChange={(e) => onDeviceFormChange("code", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
            placeholder="es: DEV001"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">DCA *</label>
          <input
            type="text"
            value={deviceForm.name}
            onChange={(e) => onDeviceFormChange("name", e.target.value)}
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
            value={deviceForm.base_location}
            onChange={(e) => onDeviceFormChange("base_location", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
            placeholder="es: Magazzino Centrale"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SIM</label>
          <select
            value={deviceForm.assigned_gate}
            onChange={(e) => onDeviceFormChange("assigned_gate", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
          >
            <option value="">Non assegnato</option>
            <option value="SI">SI</option>
            <option value="NO">NO</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
        <select
          value={deviceForm.status}
          onChange={(e) => onDeviceFormChange("status", e.target.value as any)}
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
          value={deviceForm.notes}
          onChange={(e) => onDeviceFormChange("notes", e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
          placeholder="Note aggiuntive sul dispositivo..."
        />
      </div>
    </div>
  );

  const renderOrganizerEditor = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome organizzatore *</label>
        <input
          type="text"
          value={organizerForm.organizer_name}
          onChange={(e) => onOrganizerFormChange("organizer_name", e.target.value)}
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
            value={organizerForm.contact_name}
            onChange={(e) => onOrganizerFormChange("contact_name", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
            placeholder="es: Mario Rossi"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
          <input
            type="tel"
            value={organizerForm.phone}
            onChange={(e) => onOrganizerFormChange("phone", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
            placeholder="es: 3331234567"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={organizerForm.email}
          onChange={(e) => onOrganizerFormChange("email", e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
          placeholder="es: info@eventisrl.it"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
        <textarea
          value={organizerForm.notes}
          onChange={(e) => onOrganizerFormChange("notes", e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
          placeholder="Note sull'organizzatore..."
        />
      </div>
    </div>
  );

  const renderAssignmentEditor = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Palmare *</label>
          <select
            value={assignmentForm.device_id}
            onChange={(e) => onAssignmentFormChange("device_id", e.target.value)}
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
            value={assignmentForm.organizer_id}
            onChange={(e) => onAssignmentFormChange("organizer_id", e.target.value)}
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
            value={assignmentForm.start_date}
            onChange={(e) => onAssignmentFormChange("start_date", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data fine *</label>
          <input
            type="date"
            value={assignmentForm.end_date}
            onChange={(e) => onAssignmentFormChange("end_date", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
        <textarea
          value={assignmentForm.notes}
          onChange={(e) => onAssignmentFormChange("notes", e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
          placeholder="Note sull'assegnazione..."
        />
      </div>
    </div>
  );

  const renderShowEditor = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Organizzatore *</label>
        <select
          value={showForm.organizer_id}
          onChange={(e) => onShowFormChange("organizer_id", e.target.value)}
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome spettacolo *</label>
          <input
            type="text"
            value={showForm.show_name}
            onChange={(e) => onShowFormChange("show_name", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
            placeholder="es: Romeo e Giulietta"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data spettacolo *</label>
          <input
            type="date"
            value={showForm.show_date}
            onChange={(e) => onShowFormChange("show_date", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
        <input
          type="text"
          value={showForm.location}
          onChange={(e) => onShowFormChange("location", e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
          placeholder="es: Teatro Grande"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
        <textarea
          value={showForm.notes}
          onChange={(e) => onShowFormChange("notes", e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4ec4c5] focus:outline-none focus:ring-1 focus:ring-[#4ec4c5]/20"
          placeholder="Note sullo spettacolo..."
        />
      </div>
    </div>
  );

  const getTabIcon = (tab: EntryMode) => {
    switch (tab) {
      case "device": return <Smartphone className="h-4 w-4" />;
      case "organizer": return <Users className="h-4 w-4" />;
      case "assignment": return <UserPlus className="h-4 w-4" />;
      case "show": return <Calendar className="h-4 w-4" />;
    }
  };

  const getTabTitle = (tab: EntryMode) => {
    switch (tab) {
      case "device": return "Palmare";
      case "organizer": return "Organizzatore";
      case "assignment": return "Assegnazione";
      case "show": return "Spettacolo";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {mode === "create" ? "Nuovo" : "Modifica"} {getTabTitle(activeSubTab)}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Compila i campi per {mode === "create" ? "creare" : "modificare"} un {getTabTitle(activeSubTab).toLowerCase()}
              {activeSubTab === "device" ? " (DCA = Descrizione Completa Apparato)" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex space-x-8">
            {(["device", "organizer", "assignment", "show"] as EntryMode[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSubTab(tab)}
                className={`flex items-center gap-2 py-4 border-b-2 text-sm font-medium transition ${
                  activeSubTab === tab
                    ? "border-[#4ec4c5] text-[#4ec4c5]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {getTabIcon(tab)}
                {getTabTitle(tab)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeSubTab === "device" && renderDeviceEditor()}
          {activeSubTab === "organizer" && renderOrganizerEditor()}
          {activeSubTab === "assignment" && renderAssignmentEditor()}
          {activeSubTab === "show" && renderShowEditor()}
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
