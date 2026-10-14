// Utilitas waktu zona Asia/Jakarta (WIB). Semua perhitungan tanggal dan jam
// memakai jam server yang diterjemahkan ke WIB, bukan jam perangkat pengguna.

const WIB_ZONE = "Asia/Jakarta";

export type WibDateParts = { year: number; month: number; day: number };
export type WibTimeParts = { hours: number; minutes: number; seconds: number };

export function getWibDateParts(date: Date = new Date()): WibDateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: WIB_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function getWibTimeParts(date: Date = new Date()): WibTimeParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: WIB_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  return { hours: get("hour"), minutes: get("minute"), seconds: get("second") };
}

/** Tanggal hari ini di zona WIB, dinyatakan sebagai Date UTC tengah malam (cocok untuk kolom @db.Date). */
export function todayWib(): Date {
  const { year, month, day } = getWibDateParts();
  return new Date(Date.UTC(year, month - 1, day));
}

/** Jam saat ini di WIB dalam format "HH:mm". */
export function nowWibTime(date: Date = new Date()): string {
  const { hours, minutes } = getWibTimeParts(date);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Format tanggal panjang Bahasa Indonesia di zona WIB, mis. "Rabu, 14 Oktober 2026". */
export function formatWibDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: WIB_ZONE,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** Format waktu "HH:mm" WIB dari sebuah DateTime. */
export function formatWibTime(date: Date): string {
  const { hours, minutes } = getWibTimeParts(date);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Menit WIB saat ini (0-1439). */
export function nowWibMinutes(date: Date = new Date()): number {
  const { hours, minutes } = getWibTimeParts(date);
  return hours * 60 + minutes;
}

/** Selisih hari kalender di zona WIB: b dikurangi a. Positif jika b setelah a. */
export function diffDaysWib(a: Date, b: Date): number {
  const da = getWibDateParts(a);
  const db = getWibDateParts(b);
  const ua = Date.UTC(da.year, da.month - 1, da.day);
  const ub = Date.UTC(db.year, db.month - 1, db.day);
  return Math.round((ub - ua) / 86_400_000);
}

/** Cek terlambat: jam saat ini lebih lambat dari jam mulai kerja ("08:00"). */
export function isLateNow(workStart: string, date: Date = new Date()): boolean {
  const [h, m] = workStart.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  return nowWibMinutes(date) > h * 60 + m;
}

/** Cek apakah tanggal dalam jendela maksimal N hari ke belakang dari hari ini (WIB), dan bukan masa depan. */
export function isWithinBackdateWindow(date: Date, maxDays = 3): boolean {
  const days = diffDaysWib(date, todayWib());
  return days >= 0 && days <= maxDays;
}