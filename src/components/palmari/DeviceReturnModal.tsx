"use client";

import { useState } from "react";
import { CheckCircle, X, AlertCircle } from "lucide-react";
import type { PalmareReturnForm } from "@/lib/palmari";

interface DeviceReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (returnForm: PalmareReturnForm) => Promise<void>;
  deviceCode: string;
  deviceName: string;
  currentUserId: string;
}

export default function DeviceReturnModal({
  isOpen,
  onClose,
  onConfirm,
  deviceCode,
  deviceName,
  currentUserId,
}: DeviceReturnModalProps) {
  const [notes, setNotes] = useState("");
  const [verificationCompleted, setVerificationCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!notes.trim()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const returnForm: PalmareReturnForm = {
        device_id: deviceCode,
        notes: notes.trim(),
        verification_completed: verificationCompleted,
        return_date: new Date().toISOString(),
        returned_by: currentUserId,
      };

      await onConfirm(returnForm);
      onClose();
      setNotes("");
      setVerificationCompleted(false);
    } catch (error) {
      console.error("Errore durante il rientro del dispositivo:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-w-md w-full rounded-xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Rientro Dispositivo
              </h2>
              <p className="text-sm text-gray-600">
                {deviceCode} - {deviceName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Note */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Note di rientro *
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Descrivi lo stato del dispositivo, eventuali danni, problemi riscontrati..."
              required
            />
          </div>

          {/* Verifica */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="verification"
              checked={verificationCompleted}
              onChange={(e) => setVerificationCompleted(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <div className="flex-1">
              <label htmlFor="verification" className="block text-sm font-medium text-gray-700">
                Verifica completata
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Conferma di aver verificato il funzionamento e lo stato del dispositivo
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !notes.trim()}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Conferma...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Conferma Rientro</span>
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
