import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  createSessionCookieOptions,
  hashPassword,
  toSafeUser,
} from "@/lib/auth";
import { validateRegisterPassword } from "@/lib/categories";
import {
  SESSION_COOKIE_NAME,
  signSessionToken,
} from "@/lib/session";

const USERNAME_REGEX = /^[a-z0-9_]{3,24}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-\s()]{9,20}$/;

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Format permintaan tidak valid." },
        { status: 400 }
      );
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const username =
      typeof body.username === "string"
        ? body.username.trim().toLowerCase()
        : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone =
      typeof body.phone === "string" ? body.phone.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (name.length < 2) {
      return NextResponse.json(
        { error: "Nama lengkap minimal 2 karakter." },
        { status: 400 }
      );
    }

    if (!USERNAME_REGEX.test(username)) {
      return NextResponse.json(
        {
          error:
            "Username harus 3–24 karakter dan hanya boleh berisi huruf kecil, angka, atau garis bawah (_).",
        },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "Format alamat email tidak valid." },
        { status: 400 }
      );
    }

    if (phone && !PHONE_REGEX.test(phone)) {
      return NextResponse.json(
        { error: "Format nomor telepon tidak valid (9–20 digit/angka)." },
        { status: 400 }
      );
    }

    const passwordCheck = validateRegisterPassword(password);
    if (!passwordCheck.ok) {
      return NextResponse.json(
        { error: passwordCheck.error },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
      select: { email: true, username: true },
    });

    if (existing) {
      const conflictMessage =
        existing.email === email
          ? "Email sudah terdaftar. Silakan gunakan email lain atau masuk."
          : "Username sudah dipakai kreator lain.";
      return NextResponse.json({ error: conflictMessage }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const createdUser = await prisma.user.create({
      data: {
        name,
        username,
        email,
        phone: phone || null,
        password: passwordHash,
        role: "USER",
      },
    });

    const safeUser = toSafeUser(createdUser);
    const token = await signSessionToken(safeUser, { rememberMe: true });

    const response = NextResponse.json(
      {
        message: "Pendaftaran akun berhasil.",
        user: safeUser,
      },
      { status: 201 }
    );

    response.cookies.set(
      SESSION_COOKIE_NAME,
      token,
      createSessionCookieOptions(request, { rememberMe: true })
    );

    return response;
  } catch (error) {
    console.error("Error register:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mendaftarkan akun." },
      { status: 500 }
    );
  }
}
