import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { formatWibDate, formatWibTime } from "@/lib/time";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
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
const SUBMITTED_LIMIT = 300;

export default async function MentorLogPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireRole("MENTOR");

  const mentor = await prisma.mentor.findUnique({
    where: { userId: user.id },
    include: {
      division: {
        include: {
          placements: {
            include: {
              student: {
                include: { user: { select: { name: true } } },
              },
            },
            orderBy: {
              student: { user: { name: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!mentor) {
    return (
      <>
        <PageHeader
          title="Log Aktivitas Siswa"
          description="Tinjau dan setujui log aktivitas siswa di divisi Anda."
        />
        <Card className="py-10 text-center">
          <p className="text-sm text-text-muted">
            Akun pembimbing Anda belum terhubung dengan divisi. Hubungi HRD.
          </p>
        </Card>
      </>
    );
  }

  const placementsInDivision = mentor.division.placements;
  const studentMap = new Map<string, StudentOption>();
  for (const p of placementsInDivision) {
    if (!studentMap.has(p.studentId)) {
      studentMap.set(p.studentId, {
        id: p.studentId,
        name: p.student.user.name,
        schoolName: p.student.schoolName,
      });
    }
  }
  const studentOptions: StudentOption[] = Array.from(studentMap.values());

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

  // Tanggal batas 7 hari lalu untuk deteksi keterlambatan approval
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Ambil log yang menunggu persetujuan (SUBMITTED) di divisi ini
  const wherePending: {
    status: "SUBMITTED";
    placement: { divisionId: string; studentId?: string };
    logDate?: { gte?: Date; lte?: Date };
  } = {
    status: "SUBMITTED",
    placement: { divisionId: mentor.divisionId },
  };

  if (rawStudentId && rawStudentId !== "all") {
    if (studentMap.has(rawStudentId)) {
      wherePending.placement.studentId = rawStudentId;
    } else {
      wherePending.placement.studentId = "FORBIDDEN_STUDENT_ID";
    }
  }

  if (validFromDate || validToDate) {
    wherePending.logDate = {
      ...(validFromDate ? { gte: new Date(`${validFromDate}T00:00:00.000Z`) } : {}),
      ...(validToDate ? { lte: new Date(`${validToDate}T00:00:00.000Z`) } : {}),
    };
  }

  // Hitung jumlah log overdue (> 7 hari belum diapprove) di divisi ini
  const overdueCount = await prisma.activityLog.count({
    where: {
      status: "SUBMITTED",
      placement: { divisionId: mentor.divisionId },
      logDate: { lt: oneWeekAgo },
    },
  });

  const [pendingLogsRaw, approvedLogsRaw] = await Promise.all([
    prisma.activityLog.findMany({
      where: wherePending,
      include: {
        attachments: true,
        placement: {
          include: {
            student: { include: { user: { select: { name: true } } } },
            division: { select: { name: true } },
          },
        },
      },
      orderBy: [{ logDate: "asc" }, { submittedAt: "asc" }],
      take: SUBMITTED_LIMIT + 1,
    }),
    prisma.activityLog.findMany({
      where: {
        status: "APPROVED",
        placement: {
          divisionId: mentor.divisionId,
          ...(rawStudentId && rawStudentId !== "all" && studentMap.has(rawStudentId)
            ? { studentId: rawStudentId }
            : {}),
        },
        ...(validFromDate || validToDate
          ? {
              logDate: {
                ...(validFromDate ? { gte: new Date(`${validFromDate}T00:00:00.000Z`) } : {}),
                ...(validToDate ? { lte: new Date(`${validToDate}T00:00:00.000Z`) } : {}),
              },
            }
          : {}),
      },
      include: {
        attachments: true,
        placement: {
          include: {
            student: { include: { user: { select: { name: true } } } },
            division: { select: { name: true } },
          },
        },
      },
      orderBy: [{ logDate: "desc" }, { approvedAt: "desc" }],
      take: 50,
    }),
  ]);

  const mapLogItem = (l: (typeof pendingLogsRaw)[number]): LogReviewItem => {
    const isOverdue =
      l.status === "SUBMITTED" && new Date(l.logDate).getTime() < oneWeekAgo.getTime();
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
      status: l.status as "SUBMITTED" | "APPROVED",
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
  };

  const pendingItems: LogReviewItem[] = pendingLogsRaw.slice(0, SUBMITTED_LIMIT).map(mapLogItem);
  const approvedItems: LogReviewItem[] = approvedLogsRaw.map(mapLogItem);

  // Group pending by student untuk tombol setujui sekaligus per siswa
  const studentPendingMap = new Map<string, { studentId: string; studentName: string; count: number }>();
  for (const item of pendingItems) {
    const cur = studentPendingMap.get(item.student.id);
    if (cur) {
      cur.count += 1;
    } else {
      studentPendingMap.set(item.student.id, {
        studentId: item.student.id,
        studentName: item.student.name,
        count: 1,
      });
    }
  }
  const pendingByStudent = Array.from(studentPendingMap.values());

  return (
    <>
      <PageHeader
        title="Log Aktivitas Siswa"
        description={`Tinjau dan setujui log aktivitas siswa di divisi ${mentor.division.name}.`}
      />

      {overdueCount > 0 && (
        <div className="mb-5">
          <Notice tone="error">
            <strong>Peringatan Penting:</strong> Terdapat {overdueCount} log aktivitas siswa di divisi Anda yang belum disetujui lebih dari 1 minggu. Mohon segera setujui log agar kegiatan siswa dapat masuk ke laporan resmi PKL.
          </Notice>
        </div>
      )}

      <LogReviewManager
        logs={approvedItems}
        pendingLogs={pendingItems}
        pendingByStudent={pendingByStudent}
        students={studentOptions}
        activeFilters={{
          studentId: rawStudentId,
          fromDate: validFromDate,
          toDate: validToDate,
        }}
        divisionName={mentor.division.name}
        isMentorView={true}
      />
    </>
  );
}
