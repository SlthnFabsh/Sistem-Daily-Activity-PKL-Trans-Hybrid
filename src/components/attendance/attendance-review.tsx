"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  Building2,
  CalendarCheck,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Filter,
  GraduationCap,
  HeartPulse,
  Info,
  MapPin,
  MapPinned,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { initialsOf } from "@/lib/initials";
import { AttendancePhoto } from "./attendance-photo";
import type {
  AttendanceActiveFilters,
  AttendancePagination,
  AttendanceReviewItem,
  AttendanceStudentOption,
} from "./types";

const NAV_BTN =
  "inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3.5 py-2 text-xs font-semibold text-text shadow-sm transition-colors hover:border-primary/30 hover:bg-primary-soft hover:text-primary";
const NAV_BTN_DISABLED =
  "inline-flex items-center gap-1 rounded-lg border border-border bg-surface-muted px-3.5 py-2 text-xs font-semibold text-text-muted opacity-60";

type StatusTone = "success" | "warning" | "info" | "danger";

const STATUS_META: Record<
  AttendanceReviewItem["status"],
  { label: string; tone: StatusTone; Icon: typeof CheckCircle2 }
> = {
  HADIR: { label: "Hadir", tone: "success", Icon: CheckCircle2 },
  TERLAMBAT: { label: "Terlambat", tone: "warning", Icon: Clock3 },
  IZIN: { label: "Izin", tone: "info", Icon: FileText },
  SAKIT: { label: "Sakit", tone: "danger", Icon: HeartPulse },
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Semua Status" },
  { value: "HADIR", label: "Hadir" },
  { value: "TERLAMBAT", label: "Terlambat" },
  { value: "IZIN", label: "Izin" },
  { value: "SAKIT", label: "Sakit" },
];

function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function mapEmbedUrl(lat: number, lng: number) {
  const d = 0.003;
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox
  )}&layer=mapnik&marker=${lat},${lng}`;
}

function formatCoord(value: number): string {
  return value.toFixed(6);
}

function formatShortDate(value?: string): string {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDuration(
  checkIn: string | null,
  checkOut: string | null
): string {
  if (!checkIn || !checkOut) return "—";
  const [inHour, inMinute] = checkIn.split(":").map(Number);
  const [outHour, outMinute] = checkOut.split(":").map(Number);
  if (
    !Number.isFinite(inHour) ||
    !Number.isFinite(inMinute) ||
    !Number.isFinite(outHour) ||
    !Number.isFinite(outMinute)
  ) {
    return "—";
  }
  const minutes = outHour * 60 + outMinute - (inHour * 60 + inMinute);
  if (minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours > 0 ? `${hours}j ${remainder}m` : `${remainder}m`;
}

function LocationBlock({
  latitude,
  longitude,
}: {
  latitude: number | null;
  longitude: number | null;
}) {
  if (latitude == null || longitude == null) {
    return (
      <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-muted/40 px-4 text-center">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-text-muted shadow-sm">
          <MapPin className="h-4 w-4" />
        </span>
        <p className="mt-2.5 text-xs font-semibold text-text">
          Lokasi tidak tersedia
        </p>
        <p className="mt-1 max-w-[220px] text-[11px] leading-relaxed text-text-muted">
          Absensi ini tidak menyertakan koordinat GPS.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-64 flex-col rounded-xl border border-border bg-surface-muted/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Koordinat
          </p>
          <p className="mt-1 font-mono text-sm tabular-nums text-text">
            {formatCoord(latitude)}°, {formatCoord(longitude)}°
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-[10px] font-semibold text-success">
          <CheckCircle2 className="h-3 w-3" /> GPS tercatat
        </span>
      </div>

      <a
        href={mapsUrl(latitude, longitude)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-text shadow-sm transition-colors hover:border-primary/30 hover:bg-primary-soft hover:text-primary"
      >
        <MapPin className="h-3.5 w-3.5" /> Buka di Google Maps
        <ArrowUpRight className="h-3 w-3" />
      </a>

      <details className="group mt-4 overflow-hidden rounded-lg border border-border bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold text-text [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-1.5">
            <MapPinned className="h-3.5 w-3.5 text-text-muted" /> Lihat peta
            lokasi
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-text-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-border p-2">
          <iframe
            src={mapEmbedUrl(latitude, longitude)}
            title="Peta lokasi absensi"
            loading="lazy"
            className="h-44 w-full rounded-md border-0 bg-surface-muted"
          />
        </div>
      </details>

      <ul className="mt-4 space-y-2 border-t border-border pt-3 text-[11px] leading-relaxed text-text-muted">
        <li className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
          Titik koordinat terekam saat absensi.
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
          Sumber: GPS perangkat siswa.
        </li>
      </ul>

      <p className="mt-auto pt-3 text-[10px] leading-relaxed text-text-muted">
        Koordinat ditampilkan sesuai data absensi.
      </p>
    </div>
  );
}

function PhotoPlaceholder() {
  return (
    <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-muted/40 px-4 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-text-muted shadow-sm">
        <Camera className="h-4 w-4" />
      </span>
      <p className="mt-2.5 text-xs font-semibold text-text">
        Foto tidak tersedia
      </p>
      <p className="mt-1 max-w-[220px] text-[11px] leading-relaxed text-text-muted">
        Absensi ini tidak memiliki foto. Data lain tetap dapat diverifikasi.
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`px-5 py-3.5 ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-text">
        {value}
      </p>
    </div>
  );
}

