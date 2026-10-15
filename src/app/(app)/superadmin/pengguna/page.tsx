import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { MentorManager, type DivisionOption, type MentorView } from "../../hrd/pengguna/mentor-manager";
import { saveMentor, deleteMentor, resetMentorPassword } from "./actions";
import { HrdManager } from "./hrd-manager";

export default async function SuperadminPenggunaPage() {
  await requireRole("SUPERADMIN");

  const [mentors, divisions, hrds] = await Promise.all([
    prisma.mentor.findMany({
      include: {
        user: { select: { name: true, email: true } },
        division: { select: { name: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.division.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { role: "HRD" },
      orderBy: { name: "asc" },
    }),
  ]);

  const mentorView: MentorView[] = mentors.map((m) => ({
    id: m.id,
    name: m.user.name,
    email: m.user.email,
    divisionId: m.divisionId,
    divisionName: m.division.name,
    isPic: m.isPic,
  }));

  const divisionOptions: DivisionOption[] = divisions.map((d) => ({
    id: d.id,
    name: d.name,
  }));

  return (
    <>
      <PageHeader
        title="Pengguna"
        description="Kelola akun pembimbing (PIC), HRD, dan akun lainnya."
      />
      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-semibold text-text">Pembimbing & PIC</h2>
          <p className="text-sm text-text-muted">
            Tambah, edit, atau hapus pembimbing dan penanggung jawab divisi (PIC).
          </p>
          <MentorManager
            mentors={mentorView}
            divisions={divisionOptions}
            mentorActions={{ save: saveMentor, delete: deleteMentor, resetPassword: resetMentorPassword }}
          />
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text">HRD</h2>
          <p className="text-sm text-text-muted">
            Kelola akun HRD. Hanya superadmin yang dapat membuat atau menghapus akun HRD.
          </p>
          <HrdManager hrds={hrds} />
        </section>
      </div>
    </>
  );
}
