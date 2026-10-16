import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { formatWibDate, formatWibTime } from "@/lib/time";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
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

// Batas baris log terkirim yang dirender sekaligus (halaman tetap ringan).
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
          description="Tinjau log aktivitas siswa di divisi Anda."
        />
        <Card className="py-10 text-center">
          <p className="text-sm text-text-muted">
            Akun pembimbing Anda belum terhubung dengan divisi. Hubungi HRD.
          </p>
        </Card>
      </>
    );
  }

  // Ambil semua siswa di divisi pembimbing dari hasil include
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

  // PENGECEKAN SERVER:
  // 1. Status log wajib SUBMITTED
  // 2. DivisionId HANYA divisi milik pembimbing ini
  // 3. Jika pengguna memfilter studentId, validasi bahwa siswa tersebut ada di divisi ini.
  //    Jika siswa dari divisi lain dimasukkan lewat URL, hasil dipaksa kosong.
  const whereClause: {
    status: "SUBMITTED";
    placement: {
      divisionId: string;
      studentId?: string;
    };
    logDate?: {
      gte?: Date;
      lte?: Date;
    };
  } = {
    status: "SUBMITTED",
    placement: {
      divisionId: mentor.divisionId,
    },
  };

  if (rawStudentId && rawStudentId !== "all") {
    if (studentMap.has(rawStudentId)) {
      whereClause.placement.studentId = rawStudentId;
    } else {
      // Siswa tidak berada di divisi pembimbing: tolak dan jangan kembalikan log apa pun
      whereClause.placement.studentId = "FORBIDDEN_STUDENT_ID";
    }
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

  const logs = await prisma.activityLog.findMany({
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
    // Batasi jumlah baris supaya halaman tetap ringan di dataset besar.
    take: SUBMITTED_LIMIT + 1,
  });

  const truncatedSubmitted = logs.length > SUBMITTED_LIMIT;

  const viewItems: LogReviewItem[] = logs.slice(0, SUBMITTED_LIMIT).map((l) => ({
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
        description={`Tinjau log aktivitas terkirim dari siswa di ${mentor.division.name}.`}
      />
      <LogReviewManager
        logs={viewItems}
        students={studentOptions}
        activeFilters={{
          studentId: rawStudentId,
          fromDate: validFromDate,
          toDate: validToDate,
        }}
        divisionName={mentor.division.name}
        truncatedSubmitted={truncatedSubmitted}
      />
    </>
  );
}
