"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  CheckCircle,
  Eye,
  Filter,
  Paperclip,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import { useActionForm } from "@/lib/use-action-form";
import type { ActionResult } from "@/lib/action-result";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";
import { LogDetailModal } from "./log-detail-modal";
import type { LogReviewItem, StudentOption } from "./types";
import {
  approveImportedLogs,
  deleteStudentLog,
  rejectImportedLog,
} from "@/app/(app)/hrd/log/actions";

const initialActionState: ActionResult = { ok: false };

// ── Tombol hapus log (untuk log SUBMITTED di tangan HRD) ────────────────────
function DeleteLogButton({ logId }: { logId: string }) {
  const [state, formAction, pending] = useActionForm(
    deleteStudentLog,
    initialActionState
  );
  const [confirm, setConfirm] = useState(false);

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        {state.message && !state.ok && (
          <span className="text-xs text-red-600">{state.message}</span>
        )}
        <form action={formAction}>
          <input type="hidden" name="logId" value={logId} />
          <Button
            type="submit"
            variant="danger"
            disabled={pending}
            className="text-xs"
          >
            {pending ? "Menghapus..." : "Ya, Hapus"}
          </Button>
        </form>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setConfirm(false)}
          className="text-xs"
          disabled={pending}
        >
          Batal
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="danger"
      onClick={() => setConfirm(true)}
      className="text-xs"
    >
      <Trash2 className="h-3.5 w-3.5" /> Hapus
    </Button>
  );
}

// ── Tombol setujui semua log 1 siswa ────────────────────────────────────────
function ApproveAllButton({
  studentId,
  studentName,
  count,
}: {
  studentId: string;
  studentName: string;
  count: number;
}) {
  const [state, formAction, pending] = useActionForm(
    approveImportedLogs,
    initialActionState
  );

  return (
    <div>
      {state.message && (
        <div className="mb-2">
          <Notice tone={state.ok ? "info" : "error"}>
            {state.message}
          </Notice>
        </div>
      )}
      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="studentId" value={studentId} />
        <Button type="submit" disabled={pending} className="text-xs">
          <CheckCircle className="h-3.5 w-3.5" />
          {pending
            ? "Memproses..."
            : `Setujui Semua (${count}) Log ${studentName}`}
        </Button>
      </form>
    </div>
  );
}

// ── Tombol tolak 1 log impor ────────────────────────────────────────────────
function RejectLogButton({ logId }: { logId: string }) {
  const [state, formAction, pending] = useActionForm(
    rejectImportedLog,
    initialActionState
  );
  const [confirm, setConfirm] = useState(false);

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        {state.message && !state.ok && (
          <span className="text-xs text-red-600">{state.message}</span>
        )}
        <form action={formAction}>
          <input type="hidden" name="logId" value={logId} />
          <Button
            type="submit"
            variant="danger"
            disabled={pending}
            className="text-xs"
          >
            {pending ? "Menolak..." : "Ya, Tolak"}
          </Button>
        </form>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setConfirm(false)}
          className="text-xs"
          disabled={pending}
        >
          Batal
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => setConfirm(true)}
      className="text-xs text-red-600 hover:bg-red-50"
    >
      <XCircle className="h-3.5 w-3.5" /> Tolak
    </Button>
  );
}

