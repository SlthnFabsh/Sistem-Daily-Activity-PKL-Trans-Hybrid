"use client";

import { useActionForm } from "@/lib/use-action-form";
import { LogIn, LogOut } from "lucide-react";
import type { ActionResult } from "@/lib/action-result";
import { checkIn, checkOut, submitLeave } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";

const initialState: ActionResult = { ok: false };

export type AttendanceView = {
  status: "HADIR" | "TERLAMBAT" | "IZIN" | "SAKIT";
  checkIn: string | null;
  checkOut: string | null;
  earlyLeave: boolean;
  note: string | null;
};

const STATUS_LABEL: Record<AttendanceView["status"], string> = {
  HADIR: "Hadir",
  TERLAMBAT: "Terlambat",
  IZIN: "Izin",
  SAKIT: "Sakit",
};

export function AbsensiPanel({
  todayLabel,
  divisionName,
  workStart,
  workEnd,
  today,
}: {
  todayLabel: string;
  divisionName: string;
  workStart: string;
  workEnd: string;
  today: AttendanceView | null;
}) {
  const [inState, inAction, inPending] = useActionForm(checkIn, initialState);
  const [outState, outAction, outPending] = useActionForm(checkOut, initialState);
  const [leaveState, leaveAction, leavePending] = useActionForm(
    submitLeave,
    initialState
  );

  const isPresent = today?.status === "HADIR" || today?.status === "TERLAMBAT";

  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-text">Absensi hari ini</h2>
      <p className="mt-0.5 text-xs text-text-muted">
        {todayLabel} · {divisionName} · Jam kerja {workStart}–{workEnd} WIB
      </p>

      <div className="mt-3 space-y-2">
        {inState.message && (
          <Notice tone={inState.ok ? "info" : "error"}>{inState.message}</Notice>
        )}
        {outState.message && (
          <Notice tone={outState.ok ? "info" : "error"}>{outState.message}</Notice>
        )}
        {leaveState.message && (
          <Notice tone={leaveState.ok ? "info" : "error"}>
            {leaveState.message}
          </Notice>
        )}
      </div>

      {today === null ? (
        <div className="mt-4 space-y-4">
          <form action={inAction}>
            <Button type="submit" disabled={inPending} className="w-full">
              <LogIn className="h-4 w-4" aria-hidden />
              {inPending ? "Memproses..." : "Absen masuk"}
            </Button>
          </form>

          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="h-px flex-1 bg-border" />
            atau ajukan Izin/Sakit
            <span className="h-px flex-1 bg-border" />
          </div>

          <form action={leaveAction} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">
                Jenis
              </span>
              <select
                name="status"
                defaultValue="IZIN"
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-primary"
              >
                <option value="IZIN">Izin</option>
                <option value="SAKIT">Sakit</option>
              </select>
              {leaveState.fieldErrors?.status?.[0] && (
                <span className="mt-1 block text-xs text-red-600">
                  {leaveState.fieldErrors.status[0]}
                </span>
              )}
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">
                Keterangan (wajib)
              </span>
              <textarea
                name="note"
                rows={3}
                placeholder="Tulis alasan izin atau sakit"
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text outline-none placeholder:text-text-muted/60 focus:border-primary"
              />
              {leaveState.fieldErrors?.note?.[0] && (
                <span className="mt-1 block text-xs text-red-600">
                  {leaveState.fieldErrors.note[0]}
                </span>
              )}
            </label>
            <Button
              type="submit"
              variant="secondary"
              disabled={leavePending}
              className="w-full"
            >
              {leavePending ? "Menyimpan..." : "Kirim Izin/Sakit"}
            </Button>
          </form>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={today.status === "HADIR" ? "primary" : "neutral"}>
              {STATUS_LABEL[today.status]}
            </Badge>
            {today.earlyLeave && (
              <span className="text-xs text-text-muted">Pulang lebih awal</span>
            )}
          </div>

          {today.note && (
            <p className="text-sm text-text-muted">
              Keterangan: {today.note}
            </p>
          )}

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border p-3">
              <dt className="text-xs text-text-muted">Jam masuk</dt>
              <dd className="mt-0.5 font-semibold text-text">
                {today.checkIn ?? "-"}
              </dd>
            </div>
            <div className="rounded-xl border border-border p-3">
              <dt className="text-xs text-text-muted">Jam pulang</dt>
              <dd className="mt-0.5 font-semibold text-text">
                {today.checkOut ?? "-"}
              </dd>
            </div>
          </dl>

          {isPresent && !today.checkOut && (
            <form action={outAction}>
              <Button type="submit" disabled={outPending} className="w-full">
                <LogOut className="h-4 w-4" aria-hidden />
                {outPending ? "Memproses..." : "Absen pulang"}
              </Button>
            </form>
          )}

          {isPresent && today.checkOut && (
            <p className="text-xs text-text-muted">
              Absensi hari ini sudah lengkap dan tidak bisa diubah. Koreksi hanya
              oleh HRD.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}