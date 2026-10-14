import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { LaporanForm } from "@/components/laporan/laporan-form";

export default async function MentorLaporanPage() {
  const user = await requireRole("MENTOR");

  const mentor = await prisma.mentor.findUnique({
    where: { userId: user.id },
    include: { division: { select: { name: true } } },
  });

  if (!mentor) {
    return (
      <>
        <PageHeader
          title="Laporan PDF"
          description="Unduh laporan aktivitas siswa di divisi Anda."
        />
        <Card className="py-10 text-center">
          <p className="text-sm text-text-muted">
            Akun pembimbing Anda belum terhubung dengan divisi. Hubungi HRD.
          </p>
        </Card>
      </>
    );
  }

  // Mentor hanya bisa pilih siswa di divisinya
  const placements = await prisma.placement.findMany({
    where: { divisionId: mentor.divisionId },
    include: {
      student: { include: { user: { select: { name: true } } } },
    },
    orderBy: { student: { user: { name: "asc" } } },
  });

  // Deduplikasi (satu siswa bisa punya lebih dari satu penempatan)
  const seen = new Set<string>();
  const students = placements
    .filter((p) => {
      if (seen.has(p.studentId)) return false;
      seen.add(p.studentId);
      return true;
    })
    .map((p) => ({
      id: p.studentId,
      name: p.student.user.name,
      schoolName: p.student.schoolName,
      divisionName: mentor.division.name,
    }));

  return (
    <>
      <PageHeader
        title="Laporan PDF"
        description={`Unduh laporan aktivitas siswa di ${mentor.division.name}.`}
      />
      <LaporanForm students={students} />
    </>
  );
}