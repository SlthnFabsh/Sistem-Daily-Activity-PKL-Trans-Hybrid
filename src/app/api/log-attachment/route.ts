import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { createSignedDownloadUrl } from "@/lib/storage";

// GET /api/log-attachment?attachmentId=xxx
// Membuat signed download URL berumur pendek untuk lampiran.
// Otorisasi: STUDENT hanya miliknya sendiri, MENTOR siswa di divisinya, HRD semua.
export async function GET(req: NextRequest) {
  const user = await requireUser();

  const attachmentId = req.nextUrl.searchParams.get("attachmentId");
  if (!attachmentId) {
    return NextResponse.json(
      { ok: false, message: "ID lampiran tidak valid." },
      { status: 400 }
    );
  }

  const att = await prisma.logAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      log: {
        include: {
          placement: {
            include: {
              student: { include: { user: true } },
              division: { include: { mentors: true } },
            },
          },
        },
      },
    },
  });
  if (!att) {
    return NextResponse.json(
      { ok: false, message: "Lampiran tidak ditemukan." },
      { status: 404 }
    );
  }

  // Cek otorisasi.
  let allowed = false;
  if (user.role === "HRD") {
    allowed = true;
  } else if (user.role === "MENTOR") {
    const mentor = await prisma.mentor.findUnique({
      where: { userId: user.id },
    });
    allowed =
      !!mentor &&
      att.log.placement.division.mentors.some((m) => m.id === mentor.id);
  } else {
    allowed = att.log.placement.student.userId === user.id;
  }

  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: "Anda tidak memiliki akses ke lampiran ini." },
      { status: 403 }
    );
  }

  try {
    const signedUrl = await createSignedDownloadUrl(att.filePath);
    return NextResponse.json({ ok: true, signedUrl });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: "Lampiran tidak ditemukan atau gagal dimuat." },
      { status: 404 }
    );
  }
}
