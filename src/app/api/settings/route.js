import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  hashPassword,
  requireUser,
  SAFE_USER_SELECT,
  toSafeUser,
  verifyPassword,
} from "@/lib/auth";
import { validateRegisterPassword } from "@/lib/categories";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json(
      { error: "Silakan masuk terlebih dahulu." },
      { status: 401 }
    );
  }

  return NextResponse.json({ settings: user }, { status: 200 });
}

export async function PATCH(request) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json(
        { error: "Silakan masuk terlebih dahulu." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Format permintaan tidak valid." },
        { status: 400 }
      );
    }

    if (body.action === "CHANGE_PASSWORD") {
      const currentPassword =
        typeof body.currentPassword === "string" ? body.currentPassword : "";
      const newPassword =
        typeof body.newPassword === "string" ? body.newPassword : "";

      if (!currentPassword || !newPassword) {
        return NextResponse.json(
          { error: "Kata sandi lama dan baru wajib diisi." },
          { status: 400 }
        );
      }

      const passCheck = validateRegisterPassword(newPassword);
      if (!passCheck.ok) {
        return NextResponse.json({ error: passCheck.error }, { status: 400 });
      }

      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { password: true },
      });

      const valid = await verifyPassword(currentPassword, fullUser?.password);
      if (!valid) {
        return NextResponse.json(
          { error: "Kata sandi lama tidak sesuai." },
          { status: 400 }
        );
      }

      const hashed = await hashPassword(newPassword);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashed },
      });

      return NextResponse.json(
        { message: "Kata sandi berhasil diperbarui." },
        { status: 200 }
      );
    }

    const data = {};

    if (body.theme === "LIGHT" || body.theme === "DARK") {
      data.theme = body.theme;
    }

    if (typeof body.hideLikeCountDefault === "boolean") {
      data.hideLikeCountDefault = body.hideLikeCountDefault;
    }

    if (typeof body.allowDmFromFollowing === "boolean") {
      data.allowDmFromFollowing = body.allowDmFromFollowing;
    }

    if (typeof body.emailNotifications === "boolean") {
      data.emailNotifications = body.emailNotifications;
    }

    if (typeof body.phone === "string") {
      const trimmedPhone = body.phone.trim();
      if (trimmedPhone && !/^[0-9+\-\s()]{9,20}$/.test(trimmedPhone)) {
        return NextResponse.json(
          { error: "Format nomor telepon tidak valid (9–20 digit)." },
          { status: 400 }
        );
      }
      data.phone = trimmedPhone || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Tidak ada perubahan pengaturan yang dikirim." },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: SAFE_USER_SELECT,
    });

    return NextResponse.json(
      {
        message: "Pengaturan akun berhasil disimpan.",
        settings: toSafeUser(updated),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Settings PATCH error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menyimpan pengaturan." },
      { status: 500 }
    );
  }
}
