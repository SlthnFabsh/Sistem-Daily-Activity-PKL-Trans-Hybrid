// Komponen indikator navigasi antar halaman (top progress bar + loading indicator).
// Ditaruh di layout level app sehingga muncul saat router berpindah halaman.
// Tidak bergantung pada library pihak ketiga — memakai useTransition & event router.

"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Bar tipis biru di bagian atas halaman yang muncul secara otomatis saat
 * router Next.js melakukan navigasi ke halaman lain. Menghilang setelah
 * halaman baru selesai dimuat.
 */
export function NavProgressBar() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    if (pathname === prevPathRef.current) return;

    // Halaman baru sudah dimuat (pathname berubah)
    prevPathRef.current = pathname;
    setProgress(100);

    const done = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 300);

    return () => clearTimeout(done);
  }, [pathname]);

  // Detect klik link apa pun di dalam halaman untuk mulai progress
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      // Hanya navigasi internal (bukan hash, bukan external, bukan download)
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("http") ||
        target.hasAttribute("download") ||
        target.getAttribute("target") === "_blank"
      )
        return;

      setVisible(true);
      setProgress(15);

      // Animasi progress palsu – naik pelan sambil menunggu server
      if (timerRef.current) clearInterval(timerRef.current);
      let p = 15;
      timerRef.current = setInterval(() => {
        p = p >= 75 ? p + 0.5 : p + 3;
        if (p >= 90) {
          clearInterval(timerRef.current!);
          p = 90;
        }
        setProgress(p);
      }, 200);
    }

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <>
      <div
        role="progressbar"
        aria-label="Memuat halaman..."
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[3px]"
      >
        <div
          className="h-full bg-primary transition-all duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="pointer-events-none fixed right-4 top-3 z-[200] flex items-center gap-2 rounded-full border border-border bg-white/95 px-3 py-1 text-xs font-medium text-text shadow-sm backdrop-blur-sm">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        <span>Memuat...</span>
      </div>
    </>
  );
}
