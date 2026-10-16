import { prisma } from "@/lib/db";
import { AttendanceStatus } from "@/generated/prisma/client";
import { formatWibDate, formatWibTime, getWibDateParts } from "@/lib/time";
import type {
  AttendancePagination,
  AttendanceReviewItem,
  AttendanceStudentOption,
} from "@/components/attendance/types";

// Helper server untuk halaman "Absensi Siswa" (mentor & HRD).
// Menangani parsing filter dari query URL, pembatasan akses per divisi,
// dan pemetaan data ke bentuk yang aman dikirim ke komponen client.

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Dibuat kecil supaya DOM tetap ringan (tiap data memuat foto + peta).
const PER_PAGE = 12;

const STATUS_VALUES: AttendanceStatus[] = [
  AttendanceStatus.HADIR,
  AttendanceStatus.TERLAMBAT,
  AttendanceStatus.IZIN,
  AttendanceStatus.SAKIT,
];

export type AttendanceSearchParams = {
  [key: string]: string | string[] | undefined;
};

export type AttendanceReviewData = {
  items: AttendanceReviewItem[];
  students: AttendanceStudentOption[];
  activeFilters: {
    studentId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  };
  pagination: AttendancePagination;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function readParam(
  value: string | string[] | undefined
): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readIntParam(value: string | string[] | undefined): number | undefined {
  const raw = readParam(value);
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export async function loadAttendanceReview(options: {
  searchParams: AttendanceSearchParams;
  /** Jika diisi (mentor), hasil dibatasi ke divisi ini. */
  divisionId?: string;
}): Promise<AttendanceReviewData> {
  const { searchParams, divisionId } = options;

  const rawStudentId = readParam(searchParams.studentId);
  const rawStatus = readParam(searchParams.status);
  const rawFromDate = readParam(searchParams.fromDate);
  const rawToDate = readParam(searchParams.toDate);
  const rawPage = readIntParam(searchParams.page);

  // Daftar siswa yang boleh dilihat aktor (semua untuk HRD, hanya divisi untuk mentor).
  const studentRows = await prisma.student.findMany({
    where: divisionId ? { placements: { some: { divisionId } } } : undefined,
    include: {
      user: { select: { name: true } },
      placements: {
        where: divisionId ? { divisionId } : undefined,
        include: { division: { select: { name: true } } },
        orderBy: { period: { startDate: "desc" } },
        take: 1,
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  const students: AttendanceStudentOption[] = studentRows.map((s) => ({
    id: s.id,
    name: s.user.name,
    schoolName: s.schoolName,
    divisionName: s.placements[0]?.division.name,
  }));
  const allowedStudentIds = new Set(students.map((s) => s.id));

  // Rentang tanggal: pakai filter pengguna bila valid, jika tidak default bulan berjalan.
  const { year, month, day } = getWibDateParts();
  const fromDate =
    rawFromDate && DATE_REGEX.test(rawFromDate)
      ? rawFromDate
      : `${year}-${pad(month)}-01`;
  const toDate =
    rawToDate && DATE_REGEX.test(rawToDate) ? rawToDate : `${year}-${pad(month)}-${pad(day)}`;

  const validStudentId =
    rawStudentId && rawStudentId !== "all" ? rawStudentId : undefined;
  const validStatus =
    rawStatus && rawStatus !== "all" && (STATUS_VALUES as string[]).includes(rawStatus)
      ? (rawStatus as AttendanceStatus)
      : undefined;

  const placementScope: { divisionId?: string; studentId?: string } = {};
  if (divisionId) placementScope.divisionId = divisionId;
  if (validStudentId) {
    // Siswa di luar wewenang aktor lewat URL dipaksa kosong.
    placementScope.studentId = allowedStudentIds.has(validStudentId)
      ? validStudentId
      : "FORBIDDEN_STUDENT_ID";
  }

  const where: {
    attDate: { gte: Date; lte: Date };
    status?: AttendanceStatus;
    placement?: { divisionId?: string; studentId?: string };
  } = {
    attDate: {
      gte: new Date(`${fromDate}T00:00:00.000Z`),
      lte: new Date(`${toDate}T00:00:00.000Z`),
    },
  };
  if (Object.keys(placementScope).length > 0) where.placement = placementScope;
  if (validStatus) where.status = validStatus;

  const total = await prisma.attendance.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(rawPage ?? 1, totalPages);

  const rows = await prisma.attendance.findMany({
    where,
    include: {
      placement: {
        include: {
          student: { include: { user: { select: { name: true } } } },
          division: { select: { name: true } },
        },
      },
    },
    orderBy: [
      { attDate: "desc" },
      { placement: { student: { user: { name: "asc" } } } },
    ],
    skip: (page - 1) * PER_PAGE,
    take: PER_PAGE,
  });

  const items: AttendanceReviewItem[] = rows.map((row) => ({
    id: row.id,
    attDate: row.attDate.toISOString(),
    formattedDate: formatWibDate(row.attDate),
    status: row.status,
    checkIn: row.checkIn ? formatWibTime(row.checkIn) : null,
    checkOut: row.checkOut ? formatWibTime(row.checkOut) : null,
    earlyLeave: row.earlyLeave,
    note: row.note,
    latitude: row.latitude,
    longitude: row.longitude,
    hasPhoto: Boolean(row.photoPath),
    student: {
      id: row.placement.studentId,
      name: row.placement.student.user.name,
      nis: row.placement.student.nis,
      schoolName: row.placement.student.schoolName,
      className: row.placement.student.className,
      major: row.placement.student.major,
      divisionName: row.placement.division.name,
    },
  }));

  return {
    items,
    students,
    activeFilters: {
      studentId: validStudentId,
      status: validStatus,
      fromDate,
      toDate,
    },
    pagination: {
      page,
      perPage: PER_PAGE,
      total,
      totalPages,
    },
  };
}
