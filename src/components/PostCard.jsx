"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bookmark,
  Calendar,
  Check,
  ExternalLink,
  FileText,
  Flag,
  Heart,
  Link2,
  Loader2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import BadgePill from "@/components/BadgePill";
import {
  CONTENT_CATEGORIES,
  containsLink,
  countWords,
  getCategoryMeta,
  getSubcategoryLabel,
} from "@/lib/categories";
import { formatRelativeTime } from "@/lib/format";

const CaptionModal = dynamic(() => import("@/components/CaptionModal"), {
  ssr: false,
});
const CommentSection = dynamic(() => import("@/components/CommentSection"), {
  ssr: false,
});
const ExternalLinkModal = dynamic(
  () => import("@/components/ExternalLinkModal"),
  { ssr: false }
);
const ReportModal = dynamic(() => import("@/components/ReportModal"), {
  ssr: false,
});
const ShareModal = dynamic(() => import("@/components/ShareModal"), {
  ssr: false,
});

function extractHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default function PostCard({
  post,
  currentUser,
  categories = CONTENT_CATEGORIES,
  variant = "feed",
  hideInlineComments = false,
  onPostChange,
  onPostDelete,
  onFollowChange,
}) {
  const [title, setTitle] = useState(post.title);
  const [caption, setCaption] = useState(post.caption);
  const [tagsString, setTagsString] = useState(post.tags || "");
  const [category, setCategory] = useState(post.category);
  const [subcategory, setSubcategory] = useState(post.subcategory || "");
  const [status, setStatus] = useState(post.status || "PUBLISHED");
  const [externalLink, setExternalLink] = useState(post.externalLink || "");
  const [mentions, setMentions] = useState(post.mentions || "");
  const [hideLikeCount, setHideLikeCount] = useState(Boolean(post.hideLikeCount));

  const [liked, setLiked] = useState(Boolean(post.likedByMe));
  const [bookmarked, setBookmarked] = useState(Boolean(post.bookmarkedByMe));
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(
    Boolean(post.isFollowingAuthor)
  );
  const [likesCount, setLikesCount] = useState(post._count?.likes ?? 0);
  const [commentsCount, setCommentsCount] = useState(post._count?.comments ?? 0);

  const [likeLoading, setLikeLoading] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isCaptionOpen, setIsCaptionOpen] = useState(false);
  const [pendingExternalUrl, setPendingExternalUrl] = useState("");
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: post.title,
    caption: post.caption,
    tags: post.tags || "",
    category: post.category,
    subcategory: post.subcategory || "",
    externalLink: post.externalLink || "",
    mentions: post.mentions || "",
    hideLikeCount: Boolean(post.hideLikeCount),
  });
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const menuRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    setTitle(post.title);
    setCaption(post.caption);
    setTagsString(post.tags || "");
    setCategory(post.category);
    setSubcategory(post.subcategory || "");
    setStatus(post.status || "PUBLISHED");
    setExternalLink(post.externalLink || "");
    setMentions(post.mentions || "");
    setHideLikeCount(Boolean(post.hideLikeCount));
    setLiked(Boolean(post.likedByMe));
    setBookmarked(Boolean(post.bookmarkedByMe));
    setIsFollowingAuthor(Boolean(post.isFollowingAuthor));
    setLikesCount(post._count?.likes ?? 0);
    setCommentsCount(post._count?.comments ?? 0);
  }, [
    post.id,
    post.title,
    post.caption,
    post.tags,
    post.category,
    post.subcategory,
    post.status,
    post.externalLink,
    post.mentions,
    post.hideLikeCount,
    post.likedByMe,
    post.bookmarkedByMe,
    post.isFollowingAuthor,
    post._count?.likes,
    post._count?.comments,
  ]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen && !editOpen && !deleteOpen) return undefined;

    function handleOutsideClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setEditOpen(false);
        setDeleteOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen, editOpen, deleteOpen]);

  function showTemporaryNotice(message, needsLogin = false) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setNotice({ message, needsLogin });
    timerRef.current = setTimeout(() => setNotice(null), 3000);
  }

  async function postInteraction(payload) {
    const response = await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    return { ok: response.ok, data };
  }

  async function handleFollowToggle() {
    if (!currentUser) {
      showTemporaryNotice("Masuk untuk mengikuti kreator ini.", true);
      return;
    }
    if (followLoading || currentUser.id === post.authorId) return;

    const prev = isFollowingAuthor;
    setIsFollowingAuthor(!prev);
    setFollowLoading(true);
    try {
      const { ok, data } = await postInteraction({
        type: "FOLLOW",
        targetUserId: post.authorId,
      });
      if (!ok || !data) {
        setIsFollowingAuthor(prev);
        showTemporaryNotice(data?.error || "Gagal memperbarui status ikuti.");
        return;
      }
      const nextFollowing = Boolean(data.following);
      setIsFollowingAuthor(nextFollowing);
      onFollowChange?.(post.authorId, nextFollowing);
    } catch {
      setIsFollowingAuthor(prev);
      showTemporaryNotice("Gagal terhubung ke server.");
    } finally {
      setFollowLoading(false);
    }
  }

  async function handleLikeClick() {
    if (!currentUser) {
      showTemporaryNotice("Masuk untuk menyukai konten ini.", true);
      return;
    }
    if (likeLoading) return;

    const prevLiked = liked;
    const prevCount = likesCount;
    const nextLiked = !prevLiked;
    setLiked(nextLiked);
    setLikesCount(nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1));
    setLikeLoading(true);

    try {
      const { ok, data } = await postInteraction({
        type: "LIKE",
        postId: post.id,
      });
      if (!ok || !data) {
        setLiked(prevLiked);
        setLikesCount(prevCount);
        showTemporaryNotice(data?.error || "Gagal memproses suka.");
        return;
      }
      setLiked(Boolean(data.liked));
      setLikesCount(data.likesCount);
      onPostChange?.(post.id, {
        likedByMe: Boolean(data.liked),
        likesCount: data.likesCount,
      });
    } catch {
      setLiked(prevLiked);
      setLikesCount(prevCount);
      showTemporaryNotice("Gagal terhubung ke server.");
    } finally {
      setLikeLoading(false);
    }
  }

  async function handleBookmarkClick() {
    if (!currentUser) {
      showTemporaryNotice("Masuk untuk menyimpan konten ke profil.", true);
      return;
    }
    if (bookmarkLoading) return;

    const prev = bookmarked;
    setBookmarked(!prev);
    setBookmarkLoading(true);
    try {
      const { ok, data } = await postInteraction({
        type: "BOOKMARK",
        postId: post.id,
      });
      if (!ok || !data) {
        setBookmarked(prev);
        showTemporaryNotice(data?.error || "Gagal menyimpan konten.");
        return;
      }
      const nextSaved = Boolean(data.bookmarked);
      setBookmarked(nextSaved);
      showTemporaryNotice(
        nextSaved
          ? "Disimpan ke koleksi profil."
          : "Dihapus dari koleksi Disimpan."
      );
      onPostChange?.(post.id, {
        bookmarkedByMe: nextSaved,
        bookmarksCount: data.bookmarksCount,
      });
    } catch {
      setBookmarked(prev);
      showTemporaryNotice("Gagal terhubung ke server.");
    } finally {
      setBookmarkLoading(false);
    }
  }

  function handleCommentToggle() {
    if (hideInlineComments) {
      const section = document.getElementById("diskusi-karya");
      section?.scrollIntoView({ behavior: "smooth", block: "start" });
      section?.querySelector('input[aria-label="Tulis komentar"]')?.focus();
      return;
    }
    setIsCommentsOpen((prev) => !prev);
  }

  function handleCommentsCountChange(nextCount) {
    setCommentsCount(nextCount);
    onPostChange?.(post.id, { commentsCount: nextCount });
  }

  function openOwnerEdit() {
    setMenuOpen(false);
    setEditForm({
      title,
      caption,
      tags: tagsString,
      category,
      subcategory,
      externalLink,
      mentions,
      hideLikeCount,
    });
    setEditError("");
    setEditOpen(true);
  }

  async function handleSaveOwnerEdit(event) {
    event.preventDefault();
    if (containsLink(editForm.title)) {
      setEditError("Judul tidak diperbolehkan memuat tautan/URL.");
      return;
    }

    setEditSaving(true);
    setEditError("");
    try {
      const response = await fetch(`/api/posts/${encodeURIComponent(post.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          caption: editForm.caption,
          tags: editForm.tags,
          category: editForm.category,
          subcategory: editForm.subcategory || null,
          externalLink: editForm.externalLink,
          mentions: editForm.mentions,
          hideLikeCount: editForm.hideLikeCount,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.post) {
        setEditError(data.error || "Gagal memperbarui konten.");
        return;
      }

      setTitle(data.post.title);
      setCaption(data.post.caption);
      setTagsString(data.post.tags || "");
      setCategory(data.post.category);
      setSubcategory(data.post.subcategory || "");
      setStatus(data.post.status);
      setExternalLink(data.post.externalLink || "");
      setMentions(data.post.mentions || "");
      setHideLikeCount(Boolean(data.post.hideLikeCount));
      setEditOpen(false);

      onPostChange?.(post.id, {
        title: data.post.title,
        caption: data.post.caption,
        tags: data.post.tags,
        category: data.post.category,
        subcategory: data.post.subcategory || null,
        status: data.post.status,
        externalLink: data.post.externalLink,
        mentions: data.post.mentions,
        hideLikeCount: Boolean(data.post.hideLikeCount),
      });
    } catch {
      setEditError("Gagal terhubung ke server.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleConfirmOwnerDelete() {
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const response = await fetch(`/api/posts/${encodeURIComponent(post.id)}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setDeleteError(data.error || "Gagal menghapus konten.");
        return;
      }
      setDeleteOpen(false);
      onPostDelete?.(post.id);
    } catch {
      setDeleteError("Gagal terhubung ke server.");
    } finally {
      setDeleteLoading(false);
    }
  }

  const categoryMeta = getCategoryMeta(category, categories);
  const subcategoryLabel = subcategory
    ? getSubcategoryLabel(subcategory, categories)
    : "";
  const isOwner = currentUser?.id === post.authorId;
  const authorName = post.author?.name || post.author?.username || "Kreator";
  const authorUsername = post.author?.username || "kreator";
  const topAuthorBadge = post.author?.badges?.[0] || null;
  const uploadTime = post.publishedAt || post.createdAt;
  const isLandscape = post.imageUrl && post.imageFormat === "LANDSCAPE";
  const isTextOnly = !post.imageUrl || post.imageFormat === "TEXT";
  const isDetailLandscape = variant === "detail-landscape" && isLandscape;

  const displayPost = useMemo(
    () => ({
      ...post,
      title,
      caption,
      tags: tagsString,
      category,
      subcategory: subcategory || null,
      status,
      externalLink: externalLink || null,
      mentions: mentions || null,
      hideLikeCount,
    }),
    [post, title, caption, tagsString, category, subcategory, status, externalLink, mentions, hideLikeCount]
  );

  const editSubcategories = useMemo(() => {
    const found = categories.find((item) => item.key === editForm.category);
    return found?.subcategories || [];
  }, [categories, editForm.category]);

  const editCharCount = editForm.caption.trim().length;
  const editWordCount = countWords(editForm.caption);

  return (
    <article className="overflow-hidden rounded-xl border border-[#CBD5E1] bg-white dark:border-slate-700 dark:bg-[#1E293B]">
      <header className="space-y-2 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href={`/profile/${authorUsername}`}
              className="group flex min-w-0 items-center gap-2"
            >
              <Avatar
                name={authorName}
                username={authorUsername}
                avatarUrl={post.author?.avatarUrl}
                size="sm"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-sm font-semibold group-hover:underline">
                    {authorName}
                  </p>
                  {topAuthorBadge && <BadgePill badge={topAuthorBadge} compact />}
                </div>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-mono">@{authorUsername}</span>
                  <span className="mx-1">&middot;</span>
                  <span>{formatRelativeTime(uploadTime)}</span>
                </p>
              </div>
            </Link>

            {!isOwner && (
              <button
                type="button"
                onClick={handleFollowToggle}
                disabled={followLoading}
                aria-pressed={isFollowingAuthor}
                data-testid="inline-follow-btn"
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition disabled:opacity-60 ${
                  isFollowingAuthor
                    ? "border border-[#CBD5E1] bg-[#F8FAFC] text-[#1E293B] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    : "bg-[#2563EB] text-white hover:bg-blue-700"
                }`}
              >
                {isFollowingAuthor ? (
                  <>
                    <Check className="h-3 w-3 text-[#2563EB]" />
                    <span>Mengikuti</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3 w-3" />
                    <span>Ikuti</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              href={`/search?category=${encodeURIComponent(categoryMeta.key)}`}
              className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${categoryMeta.badgeClass}`}
            >
              {categoryMeta.label}
            </Link>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label="Menu lainnya"
                aria-expanded={menuOpen}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-30 mt-1.5 w-48 rounded-xl border border-[#CBD5E1] bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-[#1E293B]"
                >
                  <Link
                    href={`/post/${post.id}`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-[#F8FAFC] dark:hover:bg-slate-800"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Halaman Detail
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setIsShareOpen(true);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-[#F8FAFC] dark:hover:bg-slate-800"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Bagikan Konten
                  </button>

                  {currentUser && !currentUser.isSuspended && (
                    <Link
                      href={`/messages?sharePost=${encodeURIComponent(post.id)}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-[#F8FAFC] dark:hover:bg-slate-800"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Balas ke DM
                    </Link>
                  )}

                  {isOwner && (
                    <>
                      <button
                        type="button"
                        onClick={openOwnerEdit}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-[#F8FAFC] dark:hover:bg-slate-800"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit Konten
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setDeleteError("");
                          setDeleteOpen(true);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Hapus Konten
                      </button>
                    </>
                  )}

                  {!isOwner && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        if (!currentUser) {
                          showTemporaryNotice("Masuk untuk melaporkan konten.", true);
                          return;
                        }
                        setIsReportOpen(true);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Flag className="h-3.5 w-3.5" />
                      Laporkan
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <h2 className="text-[15px] font-semibold leading-snug">
          <Link href={`/post/${post.id}`} className="hover:underline">
            {title}
          </Link>
        </h2>

        {(subcategory || post.event || post.hasViolation) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {subcategory && (
              <Link
                href={`/search?category=${encodeURIComponent(categoryMeta.key)}&subcategory=${encodeURIComponent(subcategory)}`}
                className="rounded-md bg-[#F8FAFC] px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:text-[#2563EB] dark:bg-slate-800 dark:text-slate-300"
              >
                {subcategoryLabel}
              </Link>
            )}
            {post.event && (
              <Link
                href={`/search?event=${encodeURIComponent(post.event.slug)}`}
                className="inline-flex items-center gap-1 rounded-md bg-[#2563EB]/10 px-2 py-0.5 text-[11px] font-semibold text-[#2563EB] hover:bg-[#2563EB]/20 dark:text-blue-300"
              >
                <Calendar className="h-3 w-3" />
                {post.event.title}
              </Link>
            )}
            {post.hasViolation && (
              <span className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                <AlertTriangle className="h-3 w-3" />
                Catatan Pelanggaran Komunitas
              </span>
            )}
          </div>
        )}
      </header>

      {isTextOnly ? (
        <div className="border-y border-[#CBD5E1] bg-[#CBD5E1] px-5 py-6 text-[#1E293B] dark:border-slate-700 dark:bg-slate-700 dark:text-[#F8FAFC]">
          <p className="line-clamp-6 whitespace-pre-line break-words text-sm leading-relaxed">
            {caption}
          </p>
          {caption.length > 260 && (
            <button
              type="button"
              onClick={() => setIsCaptionOpen(true)}
              className="mt-3 text-xs font-semibold text-[#2563EB] hover:underline dark:text-blue-300"
            >
              Baca selengkapnya
            </button>
          )}
        </div>
      ) : isLandscape ? (
        <div
          className={`relative flex w-full items-center justify-center overflow-hidden border-y border-slate-700 bg-[#1E293B] ${
            isDetailLandscape ? "aspect-[16/9]" : "aspect-[4/5] px-1"
          }`}
        >
          <img
            src={post.imageUrl}
            alt={title}
            draggable={false}
            className="bk-protected-media max-h-full w-full object-contain"
          />
        </div>
      ) : (
        <div className="relative aspect-[4/5] w-full overflow-hidden border-y border-slate-700 bg-[#1E293B]">
          <img
            src={post.imageUrl}
            alt={title}
            draggable={false}
            className="bk-protected-media h-full w-full object-cover"
          />
        </div>
      )}

      {externalLink && (
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-[#F8FAFC] px-4 py-2 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-[#2563EB]" />
            <span className="truncate font-mono">
              {extractHostname(externalLink)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setPendingExternalUrl(externalLink)}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#CBD5E1] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#2563EB] hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-blue-300"
          >
            <span>Buka Tautan</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="px-4 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleLikeClick}
              disabled={likeLoading}
              aria-pressed={liked}
              aria-label={liked ? "Batal suka" : "Sukai konten"}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                liked
                  ? "bg-[#2563EB]/10 text-[#2563EB]"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <Heart
                className={`h-4 w-4 ${liked ? "fill-[#2563EB] text-[#2563EB]" : ""}`}
              />
              {!hideLikeCount && <span>{likesCount}</span>}
            </button>

            <button
              type="button"
              onClick={handleCommentToggle}
              aria-expanded={hideInlineComments ? undefined : isCommentsOpen}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                !hideInlineComments && isCommentsOpen
                  ? "bg-[#2563EB] text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <MessageCircle className="h-4 w-4" />
              <span>{commentsCount}</span>
            </button>

            <button
              type="button"
              data-testid="caption-trigger"
              onClick={() => setIsCaptionOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                isCaptionOpen
                  ? "bg-[#2563EB] text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Caption</span>
            </button>
          </div>

          <button
            type="button"
            data-testid="bookmark-btn"
            onClick={handleBookmarkClick}
            disabled={bookmarkLoading}
            aria-pressed={bookmarked}
            aria-label={bookmarked ? "Hapus dari simpanan" : "Simpan konten"}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
              bookmarked
                ? "bg-[#2563EB] text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <Bookmark className={`h-3.5 w-3.5 ${bookmarked ? "fill-white" : ""}`} />
            <span className="hidden sm:inline">
              {bookmarked ? "Disimpan" : "Simpan"}
            </span>
          </button>
        </div>

        {notice && (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-1.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <span>{notice.message}</span>
            {notice.needsLogin && (
              <Link
                href="/login"
                className="font-semibold text-[#2563EB] hover:underline"
              >
                Masuk
              </Link>
            )}
          </div>
        )}

        {!hideInlineComments && isCommentsOpen && (
          <CommentSection
            postId={post.id}
            postAuthorId={post.authorId}
            category={category}
            currentUser={currentUser}
            onCountChange={handleCommentsCountChange}
          />
        )}
      </div>

      {isCaptionOpen && (
        <CaptionModal
          isOpen={isCaptionOpen}
          onClose={() => setIsCaptionOpen(false)}
          post={displayPost}
          categories={categories}
          onOpenExternalLink={(url) => setPendingExternalUrl(url)}
        />
      )}

      {Boolean(pendingExternalUrl) && (
        <ExternalLinkModal
          isOpen={Boolean(pendingExternalUrl)}
          onClose={() => setPendingExternalUrl("")}
          url={pendingExternalUrl}
        />
      )}

      {isShareOpen && (
        <ShareModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          post={displayPost}
        />
      )}

      {isReportOpen && (
        <ReportModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          post={displayPost}
        />
      )}

      {editOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setEditOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#1E293B]/75 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="my-auto w-full max-w-lg rounded-xl border border-[#CBD5E1] bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-[#1E293B]"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <h3 className="text-base font-bold">Edit Konten</h3>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOwnerEdit} className="mt-4 space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-semibold">Judul</label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold">
                    Kategori
                  </label>
                  <select
                    value={editForm.category}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        category: e.target.value,
                        subcategory: "",
                      }))
                    }
                    className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                  >
                    {categories.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold">
                    Subkategori (Opsional)
                  </label>
                  <select
                    value={editForm.subcategory}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        subcategory: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                  >
                    <option value="">-- Tanpa Subkategori --</option>
                    {editSubcategories.map((sub) => (
                      <option key={sub.slug} value={sub.slug}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">
                  Tag # (dipisah koma)
                </label>
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, tags: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 font-mono text-sm outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-semibold">Deskripsi</label>
                  <span className="font-mono text-[11px] text-slate-500">
                    {editCharCount}/2.200 &middot; {editWordCount}/500 kata
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  maxLength={2200}
                  value={editForm.caption}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, caption: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                />
              </div>

              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={editForm.hideLikeCount}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      hideLikeCount: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-[#2563EB]"
                />
                <span>Sembunyikan jumlah suka pada konten ini</span>
              </label>

              {editError && <p className="text-xs text-red-600">{editError}</p>}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="rounded-lg border border-[#CBD5E1] px-4 py-2 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editSaving || containsLink(editForm.title)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {editSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setDeleteOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/75 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-[#CBD5E1] bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-[#1E293B]"
          >
            <h3 className="text-base font-bold">Hapus Konten Ini?</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Konten &ldquo;{title}&rdquo; akan dihapus permanen.
            </p>
            {deleteError && (
              <p className="mt-2 text-xs text-red-600">{deleteError}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="rounded-lg border border-[#CBD5E1] px-4 py-2 text-xs font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmOwnerDelete}
                disabled={deleteLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
