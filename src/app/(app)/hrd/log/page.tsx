import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { formatWibDate, formatWibTime } from "@/lib/time";
import { LogStatus } from "@/generated/prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { LogReviewManager } from "@/components/log-review/log-review-manager";
import { HrdImportTrigger } from "@/components/log/hrd-import-trigger";
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

  // Shared where clause tanpa status filter
  const placementFilter =
    rawStudentId && rawStudentId !== "all"
      ? { studentId: rawStudentId }
      : undefined;

  const logDateFilter =
    validFromDate || validToDate
      ? {
          ...(validFromDate
            ? { gte: new Date(`${validFromDate}T00:00:00.000Z`) }
            : {}),
          ...(validToDate
            ? { lte: new Date(`${validToDate}T00:00:00.000Z`) }
            : {}),
        }
      : undefined;

  const includeClause = {
    attachments: true,
    placement: {
      include: {
        student: {
          include: { user: { select: { name: true } } },
        },
        division: { select: { name: true } },
      },
    },
  } as const;

  // Jalankan query siswa, log SUBMITTED, dan log PENDING_REVIEW secara paralel
  const [allStudents, submittedLogs, pendingLogs] = await Promise.all([
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
      where: {
        status: LogStatus.SUBMITTED,
        ...(placementFilter ? { placement: placementFilter } : {}),
        ...(logDateFilter ? { logDate: logDateFilter } : {}),
      },
      include: includeClause,
      orderBy: [{ logDate: "desc" }, { submittedAt: "desc" }],
    }),
    // PENDING_REVIEW: semua tanpa filter tanggal, tapi bisa filter per siswa
    prisma.activityLog.findMany({
      where: {
        status: LogStatus.PENDING_REVIEW,
        ...(placementFilter ? { placement: placementFilter } : {}),
      },
      include: includeClause,
      orderBy: [{ placement: { student: { user: { name: "asc" } } } }, { logDate: "asc" }],
    }),
  ]);

  const studentOptions: StudentOption[] = allStudents.map((s) => ({
    id: s.id,
    name: s.user.name,
    schoolName: s.schoolName,
    divisionName: s.placements[0]?.division.name,
  }));

  type LogWithRelations = {
    id: string;
    logDate: Date;
    startTime: string;
    endTime: string;
    taskFrom: string;
    description: string;
    output: string | null;
    obstacle: string | null;
    submittedAt: Date | null;
    placementId: string;
    attachments: {
      id: string;
      fileName: string;
      fileType: string;
      fileSize: number;
    }[];
    placement: {
      studentId: string;
      student: {
        nis: string | null;
        schoolName: string;
        className: string | null;
        major: string | null;
        user: { name: string };
      };
      division: { name: string };
    };
  };

  function toViewItem(
    l: LogWithRelations,
    status: "SUBMITTED" | "PENDING_REVIEW"
  ): LogReviewItem {
    return {
      id: l.id,
      logDate: l.logDate.toISOString(),
      formattedDate: formatWibDate(l.logDate),
      startTime: l.startTime,
      endTime: l.endTime,
      taskFrom: l.taskFrom,
      description: l.description,
      output: l.output,
      obstacle: l.obstacle,
      status,
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
    };
  }

  const submittedItems = submittedLogs.map((l) => toViewItem(l, "SUBMITTED"));
  const pendingItems = pendingLogs.map((l) => toViewItem(l, "PENDING_REVIEW"));


  // Kelompokkan pending per siswa (untuk tombol Setujui Semua)
  const pendingByStudent = new Map<string, { studentId: string; studentName: string; count: number }>();
  for (const item of pendingItems) {
    const existing = pendingByStudent.get(item.student.id);
    if (existing) {
      existing.count += 1;
    } else {
      pendingByStudent.set(item.student.id, {
        studentId: item.student.id,
        studentName: item.student.name,
        count: 1,
      });
    }
  }

  return (
    <>
      <PageHeader
        title="Log Aktivitas Siswa"
        description="Tinjau log aktivitas terkirim dari seluruh siswa."
        action={<HrdImportTrigger students={studentOptions} />}
      />
      <LogReviewManager
        logs={submittedItems}
        pendingLogs={pendingItems}
        pendingByStudent={Array.from(pendingByStudent.values())}
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
