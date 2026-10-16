import type { NextAuthRequest } from "next-auth";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { homePathForRole } from "@/lib/permissions";
import type { Role } from "@/generated/prisma/client";

const PROTECTED_PREFIXES = ["/student", "/mentor", "/hrd", "/superadmin"];

// Area yang boleh dibuka tiap role. SUPERADMIN boleh masuk /hrd karena
// beberapa halaman admin (divisi, periode, dsb.) memang berada di bawah /hrd.
const ROLE_PREFIXES: Record<Role, string[]> = {
  STUDENT: ["/student"],
  MENTOR: ["/mentor"],
  HRD: ["/hrd"],
  SUPERADMIN: ["/superadmin", "/hrd"],
};

// Next.js 16: middleware kini disebut "proxy". Berlaku untuk semua rute aplikasi.
export default auth((req: NextAuthRequest) => {
  const { nextUrl } = req;
  const path = nextUrl.pathname;
  const user = req.auth?.user;
  const role = user?.role;

  // Halaman masuk terbuka, tapi jika sudah login arahkan ke beranda role.
  if (path.startsWith("/login")) {
    if (role) {
      return NextResponse.redirect(new URL(homePathForRole(role), nextUrl));
    }
    return NextResponse.next();
  }

  // Belum login: semua rute lain dialihkan ke /login.
  if (!role) {
    const loginUrl = new URL("/login", nextUrl);
    if (path !== "/") loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  // Sudah login di / berarti belum ditentukan: arahkan ke beranda sesuai role.
  if (path === "/") {
    return NextResponse.redirect(new URL(homePathForRole(role), nextUrl));
  }

  // Blokir akses lintas role: mentor tidak boleh buka /student, dst.
  const prefix = PROTECTED_PREFIXES.find((p) => path.startsWith(p));
  if (prefix && !ROLE_PREFIXES[role].includes(prefix)) {
    return NextResponse.redirect(new URL(homePathForRole(role), nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png$).*)",
  ],
};