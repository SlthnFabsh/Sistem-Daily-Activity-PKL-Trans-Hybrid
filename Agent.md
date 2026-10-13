# AGENTS.md: Sistem Daily Activity PKL Trans Hybrid (versi 4, tanpa proses revisi)

Baca file ini sepenuhnya sebelum menulis kode. File ini adalah sumber kebenaran proyek. Jika permintaan pengguna bertentangan dengan file ini, tanyakan dulu, jangan langsung mengubah cakupan.

## 1. Tujuan

Web app untuk mencatat absensi dan aktivitas harian siswa PKL di Trans Hybrid (sekitar 8 siswa per periode). Siswa mengisi absensi dan log aktivitas serta mengunggah foto/file bukti. Pembimbing dan HRD hanya **meninjau (read-only)** log dan lampiran. **Tidak ada proses persetujuan, penolakan, atau revisi.** Log yang sudah dikirim siswa bersifat final. HRD juga mengelola data dan mengunduh laporan PDF yang diserahkan ke sekolah secara manual.

Bahasa antarmuka: **Bahasa Indonesia**. Zona waktu: **Asia/Jakarta (WIB)**. Semua perhitungan tanggal dan jam (absensi, terlambat, batas input mundur) memakai WIB dan jam **server**, bukan jam perangkat pengguna.

## 2. Tech stack (wajib dipakai)

- Next.js (App Router) + TypeScript, di-deploy ke Vercel.
- Tailwind CSS dan `lucide-react` untuk ikon. Tampilan **mobile-first** (siswa mengisi dari HP). Desain mengikuti bagian 7A.
- Database: PostgreSQL di Supabase, diakses dengan **Prisma**. `DATABASE_URL` (Transaction pooler, port 6543, `?pgbouncer=true`) untuk runtime; `DIRECT_URL` (Session pooler, port 5432) untuk migrasi. Ikuti cara konfigurasi `directUrl` sesuai versi Prisma yang terpasang (di versi baru lewat `prisma.config.ts`). Jangan memakai URL transaction pooler untuk migrasi.
- Penyimpanan lampiran: **Supabase Storage**, bucket **privat**.
- Autentikasi: Auth.js (NextAuth) dengan Credentials (email + password), password di-hash dengan bcryptjs. Tabel `users` milik kita sendiri, bukan Supabase Auth.
- Validasi: zod. Import Excel: library `xlsx`.
- Laporan PDF: library yang berjalan di serverless (mis. `@react-pdf/renderer` atau `pdf-lib`). **Jangan pakai Puppeteer/Chromium.**
- Kompres foto di browser sebelum upload (mis. `browser-image-compression`).

Jangan menambah framework, ORM, atau layanan lain tanpa persetujuan pengguna.

## 3. Role dan hak akses

Tiga role: `HRD`, `MENTOR` (pembimbing), `STUDENT` (siswa). Sekolah **tidak** punya akun.

| Aksi | STUDENT | MENTOR | HRD |
|---|---|---|---|
| Kelola user, divisi, periode, siswa, penempatan | tidak | tidak | ya |
| Absen masuk/pulang, izin/sakit | ya (milik sendiri) | tidak | tidak |
| Buat/edit log + unggah lampiran | ya (milik sendiri, **hanya selama DRAFT**) | tidak | tidak |
| Lihat log + lampiran | milik sendiri | siswa di divisinya (hanya lihat) | semua (hanya lihat) |
| Setujui / tolak / minta revisi / komentar pada log | **fitur tidak ada** | **fitur tidak ada** | **fitur tidak ada** |
| Unduh laporan PDF | milik sendiri | siswa di divisinya | semua |

**Otorisasi wajib dicek di sisi server** pada setiap server action, route handler, dan pengambilan data. Menyembunyikan menu di UI tidak cukup. Siswa tidak boleh bisa membuka data siswa lain dengan mengganti ID di URL.

## 4. Skema database (Prisma)

