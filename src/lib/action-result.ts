import type { ZodError } from "zod";

// Bentuk hasil standar untuk server action. Dipakai oleh komponen client
// untuk menampilkan pesan dan error per field.

export type ActionResult = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  signedUrl?: string;
  filePath?: string;
};

export type ImportRowResult = {
  row: number;
  name: string;
  ok: boolean;
  error?: string;
};

export type ImportResult = ActionResult & {
  imported: number;
  failed: number;
  rows: ImportRowResult[];
};

/** Ubah error zod menjadi peta `{ namaField: [pesan] }` yang mudah dirender. */
export function toFieldErrors(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/** Deteksi pelanggaran unique constraint di Prisma (kode error P2002). */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}