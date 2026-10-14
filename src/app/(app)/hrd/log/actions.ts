"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import type { ImportResult } from "@/lib/action-result";
import { processLogExcelImport } from "@/lib/log-import";
import { PlacementStatus } from "@/generated/prisma/client";

export async function importStudentLogsByHrd(
  _prev: ImportResult,
  formData: FormData
): Promise<ImportResult> {
  await requireRole("HRD");

  const studentId = formData.get("studentId")?.toString().trim();
  if (!studentId) {
    return {
      ok: false,
      message: "Siswa wajib dipilih.",
      imported: 0,
      failed: 0,
      rows: [],
    };
  }

  const placement = await prisma.placement.findFirst({
    where: { studentId, status: PlacementStatus.ACTIVE },
    include: { period: true },
    orderBy: { period: { startDate: "desc" } },
  });

  if (!placement) {
    return {
      ok: false,
      message: "Siswa yang dipilih belum memiliki penempatan aktif.",
      imported: 0,
      failed: 0,
      rows: [],
    };
  }

  const file = formData.get("file");
  if (!file || typeof (file as File).arrayBuffer !== "function") {
    return {
      ok: false,
      message: "File Excel wajib dipilih.",
      imported: 0,
      failed: 0,
      rows: [],
    };
  }

  const startDateFilter =
    formData.get("startDate")?.toString().trim() || undefined;
  const endDateFilter =
    formData.get("endDate")?.toString().trim() || undefined;

  const result = await processLogExcelImport({
    file: file as File,
    placementId: placement.id,
    period: placement.period,
    startDateFilter,
    endDateFilter,
  });

  revalidatePath("/hrd/log");
  return result;
}