```prisma
enum Role { HRD MENTOR STUDENT }
enum AttendanceStatus { HADIR TERLAMBAT IZIN SAKIT }
enum LogStatus { DRAFT SUBMITTED }
enum PlacementStatus { ACTIVE FINISHED }

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  role         Role
  isActive     Boolean  @default(true)
  student      Student?
  mentor       Mentor?
}

model Student {
  id        String @id @default(cuid())
  userId    String @unique
  user      User   @relation(fields: [userId], references: [id])
  nis       String?
  schoolName String
  major     String?
  className String?
  phone     String?
  placements Placement[]
}

model Division {
  id         String @id @default(cuid())
  name       String @unique
  mentors    Mentor[]
  placements Placement[]
}

model Mentor {
  id         String   @id @default(cuid())
  userId     String   @unique
  user       User     @relation(fields: [userId], references: [id])
  divisionId String
  division   Division @relation(fields: [divisionId], references: [id])
  isPic      Boolean  @default(false) // penanggung jawab utama divisi
}

model PklPeriod {
  id         String   @id @default(cuid())
  name       String
  startDate  DateTime @db.Date
  endDate    DateTime @db.Date
  placements Placement[]
}

model Placement {
  id         String   @id @default(cuid())
  studentId  String
  periodId   String
  divisionId String
  workStart  String   // "08:00" jam masuk (bisa beda per siswa)
  workEnd    String   // "16:00" atau "17:00"
  status     PlacementStatus @default(ACTIVE)
  student    Student  @relation(fields: [studentId], references: [id])
  period     PklPeriod @relation(fields: [periodId], references: [id])
  division   Division @relation(fields: [divisionId], references: [id])
  attendances Attendance[]
  logs       ActivityLog[]
  @@unique([studentId, periodId])
}

model Attendance {
  id          String   @id @default(cuid())
  placementId String
  attDate     DateTime @db.Date
  checkIn     DateTime?
  checkOut    DateTime?
  status      AttendanceStatus
  earlyLeave  Boolean  @default(false)
  note        String?
  placement   Placement @relation(fields: [placementId], references: [id])
  @@unique([placementId, attDate]) // 1 data absensi per siswa per hari
}

model ActivityLog {
  id          String    @id @default(cuid())
  placementId String
  logDate     DateTime  @db.Date
  startTime   String
  endTime     String
  taskFrom    String    // pembimbing / pemberi tugas
  description String
  output      String?
  obstacle    String?
  status      LogStatus @default(DRAFT)
  submittedAt DateTime? // diisi saat dikirim (jam server)
  placement   Placement @relation(fields: [placementId], references: [id])
  attachments LogAttachment[]
}

model LogAttachment {
  id         String   @id @default(cuid())
  logId      String
  fileName   String
  filePath   String   // path di Supabase Storage (bukan URL publik)
  fileType   String
  fileSize   Int
  uploadedAt DateTime @default(now())
  log        ActivityLog @relation(fields: [logId], references: [id], onDelete: Cascade)
}
```

Satu hari boleh punya beberapa `ActivityLog`, tetapi hanya satu `Attendance`.

## 5. Aturan bisnis

### Absensi
- Tombol **Absen masuk** menyimpan jam server (WIB) ke `checkIn`. Jika `checkIn` lebih lambat dari `workStart` placement siswa, status = `TERLAMBAT`, selain itu `HADIR`.
- Tombol **Absen pulang** menyimpan `checkOut`. Jika lebih awal dari `workEnd`, set `earlyLeave = true`.
- **Izin/Sakit**: siswa memilih status dan wajib mengisi `note`.
- Satu data per siswa per hari. Tidak boleh absen di luar rentang periode PKL atau di luar status placement `ACTIVE`.
- Siswa tidak bisa mengubah absensi setelah tersimpan. Koreksi hanya oleh HRD.

### Log aktivitas
- Field wajib: tanggal, jam mulai, jam selesai, `taskFrom`, uraian kegiatan. `output` dan `obstacle` opsional.
- Tanggal harus dalam periode PKL dan **maksimal 3 hari ke belakang** dari hari ini (WIB). Tidak boleh tanggal masa depan.
- Status hanya dua: `DRAFT` dan `SUBMITTED`. Tidak ada status persetujuan atau revisi.
- Selama `DRAFT`, siswa boleh mengedit log dan mengganti/menghapus lampiran.
- Saat siswa menekan **Kirim**, tampilkan dialog konfirmasi ("Log yang sudah dikirim tidak bisa diubah"). Setelah dikonfirmasi: status = `SUBMITTED`, isi `submittedAt` (jam server), dan log **terkunci permanen**.
- Log `SUBMITTED` **tidak boleh diedit atau dihapus oleh siapa pun** (termasuk HRD), begitu juga lampirannya. Tolak di server pada setiap aksi ubah/hapus log, penambahan/penggantian/penghapusan lampiran, dan pembuatan signed upload URL untuk log yang sudah `SUBMITTED`.

