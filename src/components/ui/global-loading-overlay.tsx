"use client";

import { useSyncExternalStore } from "react";
import { Loader2 } from "lucide-react";
import { getPending, subscribePending } from "@/lib/pending-store";

/**
 * Overlay global yang menutupi layar saat ada server action atau proses unggah
 * yang sedang berjalan, supaya pengguna tahu ada proses yang belum selesai.
 * Ditaruh satu kali di layout, tidak perlu dipasang per halaman.
 */
export function GlobalLoadingOverlay() {
  const pending = useSyncExternalStore(subscribePending, getPending, getPending);

  if (!pending) return null;

  return (
    <div
      role="alert"
      aria-busy="true"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
    >
      <div className="flex min-w-[13rem] flex-col items-center gap-4 rounded-2xl bg-white px-8 py-9 shadow-xl">
        <Loader2
          className="h-10 w-10 animate-spin text-primary"
          strokeWidth={2.5}
          aria-hidden
        />
        <p className="text-sm font-semibold text-text">Memproses...</p>
      </div>
    </div>
  );
}