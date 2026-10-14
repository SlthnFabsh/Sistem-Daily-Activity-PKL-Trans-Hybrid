"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Notice } from "@/components/ui/notice";

export type StudentOption = {
  id: string;
  name: string;
  schoolName?: string;
  divisionName?: string;
};

export function LaporanForm({
  students,
  defaultStudentId,
  singleStudent,
}: {
  /** Daftar siswa yang tersedia (sesuai role pemanggil). */
  students: StudentOption[];
  /** Jika sudah diketahui satu siswa (mode STUDENT), set ini. */
  defaultStudentId?: string;
  /** true = role STUDENT, tampilkan info saja bukan dropdown */
  singleStudent?: boolean;
}) {
  const [studentId, setStudentId] = useState(
    defaultStudentId ?? students[0]?.id ?? ""
  );
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedStudent = students.find((s) => s.id === studentId);

  async function handleDownload(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) {
      setError("Pilih siswa terlebih dahulu.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const params = new URLSearchParams({ studentId });
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);

      const res = await fetch(`/api/laporan-pdf?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: "Terjadi kesalahan." }));
        setError(data.message ?? "Gagal mengunduh laporan.");
        return;
      }

      // Trigger download
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "laporan.pdf";

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunduh laporan.");
    } finally {
      setLoading(false);
    }
  }

  if (students.length === 0) {
    return (
      <Card className="py-10 text-center">
        <p className="text-sm text-text-muted">
          Tidak ada data siswa yang tersedia untuk dibuatkan laporan.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <form onSubmit={handleDownload} className="space-y-4">
        {/* Pilih siswa (hanya untuk HRD & Mentor) */}
        {singleStudent ? (
          <div className="rounded-xl border border-border bg-slate-50 p-3">
            <p className="text-xs text-text-muted">Siswa</p>
            <p className="mt-0.5 text-sm font-semibold text-text">
              {selectedStudent?.name ?? "-"}
            </p>
            {selectedStudent?.schoolName && (
              <p className="text-xs text-text-muted">
                {selectedStudent.schoolName}
              </p>
            )}
          </div>
        ) : (
          <Select
            label="Siswa"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
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

        {/* Rentang tanggal */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Dari tanggal (opsional)"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <Input
            label="Sampai tanggal (opsional)"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        <p className="text-xs text-text-muted">
          Kosongkan rentang tanggal untuk mencetak seluruh log. Hanya log
          berstatus <strong>Terkirim</strong> yang akan masuk ke laporan.
        </p>

        {error && <Notice tone="error">{error}</Notice>}

        <Button
          type="submit"
          disabled={loading || !studentId}
          className="w-full sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Membuat PDF...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" /> Unduh Laporan PDF
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}
