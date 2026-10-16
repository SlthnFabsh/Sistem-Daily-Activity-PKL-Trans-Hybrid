"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AttachmentItem } from "./attachment-item";
import type { LogReviewItem } from "./types";

export function LogDetailModal({
  log,
  onClose,
}: {
  log: LogReviewItem;
  onClose: () => void;
}) {
  // Tutup dengan tombol Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-white shadow-xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-text">
              Detail Log Aktivitas
            </h2>
            <p className="text-xs text-text-muted">
              {log.student.name} · {log.student.divisionName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Konten Log (Semua Field) */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Status & Waktu Pengiriman */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Status Log:</span>
              <Badge tone="primary">Terkirim</Badge>
            </div>
            {log.formattedSubmittedAt && (
              <span className="text-xs text-text-muted">
                Dikirim: {log.formattedSubmittedAt} WIB
              </span>
            )}
          </div>

          {/* Kartu Ringkasan Informasi Siswa & Waktu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-border bg-surface-muted/70 p-3.5 text-xs">
            <div>
              <p className="text-text-muted">Nama Siswa</p>
              <p className="mt-0.5 font-semibold text-text">{log.student.name}</p>
              {log.student.nis && (
                <p className="text-[11px] text-text-muted">NIS: {log.student.nis}</p>
              )}
            </div>
            <div>
              <p className="text-text-muted">Sekolah & Divisi</p>
              <p className="mt-0.5 font-medium text-text">
                {log.student.schoolName}
                {log.student.className ? ` (${log.student.className})` : ""}
              </p>
              <p className="text-[11px] text-primary font-medium">
                {log.student.divisionName}
              </p>
            </div>
            <div>
              <p className="text-text-muted">Tanggal Kegiatan</p>
              <p className="mt-0.5 font-medium text-text">{log.formattedDate}</p>
            </div>
            <div>
              <p className="text-text-muted">Jam Kegiatan</p>
              <p className="mt-0.5 font-medium text-text">
                {log.startTime} – {log.endTime} WIB
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-text-muted">Pemberi Tugas (Pembimbing)</p>
              <p className="mt-0.5 font-medium text-text">{log.taskFrom}</p>
            </div>
          </div>

          {/* Uraian Kegiatan */}
          <div>
            <h3 className="mb-1 text-xs font-semibold text-text">
              Uraian Kegiatan
            </h3>
            <div className="rounded-xl border border-border bg-white p-3 text-sm text-text whitespace-pre-wrap leading-relaxed">
              {log.description}
            </div>
          </div>

          {/* Hasil Kegiatan */}
          <div>
            <h3 className="mb-1 text-xs font-semibold text-text">
              Hasil Kegiatan
            </h3>
            <div className="rounded-xl border border-border bg-white p-3 text-sm text-text whitespace-pre-wrap leading-relaxed">
              {log.output ? (
                log.output
              ) : (
                <span className="italic text-text-muted">
                  Tidak ada keterangan hasil.
                </span>
              )}
            </div>
          </div>

          {/* Hambatan / Kendala */}
          <div>
            <h3 className="mb-1 text-xs font-semibold text-text">
              Hambatan / Kendala
            </h3>
            <div className="rounded-xl border border-border bg-white p-3 text-sm text-text whitespace-pre-wrap leading-relaxed">
              {log.obstacle ? (
                log.obstacle
              ) : (
                <span className="italic text-text-muted">
                  Tidak ada keterangan kendala.
                </span>
              )}
            </div>
          </div>

          {/* Lampiran Bukti */}
          <div>
            <h3 className="mb-1.5 text-xs font-semibold text-text">
              Lampiran Bukti ({log.attachments.length})
            </h3>
            {log.attachments.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs italic text-text-muted">
                Tidak ada lampiran pada log ini.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {log.attachments.map((att) => (
                  <AttachmentItem key={att.id} attachment={att} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer (Read-Only: HANYA tombol Tutup) */}
        <div className="flex items-center justify-end border-t border-border px-5 py-3">
          <Button variant="secondary" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
