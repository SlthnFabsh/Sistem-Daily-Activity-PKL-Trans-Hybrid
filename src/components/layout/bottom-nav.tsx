"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import type { NavItem } from "@/lib/navigation";
import { iconMap } from "@/lib/navigation";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const visible = items.slice(0, 4);

  return (
    <nav className="fixed inset-x-3 bottom-3 z-30 lg:hidden">
      <div className="glass-panel flex items-stretch gap-1 rounded-2xl border border-border p-1.5 shadow-[var(--shadow-card)]">
        {visible.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = iconMap[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={clsx(
                "flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-all duration-200",
                active
                  ? "bg-primary text-white shadow-[var(--shadow-float)]"
                  : "text-text-muted hover:bg-primary-soft hover:text-primary"
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
