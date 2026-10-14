import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { formatWibDate, formatWibTime } from "@/lib/time";
import { PageHeader } from "@/components/ui/page-header";
import { LogReviewManager } from "@/components/log-review/log-review-manager";
import type {
  LogReviewItem,
  StudentOption,
} from "@/components/log-review/types";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export default async function HrdLogPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireRole("HRD");

  // Ambil parameter filter dari query URL
  const search = await props.searchParams;
  const rawStudentId =
    typeof search.studentId === "string" ? search.studentId : undefined;
  const rawFromDate =
    typeof search.fromDate === "string" ? search.fromDate : undefined;
  const rawToDate =
    typeof search.toDate === "string" ? search.toDate : undefined;

  const validFromDate =
    rawFromDate && DATE_REGEX.test(rawFromDate) ? rawFromDate : undefined;
  const validToDate =
    rawToDate && DATE_REGEX.test(rawToDate) ? rawToDate : undefined;

  // HRD melihat log SEMUA siswa; filter opsional
  const whereClause: {
    status: "SUBMITTED";
    placement?: { studentId?: string };
    logDate?: { gte?: Date; lte?: Date };
  } = {
    status: "SUBMITTED",
  };

  if (rawStudentId && rawStudentId !== "all") {
    whereClause.placement = { studentId: rawStudentId };
  }

  if (validFromDate || validToDate) {
    whereClause.logDate = {
      ...(validFromDate
        ? { gte: new Date(`${validFromDate}T00:00:00.000Z`) }
        : {}),
      ...(validToDate
        ? { lte: new Date(`${validToDate}T00:00:00.000Z`) }
        : {}),
    };
  }

  // Jalankan query siswa dan log secara paralel
  const [allStudents, logs] = await Promise.all([
    prisma.student.findMany({
      include: {
        user: { select: { name: true } },
        placements: {
          include: { division: { select: { name: true } } },
          orderBy: { period: { startDate: "desc" } },
          take: 1,
        },
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.activityLog.findMany({
      where: whereClause,
      include: {
        attachments: true,
        placement: {
          include: {
            student: {
              include: { user: { select: { name: true } } },
            },
            division: { select: { name: true } },
          },
        },
      },
      orderBy: [{ logDate: "desc" }, { submittedAt: "desc" }],
    }),
  ]);

  const studentOptions: StudentOption[] = allStudents.map((s) => ({
    id: s.id,
    name: s.user.name,
    schoolName: s.schoolName,
    divisionName: s.placements[0]?.division.name,
  }));

  const viewItems: LogReviewItem[] = logs.map((l) => ({
    id: l.id,
    logDate: l.logDate.toISOString(),
    formattedDate: formatWibDate(l.logDate),
    startTime: l.startTime,
    endTime: l.endTime,
    taskFrom: l.taskFrom,
    description: l.description,
    output: l.output,
    obstacle: l.obstacle,
    status: "SUBMITTED",
    submittedAt: l.submittedAt ? l.submittedAt.toISOString() : null,
    formattedSubmittedAt: l.submittedAt
      ? `${formatWibDate(l.submittedAt)} pukul ${formatWibTime(l.submittedAt)}`
      : null,
    student: {
      id: l.placement.studentId,
      name: l.placement.student.user.name,
      nis: l.placement.student.nis,
      schoolName: l.placement.student.schoolName,
      className: l.placement.student.className,
      major: l.placement.student.major,
      divisionName: l.placement.division.name,
    },
    attachments: l.attachments.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      fileType: a.fileType,
      fileSize: a.fileSize,
      formattedSize: formatFileSize(a.fileSize),
    })),
  }));

  return (
    <>
      <PageHeader
        title="Log Aktivitas Siswa"
        description="Tinjau log aktivitas terkirim dari seluruh siswa."
      />
      <LogReviewManager
        logs={viewItems}
        students={studentOptions}
        activeFilters={{
          studentId: rawStudentId,
          fromDate: validFromDate,
          toDate: validToDate,
        }}
      />
    </>
  );
}
