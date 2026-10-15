import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { DivisionManager } from "./division-manager";

export default async function DivisiPage() {
  await requireRole("SUPERADMIN");

  const divisions = await prisma.division.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Divisi"
        description="Kelola divisi tempat siswa PKL ditempatkan."
      />
      <DivisionManager divisions={divisions} />
    </>
  );
}