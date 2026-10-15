import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { getActivePlacementForUser } from "@/lib/attendance";
import { formatWibDate, formatWibTime, getWibDateParts, todayWib } from "@/lib/time";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AbsensiPanel, type AttendanceView } from "./absensi-panel";

const STATUS_LABEL: Record<AttendanceView["status"], string> = {
  HADIR: "Hadir",
  TERLAMBAT: "Terlambat",
  IZIN: "Izin",
  SAKIT: "Sakit",
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

export default async function AbsensiPage() {
  const user = await requireRole("STUDENT");
  const placement = await getActivePlacementForUser(user.id);

  if (!placement) {
    return (
      <>
        <PageHeader title="Absensi" description="Absen masuk, pulang, izin, dan sakit." />
        <Card className="py-10 text-center">
          <p className="text-sm text-text-muted">
            Anda belum memiliki penempatan PKL aktif. Hubungi HRD.
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
        placementId_attDate: { placementId: placement.id, attDate: todayWib() },
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

  return (
    <>
      <PageHeader
        title="Absensi"
        description="Absen masuk, pulang, izin, dan sakit."
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

        <section>
          <h2 className="mb-2 text-sm font-semibold text-text">
            Riwayat bulan ini
          </h2>
          {monthRows.length === 0 ? (
            <Card className="py-8 text-center">
              <p className="text-sm text-text-muted">
                Belum ada absensi bulan ini.
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {monthRows.map((row) => {
                const view = toView(row);
                return (
                  <Card key={row.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-text">
                          {formatWibDate(row.attDate)}
                        </p>
                        <p className="mt-0.5 text-xs text-text-muted">
                          Masuk {view.checkIn ?? "-"} · Pulang {view.checkOut ?? "-"}
                          {view.earlyLeave ? " · Pulang lebih awal" : ""}
                        </p>
                        {view.note && (
                          <p className="mt-0.5 text-xs text-text-muted">
                            {view.note}
                          </p>
                        )}
                      </div>
                      <Badge tone={row.status === "HADIR" ? "primary" : "neutral"}>
                        {STATUS_LABEL[row.status]}
                      </Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}