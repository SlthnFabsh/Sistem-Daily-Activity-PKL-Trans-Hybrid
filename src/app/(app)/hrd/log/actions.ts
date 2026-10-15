"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminOrHrd } from "@/lib/permissions";
import type { ImportResult, ActionResult } from "@/lib/action-result";
import { processLogExcelImport } from "@/lib/log-import";
import { PlacementStatus, LogStatus } from "@/generated/prisma/client";
import { deleteFileFromStorage } from "@/lib/storage";

// ─── Import log Excel untuk siswa tertentu (oleh HRD & Superadmin) ──────────────────────
export async function importStudentLogsByHrd(
  _prev: ImportResult,
  formData: FormData
): Promise<ImportResult> {
  await requireAdminOrHrd();

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

// ─── Setujui semua log PENDING_REVIEW milik 1 siswa (oleh HRD) ─────────────
export async function approveImportedLogs(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdminOrHrd();

  const studentId = formData.get("studentId")?.toString().trim();
  if (!studentId) {
    return { ok: false, message: "ID siswa tidak valid." };
  }

  // Pastikan siswa memiliki penempatan aktif
  const placement = await prisma.placement.findFirst({
    where: { studentId, status: PlacementStatus.ACTIVE },
  });
  if (!placement) {
    return { ok: false, message: "Penempatan aktif siswa tidak ditemukan." };
  }

  const { count } = await prisma.activityLog.updateMany({
    where: { placementId: placement.id, status: LogStatus.PENDING_REVIEW },
    data: { status: LogStatus.SUBMITTED, submittedAt: new Date() },
  });

  revalidatePath("/hrd/log");
  return {
    ok: true,
    message: `${count} log berhasil disetujui dan kini berstatus Terkirim.`,
  };
}

// ─── Tolak / hapus 1 log PENDING_REVIEW (oleh HRD) ─────────────────────────
export async function rejectImportedLog(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdminOrHrd();

  const logId = formData.get("logId")?.toString().trim();
  if (!logId) {
    return { ok: false, message: "ID log tidak valid." };
  }

  const log = await prisma.activityLog.findUnique({
    where: { id: logId },
    include: { attachments: true },
  });
  if (!log) {
    return { ok: false, message: "Log tidak ditemukan." };
  }
  if (log.status !== LogStatus.PENDING_REVIEW) {
    return { ok: false, message: "Hanya log 'Menunggu Persetujuan' yang bisa ditolak." };
  }

  for (const att of log.attachments) {
    await deleteFileFromStorage(att.filePath);
  }
  await prisma.activityLog.delete({ where: { id: logId } });

  revalidatePath("/hrd/log");
  return { ok: true, message: "Log ditolak dan dihapus." };
}

// ─── Hapus log mana saja (SUBMITTED / DRAFT) oleh HRD ──────────────────────
export async function deleteStudentLog(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdminOrHrd();

  const logId = formData.get("logId")?.toString().trim();
  if (!logId) {
    return { ok: false, message: "ID log tidak valid." };
  }

  const log = await prisma.activityLog.findUnique({
    where: { id: logId },
    include: { attachments: true },
  });
  if (!log) {
    return { ok: false, message: "Log tidak ditemukan." };
  }

  for (const att of log.attachments) {
    await deleteFileFromStorage(att.filePath);
  }
  await prisma.activityLog.delete({ where: { id: logId } });

  revalidatePath("/hrd/log");
  revalidatePath("/mentor/log");
  return { ok: true, message: "Log berhasil dihapus." };
}

// ─── Hapus SEMUA log milik 1 siswa (SUBMITTED + PENDING_REVIEW, oleh HRD) ───
export async function deleteAllStudentLogs(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdminOrHrd();

  const studentId = formData.get("studentId")?.toString().trim();
  if (!studentId) {
    return { ok: false, message: "ID siswa tidak valid." };
  }

  // Ambil placement aktif siswa
  const placement = await prisma.placement.findFirst({
    where: { studentId, status: PlacementStatus.ACTIVE },
    select: { id: true },
  });

  if (!placement) {
    return {
      ok: false,
      message: "Siswa tidak memiliki penempatan aktif.",
    };
  }

  // Ambil semua log milik siswa (dua status yang bisa ditinjau di HRD)
  const logs = await prisma.activityLog.findMany({
    where: {
      placementId: placement.id,
      status: { in: [LogStatus.SUBMITTED, LogStatus.PENDING_REVIEW] },
    },
    include: { attachments: true },
  });

  if (logs.length === 0) {
    return {
      ok: true,
      message: "Tidak ada log untuk siswa ini.",
    };
  }

  for (const log of logs) {
    for (const att of log.attachments) {
      await deleteFileFromStorage(att.filePath).catch(() => {});
    }
    await prisma.activityLog.delete({ where: { id: log.id } });
  }

  revalidatePath("/hrd/log");
  revalidatePath("/mentor/log");
  return {
    ok: true,
    message: `Berhasil menghapus ${logs.length} log.`,
  };
}
