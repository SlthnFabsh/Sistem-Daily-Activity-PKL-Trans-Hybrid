import { requireRole } from "@/lib/permissions";

// Catatan: AppShell sudah dipasang di (app)/layout.tsx, jadi di sini cukup
// menjaga akses. Jangan membungkus AppShell lagi — kalau dibungkus dua kali,
// header/bottom nav tampil dobel dan konten tergeser dua kali di desktop.
export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("SUPERADMIN");
  return <>{children}</>;
}
