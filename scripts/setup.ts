import "dotenv/config";
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { REQUIRED_SUPABASE_VARS } from "../src/lib/env";
import { prisma } from "../src/lib/db";

type StepResult = { step: string; ok: boolean };

const results: StepResult[] = [];

async function record(step: string, fn: () => Promise<unknown> | unknown) {
  try {
    await fn();
    results.push({ step, ok: true });
  } catch (error) {
    results.push({ step, ok: false });
    throw error;
  }
}

function runCommand(cmd: string) {
  execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
}

function ensureEnvValue(content: string, name: string, value: string): string {
  const regex = new RegExp(`^${name}=.*$`, "m");
  if (regex.test(content)) {
    return content.replace(regex, `${name}=${value}`);
  }
  const sep = content === "" || content.endsWith("\n") ? "" : "\n";
  return `${content}${sep}${name}=${value}\n`;
}

function printSummary(failed: boolean) {
  console.log("\n=== Ringkasan npm run setup ===");
  for (const r of results) {
    console.log(`  [${r.ok ? "BERHASIL" : "GAGAL"}] ${r.step}`);
  }
  if (failed) {
    console.log("\nBeberapa langkah gagal. Perbaiki penyebabnya, lalu jalankan ulang.");
  }
}

async function main() {
  // 1. Pastikan 4 variabel Supabase sudah terisi.
  const missing = REQUIRED_SUPABASE_VARS.filter((v) => !process.env[v]?.trim());
  if (missing.length > 0) {
    console.error("Berhenti: variabel berikut belum terisi di file .env:");
    for (const name of missing) console.error(`  - ${name}`);
    process.exit(1);
  }
  results.push({ step: "check:env", ok: true });

  // 2. Isi AUTH_SECRET dan NEXTAUTH_URL di .env bila masih kosong.
  const envPath = path.join(process.cwd(), ".env");
  let content = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";

  if (!process.env.AUTH_SECRET?.trim()) {
    content = ensureEnvValue(content, "AUTH_SECRET", randomBytes(32).toString("base64"));
    console.log("AUTH_SECRET dibuat (acak) dan ditulis ke .env.");
  }
  if (!process.env.NEXTAUTH_URL?.trim()) {
    content = ensureEnvValue(content, "NEXTAUTH_URL", "http://localhost:3000");
    console.log("NEXTAUTH_URL ditetapkan ke http://localhost:3000 di .env.");
  }
  writeFileSync(envPath, content, "utf8");
  results.push({ step: "Isi AUTH_SECRET & NEXTAUTH_URL", ok: true });

  // 3. Migrasi database.
  await record("db:migrate (prisma migrate deploy)", () => {
    runCommand("npx --no-install prisma migrate deploy");
  });

  // 4. Seed data contoh.
  await record("db:seed", () => {
    runCommand("npx --no-install prisma db seed");
  });

  // 5. Buat bucket storage privat (dilewati jika sudah ada).
  await record("storage:setup (bucket attachments)", () => {
    runCommand("npm run storage:setup");
  });

  // 6. Uji koneksi database.
  await record("Uji koneksi database (SELECT 1)", () => prisma.$queryRaw`SELECT 1`);

  printSummary(false);
}

main()
  .catch(async (error) => {
    printSummary(true);
    console.error("\nSetup gagal:", error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });