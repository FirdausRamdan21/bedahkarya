import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const rawQuery =
      body && typeof body.query === "string" ? body.query.trim() : "";

    if (!rawQuery || rawQuery.length > 100) {
      return NextResponse.json(
        { error: "Kata kunci pencarian tidak valid." },
        { status: 400 }
      );
    }

    const normalizedTrendTerm = rawQuery.toLowerCase();

    await prisma.searchTrend.upsert({
      where: { term: normalizedTrendTerm },
      update: { count: { increment: 1 } },
      create: { term: normalizedTrendTerm, count: 1 },
    });

    const user = await getCurrentUser();
    let history = [];

    if (user) {
      await prisma.searchHistory.deleteMany({
        where: {
          userId: user.id,
          query: rawQuery,
        },
      });

      await prisma.searchHistory.create({
        data: {
          userId: user.id,
          query: rawQuery,
        },
      });

      const allUserHistory = await prisma.searchHistory.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, query: true, createdAt: true },
      });

      if (allUserHistory.length > 5) {
        const overflowIds = allUserHistory.slice(5).map((item) => item.id);
        await prisma.searchHistory.deleteMany({
          where: { id: { in: overflowIds } },
        });
      }

      history = allUserHistory.slice(0, 5).map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      }));
    }

    return NextResponse.json({ ok: true, history }, { status: 200 });
  } catch (error) {
    console.error("Search history POST error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan riwayat pencarian." },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const clearAll = request.nextUrl.searchParams.get("clearAll") === "true";
    const id = request.nextUrl.searchParams.get("id")?.trim() || "";

    if (clearAll) {
      await prisma.searchHistory.deleteMany({
        where: { userId: user.id },
      });
    } else if (id) {
      await prisma.searchHistory.deleteMany({
        where: { id, userId: user.id },
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Search history DELETE error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus riwayat pencarian." },
      { status: 500 }
    );
  }
}
