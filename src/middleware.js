import { NextResponse } from "next/server";
import {
  isStaffRole,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/session";

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!isStaffRole(session.role)) {
      const homeUrl = new URL("/", request.url);
      homeUrl.searchParams.set("error", "forbidden");
      return NextResponse.redirect(homeUrl);
    }

    return NextResponse.next();
  }

  const protectedPaths = ["/upload", "/settings", "/notifications", "/messages"];
  if (
    protectedPaths.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  ) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  if (pathname === "/login" || pathname === "/register") {
    if (session) {
      const target = isStaffRole(session.role) ? "/admin" : "/";
      return NextResponse.redirect(new URL(target, request.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/upload/:path*",
    "/settings/:path*",
    "/notifications/:path*",
    "/messages/:path*",
    "/login",
    "/register",
  ],
};