export function AttendanceReview({
  items,
  students,
  activeFilters,
  hasCustomFilters,
  pagination,
  divisionName,
}: {
  items: AttendanceReviewItem[];
  students: AttendanceStudentOption[];
  activeFilters: AttendanceActiveFilters;
  hasCustomFilters: boolean;
  pagination: AttendancePagination;
  divisionName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [studentId, setStudentId] = useState(activeFilters.studentId ?? "all");
  const [status, setStatus] = useState(activeFilters.status ?? "all");
  const [fromDate, setFromDate] = useState(activeFilters.fromDate ?? "");
  const [toDate, setToDate] = useState(activeFilters.toDate ?? "");

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (studentId && studentId !== "all") params.set("studentId", studentId);
    if (status && status !== "all") params.set("status", status);
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function handleReset() {
    setStudentId("all");
    setStatus("all");
    setFromDate("");
    setToDate("");
    router.push(pathname);
  }

  const selectedStudent = students.find(
    (student) => student.id === activeFilters.studentId
  );
  const selectedStatusMeta = activeFilters.status
    ? STATUS_META[activeFilters.status as AttendanceReviewItem["status"]]
    : null;

  // Parameter filter yang sudah diterapkan (dipakai untuk tautan paginasi).
  const appliedParams = new URLSearchParams();
  if (activeFilters.studentId)
    appliedParams.set("studentId", activeFilters.studentId);
  if (activeFilters.status) appliedParams.set("status", activeFilters.status);
  if (activeFilters.fromDate)
    appliedParams.set("fromDate", activeFilters.fromDate);
  if (activeFilters.toDate) appliedParams.set("toDate", activeFilters.toDate);

  function pageHref(target: number): string {
    const params = new URLSearchParams(appliedParams.toString());
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  const rangeStart =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) * pagination.perPage + 1;
  const rangeEnd = Math.min(
    pagination.page * pagination.perPage,
    pagination.total
  );
  const periodLabel = `${formatShortDate(activeFilters.fromDate)} – ${formatShortDate(activeFilters.toDate)}`;

  return (
    <div className="space-y-5">
      {/* Kartu Filter */}
      <Card className="overflow-hidden">
        <div className="border-b border-border bg-surface-muted/40 px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-primary/10 bg-primary-soft text-primary">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-text">
                Filter data absensi
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-text-muted">
                Persempit data berdasarkan siswa, status, dan periode absensi.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleFilterSubmit} className="px-5 py-6 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Siswa"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              <option value="all">Semua Siswa</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.divisionName && divisionName !== s.divisionName
                    ? ` (${s.divisionName})`
                    : ""}
                </option>
              ))}
            </Select>

            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>

            <Input
              label="Dari tanggal"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />

            <Input
              label="Sampai tanggal"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <div className="mt-5 flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] leading-relaxed text-text-muted">
              {hasCustomFilters
                ? "Filter sedang diterapkan pada daftar absensi."
                : "Menampilkan data bulan berjalan. Ubah periode untuk melihat data lain."}
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleReset}
                className="text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
              <Button type="submit" className="text-xs">
                <Filter className="h-3.5 w-3.5" /> Terapkan Filter
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Ringkasan */}
      <Card className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <CalendarCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight text-text">
              {pagination.total === 0
                ? "Tidak ada data absensi"
                : `${pagination.total} data absensi`}
            </p>
            <p className="mt-0.5 text-[11px] text-text-muted">
              {pagination.total === 0
                ? `Periode ${periodLabel}`
                : `Menampilkan ${rangeStart}–${rangeEnd} · ${periodLabel}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
          {divisionName && (
            <Badge tone="accent" className="gap-1">
              <Building2 className="h-3 w-3" /> {divisionName}
            </Badge>
          )}
          {selectedStudent && (
            <Badge tone="info">Siswa: {selectedStudent.name}</Badge>
          )}
          {selectedStatusMeta && (
            <Badge tone={selectedStatusMeta.tone}>
              Status: {selectedStatusMeta.label}
            </Badge>
          )}
          {hasCustomFilters && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-semibold text-primary">
              <Filter className="h-3 w-3" /> Filter aktif
            </span>
          )}
        </div>
      </Card>

      {/* Daftar Absensi */}
      {items.length === 0 ? (
        <Card className="flex flex-col items-center px-6 py-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
            <CalendarCheck className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-semibold text-text">
            Tidak ada data absensi
          </p>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-text-muted">
            {hasCustomFilters
              ? "Tidak ada data yang sesuai dengan filter yang dipilih. Coba ubah atau reset filter."
              : "Belum ada absensi pada rentang tanggal ini."}
          </p>
          {hasCustomFilters && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleReset}
              className="mt-4 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset filter
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const statusMeta = STATUS_META[item.status];
            const StatusIcon = statusMeta.Icon;
            const evidence =
              [item.hasPhoto ? "Foto" : null, item.latitude != null ? "GPS" : null]
                .filter(Boolean)
                .join(" + ") || "Tidak ada";

            return (
              <Card key={item.id} className="overflow-hidden">
                <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
                  <div className="flex min-w-0 items-start gap-3.5">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-primary/10 bg-primary-soft text-sm font-bold text-primary-strong">
                      {initialsOf(item.student.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="break-words text-[15px] font-semibold tracking-tight text-text">
                          {item.student.name}
                        </h3>
                        {item.student.nis && (
                          <span className="rounded-md border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                            NIS {item.student.nis}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-text-muted">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {item.formattedDate}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-border" />
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {item.student.divisionName}
                        </span>
                        {item.student.className && (
                          <>
                            <span className="h-1 w-1 rounded-full bg-border" />
                            <span>{item.student.className}</span>
                          </>
                        )}
                      </div>
                      <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-text-muted">
                        <GraduationCap className="h-3 w-3" />
                        {item.student.schoolName}
                        {item.student.major
                          ? ` · ${item.student.major}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:flex-col sm:items-end">
                    <Badge
                      tone={statusMeta.tone}
                      className="gap-1.5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                    >
                      <StatusIcon className="h-3 w-3" />
                      {statusMeta.label}
                    </Badge>
                    {item.earlyLeave && (
                      <Badge tone="warning" className="text-[10px]">
                        Pulang lebih awal
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 border-y border-border bg-surface-muted/40 sm:grid-cols-4">
                  <Metric
                    label="Masuk"
                    value={item.checkIn ?? "—"}
                    className="border-b border-r border-border sm:border-b-0"
                  />
                  <Metric
                    label="Pulang"
                    value={item.checkOut ?? "—"}
                    className="border-b border-border sm:border-b-0 sm:border-r"
                  />
                  <Metric
                    label="Durasi"
                    value={formatDuration(item.checkIn, item.checkOut)}
                    className="border-r border-border"
                  />
                  <Metric label="Bukti" value={evidence} />
                </div>

                {item.note && (
                  <div className="flex gap-2.5 border-b border-border bg-warning-soft/35 px-5 py-3 text-xs leading-relaxed text-warning sm:px-6">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <p>
                      <span className="font-semibold">Catatan:</span> {item.note}
                    </p>
                  </div>
                )}

                <div className="grid gap-5 px-5 py-5 sm:grid-cols-2 sm:px-6">
                  <section>
                    <div className="mb-2.5 flex items-center justify-between gap-3">
                      <h4 className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                        <Camera className="h-3.5 w-3.5" /> Foto absensi
                      </h4>
                      {item.hasPhoto && (
                        <span className="text-[10px] text-text-muted">
                          Bukti kehadiran
                        </span>
                      )}
                    </div>
                    {item.hasPhoto ? (
                      <AttendancePhoto attendanceId={item.id} />
                    ) : (
                      <PhotoPlaceholder />
                    )}
                  </section>

                  <section>
                    <div className="mb-2.5 flex items-center justify-between gap-3">
                      <h4 className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                        <MapPin className="h-3.5 w-3.5" /> Lokasi absen
                      </h4>
                      {item.latitude != null && (
                        <span className="text-[10px] text-text-muted">
                          Titik koordinat
                        </span>
                      )}
                    </div>
                    <LocationBlock
                      latitude={item.latitude}
                      longitude={item.longitude}
                    />
                  </section>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <Card className="flex items-center justify-between gap-2 px-4 py-3">
          {pagination.page > 1 ? (
            <Link href={pageHref(pagination.page - 1)} className={NAV_BTN}>
              <ChevronLeft className="h-3.5 w-3.5" /> Sebelumnya
            </Link>
          ) : (
            <span className={NAV_BTN_DISABLED}>
              <ChevronLeft className="h-3.5 w-3.5" /> Sebelumnya
            </span>
          )}

          <span className="text-xs font-medium text-text-muted">
            Halaman {pagination.page} / {pagination.totalPages}
          </span>

          {pagination.page < pagination.totalPages ? (
            <Link href={pageHref(pagination.page + 1)} className={NAV_BTN}>
              Berikutnya <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span className={NAV_BTN_DISABLED}>
              Berikutnya <ChevronRight className="h-3.5 w-3.5" />
            </span>
          )}
        </Card>
      )}
    </div>
  );
}
