"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink, FileText, Loader2 } from "lucide-react";
import type { LogAttachmentView } from "./types";

export function AttachmentItem({
  attachment,
}: {
  attachment: LogAttachmentView;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ext = (attachment.fileName.split(".").pop() ?? "").toLowerCase();
  const isImage =
    attachment.fileType.startsWith("image/") ||
    ["jpg", "jpeg", "png", "webp"].includes(ext);

  useEffect(() => {
    let cancelled = false;
    async function loadSignedUrl() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/log-attachment?attachmentId=${encodeURIComponent(attachment.id)}`
        );
        const data = await res.json();
        if (cancelled) return;
        if (data.ok && data.signedUrl) {
          setSignedUrl(data.signedUrl);
        } else {
          setError(data.message ?? "Gagal memuat tautan lampiran.");
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Gagal memuat lampiran."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadSignedUrl();
    return () => {
      cancelled = true;
    };
  }, [attachment.id]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-muted p-3 text-xs text-text-muted">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
        <span className="truncate">
          Memuat tautan ({attachment.fileName})...
        </span>
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className="rounded-xl border border-danger/25 bg-danger-soft p-3 text-xs text-danger">
        <p className="font-medium truncate">{attachment.fileName}</p>
        <p className="mt-0.5">{error ?? "Lampiran tidak dapat diakses."}</p>
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="relative flex aspect-video max-h-56 w-full items-center justify-center overflow-hidden bg-surface-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signedUrl}
            alt={attachment.fileName}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        </div>
        <div className="flex items-center justify-between gap-2 p-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-text">
              {attachment.fileName}
            </p>
            <p className="text-[11px] text-text-muted">
              {attachment.formattedSize}
            </p>
          </div>
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:bg-primary-soft hover:text-primary"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Buka penuh
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white p-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-text">
            {attachment.fileName}
          </p>
          <p className="text-[11px] text-text-muted">
            {attachment.formattedSize}
          </p>
        </div>
      </div>
      <a
        href={signedUrl}
        target="_blank"
        rel="noopener noreferrer"
        download={attachment.fileName}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:bg-primary-soft hover:text-primary"
      >
        <Download className="h-3.5 w-3.5" /> Unduh
      </a>
    </div>
  );
}
