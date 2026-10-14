"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import type { ActionResult } from "@/lib/action-result";
import { useActionFeedback } from "@/lib/use-action-feedback";
import { savePeriod, deletePeriod } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";

const initialState: ActionResult = { ok: false };

export type PeriodView = {
  id: string;
  name: string;
  startDateInput: string;
  endDateInput: string;
};

function formatPeriodLabel(start: string, end: string): string {
  const toLabel = (v: string) =>
    new Date(`${v}T00:00:00.000Z`).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  return `${toLabel(start)} - ${toLabel(end)}`;
}

export function PeriodManager({ periods }: { periods: PeriodView[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(savePeriod, initialState);
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

  const editing = periods.find((p) => p.id === editingId) ?? null;

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
    if (!confirm("Hapus periode ini?")) return;
    const result = await deletePeriod(id);
    dismiss();
    if (result.ok) {
      setNotice(result.message ?? "Periode dihapus.");
      router.refresh();
    } else {
      setError(result.message ?? "Gagal menghapus periode.");
    }
  }

  return (
    <>
      {!formOpen && (
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden /> Tambah periode
        </Button>
      )}

      {formOpen && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">
              {editing ? "Edit periode" : "Tambah periode"}
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
              label="Nama periode"
              placeholder="mis. Periode PKL 2026/2027"
              defaultValue={editing?.name ?? ""}
              error={state.fieldErrors?.name?.[0]}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                name="startDate"
                label="Tanggal mulai"
                type="date"
                defaultValue={editing?.startDateInput ?? ""}
                error={state.fieldErrors?.startDate?.[0]}
              />
              <Input
                name="endDate"
                label="Tanggal selesai"
                type="date"
                defaultValue={editing?.endDateInput ?? ""}
                error={state.fieldErrors?.endDate?.[0]}
              />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan..." : editing ? "Simpan perubahan" : "Simpan"}
            </Button>
          </form>
        </Card>
      )}

      {notice && <Notice>{notice}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      {periods.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="text-sm text-text-muted">Belum ada periode PKL.</p>
        </Card>
      ) : (
        <>
          {/* Desktop */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-text-muted">
                <tr>
                  <th className="px-4 py-2.5">Nama periode</th>
                  <th className="px-4 py-2.5">Rentang tanggal</th>
                  <th className="px-4 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {periods.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2.5 text-text">{p.name}</td>
                    <td className="px-4 py-2.5 text-text-muted">
                      {formatPeriodLabel(p.startDateInput, p.endDateInput)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="px-3 py-1.5"
                          onClick={() => openEdit(p.id)}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          className="px-3 py-1.5"
                          onClick={() => onDelete(p.id)}
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
            {periods.map((p) => (
              <Card key={p.id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-text">{p.name}</p>
                    <p className="text-xs text-text-muted">
                      {formatPeriodLabel(p.startDateInput, p.endDateInput)}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-2.5 py-1.5"
                      onClick={() => openEdit(p.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      className="px-2.5 py-1.5"
                      onClick={() => onDelete(p.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}