"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminOrHrd } from "@/lib/permissions";
import { placementSchema } from "@/lib/validations";
import { toFieldErrors, type ActionResult } from "@/lib/action-result";

// Membuat atau memperbarui penempatan. Periode PKL diinput langsung oleh HRD.
export async function savePlacement(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdminOrHrd();

  const id = formData.get("id")?.toString().trim() ?? "";
  const parsed = placementSchema.safeParse({
    studentId: formData.get("studentId"),
    periodStartDate: formData.get("periodStartDate"),
    periodEndDate: formData.get("periodEndDate"),
    divisionId: formData.get("divisionId"),
    workStart: formData.get("workStart"),
    workEnd: formData.get("workEnd"),
    status: formData.get("status") ?? "ACTIVE",
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const {
    studentId,
    periodStartDate,
    periodEndDate,
    divisionId,
    workStart,
    workEnd,
    status,
  } = parsed.data;

  const startDate = new Date(`${periodStartDate}T00:00:00.000Z`);
  const endDate = new Date(`${periodEndDate}T00:00:00.000Z`);
  const periodName = `${periodStartDate} s.d. ${periodEndDate}`;

  if (id) {
    const existing = await prisma.placement.findUnique({
      where: { id },
      include: { period: true },
    });
    if (!existing) {
      return { ok: false, message: "Penempatan tidak ditemukan." };
    }

    const otherWithSamePeriod = await prisma.placement.count({
      where: {
        periodId: existing.periodId,
        id: { not: id },
      },
    });

    let targetPeriodId = existing.periodId;
    if (otherWithSamePeriod > 0) {
      const newPeriod = await prisma.pklPeriod.create({
        data: {
          name: periodName,
          startDate,
          endDate,
        },
      });
      targetPeriodId = newPeriod.id;
    } else {
      await prisma.pklPeriod.update({
        where: { id: existing.periodId },
        data: {
          name: periodName,
          startDate,
          endDate,
        },
      });
    }

    await prisma.placement.update({
      where: { id },
      data: {
        studentId,
        periodId: targetPeriodId,
        divisionId,
        workStart,
        workEnd,
        status,
      },
    });
  } else {
    const period = await prisma.pklPeriod.create({
      data: {
        name: periodName,
        startDate,
        endDate,
      },
    });

    await prisma.placement.create({
      data: {
        studentId,
        periodId: period.id,
        divisionId,
        workStart,
        workEnd,
        status,
      },
    });
  }

  revalidatePath("/hrd/penempatan");
  return { ok: true, message: id ? "Penempatan diperbarui." : "Penempatan baru dibuat." };
}

export async function deletePlacement(id: string): Promise<ActionResult> {
  await requireAdminOrHrd();

  const placement = await prisma.placement.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          attendances: true,
          logs: true,
        },
      },
    },
  });
  if (!placement) {
    return { ok: false, message: "Penempatan tidak ditemukan." };
  }

  if (placement._count.attendances > 0 || placement._count.logs > 0) {
    return {
      ok: false,
      message: "Penempatan tidak bisa dihapus: sudah memiliki absensi atau log aktivitas.",
    };
  }

  const periodId = placement.periodId;
  await prisma.placement.delete({ where: { id } });

  const count = await prisma.placement.count({ where: { periodId } });
  if (count === 0) {
    await prisma.pklPeriod.delete({ where: { id: periodId } }).catch(() => {});
  }

  revalidatePath("/hrd/penempatan");
  return { ok: true, message: "Penempatan dihapus." };
}