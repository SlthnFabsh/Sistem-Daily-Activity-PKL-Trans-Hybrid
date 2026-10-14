// Komponen skeleton loader yang dipakai sebagai placeholder saat data belum dimuat.
// Dipakai di loading.tsx agar pengguna melihat bentuk halaman, bukan layar putih.

import { Card } from "@/components/ui/card";

/** Blok teks yang berkedip-kedip sebagai placeholder konten. */
function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-3 animate-pulse rounded-full bg-slate-200 ${className}`}
    />
  );
}

/** Skeleton satu kartu item (mirip kartu daftar log / absensi). */
function SkeletonCard() {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <SkeletonLine className="w-1/3" />
          <SkeletonLine className="w-1/2" />
        </div>
        <div className="h-5 w-16 animate-pulse rounded-full bg-slate-200" />
      </div>
      <div className="mt-3 space-y-1.5">
        <SkeletonLine className="w-full" />
        <SkeletonLine className="w-4/5" />
      </div>
    </Card>
  );
}

/** Header halaman skeleton. */
function SkeletonHeader() {
  return (
    <div className="mb-6">
      <SkeletonLine className="w-32 h-5" />
      <SkeletonLine className="mt-2 w-56 h-3" />
    </div>
  );
}

/** Skeleton satu baris di tabel (untuk halaman HRD yang pakai tabel). */
function SkeletonTableRow() {
  return (
    <div className="flex items-center gap-4 border-b border-border px-4 py-3">
      <SkeletonLine className="w-32" />
      <SkeletonLine className="w-24" />
      <SkeletonLine className="flex-1" />
      <div className="h-5 w-16 animate-pulse rounded-full bg-slate-200" />
    </div>
  );
}

/** Skeleton kartu filter (dipakai di halaman log review dan laporan). */
function SkeletonFilter() {
  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1.5">
            <SkeletonLine className="w-16 h-3" />
            <div className="h-9 animate-pulse rounded-xl bg-slate-200" />
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Skeleton full page — dipakai di loading.tsx. */
export function PageSkeleton({
  showFilter = false,
  showTable = false,
  cardCount = 4,
}: {
  showFilter?: boolean;
  showTable?: boolean;
  cardCount?: number;
}) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Memuat halaman...">
      <SkeletonHeader />

      {showFilter && <SkeletonFilter />}

      {showTable ? (
        <Card>
          {/* Header tabel */}
          <div className="flex items-center gap-4 border-b border-border bg-slate-50 px-4 py-3">
            {[1, 2, 3].map((i) => (
              <SkeletonLine key={i} className="w-24 h-3" />
            ))}
          </div>
          {Array.from({ length: cardCount }).map((_, i) => (
            <SkeletonTableRow key={i} />
          ))}
        </Card>
      ) : (
        <div className="space-y-3">
          {Array.from({ length: cardCount }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}
    </div>
  );
}
