"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import type { NavItem } from "@/lib/navigation";
import { iconMap, roleLabel } from "@/lib/navigation";
import type { Role } from "@/generated/prisma/client";
import { LogoutButton } from "./logout-button";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  items,
  userName,
  userRole,
}: {
  items: NavItem[];
  userName: string;
  userRole: Role;
}) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-border bg-white lg:flex">
      <div className="px-5 py-5">
        <p className="text-base font-semibold text-primary">Daily Activity PKL</p>
        <p className="text-sm text-text-muted">Trans Hybrid</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = iconMap[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary font-semibold text-white"
                  : "text-text-muted hover:bg-primary-soft hover:text-text"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-3 py-3">
        <div className="mb-2 px-3">
          <p className="truncate text-sm font-semibold text-text">{userName}</p>
          <p className="text-xs text-text-muted">{roleLabel(userRole)}</p>
        </div>
        <LogoutButton className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-primary-soft hover:text-text" />
      </div>
    </aside>
  );
}