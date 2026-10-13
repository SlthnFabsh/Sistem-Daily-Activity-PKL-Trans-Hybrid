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

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: Record<Role, NavItem[]> = {
  STUDENT: [
    { href: "/student/absensi", label: "Absensi", icon: CalendarCheck },
    { href: "/student/log", label: "Log Aktivitas", icon: ClipboardList },
    { href: "/student/riwayat", label: "Riwayat", icon: History },
    { href: "/student/laporan", label: "Laporan", icon: FileText },
  ],
  MENTOR: [
    { href: "/mentor/log-siswa", label: "Log Siswa", icon: Users },
    { href: "/mentor/laporan", label: "Laporan", icon: FileText },
  ],
  HRD: [
    { href: "/hrd/pengguna", label: "Pengguna", icon: Users },
    { href: "/hrd/divisi", label: "Divisi", icon: Building2 },
    { href: "/hrd/periode", label: "Periode", icon: CalendarRange },
    { href: "/hrd/siswa", label: "Siswa", icon: GraduationCap },
    { href: "/hrd/penempatan", label: "Penempatan", icon: MapPin },
    { href: "/hrd/log-siswa", label: "Log Siswa", icon: ClipboardList },
    { href: "/hrd/laporan", label: "Laporan", icon: FileText },
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