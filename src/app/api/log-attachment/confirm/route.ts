import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import {
  MAX_FILES_PER_LOG,
  storageObjectExists,
  validateLogFile,
} from "@/lib/storage";
import { LogStatus } from "@/generated/prisma/client";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// POST /api/log-attachment/confirm
// Mencatat metadata lampiran setelah file berhasil diunggah ke Supabase Storage.
export async function POST(req: NextRequest) {
  const user = await requireRole("STUDENT");

  const body = await req.json();
  const { logId, filePath, fileName, fileType, fileSize } = body as {
    logId?: string;
    filePath?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
  };

  if (!logId || !filePath || !fileName || !fileType || !fileSize) {
    return NextResponse.json(
      { ok: false, message: "Data tidak lengkap." },
      { status: 400 }
    );
  }

  if (!filePath.startsWith(`logs/${logId}/`)) {
    return NextResponse.json(
      { ok: false, message: "Path file tidak valid." },
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

  let exists = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    exists = await storageObjectExists(filePath);
    if (exists) break;
    await sleep(250);
  }
  if (!exists) {
    return NextResponse.json(
      { ok: false, message: "File belum terunggah atau tidak ditemukan di penyimpanan." },
      { status: 409 }
    );
  }

  await prisma.logAttachment.create({
    data: { logId, fileName, filePath, fileType, fileSize },
  });

  return NextResponse.json({ ok: true, message: "Lampiran dikonfirmasi." });
}
