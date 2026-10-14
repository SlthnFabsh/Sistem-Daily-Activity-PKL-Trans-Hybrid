"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { getActivePlacementForUser, isDateInPeriod } from "@/lib/attendance";
import { isLateNow, nowWibTime, todayWib } from "@/lib/time";
import { leaveSchema } from "@/lib/validations";
import { AttendanceStatus } from "@/generated/prisma/client";
import {
  isUniqueViolation,
  toFieldErrors,
  type ActionResult,
} from "@/lib/action-result";

const PATH = "/student/absensi";

function findTodayAttendance(placementId: string, attDate: Date) {
  return prisma.attendance.findUnique({
    where: { placementId_attDate: { placementId, attDate } },
  });
}

// Absen masuk: simpan jam server (WIB). Terlambat bila melewati workStart.
export async function checkIn(
  _prev: ActionResult,
  _formData: FormData
): Promise<ActionResult> {
  const user = await requireRole("STUDENT");

  const placement = await getActivePlacementForUser(user.id);
  if (!placement) {
    return { ok: false, message: "Anda belum memiliki penempatan PKL aktif." };
  }

  const today = todayWib();
  if (!isDateInPeriod(today, placement.period)) {
    return { ok: false, message: "Hari ini di luar rentang periode PKL." };
  }

  if (await findTodayAttendance(placement.id, today)) {
    return { ok: false, message: "Absensi hari ini sudah tercatat." };
  }

  const status = isLateNow(placement.workStart)
    ? AttendanceStatus.TERLAMBAT
    : AttendanceStatus.HADIR;

  try {
    await prisma.attendance.create({
      data: {
        placementId: placement.id,
        attDate: today,
        checkIn: new Date(),
        status,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, message: "Absensi hari ini sudah tercatat." };
    }
    throw error;
  }

  revalidatePath(PATH);
  return {
    ok: true,
    message:
      status === AttendanceStatus.TERLAMBAT
        ? "Absen masuk tercatat (terlambat)."
        : "Absen masuk tercatat.",
  };
}

// Absen pulang: simpan jam server. Tandai earlyLeave bila lebih awal dari workEnd.
export async function checkOut(
  _prev: ActionResult,
  _formData: FormData
): Promise<ActionResult> {
  const user = await requireRole("STUDENT");

  const placement = await getActivePlacementForUser(user.id);
  if (!placement) {
    return { ok: false, message: "Anda belum memiliki penempatan PKL aktif." };
  }

  const today = todayWib();
  const attendance = await findTodayAttendance(placement.id, today);
  if (!attendance) {
    return { ok: false, message: "Anda belum absen masuk hari ini." };
  }
  if (
    attendance.status === AttendanceStatus.IZIN ||
    attendance.status === AttendanceStatus.SAKIT
  ) {
    return { ok: false, message: "Tidak bisa absen pulang untuk Izin/Sakit." };
  }
  if (!attendance.checkIn) {
    return { ok: false, message: "Anda belum absen masuk hari ini." };
  }
  if (attendance.checkOut) {
    return { ok: false, message: "Anda sudah absen pulang hari ini." };
  }

  const earlyLeave = nowWibTime() < placement.workEnd;
  await prisma.attendance.update({
    where: { id: attendance.id },
    data: { checkOut: new Date(), earlyLeave },
  });

  revalidatePath(PATH);
  return {
    ok: true,
    message: earlyLeave
      ? "Absen pulang tercatat (pulang lebih awal)."
      : "Absen pulang tercatat.",
  };
}

// Izin/Sakit: status wajib dipilih dan keterangan wajib diisi.
export async function submitLeave(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireRole("STUDENT");

  const parsed = leaveSchema.safeParse({
    status: formData.get("status"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const placement = await getActivePlacementForUser(user.id);
  if (!placement) {
    return { ok: false, message: "Anda belum memiliki penempatan PKL aktif." };
  }

  const today = todayWib();
  if (!isDateInPeriod(today, placement.period)) {
    return { ok: false, message: "Hari ini di luar rentang periode PKL." };
  }

  if (await findTodayAttendance(placement.id, today)) {
    return { ok: false, message: "Absensi hari ini sudah tercatat." };
  }

  try {
    await prisma.attendance.create({
      data: {
        placementId: placement.id,
        attDate: today,
        status: parsed.data.status,
        note: parsed.data.note,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, message: "Absensi hari ini sudah tercatat." };
    }
    throw error;
  }

  revalidatePath(PATH);
  return {
    ok: true,
    message:
      parsed.data.status === AttendanceStatus.IZIN
        ? "Izin tercatat."
        : "Sakit tercatat.",
  };
}