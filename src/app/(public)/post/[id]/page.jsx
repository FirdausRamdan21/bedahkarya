import { notFound } from "next/navigation";
import PostDetailView from "@/components/PostDetailView";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { POST_INCLUDE, serializePost } from "@/lib/posts";
import { isStaffRole } from "@/lib/session";
import { getCachedCategories } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const postId = decodeURIComponent(id || "").trim();

  if (!postId) {
    return { title: "Konten Tidak Ditemukan — BedahKarya" };
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      title: true,
      status: true,
      author: {
        select: { username: true },
      },
    },
  });

  if (!post || post.status === "DRAFT") {
    return { title: "Konten — BedahKarya" };
  }

  return {
    title: `${post.title} (@${post.author.username}) — BedahKarya`,
  };
}

export default async function PostDetailPage({ params }) {
  const { id } = await params;
  const postId = decodeURIComponent(id || "").trim();

  if (!postId) {
    notFound();
  }

  const [currentUser, categories, post] = await Promise.all([
    getCurrentUser(),
    getCachedCategories(),
    prisma.post.findUnique({
      where: { id: postId },
      include: POST_INCLUDE,
    }),
  ]);

  if (!post) {
    notFound();
  }

  if (
    post.status === "DRAFT" &&
    (!currentUser ||
      (currentUser.id !== post.authorId && !isStaffRole(currentUser.role)))
  ) {
    notFound();
  }

  const [likeRow, bookmarkRow, followRow, sameAuthorPosts, fallbackPosts] =
    await Promise.all([
      currentUser
        ? prisma.like.findUnique({
            where: {
              postId_userId: {
                postId: post.id,
                userId: currentUser.id,
              },
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      currentUser
        ? prisma.bookmark.findUnique({
            where: {
              postId_userId: {
                postId: post.id,
                userId: currentUser.id,
              },
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      currentUser && currentUser.id !== post.authorId
        ? prisma.follow.findUnique({
            where: {
              followerId_followingId: {
                followerId: currentUser.id,
                followingId: post.authorId,
              },
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      prisma.post.findMany({
        where: {
          status: "PUBLISHED",
          authorId: post.authorId,
          id: { not: post.id },
        },
        select: {
          id: true,
          title: true,
          caption: true,
          imageUrl: true,
          imageFormat: true,
          category: true,
          author: {
            select: { username: true },
          },
        },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: 4,
      }),
      prisma.post.findMany({
        where: {
          status: "PUBLISHED",
          id: { not: post.id },
          authorId: { not: post.authorId },
        },
        select: {
          id: true,
          title: true,
          caption: true,
          imageUrl: true,
          imageFormat: true,
          category: true,
          author: {
            select: { username: true },
          },
        },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: 4,
      }),
    ]);

  const likedSet = likeRow ? new Set([post.id]) : new Set();
  const bookmarkedSet = bookmarkRow ? new Set([post.id]) : new Set();
  const followingSet = followRow ? new Set([post.authorId]) : new Set();

  const serializedPost = serializePost(post, {
    likedSet,
    bookmarkedSet,
    followingSet,
  });

  const relatedPosts = [...sameAuthorPosts, ...fallbackPosts].slice(0, 4);

  return (
    <PostDetailView
      initialPost={serializedPost}
      initialFollowingAuthor={Boolean(followRow)}
      relatedPosts={relatedPosts}
      categories={categories}
      currentUser={currentUser}
    />
  );
}
