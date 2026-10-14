"use server";

import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { mentorSchema } from "@/lib/validations";
import { TEMP_PASSWORD } from "@/lib/constants";
import { isUniqueViolation, toFieldErrors, type ActionResult } from "@/lib/action-result";

const SALT_ROUNDS = 10;

/** PIC lain di divisi yang sama (kecuali pembimbing yang sedang diedit). */
async function findOtherPic(divisionId: string, excludeMentorId?: string) {
  return prisma.mentor.findFirst({
    where: {
      divisionId,
      isPic: true,
      ...(excludeMentorId ? { id: { not: excludeMentorId } } : {}),
    },
    include: { user: { select: { name: true } } },
  });
}

// Membuat atau memperbarui pembimbing. Bila ada `id` berarti edit.
// Passwor selalu memakai TEMP_PASSWORD; HRD bisa mereset lewat tombol terpisah.
export async function saveMentor(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireRole("HRD");

  const id = formData.get("id")?.toString().trim() ?? "";
  const parsed = mentorSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    divisionId: formData.get("divisionId"),
    isPic: formData.get("isPic") === "on",
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const { name, email, divisionId, isPic } = parsed.data;

  if (isPic) {
    const otherPic = await findOtherPic(divisionId, id || undefined);
    if (otherPic) {
      return {
        ok: false,
        fieldErrors: {
          isPic: [`Divisi ini sudah memiliki PIC: ${otherPic.user.name}.`],
        },
      };
    }
  }

  try {
    if (id) {
      const mentor = await prisma.mentor.findUnique({ where: { id } });
      if (!mentor) return { ok: false, message: "Pembimbing tidak ditemukan." };
      await prisma.$transaction([
        prisma.user.update({
          where: { id: mentor.userId },
          data: { name, email },
        }),
        prisma.mentor.update({ where: { id }, data: { divisionId, isPic } }),
      ]);
    } else {
      const passwordHash = await hash(TEMP_PASSWORD, SALT_ROUNDS);
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { name, email, passwordHash, role: "MENTOR" },
        });
        await tx.mentor.create({
          data: { userId: user.id, divisionId, isPic },
        });
      });
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, fieldErrors: { email: ["Email sudah terdaftar."] } };
    }
    throw error;
  }

  revalidatePath("/hrd/pengguna");
  return {
    ok: true,
    message: id
      ? "Pembimbing diperbarui."
      : `Pembimbing dibuat. Password sementara: ${TEMP_PASSWORD}`,
  };
}

export async function deleteMentor(id: string): Promise<ActionResult> {
  await requireRole("HRD");

  const mentor = await prisma.mentor.findUnique({ where: { id } });
  if (!mentor) return { ok: false, message: "Pembimbing tidak ditemukan." };

  await prisma.$transaction([
    prisma.mentor.delete({ where: { id } }),
    prisma.user.delete({ where: { id: mentor.userId } }),
  ]);

  revalidatePath("/hrd/pengguna");
  return { ok: true, message: "Pembimbing dihapus." };
}

export async function resetMentorPassword(id: string): Promise<ActionResult> {
  await requireRole("HRD");

  const mentor = await prisma.mentor.findUnique({
    where: { id },
    include: { user: { select: { name: true } } },
  });
  if (!mentor) return { ok: false, message: "Pembimbing tidak ditemukan." };

  const passwordHash = await hash(TEMP_PASSWORD, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: mentor.userId },
    data: { passwordHash },
  });

  revalidatePath("/hrd/pengguna");
  return {
    ok: true,
    message: `Password ${mentor.user.name} direset menjadi: ${TEMP_PASSWORD}`,
  };
}