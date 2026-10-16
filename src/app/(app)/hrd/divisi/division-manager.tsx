"use client";

import { useActionForm } from "@/lib/use-action-form";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import type { Division } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/action-result";
import { useActionFeedback } from "@/lib/use-action-feedback";
import { saveDivision, deleteDivision } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";

const initialState: ActionResult = { ok: false };

export function DivisionManager({ divisions }: { divisions: Division[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionForm(saveDivision, initialState);
  const {
    notice,
    error,
    formOpen,
    editingId,
    setFormOpen,
    setEditingId,
    setNotice,
    setError,
    dismiss,
  } = useActionFeedback(state);

  const editing = divisions.find((d) => d.id === editingId) ?? null;

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

  async function onDelete(id: string) {
    if (!confirm("Hapus divisi ini?")) return;
    const result = await deleteDivision(id);
    dismiss();
    if (result.ok) {
      setNotice(result.message ?? "Divisi dihapus.");
      router.refresh();
    } else {
      setError(result.message ?? "Gagal menghapus divisi.");
    }
  }

  return (
    <div className="space-y-4">
      {!formOpen && (
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden /> Tambah divisi
        </Button>
      )}

      {formOpen && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">
              {editing ? "Edit divisi" : "Tambah divisi"}
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
              label="Nama divisi"
              placeholder="mis. Divisi Operasional"
              defaultValue={editing?.name ?? ""}
              error={state.fieldErrors?.name?.[0]}
            />
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan..." : editing ? "Simpan perubahan" : "Simpan"}
            </Button>
          </form>
        </Card>
      )}

      {notice && <Notice>{notice}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      {divisions.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="text-sm text-text-muted">Belum ada divisi.</p>
        </Card>
      ) : (
        <>
          {/* Desktop */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-xs font-semibold uppercase text-text-muted">
                <tr>
                  <th className="px-4 py-2.5">Nama divisi</th>
                  <th className="px-4 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {divisions.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-2.5 text-text">{d.name}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="px-3 py-1.5"
                          onClick={() => openEdit(d.id)}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          className="px-3 py-1.5"
                          onClick={() => onDelete(d.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden /> Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile */}
          <div className="space-y-2 md:hidden">
            {divisions.map((d) => (
              <Card key={d.id} className="flex items-center justify-between p-3">
                <p className="text-sm font-medium text-text">{d.name}</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-2.5 py-1.5"
                    onClick={() => openEdit(d.id)}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    className="px-2.5 py-1.5"
                    onClick={() => onDelete(d.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}