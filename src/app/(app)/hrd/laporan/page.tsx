import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { LaporanForm } from "@/components/laporan/laporan-form";

export default async function HrdLaporanPage() {
  await requireRole("HRD");

  // HRD bisa pilih semua siswa
  const allStudents = await prisma.student.findMany({
    include: {
      user: { select: { name: true } },
      placements: {
        include: { division: { select: { name: true } } },
        orderBy: { period: { startDate: "desc" } },
        take: 1,
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  const students = allStudents.map((s) => ({
    id: s.id,
    name: s.user.name,
    schoolName: s.schoolName,
    divisionName: s.placements[0]?.division.name,
  }));

  return (
    <>
      <PageHeader
        title="Laporan PDF"
        description="Pilih siswa dan rentang tanggal, lalu unduh laporan PKL dalam format PDF."
      />
      <LaporanForm students={students} />
    </>
  );
}