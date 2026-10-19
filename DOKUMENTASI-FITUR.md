# Dokumentasi Fitur & Alur — Sistem Daily Activity PKL Trans Hybrid

Aplikasi web untuk mengelola kegiatan PKL (Praktik Kerja Lapangan) secara digital:
absensi berbasis **selfie + GPS**, jurnal aktivitas harian, peninjauan oleh
pembimbing/HRD, sampai **cetak laporan PDF**.

---

## 1. Ringkasan Singkat

| Aspek | Keterangan |
| --- | --- |
| Tujuan | Digitalisasi absensi & jurnal harian siswa PKL, menggantikan absen kertas |
| Pengguna | 4 peran: Siswa, Mentor/Pembimbing, HRD, Superadmin |
| Login | Email + password (akun dibuat oleh admin/HRD) |
| Zona waktu | Semua jam memakai jam **server (WIB)** — tidak bisa dipalsukan dari HP siswa |
| Bukti absen | Foto selfie (kamera langsung) + titik koordinat GPS |
| Laporan | PDF otomatis berisi rekap absensi + jurnal aktivitas |
| Keamanan | Foto & lampiran disimpan di penyimpanan privat, hanya bisa diakses lewat tautan berumur pendek sesuai hak akses |

---

## 2. Peran Pengguna & Hak Akses

| Peran | Siapa | Tugas utama di sistem |
| --- | --- | --- |
| **STUDENT** | Siswa PKL | Absen masuk/pulang, isi jurnal harian, lihat riwayat & unduh laporan |
| **MENTOR** | Pembimbing lapangan | Pantau absensi & jurnal siswa di divisinya |
| **HRD** | Pengelola PKL | Kelola penempatan siswa, pantau absensi/jurnal, cetak laporan |
| **SUPERADMIN** | Administrator sistem | Kelola semua data master: pengguna, siswa, divisi, periode |

Aturan akses area (dijaga otomatis oleh sistem):
- Siswa hanya bisa masuk area `/student`.
- Mentor hanya area `/mentor` dan hanya melihat siswa **di divisinya sendiri**.
- HRD area `/hrd`.
- Superadmin bisa ke semua area, termasuk `/hrd`.

---

## 3. Fitur per Peran

### 3.1 Siswa (STUDENT)

| Fitur | Halaman | Penjelasan |
| --- | --- | --- |
| **Absensi (masuk & pulang)** | `/student/absensi` | Ambil **selfie** lewat kamera + **lokasi GPS**. Sistem otomatis menandai status: **Hadir** atau **Terlambat** (melewati jam masuk divisi). Bisa juga pilih **Izin** / **Sakit** dengan keterangan. |
| **Jurnal Aktivitas (Log)** | `/student/log` | Isi kegiatan harian: tanggal, jam mulai–selesai, pemberi tugas, uraian, hasil, hambatan. Bisa **lampirkan file** (foto/PDF/DOCX/XLSX, maks 3 file × 5 MB). |
| **Riwayat** | `/student/riwayat` | Rekap pribadi: daftar absensi + statusnya. |
| **Laporan PDF** | `/student/laporan` | Unduh laporan PKL sendiri (absensi + jurnal) untuk periode tertentu. |
| **Ganti Password** | `/settings/password` | Ganti password sendiri, atau ajukan **permintaan reset** ke admin. |

Aturan penting untuk siswa:
- Absen **memakai jam server**, jadi tidak bisa mengakalin jam dari HP.
- Jurnal hanya bisa diubah selama **belum absen pulang** hari itu.
- Tanggal jurnal dibatasi **maksimal 3 hari ke belakang** (tidak bisa isi mundur jauh).

### 3.2 Mentor / Pembimbing (MENTOR)

| Fitur | Halaman | Penjelasan |
| --- | --- | --- |
| **Log Aktivitas Siswa** | `/mentor/log` | Lihat jurnal siswa **se-divisi**. Bisa buka lampiran, menyetujui/menolak, atau menghapus log. |
| **Absensi Siswa** | `/mentor/absensi` | Lihat kehadiran siswa se-divisi **lengkap dengan foto selfie dan lokasi** (peta + link Google Maps). |
| **Laporan PDF** | `/mentor/laporan` | Cetak laporan siswa yang dibimbing. |
| **Ganti Password** | `/settings/password` | — |

### 3.3 HRD

| Fitur | Halaman | Penjelasan |
| --- | --- | --- |
| **Penempatan** | `/hrd/penempatan` | Menempatkan siswa ke **divisi + periode** PKL, termasuk atur **jam masuk & pulang** kerja. |
| **Absensi Siswa** | `/hrd/absensi` | Pantau kehadiran **semua siswa**: filter tanggal/status/siswa, lihat **foto + koordinat + peta**. |
| **Log Aktivitas Siswa** | `/hrd/log` | Tinjau jurnal semua siswa. Bisa **impor massal dari Excel**, menyetujui/menolak log impor, dan menghapus log. |
| **Daftar Siswa (lihat saja)** | `/hrd/siswa` | Melihat data siswa. |
| **Daftar PIC (lihat saja)** | `/hrd/pic` | Melihat daftar mentor/PIC. |
| **Laporan PDF** | `/hrd/laporan` | Cetak laporan siswa mana pun. |
| **Ganti Password** | `/settings/password` | — |

### 3.4 Superadmin

