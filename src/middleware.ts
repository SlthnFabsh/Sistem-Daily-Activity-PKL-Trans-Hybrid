import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const publicPaths = ["/login"];
const authPaths = ["/login"];

export async function middleware(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    // Redirect authenticated users away from auth pages
    if (session && authPaths.some((p) => pathname.startsWith(p))) {
      const role = session.user.role;
      const redirectMap = {
        SUPERADMIN: "/hrd/absensi",
        HRD: "/hrd/absensi",
        MENTOR: "/mentor/absensi",
        STUDENT: "/student/absensi",
      };
      return NextResponse.redirect(
        new URL(redirectMap[role] || "/", request.url)
      );
    }
    return NextResponse.next();
  }

  // Require authentication for protected paths
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Student profile completion check
  if (session.user.role === "STUDENT") {
    const isProfileSetup = pathname.startsWith("/student/profile/setup");
    const isProfileRoute = pathname.startsWith("/student/profile");

    // Allow profile routes without checking completion
    if (isProfileRoute) {
      return NextResponse.next();
    }

    // Check if profile is completed
    if (!session.user.profileCompleted && !isProfileSetup) {
      return NextResponse.redirect(
        new URL("/student/profile/setup", request.url)
      );
    }

    // Redirect away from setup if profile is already completed
    if (session.user.profileCompleted && isProfileSetup) {
      return NextResponse.redirect(
        new URL("/student/absensi", request.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|monitoring).*)",
  ],
};