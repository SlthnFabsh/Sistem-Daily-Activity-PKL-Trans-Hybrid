"use client";

import { useState } from "react";
import { useActionForm } from "@/lib/use-action-form";
import { LogIn, LogOut } from "lucide-react";
import type { ActionResult } from "@/lib/action-result";
import { checkInWithMedia, checkOutWithMedia, submitLeave } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";

const initialState: ActionResult = { ok: false };

type FormAction = (formData: FormData) => void;

export type AttendanceView = {
  status: "HADIR" | "TERLAMBAT" | "IZIN" | "SAKIT";
  checkIn: string | null;
  checkOut: string | null;
  earlyLeave: boolean;
  note: string | null;
};

const STATUS_LABEL: Record<AttendanceView["status"], string> = {
  HADIR: "Hadir",
  TERLAMBAT: "Terlambat",
  IZIN: "Izin",
  SAKIT: "Sakit",
};

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
  const [inState, inAction, inPending] = useActionForm(checkInWithMedia, initialState);
  const [outState, outAction, outPending] = useActionForm(checkOutWithMedia, initialState);
  const [leaveState, leaveAction, leavePending] = useActionForm(submitLeave, initialState);

  const isPresent = today?.status === "HADIR" || today?.status === "TERLAMBAT";

  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-text">Absensi hari ini</h2>
      <p className="mt-0.5 text-xs text-text-muted">
        {todayLabel} · {divisionName} · Jam kerja {workStart}–{workEnd} WIB
      </p>

      <div className="mt-3 space-y-2">
        {inState.message && (
          <Notice tone={inState.ok ? "info" : "error"}>{inState.message}</Notice>
        )}
        {leaveState.message && (
          <Notice tone={leaveState.ok ? "info" : "error"}>{leaveState.message}</Notice>
        )}
      </div>

      {today === null ? (
        <div className="mt-4 space-y-4">
          <CheckInWithMedia formAction={inAction} inPending={inPending} />

          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="h-px flex-1 bg-border" />
            atau ajukan Izin/Sakit
            <span className="h-px flex-1 bg-border" />
          </div>

          <form action={leaveAction} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">Jenis</span>
              <select
                name="status"
                defaultValue="IZIN"
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-primary"
              >
                <option value="IZIN">Izin</option>
                <option value="SAKIT">Sakit</option>
              </select>
              {leaveState.fieldErrors?.status?.[0] && (
                <span className="mt-1 block text-xs text-red-600">
                  {leaveState.fieldErrors.status[0]}
                </span>
              )}
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">Keterangan (wajib)</span>
              <textarea
                name="note"
                rows={3}
                placeholder="Tulis alasan izin atau sakit"
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text outline-none placeholder:text-text-muted/60 focus:border-primary"
              />
              {leaveState.fieldErrors?.note?.[0] && (
                <span className="mt-1 block text-xs text-red-600">
                  {leaveState.fieldErrors.note[0]}
                </span>
              )}
            </label>
            <Button type="submit" variant="secondary" disabled={leavePending} className="w-full">
              {leavePending ? "Menyimpan..." : "Kirim Izin/Sakit"}
            </Button>
          </form>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={today.status === "HADIR" ? "primary" : "neutral"}>
              {STATUS_LABEL[today.status]}
            </Badge>
            {today.earlyLeave && (
              <span className="text-xs text-text-muted">Pulang lebih awal</span>
            )}
          </div>

          {today.note && (
            <p className="text-sm text-text-muted">Keterangan: {today.note}</p>
          )}

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border p-3">
              <dt className="text-xs text-text-muted">Jam masuk</dt>
              <dd className="mt-0.5 font-semibold text-text">{today.checkIn ?? "-"}</dd>
            </div>
            <div className="rounded-xl border border-border p-3">
              <dt className="text-xs text-text-muted">Jam pulang</dt>
              <dd className="mt-0.5 font-semibold text-text">{today.checkOut ?? "-"}</dd>
            </div>
          </dl>

          {isPresent && today.checkOut && (
            <div className="space-y-2">
              {!hasLogToday && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <p className="text-xs font-medium text-amber-700">
                    ⚠️ Anda belum mengirim log aktivitas hari ini
                  </p>
                  <p className="mt-0.5 text-xs text-amber-600">
                    Silakan isi dan kirim log aktivitas di menu{" "}
                    <a href="/student/log" className="font-semibold underline hover:text-amber-800">
                      Log Aktivitas
                    </a>{" "}
                    terlebih dahulu sebelum absen pulang.
                  </p>
                </div>
              )}
              <CheckOutWithMedia
                formAction={outAction}
                outPending={outPending}
                hasLogToday={hasLogToday}
              />
              {outState.message && (
                <Notice tone={outState.ok ? "info" : "error"}>{outState.message}</Notice>
              )}
            </div>
          )}

          {isPresent && !today.checkOut && (
            <p className="text-xs text-text-muted">
              Absensi hari ini sudah lengkap dan tidak bisa diubah. Koreksi hanya oleh HRD.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

function CheckInWithMedia({
  formAction,
  inPending,
}: {
  formAction: (formData: FormData) => void;
  inPending: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [camActive, setCamActive] = useState(false);

  async function openCamera() {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Browser tidak mendukung akses kamera.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      const video = document.getElementById("checkin-video") as HTMLVideoElement | null;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setCamActive(true);
      (window as any).__checkinStream = stream;
    } catch (err: any) {
      const message =
        err?.message ||
        (err instanceof Error ? err.message : "Gagal membuka kamera.");
      setCameraError(message);
    }
  }

  function capturePhoto() {
    const video = document.getElementById("checkin-video") as HTMLVideoElement | null;
    if (!video || !video.readyState) {
      setCameraError("Kamera belum siap.");
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
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("Gagal mengambil foto.");
          return;
        }
        const file = new File([blob], "selfie.jpg", { type: blob.type || "image/jpeg" });
        setFile(file);
        setPreview(URL.createObjectURL(file));
        stopCamera();
      },
      "image/jpeg",
      0.9,
    );
  }

  function stopCamera() {
    const stream = (window as any).__checkinStream as MediaStream | undefined;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      (window as any).__checkinStream = undefined;
    }
    setCamActive(false);
    const video = document.getElementById("checkin-video") as HTMLVideoElement | null;
    if (video) video.srcObject = null;
  }

  function pickFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      setFile(f);
      setPreview(URL.createObjectURL(f));
      stopCamera();
    };
    input.click();
  }

  async function getLocation() {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Browser tidak mendukung GPS.");
      return;
    }
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        })
      );
      setLat(pos.coords.latitude.toFixed(6));
      setLng(pos.coords.longitude.toFixed(6));
    } catch (err: any) {
      setGeoError(err?.message ?? "Gagal mengambil lokasi.");
    }
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="latitude" value={lat} />
      <input type="hidden" name="longitude" value={lng} />
      <input type="file" name="photo" className="sr-only" />

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-text">Foto lokasi (wajib)</span>

        {preview ? (
          <div className="relative inline-block">
            <img
              src={preview}
              alt="preview"
              className="max-h-48 rounded-xl border border-border object-cover"
            />
          </div>
        ) : camActive ? (
          <div className="relative overflow-hidden rounded-xl border border-border bg-black">
            <video
              id="checkin-video"
              autoPlay
              playsInline
              muted
              className="w-full max-h-52 object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full border-2 border-white/70 bg-black/40 px-3 py-1 text-xs font-semibold text-white">
                Aktifkan GPS lalu tekan foto
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={openCamera}
              disabled={preview ? true : camActive}
              className="px-3 py-1.5"
            >
              {camActive ? "Buka kamera" : "Buka kamera depan"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={pickFile}
              disabled={preview ? true : !camActive}
              className="px-3 py-1.5"
            >
              Pilih dari galeri
            </Button>
          </div>
        )}

        {camActive && (
          <Button
            type="button"
            variant="primary"
            onClick={capturePhoto}
            className="mt-2 w-full"
          >
            <span className="text-lg leading-none">📸</span> Ambil foto
          </Button>
        )}

        <Button
          type="button"
          variant="secondary"
          onClick={getLocation}
          disabled={lat && lng ? true : false}
          className="mt-2 px-3 py-1.5"
        >
          {lat && lng ? "Lokasi tersetel" : "Ambil GPS"}
        </Button>

        {geoError && <p className="mt-1 text-xs text-red-600">{geoError}</p>}
        {cameraError && <p className="mt-1 text-xs text-red-600">{cameraError}</p>}
      </label>

      {preview && (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="preview"
            className="max-h-32 rounded-xl border border-border object-cover"
          />
        </div>
      )}

      {lat && lng && (
        <div className="rounded-xl border border-border bg-slate-50 px-3 py-2 text-sm">
          <p className="text-xs text-text-muted">Koordinat</p>
          <p className="font-mono text-text">{lat}°, {lng}°</p>
        </div>
      )}

      <input
        type="file"
        name="photo"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setFile(f);
          setPreview(URL.createObjectURL(f));
          stopCamera();
        }}
      />

      <Button
        type="submit"
        disabled={inPending || !file || !lat || !lng}
        className="w-full"
      >
        {inPending ? "Memproses..." : "Absen masuk + foto & GPS"}
      </Button>
      <p className="text-xs text-text-muted">
        Aktifkan GPS dan ambil selfie saat absen masuk.
      </p>
    </form>
  );
}
function CheckOutWithMedia({
  formAction,
  outPending,
  hasLogToday,
}: {
  formAction: (formData: FormData) => void;
  outPending: boolean;
  hasLogToday: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [camActive, setCamActive] = useState(false);

  async function openCamera() {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Browser tidak mendukung akses kamera.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      const video = document.getElementById("checkout-video") as HTMLVideoElement | null;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setCamActive(true);
      (window as any).__checkoutStream = stream;
    } catch (err: any) {
      const message =
        err?.message ||
        (err instanceof Error ? err.message : "Gagal membuka kamera.");
      setCameraError(message);
    }
  }

  function capturePhoto() {
    const video = document.getElementById("checkout-video") as HTMLVideoElement | null;
    if (!video || !video.readyState) {
      setCameraError("Kamera belum siap.");
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
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("Gagal mengambil foto.");
          return;
        }
        const file = new File([blob], "selfie.jpg", { type: blob.type || "image/jpeg" });
        setFile(file);
        setPreview(URL.createObjectURL(file));
        stopCamera();
      },
      "image/jpeg",
      0.9,
    );
  }

  function stopCamera() {
    const stream = (window as any).__checkoutStream as MediaStream | undefined;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      (window as any).__checkoutStream = undefined;
    }
    setCamActive(false);
    const video = document.getElementById("checkout-video") as HTMLVideoElement | null;
    if (video) video.srcObject = null;
  }

  function pickFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      setFile(f);
      setPreview(URL.createObjectURL(f));
      stopCamera();
    };
    input.click();
  }

  async function getLocation() {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Browser tidak mendukung GPS.");
      return;
    }
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        })
      );
      setLat(pos.coords.latitude.toFixed(6));
      setLng(pos.coords.longitude.toFixed(6));
    } catch (err: any) {
      setGeoError(err?.message ?? "Gagal mengambil lokasi.");
    }
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="latitude" value={lat} />
      <input type="hidden" name="longitude" value={lng} />
      <input type="file" name="photo" className="sr-only" />

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-text">Foto lokasi (wajib)</span>

        {preview ? (
          <div className="relative inline-block">
            <img
              src={preview}
              alt="preview"
              className="max-h-48 rounded-xl border border-border object-cover"
            />
          </div>
        ) : camActive ? (
          <div className="relative overflow-hidden rounded-xl border border-border bg-black">
            <video
              id="checkout-video"
              autoPlay
              playsInline
              muted
              className="w-full max-h-52 object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full border-2 border-white/70 bg-black/40 px-3 py-1 text-xs font-semibold text-white">
                Aktifkan GPS lalu tekan foto
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={openCamera}
              disabled={preview ? true : camActive}
              className="px-3 py-1.5"
            >
              {camActive ? "Buka kamera" : "Buka kamera depan"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={pickFile}
              disabled={preview ? true : !camActive}
              className="px-3 py-1.5"
            >
              Pilih dari galeri
            </Button>
          </div>
        )}

        {camActive && (
          <Button
            type="button"
            variant="primary"
            onClick={capturePhoto}
            className="mt-2 w-full"
          >
            <span className="text-lg leading-none">📸</span> Ambil foto
          </Button>
        )}

        <Button
          type="button"
          variant="secondary"
          onClick={getLocation}
          disabled={lat && lng ? true : false}
          className="mt-2 px-3 py-1.5"
        >
          {lat && lng ? "Lokasi tersetel" : "Ambil GPS"}
        </Button>

        {geoError && <p className="mt-1 text-xs text-red-600">{geoError}</p>}
        {cameraError && <p className="mt-1 text-xs text-red-600">{cameraError}</p>}
      </label>

      {preview && (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="preview"
            className="max-h-32 rounded-xl border border-border object-cover"
          />
        </div>
      )}

      {lat && lng && (
        <div className="rounded-xl border border-border bg-slate-50 px-3 py-2 text-sm">
          <p className="text-xs text-text-muted">Koordinat</p>
          <p className="font-mono text-text">
            {lat}°, {lng}°
          </p>
        </div>
      )}

      <input
        type="file"
        name="photo"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setFile(f);
          setPreview(URL.createObjectURL(f));
          stopCamera();
        }}
      />

      <Button
        type="submit"
        disabled={outPending || !hasLogToday || !file || !lat || !lng}
        className="w-full"
      >
        {outPending ? "Memproses..." : "Absen pulang + foto & GPS"}
      </Button>
      <p className="text-xs text-text-muted">
        Foto & GPS wajib saat absen pulang. Pastikan log aktivitas sudah dikirim.
      </p>
    </form>
  );
}
