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
import {
  MAX_ATTENDANCE_PHOTO_SIZE,
  uploadAttendancePhoto,
  deleteFileFromStorage,
} from "@/lib/storage";

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

  // Cek apakah sudah ada log aktivitas SUBMITTED untuk hari ini
  const logToday = await prisma.activityLog.findFirst({
    where: {
      placementId: placement.id,
      logDate: today,
      status: "SUBMITTED",
    },
  });
  if (!logToday) {
    return {
      ok: false,
      message:
        "Anda harus mengisi dan mengirim log aktivitas hari ini sebelum absen pulang.",
    };
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

// ── Absen masuk dengan foto & GPS ────────────────────────────────────────

const GEO_REQUIRED_MESSAGE = " lokasi (GPS) wajib diaktifkan.";

export async function checkInWithMedia(
  _prev: ActionResult,
  formData: FormData
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

  const file = formData.get("photo") as File | null;
  if (!file || typeof file.arrayBuffer !== "function") {
    return { ok: false, message: "Foto wajib diunggah." };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, message: "File yang diunggah harus berupa gambar." };
  }
  if (file.size > MAX_ATTENDANCE_PHOTO_SIZE) {
    return { ok: false, message: "Ukuran foto maksimal 10 MB." };
  }

  const latitude = Number(formData.get("latitude"));
  const longitude = Number(formData.get("longitude"));
  const latOk = typeof latitude === "number" && !Number.isNaN(latitude) && Math.abs(latitude) <= 90;
  const lngOk = typeof longitude === "number" && !Number.isNaN(longitude) && Math.abs(longitude) <= 180;
  if (!latOk || !lngOk) {
    return { ok: false, message: "GPS tidak valid." + GEO_REQUIRED_MESSAGE };
  }

  let photoPath: string | undefined;
  let photoMime: string | undefined;
  const buffer = await file.arrayBuffer();
  try {
    photoPath = await uploadAttendancePhoto(
      Buffer.from(buffer),
      placement.id,
      today,
      file.name,
    );
    photoMime = file.type || "image/jpeg";
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal mengunggah foto.";
    return { ok: false, message };
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
        latitude,
        longitude,
        photoPath,
        photoMime,
      },
    });
  } catch (error) {
    // Jika gagal karena duplicate, coba hapus foto yang baru saja diupload
    if (isUniqueViolation(error) && photoPath) {
      deleteFileFromStorage(photoPath).catch(() => {});
    }
    if (isUniqueViolation(error)) {
      return { ok: false, message: "Absensi hari ini sudah tercatat." };
    }
    if (photoPath) {
      deleteFileFromStorage(photoPath).catch(() => {});
    }
    throw error;
  }

  revalidatePath(PATH);
  return {
    ok: true,
    message:
      status === AttendanceStatus.TERLAMBAT
        ? "Absen masuk tercatat (terlambat) dengan foto & lokasi."
        : "Absen masuk tercatat dengan foto & lokasi.",
  };
}

// ── Absen pulang dengan foto & GPS ──────────────────────────────────────

export async function checkOutWithMedia(
  _prev: ActionResult,
  formData: FormData
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

  const file = formData.get("photo") as File | null;
  let photoPath: string | undefined;
  let photoMime: string | undefined;
  if (file && typeof file.arrayBuffer === "function") {
    if (!file.type.startsWith("image/")) {
      return { ok: false, message: "File yang diunggah harus berupa gambar." };
    }
    if (file.size > MAX_ATTENDANCE_PHOTO_SIZE) {
      return { ok: false, message: "Ukuran foto maksimal 10 MB." };
    }
    const buffer = await file.arrayBuffer();
    try {
      photoPath = await uploadAttendancePhoto(
        Buffer.from(buffer),
        placement.id,
        today,
        file.name,
      );
      photoMime = file.type || "image/jpeg";
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal mengunggah foto.";
      return { ok: false, message };
    }
  } else {
    return { ok: false, message: "Foto wajib diunggah untuk absen pulang." };
  }

  const latitude = Number(formData.get("latitude"));
  const longitude = Number(formData.get("longitude"));
  const latOk = typeof latitude === "number" && !Number.isNaN(latitude) && Math.abs(latitude) <= 90;
  const lngOk = typeof longitude === "number" && !Number.isNaN(longitude) && Math.abs(longitude) <= 180;
  if (!latOk || !lngOk) {
    if (photoPath) {
      deleteFileFromStorage(photoPath).catch(() => {});
    }
    return { ok: false, message: "GPS tidak valid." + GEO_REQUIRED_MESSAGE };
  }

  // Cek apakah sudah ada log aktivitas SUBMITTED untuk hari ini
  const logToday = await prisma.activityLog.findFirst({
    where: {
      placementId: placement.id,
      logDate: today,
      status: "SUBMITTED",
    },
  });
  if (!logToday) {
    if (photoPath) {
      deleteFileFromStorage(photoPath).catch(() => {});
    }
    return {
      ok: false,
      message:
        "Anda harus mengisi dan mengirim log aktivitas hari ini sebelum absen pulang.",
    };
  }

  const earlyLeave = nowWibTime() < placement.workEnd;
  try {
    await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut: new Date(),
        earlyLeave,
        latitude,
        longitude,
        photoPath,
        photoMime,
      },
    });
  } catch (error) {
    if (photoPath) {
      deleteFileFromStorage(photoPath).catch(() => {});
    }
    throw error;
  }

  revalidatePath(PATH);
  return {
    ok: true,
    message: earlyLeave
      ? "Absen pulang tercatat (pulang lebih awal) dengan foto & lokasi."
      : "Absen pulang tercatat dengan foto & lokasi.",
  };
}
