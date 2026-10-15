"use client";

import { useActionForm } from "@/lib/use-action-form";
import { useActionFeedback } from "@/lib/use-action-feedback";
import { changePassword, requestPasswordReset } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { useState } from "react";
import type { ActionResult } from "@/lib/action-result";

const initialState: ActionResult = { ok: false };

export function PasswordForm() {
  return (
    <div className="space-y-6 max-w-lg">
      <Card className="p-4">
        <h2 className="text-sm font-semibold text-text">Ubah password sendiri</h2>
        <p className="text-xs text-text-muted">
          Masukkan password lama dan password baru. Semua role bisa mengubah passwordnya sendiri.
        </p>
        <ChangePasswordInner />
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-semibold text-text">Lupa password?</h2>
        <p className="text-xs text-text-muted">
          Jika Anda lupa password, ajukan permintaan reset. Superadmin akan menyetel password baru untuk Anda.
        </p>
        <RequestResetInner />
      </Card>
    </div>
  );
}

function ChangePasswordInner() {
  const [state, formAction, pending] = useActionForm(changePassword, initialState);
  const { notice, error, setNotice, setError, dismiss } = useActionFeedback(state);

  return (
    <>
      <form action={formAction} className="space-y-3">
        <Input
          name="currentPassword"
          type="password"
          label="Password lama"
          placeholder="Masukkan password lama"
          error={state.fieldErrors?.currentPassword?.[0]}
        />
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
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan password baru"}
        </Button>
        <p className="text-xs text-text-muted">
          Setelah disimpan, sesi Anda tetap aktif. Login ulang bila perlu.
        </p>
      </form>
      {notice && <Notice>{notice}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
    </>
  );
}

function RequestResetInner() {
  const [state, formAction, pending] = useActionForm(requestPasswordReset, initialState);
  const { notice, error, setNotice, setError, dismiss } = useActionFeedback(state);
  const [email, setEmail] = useState("");

  return (
    <>
      <form action={formAction} className="space-y-3">
        <Input
          name="email"
          type="email"
          label="Email terdaftar"
          placeholder="nama@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={state.fieldErrors?.email?.[0]}
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Mengajukan..." : "Ajukan permintaan reset"}
        </Button>
      </form>
      {notice && <Notice>{notice}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
    </>
  );
}
