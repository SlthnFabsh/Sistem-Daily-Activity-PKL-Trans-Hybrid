import type { ReactNode } from "react";
import type { Role } from "@/generated/prisma/client";
import { NAV_ITEMS, roleLabel } from "@/lib/navigation";
import type { SessionUser } from "@/lib/permissions";
import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  const items = NAV_ITEMS[user.role];
  const displayName = user.name || user.email || roleLabel(user.role);

  return (
    <div className="min-h-dvh bg-surface-muted">
      <Sidebar items={items} userName={displayName} userRole={user.role as Role} />
      <main className="px-4 pb-24 pt-6 lg:ml-64 lg:pb-10">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>
      <BottomNav items={items} />
    </div>
  );
}