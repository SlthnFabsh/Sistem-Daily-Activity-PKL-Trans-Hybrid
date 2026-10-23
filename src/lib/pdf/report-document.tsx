/* eslint-disable jsx-a11y/alt-text */
// Template dokumen PDF laporan PKL menggunakan @react-pdf/renderer.
// File ini berjalan di server (route handler) — tidak ada browser API.
//
// Prinsip desain:
// - Kertas A4 portrait, margin lega, tipografi kecil namun terbaca.
// - Monokrom (tinta gelap + abu-abu) dengan satu aksen navy yang dipakai hemat.
// - Tanpa blok warna mencolok, tanpa ornamen berlebihan.
// - Kehadiran dan jurnal aktivitas disatukan per tanggal.

import React from "react";
import {
  Document,
  type DocumentProps,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  PDF_ADDRESS_LINE_1,
  PDF_ADDRESS_LINE_2,
  PDF_ADDRESS_LINE_3,
  PDF_CLOSING_TEXT,
  PDF_COMPANY_NAME,
  PDF_EMAIL,
  PDF_FAX,
  PDF_PHONE,
  PDF_REPORT_TITLE,
  PDF_SIGNER_1_LABEL,
  PDF_SIGNER_2_LABEL,
  PDF_WEBSITE,
} from "@/lib/pdf-constants";

// Jangan memenggal kata dengan tanda hubung; teks Indonesia lebih nyaman
// dibaca apa adanya (pemenggalan hanya di spasi).
Font.registerHyphenationCallback((word) => [word]);

// ─── Palet & ukuran ──────────────────────────────────────
const INK = "#111827"; // teks utama
const MUTED = "#6B7280"; // teks sekunder
const BORDER = "#D1D5DB"; // garis tabel
const SOFT = "#F3F4F6"; // latar header tabel
const ACCENT = "#1E3A8A"; // navy, dipakai sangat sedikit
const LINK = "#1F5FBF"; // biru kop: garis bawah & email

