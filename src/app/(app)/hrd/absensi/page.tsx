import { requireAdminOrHrd } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { AttendanceReview } from "@/components/attendance/attendance-review";
import { loadAttendanceReview } from "@/lib/attendance-review";

export default async function HrdAbsensiPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdminOrHrd();

  const searchParams = await props.searchParams;
  const { items, students, activeFilters, pagination } =
    await loadAttendanceReview({ searchParams });

  return (
    <>
      <PageHeader
        title="Absensi Siswa"
        description="Lihat absensi seluruh siswa beserta foto dan lokasi absen."
      />
      <AttendanceReview
        items={items}
        students={students}
        activeFilters={activeFilters}
        pagination={pagination}
      />
    </>
  );
}
