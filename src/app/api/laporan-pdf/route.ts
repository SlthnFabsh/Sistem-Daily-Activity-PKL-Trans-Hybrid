import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import * as fs from "node:fs";
import * as path from "node:path";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import {
  formatWibDate,
  formatWibLongDate,
  formatWibTime,
  getWibDateParts,
} from "@/lib/time";
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
  // HRD & SUPERADMIN: akses semua, tidak perlu cek tambahan

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
          orderBy: { attDate: "asc" },
        })
      : Promise.resolve([]),
  ]);

  // ── Kelompokkan kehadiran & jurnal per tanggal ─────────────────────────
  const statusLabels: Record<string, string> = {
    HADIR: "Hadir",
    TERLAMBAT: "Terlambat",
    IZIN: "Izin",
    SAKIT: "Sakit",
  };

  const dateKey = (date: Date) => date.toISOString().slice(0, 10);

  const attendanceByDate = new Map<
    string,
    (typeof attendances)[number]
  >();
  for (const a of attendances) {
    attendanceByDate.set(dateKey(a.attDate), a);
  }

  const logsByDate = new Map<string, (typeof logs)[number][]>();
  for (const l of logs) {
    const key = dateKey(l.logDate);
    const bucket = logsByDate.get(key);
    if (bucket) bucket.push(l);
    else logsByDate.set(key, [l]);
  }

  const dateKeys = [
    ...new Set([...attendanceByDate.keys(), ...logsByDate.keys()]),
  ].sort();

  let logNo = 0;
  const days = dateKeys.map((key) => {
    const att = attendanceByDate.get(key);
    const dayLogs = (logsByDate.get(key) ?? []).map((l) => ({
      no: ++logNo,
      startTime: l.startTime,
      endTime: l.endTime,
      taskFrom: l.taskFrom,
      description: l.description,
      output: l.output ?? "",
      fileNames: l.attachments.map((a) => a.fileName).join(", "),
    }));

    return {
      date: formatWibDate(new Date(`${key}T00:00:00.000Z`)),
      status: att ? (statusLabels[att.status] ?? att.status) : "Hadir",
      checkIn: att?.checkIn ? formatWibTime(att.checkIn) : "",
      checkOut: att?.checkOut ? formatWibTime(att.checkOut) : "",
      note: att
        ? [att.note, att.earlyLeave ? "Pulang lebih awal" : ""]
            .filter(Boolean)
            .join(" · ")
        : "Berdasarkan jurnal aktivitas",
      journalOnly: !att,
      logs: dayLogs,
    };
  });

  // ── Rekap kehadiran ────────────────────────────────────────────────────
  // Hari yang hanya punya jurnal (mis. hasil impor Excel) tetap dihitung hadir.
  const journalOnlyDays = dateKeys.filter(
    (key) => !attendanceByDate.has(key)
  ).length;
  const hadir =
    attendances.filter(
      (a) => a.status === "HADIR" || a.status === "TERLAMBAT"
    ).length + journalOnlyDays;
  const izin = attendances.filter((a) => a.status === "IZIN").length;
  const sakit = attendances.filter((a) => a.status === "SAKIT").length;

  const attendance = {
    hadir,
    izin,
    sakit,
    total: hadir + izin + sakit,
  };

  // ── Tanggal cetak (WIB) ────────────────────────────────────────────────
  const now = new Date();
  const { year, month, day } = getWibDateParts(now);
  const printedAt = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
  const printedAtLong = formatWibLongDate(now);

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

  const readPublicImage = (filename: string) => {
    try {
      const imagePath = path.join(process.cwd(), "public", filename);
      if (!fs.existsSync(imagePath)) return undefined;
      return `data:image/png;base64,${fs.readFileSync(imagePath).toString("base64")}`;
    } catch {
      // Abaikan jika gagal membaca gambar
      return undefined;
    }
  };

  const logoBase64 = readPublicImage("logo.png");
  const isoLogoBase64 = readPublicImage("ISO.png");

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
    days,
    logCount: logs.length,
    printedAt,
    printedAtLong,
    logoBase64,
    isoLogoBase64,
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
