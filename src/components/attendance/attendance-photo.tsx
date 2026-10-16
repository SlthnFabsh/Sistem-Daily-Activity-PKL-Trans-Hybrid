"use client";

import { useEffect, useState } from "react";
import { ExternalLink, ImageOff, Loader2 } from "lucide-react";

/**
 * Foto absensi ada di bucket privat, jadi ditampilkan lewat signed URL
 * berumur pendek yang dibuat oleh /api/attendance-photo (dengan cek otorisasi).
 */
export function AttendancePhoto({ attendanceId }: { attendanceId: string }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadSignedUrl() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/attendance-photo?attendanceId=${encodeURIComponent(attendanceId)}`
        );
        const data = await res.json();
        if (cancelled) return;
        if (data.ok && data.signedUrl) {
          setSignedUrl(data.signedUrl);
        } else {
          setError(data.message ?? "Gagal memuat foto absensi.");
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Gagal memuat foto absensi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadSignedUrl();
    return () => {
      cancelled = true;
    };
  }, [attendanceId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-slate-50 p-3 text-xs text-text-muted">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
        <span>Memuat foto absensi...</span>
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
        <ImageOff className="h-4 w-4 shrink-0" />
        <span>{error ?? "Foto absensi tidak dapat diakses."}</span>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <div className="relative flex aspect-video max-h-56 w-full items-center justify-center overflow-hidden bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={signedUrl}
          alt="Foto absensi"
          className="h-full w-full object-contain"
          loading="lazy"
        />
      </div>
      <div className="flex items-center justify-end p-2.5">
        <a
          href={signedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:bg-primary-soft hover:text-primary"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Buka penuh
        </a>
      </div>
    </div>
  );
}
