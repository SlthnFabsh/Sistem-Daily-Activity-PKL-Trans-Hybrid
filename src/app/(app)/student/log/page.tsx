import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { getActivePlacementForUser } from "@/lib/attendance";
import { formatWibDate, todayWib } from "@/lib/time";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogForm } from "./log-form";
import { StudentImportTrigger } from "@/components/log/student-import-trigger";

const SUBMITTED_PAGE_SIZE = 10;

function parsePage(value: string | string[] | undefined): number {
  if (typeof value !== "string") return 1;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function pageHref(page: number): string {
  return page <= 1 ? "/student/log#terkirim" : `/student/log?page=${page}#terkirim`;
}

function getPageNumbers(
  currentPage: number,
  totalPages: number
): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  let start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  start = Math.max(1, end - 4);

  const pages: (number | "ellipsis")[] = [];
  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("ellipsis");
  }
  for (let page = start; page <= end; page++) pages.push(page);
  if (end < totalPages) {
    if (end < totalPages - 1) pages.push("ellipsis");
    pages.push(totalPages);
  }
  return pages;
}

// Di layar kecil cukup tampilkan 3 nomor di sekitar halaman aktif agar
// tombol sebelumnya/berikutnya tidak turun ke baris baru.
function getMobilePageNumbers(
  currentPage: number,
  totalPages: number
): number[] {
  if (totalPages <= 3) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  if (currentPage <= 2) return [1, 2, 3];
  if (currentPage >= totalPages - 1) {
    return [totalPages - 2, totalPages - 1, totalPages];
  }
  return [currentPage - 1, currentPage, currentPage + 1];
}

function PageNumberLink({
  page,
  currentPage,
}: {
  page: number;
  currentPage: number;
}) {
  const active = page === currentPage;
  return (
    <Link
      href={pageHref(page)}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-primary bg-primary px-2 text-xs font-semibold text-white shadow-sm"
          : "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-white px-2 text-xs font-semibold text-text-muted transition-colors hover:border-primary/40 hover:text-primary"
      }
    >
      {page}
    </Link>
  );
}

export default async function LogPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
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

  const search = await props.searchParams;
  const requestedPage = parsePage(search.page);

  const today = todayWib();

  // Cek apakah sudah checkout hari ini (jika ya, log hari ini dikunci)
  const todayAttendance = await prisma.attendance.findUnique({
    where: {
      placementId_attDate: { placementId: placement.id, attDate: today },
    },
    select: { checkOut: true },
  });
  const lockedByCheckout = !!todayAttendance?.checkOut;

  const [todayLogs, draftLogs, submittedTotal] = await Promise.all([
    prisma.activityLog.findMany({
      where: { placementId: placement.id, logDate: today },
      include: { attachments: true },
      orderBy: { logDate: "desc" },
    }),
    prisma.activityLog.findMany({
      where: {
        placementId: placement.id,
        status: "DRAFT",
        logDate: { not: today },
      },
      include: { attachments: true },
      orderBy: { logDate: "desc" },
    }),
    prisma.activityLog.count({
      where: {
        placementId: placement.id,
        status: "SUBMITTED",
        logDate: { not: today },
      },
    }),
  ]);

  let todaysDraft = todayLogs.find((log) => log.status === "DRAFT");
  const anyLogToday = todayLogs.length > 0;

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
    todayLogs.push(created);
  }

  // Log SUBMITTED hari ini bisa diedit jika belum checkout
  const todaysSubmitted = todayLogs.find(
    (log) => log.status === "SUBMITTED"
  );

  const totalPages = Math.max(
    1,
    Math.ceil(submittedTotal / SUBMITTED_PAGE_SIZE)
  );
  const currentPage = Math.min(requestedPage, totalPages);

  const submittedLogs =
    submittedTotal === 0
      ? []
      : await prisma.activityLog.findMany({
          where: {
            placementId: placement.id,
            status: "SUBMITTED",
            logDate: { not: today },
          },
          include: { attachments: true },
          orderBy: [{ logDate: "desc" }, { submittedAt: "desc" }],
          skip: (currentPage - 1) * SUBMITTED_PAGE_SIZE,
          take: SUBMITTED_PAGE_SIZE,
        });

  const firstItem =
    submittedTotal === 0
      ? 0
      : (currentPage - 1) * SUBMITTED_PAGE_SIZE + 1;
  const lastItem = Math.min(
    currentPage * SUBMITTED_PAGE_SIZE,
    submittedTotal
  );
  const pageNumbers = getPageNumbers(currentPage, totalPages);
  const mobilePageNumbers = getMobilePageNumbers(currentPage, totalPages);

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
        {draftLogs.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-text">
              Draft Lainnya
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
        {submittedTotal > 0 && (
          <section id="terkirim" className="scroll-mt-24">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-text">
                Terkirim{" "}
                <span className="font-normal text-text-muted">
                  ({submittedTotal})
                </span>
              </h2>
              <p className="mt-0.5 text-xs text-text-muted">
                Menampilkan {firstItem}–{lastItem} dari {submittedTotal} log
              </p>
            </div>

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

            {totalPages > 1 && (
              <nav
                aria-label="Navigasi halaman log terkirim"
                className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-xs text-text-muted">
                  Halaman {currentPage} dari {totalPages}
                </p>
                <div className="flex items-center gap-1.5">
                  {currentPage > 1 ? (
                    <Link
                      href={pageHref(currentPage - 1)}
                      aria-label="Halaman sebelumnya"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-text-muted transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      aria-label="Halaman sebelumnya"
                      className="inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg border border-border bg-surface-muted text-text-muted/40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </span>
                  )}

                  <div className="hidden items-center gap-1.5 sm:flex">
                    {pageNumbers.map((page, index) =>
                      page === "ellipsis" ? (
                        <span
                          key={`ellipsis-${index}`}
                          className="inline-flex h-9 min-w-9 items-center justify-center px-1 text-xs text-text-muted"
                        >
                          …
                        </span>
                      ) : (
                        <PageNumberLink
                          key={page}
                          page={page}
                          currentPage={currentPage}
                        />
                      )
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 sm:hidden">
                    {mobilePageNumbers.map((page) => (
                      <PageNumberLink
                        key={page}
                        page={page}
                        currentPage={currentPage}
                      />
                    ))}
                  </div>

                  {currentPage < totalPages ? (
                    <Link
                      href={pageHref(currentPage + 1)}
                      aria-label="Halaman berikutnya"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-text-muted transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      aria-label="Halaman berikutnya"
                      className="inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg border border-border bg-surface-muted text-text-muted/40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </nav>
            )}
          </section>
        )}
      </div>
    </>
  );
}
