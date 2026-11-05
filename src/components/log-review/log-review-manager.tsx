"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  Filter,
  Paperclip,
  RotateCcw,
  Trash2,
  XCircle,
  Clock,
  Check,
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
  deleteAllStudentLogs,
  deleteStudentLog,
  rejectImportedLog,
} from "@/app/(app)/hrd/log/actions";
import {
  approveLog,
  approveAllLogsForStudent,
  approveAllPendingDivisionLogs,
} from "@/app/(app)/mentor/log/actions";

const initialActionState: ActionResult = { ok: false };

// ── Tombol Setujui 1 Log Siswa (Mentor / HRD) ──────────────────────────────
function ApproveSingleLogButton({ logId }: { logId: string }) {
  const [state, formAction, pending] = useActionForm(approveLog, initialActionState);

  return (
    <form action={formAction}>
      <input type="hidden" name="logId" value={logId} />
      <Button
        type="submit"
        disabled={pending}
        className="text-xs bg-success hover:bg-success/90 text-white"
      >
        <Check className="h-3.5 w-3.5" />
        {pending ? "Menyetujui..." : "Setujui"}
      </Button>
    </form>
  );
}

// ── Tombol Setujui Semua Log 1 Siswa ────────────────────────────────────────
function ApproveAllForStudentButton({
  studentId,
  studentName,
  count,
}: {
  studentId: string;
  studentName: string;
  count: number;
}) {
  const [state, formAction, pending] = useActionForm(
    approveAllLogsForStudent,
    initialActionState
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-white p-3">
      <div>
        <p className="text-sm font-semibold text-text">{studentName}</p>
        <p className="text-xs text-text-muted">{count} log menunggu persetujuan</p>
      </div>
      <form action={formAction}>
        <input type="hidden" name="studentId" value={studentId} />
        <Button
          type="submit"
          disabled={pending}
          className="text-xs bg-success hover:bg-success/90 text-white"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          {pending ? "Memproses..." : `Setujui Semua (${count}) Log`}
        </Button>
      </form>
    </div>
  );
}

// ── Tombol Setujui Semua Log di Divisi Sekaligus ─────────────────────────────
function ApproveAllDivisionButton({
  totalCount,
}: {
  totalCount: number;
}) {
  const [state, formAction, pending] = useActionForm(
    approveAllPendingDivisionLogs,
    initialActionState
  );

  return (
    <form action={formAction}>
      <Button
        type="submit"
        disabled={pending}
        className="text-xs bg-primary hover:bg-primary/90 text-white"
      >
        <CheckCircle className="h-3.5 w-3.5" />
        {pending ? "Menyetujui Semua..." : `Setujui Seluruh (${totalCount}) Log Divisi`}
      </Button>
    </form>
  );
}

// ── Tombol hapus SEMUA log siswa (untuk log SUBMITTED di tangan HRD) ──────────
function DeleteAllStudentLogsButton({
  studentId,
  totalLogs,
}: {
  studentId: string;
  studentName: string;
  totalLogs: number;
}) {
  const [state, formAction, pending] = useActionForm(
    deleteAllStudentLogs,
    initialActionState
  );
  const [confirm, setConfirm] = useState(false);

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        {state.message && !state.ok && (
          <span className="text-xs text-danger">{state.message}</span>
        )}
        <form action={formAction}>
          <input type="hidden" name="studentId" value={studentId} />
          <Button
            type="submit"
            variant="danger"
            disabled={pending}
            className="text-xs"
          >
            {pending ? "Menghapus..." : `Ya, Hapus Semua (${totalLogs})`}
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
      disabled={pending}
    >
      <AlertTriangle className="h-3.5 w-3.5" />
      Hapus Semua Log ({totalLogs})
    </Button>
  );
}

// ── Tombol hapus log ─────────────────────────────────────────────────────────
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
          <span className="text-xs text-danger">{state.message}</span>
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

