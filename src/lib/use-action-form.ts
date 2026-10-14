"use client";

import { useActionState, useEffect } from "react";
import { endPending, startPending } from "./pending-store";

/**
 * useActionState + otomatis mendaftarkan status pending ke store global,
 * sehingga overlay "Memproses..." muncul saat action berjalan.
 *
 * Pending naik saat action mulai, dan turun kembali saat selesai (atau saat
 * komponen dilepas).
 */
export function useActionForm<S>(
  action: (prevState: Awaited<S>, formData: FormData) => S | Promise<S>,
  initialState: Awaited<S>
) {
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (!pending) return;
    startPending();
    return endPending;
  }, [pending]);

  return [state, formAction, pending] as const;
}