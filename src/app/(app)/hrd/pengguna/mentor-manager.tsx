"use client";

import { useActionForm } from "@/lib/use-action-form";
import { useRouter } from "next/navigation";
import { KeyRound, Pencil, Plus, Trash2, X } from "lucide-react";
import type { ActionResult } from "@/lib/action-result";
import { useActionFeedback } from "@/lib/use-action-feedback";
import { saveMentor, deleteMentor, resetMentorPassword } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";

const initialState: ActionResult = { ok: false };

export type MentorView = {
  id: string;
  name: string;
  email: string;
  divisionId: string;
  divisionName: string;
  isPic: boolean;
};

export type DivisionOption = { id: string; name: string };

export function MentorManager({
  mentors,
  divisions,
}: {
  mentors: MentorView[];
  divisions: DivisionOption[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionForm(saveMentor, initialState);
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

  const editing = mentors.find((m) => m.id === editingId) ?? null;

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

  async function runAction(action: () => Promise<ActionResult>, title: string) {
    if (!confirm(title)) return;
    dismiss();
    const result = await action();
    if (result.ok) {
      setNotice(result.message ?? "Berhasil.");
      router.refresh();
    } else {
      setError(result.message ?? "Gagal.");
    }
  }

  return (
    <>
      {!formOpen && (
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden /> Tambah pembimbing
        </Button>
      )}

      {formOpen && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">
              {editing ? "Edit pembimbing" : "Tambah pembimbing"}
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
              placeholder="mis. Budi Santoso"
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
            <Select
              name="divisionId"
              label="Divisi"
              defaultValue={editing?.divisionId ?? ""}
              error={state.fieldErrors?.divisionId?.[0]}
            >
              <option value="">Pilih divisi</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-2 text-sm text-text">
              <input
                name="isPic"
                type="checkbox"
                defaultChecked={editing?.isPic ?? false}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              Penanggung jawab divisi (PIC)
            </label>
            {state.fieldErrors?.isPic?.[0] && (
              <p className="text-xs text-red-600">
                {state.fieldErrors.isPic[0]}
              </p>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan..." : editing ? "Simpan perubahan" : "Simpan"}
            </Button>
            <p className="text-xs text-text-muted">
              Akun login dibuat dengan password sementara. Setelah dibuat, gunakan
              tombol &quot;Reset password&quot; bila pembimbing lupa.
            </p>
          </form>
        </Card>
      )}

      {notice && <Notice>{notice}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      {mentors.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="text-sm text-text-muted">Belum ada pembimbing.</p>
        </Card>
      ) : (
        <>
          {/* Desktop */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-text-muted">
                <tr>
                  <th className="px-4 py-2.5">Pembimbing</th>
                  <th className="px-4 py-2.5">Divisi</th>
                  <th className="px-4 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mentors.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-text">{m.name}</p>
                      <p className="text-xs text-text-muted">{m.email}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="flex flex-wrap items-center gap-2 text-text">
                        {m.divisionName}
                        {m.isPic && <Badge>PIC</Badge>}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="px-3 py-1.5"
                          onClick={() => openEdit(m.id)}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="px-3 py-1.5"
                          onClick={() =>
                            runAction(
                              () => resetMentorPassword(m.id),
                              "Reset password pembimbing ini?"
                            )
                          }
                        >
                          <KeyRound className="h-3.5 w-3.5" aria-hidden /> Reset sandi
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          className="px-3 py-1.5"
                          onClick={() =>
                            runAction(
                              () => deleteMentor(m.id),
                              "Hapus pembimbing ini?"
                            )
                          }
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
            {mentors.map((m) => (
              <Card key={m.id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-text">{m.name}</p>
                    <p className="text-xs text-text-muted">{m.email}</p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-text-muted">
                      {m.divisionName}
                      {m.isPic && <Badge>PIC</Badge>}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 flex-col gap-1.5">
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-2.5 py-1"
                      onClick={() => openEdit(m.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-2.5 py-1"
                      onClick={() =>
                        runAction(
                          () => resetMentorPassword(m.id),
                          "Reset password pembimbing ini?"
                        )
                      }
                    >
                      <KeyRound className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      className="px-2.5 py-1"
                      onClick={() =>
                        runAction(
                          () => deleteMentor(m.id),
                          "Hapus pembimbing ini?"
                        )
                      }
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