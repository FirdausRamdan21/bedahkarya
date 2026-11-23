"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  FileText,
  Mail,
  Share2,
  UserCheck,
  UserPlus,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import BadgePill from "@/components/BadgePill";
import CommentSection from "@/components/CommentSection";
import PostCard from "@/components/PostCard";
import ShareModal from "@/components/ShareModal";
import { CONTENT_CATEGORIES, getCategoryMeta } from "@/lib/categories";

export default function PostDetailView({
  initialPost,
  initialFollowingAuthor,
  relatedPosts,
  categories = CONTENT_CATEGORIES,
  currentUser,
}) {
  const router = useRouter();
  const [post, setPost] = useState(initialPost);
  const [isFollowing, setIsFollowing] = useState(
    Boolean(initialFollowingAuthor)
  );
  const [followLoading, setFollowLoading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const isOwnPost = currentUser?.id === post.authorId;
  const isLandscapeDetail =
    Boolean(post.imageUrl) && post.imageFormat === "LANDSCAPE";

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  async function handleFollowToggle() {
    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent(`/post/${post.id}`)}`);
      return;
    }

    if (isOwnPost || followLoading || currentUser.isSuspended) return;

    const prev = isFollowing;
    setIsFollowing(!prev);
    setPost((p) => ({ ...p, isFollowingAuthor: !prev }));
    setFollowLoading(true);
    try {
      const response = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "FOLLOW",
          targetUserId: post.authorId,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data) {
        setIsFollowing(prev);
        setPost((p) => ({ ...p, isFollowingAuthor: prev }));
        return;
      }
      const nextFollowing = Boolean(data.following);
      setIsFollowing(nextFollowing);
      setPost((p) => ({ ...p, isFollowingAuthor: nextFollowing }));
    } catch {
      setIsFollowing(prev);
      setPost((p) => ({ ...p, isFollowingAuthor: prev }));
    } finally {
      setFollowLoading(false);
    }
  }

  function handleFollowChangeFromCard(_authorId, nextFollowing) {
    setIsFollowing(nextFollowing);
    setPost((prev) => ({ ...prev, isFollowingAuthor: nextFollowing }));
  }

  function handlePostChange(_postId, patch) {
    setPost((prev) => ({
      ...prev,
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.caption !== undefined ? { caption: patch.caption } : {}),
      ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      ...(patch.subcategory !== undefined
        ? { subcategory: patch.subcategory }
        : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.externalLink !== undefined
        ? { externalLink: patch.externalLink }
        : {}),
      ...(patch.mentions !== undefined ? { mentions: patch.mentions } : {}),
      ...(patch.hideLikeCount !== undefined
        ? { hideLikeCount: patch.hideLikeCount }
        : {}),
      ...(patch.likedByMe !== undefined ? { likedByMe: patch.likedByMe } : {}),
      ...(patch.bookmarkedByMe !== undefined
        ? { bookmarkedByMe: patch.bookmarkedByMe }
        : {}),
      _count: {
        ...prev._count,
        likes: patch.likesCount ?? prev._count?.likes ?? 0,
        comments: patch.commentsCount ?? prev._count?.comments ?? 0,
        bookmarks: patch.bookmarksCount ?? prev._count?.bookmarks ?? 0,
      },
    }));
  }

  function handleCommentCountChange(nextCount) {
    setPost((prev) => ({
      ...prev,
      _count: {
        ...prev._count,
        comments: nextCount,
      },
    }));
  }

  function handlePostDelete() {
    router.push(`/profile/${post.author.username}`);
    router.refresh();
  }

  const authorBadges = post.author?.badges || [];

  const authorProfileCard = (
    <section className="space-y-4 rounded-xl border border-[#CBD5E1] bg-white p-5 dark:border-slate-700 dark:bg-[#1E293B]">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/profile/${post.author.username}`}
          className="group flex min-w-0 items-center gap-3"
        >
          <Avatar
            name={post.author.name}
            username={post.author.username}
            avatarUrl={post.author.avatarUrl}
            size="lg"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#1E293B] group-hover:text-[#2563EB] group-hover:underline dark:text-white">
              {post.author.name}
            </p>
            <p className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">
              @{post.author.username}
            </p>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5">
          {isOwnPost ? (
            <Link
              href={`/profile/${post.author.username}`}
              className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-medium text-[#1E293B] hover:border-[#2563EB] hover:text-[#2563EB] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              Profil Saya
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={handleFollowToggle}
                disabled={followLoading || currentUser?.isSuspended}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${isFollowing
                  ? "border border-[#2563EB]/30 bg-[#2563EB]/10 text-[#2563EB] hover:bg-[#2563EB]/15 dark:text-blue-300"
                  : "bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
                  }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="h-3.5 w-3.5" />
                    Mengikuti
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5" />
                    Ikuti
                  </>
                )}
              </button>
              {isFollowing && currentUser && !currentUser.isSuspended && (
                <Link
                  href={`/messages?to=${encodeURIComponent(post.authorId)}`}
                  title="Kirim Pesan Langsung (DM)"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#2563EB] hover:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                >
                  <Mail className="h-3.5 w-3.5" />
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {authorBadges.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {authorBadges.map((b) => (
            <BadgePill key={b.id} badge={b} compact />
          ))}
        </div>
      )}

      {post.author.bio && (
        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {post.author.bio}
        </p>
      )}
    </section>
  );

  const discussionCard = (
    <section
      id="diskusi-karya"
      className="rounded-xl border border-[#CBD5E1] bg-white p-5 dark:border-slate-700 dark:bg-[#1E293B]"
    >
      <h2 className="text-sm font-bold text-[#1E293B] dark:text-white">
        Ulasan &amp; Diskusi ({post._count?.comments ?? 0})
      </h2>
      <CommentSection
        postId={post.id}
        postAuthorId={post.authorId}
        category={post.category}
        currentUser={currentUser}
        onCountChange={handleCommentCountChange}
      />
    </section>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-3.5 py-2 text-xs font-medium text-[#1E293B] transition hover:border-[#2563EB] hover:text-[#2563EB] dark:border-slate-700 dark:bg-[#1E293B] dark:text-slate-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali
        </button>

        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3.5 py-2 text-xs font-medium text-[#1E293B] transition hover:border-[#2563EB] hover:text-[#2563EB] dark:border-slate-700 dark:bg-[#1E293B] dark:text-slate-100"
        >
          <Share2 className="h-3.5 w-3.5 text-[#2563EB]" />
          <span>Bagikan Konten</span>
        </button>
      </div>

      {isLandscapeDetail ? (
        <div data-testid="detail-layout-landscape" className="space-y-6">
          <PostCard
            post={post}
            categories={categories}
            currentUser={currentUser}
            variant="detail-landscape"
            hideInlineComments={true}
            onPostChange={handlePostChange}
            onPostDelete={handlePostDelete}
            onFollowChange={handleFollowChangeFromCard}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-4">{authorProfileCard}</div>
            <div className="lg:col-span-8">{discussionCard}</div>
          </div>
        </div>
      ) : (
        <div
          data-testid="detail-layout-portrait"
          className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start"
        >
          <div className="lg:col-span-7">
            <PostCard
              post={post}
              categories={categories}
              currentUser={currentUser}
              variant="feed"
              hideInlineComments={true}
              onPostChange={handlePostChange}
              onPostDelete={handlePostDelete}
              onFollowChange={handleFollowChangeFromCard}
            />
          </div>

          <aside className="space-y-5 lg:col-span-5">
            {authorProfileCard}
            {discussionCard}
          </aside>
        </div>
      )}

      {relatedPosts.length > 0 && (
        <section className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#1E293B] dark:text-white">
              Konten Lainnya
            </h2>
            <Link
              href="/search"
              className="text-xs font-semibold text-[#2563EB] hover:underline"
            >
              Lihat Eksplorasi &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {relatedPosts.map((item) => {
              const catMeta = getCategoryMeta(item.category, categories);
              const itemLandscape =
                item.imageUrl && item.imageFormat === "LANDSCAPE";
              const itemText = !item.imageUrl || item.imageFormat === "TEXT";
              return (
                <Link
                  key={item.id}
                  href={`/post/${item.id}`}
                  className="group overflow-hidden rounded-xl border border-[#CBD5E1] bg-white transition hover:border-[#2563EB] dark:border-slate-700 dark:bg-[#1E293B]"
                >
                  <div
                    className={`bk-protected-media aspect-square overflow-hidden ${itemLandscape
                      ? "flex items-center justify-center bg-[#1E293B] p-1"
                      : itemText
                        ? "flex flex-col justify-between bg-[#CBD5E1] p-3 text-[#1E293B] dark:bg-slate-700 dark:text-slate-100"
                        : "bg-[#1E293B]"
                      }`}
                  >
                    {itemText ? (
                      <>
                        <FileText className="h-4 w-4 text-[#2563EB]" />
                        <p className="line-clamp-4 text-xs leading-relaxed">
                          {item.caption}
                        </p>
                      </>
                    ) : (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        draggable={false}
                        className={`transition duration-300 group-hover:scale-[1.03] ${itemLandscape
                          ? "max-h-full w-full object-contain"
                          : "h-full w-full object-cover"
                          }`}
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-xs font-semibold text-[#1E293B] dark:text-white">
                      {item.title}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-mono">@{item.author.username}</span>{" "}
                      &middot; {catMeta.shortLabel}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        post={post}
        currentUser={currentUser}
      />
    </div>
  );
}
