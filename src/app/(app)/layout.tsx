import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { GlobalLoadingOverlay } from "@/components/ui/global-loading-overlay";
import { NavProgressBar } from "@/components/ui/nav-progress-bar";
import { requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/db";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser({ allowPasswordChange: true });

  // Siswa wajib melengkapi biodata sebelum memakai fitur lain.
  // Pengecekan dilakukan langsung ke database (bukan dari token JWT) agar
  // status selalu akurat dan tidak memicu redirect loop.
  // Halaman /student/profile/setup berada di luar group (app) sehingga
  // tidak ikut kena redirect ini.
  if (user.role === "STUDENT" && !user.mustChangePassword) {
    const student = await prisma.student.findUnique({
      where: { userId: user.id },
      select: { profileCompleted: true },
    });

    if (student && !student.profileCompleted) {
      redirect("/student/profile/setup");
    }
  }

  return (
    <>
      <NavProgressBar />
      <AppShell user={user}>{children}</AppShell>
      <GlobalLoadingOverlay />
    </>
  );
}
