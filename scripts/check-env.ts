import "dotenv/config";
import { REQUIRED_SUPABASE_VARS } from "../src/lib/env";

// Memeriksa bahwa 4 variabel Supabase sudah terisi di file .env.
// Menampilkan variabel mana saja yang masih kosong.

const missing = REQUIRED_SUPABASE_VARS.filter((v) => !process.env[v]?.trim());

if (missing.length > 0) {
  console.error("Berhenti: variabel Supabase berikut belum terisi di file .env:");
  for (const name of missing) console.error(`  - ${name}`);
  process.exit(1);
}

console.log("Semua variabel Supabase sudah terisi di file .env.");