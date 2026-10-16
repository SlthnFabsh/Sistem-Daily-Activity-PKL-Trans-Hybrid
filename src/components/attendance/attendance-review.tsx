"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarCheck, Filter, MapPin, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AttendancePhoto } from "./attendance-photo";
import type {
  AttendanceActiveFilters,
  AttendanceReviewItem,
  AttendanceStudentOption,
} from "./types";

const STATUS_LABEL: Record<AttendanceReviewItem["status"], string> = {
  HADIR: "Hadir",
  TERLAMBAT: "Terlambat",
  IZIN: "Izin",
  SAKIT: "Sakit",
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

function LocationBlock({
  latitude,
  longitude,
}: {
  latitude: number | null;
  longitude: number | null;
}) {
  if (latitude == null || longitude == null) {
    return (
      <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs italic text-text-muted">
        Tidak ada data lokasi pada absensi ini.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-white p-3 text-xs">
      <p className="font-mono text-text">
        {formatCoord(latitude)}°, {formatCoord(longitude)}°
      </p>
      <a
        href={mapsUrl(latitude, longitude)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 font-medium text-text transition-colors hover:bg-primary-soft hover:text-primary"
      >
        <MapPin className="h-3.5 w-3.5" /> Buka di Google Maps
      </a>
      <details className="mt-2">
        <summary className="cursor-pointer font-medium text-primary">
          Lihat peta
        </summary>
        <iframe
          src={mapEmbedUrl(latitude, longitude)}
          title="Peta lokasi absensi"
          loading="lazy"
          className="mt-2 h-48 w-full rounded-lg border border-border"
        />
      </details>
    </div>
  );
}

export function AttendanceReview({
  items,
  students,
  activeFilters,
  divisionName,
}: {
  items: AttendanceReviewItem[];
  students: AttendanceStudentOption[];
  activeFilters: AttendanceActiveFilters;
  divisionName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [studentId, setStudentId] = useState(activeFilters.studentId ?? "all");
  const [status, setStatus] = useState(activeFilters.status ?? "all");
  const [fromDate, setFromDate] = useState(activeFilters.fromDate ?? "");
  const [toDate, setToDate] = useState(activeFilters.toDate ?? "");

  const hasActiveFilter =
    Boolean(activeFilters.studentId && activeFilters.studentId !== "all") ||
    Boolean(activeFilters.status && activeFilters.status !== "all") ||
    Boolean(activeFilters.fromDate) ||
    Boolean(activeFilters.toDate);

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

  const selectedStudent = students.find((s) => s.id === activeFilters.studentId);

  return (
    <div className="space-y-5">
      {/* Kartu Filter */}
      <Card className="p-4">
        <form onSubmit={handleFilterSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

          <div className="flex items-center justify-end gap-2 pt-1">
            {hasActiveFilter && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleReset}
                className="text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
            )}
            <Button type="submit" className="text-xs">
              <Filter className="h-3.5 w-3.5" /> Terapkan Filter
            </Button>
          </div>
        </form>
      </Card>

      {/* Ringkasan */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-text-muted">
        <span>
          Menampilkan <strong className="text-text">{items.length}</strong>{" "}
          data absensi
          {hasActiveFilter && (
            <span className="ml-2 text-primary">
              (Filter aktif:{" "}
              {selectedStudent ? selectedStudent.name : "Semua siswa"}
              {activeFilters.status && activeFilters.status !== "all"
                ? ` · ${STATUS_LABEL[activeFilters.status as AttendanceReviewItem["status"]] ?? activeFilters.status}`
                : ""}
              {activeFilters.fromDate ? ` · Dari ${activeFilters.fromDate}` : ""}
              {activeFilters.toDate ? ` · Sampai ${activeFilters.toDate}` : ""})
            </span>
          )}
        </span>
        {divisionName && (
          <span className="rounded-lg bg-primary-soft px-2.5 py-1 font-medium text-primary">
            Divisi: {divisionName}
          </span>
        )}
      </div>

      {/* Daftar Absensi */}
      {items.length === 0 ? (
        <Card className="py-12 text-center">
          <CalendarCheck className="mx-auto h-8 w-8 text-text-muted" />
          <p className="mt-2 text-sm font-medium text-text">
            Tidak ada data absensi
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {hasActiveFilter
              ? "Tidak ada data yang sesuai dengan filter yang dipilih."
              : "Belum ada absensi pada rentang tanggal ini."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text">
                    {item.student.name}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {item.formattedDate} · {item.student.divisionName}
                    {item.student.className
                      ? ` · ${item.student.className}`
                      : ""}
                  </p>
                  <p className="mt-0.5 text-[11px] text-text-muted">
                    {item.student.schoolName}
                    {item.student.nis ? ` · NIS ${item.student.nis}` : ""}
                  </p>
                </div>
                <Badge tone={item.status === "HADIR" ? "primary" : "neutral"}>
                  {STATUS_LABEL[item.status]}
                </Badge>
              </div>

              <p className="mt-2 text-xs text-text-muted">
                Masuk {item.checkIn ?? "-"} · Pulang {item.checkOut ?? "-"}
                {item.earlyLeave ? " · Pulang lebih awal" : ""}
              </p>
              {item.note && (
                <p className="mt-1 text-xs text-text-muted">{item.note}</p>
              )}

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-semibold text-text">
                    Foto absensi
                  </p>
                  {item.hasPhoto ? (
                    <AttendancePhoto attendanceId={item.id} />
                  ) : (
                    <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs italic text-text-muted">
                      Tidak ada foto pada absensi ini.
                    </p>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold text-text">
                    Lokasi absen
                  </p>
                  <LocationBlock
                    latitude={item.latitude}
                    longitude={item.longitude}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
