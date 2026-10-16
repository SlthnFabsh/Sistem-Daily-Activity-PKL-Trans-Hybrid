import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { getActivePlacementForUser } from "@/lib/attendance";
import { formatWibDate } from "@/lib/time";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default async function RiwayatPage() {
  const user = await requireRole("STUDENT");
  const placement = await getActivePlacementForUser(user.id);

  if (!placement) {
    return (
      <>
        <PageHeader
          title="Riwayat"
          description="Riwayat absensi dan log aktivitas."
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

  // Filter dari query string (bisa ditambah nanti).
  const draftLogs = logs.filter((l) => l.status === "DRAFT");
  const submittedLogs = logs.filter((l) => l.status === "SUBMITTED");

  return (
    <>
      <PageHeader
        title="Riwayat"
        description="Riwayat absensi dan log aktivitas yang sudah dikirim."
      />

      <div className="space-y-6">
        {/* Filter */}
        <Card className="p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Dari tanggal" type="date" name="fromDate" />
            <Input label="Sampai tanggal" type="date" name="toDate" />
            <Select label="Status" name="status" defaultValue="all">
              <option value="all">Semua</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Terkirim</option>
            </Select>
          </div>
        </Card>

        {/* Statistik ringkas */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3 text-center">
            <p className="text-2xl font-semibold text-text">{draftLogs.length}</p>
            <p className="text-xs text-text-muted">Draft</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-semibold text-text">
              {submittedLogs.length}
            </p>
            <p className="text-xs text-text-muted">Terkirim</p>
          </Card>
        </div>

        {/* Daftar log */}
        {logs.length === 0 ? (
          <Card className="py-8 text-center">
            <p className="text-sm text-text-muted">Belum ada log aktivitas.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
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
                  <Badge tone={log.status === "SUBMITTED" ? "primary" : "neutral"}>
                    {log.status === "SUBMITTED" ? "Terkirim" : "Draft"}
                  </Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-text-muted">
                  {log.description}
                </p>
                {log.output && (
                  <p className="mt-1 text-xs text-text-muted">
                    <span className="font-medium">Hasil:</span> {log.output}
                  </p>
                )}
                {log.obstacle && (
                  <p className="mt-1 text-xs text-text-muted">
                    <span className="font-medium">Hambatan:</span> {log.obstacle}
                  </p>
                )}
                {log.attachments.length > 0 && (
                  <p className="mt-1 text-xs text-text-muted">
                    {log.attachments.length} lampiran
                  </p>
                )}
                {log.submittedAt && (
                  <p className="mt-1 text-xs text-text-muted">
                    Dikirim: {formatWibDate(log.submittedAt)}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
