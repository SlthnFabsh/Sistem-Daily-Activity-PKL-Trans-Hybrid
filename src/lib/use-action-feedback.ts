"use client";

import { useState } from "react";

type FeedbackResult = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

// Menyederhanakan reaksi terhadap hasil server action: menutup form, menampilkan
// pesan sukses/gagal. Memakai pola "menyesuaikan state saat render" alih-alih
// setState di dalam effect agar tidak memicu render berantai.
export function useActionFeedback<T extends FeedbackResult>(state: T) {
  const [prevState, setPrevState] = useState<T>(state);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (state !== prevState) {
    setPrevState(state);
    if (state.ok) {
      setNotice(state.message ?? "Tersimpan.");
      setError(null);
      setFormOpen(false);
      setEditingId(null);
    } else if (state.fieldErrors?.form?.[0]) {
      setError(state.fieldErrors.form[0]);
    }
  }

  return {
    notice,
    error,
    formOpen,
    editingId,
    setFormOpen,
    setEditingId,
    setNotice,
    setError,
    dismiss() {
      setNotice(null);
      setError(null);
    },
  };
}