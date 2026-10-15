import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default async function HrdPicPage() {
  await requireRole(["HRD", "SUPERADMIN"]);

  const mentors = await prisma.mentor.findMany({
    include: {
      user: { select: { name: true, email: true } },
      division: { select: { name: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <>
      <PageHeader
        title="Daftar PIC & Pembimbing"
        description="Lihat seluruh pembimbing dan penanggung jawab divisi (PIC). Halaman ini hanya bisa dilihat, tidak bisa diedit."
      />
      {mentors.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="text-sm text-text-muted">Belum ada pembimbing.</p>
        </Card>
      ) : (
        <Card className="hidden overflow-hidden md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-text-muted">
              <tr>
                <th className="px-4 py-2.5">Pembimbing</th>
                <th className="px-4 py-2.5">Divisi</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mentors.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-text">{m.user.name}</p>
                    <p className="text-xs text-text-muted">{m.user.email}</p>
                  </td>
                  <td className="px-4 py-2.5 text-text">{m.division.name}</td>
                  <td className="px-4 py-2.5">
                    {m.isPic ? (
                      <Badge>PIC</Badge>
                    ) : (
                      <span className="text-xs text-text-muted">Pembimbing</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Mobile */}
      <div className="space-y-2 md:hidden">
        {mentors.map((m) => (
          <Card key={m.id} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-text">{m.user.name}</p>
                <p className="text-xs text-text-muted">{m.user.email}</p>
                <p className="mt-1 text-xs text-text-muted">{m.division.name}</p>
              </div>
              {m.isPic ? (
                <Badge>PIC</Badge>
              ) : (
                <span className="text-xs text-text-muted">Pembimbing</span>
              )}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
