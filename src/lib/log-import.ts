import { read, utils, type WorkBook, type WorkSheet } from "xlsx";
import { prisma } from "@/lib/db";
import { isDateInPeriod } from "@/lib/attendance";
import { importLogRowSchema } from "@/lib/validations";
import type { ImportResult, ImportRowResult } from "@/lib/action-result";

const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // 5 MB

function normalizeKey(key: string): string | undefined {
  const clean = key.trim().toLowerCase().replace(/[\s_-]+/g, "");
  const map: Record<string, string> = {
    tanggal: "logDate",
    tgl: "logDate",
    date: "logDate",
    logdate: "logDate",
    jammulai: "startTime",
    mulai: "startTime",
    starttime: "startTime",
    jamselesai: "endTime",
    selesai: "endTime",
    endtime: "endTime",
    pemberitugas: "taskFrom",
    pemberi: "taskFrom",
    pembimbing: "taskFrom",
    taskfrom: "taskFrom",
    uraiankegiatan: "description",
    kegiatan: "description",
    deskripsi: "description",
    aktivitas: "description",
    description: "description",
    uraian: "description",
    hasil: "output",
    output: "output",
    hasilkegiatan: "output",
    hambatan: "obstacle",
    kendala: "obstacle",
    obstacle: "obstacle",
    masalah: "obstacle",
  };
  return map[clean];
}

export function parseExcelDate(val: unknown): string | null {
  if (val == null || val === "") return null;
  if (val instanceof Date) {
    if (Number.isNaN(val.getTime())) return null;
    return val.toISOString().slice(0, 10);
  }
  if (typeof val === "number") {
    // Serial date Excel
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  }
  const str = String(val).trim();
  // YYYY-MM-DD atau YYYY/MM/DD
  const ymd = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // DD-MM-YYYY atau DD/MM/YYYY
  const dmy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

export function parseExcelTime(val: unknown, fallback: string): string {
  if (val == null || val === "") return fallback;
  if (typeof val === "number") {
    if (val >= 0 && val < 1) {
      const totalMinutes = Math.round(val * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
  }
  const str = String(val).trim();
  const match = str.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const [, h, m] = match;
    return `${h.padStart(2, "0")}:${m}`;
  }
  return fallback;
}

function stringify(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function failImport(message: string): ImportResult {
  return { ok: false, message, imported: 0, failed: 0, rows: [] };
}

export async function processLogExcelImport({
  file,
  placementId,
  period,
  startDateFilter,
  endDateFilter,
}: {
  file: File;
  placementId: string;
  period: { startDate: Date; endDate: Date };
  startDateFilter?: string;
  endDateFilter?: string;
}): Promise<ImportResult> {
  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    return failImport("Format file harus .xlsx atau .xls.");
  }
  if (file.size > MAX_IMPORT_BYTES) {
    return failImport("Ukuran file maksimal 5 MB.");
  }

  let workbook: WorkBook;
  let sheet: WorkSheet;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    workbook = read(buffer, { type: "buffer", cellDates: true });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) throw new Error("Kosong");
    sheet = workbook.Sheets[firstSheet];
  } catch {
    return failImport("Gagal membaca file Excel. Pastikan formatnya benar.");
  }

  const rawRows = utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
  if (rawRows.length === 0) {
    return failImport("File Excel tidak berisi data baris log aktivitas.");
  }

  const rows: ImportRowResult[] = [];
  let imported = 0;
  let failed = 0;

  for (const [index, raw] of rawRows.entries()) {
    const rowNumber = index + 2; // Baris 1 adalah header

    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      const target = normalizeKey(key);
      if (target) {
        if (target === "logDate") {
          normalized[target] = parseExcelDate(value);
        } else if (target === "startTime") {
          normalized[target] = parseExcelTime(value, "08:00");
        } else if (target === "endTime") {
          normalized[target] = parseExcelTime(value, "16:00");
        } else {
          normalized[target] = stringify(value);
        }
      }
    }

    const logDateStr = typeof normalized.logDate === "string" ? normalized.logDate : "";
    if (!logDateStr) {
      failed += 1;
      rows.push({
        row: rowNumber,
        name: `Baris ${rowNumber}`,
        ok: false,
        error: "Kolom tanggal kosong atau formatnya tidak dikenali.",
      });
      continue;
    }

    // Filter tanggal mulai impor jika ditentukan pengguna (misal dari Agustus)
    if (startDateFilter && logDateStr < startDateFilter) {
      // Lewati baris sebelum tanggal mulai impor
      continue;
    }
    if (endDateFilter && logDateStr > endDateFilter) {
      // Lewati baris setelah batas tanggal
      continue;
    }

    // Default jam jika kosong
    if (!normalized.startTime) normalized.startTime = "08:00";
    if (!normalized.endTime) normalized.endTime = "16:00";

    const parsed = importLogRowSchema.safeParse(normalized);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Data tidak valid.";
      failed += 1;
      rows.push({
        row: rowNumber,
        name: `${logDateStr} (${stringify(normalized.taskFrom) || "Log"})`,
        ok: false,
        error: firstError,
      });
      continue;
    }

    const data = parsed.data;
    const logDateObj = new Date(`${data.logDate}T00:00:00.000Z`);

    if (!isDateInPeriod(logDateObj, period)) {
      failed += 1;
      rows.push({
        row: rowNumber,
        name: `${data.logDate} (${data.taskFrom})`,
        ok: false,
        error: "Tanggal di luar rentang periode PKL penempatan.",
      });
      continue;
    }

    // Simpan ke database dengan status SUBMITTED agar langsung masuk laporan PDF
    await prisma.activityLog.create({
      data: {
        placementId,
        logDate: logDateObj,
        startTime: data.startTime,
        endTime: data.endTime,
        taskFrom: data.taskFrom,
        description: data.description,
        output: data.output || null,
        obstacle: data.obstacle || null,
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
    });

    imported += 1;
    rows.push({
      row: rowNumber,
      name: `${data.logDate} – ${data.taskFrom}`,
      ok: true,
    });
  }

  const message =
    imported === 0 && failed === 0
      ? "Tidak ada baris yang sesuai dengan kriteria tanggal impor."
      : `Selesai: ${imported} log berhasil diimpor (status Terkirim), ${failed} gagal.`;

  return {
    ok: imported > 0,
    message,
    imported,
    failed,
    rows,
  };
}
