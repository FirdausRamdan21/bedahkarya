import { notFound } from "next/navigation";
import ProfileView from "@/components/ProfileView";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { POST_INCLUDE, serializePost } from "@/lib/posts";
import { getCachedCategories } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params, searchParams }) {
  const [{ username }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const normalizedUsername = decodeURIComponent(username).toLowerCase();
  const initialTabParam =
    typeof resolvedSearchParams?.tab === "string"
      ? resolvedSearchParams.tab.trim().toLowerCase()
      : "own";

  const [currentUser, categories, profile] = await Promise.all([
    getCurrentUser(),
    getCachedCategories(),
    prisma.user.findUnique({
      where: { username: normalizedUsername },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        userBadges: {
          orderBy: { createdAt: "desc" },
          select: {
            badge: {
              select: {
                id: true,
                slug: true,
                name: true,
                description: true,
                icon: true,
              },
            },
          },
        },
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
      },
    }),
  ]);

  if (!profile) {
    notFound();
  }

  const isOwnProfile = currentUser?.id === profile.id;

  const [publishedPosts, bookmarkRows, draftPosts, helpfulCount] =
    await Promise.all([
      prisma.post.findMany({
        where: { authorId: profile.id, status: "PUBLISHED" },
        include: POST_INCLUDE,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      }),
      prisma.bookmark.findMany({
        where: {
          userId: profile.id,
          post: { status: "PUBLISHED" },
        },
        include: {
          post: {
            include: POST_INCLUDE,
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      isOwnProfile
        ? prisma.post.findMany({
            where: { authorId: profile.id, status: "DRAFT" },
            include: POST_INCLUDE,
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
      prisma.comment.count({
        where: { userId: profile.id, isHelpful: true },
      }),
    ]);

  const savedRawPosts = bookmarkRows.map((row) => row.post).filter(Boolean);
  const allPostsCombined = [...publishedPosts, ...savedRawPosts, ...draftPosts];
  const allPostIds = Array.from(new Set(allPostsCombined.map((p) => p.id)));
  const allAuthorIds = Array.from(
    new Set([profile.id, ...allPostsCombined.map((p) => p.authorId)])
  );

  let initialFollowing = false;
  const likedSet = new Set();
  const bookmarkedSet = new Set();
  const followingSet = new Set();

  if (currentUser) {
    const [likeRows, viewerBookmarks, viewerFollows] = await Promise.all([
      allPostIds.length > 0
        ? prisma.like.findMany({
            where: {
              userId: currentUser.id,
              postId: { in: allPostIds },
            },
            select: { postId: true },
          })
        : Promise.resolve([]),
      allPostIds.length > 0
        ? prisma.bookmark.findMany({
            where: {
              userId: currentUser.id,
              postId: { in: allPostIds },
            },
            select: { postId: true },
          })
        : Promise.resolve([]),
      prisma.follow.findMany({
        where: {
          followerId: currentUser.id,
          followingId: { in: allAuthorIds },
        },
        select: { followingId: true },
      }),
    ]);

    for (const row of likeRows) likedSet.add(row.postId);
    for (const row of viewerBookmarks) bookmarkedSet.add(row.postId);
    for (const row of viewerFollows) followingSet.add(row.followingId);
    initialFollowing = followingSet.has(profile.id);
  }

  const opts = { likedSet, bookmarkedSet, followingSet };
  const initialPosts = publishedPosts.map((post) => serializePost(post, opts));
  const initialSavedPosts = savedRawPosts.map((post) =>
    serializePost(post, opts)
  );
  const initialDraftPosts = draftPosts.map((post) => serializePost(post, opts));

  const safeProfile = {
    id: profile.id,
    username: profile.username,
    name: profile.name,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    role: profile.role,
    helpfulCount,
    badges: (profile.userBadges || []).map((ub) => ub.badge).filter(Boolean),
    createdAt: profile.createdAt.toISOString(),
    _count: {
      posts: publishedPosts.length,
      followers: profile._count.followers,
      following: profile._count.following,
    },
  };

  const resolvedTab =
    initialTabParam === "saved"
      ? "saved"
      : initialTabParam === "draft" && isOwnProfile
        ? "draft"
        : "own";

  return (
    <ProfileView
      profile={safeProfile}
      initialPosts={initialPosts}
      initialSavedPosts={initialSavedPosts}
      initialDraftPosts={initialDraftPosts}
      categories={categories}
      initialTab={resolvedTab}
      initialFollowing={initialFollowing}
      currentUser={currentUser}
    />
  );
}
