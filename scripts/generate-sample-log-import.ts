import { mkdirSync } from "node:fs";
import * as path from "node:path";
import { utils, writeFile } from "xlsx";

// Membuat contoh file Excel untuk uji impor log aktivitas PKL.
// Menghasilkan: public/contoh-import-log.xlsx
const rows = [
  {
    Tanggal: "2026-08-03",
    "Jam Mulai": "08:00",
    "Jam Selesai": "16:00",
    "Pemberi Tugas": "Budi Santoso",
    "Uraian Kegiatan": "Pengenalan lingkungan kerja, perkenalan staf divisi, dan briefing SOP kerja PKL.",
    Hasil: "Memahami alur koordinasi dan jadwal kerja harian.",
    Hambatan: "",
  },
  {
    Tanggal: "2026-08-04",
    "Jam Mulai": "08:00",
    "Jam Selesai": "16:00",
    "Pemberi Tugas": "Budi Santoso",
    "Uraian Kegiatan": "Pembuatan dan crimping kabel jaringan UTP Cat6 dengan konektor RJ45 serta pengujian LAN tester.",
    Hasil: "10 kabel jaringan berhasil dibuat dan lulus uji koneksi.",
    Hambatan: "Satu konektor pin 3 sempat tidak tersambung dengan baik dan sudah diperbaiki.",
  },
  {
    Tanggal: "2026-08-05",
    "Jam Mulai": "08:00",
    "Jam Selesai": "16:00",
    "Pemberi Tugas": "Budi Santoso",
    "Uraian Kegiatan": "Konfigurasi dasar switch layer 2 (VLAN dan port trunking) untuk jaringan kantor.",
    Hasil: "VLAN 10 dan VLAN 20 berhasil dibuat dan terhubung ke router.",
    Hambatan: "",
  },
  {
    Tanggal: "2026-08-06",
    "Jam Mulai": "08:00",
    "Jam Selesai": "16:00",
    "Pemberi Tugas": "Budi Santoso",
    "Uraian Kegiatan": "Inventarisasi perangkat jaringan dan dokumentasi topologi server room.",
    Hasil: "Daftar aset switch, router, dan access point tercatat lengkap.",
    Hambatan: "",
  },
];

function main() {
  const ws = utils.json_to_sheet(rows);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Log Aktivitas");

  const publicDir = path.join(process.cwd(), "public");
  mkdirSync(publicDir, { recursive: true });
  const target = path.join(publicDir, "contoh-import-log.xlsx");
  writeFile(wb, target, { compression: true });
  console.log(`Contoh file Excel log dibuat: ${target}`);
}

main();
