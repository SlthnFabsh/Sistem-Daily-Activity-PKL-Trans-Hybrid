import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { GlobalLoadingOverlay } from "@/components/ui/global-loading-overlay";
import { NavProgressBar } from "@/components/ui/nav-progress-bar";
import { requireUser } from "@/lib/permissions";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();
  return (
    <>
      <NavProgressBar />
      <AppShell user={user}>{children}</AppShell>
      <GlobalLoadingOverlay />
    </>
  );
}