import * as fs from "node:fs";
import * as path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReportDocument } from "../src/lib/pdf/report-document";
import type { PdfReportData } from "../src/lib/pdf/report-document";
import * as cp from "node:child_process";

const read = (name: string) =>
  `data:image/png;base64,${fs
    .readFileSync(path.join(process.cwd(), "public", name))
    .toString("base64")}`;

const data: PdfReportData = {
  studentName: "Testing",
  studentNis: "111111111111111",
  schoolName: "SMK TARUNA BHAKTI",
  major: "RPL",
  className: "XII RPL 5",
  phone: "08123456788982",
  divisionName: "Divisi Administrasi",
  periodName: "Periode PKL 2026/2027",
  periodRange: "Rabu, 01 Juli 2026 s.d. Rabu, 30 Juni 2027",
  workSchedule: "08:00 – 17:00 WIB",
  reportDateRange: "Semua tanggal",
  picMentorName: "Budi Santoso",
  attendance: { hadir: 3, izin: 0, sakit: 0, total: 3 },
  days: [],
  logCount: 0,
  printedAt: "22/10/2026",
  printedAtLong: "22 Oktober 2026",
  logoBase64: read("logo.png"),
  isoLogoBase64: read("ISO.png"),
};

async function run() {
  const buffer = await renderToBuffer(ReportDocument({ data }));
  fs.writeFileSync("test-final.pdf", buffer);
  cp.execSync('python -c "import pymupdf; d=pymupdf.open(\'test-final.pdf\'); d[0].get_pixmap(dpi=150).save(\'test-final.png\')"');
  console.log("Generated test-final.png successfully");
}

run();
