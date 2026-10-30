"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarCheck,
  Camera,
  CheckCircle2,
  Clock3,
  FileText,
  HeartPulse,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import { useActionForm } from "@/lib/use-action-form";
import type { ActionResult } from "@/lib/action-result";
import { checkInWithMedia, checkOutWithMedia, submitLeave } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";

const initialState: ActionResult = { ok: false };

// Tempelkan File ke sebuah <input type="file"> agar ikut terkirim bersama FormData.
function putFileIntoInput(input: HTMLInputElement | null, file: File) {
  if (!input) return;
  try {
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
  } catch {
    // DataTransfer tidak didukung browser ini; abaikan.
  }
}

type FormAction = (formData: FormData) => void;

/**
 * Minta kamera depan untuk selfie absen. Coba `exact` dulu supaya browser
 * benar-benar memilih kamera depan; kalau perangkat/browser tidak mendukung,
 * turun ke `ideal` agar kamera apa pun tetap bisa dipakai.
 */
async function requestSelfieStream(): Promise<MediaStream> {
  const video = { width: { ideal: 1280 }, height: { ideal: 720 } };
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { ...video, facingMode: { exact: "user" } },
    });
  } catch (err) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { ...video, facingMode: { ideal: "user" } },
      });
    } catch {
      throw err;
    }
  }
}

export type AttendanceView = {
  status: "HADIR" | "TERLAMBAT" | "IZIN" | "SAKIT";
  checkIn: string | null;
  checkOut: string | null;
  earlyLeave: boolean;
  note: string | null;
};

type StatusTone = "success" | "warning" | "info" | "danger";

const STATUS_META: Record<
  AttendanceView["status"],
  { label: string; tone: StatusTone; Icon: typeof CheckCircle2 }
> = {
  HADIR: { label: "Hadir", tone: "success", Icon: CheckCircle2 },
  TERLAMBAT: { label: "Terlambat", tone: "warning", Icon: Clock3 },
  IZIN: { label: "Izin", tone: "info", Icon: FileText },
  SAKIT: { label: "Sakit", tone: "danger", Icon: HeartPulse },
};

