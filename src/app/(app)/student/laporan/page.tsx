import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { LaporanForm } from "@/components/laporan/laporan-form";

export default async function StudentLaporanPage() {
  const user = await requireRole("STUDENT");

  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    include: {
      user: { select: { name: true } },
      placements: {
        include: { division: { select: { name: true } } },
        orderBy: { period: { startDate: "desc" } },
        take: 1,
      },
    },
  });

  if (!student) {
    return (
      <>
        <PageHeader
          title="Laporan PDF"
          description="Unduh laporan aktivitas Anda dalam format PDF."
        />
        <Card className="py-10 text-center">
          <p className="text-sm text-text-muted">
            Data profil siswa Anda belum terdaftar. Hubungi HRD.
          </p>
        </Card>
      </>
    );
  }

  const studentOption = [
    {
      id: student.id,
      name: student.user.name,
      schoolName: student.schoolName,
      divisionName: student.placements[0]?.division.name,
    },
  ];

  return (
    <>
      <PageHeader
        title="Laporan PDF"
        description="Unduh laporan aktivitas dan rekap absensi Anda dalam format PDF."
      />
      <LaporanForm
        students={studentOption}
        defaultStudentId={student.id}
        singleStudent
      />
    </>
  );
}