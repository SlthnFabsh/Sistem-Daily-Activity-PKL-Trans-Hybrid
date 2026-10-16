"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import type { NavItem } from "@/lib/navigation";
import { iconMap, roleLabel } from "@/lib/navigation";
import type { Role } from "@/generated/prisma/client";
import { BrandLogo } from "@/components/brand/brand-logo";
import { initialsOf } from "@/lib/initials";
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
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-white/85 backdrop-blur-xl lg:flex">
      <div className="flex flex-col items-center px-5 pt-6">
        <BrandLogo width={168} priority />
        <p className="mt-3 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          Daily Activity PKL
        </p>
      </div>

      <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = iconMap[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={clsx(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-primary text-white shadow-[var(--shadow-float)]"
                  : "text-text-muted hover:bg-primary-soft hover:text-primary"
              )}
            >
              <span
                className={clsx(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                  active
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-text-muted group-hover:bg-white group-hover:text-primary"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-3 py-3">
        <div className="flex items-center gap-3 rounded-2xl bg-surface-muted px-3 py-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
            {initialsOf(userName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text">{userName}</p>
            <p className="text-xs text-text-muted">{roleLabel(userRole)}</p>
          </div>
        </div>
        <LogoutButton className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-danger-soft hover:text-danger" />
      </div>
    </aside>
  );
}
