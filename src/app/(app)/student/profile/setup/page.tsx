"use client";

import { useActionForm } from "@/lib/use-action-form";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { completeProfile } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Card } from "@/components/ui/card";
import { UserCircle, GraduationCap, Building2, BookOpen } from "lucide-react";
import type { ActionResult } from "@/lib/action-result";

const initialState: ActionResult = { ok: false };

export default function ProfileSetupPage() {
  const router = useRouter();
  const [state, formAction, pending] = useActionForm(
    completeProfile,
    initialState
  );

  useEffect(() => {
    if (state.ok) {
      router.push("/student/absensi");
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-soft/30 via-white to-cyan-soft/20 px-4 py-12">
      <Card className="w-full max-w-2xl p-6 sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary">
            <UserCircle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            Lengkapi Profil Anda
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Mohon lengkapi biodata Anda untuk melanjutkan ke sistem
          </p>
        </div>

        {state.message && (
          <div className="mb-4">
            <Notice tone={state.ok ? "success" : "error"}>
              {state.message}
            </Notice>
          </div>
        )}

        <form action={formAction} className="space-y-5">
          <Input
            label="NIS"
            name="nis"
            type="text"
            placeholder="Masukkan NIS Anda"
            error={state.fieldErrors?.nis?.[0]}
            icon={GraduationCap}
            required
          />

          <Input
            label="Asal Sekolah"
            name="schoolName"
            type="text"
            placeholder="Contoh: SMK Negeri 1 Jakarta"
            error={state.fieldErrors?.schoolName?.[0]}
            icon={Building2}
            required
          />

          <Input
            label="Kelas"
            name="className"
            type="text"
            placeholder="Contoh: XII RPL 1"
            error={state.fieldErrors?.className?.[0]}
            icon={BookOpen}
            required
          />

          <Input
            label="Jurusan"
            name="major"
            type="text"
            placeholder="Contoh: Rekayasa Perangkat Lunak"
            error={state.fieldErrors?.major?.[0]}
            icon={BookOpen}
            required
          />

          <div className="pt-2">
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Menyimpan..." : "Simpan dan Lanjutkan"}
            </Button>
          </div>

          <p className="text-center text-xs text-text-muted">
            Data ini akan digunakan untuk keperluan administrasi PKL dan laporan
          </p>
        </form>
      </Card>
    </div>
  );
}
