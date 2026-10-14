import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { MentorManager, type DivisionOption, type MentorView } from "./mentor-manager";

export default async function PenggunaPage() {
  await requireRole("HRD");

  const [mentors, divisions] = await Promise.all([
    prisma.mentor.findMany({
      include: {
        user: { select: { name: true, email: true } },
        division: { select: { name: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.division.findMany({ orderBy: { name: "asc" } }),
  ]);

  const view: MentorView[] = mentors.map((m) => ({
    id: m.id,
    name: m.user.name,
    email: m.user.email,
    divisionId: m.divisionId,
    divisionName: m.division.name,
    isPic: m.isPic,
  }));

  const divisionOptions: DivisionOption[] = divisions.map((d) => ({
    id: d.id,
    name: d.name,
  }));

  return (
    <>
      <PageHeader
        title="Pengguna"
        description="Kelola akun pembimbing dan penanggung jawab divisi (PIC)."
      />
      <MentorManager mentors={view} divisions={divisionOptions} />
    </>
  );
}