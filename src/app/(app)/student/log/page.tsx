import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { getActivePlacementForUser } from "@/lib/attendance";
import { formatWibDate } from "@/lib/time";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogForm } from "./log-form";

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

  const logs = await prisma.activityLog.findMany({
    where: { placementId: placement.id },
    include: { attachments: true },
    orderBy: { logDate: "desc" },
  });

  const draftLogs = logs.filter((l) => l.status === "DRAFT");
  const submittedLogs = logs.filter((l) => l.status === "SUBMITTED");

  return (
    <>
      <PageHeader
        title="Log Aktivitas"
        description="Catat kegiatan harian dan unggah lampiran bukti."
      />

      <div className="space-y-6">
        {/* Form buat log baru */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-text">Buat Log Baru</h2>
          <LogForm attachments={[]} />
        </section>

        {/* Log DRAFT */}
        {draftLogs.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-text">
              Draft ({draftLogs.length})
            </h2>
            <div className="space-y-3">
              {draftLogs.map((log) => (
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

        {/* Log SUBMITTED */}
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
