import { redirect } from "next/navigation";
import { requireRole } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileEditForm } from "./profile-edit-form";
import {
  User,
  GraduationCap,
  Building2,
  BookOpen,
  Mail,
  Calendar,
} from "lucide-react";

export default async function StudentProfilePage() {
  const user = await requireRole("STUDENT");

  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    include: {
      user: { select: { name: true, email: true } },
      placements: {
        where: { status: "ACTIVE" },
        include: {
          division: { select: { name: true } },
          period: { select: { name: true, startDate: true, endDate: true } },
        },
      },
    },
  });

  if (!student) {
    redirect("/student/profile/setup");
  }

  if (!student.profileCompleted) {
    redirect("/student/profile/setup");
  }

  const activePlacement = student.placements[0];

  return (
    <>
      <PageHeader
        title="Profil Saya"
        description="Kelola informasi profil dan biodata Anda"
      />

      <div className="space-y-6">
        <Card className="overflow-hidden">
          <div className="border-b border-border bg-gradient-to-r from-primary-soft/60 via-white to-white px-5 py-5 sm:px-6">
            <div className="flex items-start gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-primary/10 bg-white text-primary shadow-sm">
                <User className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold tracking-tight text-text">
                  {student.user.name}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-text-muted">
                  <Mail className="h-3.5 w-3.5" /> {student.user.email}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge tone="success">Profil Lengkap</Badge>
                  {activePlacement && (
                    <Badge tone="primary">{activePlacement.division.name}</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-px bg-border sm:grid-cols-2">
            <div className="bg-white px-5 py-4">
              <div className="flex items-center gap-2.5 text-text-muted">
                <GraduationCap className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  NIS
                </span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-text">
                {student.nis || "—"}
              </p>
            </div>
            <div className="bg-white px-5 py-4">
              <div className="flex items-center gap-2.5 text-text-muted">
                <Building2 className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Asal Sekolah
                </span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-text">
                {student.schoolName || "—"}
              </p>
            </div>
            <div className="bg-white px-5 py-4">
              <div className="flex items-center gap-2.5 text-text-muted">
                <BookOpen className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Kelas
                </span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-text">
                {student.className || "—"}
              </p>
            </div>
            <div className="bg-white px-5 py-4">
              <div className="flex items-center gap-2.5 text-text-muted">
                <BookOpen className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Jurusan
                </span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-text">
                {student.major || "—"}
              </p>
            </div>
          </div>

          {activePlacement && (
            <div className="border-t border-border bg-surface-muted/30 px-5 py-4">
              <div className="flex items-center gap-2.5 text-text-muted">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Periode PKL
                </span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-text">
                {activePlacement.period.name}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                {new Date(activePlacement.period.startDate).toLocaleDateString(
                  "id-ID",
                  { dateStyle: "long" }
                )}{" "}
                –{" "}
                {new Date(activePlacement.period.endDate).toLocaleDateString(
                  "id-ID",
                  { dateStyle: "long" }
                )}
              </p>
            </div>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <h3 className="mb-4 text-sm font-semibold text-text">
            Edit Biodata
          </h3>
          <ProfileEditForm
            defaultValues={{
              nis: student.nis || "",
              schoolName: student.schoolName || "",
              className: student.className || "",
              major: student.major || "",
            }}
          />
        </Card>
      </div>
    </>
  );
}
