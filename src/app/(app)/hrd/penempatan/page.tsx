import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import {
  PlacementManager,
  type PlacementView,
  type Option,
} from "./placement-manager";

export default async function PenempatanPage() {
  await requireRole("HRD");

  const [placements, students, periods, divisions] = await Promise.all([
    prisma.placement.findMany({
      include: {
        student: { include: { user: { select: { name: true } } } },
        period: true,
        division: true,
      },
      orderBy: { period: { startDate: "desc" } },
    }),
    prisma.student.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.pklPeriod.findMany({ orderBy: { startDate: "desc" } }),
    prisma.division.findMany({ orderBy: { name: "asc" } }),
  ]);

  const view: PlacementView[] = placements.map((p) => ({
    id: p.id,
    studentId: p.studentId,
    studentName: p.student.user.name,
    periodId: p.periodId,
    periodName: `${p.period.name} (${p.period.startDate.toISOString().slice(0, 10)} s.d. ${p.period.endDate.toISOString().slice(0, 10)})`,
    divisionId: p.divisionId,
    divisionName: p.division.name,
    workStart: p.workStart,
    workEnd: p.workEnd,
    status: p.status,
  }));

  const studentOptions: Option[] = students.map((s) => ({
    id: s.id,
    label: `${s.user.name} (${s.schoolName})`,
  }));
  const periodOptions: Option[] = periods.map((p) => ({
    id: p.id,
    label: `${p.name} (${p.startDate.toISOString().slice(0, 10)} s.d. ${p.endDate.toISOString().slice(0, 10)})`,
  }));
  const divisionOptions: Option[] = divisions.map((d) => ({
    id: d.id,
    label: d.name,
  }));

  return (
    <>
      <PageHeader
        title="Penempatan"
        description="Tetapkan siswa ke periode, divisi, dan jam kerja."
      />
      <PlacementManager
        placements={view}
        students={studentOptions}
        periods={periodOptions}
        divisions={divisionOptions}
      />
    </>
  );
}