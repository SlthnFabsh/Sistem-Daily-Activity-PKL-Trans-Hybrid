import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { getSupabaseEnv } from "./env";

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
    const env = getSupabaseEnv();
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

/** Cek apakah objek benar-benar ada di storage (bukan hanya metadata di DB). */
export async function storageObjectExists(filePath: string): Promise<boolean> {
  const { data, error } = await getAdminClient()
    .storage.from(ATTACHMENTS_BUCKET)
    .createSignedUrl(filePath, 60);
  return !error && Boolean(data?.signedUrl);
}

/** Hapus file dari storage. */
export async function deleteFileFromStorage(filePath: string): Promise<void> {
  const { error } = await getAdminClient()
    .storage.from(ATTACHMENTS_BUCKET)
    .remove([filePath]);
  if (error) throw new Error(`Gagal menghapus file: ${error.message}`);
}

// ── Attendance photo ────────────────────────────────────────────

export const ATTENDANCE_BUCKET = "attendance-photos";
export const MAX_ATTENDANCE_PHOTO_SIZE = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_ATTENDANCE_MIME = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
];

export function validateAttendancePhoto(file: {
  name: string;
  type: string;
  size: number;
}): FileValidation {
  if (file.size > MAX_ATTENDANCE_PHOTO_SIZE) {
    return {
      ok: false,
      error: `Foto "${file.name}" melebihi batas 10 MB.`,
    };
  }
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  const okExt = ["jpg", "jpeg", "png", "heic", "heif"].includes(ext);
  const okMime = ALLOWED_ATTENDANCE_MIME.includes(file.type);
  if (!okExt || !okMime) {
    return {
      ok: false,
      error: `Foto "${file.name}" tidak diizinkan. Format: JPG, PNG, HEIC, HEIF.`,
    };
  }
  return { ok: true, error: null };
}

/** Path di storage: attendance/{placementId}/{attDate}/{uuid}.{ext} */
export function buildAttendancePhotoPath(
  placementId: string,
  attDate: Date,
  originalName: string
): string {
  const ext = (originalName.split(".").pop() ?? "").toLowerCase();
  const safeExt = ext === "jpeg" ? "jpg" : ext;
  const attDateStr = attDate.toISOString().slice(0, 10);
  return `attendance/${placementId}/${attDateStr}/${randomUUID()}.${safeExt}`;
}

/** Upload foto attendance dari buffer ke storage; mengembalikan path storage. */
export async function uploadAttendancePhoto(
  buffer: Buffer,
  placementId: string,
  attDate: Date,
  originalName: string
): Promise<string> {
  const validation = validateAttendancePhoto({
    name: originalName,
    type: "image/jpeg", // type asli hilang di server; kita asumsikan gambar valid
    size: buffer.length,
  });
  if (!validation.ok) {
    throw new Error(validation.error ?? "File tidak valid.");
  }

  const filePath = buildAttendancePhotoPath(placementId, attDate, originalName);
  const { error } = await getAdminClient()
    .storage.from(ATTENDANCE_BUCKET)
    .upload(filePath, buffer, {
      contentType: "image/jpeg",
      upsert: false,
      cacheControl: "no-cache",
    });
  if (error) throw new Error(`Gagal mengupload foto: ${error.message}`);

  return filePath;
}

/** Buat signed URL untuk preview foto attendance (berumur pendek). */
export async function createAttendancePhotoUrl(
  filePath: string,
  expiresInSeconds = 120
): Promise<string> {
  const { data, error } = await getAdminClient()
    .storage.from(ATTENDANCE_BUCKET)
    .createSignedUrl(filePath, expiresInSeconds);
  if (error) throw new Error(`Gagal membuat URL foto: ${error.message}`);
  return data.signedUrl;
}