function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
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
    <div className={`px-4 py-3.5 sm:px-5 ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-text">
        {value}
      </p>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Camera;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-3.5 flex items-start gap-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-text">
          {title}
        </h3>
        <p className="mt-0.5 text-xs leading-relaxed text-text-muted">
          {description}
        </p>
      </div>
    </div>
  );
}

function InlineError({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs leading-relaxed text-danger">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function VerificationTile({
  done,
  icon: Icon,
  label,
  detail,
}: {
  done: boolean;
  icon: typeof Camera;
  label: string;
  detail: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${
        done
          ? "border-success/20 bg-success-soft/50"
          : "border-border bg-surface-muted/40"
      }`}
    >
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white shadow-sm ${
          done ? "text-success" : "text-text-muted"
        }`}
      >
        {done ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-text">{label}</p>
        <p
          className={`mt-0.5 truncate text-[10px] ${
            done ? "text-success" : "text-text-muted"
          }`}
        >
          {detail}
        </p>
      </div>
    </div>
  );
}

function AttendanceMediaForm({
  mode,
  formAction,
  pending,
}: {
  mode: "in" | "out";
  formAction: FormAction;
  pending: boolean;
}) {
  const isCheckIn = mode === "in";
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [openingCamera, setOpeningCamera] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [camActive, setCamActive] = useState(false);
  const [camTrackActive, setCamTrackActive] = useState(false);
  const [mirrored, setMirrored] = useState(true);
  const localStream = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasGeo = Boolean(lat && lng);

  // Bersihkan object URL preview ketika foto diganti / komponen dilepas.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Pastikan kamera tidak tertinggal aktif saat pengguna pindah halaman.
  useEffect(() => {
    return () => {
      localStream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function applyPhoto(nextFile: File) {
    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
    setCameraError(null);
    putFileIntoInput(fileInputRef.current, nextFile);
  }

  function resetPhoto() {
    setFile(null);
    setPreview(null);
    setCameraError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    stopCamera();
  }

  async function openCamera() {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Browser tidak mendukung akses kamera.");
      return;
    }
    if (camActive) {
      setCameraError("Kamera sudah dibuka.");
      return;
    }
    setOpeningCamera(true);
    try {
      const stream = await requestSelfieStream();
      setMirrored(
        stream.getVideoTracks()[0]?.getSettings().facingMode !== "environment"
      );
      localStream.current = stream;
      setCamActive(true);
    } catch (error: unknown) {
      setCameraError(errorMessage(error, "Gagal membuka kamera."));
    } finally {
      setOpeningCamera(false);
    }
  }

  useEffect(() => {
    if (!camActive) return;
    const stream = localStream.current;
    const video = videoRef.current;
    if (!stream || !video) return;
    video.srcObject = stream;
    video.play().catch(() => {});
    const track = stream.getVideoTracks()[0];
    if (!track) {
      setCamTrackActive(false);
      return;
    }
    const syncTrackState = () => {
      setCamTrackActive(track.readyState === "live" && !track.muted);
    };
    syncTrackState();
    track.addEventListener("ended", syncTrackState);
    track.addEventListener("mute", syncTrackState);
    track.addEventListener("unmute", syncTrackState);
    return () => {
      track.removeEventListener("ended", syncTrackState);
      track.removeEventListener("mute", syncTrackState);
      track.removeEventListener("unmute", syncTrackState);
    };
  }, [camActive]);

  async function waitForFrameReady(video: HTMLVideoElement, timeoutMs = 3500) {
    if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
      return true;
    }
    return new Promise<boolean>((resolve) => {
      let settled = false;

      const onReady = () => {
        if (settled) return;
        if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
          settled = true;
          resolve(true);
        }
      };

      video.addEventListener("loadeddata", onReady, { once: true });
      video.addEventListener("canplay", onReady, { once: true });
      video.addEventListener(
        "error",
        () => {
          if (settled) return;
          settled = true;
          resolve(false);
        },
        { once: true }
      );

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve(false);
      }, timeoutMs);

      if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
        clearTimeout(timer);
        if (settled) return;
        settled = true;
        resolve(true);
      }
    });
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!camActive || !video) {
      setCameraError("Kamera belum siap. Buka kamera dulu.");
      return;
    }
    if (!camTrackActive) {
      setCameraError(
        localStream.current && localStream.current.getVideoTracks().length === 0
          ? "Kamera tidak aktif. Buka kamera dulu, lalu coba lagi."
          : "Kamera terbuka tapi tidak aktif. Coba izinkan akses kamera lagi, lalu coba lagi."
      );
      return;
    }
    if (!(await waitForFrameReady(video, 8000))) {
      setCameraError(
        video.readyState >= 2
          ? "Kamera terbuka tapi tidak bisa pakai frame-nya. Coba izinkan akses kamera lagi, lalu coba lagi."
          : "Video kamera belum siap. Tunggu sebentar, lalu coba lagi."
      );
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCameraError("Gagal membuat preview foto.");
      return;
    }
    if (mirrored) {
      // Cerminkan seperti preview selfie (kamera depan tampil seperti di cermin).
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    } else {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("Gagal mengambil foto.");
          return;
        }
        const mime = blob.type?.startsWith("image") ? blob.type : "image/jpeg";
        const captured = new File([blob], "selfie.jpg", { type: mime });
        applyPhoto(captured);
        stopCamera();
      },
      "image/jpeg",
      0.9
    );
  }

  function stopCamera() {
    const stream = localStream.current;
    if (stream) {
      stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      localStream.current = null;
    }
    setCamActive(false);
    setCamTrackActive(false);
    const video = videoRef.current;
    if (video) video.srcObject = null;
  }

  async function getLocation() {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Browser tidak mendukung GPS.");
      return;
    }
    setGeoLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        })
      );
      setLat(position.coords.latitude.toFixed(6));
      setLng(position.coords.longitude.toFixed(6));
    } catch (error: unknown) {
      setGeoError(errorMessage(error, "Gagal mengambil lokasi."));
    } finally {
      setGeoLoading(false);
    }
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="latitude" value={lat} />
      <input type="hidden" name="longitude" value={lng} />

      <div className="rounded-xl border border-border bg-surface-muted/30 p-3 sm:p-4">
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-border bg-surface-muted">
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Preview foto absensi"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/65 via-black/20 to-transparent px-3 pb-2.5 pt-8">
                <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                  <CheckCircle2 className="h-3 w-3" /> Foto siap
                </span>
                <button
                  type="button"
                  onClick={resetPhoto}
                  className="rounded-lg border border-white/20 bg-white/90 px-2.5 py-1.5 text-[10px] font-semibold text-text shadow-sm transition-colors hover:bg-white"
                >
                  Ambil ulang
                </button>
              </div>
            </>
          ) : camActive ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${
                  mirrored ? "-scale-x-100" : ""
                }`}
              />
              <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  Kamera aktif
                </span>
                <button
                  type="button"
                  onClick={stopCamera}
                  aria-label="Tutup kamera"
                  className="grid h-7 w-7 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="absolute inset-x-0 bottom-0 flex justify-center pb-3">
                <Button
                  type="button"
                  onClick={capturePhoto}
                  className="text-xs shadow-lg"
                >
                  <Camera className="h-4 w-4" /> Ambil foto
                </Button>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-white text-text-muted shadow-sm">
                <Camera className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-semibold text-text">
                Belum ada foto
              </p>
              <p className="mt-1 max-w-[240px] text-[11px] leading-relaxed text-text-muted">
                Ambil selfie dengan wajah terlihat jelas dan pencahayaan cukup.
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={openCamera}
                disabled={openingCamera}
                className="mt-3 text-xs"
              >
                {openingCamera ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                {openingCamera ? "Membuka kamera..." : "Buka kamera"}
              </Button>
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={getLocation}
          disabled={geoLoading}
          className="mt-3 w-full text-xs"
        >
          {geoLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : hasGeo ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
          {geoLoading
            ? "Mengambil lokasi..."
            : hasGeo
              ? "Perbarui lokasi"
              : "Ambil lokasi GPS"}
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <VerificationTile
          done={Boolean(file)}
          icon={Camera}
          label="Foto selfie"
          detail={file ? "Siap dilampirkan" : "Wajib diambil"}
        />
        <VerificationTile
          done={hasGeo}
          icon={MapPin}
          label="Lokasi GPS"
          detail={hasGeo ? `${lat}, ${lng}` : "Wajib diaktifkan"}
        />
      </div>

      {geoError && <InlineError>{geoError}</InlineError>}
      {cameraError && <InlineError>{cameraError}</InlineError>}

      <Button
        type="submit"
        disabled={pending || !file || !hasGeo}
        className="w-full"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Memproses...
          </>
        ) : isCheckIn ? (
          <>
            <LogIn className="h-4 w-4" /> Absen masuk
          </>
        ) : (
          <>
            <LogOut className="h-4 w-4" /> Absen pulang
          </>
        )}
      </Button>
      <p className="text-center text-[11px] leading-relaxed text-text-muted">
        {isCheckIn
          ? "Foto selfie dan lokasi GPS wajib aktif saat absen masuk."
          : "Foto selfie dan lokasi GPS wajib aktif saat absen pulang."}
      </p>

      <input
        ref={fileInputRef}
        type="file"
        name="photo"
        accept="image/*"
        capture="user"
        className="sr-only"
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (!selected) return;
          applyPhoto(selected);
          stopCamera();
        }}
      />
    </form>
  );
}

