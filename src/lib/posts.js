import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isValidCategory } from "@/lib/categories";
import {
  extractPopularTags,
  parseTags,
  sortFeedPosts,
} from "@/services/feedAlgorithm";

export const POST_INCLUDE = {
  author: {
    select: {
      id: true,
      username: true,
      name: true,
      bio: true,
      avatarUrl: true,
      role: true,
      userBadges: {
        select: {
          badge: {
            select: { id: true, slug: true, name: true, icon: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
  },
  event: {
    select: {
      id: true,
      slug: true,
      title: true,
    },
  },
  _count: {
    select: {
      likes: true,
      comments: true,
      bookmarks: true,
    },
  },
};

export function serializePost(
  post,
  { likedSet = new Set(), bookmarkedSet = new Set(), followingSet = new Set() } = {}
) {
  const { userBadges, ...authorRest } = post.author || {};
  const badges = Array.isArray(userBadges)
    ? userBadges.map((ub) => ub.badge).filter(Boolean)
    : Array.isArray(authorRest.badges)
      ? authorRest.badges
      : [];

  return {
    ...post,
    author: {
      ...authorRest,
      badges,
    },
    publishedAt:
      post.publishedAt instanceof Date
        ? post.publishedAt.toISOString()
        : post.publishedAt,
    createdAt:
      post.createdAt instanceof Date
        ? post.createdAt.toISOString()
        : post.createdAt,
    likedByMe: likedSet.has(post.id),
    bookmarkedByMe: bookmarkedSet.has(post.id),
    isFollowingAuthor: followingSet.has(post.authorId),
  };
}

function seededShuffle(items, seedNumber) {
  const arr = [...items];
  let seed = Math.abs(Math.floor(seedNumber)) || 1;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(nextRand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function queryPosts({
  mode = "feed",
  q = "",
  category = "",
  subcategory = "",
  event = "",
  tag = "",
  page = 1,
  limit,
  refreshSeed = 0,
  currentUser,
  includeTags = false,
} = {}) {
  const normalizedMode =
    mode === "following" || mode === "explore" ? mode : "feed";
  const rawQuery = typeof q === "string" ? q.trim() : "";
  const normalizedCategory =
    typeof category === "string" ? category.trim().toUpperCase() : "";
  const normalizedSubcategory =
    typeof subcategory === "string" ? subcategory.trim().toLowerCase() : "";
  const normalizedEvent =
    typeof event === "string" ? event.trim().toLowerCase() : "";
  const normalizedTagParam =
    typeof tag === "string" ? tag.trim().toLowerCase().replace(/^#/, "") : "";

  const isHashSearch = rawQuery.startsWith("#");
  const isMentionSearch = rawQuery.startsWith("@");
  const hashTerm = isHashSearch
    ? rawQuery.slice(1).trim().toLowerCase()
    : "";
  const mentionTerm = isMentionSearch ? rawQuery.slice(1).trim() : "";
  const plainQuery = !isHashSearch && !isMentionSearch ? rawQuery : "";

  const resolvedLimit = Math.min(
    24,
    Math.max(1, Number(limit) || (normalizedMode === "explore" ? 12 : 4))
  );
  const resolvedPage = Math.max(1, Number(page) || 1);

  const user =
    currentUser !== undefined ? currentUser : await getCurrentUser();

  let followingIds = [];
  let likedPostIds = [];
  let bookmarkedPostIds = [];

  if (user) {
    const [follows, likes, bookmarks] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: user.id },
        select: { followingId: true },
      }),
      prisma.like.findMany({
        where: { userId: user.id },
        select: { postId: true },
      }),
      prisma.bookmark.findMany({
        where: { userId: user.id },
        select: { postId: true },
      }),
    ]);
    followingIds = follows.map((item) => item.followingId);
    likedPostIds = likes.map((item) => item.postId);
    bookmarkedPostIds = bookmarks.map((item) => item.postId);
  }

  let availableTags = [];
  if (includeTags) {
    const allTagsRows = await prisma.post.findMany({
      where: { status: "PUBLISHED" },
      select: { tags: true },
      take: 100,
      orderBy: { publishedAt: "desc" },
    });
    availableTags = extractPopularTags(allTagsRows, 12);
  }

  if (normalizedMode === "following" && (!user || followingIds.length === 0)) {
    return {
      posts: [],
      pagination: {
        page: resolvedPage,
        limit: resolvedLimit,
        total: 0,
        totalPages: 0,
        hasMore: false,
      },
      availableTags,
      followingCount: followingIds.length,
      requiresLogin: !user,
    };
  }

  const where = {
    status: "PUBLISHED",
  };

  if (normalizedMode === "following") {
    where.authorId = { in: followingIds };
  }

  if (isValidCategory(normalizedCategory)) {
    where.category = normalizedCategory;
  }

  if (normalizedSubcategory) {
    where.subcategory = normalizedSubcategory;
  }

  if (isMentionSearch && mentionTerm) {
    const mentionOr = [
      { author: { username: { contains: mentionTerm } } },
      { author: { name: { contains: mentionTerm } } },
      { mentions: { contains: mentionTerm } },
    ];
    where.AND = [...(where.AND || []), { OR: mentionOr }];
  } else if (plainQuery) {
    const plainOr = [
      { title: { contains: plainQuery } },
      { caption: { contains: plainQuery } },
      { tags: { contains: plainQuery } },
      { author: { username: { contains: plainQuery } } },
      { author: { name: { contains: plainQuery } } },
    ];
    where.AND = [...(where.AND || []), { OR: plainOr }];
  }

  if (normalizedEvent) {
    where.AND = [
      ...(where.AND || []),
      { OR: [{ event: { slug: normalizedEvent } }, { eventId: normalizedEvent }] },
    ];
  }

  const activeTagFilter = normalizedTagParam || hashTerm;
  const offset = (resolvedPage - 1) * resolvedLimit;
  const likedSet = new Set(likedPostIds);
  const bookmarkedSet = new Set(bookmarkedPostIds);
  const followingSet = new Set(followingIds);

  // Direct SQL pagination path for explore without #tag substring filter
  if (normalizedMode === "explore" && !activeTagFilter) {
    const [total, pagePosts] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        include: POST_INCLUDE,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        skip: offset,
        take: resolvedLimit,
      }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / resolvedLimit);
    return {
      posts: pagePosts.map((post) =>
        serializePost(post, { likedSet, bookmarkedSet, followingSet })
      ),
      pagination: {
        page: resolvedPage,
        limit: resolvedLimit,
        total,
        totalPages,
        hasMore: offset + pagePosts.length < total,
      },
      availableTags,
      followingCount: followingIds.length,
      requiresLogin: false,
    };
  }

  // Bounded query for personalized Home Feed or #tag filtering
  const rawPosts = await prisma.post.findMany({
    where,
    include: POST_INCLUDE,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 80,
  });

  const filteredPosts = activeTagFilter
    ? rawPosts.filter((post) => {
      const postTags = parseTags(post.tags);
      if (normalizedTagParam) {
        return postTags.includes(normalizedTagParam);
      }
      return postTags.some((item) => item.includes(hashTerm));
    })
    : rawPosts;

  let orderedPosts =
    normalizedMode === "feed" && !rawQuery
      ? sortFeedPosts(filteredPosts, {
        followingIds,
        preferredTags: activeTagFilter ? [activeTagFilter] : [],
      })
      : filteredPosts;

  const parsedSeed = Number(refreshSeed) || 0;
  if (parsedSeed > 0 && orderedPosts.length > 1) {
    orderedPosts = seededShuffle(orderedPosts, parsedSeed);
  }

  const total = orderedPosts.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / resolvedLimit);

  const posts = orderedPosts
    .slice(offset, offset + resolvedLimit)
    .map((post) =>
      serializePost(post, { likedSet, bookmarkedSet, followingSet })
    );

  return {
    posts,
    pagination: {
      page: resolvedPage,
      limit: resolvedLimit,
      total,
      totalPages,
      hasMore: offset + posts.length < total,
    },
    availableTags,
    followingCount: followingIds.length,
    requiresLogin: false,
  };
}
