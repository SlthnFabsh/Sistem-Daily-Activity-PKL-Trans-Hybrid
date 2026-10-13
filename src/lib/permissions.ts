import { redirect } from "next/navigation";
import type { Role } from "../generated/prisma/client";
import { auth } from "./auth";
import { prisma } from "./db";

export type SessionUser = {
  id: string;
  role: Role;
  name?: string;
  email?: string;
};

export function homePathForRole(role: Role): string {
  switch (role) {
    case "STUDENT":
      return "/student";
    case "MENTOR":
      return "/mentor";
    case "HRD":
      return "/hrd";
  }
}

/** Mengharuskan pengguna sudah login dan mengembalikan data sesinya. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) redirect("/login");
  return {
    id: session.user.id,
    role: session.user.role,
    name: session.user.name ?? undefined,
    email: session.user.email ?? undefined,
  };
}

/** Mengharuskan pengguna sudah login DAN memiliki salah satu role yang diizinkan. */
export async function requireRole(allowed: Role | Role[]): Promise<SessionUser> {
  const user = await requireUser();
  const list = Array.isArray(allowed) ? allowed : [allowed];
  if (!list.includes(user.role)) redirect(homePathForRole(user.role));
  return user;
}

/**
 * Cek apakah aktor boleh melihat data siswa tertentu.
 * STUDENT hanya miliknya sendiri, MENTOR hanya siswa di divisinya, HRD semua.
 */
export async function canViewStudent(
  actor: SessionUser,
  studentId: string
): Promise<boolean> {
  if (actor.role === "HRD") return true;

  if (actor.role === "MENTOR") {
    const mentor = await prisma.mentor.findUnique({
      where: { userId: actor.id },
    });
    if (!mentor) return false;
    const count = await prisma.placement.count({
      where: { studentId, divisionId: mentor.divisionId },
    });
    return count > 0;
  }

  const student = await prisma.student.findUnique({
    where: { userId: actor.id },
  });
  return student?.id === studentId;
}