import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { getActivePlacementForUser } from "@/lib/attendance";
import {
  formatWibDate,
  formatWibTime,
  getWibDateParts,
  todayWib,
} from "@/lib/time";
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  HeartPulse,
  History,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AbsensiPanel, type AttendanceView } from "./absensi-panel";

type StatusTone = "success" | "warning" | "info" | "danger";

const STATUS_META: Record<
  AttendanceView["status"],
  { label: string; tone: StatusTone; Icon: typeof CheckCircle2 }
> = {
  HADIR: { label: "Hadir", tone: "success", Icon: CheckCircle2 },
  TERLAMBAT: { label: "Terlambat", tone: "warning", Icon: Clock3 },
  IZIN: { label: "Izin", tone: "info", Icon: FileText },
  SAKIT: { label: "Sakit", tone: "danger", Icon: HeartPulse },
};

function toView(a: {
  status: AttendanceView["status"];
  checkIn: Date | null;
  checkOut: Date | null;
  earlyLeave: boolean;
  note: string | null;
}): AttendanceView {
  return {
    status: a.status,
    checkIn: a.checkIn ? formatWibTime(a.checkIn) : null,
    checkOut: a.checkOut ? formatWibTime(a.checkOut) : null,
    earlyLeave: a.earlyLeave,
    note: a.note,
  };
}

function splitWibDate(value: Date): { weekday: string; date: string } {
  const label = formatWibDate(value);
  const separator = label.indexOf(", ");
  if (separator === -1) return { weekday: "", date: label };
  return {
    weekday: label.slice(0, separator),
    date: label.slice(separator + 2),
  };
}

export default async function AbsensiPage() {
  const user = await requireRole("STUDENT");
  const placement = await getActivePlacementForUser(user.id);

  if (!placement) {
    return (
      <>
        <PageHeader
          title="Absensi"
          description="Catat kehadiran harian dan pantau riwayat absensi Anda."
        />
        <Card className="flex flex-col items-center px-6 py-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
            <CalendarCheck className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-semibold text-text">
            Penempatan PKL belum aktif
          </p>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-text-muted">
            Anda belum memiliki penempatan PKL aktif. Hubungi HRD untuk
            mengaktifkan penempatan sebelum melakukan absensi.
          </p>
        </Card>
      </>
    );
  }

  // Rentang bulan berjalan (WIB).
  const now = new Date();
  const { year, month } = getWibDateParts(now);
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(
    Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1)
  );

  const [todayRow, monthRows, logToday] = await Promise.all([
    prisma.attendance.findUnique({
      where: {
        placementId_attDate: {
          placementId: placement.id,
          attDate: todayWib(),
        },
      },
    }),
    prisma.attendance.findMany({
      where: {
        placementId: placement.id,
        attDate: { gte: monthStart, lt: monthEnd },
      },
      orderBy: { attDate: "desc" },
    }),
    // Cek apakah sudah ada log SUBMITTED hari ini
    prisma.activityLog.findFirst({
      where: {
        placementId: placement.id,
        logDate: todayWib(),
        status: "SUBMITTED",
      },
      select: { id: true },
    }),
  ]);

  const monthLabel = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(now);

  const summary: Record<AttendanceView["status"], number> = {
    HADIR: 0,
    TERLAMBAT: 0,
    IZIN: 0,
    SAKIT: 0,
  };
  for (const row of monthRows) summary[row.status] += 1;

  return (
    <>
      <PageHeader
        title="Absensi"
        description="Catat kehadiran harian dan pantau riwayat absensi Anda."
      />

      <div className="space-y-6">
        <AbsensiPanel
          todayLabel={formatWibDate(todayWib())}
          divisionName={placement.division.name}
          workStart={placement.workStart}
          workEnd={placement.workEnd}
          today={todayRow ? toView(todayRow) : null}
          hasLogToday={!!logToday}
        />

        <section aria-labelledby="riwayat-absensi" className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="riwayat-absensi"
                  className="text-sm font-semibold tracking-tight text-text"
                >
                  Riwayat bulan ini
                </h2>
                <Badge tone="neutral">{monthRows.length} catatan</Badge>
              </div>
              <p className="mt-1 text-xs text-text-muted">
                {monthLabel} · Rekap kehadiran Anda
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Badge tone="success">Hadir {summary.HADIR}</Badge>
              <Badge tone="warning">Terlambat {summary.TERLAMBAT}</Badge>
              <Badge tone="info">Izin {summary.IZIN}</Badge>
              <Badge tone="danger">Sakit {summary.SAKIT}</Badge>
            </div>
          </div>

          <Card className="overflow-hidden">
            {monthRows.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <History className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-semibold text-text">
                  Belum ada absensi bulan ini
                </p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-text-muted">
                  Catatan kehadiran akan muncul di sini setelah Anda melakukan
                  absensi masuk.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden grid-cols-[minmax(0,1.5fr)_110px_140px_minmax(0,1fr)] gap-4 border-b border-border bg-surface-muted/40 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted sm:grid">
                  <span>Tanggal</span>
                  <span>Status</span>
                  <span>Jam</span>
                  <span>Keterangan</span>
                </div>

                <div className="divide-y divide-border">
                  {monthRows.map((row) => {
                    const view = toView(row);
                    const meta = STATUS_META[row.status];
                    const StatusIcon = meta.Icon;
                    const date = splitWibDate(row.attDate);

                    return (
                      <div
                        key={row.id}
                        className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1.5fr)_110px_140px_minmax(0,1fr)] sm:items-center sm:gap-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-surface-muted text-text-muted">
                            <CalendarDays className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-text">
                              {date.date}
                            </p>
                            <p className="mt-0.5 text-[11px] text-text-muted">
                              {date.weekday}
                            </p>
                          </div>
                        </div>

                        <div>
                          <Badge
                            tone={meta.tone}
                            className="gap-1 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                          >
                            <StatusIcon className="h-3 w-3" />
                            {meta.label}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                              Masuk
                            </p>
                            <p className="mt-0.5 text-xs font-semibold tabular-nums text-text">
                              {view.checkIn ?? "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                              Pulang
                            </p>
                            <p className="mt-0.5 text-xs font-semibold tabular-nums text-text">
                              {view.checkOut ?? "—"}
                            </p>
                          </div>
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs leading-relaxed text-text-muted">
                            {view.note || "—"}
                          </p>
                          {row.earlyLeave && (
                            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-warning">
                              <Clock3 className="h-3 w-3" /> Pulang lebih awal
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </section>
      </div>
    </>
  );
}
