import { mkdirSync } from "node:fs";
import * as path from "node:path";
import { utils, writeFile } from "xlsx";

// Membuat contoh file Excel untuk uji impor siswa di area HRD.
// Menghasilkan: public/contoh-import-siswa.xlsx
const rows = [
  {
    Nama: "Budi Santoso",
    Email: "budi.santoso@contoh.sch.id",
    NIS: "12345",
    Sekolah: "SMK Negeri 1 Jakarta",
    Jurusan: "RPL",
    Kelas: "XII RPL 2",
    Telepon: "0812-0000-1111",
  },
  {
    Nama: "Siti Rahayu",
    Email: "siti.rahayu@contoh.sch.id",
    NIS: "12346",
    Sekolah: "SMK Tunas Karya",
    Jurusan: "AKL",
    Kelas: "XII AKL 1",
    Telepon: "0813-0000-2222",
  },
  {
    Nama: "Rizky Maulana",
    Email: "rizky.maulana@contoh.sch.id",
    NIS: "12347",
    Sekolah: "SMK Negeri 2 Bandung",
    Jurusan: "TKJ",
    Kelas: "XI TKJ 3",
    Telepon: "0856-0000-3333",
  },
  // Baris sengaja salah: email kosong -> akan tercatat sebagai "Gagal".
  {
    Nama: "Contoh Baris Gagal",
    Email: "",
    NIS: "99999",
    Sekolah: "SMK Contoh",
    Jurusan: "RPL",
    Kelas: "XII RPL 1",
    Telepon: "0878-0000-9999",
  },
];

function main() {
  const ws = utils.json_to_sheet(rows);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Data Siswa");

  const publicDir = path.join(process.cwd(), "public");
  mkdirSync(publicDir, { recursive: true });
  const target = path.join(publicDir, "contoh-import-siswa.xlsx");
  writeFile(wb, target, { compression: true });
  console.log(`Contoh file Excel dibuat: ${target}`);
}

main();