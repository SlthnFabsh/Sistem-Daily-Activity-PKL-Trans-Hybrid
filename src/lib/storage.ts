import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { getServerEnv } from "./env";

// Helper Supabase Storage khusus server (service role).
// JANGAN pernah diimport dari komponen client; SUPABASE_SERVICE_ROLE_KEY tidak
// boleh bocor ke browser.

export const ATTACHMENTS_BUCKET = "attachments";
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_FILES_PER_LOG = 3;

export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
];

export const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "pdf", "docx", "xlsx"];

let adminClient: SupabaseClient | undefined;

/** Client Supabase dengan service role, dibuat malas (lazy) agar build tidak membutuhkannya. */
export function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    const env = getServerEnv();
    adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

export type FileValidation = { ok: boolean; error: string | null };

/** Validasi tipe dan ukuran lampiran di sisi server. */
export function validateLogFile(file: {
  name: string;
  type: string;
  size: number;
}): FileValidation {
  if (file.size > MAX_FILE_SIZE) {
    return {
      ok: false,
      error: `Ukuran file "${file.name}" melebihi batas 5 MB.`,
    };
  }
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      ok: false,
      error: `Tipe file "${file.name}" tidak diizinkan. Format: JPG, PNG, PDF, DOCX, XLSX.`,
    };
  }
  return { ok: true, error: null };
}

/** Nama file di storage di-generate, bukan nama asli pengguna. Contoh: logs/{logId}/{uuid}.{ext} */
export function buildStoragePath(logId: string, originalName: string): string {
  const ext = (originalName.split(".").pop() ?? "").toLowerCase();
  const safeExt = ext === "jpeg" ? "jpg" : ext;
  return `logs/${logId}/${randomUUID()}.${safeExt}`;
}

/** URL unggah langsung (signed upload) berumur pendek untuk browser. */
export async function createSignedUploadUrl(
  filePath: string
): Promise<string> {
  const { data, error } = await getAdminClient()
    .storage.from(ATTACHMENTS_BUCKET)
    .createSignedUploadUrl(filePath, { upsert: false });
  if (error) throw new Error(`Gagal membuat tautan unggah: ${error.message}`);
  return data.signedUrl;
}

/** URL unduh (signed download) berumur pendek untuk melihat/mengunduh lampiran. */
export async function createSignedDownloadUrl(
  filePath: string,
  expiresInSeconds = 60
): Promise<string> {
  const { data, error } = await getAdminClient()
    .storage.from(ATTACHMENTS_BUCKET)
    .createSignedUrl(filePath, expiresInSeconds);
  if (error) throw new Error(`Gagal membuat tautan unduh: ${error.message}`);
  return data.signedUrl;
}