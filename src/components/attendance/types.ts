import type { AttendanceStatus } from "@/generated/prisma/client";

export type AttendanceStudentView = {
  id: string;
  name: string;
  nis: string | null;
  schoolName: string;
  className: string | null;
  major: string | null;
  divisionName: string;
};

export type AttendanceReviewItem = {
  id: string;
  attDate: string; // ISO
  formattedDate: string; // mis. "Jumat, 16 Oktober 2026"
  status: AttendanceStatus;
  checkIn: string | null; // "HH:mm" WIB
  checkOut: string | null; // "HH:mm" WIB
  earlyLeave: boolean;
  note: string | null;
  latitude: number | null;
  longitude: number | null;
  hasPhoto: boolean;
  student: AttendanceStudentView;
};

export type AttendanceStudentOption = {
  id: string;
  name: string;
  schoolName?: string;
  divisionName?: string;
};

export type AttendanceActiveFilters = {
  studentId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
};

export type AttendancePagination = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};
