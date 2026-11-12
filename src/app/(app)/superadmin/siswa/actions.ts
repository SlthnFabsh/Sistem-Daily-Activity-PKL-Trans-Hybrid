"use server";

import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import { read, utils, type WorkBook, type WorkSheet } from "xlsx";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { studentSchema, importRowSchema } from "@/lib/validations";
import { HRD_STUDENT_INITIAL_PASSWORD, TEMP_PASSWORD } from "@/lib/constants";
import {
  isUniqueViolation,
  toFieldErrors,
  type ActionResult,
  type ImportResult,
} from "@/lib/action-result";
import {
  deleteAttendancePhotoFromStorage,
  deleteFileFromStorage,
} from "@/lib/storage";

const SALT_ROUNDS = 10;
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

// Membuat atau memperbarui siswa beserta akun loginnya. Bila ada `id` berarti edit.
export async function saveStudent(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const actor = await requireRole(["SUPERADMIN", "HRD"]);

  const id = formData.get("id")?.toString().trim() ?? "";
  // Field biodata bersifat opsional dan tidak selalu ada di form (mis. form HRD
  // hanya berisi nama/email/telepon). `formData.get` mengembalikan null untuk
  // field yang tidak dikirim, sedangkan skema Zod hanya menerima string, jadi
  // kosongkan dulu agar tidak gagal validasi.
  const text = (key: string) => formData.get(key)?.toString() ?? "";
  const parsed = studentSchema.safeParse({
    name: text("name"),
    email: text("email"),
    schoolName: text("schoolName"),
    nis: text("nis"),
    major: text("major"),
    className: text("className"),
    phone: text("phone"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Periksa kembali data siswa.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const { name, email, schoolName, nis, major, className, phone } = parsed.data;

  try {
    if (id) {
      const student = await prisma.student.findUnique({
        where: { id },
        select: { userId: true },
      });
      if (!student) return { ok: false, message: "Siswa tidak ditemukan." };
      await prisma.$transaction([
        prisma.user.update({
          where: { id: student.userId },
          data: { name, email },
        }),
        prisma.student.update({
          where: { id },
          data: { nis, schoolName, major, className, phone },
        }),
      ]);
    } else {
      const initialPassword =
        actor.role === "HRD" ? HRD_STUDENT_INITIAL_PASSWORD : TEMP_PASSWORD;
      const passwordHash = await hash(initialPassword, SALT_ROUNDS);
      await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: "STUDENT",
          mustChangePassword: actor.role === "HRD",
          student: {
            create: {
              nis,
              schoolName,
              major,
              className,
              phone,
            },
          },
        },
      });
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, fieldErrors: { email: ["Email sudah terdaftar."] } };
    }
    throw error;
  }

  revalidatePath("/superadmin/siswa");
  revalidatePath("/hrd/siswa");
  return {
    ok: true,
    message: id
      ? "Siswa diperbarui."
      : actor.role === "HRD"
        ? `Siswa dibuat. Password sementara: ${HRD_STUDENT_INITIAL_PASSWORD}. Siswa wajib menggantinya saat login pertama.`
        : `Siswa dibuat. Password sementara: ${TEMP_PASSWORD}`,
  };
}

export async function deleteStudent(id: string): Promise<ActionResult> {
  await requireRole(["SUPERADMIN", "HRD"]);

  const student = await prisma.student.findUnique({
    where: { id },
    select: {
      userId: true,
      placements: {
        select: {
          id: true,
          periodId: true,
          attendances: { select: { photoPath: true } },
          logs: { select: { attachments: { select: { filePath: true } } } },
        },
      },
    },
  });
  if (!student) return { ok: false, message: "Siswa tidak ditemukan." };

  const placementIds = student.placements.map((p) => p.id);
  const periodIds = [...new Set(student.placements.map((p) => p.periodId))];

  // Hapus file di Supabase Storage lebih dulu; abaikan jika file sudah tidak ada.
  const photoPaths = student.placements
    .flatMap((p) => p.attendances)
    .map((a) => a.photoPath)
    .filter((path): path is string => Boolean(path));
  const attachmentPaths = student.placements
    .flatMap((p) => p.logs)
    .flatMap((l) => l.attachments)
    .map((a) => a.filePath);

  await Promise.all([
    ...photoPaths.map((p) => deleteAttendancePhotoFromStorage(p).catch(() => {})),
    ...attachmentPaths.map((p) => deleteFileFromStorage(p).catch(() => {})),
  ]);

  await prisma.$transaction(async (tx) => {
    if (placementIds.length > 0) {
      await tx.logAttachment.deleteMany({
        where: { log: { placementId: { in: placementIds } } },
      });
      await tx.activityLog.deleteMany({
        where: { placementId: { in: placementIds } },
      });
      await tx.attendance.deleteMany({
        where: { placementId: { in: placementIds } },
      });
    }
    await tx.placement.deleteMany({ where: { studentId: id } });
    await tx.passwordResetRequest.deleteMany({
      where: { userId: student.userId },
    });
    await tx.student.delete({ where: { id } });
    await tx.user.delete({ where: { id: student.userId } });
  });

  // Bersihkan periode PKL yang tidak lagi dipakai penempatan mana pun.
  for (const periodId of periodIds) {
    const used = await prisma.placement.count({ where: { periodId } });
    if (used === 0) {
      await prisma.pklPeriod.delete({ where: { id: periodId } }).catch(() => {});
    }
  }

  revalidatePath("/superadmin/siswa");
  revalidatePath("/hrd/siswa");
  revalidatePath("/hrd/penempatan");
  revalidatePath("/hrd/log");
  revalidatePath("/hrd/absensi");
  return {
    ok: true,
    message: "Siswa beserta seluruh riwayat absensi dan log berhasil dihapus.",
  };
}