const PAGE_MARGIN_X = 48;

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: INK,
    paddingTop: 42,
    paddingBottom: 56,
    paddingHorizontal: PAGE_MARGIN_X,
    lineHeight: 1.45,
  },

  // ── Kop surat ──
  letterhead: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingBottom: 2,
  },
  letterheadLeft: {
    width: "28%",
  },
  logo: {
    width: 74,
    height: 40,
    objectFit: "cover",
    objectPosition: "center",
    marginBottom: 4,
  },
  companyName: {
    fontFamily: "Times-Bold",
    fontSize: 9,
    color: INK,
  },
  companyDetail: {
    fontFamily: "Times-Roman",
    fontSize: 8,
    color: INK,
    lineHeight: 1.28,
  },
  letterheadCenter: {
    width: "30%",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 13,
  },
  contactLabel: {
    width: 34,
    fontFamily: "Times-Roman",
    fontSize: 8,
    color: INK,
  },
  contactColon: {
    width: 7,
    fontFamily: "Times-Roman",
    fontSize: 8,
    color: INK,
  },
  contactValue: {
    flex: 1,
    fontFamily: "Times-Roman",
    fontSize: 8,
    color: INK,
  },
  contactLink: {
    color: LINK,
    textDecoration: "underline",
  },
  letterheadRight: {
    width: "22%",
    marginLeft: "auto",
    alignItems: "flex-end",
  },
  isoLogo: {
    width: 72,
    height: 71,
    objectFit: "contain",
  },
  website: {
    fontFamily: "Times-Roman",
    fontSize: 8,
    color: INK,
    marginTop: 3,
    textAlign: "right",
  },
  letterheadRule: {
    alignSelf: "flex-end",
    width: "45%",
    borderTopWidth: 1.2,
    borderTopColor: LINK,
    marginTop: 2,
  },

  // ── Judul ──
  titleBlock: {
    marginTop: 18,
    alignItems: "center",
  },
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    letterSpacing: 1.1,
    textAlign: "center",
    color: INK,
  },
  subtitle: {
    fontSize: 8.5,
    color: MUTED,
    textAlign: "center",
    marginTop: 4,
  },
  titleRule: {
    width: 46,
    height: 2,
    backgroundColor: ACCENT,
    marginTop: 9,
  },

  // ── Judul bagian ──
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.4,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: ACCENT,
    borderBottomWidth: 0.8,
    borderBottomColor: BORDER,
    paddingBottom: 3,
    marginTop: 16,
    marginBottom: 7,
  },

  // ── Tabel identitas (2 kolom) ──
  infoTable: {
    flexDirection: "row",
    borderTopWidth: 0.8,
    borderBottomWidth: 0.8,
    borderColor: BORDER,
  },
  infoColumn: {
    flex: 1,
    paddingRight: 12,
  },
  infoColumnRight: {
    flex: 1,
    paddingLeft: 12,
    borderLeftWidth: 0.8,
    borderLeftColor: BORDER,
  },
  infoRow: {
    flexDirection: "row",
    paddingVertical: 2.6,
  },
  infoLabel: {
    width: 82,
    fontSize: 7.6,
    color: MUTED,
  },
  infoColon: {
    width: 8,
    fontSize: 7.6,
    color: MUTED,
  },
  infoValue: {
    flex: 1,
    fontSize: 8.2,
    color: INK,
  },
  infoValueStrong: {
    flex: 1,
    fontSize: 8.2,
    fontFamily: "Helvetica-Bold",
    color: INK,
  },

  // ── Rekap kehadiran ──
  recap: {
    borderWidth: 0.8,
    borderColor: BORDER,
  },
  recapHead: {
    flexDirection: "row",
    backgroundColor: SOFT,
    borderBottomWidth: 0.8,
    borderBottomColor: BORDER,
  },
  recapRow: {
    flexDirection: "row",
  },
  recapCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 5,
    borderRightWidth: 0.8,
    borderRightColor: BORDER,
  },
  recapCellLast: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 5,
  },
  recapLabel: {
    fontSize: 7,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: MUTED,
  },
  recapValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: INK,
    marginTop: 1,
  },
  recapNote: {
    fontSize: 7,
    color: MUTED,
    fontStyle: "italic",
    marginTop: 3,
  },

  // ── Grup per tanggal ──
  dayGroup: {
    marginTop: 9,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: SOFT,
    borderTopWidth: 0.8,
    borderBottomWidth: 0.8,
    borderColor: BORDER,
    paddingVertical: 4,
    paddingHorizontal: 5,
  },
  dayDate: {
    width: "52%",
    fontFamily: "Helvetica-Bold",
    fontSize: 8.6,
    color: INK,
  },
  dayMeta: {
    width: "48%",
    fontSize: 7.6,
    color: INK,
    textAlign: "right",
  },
  dayMetaStrong: {
    fontFamily: "Helvetica-Bold",
  },
  dayMetaMuted: {
    color: MUTED,
  },
  dayEmpty: {
    fontSize: 7.6,
    color: MUTED,
    fontStyle: "italic",
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },

  // ── Tabel jurnal ──
  table: {
    borderBottomWidth: 0.8,
    borderColor: BORDER,
  },
  thRow: {
    flexDirection: "row",
    backgroundColor: SOFT,
    borderBottomWidth: 0.8,
    borderBottomColor: BORDER,
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  trLast: {
    flexDirection: "row",
  },
  th: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    letterSpacing: 0.25,
    textTransform: "uppercase",
    color: INK,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  td: {
    fontSize: 7.6,
    color: INK,
    paddingVertical: 3.6,
    paddingHorizontal: 4,
  },
  tdMuted: {
    fontSize: 7.6,
    color: MUTED,
    paddingVertical: 3.6,
    paddingHorizontal: 4,
  },
  tdSub: {
    fontSize: 7,
    color: MUTED,
    marginTop: 1,
  },
  emptyBox: {
    borderWidth: 0.8,
    borderColor: BORDER,
    padding: 8,
  },
  emptyText: {
    fontSize: 7.8,
    color: MUTED,
    fontStyle: "italic",
  },

  // Lebar kolom jurnal (tanpa kolom tanggal — tanggal ada di header grup)
  cNo: { width: 24 },
  cTime: { width: 56 },
  cDesc: { flex: 1 },
  cOutput: { width: 100 },
  cFiles: { width: 76 },

  // ── Penutup & tanda tangan ──
  closing: {
    marginTop: 16,
    fontSize: 8,
    color: INK,
    textAlign: "justify",
    lineHeight: 1.5,
  },
  signatureBlock: {
    marginTop: 18,
  },
  signatureDate: {
    fontSize: 8.4,
    color: INK,
    textAlign: "right",
    marginBottom: 12,
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBox: {
    width: "44%",
  },
  signatureRole: {
    fontSize: 8.4,
    color: INK,
  },
  signatureLine: {
    width: 168,
    borderTopWidth: 0.8,
    borderTopColor: INK,
    marginTop: 46,
    marginBottom: 3,
  },
  signatureName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.6,
    color: INK,
  },

  // ── Footer & header halaman lanjutan ──
  footerLeft: {
    position: "absolute",
    top: 800,
    left: PAGE_MARGIN_X,
    fontSize: 7,
    color: MUTED,
  },
  footerRight: {
    position: "absolute",
    top: 800,
    right: PAGE_MARGIN_X,
    fontSize: 7,
    color: MUTED,
    textAlign: "right",
  },
  footerRule: {
    position: "absolute",
    top: 792,
    left: PAGE_MARGIN_X,
    right: PAGE_MARGIN_X,
    borderTopWidth: 0.8,
    borderTopColor: BORDER,
  },
  runningHeaderLeft: {
    position: "absolute",
    top: 22,
    left: PAGE_MARGIN_X,
    fontSize: 7,
    color: MUTED,
  },
  runningHeaderRight: {
    position: "absolute",
    top: 22,
    right: PAGE_MARGIN_X,
    fontSize: 7,
    color: MUTED,
    textAlign: "right",
  },
});

