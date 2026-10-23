import Image from "next/image";
import { clsx } from "clsx";

/**
 * Logo resmi Trans Hybrid (public/logo.png).
 * File logo punya banyak ruang kosong di atas/bawah, jadi gambar di-crop
 * dengan rasio lebar (object-cover) supaya ukurannya tidak jadi kotak besar.
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
        "inline-flex shrink-0 items-center justify-center",
        tile &&
          "rounded-2xl bg-white p-2.5 shadow-[var(--shadow-card)] ring-1 ring-black/5",
        className
      )}
    >
      <span
        className="relative block overflow-hidden"
        style={{ width, aspectRatio: "2 / 1" }}
      >
        <Image
          src="/logo.png"
          alt="Trans Hybrid"
          fill
          priority={priority}
          sizes={`${width}px`}
          className="object-cover"
        />
      </span>
    </span>
  );
}