function normalizeKey(key: string): string | undefined {
  const map: Record<string, string> = {
    nama: "name",
    email: "email",
    nis: "nis",
    sekolah: "schoolName",
    jurusan: "major",
    kelas: "className",
    telepon: "phone",
  };
  return map[key.trim().toLowerCase()];
}

function stringify(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

// Import siswa dari Excel (.xlsx). Setiap baris diproses satu per satu: baris
// yang valid disimpan, baris yang tidak valid dicatat tanpa membatalkan lainnya.
export async function importStudents(
  _prev: ImportResult,
  formData: FormData
): Promise<ImportResult> {
  const actor = await requireRole(["SUPERADMIN", "HRD"]);
  const createdByHrd = actor.role === "HRD";
  const initialPassword = createdByHrd
    ? HRD_STUDENT_INITIAL_PASSWORD
    : TEMP_PASSWORD;

  const file = formData.get("file");
  if (!file || typeof (file as File).arrayBuffer !== "function") {
    return failImport("File wajib dipilih.");
  }
  const upload = file as File;
  if (!/\\.(xlsx|xls)$/i.test(upload.name)) {
    return failImport("Format file harus .xlsx atau .xls.");
  }
  if (upload.size > MAX_IMPORT_BYTES) {
    return failImport("Ukuran file maksimal 5 MB.");
  }

  let workbook: WorkBook;
  let sheet: WorkSheet;
  try {
    const buffer = Buffer.from(await upload.arrayBuffer());
    workbook = read(buffer, { type: "buffer" });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) throw new Error("Kosong");
    sheet = workbook.Sheets[firstSheet];
  } catch {
    return failImport("Gagal membaca file Excel. Pastikan formatnya benar.");
  }

  const rawRows = utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
  if (rawRows.length === 0) {
    return failImport("File Excel tidak berisi data siswa.");
  }

  const rows: ImportResult["rows"] = [];
  let imported = 0;
  let failed = 0;

  for (const [index, raw] of rawRows.entries()) {
    const rowNumber = index + 2; // baris pertama adalah header
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      const target = normalizeKey(key);
      if (target) normalized[target] = stringify(value);
    }

    const parsed = importRowSchema.safeParse(normalized);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Data tidak valid.";
      failed += 1;
      rows.push({
        row: rowNumber,
        name: stringify(normalized.name),
        ok: false,
        error: firstError,
      });
      continue;
    }

    const data = parsed.data;
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    if (existing) {
      failed += 1;
      rows.push({
        row: rowNumber,
        name: data.name,
        ok: false,
        error: "Email sudah terdaftar.",
      });
      continue;
    }

    try {
      const passwordHash = await hash(initialPassword, SALT_ROUNDS);
      await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
          role: "STUDENT",
          mustChangePassword: createdByHrd,
          student: {
            create: {
              nis: data.nis,
              schoolName: data.schoolName,
              major: data.major,
              className: data.className,
              phone: data.phone,
            },
          },
        },
      });
      imported += 1;
      rows.push({ row: rowNumber, name: data.name, ok: true });
    } catch (error) {
      failed += 1;
      rows.push({
        row: rowNumber,
        name: data.name,
        ok: false,
        error: isUniqueViolation(error)
          ? "Email sudah terdaftar."
          : "Gagal menyimpan baris.",
      });
    }
  }

  revalidatePath("/superadmin/siswa");
  revalidatePath("/hrd/siswa");
  return {
    ok: true,
    imported,
    failed,
    rows,
    message:
      createdByHrd && imported > 0
        ? `Impor selesai: ${imported} berhasil, ${failed} gagal. Password sementara siswa: ${HRD_STUDENT_INITIAL_PASSWORD}; wajib diganti saat login pertama.`
        : `Impor selesai: ${imported} berhasil, ${failed} gagal.`,
  };
}

function failImport(message: string): ImportResult {
  return { ok: false, imported: 0, failed: 0, rows: [], message };
}