// ─── Tipe data ───────────────────────────────────────────

export type PdfAttendanceSummary = {
  hadir: number;
  izin: number;
  sakit: number;
  total: number;
};

export type PdfLogRow = {
  no: number;
  startTime: string;
  endTime: string;
  taskFrom: string;
  description: string;
  output: string;
  fileNames: string; // nama file dipisah koma
};

export type PdfDayEntry = {
  date: string;
  status: string;
  checkIn: string;
  checkOut: string;
  note: string;
  journalOnly: boolean;
  logs: PdfLogRow[];
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
  days: PdfDayEntry[];
  logCount: number;
  // Tanggal cetak
  printedAt: string; // dd/mm/yyyy
  printedAtLong: string; // 19 Oktober 2026
  // Logo perusahaan base64 (opsional)
  logoBase64?: string;
  // Logo ISO 9001:2015 base64 (opsional)
  isoLogoBase64?: string;
};

// ─── Sub-komponen ────────────────────────────────────────

function InfoRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoColon}>:</Text>
      <Text style={strong ? s.infoValueStrong : s.infoValue}>
        {value || "-"}
      </Text>
    </View>
  );
}

function JournalHeader() {
  return (
    <View style={s.thRow}>
      <View style={s.cNo}>
        <Text style={s.th}>No</Text>
      </View>
      <View style={s.cTime}>
        <Text style={s.th}>Jam</Text>
      </View>
      <View style={s.cDesc}>
        <Text style={s.th}>Uraian Kegiatan</Text>
      </View>
      <View style={s.cOutput}>
        <Text style={s.th}>Hasil</Text>
      </View>
      <View style={s.cFiles}>
        <Text style={s.th}>Lampiran</Text>
      </View>
    </View>
  );
}

function JournalRow({ row, last }: { row: PdfLogRow; last: boolean }) {
  return (
    <View style={last ? s.trLast : s.tr} wrap={false}>
      <View style={s.cNo}>
        <Text style={s.td}>{row.no}</Text>
      </View>
      <View style={s.cTime}>
        <Text style={s.td}>
          {row.startTime}–{row.endTime}
        </Text>
      </View>
      <View style={s.cDesc}>
        <Text style={s.td}>{row.description}</Text>
        {row.taskFrom ? (
          <Text style={s.tdSub}>Pemberi tugas: {row.taskFrom}</Text>
        ) : null}
      </View>
      <View style={s.cOutput}>
        {row.output ? (
          <Text style={s.td}>{row.output}</Text>
        ) : (
          <Text style={s.tdMuted}>–</Text>
        )}
      </View>
      <View style={s.cFiles}>
        {row.fileNames ? (
          <Text style={s.td}>{row.fileNames}</Text>
        ) : (
          <Text style={s.tdMuted}>–</Text>
        )}
      </View>
    </View>
  );
}

