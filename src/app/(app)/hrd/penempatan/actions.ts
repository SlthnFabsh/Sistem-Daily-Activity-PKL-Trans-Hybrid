"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { placementSchema } from "@/lib/validations";
import { toFieldErrors, type ActionResult } from "@/lib/action-result";

// Membuat atau memperbarui penempatan. Bila ada `id` berarti edit.
export async function savePlacement(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireRole("HRD");

  const id = formData.get("id")?.toString().trim() ?? "";
  const parsed = placementSchema.safeParse({
    studentId: formData.get("studentId"),
    periodId: formData.get("periodId"),
    divisionId: formData.get("divisionId"),
    workStart: formData.get("workStart"),
    workEnd: formData.get("workEnd"),
    status: formData.get("status") ?? "ACTIVE",
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const { studentId, periodId, divisionId, workStart, workEnd, status } =
    parsed.data;

  const duplicate = await prisma.placement.findFirst({
    where: {
      studentId,
      periodId,
      ...(id ? { id: { not: id } } : {}),
    },
  });
  if (duplicate) {
    return {
      ok: false,
      fieldErrors: {
        studentId: ["Siswa sudah memiliki penempatan di periode PKL ini."],
      },
    };
  }

  const data = { studentId, periodId, divisionId, workStart, workEnd, status };
  if (id) {
    await prisma.placement.update({ where: { id }, data });
  } else {
    await prisma.placement.create({ data });
  }

  revalidatePath("/hrd/penempatan");
  return { ok: true, message: id ? "Penempatan diperbarui." : "Penempatan baru dibuat." };
}

export async function deletePlacement(id: string): Promise<ActionResult> {
  await requireRole("HRD");

  const [attendances, logs] = await Promise.all([
    prisma.attendance.count({ where: { placementId: id } }),
    prisma.activityLog.count({ where: { placementId: id } }),
  ]);
  if (attendances > 0 || logs > 0) {
    return {
      ok: false,
      message: "Penempatan tidak bisa dihapus: sudah memiliki absensi atau log aktivitas.",
    };
  }

  await prisma.placement.delete({ where: { id } });
  revalidatePath("/hrd/penempatan");
  return { ok: true, message: "Penempatan dihapus." };
}