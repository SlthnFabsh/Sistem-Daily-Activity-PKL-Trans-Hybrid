"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ExternalLink, ImageOff, Loader2 } from "lucide-react";

/**
 * Foto absensi ada di bucket privat, jadi ditampilkan lewat signed URL
 * berumur pendek yang dibuat oleh /api/attendance-photo (dengan cek otorisasi).
 *
 * Signed URL baru diminta saat kartu masuk ke layar (IntersectionObserver),
 * supaya daftar absensi yang panjang tidak memicu ratusan request sekaligus.
 */
export function AttendancePhoto({ attendanceId }: { attendanceId: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  // Tandai terlihat saat kartu mendekati viewport.
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      const timeout = window.setTimeout(() => setVisible(true), 0);
      return () => window.clearTimeout(timeout);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    async function loadSignedUrl() {
      try {
        setError(null);
        const res = await fetch(
          `/api/attendance-photo?attendanceId=${encodeURIComponent(attendanceId)}`
        );
        const data = await res.json();
        if (cancelled) return;
        if (data.ok && data.signedUrl) {
          setSignedUrl(data.signedUrl);
          setImageError(false);
        } else {
          setError(data.message ?? "Gagal memuat foto absensi.");
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Gagal memuat foto absensi."
        );
      }
    }
    loadSignedUrl();
    return () => {
      cancelled = true;
    };
  }, [visible, attendanceId]);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-xl border border-border bg-surface-muted"
    >
      {error || imageError ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 bg-danger-soft/60 px-4 text-center text-danger">
          <ImageOff className="h-5 w-5" />
          <span className="text-xs font-medium">
            {error ?? "Gagal menampilkan foto absensi."}
          </span>
        </div>
      ) : !signedUrl ? (
        <div className="flex h-64 w-full items-center justify-center bg-surface-muted">
          <span className="flex items-center gap-2 text-xs text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Memuat foto absensi...
          </span>
        </div>
      ) : (
        <>
          <div className="relative h-64 w-full overflow-hidden bg-surface-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={signedUrl}
              alt="Foto absensi"
              className="h-full w-full object-cover object-center"
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
            />
            <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
              <Camera className="h-3 w-3" /> Foto absensi
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border bg-white px-3 py-2">
            <span className="text-[11px] text-text-muted">
              Bukti kehadiran siswa
            </span>
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-semibold text-text transition-colors hover:border-primary/30 hover:bg-primary-soft hover:text-primary"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Buka penuh
            </a>
          </div>
        </>
      )}
    </div>
  );
}