// ── Komponen utama ───────────────────────────────────────────────────────────
export function LogReviewManager({
  logs,
  pendingLogs = [],
  pendingByStudent = [],
  students,
  activeFilters,
  divisionName,
  truncatedSubmitted = false,
  isMentorView = false,
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
  truncatedSubmitted?: boolean;
  isMentorView?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [studentId, setStudentId] = useState(activeFilters.studentId ?? "all");
  const [fromDate, setFromDate] = useState(activeFilters.fromDate ?? "");
  const [toDate, setToDate] = useState(activeFilters.toDate ?? "");
  const [activeLog, setActiveLog] = useState<LogReviewItem | null>(null);

  // Default tab: di view mentor dahulukan yang butuh persetujuan
  const [activeTab, setActiveTab] = useState<"pending" | "submitted">(
    isMentorView ? "pending" : pendingLogs.length > 0 ? "pending" : "submitted"
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

  const overdueCount = pendingLogs.filter((l) => l.isOverdue).length;

  return (
    <div className="space-y-5">
      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl border border-border bg-surface-muted p-1">
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "pending"
              ? "bg-white text-primary shadow-sm"
              : "text-text-muted hover:text-text"
          }`}
        >
          Menunggu Persetujuan
          {pendingLogs.length > 0 && (
            <span
              className={`ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                overdueCount > 0
                  ? "bg-danger text-white animate-pulse"
                  : "bg-warning-soft text-warning"
              }`}
            >
              {pendingLogs.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("submitted")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "submitted"
              ? "bg-white text-primary shadow-sm"
              : "text-text-muted hover:text-text"
          }`}
        >
          {isMentorView ? "Log Disetujui" : "Semua Log Terkirim"} ({logs.length})
        </button>
      </div>

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
              label="Dari Tanggal"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />

            <Input
              label="Sampai Tanggal"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <Button type="submit" className="text-xs">
                <Filter className="h-3.5 w-3.5" /> Terapkan Filter
              </Button>
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
            </div>

            {/* Tombol aksi massal untuk pembimbing jika ada pending log */}
            {activeTab === "pending" && pendingLogs.length > 0 && (
              <ApproveAllDivisionButton totalCount={pendingLogs.length} />
            )}
          </div>
        </form>
      </Card>

      {/* ─── Tab: Menunggu Persetujuan ─────────────────────────────────── */}
      {activeTab === "pending" && (
        <>
          {pendingLogs.length === 0 ? (
            <Card className="py-12 text-center">
              <CheckCircle className="mx-auto h-10 w-10 text-success" />
              <p className="mt-3 text-sm font-medium text-text">
                Tidak ada log yang menunggu persetujuan
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Semua kegiatan siswa telah disetujui.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Box setujui per siswa */}
              {pendingByStudent.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Persetujuan Cepat per Siswa:
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {pendingByStudent.map((group) => (
                      <ApproveAllForStudentButton
                        key={group.studentId}
                        studentId={group.studentId}
                        studentName={group.studentName}
                        count={group.count}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Daftar item log yang menunggu persetujuan */}
              <div className="space-y-3">
                {pendingLogs.map((log) => (
                  <Card
                    key={log.id}
                    className={`p-4 transition-colors ${
                      log.isOverdue
                        ? "border-danger/40 bg-danger-soft/10"
                        : "hover:border-primary/50"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-text">
                            {log.formattedDate}
                          </p>
                          <Badge tone="warning">Menunggu Persetujuan</Badge>
                          {log.isOverdue && (
                            <Badge tone="danger">
                              <Clock className="mr-1 h-3 w-3 inline" />
                              Menumpuk &gt; 1 Minggu
                            </Badge>
                          )}
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
                        <ApproveSingleLogButton logId={log.id} />
                      </div>
                    </div>

                    <div className="mt-2.5 rounded-lg bg-surface-muted p-2.5">
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
            </div>
          )}
        </>
      )}

      {/* ─── Tab: Log Disetujui / Semua Log Terkirim ─────────────────────── */}
      {activeTab === "submitted" && (
        <>
          {logs.length === 0 ? (
            <Card className="py-12 text-center">
              <p className="text-sm font-medium text-text">
                Tidak ada log aktivitas
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {hasActiveFilter
                  ? "Tidak ada data yang sesuai dengan filter yang dipilih."
                  : "Belum ada log yang disetujui."}
              </p>
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
                        {log.status === "APPROVED" ? (
                          <Badge tone="success">Disetujui</Badge>
                        ) : (
                          <Badge tone="primary">Terkirim</Badge>
                        )}
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
                      {!isMentorView && <DeleteLogButton logId={log.id} />}
                    </div>
                  </div>

                  <div className="mt-2.5 rounded-lg bg-surface-muted p-2.5">
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

      {/* Modal Detail Log */}
      {activeLog && (
        <LogDetailModal log={activeLog} onClose={() => setActiveLog(null)} />
      )}
    </div>
  );
}
