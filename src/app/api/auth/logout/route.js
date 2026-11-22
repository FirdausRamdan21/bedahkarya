import { NextResponse } from "next/server";
import { isHttpsRequest } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export async function POST(request) {
  const response = NextResponse.json(
    { message: "Berhasil keluar dari akun." },
    { status: 200 }
  );

  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttpsRequest(request),
    path: "/",
    maxAge: 0,
  });

  return response;
}
