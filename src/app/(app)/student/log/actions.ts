"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { getActivePlacementForUser, isDateInPeriod } from "@/lib/attendance";
import { isWithinBackdateWindow } from "@/lib/time";
import { activityLogSchema } from "@/lib/validations";
import { LogStatus } from "@/generated/prisma/client";
import { toFieldErrors, type ActionResult, type ImportResult } from "@/lib/action-result";
import { deleteFileFromStorage } from "@/lib/storage";
import { processLogExcelImport } from "@/lib/log-import";

const PATH = "/student/log";

// Simpan log sebagai DRAFT (buat baru atau update yang masih DRAFT).
export async function saveLogDraft(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireRole("STUDENT");

  const parsed = activityLogSchema.safeParse({
    logDate: formData.get("logDate"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    taskFrom: formData.get("taskFrom"),
    description: formData.get("description"),
    output: formData.get("output") || undefined,
    obstacle: formData.get("obstacle") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const placement = await getActivePlacementForUser(user.id);
  if (!placement) {
    return { ok: false, message: "Anda belum memiliki penempatan PKL aktif." };
  }

  const logDate = new Date(`${parsed.data.logDate}T00:00:00.000Z`);
  if (!isDateInPeriod(logDate, placement.period)) {
    return { ok: false, message: "Tanggal harus dalam periode PKL." };
  }
  if (!isWithinBackdateWindow(logDate, 3)) {
    return {
      ok: false,
      message: "Tanggal tidak boleh masa depan atau lebih dari 3 hari ke belakang.",
    };
  }

  const data = {
    placementId: placement.id,
    logDate,
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime,
    taskFrom: parsed.data.taskFrom,
    description: parsed.data.description,
    output: parsed.data.output || null,
    obstacle: parsed.data.obstacle || null,
  };

  const existingId = formData.get("logId");
  if (existingId && typeof existingId === "string") {
    // Update hanya boleh jika masih DRAFT.
    const existing = await prisma.activityLog.findUnique({
      where: { id: existingId },
      include: { placement: { include: { student: true } } },
    });
    if (!existing || existing.placement.student.userId !== user.id) {
      return { ok: false, message: "Log tidak ditemukan." };
    }
    if (existing.status !== LogStatus.DRAFT) {
      return { ok: false, message: "Log yang sudah dikirim tidak bisa diubah." };
    }
    await prisma.activityLog.update({ where: { id: existingId }, data });
  } else {
    await prisma.activityLog.create({ data });
  }

  revalidatePath(PATH);
  return { ok: true, message: "Draft tersimpan." };
}

// Kirim log: status SUBMITTED, isi submittedAt, kunci permanen.
export async function submitLog(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireRole("STUDENT");

  const parsed = activityLogSchema.safeParse({
    logDate: formData.get("logDate"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    taskFrom: formData.get("taskFrom"),
    description: formData.get("description"),
    output: formData.get("output") || undefined,
    obstacle: formData.get("obstacle") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const placement = await getActivePlacementForUser(user.id);
  if (!placement) {
    return { ok: false, message: "Anda belum memiliki penempatan PKL aktif." };
  }

  const logDate = new Date(`${parsed.data.logDate}T00:00:00.000Z`);
  if (!isDateInPeriod(logDate, placement.period)) {
    return { ok: false, message: "Tanggal harus dalam periode PKL." };
  }
  if (!isWithinBackdateWindow(logDate, 3)) {
    return {
      ok: false,
      message: "Tanggal tidak boleh masa depan atau lebih dari 3 hari ke belakang.",
    };
  }

  // Kirim hanya berlaku untuk draft yang sudah ada. Lampiran bukti wajib
  // minimal 1 file, sehingga log tanpa lampiran tidak boleh dikirim.
  const logId = formData.get("logId");
  if (!logId || typeof logId !== "string") {
    return { ok: false, message: "Simpan draft log terlebih dahulu." };
  }

  const existing = await prisma.activityLog.findUnique({
    where: { id: logId },
    include: { attachments: true, placement: { include: { student: true } } },
  });
  if (!existing || existing.placement.student.userId !== user.id) {
    return { ok: false, message: "Log tidak ditemukan." };
  }
  if (existing.status !== LogStatus.DRAFT) {
    return { ok: false, message: "Log yang sudah dikirim tidak bisa diubah." };
  }
  if (existing.attachments.length === 0) {
    return {
      ok: false,
      message: "Lampiran bukti wajib diisi minimal 1 file.",
    };
  }

  await prisma.activityLog.update({
    where: { id: logId },
    data: {
      placementId: placement.id,
      logDate,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      taskFrom: parsed.data.taskFrom,
      description: parsed.data.description,
      output: parsed.data.output || null,
      obstacle: parsed.data.obstacle || null,
      status: LogStatus.SUBMITTED,
      submittedAt: new Date(),
    },
  });

  revalidatePath(PATH);
  return { ok: true, message: "Log berhasil dikirim." };
}

// Hapus log — hanya boleh jika masih DRAFT.
export async function deleteLogDraft(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireRole("STUDENT");

  const logId = formData.get("logId");
  if (!logId || typeof logId !== "string") {
    return { ok: false, message: "ID log tidak valid." };
  }

  const log = await prisma.activityLog.findUnique({
    where: { id: logId },
    include: { placement: { include: { student: true } }, attachments: true },
  });
  if (!log || log.placement.student.userId !== user.id) {
    return { ok: false, message: "Log tidak ditemukan." };
  }
  if (log.status !== LogStatus.DRAFT) {
    return { ok: false, message: "Log yang sudah dikirim tidak bisa dihapus." };
  }

  // Hapus file lampiran dari storage.
  for (const att of log.attachments) {
    await deleteFileFromStorage(att.filePath);
  }

  await prisma.activityLog.delete({ where: { id: logId } });
  revalidatePath(PATH);
  return { ok: true, message: "Log dihapus." };
}

// Hapus lampiran — hanya boleh jika log masih DRAFT.
export async function deleteAttachment(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireRole("STUDENT");

  const attachmentId = formData.get("attachmentId");
  if (!attachmentId || typeof attachmentId !== "string") {
    return { ok: false, message: "ID lampiran tidak valid." };
  }

  const att = await prisma.logAttachment.findUnique({
    where: { id: attachmentId },
    include: { log: { include: { placement: { include: { student: true } } } } },
  });
  if (!att || att.log.placement.student.userId !== user.id) {
    return { ok: false, message: "Lampiran tidak ditemukan." };
  }
  if (att.log.status !== LogStatus.DRAFT) {
    return {
      ok: false,
      message: "Log yang sudah dikirim tidak bisa dihapus lampirannya.",
    };
  }

  await deleteFileFromStorage(att.filePath);
  await prisma.logAttachment.delete({ where: { id: attachmentId } });

  revalidatePath(PATH);
  return { ok: true, message: "Lampiran dihapus." };
}

// Impor log aktivitas masa lalu dari file Excel (.xlsx)
export async function importStudentLogs(
  _prev: ImportResult,
  formData: FormData
): Promise<ImportResult> {
  const user = await requireRole("STUDENT");
  const placement = await getActivePlacementForUser(user.id);
  if (!placement) {
    return {
      ok: false,
      message: "Anda belum memiliki penempatan PKL aktif.",
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

  revalidatePath("/student/log");
  revalidatePath("/student/riwayat");
  return result;
}

