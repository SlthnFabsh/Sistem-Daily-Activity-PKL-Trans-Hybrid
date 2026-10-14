import {
  Building2,
  CalendarCheck,
  CalendarRange,
  ClipboardList,
  FileText,
  GraduationCap,
  History,
  MapPin,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/generated/prisma/client";

export type NavItem = { href: string; label: string; icon: string };

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
};

export const NAV_ITEMS: Record<Role, NavItem[]> = {
  STUDENT: [
    { href: "/student/absensi", label: "Absensi", icon: "calendar-check" },
    { href: "/student/log", label: "Log Aktivitas", icon: "clipboard-list" },
    { href: "/student/riwayat", label: "Riwayat", icon: "history" },
    { href: "/student/laporan", label: "Laporan", icon: "file-text" },
  ],
  MENTOR: [
    { href: "/mentor/log-siswa", label: "Log Siswa", icon: "users" },
    { href: "/mentor/laporan", label: "Laporan", icon: "file-text" },
  ],
  HRD: [
    { href: "/hrd/pengguna", label: "Pengguna", icon: "users" },
    { href: "/hrd/divisi", label: "Divisi", icon: "building-2" },
    { href: "/hrd/periode", label: "Periode", icon: "calendar-range" },
    { href: "/hrd/siswa", label: "Siswa", icon: "graduation-cap" },
    { href: "/hrd/penempatan", label: "Penempatan", icon: "map-pin" },
    { href: "/hrd/log-siswa", label: "Log Siswa", icon: "clipboard-list" },
    { href: "/hrd/laporan", label: "Laporan", icon: "file-text" },
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
  }
}