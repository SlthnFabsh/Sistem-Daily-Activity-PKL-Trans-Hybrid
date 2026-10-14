// Template dokumen PDF laporan PKL menggunakan @react-pdf/renderer.
// File ini berjalan di server (route handler) — tidak ada browser API.
// Komponen React di sini menggunakan primitif PDF (View, Text, Page, Document)
// bukan elemen HTML.

import React from "react";
import {
  Document,
  type DocumentProps,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  PDF_ADDRESS_LINE_1,
  PDF_ADDRESS_LINE_2,
  PDF_CLOSING_TEXT,
  PDF_COMPANY_NAME,
  PDF_EMAIL,
  PDF_PHONE,
  PDF_REPORT_TITLE,
  PDF_SIGNER_1_LABEL,
  PDF_SIGNER_2_LABEL,
} from "@/lib/pdf-constants";

// ─── Warna & ukuran ─────────────────────────────────────
const PRIMARY = "#0B5CE5";
const BORDER = "#E2E8F0";
const TEXT_MAIN = "#0F172A";
const TEXT_MUTED = "#475569";
const HEADER_BG = "#EAF1FF";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: TEXT_MAIN,
    paddingTop: 36,
    paddingBottom: 56,
    paddingHorizontal: 40,
    lineHeight: 1.5,
  },
  // ── Kop ──
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: PRIMARY,
    paddingBottom: 10,
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 55,
    height: 55,
    objectFit: "contain",
  },
  companyName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
  },
  companyDetail: {
    fontSize: 8,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  reportTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
    textAlign: "right",
    marginTop: 2,
  },
  // ── Section heading ──
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    backgroundColor: HEADER_BG,
    color: PRIMARY,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginTop: 12,
    marginBottom: 6,
  },
  // ── Info grid (label: value) ──
  infoRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  infoLabel: {
    width: 130,
    color: TEXT_MUTED,
  },
  infoColon: {
    width: 10,
    color: TEXT_MUTED,
  },
  infoValue: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
  },
  // ── Rekap absensi ──
  recapGrid: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  recapBox: {
    flex: 1,
    border: `1 solid ${BORDER}`,
    borderRadius: 4,
    padding: 6,
    alignItems: "center",
  },
  recapNum: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
  },
  recapLabel: {
    fontSize: 8,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  // ── Tabel aktivitas ──
  tableHeader: {
    flexDirection: "row",
    backgroundColor: HEADER_BG,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  tableRow: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  tableRowAlt: {
    backgroundColor: "#F8FAFC",
  },
  colNo: { width: 22, paddingHorizontal: 2 },
  colDate: { width: 58, paddingHorizontal: 2 },
  colTime: { width: 42, paddingHorizontal: 2 },
  colTask: { width: 62, paddingHorizontal: 2 },
  colDesc: { flex: 1, paddingHorizontal: 2 },
  colOutput: { width: 72, paddingHorizontal: 2 },
  colFiles: { width: 64, paddingHorizontal: 2 },
  headerCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: PRIMARY,
  },
  cell: { fontSize: 8, color: TEXT_MAIN },
  cellMuted: { fontSize: 8, color: TEXT_MUTED, fontStyle: "italic" },
  // ── Tanda tangan ──
  sigBlock: {
    marginTop: 32,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sigBox: {
    width: "44%",
    alignItems: "center",
  },
  sigLocation: {
    fontSize: 8,
    color: TEXT_MUTED,
    marginBottom: 40,
  },
  sigName: {
    fontFamily: "Helvetica-Bold",
    borderTopWidth: 1,
    borderTopColor: TEXT_MUTED,
    paddingTop: 4,
    width: "80%",
    textAlign: "center",
    fontSize: 9,
  },
  sigRole: {
    fontSize: 8,
    color: TEXT_MUTED,
    marginTop: 1,
  },
  // ── Footer halaman ──
  pageNumber: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: TEXT_MUTED,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 4,
  },
  closingText: {
    marginTop: 16,
    fontSize: 8,
    color: TEXT_MUTED,
    fontStyle: "italic",
  },
});

