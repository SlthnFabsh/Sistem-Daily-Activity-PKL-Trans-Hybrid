import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { getActivePlacementForUser } from "@/lib/attendance";
import { formatWibDate, todayWib } from "@/lib/time";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogForm } from "./log-form";
import { StudentImportTrigger } from "@/components/log/student-import-trigger";

export default async function LogPage() {
  const user = await requireRole("STUDENT");
  const placement = await getActivePlacementForUser(user.id);

  if (!placement) {
    return (
      <>
        <PageHeader
          title="Log Aktivitas"
          description="Catat kegiatan harian dan unggah lampiran bukti."
        />
        <Card className="py-10 text-center">
          <p className="text-sm text-text-muted">
            Anda belum memiliki penempatan PKL aktif. Hubungi HRD.
          </p>
        </Card>
      </>
    );
  }

  const today = todayWib();
  const todayIso = today.toISOString().slice(0, 10);

  // Cek apakah sudah checkout hari ini (jika ya, log hari ini dikunci)
  const todayAttendance = await prisma.attendance.findUnique({
    where: {
      placementId_attDate: { placementId: placement.id, attDate: today },
    },
    select: { checkOut: true },
  });
  const lockedByCheckout = !!todayAttendance?.checkOut;

  let logs = await prisma.activityLog.findMany({
    where: { placementId: placement.id },
    include: { attachments: true },
    orderBy: { logDate: "desc" },
  });

  let todaysDraft = logs.find(
    (l) =>
      l.status === "DRAFT" && l.logDate.toISOString().slice(0, 10) === todayIso
  );
  const anyLogToday = logs.some(
    (l) => l.logDate.toISOString().slice(0, 10) === todayIso
  );

  if (!todaysDraft && !anyLogToday) {
    const created = await prisma.activityLog.create({
      data: {
        placementId: placement.id,
        logDate: today,
        startTime: "08:00",
        endTime: "16:00",
        taskFrom: "",
        description: "",
      },
      include: { attachments: true },
    });
    todaysDraft = created;
    logs = [created, ...logs];
  }

  const draftLogs = logs.filter((l) => l.status === "DRAFT");
  // Log SUBMITTED hari ini bisa diedit jika belum checkout
  const todaysSubmitted = logs.find(
    (l) =>
      l.status === "SUBMITTED" && l.logDate.toISOString().slice(0, 10) === todayIso
  );
  // Log SUBMITTED lainnya (bukan hari ini) — hanya tampil read-only
  const submittedLogs = logs.filter(
    (l) =>
      l.status === "SUBMITTED" &&
      l.logDate.toISOString().slice(0, 10) !== todayIso
  );

  return (
    <>
      <PageHeader
        title="Log Aktivitas"
        description="Catat kegiatan harian dan unggah lampiran bukti."
        action={<StudentImportTrigger />}
      />

      <div className="space-y-6">
        {/* Form untuk draft hari ini (otomatis dibuat) */}
        {todaysDraft && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-text">
              Log Hari Ini
            </h2>
            <LogForm
              logId={todaysDraft.id}
              logStatus="DRAFT"
              lockedByCheckout={lockedByCheckout}
              defaultValues={{
                logDate: todaysDraft.logDate.toISOString().slice(0, 10),
                startTime: todaysDraft.startTime,
                endTime: todaysDraft.endTime,
                taskFrom: todaysDraft.taskFrom,
                description: todaysDraft.description,
                output: todaysDraft.output ?? undefined,
                obstacle: todaysDraft.obstacle ?? undefined,
              }}
              attachments={todaysDraft.attachments}
            />
          </section>
        )}

        {/* Log SUBMITTED hari ini yang masih bisa diedit */}
        {todaysSubmitted && !todaysDraft && (
          <section>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-text">
              Log Hari Ini
              <Badge tone="primary">Terkirim</Badge>
              {!lockedByCheckout && (
                <span className="text-xs font-normal text-text-muted">
                  (masih bisa diedit sebelum absen pulang)
                </span>
              )}
              {lockedByCheckout && (
                <span className="text-xs font-normal text-text-muted">
                  (dikunci setelah absen pulang)
                </span>
              )}
            </h2>
            <LogForm
              logId={todaysSubmitted.id}
              logStatus="SUBMITTED"
              lockedByCheckout={lockedByCheckout}
              defaultValues={{
                logDate: todaysSubmitted.logDate.toISOString().slice(0, 10),
                startTime: todaysSubmitted.startTime,
                endTime: todaysSubmitted.endTime,
                taskFrom: todaysSubmitted.taskFrom,
                description: todaysSubmitted.description,
                output: todaysSubmitted.output ?? undefined,
                obstacle: todaysSubmitted.obstacle ?? undefined,
              }}
              attachments={todaysSubmitted.attachments}
            />
          </section>
        )}

        {/* Draft lainnya (selain hari ini) */}
        {draftLogs.filter((l) => l.id !== todaysDraft?.id).length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-text">
              Draft Lainnya
            </h2>
            <div className="space-y-3">
              {draftLogs
                .filter((l) => l.id !== todaysDraft?.id)
                .map((log) => (
                  <Card key={log.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-text">
                          {formatWibDate(log.logDate)}
                        </p>
                        <p className="mt-0.5 text-xs text-text-muted">
                          {log.startTime} – {log.endTime} WIB · {log.taskFrom}
                        </p>
                      </div>
                      <Badge tone="neutral">Draft</Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-text-muted">
                      {log.description}
                    </p>
                    {log.attachments.length > 0 && (
                      <p className="mt-1 text-xs text-text-muted">
                        {log.attachments.length} lampiran
                      </p>
                    )}
                    <div className="mt-3">
                      <LogForm
                        logId={log.id}
                        logStatus="DRAFT"
                        lockedByCheckout={false}
                        defaultValues={{
                          logDate: log.logDate.toISOString().slice(0, 10),
                          startTime: log.startTime,
                          endTime: log.endTime,
                          taskFrom: log.taskFrom,
                          description: log.description,
                          output: log.output ?? undefined,
                          obstacle: log.obstacle ?? undefined,
                        }}
                        attachments={log.attachments}
                      />
                    </div>
                  </Card>
                ))}
            </div>
          </section>
        )}

        {/* Log SUBMITTED lainnya (bukan hari ini) — read-only */}
        {submittedLogs.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-text">
              Terkirim ({submittedLogs.length})
            </h2>
            <div className="space-y-2">
              {submittedLogs.map((log) => (
                <Card key={log.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-text">
                        {formatWibDate(log.logDate)}
                      </p>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {log.startTime} – {log.endTime} WIB · {log.taskFrom}
                      </p>
                    </div>
                    <Badge tone="primary">Terkirim</Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-text-muted">
                    {log.description}
                  </p>
                  {log.attachments.length > 0 && (
                    <p className="mt-1 text-xs text-text-muted">
                      {log.attachments.length} lampiran
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
