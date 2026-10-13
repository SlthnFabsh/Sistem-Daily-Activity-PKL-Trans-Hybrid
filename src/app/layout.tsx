import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistem Daily Activity PKL Trans Hybrid",
  description:
    "Pencatatan absensi dan aktivitas harian siswa PKL di Trans Hybrid.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full bg-surface-muted text-text">{children}</body>
    </html>
  );
}