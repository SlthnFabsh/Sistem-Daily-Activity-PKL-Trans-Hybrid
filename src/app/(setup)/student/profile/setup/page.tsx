import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { ProfileSetupForm } from "./profile-setup-form";

// Halaman ini sengaja diletakkan di luar route group (app) supaya tidak
// terkena pengecekan "profil belum lengkap" di layout (app). Lokasi URL
// tetap sama: /student/profile/setup
export default async function ProfileSetupPage() {
  const user = await requireRole("STUDENT");

  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    select: { profileCompleted: true },
  });

  // Jika profil sudah lengkap, jangan tampilkan form lagi.
  if (!student || student.profileCompleted) {
    redirect("/student/absensi");
  }

  return <ProfileSetupForm />;
}
