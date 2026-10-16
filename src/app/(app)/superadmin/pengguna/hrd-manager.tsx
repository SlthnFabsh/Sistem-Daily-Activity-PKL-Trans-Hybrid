"use client";

import { useState } from "react";
import { useActionForm } from "@/lib/use-action-form";
import { useActionFeedback } from "@/lib/use-action-feedback";
import { saveHrd } from "./actions";
import { deleteHrd, resetHrdPassword } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { X } from "lucide-react";
import type { ActionResult } from "@/lib/action-result";

type HrdUser = {
  id: string;
  name: string;
  email: string;
};

type HrdManagerProps = { hrds: HrdUser[] };

export function HrdManager({ hrds }: HrdManagerProps) {
  const [state, formAction, pending] = useActionForm(saveHrd, { ok: false });

  const { notice, error, formOpen, editingId, setFormOpen, setEditingId, setNotice, setError, dismiss } = useActionFeedback(state);

  const [deleteFormOpen, setDeleteFormOpen] = useState(false);
  const [deleteEditingId, setDeleteEditingId] = useState<string | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [resetFormOpen, setResetFormOpen] = useState(false);
  const [resetEditingId, setResetEditingId] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const editing = hrds.find((h) => h.id === editingId) ?? null;
  const deleting = hrds.find((h) => h.id === deleteEditingId) ?? null;
  const resetting = hrds.find((h) => h.id === resetEditingId) ?? null;

  function openCreate() {
    setEditingId(null);
    setFormOpen(true);
    dismiss();
  }
  function openEdit(id: string) {
    setEditingId(id);
    setFormOpen(true);
    dismiss();
  }
  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
  }

  async function runDelete() {
    if (!deleteEditingId) return;
    if (!confirm("Hapus akun HRD ini?")) return;
    const result = await deleteHrd(deleteEditingId);
    if (result.ok) {
      setDeleteNotice(result.message ?? "Berhasil.");
      setDeleteFormOpen(false);
      setDeleteEditingId(null);
    } else {
      setDeleteError(result.message ?? "Gagal.");
    }
  }

  async function runReset() {
    if (!resetEditingId) return;
    if (!confirm("Reset password HRD ini?")) return;
    const result = await resetHrdPassword(resetEditingId);
    if (result.ok) {
      setResetNotice(result.message ?? "Berhasil.");
      setResetFormOpen(false);
      setResetEditingId(null);
    } else {
      setResetError(result.message ?? "Gagal.");
    }
  }

  return (
    <div className="space-y-4">
      {!formOpen && (
        <Button onClick={openCreate}>
          Tambah HRD
        </Button>
      )}

      {formOpen && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">
              {editing ? "Edit HRD" : "Tambah HRD"}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg p-1 text-text-muted hover:bg-primary-soft hover:text-text"
              aria-label="Tutup form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form action={formAction} className="space-y-3">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <Input
              name="name"
              label="Nama lengkap"
              placeholder="mis. Dinda Putri"
              defaultValue={editing?.name ?? ""}
              error={state.fieldErrors?.name?.[0]}
            />
            <Input
              name="email"
              label="Email (untuk login)"
              type="email"
              placeholder="nama@email.com"
              defaultValue={editing?.email ?? ""}
              error={state.fieldErrors?.email?.[0]}
            />
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan..." : editing ? "Simpan perubahan" : "Simpan"}
            </Button>
            <p className="text-xs text-text-muted">
              Akun login dibuat dengan password sementara.
            </p>
          </form>
        </Card>
      )}

      {notice && <Notice tone="success">{notice}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      {deleteFormOpen && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">Hapus HRD</h2>
            <button type="button" onClick={() => setDeleteFormOpen(false)} className="rounded-lg p-1 text-text-muted hover:bg-primary-soft hover:text-text">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-text-muted">
            Yakin ingin menghapus HRD {deleting?.name} ({deleting?.email})?
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="danger" onClick={runDelete}>
              Hapus
            </Button>
            <Button type="button" variant="secondary" onClick={() => setDeleteFormOpen(false)}>
              Batal
            </Button>
          </div>
        </Card>
      )}
      {deleteNotice && <Notice tone="success">{deleteNotice}</Notice>}
      {deleteError && <Notice tone="error">{deleteError}</Notice>}

      {resetFormOpen && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">Reset password HRD</h2>
            <button type="button" onClick={() => setResetFormOpen(false)} className="rounded-lg p-1 text-text-muted hover:bg-primary-soft hover:text-text">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-text-muted">
            Reset password HRD {resetting?.name} ({resetting?.email})?
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={runReset}>
              Reset password
            </Button>
            <Button type="button" variant="secondary" onClick={() => setResetFormOpen(false)}>
              Batal
            </Button>
          </div>
        </Card>
      )}
      {resetNotice && <Notice tone="success">{resetNotice}</Notice>}
      {resetError && <Notice tone="error">{resetError}</Notice>}

      {hrds.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="text-sm text-text-muted">Belum ada HRD.</p>
        </Card>
      ) : (
        <Card className="hidden overflow-hidden md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs font-semibold uppercase text-text-muted">
              <tr>
                <th className="px-4 py-2.5">Nama</th>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {hrds.map((h) => (
                <tr key={h.id}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-text">{h.name}</p>
                  </td>
                  <td className="px-4 py-2.5 text-text-muted">{h.email}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="secondary" className="px-3 py-1.5" onClick={() => openEdit(h.id)}>
                        Edit
                      </Button>
                      <Button type="button" variant="secondary" className="px-3 py-1.5" onClick={() => { setResetEditingId(h.id); setResetFormOpen(true); }}>
                        Reset sandi
                      </Button>
                      <Button type="button" variant="danger" className="px-3 py-1.5" onClick={() => { setDeleteEditingId(h.id); setDeleteFormOpen(true); }}>
                        Hapus
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
      <div className="space-y-2 md:hidden">
        {hrds.map((h) => (
          <Card key={h.id} className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-text">{h.name}</p>
                <p className="text-xs text-text-muted">{h.email}</p>
              </div>
              <div className="flex flex-shrink-0 flex-col gap-1.5">
                <Button type="button" variant="secondary" className="px-2.5 py-1" onClick={() => openEdit(h.id)}>
                  Edit
                </Button>
                <Button type="button" variant="secondary" className="px-2.5 py-1" onClick={() => { setResetEditingId(h.id); setResetFormOpen(true); }}>
                  Reset
                </Button>
                <Button type="button" variant="danger" className="px-2.5 py-1" onClick={() => { setDeleteEditingId(h.id); setDeleteFormOpen(true); }}>
                  Hapus
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
