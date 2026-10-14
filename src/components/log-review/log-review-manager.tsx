"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, Filter, Paperclip, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LogDetailModal } from "./log-detail-modal";
import type { LogReviewItem, StudentOption } from "./types";

export function LogReviewManager({
  logs,
  students,
  activeFilters,
  divisionName,
}: {
  logs: LogReviewItem[];
  students: StudentOption[];
  activeFilters: {
    studentId?: string;
    fromDate?: string;
    toDate?: string;
  };
  divisionName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [studentId, setStudentId] = useState(activeFilters.studentId ?? "all");
  const [fromDate, setFromDate] = useState(activeFilters.fromDate ?? "");
  const [toDate, setToDate] = useState(activeFilters.toDate ?? "");
  const [activeLog, setActiveLog] = useState<LogReviewItem | null>(null);

  const hasActiveFilter =
    Boolean(activeFilters.studentId && activeFilters.studentId !== "all") ||
    Boolean(activeFilters.fromDate) ||
    Boolean(activeFilters.toDate);

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (studentId && studentId !== "all") {
      params.set("studentId", studentId);
    }
    if (fromDate) {
      params.set("fromDate", fromDate);
    }
    if (toDate) {
      params.set("toDate", toDate);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function handleReset() {
    setStudentId("all");
    setFromDate("");
    setToDate("");
    router.push(pathname);
  }

  const selectedStudentObj = students.find((s) => s.id === activeFilters.studentId);

  return (
    <div className="space-y-5">
      {/* Kartu Filter */}
      <Card className="p-4">
        <form onSubmit={handleFilterSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select
              label="Siswa"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              <option value="all">Semua Siswa</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.divisionName && divisionName !== s.divisionName
                    ? ` (${s.divisionName})`
                    : ""}
                </option>
              ))}
            </Select>

            <Input
              label="Dari tanggal"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />

            <Input
              label="Sampai tanggal"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            {hasActiveFilter && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleReset}
                className="text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
            )}
            <Button type="submit" className="text-xs">
              <Filter className="h-3.5 w-3.5" /> Terapkan Filter
            </Button>
          </div>
        </form>
      </Card>

      {/* Ringkasan Filter & Jumlah Data */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-text-muted">
        <div>
          <span>
            Menampilkan <strong className="text-text">{logs.length}</strong> log
            aktivitas terkirim
          </span>
          {hasActiveFilter && (
            <span className="ml-2 text-primary">
              (Filter aktif:{" "}
              {selectedStudentObj
                ? selectedStudentObj.name
                : "Semua siswa"}
              {activeFilters.fromDate ? ` · Dari ${activeFilters.fromDate}` : ""}
              {activeFilters.toDate ? ` · Sampai ${activeFilters.toDate}` : ""})
            </span>
          )}
        </div>
        {divisionName && (
          <span className="rounded-lg bg-primary-soft px-2.5 py-1 font-medium text-primary">
            Divisi: {divisionName}
          </span>
        )}
      </div>

      {/* Daftar Log Aktivitas */}
      {logs.length === 0 ? (
        <Card className="py-12 text-center">
          <p className="text-sm font-medium text-text">
            Tidak ada log aktivitas terkirim
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {hasActiveFilter
              ? "Tidak ada data yang sesuai dengan filter yang dipilih. Silakan ubah filter atau tekan Reset."
              : "Belum ada siswa yang mengirim log aktivitas."}
          </p>
          {hasActiveFilter && (
            <div className="mt-4">
              <Button variant="secondary" onClick={handleReset} className="text-xs">
                Reset Filter
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card
              key={log.id}
              className="p-4 transition-colors hover:border-primary/50"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-text">
                      {log.formattedDate}
                    </p>
                    <Badge tone="primary">Terkirim</Badge>
                  </div>
                  <p className="text-xs font-medium text-text">
                    {log.student.name}
                    <span className="font-normal text-text-muted">
                      {" "}
                      · {log.student.schoolName} · {log.student.divisionName}
                    </span>
                  </p>
                  <p className="text-xs text-text-muted">
                    {log.startTime} – {log.endTime} WIB · Pemberi tugas:{" "}
                    <span className="font-medium text-text">{log.taskFrom}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:self-start">
                  <Button
                    variant="secondary"
                    onClick={() => setActiveLog(log)}
                    className="w-full text-xs sm:w-auto"
                  >
                    <Eye className="h-3.5 w-3.5" /> Lihat Detail
                  </Button>
                </div>
              </div>

              {/* Cuplikan Uraian Kegiatan */}
              <div className="mt-2.5 rounded-lg bg-slate-50 p-2.5">
                <p className="line-clamp-2 text-xs text-text leading-relaxed">
                  {log.description}
                </p>
              </div>

              {/* Footer Kartu */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5 text-[11px] text-text-muted">
                <div className="flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5" />
                  <span>
                    {log.attachments.length > 0
                      ? `${log.attachments.length} lampiran`
                      : "Tanpa lampiran"}
                  </span>
                </div>
                {log.formattedSubmittedAt && (
                  <div>Dikirim: {log.formattedSubmittedAt} WIB</div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Detail Log (Read-Only) */}
      {activeLog && (
        <LogDetailModal
          log={activeLog}
          onClose={() => setActiveLog(null)}
        />
      )}
    </div>
  );
}
