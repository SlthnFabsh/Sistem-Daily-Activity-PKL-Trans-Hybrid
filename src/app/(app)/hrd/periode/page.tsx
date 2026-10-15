import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { PeriodManager, type PeriodView } from "./period-manager";

export default async function PeriodePage() {
  await requireRole("SUPERADMIN");

  const periods = await prisma.pklPeriod.findMany({
    orderBy: { startDate: "desc" },
  });

  const view: PeriodView[] = periods.map((p) => ({
    id: p.id,
    name: p.name,
    startDateInput: p.startDate.toISOString().slice(0, 10),
    endDateInput: p.endDate.toISOString().slice(0, 10),
  }));

  return (
    <>
      <PageHeader
        title="Periode PKL"
        description="Kelola periode pelaksanaan PKL."
      />
      <PeriodManager periods={view} />
    </>
  );
}