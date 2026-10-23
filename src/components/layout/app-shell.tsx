import type { ReactNode } from "react";
import type { Role } from "@/generated/prisma/client";
import { NAV_ITEMS, roleLabel } from "@/lib/navigation";
import type { SessionUser } from "@/lib/permissions";
import { BrandLogo } from "@/components/brand/brand-logo";
import { BottomNav } from "./bottom-nav";
import { MobileNav } from "./mobile-nav";
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
  const role = user.role as Role;

  return (
    <div className="min-h-dvh">
      <Sidebar items={items} userName={displayName} userRole={role} />

      {/* Header khusus mobile / tablet */}
      <header className="glass-panel sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 lg:hidden">
        <BrandLogo width={92} priority />
        <div className="flex items-center gap-2.5">
          <div className="hidden text-right sm:block">
            <p className="max-w-[11rem] truncate text-xs font-semibold text-text">
              {displayName}
            </p>
            <p className="text-[11px] text-text-muted">{roleLabel(role)}</p>
          </div>
          <MobileNav items={items} userName={displayName} userRole={role} />
        </div>
      </header>

      <main className="px-4 pb-28 pt-5 lg:ml-64 lg:px-8 lg:pb-12 lg:pt-8">
        <div className="animate-fade-up mx-auto w-full max-w-4xl">
          {children}
        </div>
      </main>

      <BottomNav items={items} />
    </div>
  );
}
