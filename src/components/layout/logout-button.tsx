"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function LogoutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-text-muted hover:bg-primary-soft hover:text-text transition-colors"
      }
    >
      <LogOut className="h-4 w-4" aria-hidden />
      Keluar
    </button>
  );
}