import { prisma } from "@/lib/db";
import { requireAdminOrHrd } from "@/lib/permissions";
import { formatWibDate, formatWibTime } from "@/lib/time";
import { LogStatus } from "@/generated/prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { Notice } from "@/components/ui/notice";
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
const SUBMITTED_LIMIT = 300;

export default async function HrdLogPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdminOrHrd();

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
        division: {
          include: {
            mentors: {
              include: { user: { select: { name: true } } },
            },
          },
        },
      },
    },
  } as const;

  // Tanggal batas 7 hari lalu untuk deteksi log yang belum disetujui pembimbing > 1 minggu
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Ambil log yang menumpuk > 1 minggu (overdue approval) untuk notifikasi HRD
  const overdueLogs = await prisma.activityLog.findMany({
    where: {
      status: LogStatus.SUBMITTED,
      logDate: { lt: oneWeekAgo },
    },
    include: {
      placement: {
        include: {
          student: { include: { user: { select: { name: true } } } },
          division: {
            include: {
              mentors: {
                where: { isPic: true },
                include: { user: { select: { name: true } } },
              },
            },
          },
        },
      },
    },
    orderBy: { logDate: "asc" },
  });

  // Rekap overdue per divisi untuk HRD
  const overdueByDivisionMap = new Map<
    string,
    {
      divisionName: string;
      mentorName: string;
      studentNames: Set<string>;
      count: number;
    }
  >();

  for (const log of overdueLogs) {
    const divId = log.placement.divisionId;
    const divName = log.placement.division.name;
    const pic = log.placement.division.mentors[0]?.user.name ?? "Belum ada PIC";
    const studentName = log.placement.student.user.name;

    const existing = overdueByDivisionMap.get(divId);
    if (existing) {
      existing.count += 1;
      existing.studentNames.add(studentName);
    } else {
      overdueByDivisionMap.set(divId, {
        divisionName: divName,
        mentorName: pic,
        studentNames: new Set([studentName]),
        count: 1,
      });
    }
  }

  const overdueDivisionSummaries = Array.from(overdueByDivisionMap.values()).map(
    (item) => ({
      ...item,
      studentsList: Array.from(item.studentNames).join(", "),
    })
  );

  // Jalankan query siswa, log APPROVED/SUBMITTED, dan log PENDING_REVIEW
  const [allStudents, allSubmittedLogs, pendingLogs] = await Promise.all([
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
        status: { in: [LogStatus.SUBMITTED, LogStatus.APPROVED] },
        ...(placementFilter ? { placement: placementFilter } : {}),
        ...(logDateFilter ? { logDate: logDateFilter } : {}),
      },
      include: includeClause,
      orderBy: [{ logDate: "desc" }, { submittedAt: "desc" }],
      take: SUBMITTED_LIMIT + 1,
    }),
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

  type LogItemRaw = (typeof allSubmittedLogs)[number];

  function toViewItem(l: LogItemRaw): LogReviewItem {
    const isOverdue =
      l.status === LogStatus.SUBMITTED &&
      new Date(l.logDate).getTime() < oneWeekAgo.getTime();
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
      status: l.status as "SUBMITTED" | "PENDING_REVIEW" | "APPROVED",
      submittedAt: l.submittedAt ? l.submittedAt.toISOString() : null,
      formattedSubmittedAt: l.submittedAt
        ? `${formatWibDate(l.submittedAt)} pukul ${formatWibTime(l.submittedAt)}`
        : null,
      approvedAt: l.approvedAt ? l.approvedAt.toISOString() : null,
      isOverdue,
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

  const submittedItems = allSubmittedLogs.slice(0, SUBMITTED_LIMIT).map(toViewItem);
  const truncatedSubmitted = allSubmittedLogs.length > SUBMITTED_LIMIT;
  const pendingItems = pendingLogs.map(toViewItem);

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
        description="Tinjau log aktivitas terkirim dan pantau persetujuan pembimbing."
        action={<HrdImportTrigger students={studentOptions} />}
      />

      {/* Peringatan HRD: Pembimbing belum approve log > 1 minggu */}
      {overdueDivisionSummaries.length > 0 && (
        <div className="mb-5 space-y-2">
          {overdueDivisionSummaries.map((summary) => (
            <Notice key={summary.divisionName} tone="error">
              <strong>Pemberitahuan Keterlambatan:</strong> Terdapat {summary.count} log siswa di divisi <strong>{summary.divisionName}</strong> (Siswa: {summary.studentsList}) yang belum disetujui lebih dari 1 minggu oleh Pembimbing (<strong>{summary.mentorName}</strong>). HRD disarankan segera menghubungi pembimbing terkait secara langsung.
            </Notice>
          ))}
        </div>
      )}

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
        truncatedSubmitted={truncatedSubmitted}
      />
    </>
  );
}
