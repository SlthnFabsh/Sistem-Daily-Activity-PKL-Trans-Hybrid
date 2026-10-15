"use server";

import { revalidatePath } from "next/cache";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { generateResetToken } from "@/lib/permissions";
import { changePasswordSchema, requestResetSchema } from "@/lib/validations";
import { toFieldErrors, type ActionResult } from "@/lib/action-result";

const SALT_ROUNDS = 10;

export async function changePassword(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const { currentPassword, newPassword } = parsed.data;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!dbUser) {
    return { ok: false, message: "Akun tidak ditemukan." };
  }

  const valid = await compare(currentPassword, dbUser.passwordHash);
  if (!valid) {
    return { ok: false, fieldErrors: { currentPassword: ["Password lama tidak cocok."] } };
  }

  const passwordHash = await hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  // Invalidate semua token reset yang belum terpakai milik user ini
  await prisma.passwordResetRequest.updateMany({
    where: { userId: user.id, status: "PENDING" },
    data: { status: "EXPIRED" },
  });

  revalidatePath("/settings/password");
  return { ok: true, message: "Password berhasil diubah." };
}

export async function requestPasswordReset(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = requestResetSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const { email } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) {
    // Standar keamanan: jangan kasih tahu apakah email ada atau tidak.
    return { ok: true, message: "Jika email terdaftar, permintaan reset akan dibuat." };
  }

  // Buat permintaan reset; jika sudah ada PENDING, gunakan yang lama (update waktu).
  let request = await prisma.passwordResetRequest.findFirst({
    where: { userId: user.id, status: "PENDING" },
    orderBy: { requestedAt: "desc" },
  });

  if (request) {
    await prisma.passwordResetRequest.update({
      where: { id: request.id },
      data: { requestedAt: new Date() },
    });
  } else {
    request = await prisma.passwordResetRequest.create({
      data: {
        userId: user.id,
        token: generateResetToken(),
        status: "PENDING",
      },
    });
  }

  // Di sini seharusnya mengirim email ke `user.email` berisi tautan/token.
  // Karena belum ada layanan email, cukup catat saja.

  revalidatePath("/settings/password");
  return { ok: true, message: "Jika email terdaftar, permintaan reset akan dibuat. Hubungi superadmin untuk menyelesaikan." };
}
