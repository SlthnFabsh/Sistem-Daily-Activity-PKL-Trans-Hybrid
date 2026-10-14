"use server";

import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import { read, utils, type WorkBook, type WorkSheet } from "xlsx";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { studentSchema, importRowSchema } from "@/lib/validations";
import { TEMP_PASSWORD } from "@/lib/constants";
import {
  isUniqueViolation,
  toFieldErrors,
  type ActionResult,
  type ImportResult,
} from "@/lib/action-result";

const SALT_ROUNDS = 10;
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

// Membuat atau memperbarui siswa beserta akun loginnya. Bila ada `id` berarti edit.
export async function saveStudent(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireRole("HRD");

  const id = formData.get("id")?.toString().trim() ?? "";
  const parsed = studentSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    schoolName: formData.get("schoolName"),
    nis: formData.get("nis"),
    major: formData.get("major"),
    className: formData.get("className"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
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
      const passwordHash = await hash(TEMP_PASSWORD, SALT_ROUNDS);
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { name, email, passwordHash, role: "STUDENT" },
        });
        await tx.student.create({
          data: { userId: user.id, nis, schoolName, major, className, phone },
        });
      });
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, fieldErrors: { email: ["Email sudah terdaftar."] } };
    }
    throw error;
  }

  revalidatePath("/hrd/siswa");
  return {
    ok: true,
    message: id
      ? "Siswa diperbarui."
      : `Siswa dibuat. Password sementara: ${TEMP_PASSWORD}`,
  };
}

export async function deleteStudent(id: string): Promise<ActionResult> {
  await requireRole("HRD");

  const student = await prisma.student.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!student) return { ok: false, message: "Siswa tidak ditemukan." };

  const placements = await prisma.placement.count({ where: { studentId: id } });
  if (placements > 0) {
    return {
      ok: false,
      message: "Siswa masih memiliki penempatan. Hapus penempatannya terlebih dahulu.",
    };
  }

  await prisma.$transaction([
    prisma.student.delete({ where: { id } }),
    prisma.user.delete({ where: { id: student.userId } }),
  ]);

  revalidatePath("/hrd/siswa");
  return { ok: true, message: "Siswa dihapus." };
}

export async function resetStudentPassword(id: string): Promise<ActionResult> {
  await requireRole("HRD");

  const student = await prisma.student.findUnique({
    where: { id },
    include: { user: { select: { name: true } } },
  });
  if (!student) return { ok: false, message: "Siswa tidak ditemukan." };

  const passwordHash = await hash(TEMP_PASSWORD, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: student.userId },
    data: { passwordHash },
  });

  revalidatePath("/hrd/siswa");
  return {
    ok: true,
    message: `Password ${student.user.name} direset menjadi: ${TEMP_PASSWORD}`,
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
  await requireRole("HRD");

  const file = formData.get("file");
  if (!file || typeof (file as File).arrayBuffer !== "function") {
    return failImport("File wajib dipilih.");
  }
  const upload = file as File;
  if (!/\.(xlsx|xls)$/i.test(upload.name)) {
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
      const passwordHash = await hash(TEMP_PASSWORD, SALT_ROUNDS);
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { name: data.name, email: data.email, passwordHash, role: "STUDENT" },
        });
        await tx.student.create({
          data: {
            userId: user.id,
            nis: data.nis,
            schoolName: data.schoolName,
            major: data.major,
            className: data.className,
            phone: data.phone,
          },
        });
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

  revalidatePath("/hrd/siswa");
  return {
    ok: true,
    imported,
    failed,
    rows,
    message: `Impor selesai: ${imported} berhasil, ${failed} gagal.`,
  };
}

function failImport(message: string): ImportResult {
  return { ok: false, imported: 0, failed: 0, rows: [], message };
}