import { cache } from "react";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  isStaffRole,
  SESSION_COOKIE_NAME,
  SESSION_REMEMBER_MAX_AGE,
  verifySessionToken,
} from "@/lib/session";

export const SAFE_USER_SELECT = {
  id: true,
  username: true,
  name: true,
  email: true,
  phone: true,
  bio: true,
  avatarUrl: true,
  role: true,
  theme: true,
  hideLikeCountDefault: true,
  allowDmFromFollowing: true,
  emailNotifications: true,
  isSuspended: true,
  suspendedUntil: true,
  suspensionReason: true,
  createdAt: true,
};

export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, 10);
}

export async function verifyPassword(plainPassword, hashedPassword) {
  if (!plainPassword || !hashedPassword) {
    return false;
  }
  return bcrypt.compare(plainPassword, hashedPassword);
}

export function isHttpsRequest(request) {
  if (!request) return false;
  const forwardedProto = request.headers?.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0].trim() === "https";
  }
  return request.nextUrl?.protocol === "https:";
}

export function createSessionCookieOptions(
  request,
  { rememberMe = false } = {}
) {
  const base = {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttpsRequest(request),
    path: "/",
  };

  if (rememberMe) {
    return {
      ...base,
      maxAge: SESSION_REMEMBER_MAX_AGE,
    };
  }

  return base;
}

export function toSafeUser(user) {
  if (!user) return null;
  const { password: _removed, ...safeUser } = user;
  return {
    ...safeUser,
    suspendedUntil:
      safeUser.suspendedUntil instanceof Date
        ? safeUser.suspendedUntil.toISOString()
        : safeUser.suspendedUntil || null,
    createdAt:
      safeUser.createdAt instanceof Date
        ? safeUser.createdAt.toISOString()
        : safeUser.createdAt,
  };
}

export async function resolveAutoUnsuspend(user) {
  if (!user || !user.isSuspended || !user.suspendedUntil) {
    return user;
  }

  const expiry = new Date(user.suspendedUntil);
  if (!Number.isNaN(expiry.getTime()) && expiry.getTime() <= Date.now()) {
    const restored = await prisma.user.update({
      where: { id: user.id },
      data: {
        isSuspended: false,
        suspendedUntil: null,
        suspensionReason: null,
      },
      select: SAFE_USER_SELECT,
    });
    return restored;
  }

  return user;
}

export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);
  if (!payload?.sub) {
    return null;
  }

  let user = await prisma.user.findUnique({
    where: { id: String(payload.sub) },
    select: SAFE_USER_SELECT,
  });

  if (!user) {
    return null;
  }

  user = await resolveAutoUnsuspend(user);
  return toSafeUser(user);
});

export async function requireUser() {
  return getCurrentUser();
}

export async function requireActiveUser() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: "Silakan masuk ke akun Anda terlebih dahulu." },
        { status: 401 }
      ),
    };
  }

  if (user.isSuspended) {
    return {
      user,
      errorResponse: NextResponse.json(
        {
          error:
            "Akun Anda sedang ditangguhkan (hanya dapat membaca). Buka Pengumuman > Peringatan untuk mengajukan Uji Banding.",
          suspended: true,
        },
        { status: 403 }
      ),
    };
  }

  return { user, errorResponse: null };
}

export async function requireStaff() {
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role) || user.isSuspended) {
    return null;
  }
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN" || user.isSuspended) {
    return null;
  }
  return user;
}
