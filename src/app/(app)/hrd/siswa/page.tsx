import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { StudentManager, type StudentView } from "./student-manager";
import {
  saveStudent,
  deleteStudent,
  resetStudentPassword,
  importStudents,
} from "../../superadmin/siswa/actions";

export default async function HrdSiswaPage() {
  await requireRole(["HRD", "SUPERADMIN"]);

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
    profileCompleted: s.profileCompleted,
  }));

  return (
    <>
      <PageHeader
        title="Siswa"
        description="Kelola akun siswa, reset kata sandi, dan pantau status biodata profil."
      />
      <StudentManager
        students={view}
        studentActions={{
          save: saveStudent,
          delete: deleteStudent,
          resetPassword: resetStudentPassword,
          import: importStudents,
        }}
      />
    </>
  );
}
