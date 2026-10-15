"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { periodSchema } from "@/lib/validations";
import { toFieldErrors, type ActionResult } from "@/lib/action-result";

function toUtcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

// Membuat atau memperbarui periode PKL. Bila ada `id` berarti edit.
export async function savePeriod(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireRole("SUPERADMIN");

  const id = formData.get("id")?.toString().trim() ?? "";
  const parsed = periodSchema.safeParse({
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const data = {
    name: parsed.data.name,
    startDate: toUtcDate(parsed.data.startDate),
    endDate: toUtcDate(parsed.data.endDate),
  };

  if (id) {
    await prisma.pklPeriod.update({ where: { id }, data });
  } else {
    await prisma.pklPeriod.create({ data });
  }

  revalidatePath("/hrd/periode");
  return { ok: true, message: id ? "Periode diperbarui." : "Periode baru dibuat." };
}

export async function deletePeriod(id: string): Promise<ActionResult> {
  await requireRole("SUPERADMIN");

  const placements = await prisma.placement.count({ where: { periodId: id } });
  if (placements > 0) {
    return { ok: false, message: "Periode tidak bisa dihapus: masih memiliki penempatan." };
  }

  await prisma.pklPeriod.delete({ where: { id } });
  revalidatePath("/hrd/periode");
  return { ok: true, message: "Periode dihapus." };
}