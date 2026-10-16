import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { AttendanceReview } from "@/components/attendance/attendance-review";
import { loadAttendanceReview } from "@/lib/attendance-review";

export default async function MentorAbsensiPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireRole("MENTOR");

  const mentor = await prisma.mentor.findUnique({
    where: { userId: user.id },
    include: { division: { select: { name: true } } },
  });

  if (!mentor) {
    return (
      <>
        <PageHeader
          title="Absensi Siswa"
          description="Lihat absensi siswa di divisi Anda beserta foto dan lokasi."
        />
        <Card className="py-10 text-center">
          <p className="text-sm text-text-muted">
            Akun pembimbing Anda belum terhubung dengan divisi. Hubungi HRD.
          </p>
        </Card>
      </>
    );
  }

  const searchParams = await props.searchParams;
  const { items, students, activeFilters } = await loadAttendanceReview({
    searchParams,
    divisionId: mentor.divisionId,
  });

  return (
    <>
      <PageHeader
        title="Absensi Siswa"
        description={`Lihat absensi siswa di ${mentor.division.name} beserta foto dan lokasi.`}
      />
      <AttendanceReview
        items={items}
        students={students}
        activeFilters={activeFilters}
        divisionName={mentor.division.name}
      />
    </>
  );
}
