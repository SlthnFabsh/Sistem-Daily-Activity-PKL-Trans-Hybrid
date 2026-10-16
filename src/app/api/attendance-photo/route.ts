import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { createAttendancePhotoUrl } from "@/lib/storage";

// GET /api/attendance-photo?attendanceId=xxx
// Membuat signed URL berumur pendek untuk foto absensi (bucket privat).
// Otorisasi: HRD/SUPERADMIN semua, MENTOR siswa di divisinya, STUDENT miliknya.
export async function GET(req: NextRequest) {
  const user = await requireUser();

  const attendanceId = req.nextUrl.searchParams.get("attendanceId");
  if (!attendanceId) {
    return NextResponse.json(
      { ok: false, message: "ID absensi tidak valid." },
      { status: 400 }
    );
  }

  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: {
      placement: {
        include: {
          student: { include: { user: true } },
          division: { include: { mentors: true } },
        },
      },
    },
  });

  if (!attendance) {
    return NextResponse.json(
      { ok: false, message: "Data absensi tidak ditemukan." },
      { status: 404 }
    );
  }

  if (!attendance.photoPath) {
    return NextResponse.json(
      { ok: false, message: "Absensi ini tidak memiliki foto." },
      { status: 404 }
    );
  }

  // Cek otorisasi.
  let allowed = false;
  if (user.role === "HRD" || user.role === "SUPERADMIN") {
    allowed = true;
  } else if (user.role === "MENTOR") {
    const mentor = await prisma.mentor.findUnique({
      where: { userId: user.id },
    });
    allowed =
      !!mentor &&
      attendance.placement.division.mentors.some((m) => m.id === mentor.id);
  } else {
    allowed = attendance.placement.student.userId === user.id;
  }

  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: "Anda tidak memiliki akses ke foto absensi ini." },
      { status: 403 }
    );
  }

  try {
    const signedUrl = await createAttendancePhotoUrl(attendance.photoPath, 3600);
    return NextResponse.json({ ok: true, signedUrl });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Foto absensi tidak ditemukan atau gagal dimuat." },
      { status: 404 }
    );
  }
}
