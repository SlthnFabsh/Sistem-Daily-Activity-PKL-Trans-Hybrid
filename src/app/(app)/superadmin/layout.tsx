import { requireRole } from "@/lib/permissions";
import { AppShell } from "@/components/layout/app-shell";
import type { SessionUser } from "@/lib/permissions";

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("SUPERADMIN");
  return <AppShell user={user as SessionUser}>{children}</AppShell>;
}
