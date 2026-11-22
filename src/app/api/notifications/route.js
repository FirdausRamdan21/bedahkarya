import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { NOTIFICATION_CATEGORIES } from "@/lib/notifications";

export async function GET(request) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json(
        { error: "Silakan masuk terlebih dahulu." },
        { status: 401 }
      );
    }

    const categoryParam = (
      request.nextUrl.searchParams.get("category") || ""
    )
      .trim()
      .toUpperCase();

    const rows = await prisma.notification.findMany({
      where: {
        OR: [{ userId: user.id }, { userId: null }],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const groupedCounts = {};
    for (const cat of NOTIFICATION_CATEGORIES) {
      groupedCounts[cat.key] = 0;
    }

    let unreadCount = 0;
    for (const item of rows) {
      groupedCounts[item.category] = (groupedCounts[item.category] || 0) + 1;
      if (item.userId === user.id && !item.isRead) {
        unreadCount += 1;
      }
    }

    const activeCategories = NOTIFICATION_CATEGORIES.filter(
      (cat) => (groupedCounts[cat.key] || 0) > 0
    ).map((cat) => ({
      ...cat,
      count: groupedCounts[cat.key],
    }));

    const filtered = categoryParam
      ? rows.filter((item) => item.category === categoryParam)
      : rows;

    return NextResponse.json(
      {
        notifications: filtered.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        })),
        activeCategories,
        unreadCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json(
      { error: "Gagal memuat pengumuman dan notifikasi." },
      { status: 500 }
    );
  }
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

    const body = await request.json().catch(() => ({}));
    const id = typeof body?.id === "string" ? body.id.trim() : "";

    if (id) {
      await prisma.notification.updateMany({
        where: { id, userId: user.id },
        data: { isRead: true },
      });
    } else {
      await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Notifications PATCH error:", error);
    return NextResponse.json(
      { error: "Gagal menandai notifikasi telah dibaca." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Khusus Administrator untuk mengirim pengumuman global." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const category =
      body?.category === "SYSTEM" ? "SYSTEM" : "ADMIN_ANNOUNCEMENT";
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const message =
      typeof body?.message === "string" ? body.message.trim() : "";
    const linkUrl =
      typeof body?.linkUrl === "string" && body.linkUrl.trim().startsWith("/")
        ? body.linkUrl.trim()
        : null;

    if (title.length < 3 || message.length < 10) {
      return NextResponse.json(
        {
          error:
            "Judul minimal 3 karakter dan isi pengumuman minimal 10 karakter.",
        },
        { status: 400 }
      );
    }

    const created = await prisma.notification.create({
      data: {
        userId: null,
        category,
        title,
        message,
        linkUrl,
      },
    });

    return NextResponse.json(
      {
        message: "Pengumuman berhasil diterbitkan ke seluruh pengguna.",
        notification: {
          ...created,
          createdAt: created.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Notifications POST error:", error);
    return NextResponse.json(
      { error: "Gagal menerbitkan pengumuman." },
      { status: 500 }
    );
  }
}
