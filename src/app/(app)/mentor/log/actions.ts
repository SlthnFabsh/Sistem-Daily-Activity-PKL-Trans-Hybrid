"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import type { ActionResult } from "@/lib/action-result";
import { LogStatus } from "@/generated/prisma/client";

// Setujui 1 log siswa oleh pembimbing
export async function approveLog(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireRole(["MENTOR", "HRD", "SUPERADMIN"]);

  const logId = formData.get("logId")?.toString().trim();
  if (!logId) {
    return { ok: false, message: "ID log tidak valid." };
  }

  // Jika role MENTOR, pastikan siswa berada di divisi pembimbing
  if (user.role === "MENTOR") {
    const mentor = await prisma.mentor.findUnique({
      where: { userId: user.id },
      select: { divisionId: true, id: true },
    });
    if (!mentor) {
      return { ok: false, message: "Akun pembimbing tidak ditemukan." };
    }

    const log = await prisma.activityLog.findUnique({
      where: { id: logId },
      include: { placement: { select: { divisionId: true } } },
    });
    if (!log) {
      return { ok: false, message: "Log tidak ditemukan." };
    }
    if (log.placement.divisionId !== mentor.divisionId) {
      return { ok: false, message: "Anda tidak berhak menyetujui log siswa dari divisi lain." };
    }

    await prisma.activityLog.update({
      where: { id: logId },
      data: {
        status: LogStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: mentor.id,
      },
    });
  } else {
    // HRD atau SUPERADMIN
    await prisma.activityLog.update({
      where: { id: logId },
      data: {
        status: LogStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: user.id,
      },
    });
  }

  revalidatePath("/mentor/log");
  revalidatePath("/hrd/log");
  revalidatePath("/student/log");
  return { ok: true, message: "Log berhasil disetujui." };
}

// Setujui semua log SUBMITTED untuk siswa tertentu di divisi pembimbing
export async function approveAllLogsForStudent(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireRole(["MENTOR", "HRD", "SUPERADMIN"]);

  const studentId = formData.get("studentId")?.toString().trim();
  if (!studentId) {
    return { ok: false, message: "ID siswa tidak valid." };
  }

  let approverId = user.id;
  let wherePlacement: { studentId: string; divisionId?: string } = { studentId };

  if (user.role === "MENTOR") {
    const mentor = await prisma.mentor.findUnique({
      where: { userId: user.id },
      select: { divisionId: true, id: true },
    });
    if (!mentor) {
      return { ok: false, message: "Akun pembimbing tidak ditemukan." };
    }
    approverId = mentor.id;
    wherePlacement.divisionId = mentor.divisionId;
  }

  const { count } = await prisma.activityLog.updateMany({
    where: {
      status: LogStatus.SUBMITTED,
      placement: wherePlacement,
    },
    data: {
      status: LogStatus.APPROVED,
      approvedAt: new Date(),
      approvedById: approverId,
    },
  });

  revalidatePath("/mentor/log");
  revalidatePath("/hrd/log");
  revalidatePath("/student/log");
  return {
    ok: true,
    message: `${count} log siswa berhasil disetujui.`,
  };
}

// Setujui SEMUA log SUBMITTED di divisi pembimbing yang menumpuk
export async function approveAllPendingDivisionLogs(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireRole(["MENTOR", "HRD", "SUPERADMIN"]);

  let approverId = user.id;
  let wherePlacement: { divisionId?: string } = {};

  if (user.role === "MENTOR") {
    const mentor = await prisma.mentor.findUnique({
      where: { userId: user.id },
      select: { divisionId: true, id: true },
    });
    if (!mentor) {
      return { ok: false, message: "Akun pembimbing tidak ditemukan." };
    }
    approverId = mentor.id;
    wherePlacement.divisionId = mentor.divisionId;
  } else {
    const divisionId = formData.get("divisionId")?.toString().trim();
    if (divisionId) {
      wherePlacement.divisionId = divisionId;
    }
  }

  const { count } = await prisma.activityLog.updateMany({
    where: {
      status: LogStatus.SUBMITTED,
      placement: wherePlacement,
    },
    data: {
      status: LogStatus.APPROVED,
      approvedAt: new Date(),
      approvedById: approverId,
    },
  });

  revalidatePath("/mentor/log");
  revalidatePath("/hrd/log");
  revalidatePath("/student/log");
  return {
    ok: true,
    message: `${count} log berhasil disetujui sekaligus.`,
  };
}
