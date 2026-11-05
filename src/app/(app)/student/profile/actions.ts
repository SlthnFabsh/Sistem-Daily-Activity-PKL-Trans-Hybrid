"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { toFieldErrors } from "@/lib/action-result";

const profileSchema = z.object({
  nis: z.string().min(1, "NIS wajib diisi").max(50, "NIS maksimal 50 karakter"),
  schoolName: z
    .string()
    .min(1, "Asal sekolah wajib diisi")
    .max(200, "Nama sekolah maksimal 200 karakter"),
  className: z
    .string()
    .min(1, "Kelas wajib diisi")
    .max(50, "Kelas maksimal 50 karakter"),
  major: z
    .string()
    .min(1, "Jurusan wajib diisi")
    .max(100, "Jurusan maksimal 100 karakter"),
});

export async function completeProfile(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "STUDENT") {
    return { ok: false, message: "Unauthorized" };
  }

  const raw = {
    nis: formData.get("nis"),
    schoolName: formData.get("schoolName"),
    className: formData.get("className"),
    major: formData.get("major"),
  };

  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
  });

  if (!student) {
    return { ok: false, message: "Data siswa tidak ditemukan" };
  }

  await prisma.student.update({
    where: { id: student.id },
    data: {
      nis: parsed.data.nis,
      schoolName: parsed.data.schoolName,
      className: parsed.data.className,
      major: parsed.data.major,
      profileCompleted: true,
    },
  });

  revalidatePath("/student/profile");
  revalidatePath("/student");
  return { ok: true, message: "Profil berhasil dilengkapi" };
}

export async function updateProfile(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "STUDENT") {
    return { ok: false, message: "Unauthorized" };
  }

  const raw = {
    nis: formData.get("nis"),
    schoolName: formData.get("schoolName"),
    className: formData.get("className"),
    major: formData.get("major"),
  };

  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
  });

  if (!student) {
    return { ok: false, message: "Data siswa tidak ditemukan" };
  }

  await prisma.student.update({
    where: { id: student.id },
    data: {
      nis: parsed.data.nis,
      schoolName: parsed.data.schoolName,
      className: parsed.data.className,
      major: parsed.data.major,
    },
  });

  revalidatePath("/student/profile");
  return { ok: true, message: "Profil berhasil diperbarui" };
}
