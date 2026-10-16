"use client";

import { useState } from "react";
import { useActionForm } from "@/lib/use-action-form";
import { useActionFeedback } from "@/lib/use-action-feedback";
import { fulfillResetPassword, cancelPasswordRequest } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { formatWibDate, formatWibTime } from "@/lib/time";
import type { ActionResult } from "@/lib/action-result";

const initialState: ActionResult = { ok: false };

type RequestItem = {
  id: string;
  token: string;
  requestedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export function RequestsList({ requests }: { requests: RequestItem[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [globalNotice, setGlobalNotice] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  async function runCancel(id: string) {
    if (!confirm("Batalkan permintaan reset ini?")) return;
    const fd = new FormData();
    fd.set("requestId", id);
    const res = await cancelPasswordRequest({ ok: false } as ActionResult, fd);
    if (res.ok) {
      setGlobalNotice(res.message ?? "Berhasil.");
      setExpandedId(null);
    } else {
      setGlobalError(res.message ?? "Gagal.");
    }
  }

  return (
    <div className="space-y-4">
      {globalNotice && <Notice>{globalNotice}</Notice>}
      {globalError && <Notice tone="error">{globalError}</Notice>}

      {requests.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="text-sm text-text-muted">Tidak ada permintaan reset yang menunggu.</p>
        </Card>
      ) : (
        <Card className="hidden overflow-hidden md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-text-muted">
              <tr>
                <th className="px-4 py-2.5">Pengguna</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Permintaan</th>
                <th className="px-4 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-text">{r.user.name}</p>
                    <p className="text-xs text-text-muted">{r.user.email}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge>{r.user.role}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                      className="text-xs text-primary hover:underline"
                    >
                      {expandedId === r.id ? "Sembunyi" : "Lihat detail & setel"}
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="secondary" className="px-3 py-1.5" onClick={() => setExpandedId(r.id)}>
                        Setel ulang
                      </Button>
                      <Button type="button" variant="secondary" className="px-3 py-1.5" onClick={() => runCancel(r.id)}>
                        Batal
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {requests.map((r) => (
          <Card key={r.id} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-text">{r.user.name}</p>
                <p className="text-xs text-text-muted">{r.user.email}</p>
                <Badge className="mt-1">{r.user.role}</Badge>
              </div>
              <div className="flex flex-shrink-0 flex-col gap-1.5">
                <Button type="button" variant="secondary" className="px-2.5 py-1" onClick={() => setExpandedId(r.id)}>
                  Setel
                </Button>
                <Button type="button" variant="secondary" className="px-2.5 py-1" onClick={() => runCancel(r.id)}>
                  Batal
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {expandedId && (
        <ExpandedDetail request={requests.find((r) => r.id === expandedId) ?? undefined} onClose={() => setExpandedId(null)} />
      )}
    </div>
  );
}

function ExpandedDetail({ request, onClose }: { request: RequestItem | undefined; onClose: () => void }) {
  if (!request) return null;
  return <ExpandedDetailPanel request={request} onClose={onClose} />;
}

function ExpandedDetailPanel({ request, onClose }: { request: RequestItem; onClose: () => void }) {
  const req = request;

  const [state, formAction, pending] = useActionForm(fulfillResetPassword, initialState);
  const { notice, error, setNotice, setError } = useActionFeedback(state);
  const [copied, setCopied] = useState(false);

  async function runCancel() {
    if (!confirm("Batalkan permintaan reset ini?")) return;
    const fd = new FormData();
    fd.set("requestId", req.id);
    const res = await cancelPasswordRequest({ ok: false } as ActionResult, fd);
    if (res.ok) {
      setNotice(res.message ?? "Berhasil.");
      onClose();
    } else {
      setError(res.message ?? "Gagal.");
    }
  }

  function copyToken() {
    navigator.clipboard.writeText(req.token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-text">Setel ulang password</h2>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-text-muted hover:bg-primary-soft hover:text-text">
          Tutup
        </button>
      </div>

      <p className="text-xs text-text-muted">
        Permintaan dari {req.user.name} ({req.user.email}) pada{" "}
        {req.requestedAt ? `${formatWibDate(new Date(req.requestedAt))} ${formatWibTime(new Date(req.requestedAt))}` : "-"}
      </p>

      <div className="flex items-center gap-2 mt-2">
        <Input
          readOnly
          label="Token reset"
          value={req.token}
          className="font-mono text-xs"
        />
        <Button type="button" variant="secondary" onClick={copyToken}>
          {copied ? "Tersalin" : "Salin"}
        </Button>
      </div>

      <form action={formAction} className="space-y-3 mt-4">
        <input type="hidden" name="token" value={req.token} />
        <Input
          name="newPassword"
          type="password"
          label="Password baru"
          placeholder="Minimal 8 karakter"
          error={state.fieldErrors?.newPassword?.[0]}
        />
        <Input
          name="confirmPassword"
          type="password"
          label="Konfirmasi password baru"
          placeholder="Ulangi password baru"
          error={state.fieldErrors?.confirmPassword?.[0]}
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Menyimpan..." : "Setel password baru"}
          </Button>
          <Button type="button" variant="danger" onClick={runCancel}>
            Batalkan permintaan
          </Button>
        </div>
      </form>

      {notice && <Notice>{notice}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
    </Card>
  );
}
