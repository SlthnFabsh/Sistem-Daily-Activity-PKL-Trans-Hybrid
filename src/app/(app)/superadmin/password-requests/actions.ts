"use server";

import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/permissions";
import { isResetTokenValid } from "@/lib/permissions";
import { setPasswordSchema } from "@/lib/validations";
import { toFieldErrors, type ActionResult } from "@/lib/action-result";

const SALT_ROUNDS = 10;

export async function listPasswordRequests() {
  await requireSuperAdmin();

  const requests = await prisma.passwordResetRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { requestedAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  return requests.map((r) => ({
    id: r.id,
    userId: r.userId,
    token: r.token,
    requestedAt: r.requestedAt.toISOString(),
    user: r.user,
  }));
}

export async function fulfillResetPassword(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireSuperAdmin();

  const parsed = setPasswordSchema.safeParse({
    token: formData.get("token"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const { token, newPassword } = parsed.data;

  const check = await isResetTokenValid(token);
  if (!check.valid || !check.request) {
    return { ok: false, message: "Token reset tidak valid atau sudah kadaluarsa." };
  }

  const passwordHash = await hash(newPassword, SALT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: check.request.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetRequest.update({
      where: { id: check.request.id },
      data: {
        status: "FULFILLED",
        newPasswordHash: passwordHash,
        fulfilledAt: new Date(),
      },
    }),
  ]);

  // Invalidate semua token PENDING milik user ini
  await prisma.passwordResetRequest.updateMany({
    where: { userId: check.request.userId, status: "PENDING" },
    data: { status: "EXPIRED" },
  });

  revalidatePath("/superadmin/password-requests");
  return {
    ok: true,
    message: `Password ${check.request.name} (${check.request.email}) berhasil diatur ulang.`,
  };
}

export async function cancelPasswordRequest(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireSuperAdmin();

  const requestId = formData.get("requestId")?.toString().trim();
  if (!requestId) {
    return { ok: false, message: "Permintaan tidak dikenal." };
  }

  await prisma.passwordResetRequest.updateMany({
    where: { id: requestId, status: "PENDING" },
    data: { status: "EXPIRED" },
  });

  revalidatePath("/superadmin/password-requests");
  return { ok: true, message: "Permintaan reset dibatalkan." };
}
