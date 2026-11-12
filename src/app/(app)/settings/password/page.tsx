import { requireUser } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { PasswordForm } from "./password-form";

export default async function ChangePasswordPage() {
  const user = await requireUser({ allowPasswordChange: true });

  return (
    <>
      <PageHeader
        title="Ganti Password"
        description={
          user.mustChangePassword
            ? "Ganti password sementara sebelum melanjutkan ke sistem."
            : "Ubah password Anda sendiri, atau ajukan permintaan reset jika lupa."
        }
      />
      <PasswordForm forceChange={user.mustChangePassword} />
    </>
  );
}
