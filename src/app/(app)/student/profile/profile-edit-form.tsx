"use client";

import { useActionForm } from "@/lib/use-action-form";
import { updateProfile } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { GraduationCap, Building2, BookOpen } from "lucide-react";
import type { ActionResult } from "@/lib/action-result";

const initialState: ActionResult = { ok: false };

export function ProfileEditForm({
  defaultValues,
}: {
  defaultValues: {
    nis: string;
    schoolName: string;
    className: string;
    major: string;
  };
}) {
  const [state, formAction, pending] = useActionForm(
    updateProfile,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.message && (
        <Notice tone={state.ok ? "success" : "error"}>{state.message}</Notice>
      )}

      <Input
        label="NIS"
        name="nis"
        type="text"
        defaultValue={defaultValues.nis}
        placeholder="Masukkan NIS Anda"
        error={state.fieldErrors?.nis?.[0]}
        icon={GraduationCap}
        required
      />

      <Input
        label="Asal Sekolah"
        name="schoolName"
        type="text"
        defaultValue={defaultValues.schoolName}
        placeholder="Contoh: SMK Negeri 1 Jakarta"
        error={state.fieldErrors?.schoolName?.[0]}
        icon={Building2}
        required
      />

      <Input
        label="Kelas"
        name="className"
        type="text"
        defaultValue={defaultValues.className}
        placeholder="Contoh: XII RPL 1"
        error={state.fieldErrors?.className?.[0]}
        icon={BookOpen}
        required
      />

      <Input
        label="Jurusan"
        name="major"
        type="text"
        defaultValue={defaultValues.major}
        placeholder="Contoh: Rekayasa Perangkat Lunak"
        error={state.fieldErrors?.major?.[0]}
        icon={BookOpen}
        required
      />

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </div>
    </form>
  );
}