| Fitur | Halaman | Penjelasan |
| --- | --- | --- |
| **Beranda** | `/superadmin` | Ringkasan sistem (jumlah siswa, periode aktif, dsb.). |
| **Pengguna** | `/superadmin/pengguna` | Buat/ubah akun **Mentor** & **HRD**. |
| **Siswa** | `/superadmin/siswa` | Kelola akun siswa (tambah/edit/hapus, reset password, **impor dari Excel**). |
| **Divisi** | `/hrd/divisi` | Kelola daftar divisi. |
| **Periode PKL** | `/hrd/periode` | Kelola periode PKL (tanggal mulai–selesai). |
| **Penempatan** | `/hrd/penempatan` | Sama seperti HRD. |
| **Log Siswa** | `/hrd/log` | Sama seperti HRD. |
| **Absensi** | `/hrd/absensi` | Sama seperti HRD. |
| **Permintaan Reset Password** | `/superadmin/password-requests` | Memproses permintaan reset password dari pengguna. |
| **Ganti Password** | `/settings/password` | — |

---

## 4. Alur Utama (untuk demo presentasi)

### 4.1 Alur Absensi Siswa (fitur unggulan)

```
Siswa login
   │
   ▼
Buka /student/absensi  → aktifkan kamera & izin lokasi
   │
   ├─► ABSEN MASUK
   │     • Ambil selfie
   │     • Sistem ambil GPS otomatis
   │     • Jam server menentukan: "Hadir" (≤ jam masuk) atau "Terlambat" (> jam masuk)
   │
   ▼
Isi Jurnal Aktivitas (/student/log)
   │     • Uraian kegiatan + jam + lampiran
   │     • Otomatis jadi DRAFT
   │
   ▼
ABSEN PULANG  → selfie + GPS lagi
   │     • Setelah pulang, jurnal hari itu terkunci
   │
   ▼
Mentor / HRD buka "Absensi Siswa"
   │     • Lihat foto selfie, status, jam, koordinat, dan peta lokasi
   ▼
HRD / Mentor tinjau jurnal  → setujui / tolak
   │
   ▼
Cetak Laporan PDF (/laporan)
```

### 4.2 Alur Impor Jurnal dari Excel (HRD)

```
HRD buka /hrd/log → pilih siswa → unggah file Excel
   │
   ▼
Sistem memvalidasi tiap baris (tanggal, jam, uraian, dll.)
   │
   ▼
Log masuk dengan status "Menunggu Persetujuan" (PENDING_REVIEW)
   │
   ├─► HRD klik "Setujui semua" → status jadi "Terkirim" (SUBMITTED)
   └─► HRD klik "Tolak" → log dihapus
```

Kolom Excel yang dikenali (nama kolom fleksibel): **Tanggal, Jam Mulai,
Jam Selesai, Pemberi Tugas, Uraian Kegiatan, Hasil, Hambatan**.

### 4.3 Alur Reset Password

```
Pengguna lupa password → /settings/password → "Minta reset"
   │
   ▼
Sistem membuat permintaan + token unik
   │
   ▼
Superadmin buka /superadmin/password-requests
   │     • Lihat daftar permintaan
   │     • Tetapkan password baru memakai token
   ▼
Pengguna login dengan password baru
```

### 4.4 Alur Laporan PDF

```
Pilih siswa + rentang tanggal  →  Klik "Cetak/Unduh PDF"
   │
   ▼
Server menyusun PDF berisi:
   • Identitas siswa, sekolah, divisi, periode
   • Rekap absensi (tanggal, status, jam masuk/pulang)
   • Daftar jurnal aktivitas
   ▼
File PDF terunduh
```

Akses cetak laporan sesuai peran: siswa hanya dirinya, mentor siswa bimbingannya,
HRD & superadmin semua siswa.

---

## 5. Detail Teknis yang Perlu Diketahui Saat Presentasi

- **Anti-kecurangan absen**
  - Jam memakai **waktu server (WIB)**, bukan jam HP.
  - Wajib **selfie** lewat kamera (bukan unggah galeri).
  - Wajib **titik GPS** tercatat dan bisa diverifikasi lewat peta.
- **Keamanan berkas**
  - Foto absensi & lampiran jurnal disimpan di penyimpanan **privat**.
  - Diakses lewat **tautan berumur pendek** yang hanya dibuat setelah sistem
    memeriksa hak akses (siswa hanya miliknya, mentor hanya divisinya, HRD semua).
- **Ringan & mobile-friendly**
  - Daftar absensi & log **dipaginasi** dan gambarnya dimuat bertahap, agar tetap
    cepat dibuka di HP.
  - Tampilan dioptimalkan sampai lebar layar **360 px**.
- **Status data**
  - Status absensi: `HADIR`, `TERLAMBAT`, `IZIN`, `SAKIT`.
  - Status jurnal: `DRAFT` (draft siswa), `PENDING_REVIEW` (hasil impor), `SUBMITTED` (terkirim).
  - Status penempatan: `ACTIVE`, `FINISHED`.
  - Password awal akun baru: `Pkl@2026` (sebaiknya diganti saat login pertama).

---

## 6. Poin Jualan untuk Presentasi (1 menit)

1. **Absensi tidak bisa dipalsukan** — selfie + GPS + jam server.
2. **Pembimbing & HRD bisa verifikasi visual** — foto sampai lokasi dalam satu layar.
3. **Hemat waktu HRD** — jurnal lama bisa diimpor massal dari Excel.
4. **Laporan PDF otomatis** — tidak perlu rekap manual.
5. **Ringan dan rapi di HP** — nyaman dipakai siswa di lokasi PKL.
