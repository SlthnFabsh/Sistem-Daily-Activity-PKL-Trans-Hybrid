"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { divisionSchema } from "@/lib/validations";
import { isUniqueViolation, toFieldErrors, type ActionResult } from "@/lib/action-result";

// Membuat atau memperbarui divisi. Bila ada `id` berarti edit.
export async function saveDivision(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireRole("SUPERADMIN");

  const id = formData.get("id")?.toString().trim() ?? "";
  const parsed = divisionSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  try {
    if (id) {
      await prisma.division.update({ where: { id }, data: { name: parsed.data.name } });
    } else {
      await prisma.division.create({ data: { name: parsed.data.name } });
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, fieldErrors: { name: ["Nama divisi sudah dipakai."] } };
    }
    throw error;
  }

  revalidatePath("/hrd/divisi");
  return { ok: true, message: id ? "Divisi diperbarui." : "Divisi baru dibuat." };
}

// Mencegah penghapusan yang mengganggu data lain: gagal bila divisi masih
// dipakai pembimbing atau penempatan (termasuk riwayatnya).
export async function deleteDivision(id: string): Promise<ActionResult> {
  await requireRole("SUPERADMIN");

  const [mentors, placements] = await Promise.all([
    prisma.mentor.count({ where: { divisionId: id } }),
    prisma.placement.count({ where: { divisionId: id } }),
  ]);
  if (mentors > 0) {
    return { ok: false, message: "Divisi tidak bisa dihapus: masih memiliki pembimbing." };
  }
  if (placements > 0) {
    return { ok: false, message: "Divisi tidak bisa dihapus: masih terpakai di penempatan." };
  }

  await prisma.division.delete({ where: { id } });
  revalidatePath("/hrd/divisi");
  return { ok: true, message: "Divisi dihapus." };
}