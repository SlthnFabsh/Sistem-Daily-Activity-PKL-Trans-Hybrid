import "dotenv/config";
import {
  ALLOWED_FILE_TYPES,
  ATTACHMENTS_BUCKET,
  getAdminClient,
  MAX_FILE_SIZE,
} from "../src/lib/storage";

// Membuat bucket "attachments" yang PRIVAT di Supabase Storage.
// Aman dijalankan ulang: jika bucket sudah ada, dilewati tanpa error.

async function main() {
  const client = getAdminClient();
  const { error } = await client.storage.createBucket(ATTACHMENTS_BUCKET, {
    public: false,
    fileSizeLimit: MAX_FILE_SIZE,
    allowedMimeTypes: [...ALLOWED_FILE_TYPES],
  });

  if (error) {
    const message = (error.message ?? "").toLowerCase();
    if (message.includes("already exists") || message.includes("already been created")) {
      console.log(`Bucket "${ATTACHMENTS_BUCKET}" sudah ada, dilewati.`);
      return;
    }
    console.error(`Gagal membuat bucket "${ATTACHMENTS_BUCKET}": ${error.message}`);
    process.exit(1);
  }

  console.log(`Bucket "${ATTACHMENTS_BUCKET}" (privat, maks 5 MB) berhasil dibuat.`);
}

main().catch((error) => {
  console.error("Storage setup gagal:", error);
  process.exit(1);
});