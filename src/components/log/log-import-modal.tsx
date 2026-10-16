"use client";

import { useRef, useState } from "react";
import { Download, FileUp, Loader2, X } from "lucide-react";
import { useActionForm } from "@/lib/use-action-form";
import type { ImportResult } from "@/lib/action-result";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";

const initialImportState: ImportResult = {
  ok: false,
  imported: 0,
  failed: 0,
  rows: [],
};

export type StudentOptionForImport = {
  id: string;
  name: string;
  schoolName?: string;
  divisionName?: string;
};

export function LogImportModal({
  action,
  students,
  defaultStudentId,
  onClose,
}: {
  action: (prev: ImportResult, formData: FormData) => Promise<ImportResult>;
  students?: StudentOptionForImport[];
  defaultStudentId?: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionForm(action, initialImportState);
  const [selectedStudentId, setSelectedStudentId] = useState(
    defaultStudentId ?? students?.[0]?.id ?? ""
  );
  const [startDate, setStartDate] = useState("2026-08-01");
  const [endDate, setEndDate] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px]"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-border bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <FileUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">
                Impor Log Tugas dari Excel
              </h2>
              <p className="text-xs text-text-muted">
                Masukkan riwayat log masa lalu (misal sejak Agustus)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-slate-100 hover:text-text disabled:opacity-50"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Info panduan & Unduh template */}
          <div className="rounded-xl border border-border bg-slate-50 p-3.5 text-xs text-text">
            <p className="font-semibold text-text">Format File Excel (.xlsx)</p>
            <p className="mt-1 text-text-muted leading-relaxed">
              File harus memuat kolom:{" "}
              <strong>
                Tanggal, Jam Mulai, Jam Selesai, Pemberi Tugas, Uraian Kegiatan,
                Hasil, Hambatan
              </strong>
              . Log yang diimpor akan langsung berstatus{" "}
              <strong>Terkirim (SUBMITTED)</strong> agar dapat diexport di laporan.
            </p>
            <div className="mt-2.5">
              <a
                href="/contoh-import-log.xlsx"
                download="contoh-import-log.xlsx"
                className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
              >
                <Download className="h-3.5 w-3.5" /> Unduh Contoh Template Excel
              </a>
            </div>
          </div>

          <form action={formAction} className="space-y-3.5">
            {/* Pilihan siswa jika role HRD */}
            {students && students.length > 0 && (
              <Select
                label="Siswa yang Dituju"
                name="studentId"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                required
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.divisionName ? ` – ${s.divisionName}` : ""}
                    {s.schoolName ? ` (${s.schoolName})` : ""}
                  </option>
                ))}
              </Select>
            )}

            {/* Filter tanggal mulai impor */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Impor mulai dari tanggal"
                type="date"
                name="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                label="Sampai tanggal (opsional)"
                type="date"
                name="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <p className="text-[11px] text-text-muted">
              Baris di file Excel dengan tanggal sebelum tanggal mulai di atas
              akan dilewati secara otomatis.
            </p>

            {/* Input File */}
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">
                Pilih File Excel (.xlsx / .xls)
              </span>
              <input
                ref={fileInputRef}
                type="file"
                name="file"
                accept=".xlsx,.xls"
                required
                disabled={pending}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-1 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary/20"
              />
            </label>

            {/* Notifikasi feedback */}
            {state.message && (
              <Notice tone={state.ok ? "info" : "error"}>
                {state.message}
              </Notice>
            )}

            {/* Tabel baris hasil impor */}
            {state.rows && state.rows.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text">Detail Baris:</span>
                  <span className="text-text-muted">
                    {state.imported} berhasil · {state.failed} gagal
                  </span>
                </div>
                <div className="max-h-48 overflow-x-auto overflow-y-auto rounded-xl border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-text-muted">
                      <tr>
                        <th className="px-3 py-2">Baris</th>
                        <th className="px-3 py-2">Tanggal / Tugas</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {state.rows.map((row) => (
                        <tr key={row.row}>
                          <td className="px-3 py-1.5">{row.row}</td>
                          <td className="px-3 py-1.5 font-medium text-text">
                            {row.name}
                          </td>
                          <td className="px-3 py-1.5">
                            <Badge tone={row.ok ? "primary" : "neutral"}>
                              {row.ok ? "Berhasil" : "Gagal"}
                            </Badge>
                          </td>
                          <td className="px-3 py-1.5 text-text-muted">
                            {row.error ?? "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tombol aksi */}
            <div className="flex items-center justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={pending}
              >
                {state.imported > 0 ? "Selesai" : "Batal"}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Memproses...
                  </>
                ) : (
                  <>
                    <FileUp className="h-4 w-4" /> Mulai Impor
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
