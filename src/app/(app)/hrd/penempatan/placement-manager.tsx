"use client";

import { useActionForm } from "@/lib/use-action-form";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import type { ActionResult } from "@/lib/action-result";
import { useActionFeedback } from "@/lib/use-action-feedback";
import { savePlacement, deletePlacement } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";

const initialState: ActionResult = { ok: false };

export type PlacementView = {
  id: string;
  studentId: string;
  studentName: string;
  periodId: string;
  periodName: string;
  divisionId: string;
  divisionName: string;
  workStart: string;
  workEnd: string;
  status: "ACTIVE" | "FINISHED";
};

export type Option = { id: string; label: string };

export function PlacementManager({
  placements,
  students,
  periods,
  divisions,
}: {
  placements: PlacementView[];
  students: Option[];
  periods: Option[];
  divisions: Option[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionForm(savePlacement, initialState);
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

  const editing = placements.find((p) => p.id === editingId) ?? null;

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
    if (!confirm("Hapus penempatan ini?")) return;
    const result = await deletePlacement(id);
    dismiss();
    if (result.ok) {
      setNotice(result.message ?? "Penempatan dihapus.");
      router.refresh();
    } else {
      setError(result.message ?? "Gagal menghapus penempatan.");
    }
  }

  return (
    <div className="space-y-4">
      {!formOpen && (
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden /> Tambah penempatan
        </Button>
      )}

      {formOpen && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">
              {editing ? "Edit penempatan" : "Tambah penempatan"}
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
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                name="studentId"
                label="Siswa"
                defaultValue={editing?.studentId ?? ""}
                error={state.fieldErrors?.studentId?.[0]}
              >
                <option value="">Pilih siswa</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
              <Select
                name="periodId"
                label="Periode PKL"
                defaultValue={editing?.periodId ?? ""}
                error={state.fieldErrors?.periodId?.[0]}
              >
                <option value="">Pilih periode</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>
            <Select
              name="divisionId"
              label="Divisi"
              defaultValue={editing?.divisionId ?? ""}
              error={state.fieldErrors?.divisionId?.[0]}
            >
              <option value="">Pilih divisi</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </Select>

            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                name="workStart"
                label="Jam masuk"
                type="time"
                defaultValue={editing?.workStart ?? ""}
                error={state.fieldErrors?.workStart?.[0]}
              />
              <Input
                name="workEnd"
                label="Jam pulang"
                type="time"
                defaultValue={editing?.workEnd ?? ""}
                error={state.fieldErrors?.workEnd?.[0]}
              />
              <Select
                name="status"
                label="Status"
                defaultValue={editing?.status ?? "ACTIVE"}
                error={state.fieldErrors?.status?.[0]}
              >
                <option value="ACTIVE">Aktif</option>
                <option value="FINISHED">Selesai</option>
              </Select>
            </div>

            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan..." : editing ? "Simpan perubahan" : "Simpan"}
            </Button>
          </form>
        </Card>
      )}

      {notice && <Notice>{notice}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      {placements.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="text-sm text-text-muted">Belum ada penempatan.</p>
        </Card>
      ) : (
        <>
          {/* Desktop */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-xs font-semibold uppercase text-text-muted">
                <tr>
                  <th className="px-4 py-2.5">Siswa</th>
                  <th className="px-4 py-2.5">Periode</th>
                  <th className="px-4 py-2.5">Divisi</th>
                  <th className="px-4 py-2.5">Jam kerja</th>
                  <th className="px-4 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {placements.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2.5 font-medium text-text">
                      {p.studentName}
                    </td>
                    <td className="px-4 py-2.5 text-text-muted">{p.periodName}</td>
                    <td className="px-4 py-2.5 text-text">{p.divisionName}</td>
                    <td className="px-4 py-2.5 text-text-muted">
                      {p.workStart} - {p.workEnd}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        {p.status === "ACTIVE" ? <Badge>Aktif</Badge> : <Badge tone="neutral">Selesai</Badge>}
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
            {placements.map((p) => (
              <Card key={p.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-text">{p.studentName}</p>
                    <p className="text-xs text-text-muted">{p.periodName}</p>
                    <p className="mt-1 text-xs text-text-muted">
                      {p.divisionName} · {p.workStart}–{p.workEnd}
                    </p>
                    <div className="mt-1">
                      {p.status === "ACTIVE" ? (
                        <Badge>Aktif</Badge>
                      ) : (
                        <Badge tone="neutral">Selesai</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 flex-col gap-1.5">
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-2.5 py-1"
                      onClick={() => openEdit(p.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      className="px-2.5 py-1"
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
    </div>
  );
}