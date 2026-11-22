import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    const [
      users,
      posts,
      comments,
      likes,
      follows,
      reports,
      moderationLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.post.count(),
      prisma.comment.count(),
      prisma.like.count(),
      prisma.follow.count(),
      prisma.report.count(),
      prisma.moderationLog.count(),
    ]);

    return NextResponse.json(
      {
        status: "ok",
        database: "connected",
        counts: {
          users,
          posts,
          comments,
          likes,
          follows,
          reports,
          moderationLogs,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Health check gagal:", error);
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        error: "Gagal terhubung ke basis data.",
      },
      { status: 500 }
    );
  }
}
