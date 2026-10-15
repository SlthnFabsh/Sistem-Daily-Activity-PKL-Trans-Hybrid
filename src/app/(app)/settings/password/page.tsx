import { requireUser } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { PasswordForm } from "./password-form";

export default async function ChangePasswordPage() {
  await requireUser();

  return (
    <>
      <PageHeader
        title="Ganti Password"
        description="Ubah password Anda sendiri, atau ajukan permintaan reset jika lupa."
      />
      <PasswordForm />
    </>
  );
}