// ─── Tipe data ───────────────────────────────────────────

export type PdfAttendanceSummary = {
  hadir: number;
  terlambat: number;
  izin: number;
  sakit: number;
  total: number;
};

export type PdfLogRow = {
  no: number;
  date: string;
  startTime: string;
  endTime: string;
  taskFrom: string;
  description: string;
  output: string;
  fileNames: string; // nama file dipisah koma
};

export type PdfReportData = {
  // Identitas siswa
  studentName: string;
  studentNis: string;
  schoolName: string;
  major: string;
  className: string;
  phone: string;
  // Penempatan
  divisionName: string;
  periodName: string;
  periodRange: string;
  workSchedule: string;
  // Filter laporan
  reportDateRange: string;
  // Penanda tangan
  picMentorName: string;
  // Data
  attendance: PdfAttendanceSummary;
  logs: PdfLogRow[];
  // Tanggal cetak
  printedAt: string;
  // Logo perusahaan base64 (opsional)
  logoBase64?: string;
};

// ─── Sub-komponen ────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoColon}>:</Text>
      <Text style={s.infoValue}>{value || "-"}</Text>
    </View>
  );
}

function TableHeader() {
  return (
    <View style={s.tableHeader}>
      <View style={s.colNo}>
        <Text style={s.headerCell}>No.</Text>
      </View>
      <View style={s.colDate}>
        <Text style={s.headerCell}>Tanggal</Text>
      </View>
      <View style={s.colTime}>
        <Text style={s.headerCell}>Jam</Text>
      </View>
      <View style={s.colTask}>
        <Text style={s.headerCell}>Task dari</Text>
      </View>
      <View style={s.colDesc}>
        <Text style={s.headerCell}>Uraian Kegiatan</Text>
      </View>
      <View style={s.colOutput}>
        <Text style={s.headerCell}>Hasil</Text>
      </View>
      <View style={s.colFiles}>
        <Text style={s.headerCell}>Lampiran</Text>
      </View>
    </View>
  );
}

function TableRow({ row, isAlt }: { row: PdfLogRow; isAlt: boolean }) {
  return (
    <View style={[s.tableRow, isAlt ? s.tableRowAlt : undefined]}>
      <View style={s.colNo}>
        <Text style={s.cell}>{row.no}</Text>
      </View>
      <View style={s.colDate}>
        <Text style={s.cell}>{row.date}</Text>
      </View>
      <View style={s.colTime}>
        <Text style={s.cell}>
          {row.startTime}–{row.endTime}
        </Text>
      </View>
      <View style={s.colTask}>
        <Text style={s.cell}>{row.taskFrom}</Text>
      </View>
      <View style={s.colDesc}>
        <Text style={s.cell}>{row.description}</Text>
      </View>
      <View style={s.colOutput}>
        {row.output ? (
          <Text style={s.cell}>{row.output}</Text>
        ) : (
          <Text style={s.cellMuted}>-</Text>
        )}
      </View>
      <View style={s.colFiles}>
        {row.fileNames ? (
          <Text style={s.cell}>{row.fileNames}</Text>
        ) : (
          <Text style={s.cellMuted}>-</Text>
        )}
      </View>
    </View>
  );
}

// ─── Dokumen utama ───────────────────────────────────────

