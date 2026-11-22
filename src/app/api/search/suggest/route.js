import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { parseTags } from "@/services/feedAlgorithm";

export async function GET(request) {
  try {
    const rawQ = (request.nextUrl.searchParams.get("q") || "").trim();
    const user = await getCurrentUser();

    if (rawQ.startsWith("@")) {
      const term = rawQ.slice(1).trim().toLowerCase();

      let followerIds = [];
      let followingIds = [];

      if (user) {
        const [followersRows, followingRows] = await Promise.all([
          prisma.follow.findMany({
            where: { followingId: user.id },
            select: { followerId: true },
            orderBy: { createdAt: "desc" },
          }),
          prisma.follow.findMany({
            where: { followerId: user.id },
            select: { followingId: true },
            orderBy: { createdAt: "desc" },
          }),
        ]);
        followerIds = followersRows.map((row) => row.followerId);
        followingIds = followingRows.map((row) => row.followingId);
      }

      const followerSet = new Set(followerIds);
      const followingSet = new Set(followingIds);

      const where = {
        isSuspended: false,
        ...(term
          ? {
              OR: [
                { username: { contains: term } },
                { name: { contains: term } },
              ],
            }
          : {}),
      };

      const candidates = await prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          name: true,
          avatarUrl: true,
        },
        take: 30,
      });

      const ranked = candidates
        .sort((a, b) => {
          const rank = (item) => {
            if (followerSet.has(item.id)) return 3;
            if (followingSet.has(item.id)) return 2;
            if (user && item.id === user.id) return 0;
            return 1;
          };
          const diff = rank(b) - rank(a);
          if (diff !== 0) return diff;
          return a.username.localeCompare(b.username);
        })
        .slice(0, 8)
        .map((item) => ({
          ...item,
          relation: followerSet.has(item.id)
            ? "Pengikut"
            : followingSet.has(item.id)
              ? "Mengikuti"
              : "Kreator",
        }));

      return NextResponse.json(
        { mode: "mention", users: ranked },
        { status: 200 }
      );
    }

    if (rawQ.startsWith("#")) {
      const term = rawQ.slice(1).trim().toLowerCase();

      const latestPosts = await prisma.post.findMany({
        where: { status: "PUBLISHED" },
        select: { tags: true, createdAt: true },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: 100,
      });

      const orderedRecentTags = [];
      const seen = new Set();
      const tagCounts = new Map();

      for (const post of latestPosts) {
        const postTags = parseTags(post.tags);
        for (const tag of postTags) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          if (!seen.has(tag)) {
            seen.add(tag);
            orderedRecentTags.push(tag);
          }
        }
      }

      if (!term) {
        const recentFive = orderedRecentTags.slice(0, 5).map((tag) => ({
          tag,
          count: tagCounts.get(tag) || 1,
        }));
        return NextResponse.json(
          { mode: "tag", tags: recentFive, isRecentDefault: true },
          { status: 200 }
        );
      }

      const matching = orderedRecentTags
        .filter((tag) => tag.toLowerCase().includes(term))
        .sort((a, b) => {
          const aStarts = a.toLowerCase().startsWith(term) ? 1 : 0;
          const bStarts = b.toLowerCase().startsWith(term) ? 1 : 0;
          if (bStarts !== aStarts) return bStarts - aStarts;
          return (tagCounts.get(b) || 0) - (tagCounts.get(a) || 0);
        })
        .slice(0, 8)
        .map((tag) => ({
          tag,
          count: tagCounts.get(tag) || 1,
        }));

      return NextResponse.json(
        { mode: "tag", tags: matching, isRecentDefault: false },
        { status: 200 }
      );
    }

    const [historyRows, trendRows] = await Promise.all([
      user
        ? prisma.searchHistory.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: { id: true, query: true, createdAt: true },
          })
        : Promise.resolve([]),
      prisma.searchTrend.findMany({
        orderBy: [{ count: "desc" }, { updatedAt: "desc" }],
        take: 6,
        select: { id: true, term: true, count: true },
      }),
    ]);

    return NextResponse.json(
      {
        mode: "default",
        history: historyRows.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        })),
        trends: trendRows,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Search suggest error:", error);
    return NextResponse.json(
      { error: "Gagal memuat saran pencarian." },
      { status: 500 }
    );
  }
}