function DayGroup({ day }: { day: PdfDayEntry }) {
  const timeText =
    day.checkIn || day.checkOut
      ? `${day.checkIn || "–"} – ${day.checkOut || "–"}`
      : "";

  return (
    <View style={s.dayGroup} wrap={false}>
      <View style={s.dayHeader}>
        <Text style={s.dayDate}>{day.date}</Text>
        <Text style={s.dayMeta}>
          <Text style={s.dayMetaStrong}>{day.status}</Text>
          {timeText ? (
            <Text style={s.dayMetaMuted}>{"  ·  " + timeText}</Text>
          ) : null}
          {day.note ? (
            <Text style={s.dayMetaMuted}>{"  ·  " + day.note}</Text>
          ) : null}
        </Text>
      </View>

      {day.logs.length === 0 ? (
        <Text style={s.dayEmpty}>Tidak ada jurnal aktivitas.</Text>
      ) : (
        <View style={s.table}>
          <JournalHeader />
          {day.logs.map((log, i) => (
            <JournalRow
              key={log.no}
              row={log}
              last={i === day.logs.length - 1}
            />
          ))}
        </View>
      )}
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
      subject="Laporan Praktik Kerja Lapangan"
    >
      <Page size="A4" orientation="portrait" style={s.page}>
        {/* Header kecil di halaman lanjutan (halaman 1 kosong) */}
        <Text
          fixed
          style={s.runningHeaderLeft}
          render={({ pageNumber }) =>
            pageNumber > 1 ? PDF_COMPANY_NAME : ""
          }
        />
        <Text
          fixed
          style={s.runningHeaderRight}
          render={({ pageNumber }) =>
            pageNumber > 1
              ? `${data.studentName}  ·  Laporan Praktik Kerja Lapangan`
              : ""
          }
        />

        {/* ── Kop surat ── */}
        <View style={s.letterhead}>
          <View style={s.letterheadLeft}>
            {data.logoBase64 ? (
              <Image src={data.logoBase64} style={s.logo} />
            ) : null}
            <Text style={s.companyName}>{PDF_COMPANY_NAME}</Text>
            <Text style={s.companyDetail}>{PDF_ADDRESS_LINE_1}</Text>
            <Text style={s.companyDetail}>{PDF_ADDRESS_LINE_2}</Text>
            <Text style={s.companyDetail}>{PDF_ADDRESS_LINE_3}</Text>
          </View>

          <View style={s.letterheadCenter}>
            <View style={s.contactRow}>
              <Text style={s.contactLabel}>Phone</Text>
              <Text style={s.contactColon}>:</Text>
              <Text style={s.contactValue}>{PDF_PHONE}</Text>
            </View>
            <View style={s.contactRow}>
              <Text style={s.contactLabel}>Fax</Text>
              <Text style={s.contactColon}>:</Text>
              <Text style={s.contactValue}>{PDF_FAX}</Text>
            </View>
            <View style={s.contactRow}>
              <Text style={s.contactLabel}>Email</Text>
              <Text style={s.contactColon}>:</Text>
              <Text style={[s.contactValue, s.contactLink]}>
                {PDF_EMAIL}
              </Text>
            </View>
          </View>

          <View style={s.letterheadRight}>
            {data.isoLogoBase64 ? (
              <Image src={data.isoLogoBase64} style={s.isoLogo} />
            ) : null}
            <Text style={s.website}>{PDF_WEBSITE}</Text>
          </View>
        </View>
        <View style={s.letterheadRule} />

        {/* ── Judul ── */}
        <View style={s.titleBlock}>
          <Text style={s.title}>{PDF_REPORT_TITLE.toUpperCase()}</Text>
          <Text style={s.subtitle}>
            {data.periodName} · {data.periodRange}
          </Text>
          <View style={s.titleRule} />
        </View>

        {/* ── A. Identitas ── */}
        <Text style={s.sectionTitle}>A. Data Peserta &amp; Penempatan</Text>
        <View style={s.infoTable}>
          <View style={s.infoColumn}>
            <InfoRow label="Nama Siswa" value={data.studentName} strong />
            <InfoRow label="NIS" value={data.studentNis} />
            <InfoRow label="Sekolah" value={data.schoolName} />
            <InfoRow label="Jurusan" value={data.major} />
            <InfoRow label="Kelas" value={data.className} />
            <InfoRow label="No. HP" value={data.phone} />
          </View>
          <View style={s.infoColumnRight}>
            <InfoRow label="Divisi" value={data.divisionName} strong />
            <InfoRow label="Periode PKL" value={data.periodName} />
            <InfoRow label="Rentang Periode" value={data.periodRange} />
            <InfoRow label="Jam Kerja" value={data.workSchedule} />
            <InfoRow label="Rentang Laporan" value={data.reportDateRange} />
          </View>
        </View>

        {/* ── B. Rekap absensi ── */}
        <Text style={s.sectionTitle}>B. Rekapitulasi Kehadiran</Text>
        <View style={s.recap}>
          <View style={s.recapHead}>
            <View style={s.recapCell}>
              <Text style={s.recapLabel}>Hadir</Text>
            </View>
            <View style={s.recapCell}>
              <Text style={s.recapLabel}>Izin</Text>
            </View>
            <View style={s.recapCell}>
              <Text style={s.recapLabel}>Sakit</Text>
            </View>
            <View style={s.recapCellLast}>
              <Text style={s.recapLabel}>Total Hari</Text>
            </View>
          </View>
          <View style={s.recapRow}>
            <View style={s.recapCell}>
              <Text style={s.recapValue}>{data.attendance.hadir}</Text>
            </View>
            <View style={s.recapCell}>
              <Text style={s.recapValue}>{data.attendance.izin}</Text>
            </View>
            <View style={s.recapCell}>
              <Text style={s.recapValue}>{data.attendance.sakit}</Text>
            </View>
            <View style={s.recapCellLast}>
              <Text style={s.recapValue}>{data.attendance.total}</Text>
            </View>
          </View>
        </View>
        <Text style={s.recapNote}>
          Hadir termasuk keterlambatan dan hari dengan jurnal aktivitas tanpa
          data absensi.
        </Text>

        {/* ── C. Rincian kehadiran & jurnal per tanggal ── */}
        <Text style={s.sectionTitle} minPresenceAhead={90}>
          C. Rincian Kehadiran &amp; Jurnal Aktivitas ({data.logCount} kegiatan)
        </Text>
        {data.days.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>
              Belum ada data kehadiran maupun jurnal aktivitas pada rentang
              tanggal ini.
            </Text>
          </View>
        ) : (
          data.days.map((day) => <DayGroup key={day.date} day={day} />)
        )}

        {/* ── Penutup & tanda tangan ── */}
        <View wrap={false}>
          <Text style={s.closing}>{PDF_CLOSING_TEXT}</Text>

          <View style={s.signatureBlock}>
            <Text style={s.signatureDate}>
              Jakarta, {data.printedAtLong}
            </Text>
            <View style={s.signatureRow}>
              <View style={s.signatureBox}>
                <Text style={s.signatureRole}>{PDF_SIGNER_1_LABEL}</Text>
                <View style={s.signatureLine} />
                {data.picMentorName ? (
                  <Text style={s.signatureName}>{data.picMentorName}</Text>
                ) : null}
              </View>
              <View style={s.signatureBox}>
                <Text style={s.signatureRole}>{PDF_SIGNER_2_LABEL}</Text>
                <View style={s.signatureLine} />
              </View>
            </View>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={s.footerRule} fixed />
        <Text style={s.footerLeft} fixed>
          {PDF_COMPANY_NAME} · Laporan Praktik Kerja Lapangan
        </Text>
        <Text
          style={s.footerRight}
          fixed
          render={({ pageNumber, totalPages }) =>
            `Halaman ${pageNumber} dari ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}