// ── Komponen utama ───────────────────────────────────────────────────────────
export function LogReviewManager({
  logs,
  pendingLogs = [],
  pendingByStudent = [],
  students,
  activeFilters,
  divisionName,
}: {
  logs: LogReviewItem[];
  pendingLogs?: LogReviewItem[];
  pendingByStudent?: { studentId: string; studentName: string; count: number }[];
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
  const [activeTab, setActiveTab] = useState<"submitted" | "pending">(
    pendingLogs.length > 0 ? "pending" : "submitted"
  );

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

  const selectedStudentObj = students.find(
    (s) => s.id === activeFilters.studentId
  );

  return (
    <div className="space-y-5">
      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl border border-border bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => setActiveTab("submitted")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "submitted"
              ? "bg-white text-primary shadow-sm"
              : "text-text-muted hover:text-text"
          }`}
        >
          Log Terkirim ({logs.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "pending"
              ? "bg-white text-amber-600 shadow-sm"
              : "text-text-muted hover:text-text"
          }`}
        >
          Perlu Persetujuan
          {pendingLogs.length > 0 && (
            <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-bold text-amber-700">
              {pendingLogs.length}
            </span>
          )}
        </button>
      </div>

      {/* Kartu Filter (hanya untuk tab SUBMITTED) */}
      {activeTab === "submitted" && (
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
      )}

      {/* ─── Tab: Log Terkirim ─────────────────────────────────────────── */}
      {activeTab === "submitted" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-text-muted">
            <div>
              <span>
                Menampilkan{" "}
                <strong className="text-text">{logs.length}</strong> log
                aktivitas terkirim
              </span>
              {hasActiveFilter && (
                <span className="ml-2 text-primary">
                  (Filter aktif:{" "}
                  {selectedStudentObj
                    ? selectedStudentObj.name
                    : "Semua siswa"}
                  {activeFilters.fromDate
                    ? ` · Dari ${activeFilters.fromDate}`
                    : ""}
                  {activeFilters.toDate
                    ? ` · Sampai ${activeFilters.toDate}`
                    : ""}
                  )
                </span>
              )}
            </div>
            {divisionName && (
              <span className="rounded-lg bg-primary-soft px-2.5 py-1 font-medium text-primary">
                Divisi: {divisionName}
              </span>
            )}
          </div>

          {logs.length === 0 ? (
            <Card className="py-12 text-center">
              <p className="text-sm font-medium text-text">
                Tidak ada log aktivitas terkirim
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {hasActiveFilter
                  ? "Tidak ada data yang sesuai dengan filter yang dipilih."
                  : "Belum ada siswa yang mengirim log aktivitas."}
              </p>
              {hasActiveFilter && (
                <div className="mt-4">
                  <Button
                    variant="secondary"
                    onClick={handleReset}
                    className="text-xs"
                  >
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
                        <span className="font-medium text-text">
                          {log.taskFrom}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 sm:self-start">
                      <Button
                        variant="secondary"
                        onClick={() => setActiveLog(log)}
                        className="text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" /> Lihat
                      </Button>
                      <DeleteLogButton logId={log.id} />
                    </div>
                  </div>

                  <div className="mt-2.5 rounded-lg bg-slate-50 p-2.5">
                    <p className="line-clamp-2 text-xs text-text leading-relaxed">
                      {log.description}
                    </p>
                  </div>

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
        </>
      )}

      {/* ─── Tab: Perlu Persetujuan ────────────────────────────────────── */}
      {activeTab === "pending" && (
        <>
          {pendingLogs.length === 0 ? (
            <Card className="py-12 text-center">
              <CheckCircle className="mx-auto h-10 w-10 text-green-400" />
              <p className="mt-3 text-sm font-medium text-text">
                Tidak ada log yang menunggu persetujuan
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Semua log impor sudah diproses.
              </p>
            </Card>
          ) : (
            <div className="space-y-5">
              {/* Tombol setujui per siswa */}
              {pendingByStudent.length > 0 && (
                <Card className="space-y-3 p-4">
                  <p className="text-sm font-semibold text-text">
                    Setujui Semua Log per Siswa
                  </p>
                  <p className="text-xs text-text-muted">
                    Klik tombol di bawah untuk menyetujui semua log impor milik
                    siswa sekaligus. Log yang disetujui akan berstatus{" "}
                    <strong>Terkirim</strong> dan masuk ke laporan.
                  </p>
                  <div className="space-y-2">
                    {pendingByStudent.map((group) => (
                      <ApproveAllButton
                        key={group.studentId}
                        studentId={group.studentId}
                        studentName={group.studentName}
                        count={group.count}
                      />
                    ))}
                  </div>
                </Card>
              )}

              {/* Daftar log pending */}
              <div className="space-y-3">
                {pendingLogs.map((log) => (
                  <Card
                    key={log.id}
                    className="border-amber-200 p-4 transition-colors"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-text">
                            {log.formattedDate}
                          </p>
                          <Badge tone="neutral">Menunggu Persetujuan</Badge>
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
                          <span className="font-medium text-text">
                            {log.taskFrom}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 sm:self-start">
                        <Button
                          variant="secondary"
                          onClick={() => setActiveLog(log)}
                          className="text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" /> Lihat
                        </Button>
                        <RejectLogButton logId={log.id} />
                      </div>
                    </div>

                    <div className="mt-2.5 rounded-lg bg-amber-50 p-2.5">
                      <p className="line-clamp-2 text-xs text-text leading-relaxed">
                        {log.description}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Detail Log (Read-Only) */}
      {activeLog && (
        <LogDetailModal log={activeLog} onClose={() => setActiveLog(null)} />
      )}
    </div>
  );
}
