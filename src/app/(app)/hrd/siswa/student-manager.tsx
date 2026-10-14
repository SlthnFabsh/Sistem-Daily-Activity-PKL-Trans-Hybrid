"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileUp, KeyRound, Pencil, Plus, Trash2, X } from "lucide-react";
import type { ActionResult, ImportResult } from "@/lib/action-result";
import { useActionFeedback } from "@/lib/use-action-feedback";
import {
  saveStudent,
  deleteStudent,
  resetStudentPassword,
  importStudents,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";

const initialState: ActionResult = { ok: false };
const importInitialState: ImportResult = {
  ok: false,
  imported: 0,
  failed: 0,
  rows: [],
};

export type StudentView = {
  id: string;
  name: string;
  email: string;
  nis: string;
  schoolName: string;
  major: string;
  className: string;
  phone: string;
};

export function StudentManager({ students }: { students: StudentView[] }) {
  const router = useRouter();
  const [importKey, setImportKey] = useState(0);
  const [importDismissed, setImportDismissed] = useState(false);
  const [state, formAction, pending] = useActionState(saveStudent, initialState);
  const [importState, importAction, importPending] = useActionState(
    importStudents,
    importInitialState
  );
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

  const [prevImportState, setPrevImportState] = useState(importState);
  if (importState !== prevImportState) {
    setPrevImportState(importState);
    if (importState.ok) {
      setImportKey((k) => k + 1); // input file di-remount agar bisa impor ulang
      setImportDismissed(false);
    }
  }

  useEffect(() => {
    if (importState.ok) router.refresh();
  }, [importState, router]);

  const editing = students.find((s) => s.id === editingId) ?? null;

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

  const importSummary =
    importState.rows.length > 0 && !importDismissed;

  return (
    <>
      {!formOpen && (
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden /> Tambah siswa
        </Button>
      )}

      {formOpen && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">
              {editing ? "Edit siswa" : "Tambah siswa"}
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
              <Input
                name="name"
                label="Nama lengkap"
                placeholder="mis. Andi Pratama"
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
            </div>
            <Input
              name="schoolName"
              label="Sekolah"
              placeholder="Nama sekolah"
              defaultValue={editing?.schoolName ?? ""}
              error={state.fieldErrors?.schoolName?.[0]}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                name="nis"
                label="NIS"
                placeholder="Nomor induk siswa"
                defaultValue={editing?.nis ?? ""}
                error={state.fieldErrors?.nis?.[0]}
              />
              <Input
                name="major"
                label="Jurusan"
                placeholder="mis. RPL"
                defaultValue={editing?.major ?? ""}
                error={state.fieldErrors?.major?.[0]}
              />
              <Input
                name="className"
                label="Kelas"
                placeholder="mis. XII RPL 2"
                defaultValue={editing?.className ?? ""}
                error={state.fieldErrors?.className?.[0]}
              />
            </div>
            <Input
              name="phone"
              label="Telepon"
              placeholder="mis. 0812-3456-7890"
              defaultValue={editing?.phone ?? ""}
              error={state.fieldErrors?.phone?.[0]}
            />
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan..." : editing ? "Simpan perubahan" : "Simpan"}
            </Button>
            <p className="text-xs text-text-muted">
              Akun login dibuat dengan password sementara. Setelah dibuat, gunakan
              tombol &quot;Reset password&quot; bila siswa lupa.
            </p>
          </form>
        </Card>
      )}

      {/* Impor dari Excel */}
      <Card className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <FileUp className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="text-sm font-semibold text-text">Import siswa dari Excel</h2>
        </div>
        <p className="mb-3 text-xs text-text-muted">
          Kolom: Nama, Email, NIS, Sekolah, Jurusan, Kelas, Telepon. Baris yang
          valid langsung disimpan; baris yang bermasalah dicatat tanpa menggagalkan
          yang lain.
        </p>
        <form action={importAction} className="space-y-3">
          <input
            key={importKey}
            name="file"
            type="file"
            accept=".xlsx,.xls"
            className="block w-full text-sm text-text file:mr-3 file:rounded-xl file:border file:border-border file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-text hover:file:bg-primary-soft"
          />
          {importState.message && !importSummary && (
            <Notice tone={importState.ok ? "info" : "error"}>
              {importState.message}
            </Notice>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={importPending}>
              {importPending ? "Mengimport..." : "Import"}
            </Button>
            <a
              href="/contoh-import-siswa.xlsx"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-text hover:bg-primary-soft"
            >
              <Download className="h-4 w-4" aria-hidden /> Contoh file Excel
            </a>
          </div>
        </form>

        {importSummary && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Notice>{importState.message}</Notice>
              <Button
                type="button"
                variant="secondary"
                className="px-3 py-1.5"
                onClick={() => setImportDismissed(true)}
              >
                Tutup hasil
              </Button>
            </div>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-text-muted">
                    <tr>
                      <th className="px-3 py-2">Baris</th>
                      <th className="px-3 py-2">Nama</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {importState.rows.map((r) => (
                      <tr key={r.row}>
                        <td className="px-3 py-2 text-xs text-text-muted">{r.row}</td>
                        <td className="px-3 py-2 text-text">{r.name || "-"}</td>
                        <td className="px-3 py-2">
                          {r.ok ? (
                            <span className="text-xs font-medium text-primary">Berhasil</span>
                          ) : (
                            <span className="text-xs text-red-600">
                              Gagal: {r.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </Card>

      {notice && <Notice>{notice}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      {students.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="text-sm text-text-muted">Belum ada siswa.</p>
        </Card>
      ) : (
        <>
          {/* Desktop */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-text-muted">
                <tr>
                  <th className="px-4 py-2.5">Siswa</th>
                  <th className="px-4 py-2.5">Sekolah</th>
                  <th className="px-4 py-2.5">Telepon</th>
                  <th className="px-4 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-text">{s.name}</p>
                      <p className="text-xs text-text-muted">{s.email}</p>
                      {s.nis && <p className="text-xs text-text-muted">NIS {s.nis}</p>}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-text">{s.schoolName}</p>
                      <p className="text-xs text-text-muted">
                        {[s.major, s.className].filter(Boolean).join(" - ")}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-text-muted">{s.phone || "-"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="px-3 py-1.5"
                          onClick={() => openEdit(s.id)}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="px-3 py-1.5"
                          onClick={() =>
                            runAction(
                              () => resetStudentPassword(s.id),
                              "Reset password siswa ini?"
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
                              () => deleteStudent(s.id),
                              "Hapus siswa ini?"
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
            {students.map((s) => (
              <Card key={s.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-text">{s.name}</p>
                    <p className="text-xs text-text-muted">{s.email}</p>
                    <p className="mt-1 text-xs text-text-muted">{s.schoolName}</p>
                    {s.nis && <p className="text-xs text-text-muted">NIS {s.nis}</p>}
                  </div>
                  <div className="flex flex-shrink-0 flex-col gap-1.5">
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-2.5 py-1"
                      onClick={() => openEdit(s.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-2.5 py-1"
                      onClick={() =>
                        runAction(
                          () => resetStudentPassword(s.id),
                          "Reset password siswa ini?"
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
                        runAction(() => deleteStudent(s.id), "Hapus siswa ini?")
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