import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function SuperadminIndexPage() {
  await requireRole("SUPERADMIN");

  const [users, divisions, periods, placements] = await Promise.all([
    prisma.user.count({ where: { role: "SUPERADMIN" } }),
    prisma.division.count(),
    prisma.pklPeriod.count(),
    prisma.placement.count(),
  ]);

  const mentorCount = await prisma.mentor.count();
  const studentCount = await prisma.student.count();
  const hrdCount = await prisma.user.count({ where: { role: "HRD" } });

  return (
    <>
      <PageHeader
        title="Beranda Superadmin"
        description="Kelola seluruh pengguna, divisi, periode, dan penempatan."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-text-muted">Akun Superadmin</p>
          <p className="text-2xl font-semibold text-text">{users}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-muted">Pembimbing / PIC</p>
          <p className="text-2xl font-semibold text-text">{mentorCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-muted">Siswa</p>
          <p className="text-2xl font-semibold text-text">{studentCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-muted">HRD</p>
          <p className="text-2xl font-semibold text-text">{hrdCount}</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/superadmin/pengguna" className="rounded-lg border border-border p-4 hover:bg-primary-soft">
          <h3 className="text-sm font-semibold text-text">Pengguna</h3>
          <p className="text-xs text-text-muted">Kelola pembimbing, PIC, dan HRD.</p>
        </Link>
        <Link href="/superadmin/siswa" className="rounded-lg border border-border p-4 hover:bg-primary-soft">
          <h3 className="text-sm font-semibold text-text">Siswa</h3>
          <p className="text-xs text-text-muted">Kelola data siswa dan impor Excel.</p>
        </Link>
        <Link href="/hrd/divisi" className="rounded-lg border border-border p-4 hover:bg-primary-soft">
          <h3 className="text-sm font-semibold text-text">Divisi</h3>
          <p className="text-xs text-text-muted">Kelola divisi tempat siswa PKL.</p>
        </Link>
        <Link href="/hrd/periode" className="rounded-lg border border-border p-4 hover:bg-primary-soft">
          <h3 className="text-sm font-semibold text-text">Periode PKL</h3>
          <p className="text-xs text-text-muted">Kelola periode pelaksanaan PKL.</p>
        </Link>
        <Link href="/hrd/penempatan" className="rounded-lg border border-border p-4 hover:bg-primary-soft">
          <h3 className="text-sm font-semibold text-text">Penempatan</h3>
          <p className="text-xs text-text-muted">Tempatkan siswa ke periode & divisi.</p>
        </Link>
        <Link href="/hrd/log" className="rounded-lg border border-border p-4 hover:bg-primary-soft">
          <h3 className="text-sm font-semibold text-text">Log Siswa</h3>
          <p className="text-xs text-text-muted">Tinjau log aktivitas siswa.</p>
        </Link>
      </div>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-text">Ringkasan divisi & periode</h3>
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-text-muted">
          <span>Divisi: {divisions}</span>
          <span>Periode: {periods}</span>
          <span>Penempatan aktif: {placements}</span>
        </div>
      </Card>
    </>
  );
}
