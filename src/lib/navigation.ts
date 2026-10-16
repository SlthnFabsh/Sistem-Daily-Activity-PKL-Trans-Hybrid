import {
  Building2,
  CalendarCheck,
  CalendarRange,
  ClipboardList,
  Eye,
  FileText,
  GraduationCap,
  History,
  KeyRound,
  MapPin,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/generated/prisma/client";

// `short` dipakai untuk label ringkas (bottom nav di layar HP 360px).
export type NavItem = {
  href: string;
  label: string;
  short?: string;
  icon: string;
};

// Nama ikon dikirim sebagai string (bukan komponen) agar aman melewati
// batas Server -> Client. Komponen client me-resolve via peta ini.
export const iconMap: Record<string, LucideIcon> = {
  "calendar-check": CalendarCheck,
  "clipboard-list": ClipboardList,
  history: History,
  "file-text": FileText,
  users: Users,
  "building-2": Building2,
  "calendar-range": CalendarRange,
  "graduation-cap": GraduationCap,
  "map-pin": MapPin,
  eye: Eye,
  "key-round": KeyRound,
};

export const NAV_ITEMS: Record<Role, NavItem[]> = {
  STUDENT: [
    { href: "/student/absensi", label: "Absensi", icon: "calendar-check" },
    { href: "/student/log", label: "Log Aktivitas", short: "Log", icon: "clipboard-list" },
    { href: "/student/riwayat", label: "Riwayat", icon: "history" },
    { href: "/student/laporan", label: "Laporan", icon: "file-text" },
    { href: "/settings/password", label: "Ganti Password", short: "Password", icon: "key-round" },
  ],
  MENTOR: [
    { href: "/mentor/absensi", label: "Absensi Siswa", short: "Absensi", icon: "calendar-check" },
    { href: "/mentor/log", label: "Log Siswa", short: "Log", icon: "clipboard-list" },
    { href: "/mentor/laporan", label: "Laporan", icon: "file-text" },
    { href: "/settings/password", label: "Ganti Password", short: "Password", icon: "key-round" },
  ],
  HRD: [
    { href: "/hrd/penempatan", label: "Penempatan", icon: "map-pin" },
    { href: "/hrd/absensi", label: "Absensi Siswa", short: "Absensi", icon: "calendar-check" },
    { href: "/hrd/log", label: "Log Siswa", short: "Log", icon: "clipboard-list" },
    { href: "/hrd/laporan", label: "Laporan", icon: "file-text" },
    { href: "/hrd/pic", label: "Lihat PIC", short: "PIC", icon: "users" },
    { href: "/hrd/siswa", label: "Lihat Siswa", short: "Siswa", icon: "graduation-cap" },
    { href: "/settings/password", label: "Ganti Password", short: "Password", icon: "key-round" },
  ],
  SUPERADMIN: [
    { href: "/superadmin/pengguna", label: "Pengguna", icon: "users" },
    { href: "/superadmin/siswa", label: "Siswa", icon: "graduation-cap" },
    { href: "/hrd/divisi", label: "Divisi", icon: "building-2" },
    { href: "/hrd/periode", label: "Periode", icon: "calendar-range" },
    { href: "/hrd/penempatan", label: "Penempatan", icon: "map-pin" },
    { href: "/hrd/absensi", label: "Absensi Siswa", short: "Absensi", icon: "calendar-check" },
    { href: "/hrd/log", label: "Log Siswa", short: "Log", icon: "clipboard-list" },
    { href: "/hrd/laporan", label: "Laporan", icon: "file-text" },
    { href: "/superadmin/password-requests", label: "Reset Password (Pengguna)", short: "Reset Password", icon: "key-round" },
  ],
};

export function roleLabel(role: Role): string {
  switch (role) {
    case "STUDENT":
      return "Siswa";
    case "MENTOR":
      return "Pembimbing";
    case "HRD":
      return "HRD";
    case "SUPERADMIN":
      return "Superadmin";
  }
}