### Lampiran bukti
- Format: JPG, PNG, PDF, DOCX, XLSX. Maksimal **5 MB per file**, maksimal **3 file per log**. Validasi tipe dan ukuran di **server**, bukan hanya di browser.
- **Penting (batas Vercel):** request body fungsi serverless Vercel dibatasi sekitar 4,5 MB. Jadi **jangan unggah file lewat route Next.js**. Gunakan **signed upload URL** dari Supabase Storage supaya browser mengunggah langsung ke bucket. Server hanya membuat signed URL (setelah cek otorisasi dan validasi) lalu mencatat metadata di `LogAttachment`.
- Bucket **privat**. Jangan simpan atau tampilkan URL publik. Untuk melihat/mengunduh, buat **signed URL berumur pendek** setelah mengecek otorisasi sesuai tabel role.
- Nama file di storage di-generate (mis. `logs/{logId}/{uuid}.{ext}`), jangan memakai nama asli dari pengguna. Nama asli disimpan di `fileName`.
- Foto dikompres di browser (target di bawah sekitar 1 MB) sebelum diunggah.

### Peninjauan (read-only)
- Pembimbing melihat log berstatus `SUBMITTED` dari siswa di divisinya, lengkap dengan lampiran. HRD melihat log seluruh siswa. Sediakan filter per siswa dan tanggal.
- **Hanya lihat.** Jangan buat tombol setujui, tolak, atau minta revisi, jangan buat kolom komentar atau catatan, dan jangan simpan data peninjauan apa pun di database.
- Anggota tim pembimbing mana pun di divisi tersebut boleh melihat. `isPic` hanya penanda penanggung jawab dan penandatangan laporan.

### Laporan PDF
- Pilih siswa dan rentang tanggal, lalu unduh PDF.
- Isi: kop Trans Hybrid, identitas siswa dan sekolah, periode, rekap absensi (hadir, terlambat, izin, sakit), tabel aktivitas dengan kolom tanggal, jam, task dari, uraian, hasil, dan **daftar nama file lampiran**. Bagian tanda tangan untuk pembimbing PIC divisi dan HRD.
- **Hanya log berstatus `SUBMITTED`** yang masuk (log `DRAFT` tidak ikut). Lampiran **tidak** ditanam di PDF.
- Template laporan dari HRD belum ada. Buat satu template rapi dan sederhana, dengan konstanta yang mudah diubah (nama perusahaan, teks kop).

## 6. Di luar cakupan (JANGAN dibuat)

Akun/portal sekolah dan sekolah mengajukan magang. Proses persetujuan, penolakan, atau revisi log, serta komentar pembimbing pada log (sengaja ditiadakan). Fitur pembimbing membuat atau memantau task. Menanam foto di PDF. Kirim email otomatis dan notifikasi. Dashboard statistik. Absensi dengan foto/GPS. Format laporan khusus per sekolah. Jika pengguna meminta sesuatu di daftar ini, ingatkan bahwa itu fase berikutnya dan minta konfirmasi sebelum mengerjakan.

## 7. Struktur proyek yang disarankan

```
src/
  app/
    (auth)/login/
    (app)/
      student/   (absensi, log, riwayat, laporan)
      mentor/    (tinjau log siswa, laporan)
      hrd/       (users, divisions, periods, students, placements, laporan)
    api/         (hanya jika perlu: signed URL, unduh PDF)
  lib/
    auth.ts  db.ts  permissions.ts  time.ts  storage.ts  pdf/
  components/
prisma/
  schema.prisma  seed.ts
```

- Taruh semua pengecekan role di `lib/permissions.ts` dan pakai ulang di semua tempat.
- Taruh semua logika waktu WIB di `lib/time.ts`.

## 7A. Desain UI (wajib diikuti: simpel, putih dan biru)

Prinsip: **sesimple mungkin**. Tampilan bersih, putih, dengan satu warna aksen biru. Tidak ada dekorasi berlebih.

**Warna (daftarkan sebagai design token di Tailwind/CSS variables, jangan hardcode di komponen):**
- `primary`: biru `#0B5CE5` (hover: `#0A4DC2`)
- `primary-soft`: biru muda `#EAF1FF` (latar item hover atau badge ringan)
- Latar halaman dan kartu: putih `#FFFFFF`; latar area konten boleh abu sangat muda `#F8FAFC`
- Teks utama `#0F172A`, teks sekunder/menu tidak aktif `#475569`
- Garis/border `#E2E8F0`
- Status: gunakan biru dan abu saja. `Terkirim` = badge biru muda, `Draft` = badge abu. Merah hanya untuk pesan error dan aksi hapus, hijau tidak dipakai.

