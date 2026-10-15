import { requireSuperAdmin } from "@/lib/permissions";
import { listPasswordRequests } from "./actions";
import { PageHeader } from "@/components/ui/page-header";
import { RequestsList } from "./requests-list";

export default async function PasswordRequestsPage() {
  await requireSuperAdmin();

  const requests = await listPasswordRequests();

  return (
    <>
      <PageHeader
        title="Permintaan Reset Password"
        description="Daftar permintaan reset password dari pengguna. Setel password baru untuk menyelesaikan."
      />
      <RequestsList requests={requests} />
    </>
  );
}
