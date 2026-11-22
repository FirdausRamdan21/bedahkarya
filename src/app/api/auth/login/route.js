import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  createSessionCookieOptions,
  resolveAutoUnsuspend,
  toSafeUser,
  verifyPassword,
} from "@/lib/auth";
import {
  getSafeRedirectPath,
  SESSION_COOKIE_NAME,
  signSessionToken,
} from "@/lib/session";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Format permintaan tidak valid." },
        { status: 400 }
      );
    }

    const rawIdentifier =
      body.identifier ?? body.email ?? body.username ?? "";
    const identifier =
      typeof rawIdentifier === "string"
        ? rawIdentifier.trim().toLowerCase()
        : "";
    const password = typeof body.password === "string" ? body.password : "";
    const rememberMe = Boolean(body.rememberMe);

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Email/username dan kata sandi wajib diisi." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Email/username atau kata sandi salah." },
        { status: 401 }
      );
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Email/username atau kata sandi salah." },
        { status: 401 }
      );
    }

    const resolvedUser = await resolveAutoUnsuspend(user);
    const safeUser = toSafeUser(resolvedUser);
    const token = await signSessionToken(safeUser, { rememberMe });
    const redirectTo = safeUser.isSuspended
      ? "/notifications?category=WARNING"
      : getSafeRedirectPath(body.next, safeUser.role);

    const response = NextResponse.json(
      {
        message: safeUser.isSuspended
          ? "Masuk dalam mode baca. Akun Anda sedang ditangguhkan dan dapat mengajukan Uji Banding."
          : "Login berhasil.",
        user: safeUser,
        redirectTo,
      },
      { status: 200 }
    );

    response.cookies.set(
      SESSION_COOKIE_NAME,
      token,
      createSessionCookieOptions(request, { rememberMe })
    );

    return response;
  } catch (error) {
    console.error("Error login:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memproses login." },
      { status: 500 }
    );
  }
}