export function ReportDocument({
  data,
}: {
  data: PdfReportData;
}): React.ReactElement<DocumentProps> {
  return (
    <Document
      title={`Laporan PKL – ${data.studentName}`}
      author={PDF_COMPANY_NAME}
      creator={PDF_COMPANY_NAME}
    >
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* ── Kop ── */}
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            {data.logoBase64 ? (
              <Image src={data.logoBase64} style={s.logo} />
            ) : null}
            <View>
              <Text style={s.companyName}>{PDF_COMPANY_NAME}</Text>
              <Text style={s.companyDetail}>{PDF_ADDRESS_LINE_1}</Text>
              {PDF_ADDRESS_LINE_2 ? (
                <Text style={s.companyDetail}>{PDF_ADDRESS_LINE_2}</Text>
              ) : null}
              <Text style={s.companyDetail}>
                Telp: {PDF_PHONE} | Email: {PDF_EMAIL}
              </Text>
            </View>
          </View>
          <View>
            <Text style={s.reportTitle}>{PDF_REPORT_TITLE}</Text>
            <Text
              style={[s.companyDetail, { textAlign: "right", marginTop: 4 }]}
            >
              Dicetak: {data.printedAt}
            </Text>
          </View>
        </View>

        {/* ── Identitas Siswa & Penempatan ── */}
        <Text style={s.sectionTitle}>IDENTITAS SISWA</Text>
        <View style={{ flexDirection: "row", gap: 24 }}>
          <View style={{ flex: 1 }}>
            <InfoRow label="Nama Siswa" value={data.studentName} />
            <InfoRow label="NIS" value={data.studentNis} />
            <InfoRow label="Sekolah" value={data.schoolName} />
            <InfoRow label="Jurusan" value={data.major} />
            <InfoRow label="Kelas" value={data.className} />
            <InfoRow label="No. HP" value={data.phone} />
          </View>
          <View style={{ flex: 1 }}>
            <InfoRow label="Divisi Penempatan" value={data.divisionName} />
            <InfoRow label="Periode PKL" value={data.periodName} />
            <InfoRow label="Rentang Periode" value={data.periodRange} />
            <InfoRow label="Jam Kerja" value={data.workSchedule} />
            <InfoRow label="Rentang Laporan" value={data.reportDateRange} />
          </View>
        </View>

        {/* ── Rekap Absensi ── */}
        <Text style={s.sectionTitle}>REKAP ABSENSI</Text>
        <View style={s.recapGrid}>
          <View style={s.recapBox}>
            <Text style={s.recapNum}>{data.attendance.total}</Text>
            <Text style={s.recapLabel}>Total Hari</Text>
          </View>
          <View style={s.recapBox}>
            <Text style={s.recapNum}>{data.attendance.hadir}</Text>
            <Text style={s.recapLabel}>Hadir</Text>
          </View>
          <View style={s.recapBox}>
            <Text style={s.recapNum}>{data.attendance.terlambat}</Text>
            <Text style={s.recapLabel}>Terlambat</Text>
          </View>
          <View style={s.recapBox}>
            <Text style={s.recapNum}>{data.attendance.izin}</Text>
            <Text style={s.recapLabel}>Izin</Text>
          </View>
          <View style={s.recapBox}>
            <Text style={s.recapNum}>{data.attendance.sakit}</Text>
            <Text style={s.recapLabel}>Sakit</Text>
          </View>
        </View>

        {/* ── Tabel Aktivitas ── */}
        <Text style={s.sectionTitle}>
          LOG AKTIVITAS ({data.logs.length} kegiatan)
        </Text>
        {data.logs.length === 0 ? (
          <Text style={s.cellMuted}>
            Tidak ada log aktivitas terkirim dalam rentang tanggal ini.
          </Text>
        ) : (
          <View>
            <TableHeader />
            {data.logs.map((row, i) => (
              <TableRow key={row.no} row={row} isAlt={i % 2 === 1} />
            ))}
          </View>
        )}

        {/* ── Penutup & Tanda Tangan ── */}
        <Text style={s.closingText}>{PDF_CLOSING_TEXT}</Text>

        <View style={s.sigBlock}>
          <View style={s.sigBox}>
            <Text style={s.sigLocation}>Jakarta, {data.printedAt}</Text>
            <Text style={s.sigName}>{data.picMentorName || "_______________"}</Text>
            <Text style={s.sigRole}>{PDF_SIGNER_1_LABEL}</Text>
          </View>
          <View style={s.sigBox}>
            <Text style={s.sigLocation}>Jakarta, {data.printedAt}</Text>
            <Text style={s.sigName}>_______________</Text>
            <Text style={s.sigRole}>{PDF_SIGNER_2_LABEL}</Text>
          </View>
        </View>

        {/* ── Nomor halaman ── */}
        <Text
          style={s.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `Halaman ${pageNumber} dari ${totalPages} | ${PDF_COMPANY_NAME} – Laporan PKL`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
