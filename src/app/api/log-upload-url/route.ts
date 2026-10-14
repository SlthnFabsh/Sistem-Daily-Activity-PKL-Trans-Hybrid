import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import {
  buildStoragePath,
  createSignedUploadUrl,
  MAX_FILES_PER_LOG,
  validateLogFile,
} from "@/lib/storage";
import { LogStatus } from "@/generated/prisma/client";

// POST /api/log-upload-url
// Membuat signed upload URL untuk lampiran log (hanya DRAFT).
export async function POST(req: NextRequest) {
  const user = await requireRole("STUDENT");

  const body = await req.json();
  const { logId, fileName, fileType, fileSize } = body as {
    logId?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
  };

  if (!logId || !fileName || !fileType || !fileSize) {
    return NextResponse.json(
      { ok: false, message: "Data tidak lengkap." },
      { status: 400 }
    );
  }

  const log = await prisma.activityLog.findUnique({
    where: { id: logId },
    include: { placement: { include: { student: true } }, attachments: true },
  });
  if (!log || log.placement.student.userId !== user.id) {
    return NextResponse.json(
      { ok: false, message: "Log tidak ditemukan." },
      { status: 404 }
    );
  }
  if (log.status !== LogStatus.DRAFT) {
    return NextResponse.json(
      { ok: false, message: "Log yang sudah dikirim tidak bisa ditambah lampirannya." },
      { status: 403 }
    );
  }
  if (log.attachments.length >= MAX_FILES_PER_LOG) {
    return NextResponse.json(
      { ok: false, message: `Maksimal ${MAX_FILES_PER_LOG} file per log.` },
      { status: 400 }
    );
  }

  const validation = validateLogFile({ name: fileName, type: fileType, size: fileSize });
  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, message: validation.error ?? "File tidak valid." },
      { status: 400 }
    );
  }

  const filePath = buildStoragePath(logId, fileName);
  const signedUrl = await createSignedUploadUrl(filePath);

  // Catat metadata lampiran di DB.
  await prisma.logAttachment.create({
    data: { logId, fileName, filePath, fileType, fileSize },
  });

  return NextResponse.json({ ok: true, signedUrl, filePath });
}
