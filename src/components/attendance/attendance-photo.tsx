"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, ImageOff, Loader2 } from "lucide-react";

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

  // Tandai terlihat saat kartu mendekati viewport.
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
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
      className="overflow-hidden rounded-xl border border-border bg-white"
    >
      {error ? (
        <div className="flex items-center gap-2 bg-danger-soft p-3 text-xs text-danger">
          <ImageOff className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : !signedUrl ? (
        <div className="flex aspect-video max-h-56 w-full items-center justify-center bg-surface-muted">
          <span className="flex items-center gap-2 text-xs text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Memuat foto absensi...
          </span>
        </div>
      ) : (
        <>
          <div className="relative flex aspect-video max-h-56 w-full items-center justify-center overflow-hidden bg-surface-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={signedUrl}
              alt="Foto absensi"
              className="h-full w-full object-contain"
              loading="lazy"
              decoding="async"
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
        </>
      )}
    </div>
  );
}
