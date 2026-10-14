// loading.tsx di level route group (app) — berlaku untuk SEMUA sub-halaman
// (student/*, mentor/*, hrd/*) secara otomatis via Next.js Streaming.
// Muncul segera saat navigasi dimulai, sebelum server selesai fetch data.

import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function AppLoading() {
  return <PageSkeleton showFilter cardCount={4} />;
}
