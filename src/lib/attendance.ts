import { prisma } from "@/lib/db";
import { PlacementStatus } from "@/generated/prisma/client";

// Penempatan PKL aktif milik seorang siswa (berdasarkan userId), lengkap dengan
// periode dan divisi. Siswa bisa punya beberapa penempatan (satu per periode),
// jadi kita ambil yang statusnya ACTIVE dengan periode terbaru.
export async function getActivePlacementForUser(userId: string) {
  return prisma.placement.findFirst({
    where: { student: { userId }, status: PlacementStatus.ACTIVE },
    include: { period: true, division: true },
    orderBy: { period: { startDate: "desc" } },
  });
}

/** Cek apakah sebuah tanggal (UTC tengah malam) berada di dalam rentang periode PKL. */
export function isDateInPeriod(
  date: Date,
  period: { startDate: Date; endDate: Date }
): boolean {
  const t = date.getTime();
  return t >= period.startDate.getTime() && t <= period.endDate.getTime();
}