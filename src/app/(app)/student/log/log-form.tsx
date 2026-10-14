"use client";

import { useEffect, useRef, useState } from "react";
import { useActionForm } from "@/lib/use-action-form";
import imageCompression from "browser-image-compression";
import { Paperclip, Send, Trash2, Loader2 } from "lucide-react";
import type { ActionResult } from "@/lib/action-result";
import { endPending, startPending } from "@/lib/pending-store";
import {
  saveLogDraft,
  submitLog,
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
  defaultValues,
  attachments,
}: {
  logId?: string;
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
  const [draftState, draftAction, draftPending] = useActionForm(
    saveLogDraft,
    initialState
  );
  const [submitState, submitAction, submitPending] = useActionForm(
    submitLog,
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

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form id={formId} action={draftAction} className="space-y-4">
          {logId && <input type="hidden" name="logId" value={logId} />}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tanggal"
              type="date"
              name="logDate"
              required
              defaultValue={defaultValues?.logDate}
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
          {deleteState.message && (
            <Notice tone={deleteState.ok ? "info" : "error"}>
              {deleteState.message}
            </Notice>
          )}

          {draftState.fieldErrors &&
            Object.entries(draftState.fieldErrors).map(([field, errors]) => (
              <p key={field} className="text-xs text-red-600">
                {errors.join(", ")}
              </p>
            ))}

          <div className="flex gap-2">
            <Button
              type="submit"
              variant="secondary"
              disabled={draftPending}
              className="flex-1"
            >
              {draftPending ? "Menyimpan..." : "Simpan Draft"}
            </Button>
            <Button
              type="button"
              onClick={() => setShowConfirm(true)}
              disabled={submitPending}
              className="flex-1"
            >
              <Send className="h-4 w-4" aria-hidden />
              {submitPending ? "Mengirim..." : "Kirim"}
            </Button>
          </div>
        </form>
      </Card>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-sm p-4">
            <h3 className="text-sm font-semibold text-text">Kirim Log?</h3>
            <p className="mt-2 text-sm text-text-muted">
              Log yang sudah dikirim <strong>tidak bisa diubah</strong>. Pastikan
              isi dan lampiran sudah benar.
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
                type="submit"
                form={formId}
                formAction={submitAction}
                className="flex-1"
                onClick={() => setShowConfirm(false)}
              >
                Ya, Kirim
              </Button>
            </div>
          </Card>
        </div>
      )}

      {logId && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-text">
            Lampiran bukti (wajib)
          </h3>
          <p className="mt-0.5 text-xs text-text-muted">
            JPG, PNG, PDF, DOCX, XLSX. Maks 5 MB per file, maks 3 file.
          </p>
          {attachments.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">
              Minimal 1 lampiran untuk bisa mengirim log.
            </p>
          )}

          {uploadError && (
            <div className="mt-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm text-red-600">
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
                    <button
                      type="button"
                      onClick={() => handleDeleteAttachment(att.id)}
                      className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {attachments.length < 3 && (
            <div className="mt-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf,.docx,.xlsx"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={uploading}
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
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
              </Button>
            </div>
          )}
        </Card>
      )}

      {logId && (
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