function LeaveForm({
  formAction,
  state,
  pending,
}: {
  formAction: FormAction;
  state: ActionResult;
  pending: boolean;
}) {
  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border border-border bg-surface-muted/30 p-4"
    >
      {state.message && (
        <Notice tone={state.ok ? "info" : "error"}>{state.message}</Notice>
      )}

      <Select
        label="Jenis pengajuan"
        name="status"
        defaultValue="IZIN"
        error={state.fieldErrors?.status?.[0]}
      >
        <option value="IZIN">Izin</option>
        <option value="SAKIT">Sakit</option>
      </Select>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-text">
          Keterangan <span className="text-danger">*</span>
        </span>
        <textarea
          name="note"
          rows={4}
          placeholder="Tulis alasan izin atau sakit"
          className="w-full resize-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-text shadow-sm outline-none transition-colors placeholder:text-text-muted/60 hover:border-primary/40 focus:border-primary"
        />
        {state.fieldErrors?.note?.[0] && (
          <span className="mt-1 block text-xs text-danger">
            {state.fieldErrors.note[0]}
          </span>
        )}
      </label>

      <Button
        type="submit"
        variant="secondary"
        disabled={pending}
        className="w-full"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Mengirim...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> Kirim pengajuan
          </>
        )}
      </Button>
      <p className="text-[11px] leading-relaxed text-text-muted">
        Pengajuan izin atau sakit akan menggantikan absensi masuk untuk hari ini.
      </p>
    </form>
  );
}

function LeaveSummary({ today }: { today: AttendanceView }) {
  const meta = STATUS_META[today.status];
  const Icon = meta.Icon;
  return (
    <div className="flex gap-3 rounded-xl border border-border bg-surface-muted/40 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-primary shadow-sm">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text">
          {meta.label} tercatat
        </p>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">
          Pengajuan Anda untuk hari ini sudah tersimpan.
        </p>
        {today.note && (
          <div className="mt-3 rounded-lg border border-border bg-white px-3 py-2 text-xs leading-relaxed text-text">
            <span className="font-semibold">Keterangan:</span> {today.note}
          </div>
        )}
      </div>
    </div>
  );
}

