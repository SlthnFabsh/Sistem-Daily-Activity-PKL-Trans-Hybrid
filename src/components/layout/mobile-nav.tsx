"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Menu, X } from "lucide-react";
import type { NavItem } from "@/lib/navigation";
import { iconMap, roleLabel } from "@/lib/navigation";
import type { Role } from "@/generated/prisma/client";
import { BrandLogo } from "@/components/brand/brand-logo";
import { initialsOf } from "@/lib/initials";
import { LogoutButton } from "./logout-button";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Menu HP: membuka laci berisi SELURUH item navigasi (bottom nav hanya
 * memuat 4 item utama). Tanpa ini, peran dengan banyak menu (HRD/SUPERADMIN)
 * tidak bisa menjangkau halaman lain di layar kecil.
 *
 * Laci dirender lewat portal ke <body> karena header memakai backdrop-filter,
 * yang membuat elemen fixed di dalamnya "terkurung" pada kotak header.
 */
export function MobileNav({
  items,
  userName,
  userRole,
}: {
  items: NavItem[];
  userName: string;
  userRole: Role;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Tutup laci setiap kali pindah halaman.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Tutup laci bila layar diperbesar sampai ukuran desktop.
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  // Kunci scroll + dukung tombol Escape saat laci terbuka.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buka menu navigasi"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-border bg-white py-1 pl-1 pr-2.5 transition-colors hover:border-primary/40 active:bg-primary-soft"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
          {initialsOf(userName)}
        </span>
        <Menu className="h-4 w-4 text-text-muted" aria-hidden />
      </button>

      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-50 lg:hidden">
              <button
                type="button"
                aria-label="Tutup menu"
                onClick={() => setOpen(false)}
                className="absolute inset-0 bg-ink/50"
              />

              <div
                role="dialog"
                aria-modal="true"
                aria-label="Menu navigasi"
                className="absolute inset-y-0 left-0 flex w-[86%] max-w-xs flex-col bg-white shadow-2xl"
              >
                <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
                  <div className="min-w-0">
                    <BrandLogo width={130} priority />
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                      Daily Activity PKL
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Tutup menu"
                    className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-primary-soft hover:text-primary"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
                  {items.map((item) => {
                    const active = isActive(pathname, item.href);
                    const Icon = iconMap[item.icon];
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={clsx(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary text-white"
                            : "text-text-muted hover:bg-primary-soft hover:text-primary"
                        )}
                      >
                        <span
                          className={clsx(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                            active
                              ? "bg-white/20 text-white"
                              : "bg-surface-muted text-text-muted"
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
                      <p className="truncate text-sm font-semibold text-text">
                        {userName}
                      </p>
                      <p className="text-xs text-text-muted">
                        {roleLabel(userRole)}
                      </p>
                    </div>
                  </div>
                  <LogoutButton className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-danger-soft hover:text-danger" />
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
