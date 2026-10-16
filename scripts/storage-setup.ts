import "dotenv/config";
import {
  ALLOWED_ATTENDANCE_MIME,
  ALLOWED_FILE_TYPES,
  ATTACHMENTS_BUCKET,
  ATTENDANCE_BUCKET,
  getAdminClient,
  MAX_ATTENDANCE_PHOTO_SIZE,
  MAX_FILE_SIZE,
} from "../src/lib/storage";

// Membuat bucket PRIVAT di Supabase Storage:
// - "attachments"       : lampiran log aktivitas (maks 5 MB)
// - "attendance-photos" : foto absensi masuk/pulang (maks 10 MB)
// Aman dijalankan ulang: jika bucket sudah ada, dilewati tanpa error.

type BucketConfig = {
  name: string;
  fileSizeLimit: number;
  allowedMimeTypes: string[];
};

const BUCKETS: BucketConfig[] = [
  {
    name: ATTACHMENTS_BUCKET,
    fileSizeLimit: MAX_FILE_SIZE,
    allowedMimeTypes: [...ALLOWED_FILE_TYPES],
  },
  {
    name: ATTENDANCE_BUCKET,
    fileSizeLimit: MAX_ATTENDANCE_PHOTO_SIZE,
    allowedMimeTypes: [...ALLOWED_ATTENDANCE_MIME],
  },
];

async function createIfMissing(
  client: ReturnType<typeof getAdminClient>,
  bucket: BucketConfig
): Promise<boolean> {
  const { error } = await client.storage.createBucket(bucket.name, {
    public: false,
    fileSizeLimit: bucket.fileSizeLimit,
    allowedMimeTypes: bucket.allowedMimeTypes,
  });

  if (error) {
    const message = (error.message ?? "").toLowerCase();
    if (message.includes("already exists") || message.includes("already been created")) {
      console.log(`Bucket "${bucket.name}" sudah ada, dilewati.`);
      return true;
    }
    console.error(`Gagal membuat bucket "${bucket.name}": ${error.message}`);
    return false;
  }

  const maxMb = Math.round(bucket.fileSizeLimit / (1024 * 1024));
  console.log(`Bucket "${bucket.name}" (privat, maks ${maxMb} MB) berhasil dibuat.`);
  return true;
}

async function main() {
  const client = getAdminClient();
  let allOk = true;

  for (const bucket of BUCKETS) {
    const ok = await createIfMissing(client, bucket);
    allOk = allOk && ok;
  }

  if (!allOk) process.exit(1);
}

main().catch((error) => {
  console.error("Storage setup gagal:", error);
  process.exit(1);
});
