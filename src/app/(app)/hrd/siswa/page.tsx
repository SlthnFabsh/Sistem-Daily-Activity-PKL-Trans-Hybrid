import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default async function HrdSiswaPage() {
  await requireRole(["HRD", "SUPERADMIN"]);

  const students = await prisma.student.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <>
      <PageHeader
        title="Daftar Siswa"
        description="Lihat seluruh data siswa. Halaman ini hanya bisa dilihat, tidak bisa diedit."
      />
      {students.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="text-sm text-text-muted">Belum ada siswa.</p>
        </Card>
      ) : (
        <Card className="hidden overflow-hidden md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-text-muted">
              <tr>
                <th className="px-4 py-2.5">Siswa</th>
                <th className="px-4 py-2.5">Sekolah</th>
                <th className="px-4 py-2.5">Telepon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-text">{s.user.name}</p>
                    <p className="text-xs text-text-muted">{s.user.email}</p>
                    {s.nis && <p className="text-xs text-text-muted">NIS {s.nis}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-text">{s.schoolName}</td>
                  <td className="px-4 py-2.5 text-text-muted">{s.phone || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Mobile */}
      <div className="space-y-2 md:hidden">
        {students.map((s) => (
          <Card key={s.id} className="p-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-text">{s.user.name}</p>
              <p className="text-xs text-text-muted">{s.user.email}</p>
              <p className="text-xs text-text-muted">{s.schoolName}</p>
              {s.nis && <p className="text-xs text-text-muted">NIS {s.nis}</p>}
              <p className="text-xs text-text-muted">Telepon: {s.phone || "-"}</p>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
