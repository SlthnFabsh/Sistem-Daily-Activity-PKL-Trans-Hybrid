"use client";

import { useEffect, useRef, useState } from "react";
import { useActionForm } from "@/lib/use-action-form";
import imageCompression from "browser-image-compression";
import { Lock, Paperclip, Pencil, Send, Trash2, Loader2 } from "lucide-react";
import type { ActionResult } from "@/lib/action-result";
import { endPending, startPending } from "@/lib/pending-store";
import {
  saveLogDraft,
  submitLog,
  updateSubmittedLog,
  deleteLogDraft,
  deleteAttachment,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";

const initialState: ActionResult = { ok: false };

type Attachment = {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
};

export function LogForm({
  logId,
  logStatus = "DRAFT",
  lockedByCheckout = false,
  defaultValues,
  attachments,
}: {
  logId?: string;
  logStatus?: "DRAFT" | "SUBMITTED";
  lockedByCheckout?: boolean;
  defaultValues?: {
    logDate: string;
    startTime: string;
    endTime: string;
    taskFrom: string;
    description: string;
    output?: string;
    obstacle?: string;
  };
  attachments: Attachment[];
}) {
  // Apakah form ini untuk log SUBMITTED yang bisa diedit
  const isEditableSubmitted = logStatus === "SUBMITTED" && !lockedByCheckout;
  // Apakah seluruh form dikunci (sudah checkout)
  const isLocked = logStatus === "SUBMITTED" && lockedByCheckout;

  const [draftState, draftAction, draftPending] = useActionForm(
    saveLogDraft,
    initialState
  );
  const [submitState, submitAction, submitPending] = useActionForm(
    submitLog,
    initialState
  );
  const [updateState, updateAction, updatePending] = useActionForm(
    updateSubmittedLog,
    initialState
  );
  const [deleteState, deleteAction, deletePending] = useActionForm(
    deleteLogDraft,
    initialState
  );
  const [deleteAttState, deleteAttAction] = useActionForm(
    deleteAttachment,
    initialState
  );

  const [showConfirm, setShowConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const formId = `log-form-${logId ?? "new"}`;

  // Unggah lampiran juga tampilkan overlay "Memproses..." global.
  useEffect(() => {
    if (!uploading) return;
    startPending();
    return endPending;
  }, [uploading]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadError(null);

    for (const file of Array.from(files)) {
      const ext = (file.name.split(".").pop() ?? "").toLowerCase();
      const allowed = ["jpg", "jpeg", "png", "pdf", "docx", "xlsx"];
      if (!allowed.includes(ext)) {
        setUploadError(`Tipe file "${file.name}" tidak diizinkan.`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setUploadError(`Ukuran file "${file.name}" melebihi 5 MB.`);
        continue;
      }

      try {
        let fileToUpload = file;
        if (file.type.startsWith("image/")) {
          fileToUpload = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          });
        }

        // Minta signed upload URL dari server via API.
        const res = await fetch("/api/log-upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            logId,
            fileName: file.name,
            fileType: fileToUpload.type,
            fileSize: fileToUpload.size,
          }),
        });
        const data = await res.json();

        if (!data.ok || !data.signedUrl) {
          setUploadError(data.message ?? "Gagal membuat tautan unggah.");
          continue;
        }

        // Upload langsung ke Supabase Storage.
        setUploading(true);
        const uploadRes = await fetch(data.signedUrl, {
          method: "PUT",
          body: fileToUpload,
          headers: { "Content-Type": fileToUpload.type },
        });
        setUploading(false);

        if (!uploadRes.ok) {
          setUploadError(`Gagal mengunggah "${file.name}".`);
          continue;
        }

        // Konfirmasi bahwa file benar-benar tersimpan sebelum mencatat metadata.
        const confirmRes = await fetch("/api/log-attachment/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            logId,
            filePath: data.filePath,
            fileName: file.name,
            fileType: fileToUpload.type,
            fileSize: fileToUpload.size,
          }),
        });
        const confirmData = await confirmRes.json();
        if (!confirmData.ok) {
          setUploadError(confirmData.message ?? "Gagal mengkonfirmasi lampiran.");
          continue;
        }

        window.location.reload();
      } catch (err) {
        setUploading(false);
        setUploadError(
          err instanceof Error ? err.message : "Gagal mengunggah file."
        );
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDeleteAttachment(attachmentId: string) {
    if (!confirm("Hapus lampiran ini?")) return;
    const fd = new FormData();
    fd.set("attachmentId", attachmentId);
    await deleteAttAction(fd);
  }

  async function handleViewAttachment(attachmentId: string) {
    const res = await fetch(
      `/api/log-attachment?attachmentId=${encodeURIComponent(attachmentId)}`
    );
    const data = await res.json();
    if (data.ok && data.signedUrl) {
      window.open(data.signedUrl, "_blank");
    } else {
      setUploadError(data.message ?? "Gagal membuka lampiran.");
    }
  }

  // Jika dikunci setelah checkout, tampilkan banner saja
  if (isLocked) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-3 py-2.5">
          <Lock className="h-4 w-4 flex-shrink-0 text-text-muted" />
          <p className="text-xs text-text-muted">
            Log ini telah dikunci karena Anda sudah absen pulang. Hubungi HRD
            jika ada koreksi.
          </p>
        </div>
        {attachments.length > 0 && (
          <ul className="mt-3 space-y-1">
            {attachments.map((att) => (
              <li
                key={att.id}
                className="flex items-center justify-between rounded-xl border border-border px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text">{att.fileName}</p>
                  <p className="text-xs text-text-muted">
                    {(att.fileSize / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleViewAttachment(att.id)}
                  className="rounded-lg px-2 py-1 text-xs text-primary hover:bg-primary-soft"
                >
                  Lihat
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        {/* Banner jika log SUBMITTED masih bisa diedit */}
        {isEditableSubmitted && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-info/25 bg-info-soft px-3 py-2.5">
            <Pencil className="h-4 w-4 flex-shrink-0 text-info" />
            <p className="text-xs text-info">
              Log ini sudah terkirim tapi masih bisa diedit sebelum Anda absen
              pulang. Klik{" "}
              <strong>&ldquo;Perbarui Log&rdquo;</strong> untuk menyimpan perubahan.
            </p>
          </div>
        )}

        <form
          id={formId}
          action={isEditableSubmitted ? updateAction : draftAction}
          className="space-y-4"
        >
          {logId && <input type="hidden" name="logId" value={logId} />}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Tanggal"
              type="date"
              name="logDate"
              required
              defaultValue={defaultValues?.logDate}
              // Tanggal tidak boleh diubah saat SUBMITTED
              disabled={isEditableSubmitted}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Jam mulai"
                type="time"
                name="startTime"
                required
                defaultValue={defaultValues?.startTime}
              />
              <Input
                label="Jam selesai"
                type="time"
                name="endTime"
                required
                defaultValue={defaultValues?.endTime}
              />
            </div>
          </div>

          <Input
            label="Pemberi tugas (pembimbing)"
            name="taskFrom"
            required
            placeholder="Nama pembimbing / pemberi tugas"
            defaultValue={defaultValues?.taskFrom}
          />

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">
              Uraian kegiatan (wajib)
            </span>
            <textarea
              name="description"
              rows={4}
              required
              placeholder="Tulis kegiatan yang dilakukan hari ini..."
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text outline-none placeholder:text-text-muted/60 focus:border-primary"
              defaultValue={defaultValues?.description}
            />
          </label>

          <div className="grid grid-cols-1 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">
                Hasil (opsional)
              </span>
              <textarea
                name="output"
                rows={2}
                placeholder="Hasil dari kegiatan..."
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text outline-none placeholder:text-text-muted/60 focus:border-primary"
                defaultValue={defaultValues?.output ?? ""}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">
                Hambatan (opsional)
              </span>
              <textarea
                name="obstacle"
                rows={2}
                placeholder="Hambatan yang dihadapi..."
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text outline-none placeholder:text-text-muted/60 focus:border-primary"
                defaultValue={defaultValues?.obstacle ?? ""}
              />
            </label>
          </div>

          {/* Feedback pesan */}
          {draftState.message && (
            <Notice tone={draftState.ok ? "info" : "error"}>
              {draftState.message}
            </Notice>
          )}
          {submitState.message && (
            <Notice tone={submitState.ok ? "info" : "error"}>
              {submitState.message}
            </Notice>
          )}
          {updateState.message && (
            <Notice tone={updateState.ok ? "info" : "error"}>
              {updateState.message}
            </Notice>
          )}
          {deleteState.message && (
            <Notice tone={deleteState.ok ? "info" : "error"}>
              {deleteState.message}
            </Notice>
          )}

          {draftState.fieldErrors &&
            Object.entries(draftState.fieldErrors).map(([field, errors]) => (
              <p key={field} className="text-xs text-danger">
                {errors.join(", ")}
              </p>
            ))}

          {/* Tombol aksi */}
          {isEditableSubmitted ? (
            // Mode edit SUBMITTED: hanya satu tombol "Perbarui Log"
            <Button
              type="submit"
              disabled={updatePending}
              className="w-full"
            >
              <Pencil className="h-4 w-4" aria-hidden />
              {updatePending ? "Menyimpan..." : "Perbarui Log"}
            </Button>
          ) : (
            // Mode DRAFT: Simpan Draft + Kirim
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="secondary"
                disabled={draftPending || submitPending}
                className="flex-1"
              >
                {draftPending ? "Menyimpan..." : "Simpan Draft"}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const form = document.getElementById(
                    formId
                  ) as HTMLFormElement | null;
                  if (form && !form.reportValidity()) return;
                  setShowConfirm(true);
                }}
                disabled={submitPending || draftPending}
                className="flex-1"
              >
                <Send className="h-4 w-4" aria-hidden />
                {submitPending ? "Mengirim..." : "Kirim"}
              </Button>
            </div>
          )}

          {/* Hidden submit button for "Kirim" action - triggered from confirm dialog */}
          <button
            ref={submitButtonRef}
            id={`${formId}-submit-hidden`}
            type="submit"
            formAction={submitAction}
            style={{ display: "none" }}
            hidden
            aria-hidden="true"
            tabIndex={-1}
            disabled={submitPending}
          />
        </form>
      </Card>

      {/* Dialog konfirmasi Kirim */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-sm p-4">
            <h3 className="text-sm font-semibold text-text">Kirim Log?</h3>
            <p className="mt-2 text-sm text-text-muted">
              Log yang sudah dikirim masih bisa diedit selama Anda{" "}
              <strong>belum absen pulang</strong>. Setelah absen pulang, log
              akan dikunci permanen.
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowConfirm(false)}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={() => {
                  submitButtonRef.current?.click();
                  setShowConfirm(false);
                }}
                disabled={submitPending}
              >
                Ya, Kirim
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Kartu lampiran */}
      {logId && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-text">
            Lampiran bukti {logStatus === "DRAFT" ? "(wajib)" : ""}
          </h3>
          <p className="mt-0.5 text-xs text-text-muted">
            JPG, PNG, PDF, DOCX, XLSX. Maks 5 MB per file, maks 3 file.
          </p>
          {attachments.length === 0 && logStatus === "DRAFT" && (
            <p className="mt-1 text-xs text-warning">
              Minimal 1 lampiran untuk bisa mengirim log.
            </p>
          )}

          {uploadError && (
            <div className="mt-2 rounded-xl border border-danger/25 bg-white px-4 py-2 text-sm text-danger">
              {uploadError}
            </div>
          )}

          {deleteAttState.message && (
            <div className="mt-2 rounded-xl px-4 py-2 text-sm bg-primary-soft text-primary">
              {deleteAttState.message}
            </div>
          )}

          {attachments.length > 0 && (
            <ul className="mt-3 space-y-2">
              {attachments.map((att) => (
                <li
                  key={att.id}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text">{att.fileName}</p>
                    <p className="text-xs text-text-muted">
                      {(att.fileSize / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleViewAttachment(att.id)}
                      className="rounded-lg px-2 py-1 text-xs text-primary hover:bg-primary-soft"
                    >
                      Lihat
                    </button>
                    {/* Tombol hapus lampiran: tersedia di DRAFT, dan di SUBMITTED jika belum checkout */}
                    {(logStatus === "DRAFT" || isEditableSubmitted) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att.id)}
                        className="rounded-lg px-2 py-1 text-xs text-danger hover:bg-danger-soft"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Tombol tambah lampiran: tersedia di DRAFT, dan di SUBMITTED jika belum checkout */}
          {attachments.length < 3 && (logStatus === "DRAFT" || isEditableSubmitted) && (
            <div className="mt-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf,.docx,.xlsx"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id={`file-upload-${logId}`}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={uploading}
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                asChild
              >
                <label htmlFor={`file-upload-${logId}`} className="cursor-pointer">
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Mengunggah...
                    </>
                  ) : (
                    <>
                      <Paperclip className="h-4 w-4" aria-hidden />
                      Tambah Lampiran
                    </>
                  )}
                </label>
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Tombol hapus log — hanya untuk DRAFT */}
      {logId && logStatus === "DRAFT" && (
        <form action={deleteAction}>
          <input type="hidden" name="logId" value={logId} />
          <Button
            type="submit"
            variant="danger"
            disabled={deletePending}
            className="w-full"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            {deletePending ? "Menghapus..." : "Hapus Log"}
          </Button>
        </form>
      )}
    </div>
  );
}
