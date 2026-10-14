import { z } from "zod";

// Validasi variabel lingkungan aplikasi. Dipanggil saat dibutuhkan (lazy),
// sehingga build tidak gagal hanya karena .env belum diisi.
export const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL kosong"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL kosong"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET kosong"),
  NEXTAUTH_URL: z.string().min(1, "NEXTAUTH_URL kosong"),
  SUPABASE_URL: z.string().min(1, "SUPABASE_URL kosong"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY kosong"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

// Empat variabel yang wajib diisi manual di .env (diperiksa script check:env).
export const REQUIRED_SUPABASE_VARS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export function validateEnv(
  source: Record<string, string | undefined> = process.env
): { ok: boolean; missing: string[] } {
  const result = serverEnvSchema.safeParse(source);
  if (result.success) return { ok: true, missing: [] };
  return { ok: false, missing: result.error.issues.map((i) => i.path.join(".")) };
}

export function getServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `- ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Konfigurasi lingkungan tidak lengkap. Variabel berikut belum terisi di file .env:\n${detail}`
    );
  }
  return result.data;
}

const supabaseEnvSchema = z.object({
  SUPABASE_URL: z.string().min(1, "SUPABASE_URL kosong"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY kosong"),
});

export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;

// Validasi hanya variabel Supabase. Dipakai oleh storage yang tidak
// membutuhkan AUTH_SECRET/NEXTAUTH_URL.
export function getSupabaseEnv(): SupabaseEnv {
  const result = supabaseEnvSchema.safeParse(process.env);
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `- ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Konfigurasi Supabase tidak lengkap. Variabel berikut belum terisi di file .env:\n${detail}`
    );
  }
  return result.data;
}