function LogWarning() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-warning/25 bg-warning-soft/50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-warning shadow-sm">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-warning">
            Log aktivitas belum dikirim
          </p>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            Lengkapi log aktivitas hari ini terlebih dahulu sebelum absen pulang.
          </p>
        </div>
      </div>
      <Link
        href="/student/log"
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-warning/30 bg-white px-3.5 py-2 text-xs font-semibold text-warning transition-colors hover:bg-warning-soft"
      >
        Isi log aktivitas <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function CompletedState({ today }: { today: AttendanceView }) {
  return (
    <div className="flex gap-3 rounded-xl border border-success/20 bg-success-soft/50 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-success shadow-sm">
        <CheckCircle2 className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-semibold text-success">
          Absensi hari ini lengkap
        </p>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">
          Masuk <span className="font-semibold text-text">{today.checkIn}</span>{" "}
          · Pulang{" "}
          <span className="font-semibold text-text">{today.checkOut}</span>
          {today.earlyLeave ? " · Pulang lebih awal" : ""}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
          Koreksi absensi hanya dapat dilakukan oleh HRD.
        </p>
      </div>
    </div>
  );
}

export function AbsensiPanel({
  todayLabel,
  divisionName,
  workStart,
  workEnd,
  today,
  hasLogToday,
}: {
  todayLabel: string;
  divisionName: string;
  workStart: string;
  workEnd: string;
  today: AttendanceView | null;
  hasLogToday: boolean;
}) {
  const [inState, inAction, inPending] = useActionForm(
    checkInWithMedia,
    initialState
  );
  const [outState, outAction, outPending] = useActionForm(
    checkOutWithMedia,
    initialState
  );
  const [leaveState, leaveAction, leavePending] = useActionForm(
    submitLeave,
    initialState
  );

  const isPresent =
    today?.status === "HADIR" || today?.status === "TERLAMBAT";
  const isLeave = today?.status === "IZIN" || today?.status === "SAKIT";
  const meta = today ? STATUS_META[today.status] : null;
  const StatusIcon = meta?.Icon;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-gradient-to-r from-primary-soft/60 via-white to-white px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-primary/10 bg-white text-primary shadow-sm">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                Absensi hari ini
              </p>
              <h2 className="mt-1 text-[15px] font-semibold tracking-tight text-text">
                {todayLabel}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-text-muted">
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> {divisionName}
                </span>
                <span className="h-1 w-1 rounded-full bg-border" />
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3 w-3" /> {workStart}–{workEnd} WIB
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {meta && StatusIcon ? (
              <Badge
                tone={meta.tone}
                className="gap-1.5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
              >
                <StatusIcon className="h-3 w-3" /> {meta.label}
              </Badge>
            ) : (
              <Badge
                tone="neutral"
                className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
              >
                Belum absen
              </Badge>
            )}
            {today?.earlyLeave && (
              <Badge tone="warning" className="text-[10px]">
                Pulang lebih awal
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 border-b border-border bg-surface-muted/30">
        <Metric label="Masuk" value={today?.checkIn ?? "—"} />
        <Metric
          label="Pulang"
          value={today?.checkOut ?? "—"}
          className="border-l border-border"
        />
        <Metric
          label="Durasi"
          value={today ? formatDuration(today.checkIn, today.checkOut) : "—"}
          className="border-l border-border"
        />
      </div>

      <div className="px-5 py-5 sm:px-6 sm:py-6">
        {today === null ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-8">
            <section>
              <SectionHeading
                icon={Camera}
                title="Absen masuk"
                description="Ambil selfie dan aktifkan lokasi GPS untuk verifikasi kehadiran."
              />
              {inState.message && (
                <div className="mb-3">
                  <Notice tone={inState.ok ? "info" : "error"}>
                    {inState.message}
                  </Notice>
                </div>
              )}
              <AttendanceMediaForm
                mode="in"
                formAction={inAction}
                pending={inPending}
              />
            </section>

            <section className="lg:border-l lg:border-border lg:pl-8">
              <SectionHeading
                icon={FileText}
                title="Tidak masuk hari ini?"
                description="Ajukan izin atau sakit jika Anda tidak dapat hadir."
              />
              <LeaveForm
                formAction={leaveAction}
                state={leaveState}
                pending={leavePending}
              />
            </section>
          </div>
        ) : (
          <div className="space-y-4">
            {isLeave && <LeaveSummary today={today} />}

            {isPresent && !today.checkOut && (
              <>
                {!hasLogToday ? (
                  <LogWarning />
                ) : (
                  <>
                    <SectionHeading
                      icon={LogOut}
                      title="Absen pulang"
                      description="Ambil selfie dan lokasi GPS untuk menutup absensi hari ini."
                    />
                    {outState.message && (
                      <div className="mb-3">
                        <Notice tone={outState.ok ? "info" : "error"}>
                          {outState.message}
                        </Notice>
                      </div>
                    )}
                    <AttendanceMediaForm
                      mode="out"
                      formAction={outAction}
                      pending={outPending}
                    />
                  </>
                )}
              </>
            )}

            {isPresent && today.checkOut && <CompletedState today={today} />}
          </div>
        )}
      </div>
    </Card>
  );
}
