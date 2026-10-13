import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma ORM 7: koneksi database untuk CLI (migrate/introspect) diatur di sini.
// Runtime aplikasi memakai DATABASE_URL lewat driver adapter (lihat src/lib/db.ts).
// DIRECT_URL (Session pooler, port 5432) dipakai untuk migrasi.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? "",
  },
});
