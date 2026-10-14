import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import * as fs from "node:fs";
import * as path from "node:path";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { formatWibDate, getWibDateParts } from "@/lib/time";
import { ReportDocument } from "@/lib/pdf/report-document";
import type { PdfReportData } from "@/lib/pdf/report-document";

// GET /api/laporan-pdf?studentId=xxx&fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
// Menghasilkan PDF laporan PKL. Otorisasi dicek di server.
export async function GET(req: NextRequest) {
  const user = await requireUser();

  const { searchParams } = req.nextUrl;
  const studentId = searchParams.get("studentId");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");

  if (!studentId) {
    return NextResponse.json(
      { ok: false, message: "Parameter studentId diperlukan." },
      { status: 400 }
    );
  }

  // ── Ambil data siswa & penempatan ──────────────────────────────────────
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { name: true, email: true } },
      placements: {
        include: {
          period: true,
          division: {
            include: {
              mentors: {
                where: { isPic: true },
                include: { user: { select: { name: true } } },
                take: 1,
              },
            },
          },
        },
        orderBy: { period: { startDate: "desc" } },
        take: 1,
      },
    },
  });

  if (!student) {
    return NextResponse.json(
      { ok: false, message: "Siswa tidak ditemukan." },
      { status: 404 }
    );
  }

  // ── Otorisasi berdasarkan role ──────────────────────────────────────────
  if (user.role === "STUDENT") {
    // Hanya milik sendiri
    const ownStudent = await prisma.student.findUnique({
      where: { userId: user.id },
    });
    if (!ownStudent || ownStudent.id !== studentId) {
      return NextResponse.json(
        { ok: false, message: "Anda tidak memiliki akses ke data ini." },
        { status: 403 }
      );
    }
  } else if (user.role === "MENTOR") {
    // Hanya siswa di divisi sendiri
    const mentor = await prisma.mentor.findUnique({
      where: { userId: user.id },
    });
    if (!mentor) {
      return NextResponse.json(
        { ok: false, message: "Akun pembimbing tidak ditemukan." },
        { status: 403 }
      );
    }
    const inDivision = await prisma.placement.count({
      where: { studentId, divisionId: mentor.divisionId },
    });
    if (inDivision === 0) {
      return NextResponse.json(
        { ok: false, message: "Anda tidak memiliki akses ke siswa ini." },
        { status: 403 }
      );
    }
  }
  // HRD: akses semua, tidak perlu cek tambahan

  const placement = student.placements[0];

  // ── Filter tanggal ─────────────────────────────────────────────────────
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const validFrom =
    fromDate && DATE_RE.test(fromDate) ? fromDate : undefined;
  const validTo = toDate && DATE_RE.test(toDate) ? toDate : undefined;

  const logWhere: {
    placementId?: string;
    placement?: { studentId: string };
    status: "SUBMITTED";
    logDate?: { gte?: Date; lte?: Date };
  } = { status: "SUBMITTED" };

  if (placement) {
    logWhere.placementId = placement.id;
  } else {
    logWhere.placement = { studentId };
  }

  if (validFrom || validTo) {
    logWhere.logDate = {
      ...(validFrom ? { gte: new Date(`${validFrom}T00:00:00.000Z`) } : {}),
      ...(validTo ? { lte: new Date(`${validTo}T00:00:00.000Z`) } : {}),
    };
  }

  const [logs, attendances] = await Promise.all([
    prisma.activityLog.findMany({
      where: logWhere,
      include: { attachments: true },
      orderBy: { logDate: "asc" },
    }),
    placement
      ? prisma.attendance.findMany({
          where: {
            placementId: placement.id,
            ...(validFrom || validTo
              ? {
                  attDate: {
                    ...(validFrom
                      ? { gte: new Date(`${validFrom}T00:00:00.000Z`) }
                      : {}),
                    ...(validTo
                      ? { lte: new Date(`${validTo}T00:00:00.000Z`) }
                      : {}),
                  },
                }
              : {}),
          },
        })
      : Promise.resolve([]),
  ]);

  // ── Rekap absensi ──────────────────────────────────────────────────────
  const attendance = {
    hadir: attendances.filter((a) => a.status === "HADIR").length,
    terlambat: attendances.filter((a) => a.status === "TERLAMBAT").length,
    izin: attendances.filter((a) => a.status === "IZIN").length,
    sakit: attendances.filter((a) => a.status === "SAKIT").length,
    total: attendances.length,
  };

  // ── Log rows ───────────────────────────────────────────────────────────
  const logRows = logs.map((l, i) => ({
    no: i + 1,
    date: formatWibDate(l.logDate),
    startTime: l.startTime,
    endTime: l.endTime,
    taskFrom: l.taskFrom,
    description: l.description,
    output: l.output ?? "",
    fileNames: l.attachments.map((a) => a.fileName).join(", "),
  }));

  // ── Tanggal cetak (WIB) ────────────────────────────────────────────────
  const now = new Date();
  const { year, month, day } = getWibDateParts(now);
  const printedAt = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;

  const periodRange = placement
    ? `${formatWibDate(placement.period.startDate)} s.d. ${formatWibDate(placement.period.endDate)}`
    : "-";

  const reportDateRange =
    validFrom && validTo
      ? `${validFrom} s.d. ${validTo}`
      : validFrom
        ? `Dari ${validFrom}`
        : validTo
          ? `s.d. ${validTo}`
          : "Semua tanggal";

  const picMentor =
    placement?.division?.mentors?.[0]?.user?.name ?? "";

  let logoBase64: string | undefined;
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    if (fs.existsSync(logoPath)) {
      logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`;
    }
  } catch {
    // Abaikan jika gagal membaca logo
  }

  const data: PdfReportData = {
    studentName: student.user.name,
    studentNis: student.nis ?? "",
    schoolName: student.schoolName,
    major: student.major ?? "",
    className: student.className ?? "",
    phone: student.phone ?? "",
    divisionName: placement?.division?.name ?? "-",
    periodName: placement?.period?.name ?? "-",
    periodRange,
    workSchedule: placement
      ? `${placement.workStart} – ${placement.workEnd} WIB`
      : "-",
    reportDateRange,
    picMentorName: picMentor,
    attendance,
    logs: logRows,
    printedAt,
    logoBase64,
  };

  // ── Render PDF ─────────────────────────────────────────────────────────
  const buffer = await renderToBuffer(ReportDocument({ data }));

  const safeName = student.user.name.replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "_");
  const filename = `Laporan_PKL_${safeName}_${printedAt.replace(/\//g, "-")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
