# Sistem Daily Activity PKL Trans Hybrid

Aplikasi pendataan kegiatan harian (daily activity) siswa Praktik Kerja Lapangan (PKL) di **PT Trans Hybrid** — dari absensi siswa, log aktivitas harian, hingga pelaporan ke pembimbing (mentor) dan HRD.

## Teknologi & Versi Penting

| Paket | Versi | Catatan |
| --- | --- | --- |
| Node.js | v22 | Wajib 20.9+ (dipakai `next build`) |
| Next.js | 16.4.0 | App Router, Server Components |
| React | 19.3.0 | — |
| TypeScript | ^5 | Strict mode |
| Prisma | 7.10.0 | Client + ORM; memakai driver adapter PostgreSQL |
| @prisma/adapter-pg | 7.10.0 | Adapter Prisma 7 (wajib untuk runtime) |
| pg | ^8.23.1 | Driver PostgreSQL |
| next-auth | ^5.0.0-beta.32 | Autentikasi Credentials (email + password) |
| Zod | ^4.6.7 | Validasi env & input |
| bcryptjs | ^3.0.3 | Hash password (named import `hash`/`compare`) |
| @supabase/supabase-js | ^2.117.3 | Storage (bucket privat `attachments`) |
| xlsx | ^0.18.5 | Ekspor laporan Excel |
| @react-pdf/renderer | ^4.9.0 | Ekspor laporan PDF |
| browser-image-compression | ^2.0.2 | Kompresi foto saat upload di perangkat |
| lucide-react | ^1.56.0 | Ikon UI |
| clsx | ^2.1.1 | Utilitas className |
| tsx | ^4.23.15 | Menjalankan script TypeScript (seed, setup) |
| dotenv | ^18.0.7 | Memuat `.env` untuk script server |

> Catatan Prisma 7: schema tidak lagi berisi `url` datasource. Koneksi dilakukan lewat driver adapter di `src/lib/db.ts`. `prisma generate` menulis client otomatis ke `src/generated/prisma` (hasil generate TIDAK dikomit, dibuat ulang oleh `postinstall`).

## Menjalankan di Lokal

### 1. Siapkan `.env`

Salin `.env.example` menjadi `.env` lalu isi **4 variabel** berikut dari dashboard Supabase:

1. `DATABASE_URL` — koneksi **Transaction pooler** (port 6543), akhiri dengan `?pgbouncer=true`. Dipakai aplikasi saat runtime.
2. `DIRECT_URL` — koneksi **Session/direct** (port 5432). Dipakai Prisma untuk migrasi. Jangan gunakan URL transaction pooler di sini.
3. `SUPABASE_URL` — alamat proyek, mis. `https://abcdefghijklm.supabase.co`.
4. `SUPABASE_SERVICE_ROLE_KEY` — Service role key dari **Settings > API**. Rahasia; hanya boleh dipakai di sisi server.

Letak pengambilan kunci di dashboard Supabase: **Project Settings > Database > Connection string** (untuk `DATABASE_URL`/`DIRECT_URL`) dan **Project Settings > API** (untuk `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`).

`AUTH_SECRET` dan `NEXTAUTH_URL` ditulis otomatis oleh `npm run setup` jika masih kosong.

### 2. Install dependensi

```bash
npm install
```

Menjalankan Prisma generate otomatis.

### 3. Setup sekali (migrasi + seed + storage)

```bash
npm run setup
```

Script ini menjalankan, secara berurutan:
- `check:env` — memastikan 4 variabel Supabase terisi;
- mengisi `AUTH_SECRET` (acak) & `NEXTAUTH_URL` di `.env` bila kosong;
- `db:migrate` — `prisma migrate deploy` (menerapkan `prisma/migrations`, termasuk RLS tabel);
- `db:seed` — data contoh (idempotent, aman dijalankan berulang);
- `storage:setup` — membuat bucket privat `attachments` & `attendance-photos` (dilewati jika sudah ada);
- uji koneksi database + ringkasan hasil per langkah.

### 4. Jalankan

```bash
npm run dev
```

Buka `http://localhost:3000`.

## Akun Contoh (Seed)

Semua akun memakai password **`Pkl@2026`**.

| Role | Email |
| --- | --- |
| HRD | `hrd@transhybrid.com` |
| Pembimbing (Divisi Operasional) | `pembimbing1@transhybrid.com` |
| Pembimbing (Divisi Administrasi) | `pembimbing2@transhybrid.com` |
| Siswa (penempatan Divisi Operasional, jam 08:00–16:00) | `siswa1@transhybrid.com` |
| Siswa (penempatan Divisi Operasional, jam 08:00–16:00) | `siswa2@transhybrid.com` |
| Siswa (penempatan Divisi Administrasi, jam 08:00–17:00) | `siswa3@transhybrid.com` |

Data lain: 1 periode PKL aktif (`Periode PKL 2026/2027`, 2026-07-01 s.d. 2027-06-30), 2 divisi (`Divisi Operasional`, `Divisi Administrasi`).

> Peringatan: seed diblokir jika `NODE_ENV=production`, jadi aman untuk tidak dipakai di produksi.

## Skrip Berguna

```bash
npm run check:env   # cek 4 variabel Supabase
npm run db:migrate  # prisma migrate deploy
npm run db:seed     # seed data contoh
npm run storage:setup # buat bucket attachments & attendance-photos (idempotent)
npm run lint        # eslint
npm run build       # production build
```

## Deploy ke Vercel

1. Push repo ke GitHub, lalu import di [vercel.com](https://vercel.com).
2. Tambahkan **Environment Variables**: `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET`.
3. `NEXTAUTH_URL` = URL proyek Vercel (mis. `https://<proyek>.vercel.app`).
4. Framework preset: Next.js (otomatis).

### Setelah deploy pertama

- Migrasi: jalankan `npx prisma migrate deploy` (mis. lewat Vercel CLI di folder proyek, dengan env produksi terisi) **atau** jalankan `drizzle`/`migrate` dari CI. Pastikan migrasi sudah diterapkan agar schema lengkap.
- JANGAN jalankan `npm run db:seed` atau `npm run setup` pada produksi tanpa risiko menimpa data; seed diblokir saat `NODE_ENV=production` tetapi migrasi tetap perlu dijalankan secara eksplisit.

## Struktur Proyek

- `prisma/schema.prisma` — model data (User, Student, Division, Mentor, PklPeriod, Placement, Attendance, ActivityLog, LogAttachment).
- `prisma/migrations/` — migrasi SQL (termasuk RLS) yang diterapkan oleh `prisma migrate deploy`.
- `prisma/seed.ts` — seed data contoh.
- `scripts/` — utilitas setup (`check-env`, `storage-setup`, `setup`).
- `src/lib/` — `env.ts` (validasi zod), `db.ts` (Prisma + adapter), `auth.ts` (Auth.js), `permissions.ts`, `time.ts`, `storage.ts` (Supabase Storage), `navigation.ts`.
- `src/proxy.ts` — proteksi rute (pengganti `middleware.ts` di Next 16).
- `src/app/` — halaman per role (`student`, `mentor`, `hrd`), login, API.
- `src/components/` — komponen UI dan layout.