**Navigasi (mengikuti gambar referensi dari pengguna):**
- Desktop: **sidebar kiri** berlatar putih. Setiap item = ikon outline di kiri + teks.
- Item **aktif**: latar biru `primary` penuh, teks putih tebal (semibold), ikon putih, sudut membulat (`rounded-xl`).
- Item **tidak aktif**: tanpa latar, teks dan ikon abu `#475569`. Saat hover: latar `primary-soft`.
- Mobile (siswa memakai HP): sidebar berubah menjadi **menu bawah (bottom navigation)** dengan maksimal 4 item, aktif ditandai biru. Jangan memakai hamburger yang rumit.
- Ikon: `lucide-react` (gaya outline). Jangan pakai ikon dari library lain.

**Komponen dan gaya:**
- Satu font sans-serif sistem atau Inter. Judul halaman `text-xl font-semibold`, isi `text-sm`/`text-base`.
- Kartu: putih, border tipis `#E2E8F0`, sudut `rounded-xl`, **tanpa bayangan tebal**.
- Tombol utama: latar biru, teks putih. Tombol sekunder: putih dengan border. Satu tombol utama per layar.
- Form: label di atas input, input berborder tipis, fokus berwarna biru. Pesan error singkat di bawah input.
- Tabel sederhana (header abu muda, baris dipisah garis tipis). Di HP, tabel diganti daftar kartu.
- **Jangan buat:** dark mode, animasi atau transisi mewah, grafik/dashboard, gradasi, ilustrasi, dan banyak warna.
- Setiap halaman memuat satu tujuan utama saja. Hindari halaman penuh dengan banyak kartu atau statistik.

## 8. Environment variables

```
DATABASE_URL=        # Supabase Transaction pooler (port 6543), akhiri dengan ?pgbouncer=true
DIRECT_URL=          # Supabase Session pooler (port 5432), dipakai Prisma untuk migrasi
AUTH_SECRET=
NEXTAUTH_URL=        # URL situs (lokal atau Vercel)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=   # HANYA dipakai di server, jangan pernah ke client
```

Buat `.env.example` tanpa nilai asli. Jangan commit `.env`. `SUPABASE_SERVICE_ROLE_KEY` tidak boleh muncul di kode client atau variabel `NEXT_PUBLIC_*`.

## 9. Aturan kerja untuk AI

1. Kerjakan **satu langkah per permintaan**, sesuai urutan di `PROMPTS.md`. Jangan loncat ke fitur berikutnya sebelum diminta.
2. Sebelum mengubah banyak file, tulis **rencana singkat** (file apa yang dibuat/diubah) lalu lanjutkan.
3. Setelah setiap langkah: jalankan `npm run lint` dan `npm run build`, perbaiki error, lalu jelaskan **cara mengujinya secara manual** (langkah klik demi klik).
4. Buat **seed** berisi data contoh: 1 HRD, 2 divisi, 2 pembimbing, 3 siswa, 1 periode, penempatan dengan jam kerja berbeda (pulang 16.00 dan 17.00). Semua akun contoh memakai password sementara yang disebut jelas di README.
5. Pesan error dan label UI dalam Bahasa Indonesia, singkat dan jelas.
6. Jangan menyimpan password atau secret di kode. Jangan log data sensitif.
7. Jika ada keputusan yang tidak tercantum di file ini, **tanya pengguna**, jangan menebak.
8. Setiap fitur dianggap selesai hanya jika: bisa dipakai di layar HP, otorisasi server sudah dicek, validasi input ada, tampilan sesuai bagian 7A, dan lint serta build lolos.
9. Pilih solusi paling sederhana. Jangan menambah komponen, halaman, atau opsi yang tidak diminta. Kode harus mudah dibaca oleh pemula.
10. Proyek harus punya script `npm run setup` yang aman dijalankan ulang: cek variabel lingkungan, isi `AUTH_SECRET` otomatis bila kosong, migrasi database (termasuk Row Level Security tanpa policy), seed (menolak berjalan di production), dan pembuatan bucket Storage `attachments` yang privat. Build tidak boleh bergantung pada koneksi database yang aktif, dan `postinstall` menjalankan `prisma generate`.