import Image from "next/image";
import { clsx } from "clsx";

/**
 * Logo resmi Trans Hybrid (public/logo.png).
 * `tile` membungkus logo dengan kartu putih agar tetap terbaca di atas
 * latar bergradien.
 */
export function BrandLogo({
  width = 140,
  className,
  tile = false,
  priority = false,
}: {
  width?: number;
  className?: string;
  tile?: boolean;
  priority?: boolean;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center justify-center",
        tile &&
          "rounded-2xl bg-white p-2.5 shadow-[var(--shadow-card)] ring-1 ring-black/5",
        className
      )}
    >
      <Image
        src="/logo.png"
        alt="Trans Hybrid"
        width={width}
        height={width}
        priority={priority}
        className="h-auto w-auto object-contain"
      />
    </span>
  );
}
