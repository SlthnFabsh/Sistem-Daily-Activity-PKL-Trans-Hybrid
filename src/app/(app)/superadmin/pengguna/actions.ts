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
// Password selalu memakai TEMP_PASSWORD; superadmin bisa mereset lewat tombol terpisah.
export async function saveMentor(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireRole("SUPERADMIN");

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

  revalidatePath("/superadmin/pengguna");
  return {
    ok: true,
    message: id
      ? "Pembimbing diperbarui."
      : `Pembimbing dibuat. Password sementara: ${TEMP_PASSWORD}`,
  };
}

export async function deleteMentor(id: string): Promise<ActionResult> {
  await requireRole("SUPERADMIN");

  const mentor = await prisma.mentor.findUnique({ where: { id } });
  if (!mentor) return { ok: false, message: "Pembimbing tidak ditemukan." };

  await prisma.$transaction([
    prisma.mentor.delete({ where: { id } }),
    prisma.user.delete({ where: { id: mentor.userId } }),
  ]);

  revalidatePath("/superadmin/pengguna");
  return { ok: true, message: "Pembimbing dihapus." };
}

export async function resetMentorPassword(id: string): Promise<ActionResult> {
  await requireRole("SUPERADMIN");

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

  revalidatePath("/superadmin/pengguna");
  return {
    ok: true,
    message: `Password ${mentor.user.name} direset menjadi: ${TEMP_PASSWORD}`,
  };
}

// Membuat atau memperbarui HRD. Bila ada `id` berarti edit.
export async function saveHrd(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireRole("SUPERADMIN");

  const id = formData.get("id")?.toString().trim() ?? "";
  const parsed = mentorSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const { name, email } = parsed.data;

  try {
    if (id) {
      const hrd = await prisma.user.findFirst({
        where: { role: "HRD", mentor: null },
        select: { id: true },
      });
      // hrd yang sedang diedit boleh tidak dihitung
      if (hrd && hrd.id !== id) {
        return { ok: false, message: "Sudah ada akun HRD. Hapus atau edit yang ada." };
      }
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user || user.role !== "HRD") return { ok: false, message: "Akun HRD tidak ditemukan." };
      await prisma.user.update({
        where: { id },
        data: { name, email },
      });
    } else {
      const passwordHash = await hash(TEMP_PASSWORD, SALT_ROUNDS);
      const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existing) {
        return { ok: false, fieldErrors: { email: ["Email sudah terdaftar."] } };
      }
      await prisma.user.create({
        data: { name, email, passwordHash, role: "HRD" },
      });
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, fieldErrors: { email: ["Email sudah terdaftar."] } };
    }
    throw error;
  }

  revalidatePath("/superadmin/pengguna");
  return {
    ok: true,
    message: id ? "HRD diperbarui." : `HRD dibuat. Password sementara: ${TEMP_PASSWORD}`,
  };
}

export async function deleteHrd(id: string): Promise<ActionResult> {
  await requireRole("SUPERADMIN");

  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  if (!user || user.role !== "HRD") {
    return { ok: false, message: "Akun HRD tidak ditemukan." };
  }

  const count = await prisma.user.count({ where: { role: "HRD" } });
  if (count <= 1) {
    return { ok: false, message: "Tidak bisa menghapus satu-satunya akun HRD." };
  }

  await prisma.user.delete({ where: { id } });

  revalidatePath("/superadmin/pengguna");
  return { ok: true, message: "HRD dihapus." };
}

export async function resetHrdPassword(id: string): Promise<ActionResult> {
  await requireRole("SUPERADMIN");

  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true, name: true },
  });
  if (!user || user.role !== "HRD") {
    return { ok: false, message: "Akun HRD tidak ditemukan." };
  }

  const passwordHash = await hash(TEMP_PASSWORD, SALT_ROUNDS);
  await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });

  revalidatePath("/superadmin/pengguna");
  return {
    ok: true,
    message: `Password ${user.name} direset menjadi: ${TEMP_PASSWORD}`,
  };
}
