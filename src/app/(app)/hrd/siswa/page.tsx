import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { StudentManager, type StudentView } from "./student-manager";

export default async function SiswaPage() {
  await requireRole("HRD");

  const students = await prisma.student.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const view: StudentView[] = students.map((s) => ({
    id: s.id,
    name: s.user.name,
    email: s.user.email,
    nis: s.nis ?? "",
    schoolName: s.schoolName,
    major: s.major ?? "",
    className: s.className ?? "",
    phone: s.phone ?? "",
  }));

  return (
    <>
      <PageHeader
        title="Siswa"
        description="Kelola data siswa, akun login, dan impor dari Excel."
      />
      <StudentManager students={view} />
    </>
  );
}