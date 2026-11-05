"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type FeedbackResult = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

// Menyederhanakan reaksi terhadap hasil server action: menutup form, menampilkan
// pesan sukses/gagal, dan me-refresh data halaman setelah aksi berhasil.
export function useActionFeedback<T extends FeedbackResult>(state: T) {
  const router = useRouter();
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
    } else if (state.message) {
      // Tampilkan pesan gagal walau error bukan pada field yang sedang tampil.
      setError(state.message);
    }
  }

  // Refresh data halaman setelah aksi berhasil agar daftar terupdate
  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

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
