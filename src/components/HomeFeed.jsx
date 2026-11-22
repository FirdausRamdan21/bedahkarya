"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Compass,
  Loader2,
  RefreshCw,
  Users,
} from "lucide-react";
import PostCard from "@/components/PostCard";
import { CONTENT_CATEGORIES } from "@/lib/categories";

export default function HomeFeed({
  initialData,
  initialCategory = "",
  initialSubcategory = "",
  categories = CONTENT_CATEGORIES,
  activeEvents = [],
  currentUser,
  isForbidden = false,
}) {
  const [posts, setPosts] = useState(initialData.posts || []);
  const [pagination, setPagination] = useState(
    initialData.pagination || { page: 1, hasMore: false, total: 0 }
  );
  const [mode, setMode] = useState("feed");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedSubcategory, setSelectedSubcategory] = useState(
    initialSubcategory
  );
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [error, setError] = useState("");

  const sentinelRef = useRef(null);
  const touchStartYRef = useRef(null);
  const loadingMoreRef = useRef(false);

  const fetchFeed = useCallback(
    async ({
      nextMode = mode,
      nextCategory = selectedCategory,
      nextSubcategory = selectedSubcategory,
      page = 1,
      append = false,
      isRefresh = false,
    }) => {
      if (append) {
        if (loadingMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      try {
        const params = new URLSearchParams();
        params.set("mode", nextMode);
        params.set("page", String(page));
        params.set("limit", "4");
        if (nextCategory) params.set("category", nextCategory);
        if (nextSubcategory) params.set("subcategory", nextSubcategory);

        const response = await fetch(`/api/posts?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await response.json().catch(() => null);

        if (!response.ok || !data) {
          setError(data?.error || "Gagal memuat aliran konten.");
          return;
        }

        let nextPosts = data.posts || [];
        if (isRefresh && nextPosts.length > 1) {
          nextPosts = [...nextPosts.slice(1), nextPosts[0]];
        }

        setPosts((prev) => (append ? [...prev, ...nextPosts] : nextPosts));
        setPagination(data.pagination);
        setRequiresLogin(Boolean(data.requiresLogin));
      } catch {
        setError("Tidak dapat terhubung ke server. Coba tarik untuk muat ulang.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
        loadingMoreRef.current = false;
      }
    },
    [mode, selectedCategory, selectedSubcategory]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !pagination.hasMore || loading) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          pagination.hasMore &&
          !loadingMoreRef.current
        ) {
          fetchFeed({ page: pagination.page + 1, append: true });
        }
      },
      { rootMargin: "220px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [pagination.hasMore, pagination.page, loading, fetchFeed]);

  function handleTouchStart(event) {
    if (window.scrollY <= 4 && !refreshing) {
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
    } else {
      touchStartYRef.current = null;
    }
  }

  function handleTouchMove(event) {
    if (touchStartYRef.current === null || window.scrollY > 4) return;
    const currentY = event.touches[0]?.clientY ?? 0;
    const delta = currentY - touchStartYRef.current;
    if (delta > 0) {
      setPullDistance(Math.min(84, delta * 0.55));
    }
  }

  function handleTouchEnd() {
    if (pullDistance >= 55 && !refreshing) {
      fetchFeed({ page: 1, append: false, isRefresh: true });
    }
    setPullDistance(0);
    touchStartYRef.current = null;
  }

  useEffect(() => {
    let overscrollUp = 0;
    let resetTimer = null;

      function handleWheel(event) {
        if (window.scrollY <= 0 && event.deltaY < -35 && !refreshing && !loading) {
          overscrollUp += Math.abs(event.deltaY);
          if (resetTimer) clearTimeout(resetTimer);
          resetTimer = setTimeout(() => {
            overscrollUp = 0;
          }, 450);

          if (overscrollUp >= 160) {
            overscrollUp = 0;
            fetchFeed({ page: 1, append: false, isRefresh: true });
          }
        }
      }

      window.addEventListener("wheel", handleWheel, { passive: true });
      return () => {
        if (resetTimer) clearTimeout(resetTimer);
        window.removeEventListener("wheel", handleWheel);
      };
    }, [refreshing, loading, fetchFeed]);

    function handleModeChange(nextMode) {
      if (nextMode === mode) return;
      setMode(nextMode);
      fetchFeed({ nextMode, page: 1, append: false });
    }

  function handleCategoryChange(nextCategory) {
    const resolved = nextCategory === selectedCategory ? "" : nextCategory;
    setSelectedCategory(resolved);
    setSelectedSubcategory("");
    fetchFeed({
      nextCategory: resolved,
      nextSubcategory: "",
      page: 1,
      append: false,
    });
  }

  function handleSubcategoryChange(slug) {
    const resolved = slug === selectedSubcategory ? "" : slug;
    setSelectedSubcategory(resolved);
    fetchFeed({ nextSubcategory: resolved, page: 1, append: false });
  }

  function handleResetFilters() {
    setMode("feed");
    setSelectedCategory("");
    setSelectedSubcategory("");
    fetchFeed({
      nextMode: "feed",
      nextCategory: "",
      nextSubcategory: "",
      page: 1,
      append: false,
    });
  }

  function handlePostChange(postId, patch) {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        return {
          ...post,
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.caption !== undefined ? { caption: patch.caption } : {}),
          ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
          ...(patch.category !== undefined ? { category: patch.category } : {}),
          ...(patch.subcategory !== undefined
            ? { subcategory: patch.subcategory }
            : {}),
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.hideLikeCount !== undefined
            ? { hideLikeCount: patch.hideLikeCount }
            : {}),
          ...(patch.externalLink !== undefined
            ? { externalLink: patch.externalLink }
            : {}),
          ...(patch.mentions !== undefined ? { mentions: patch.mentions } : {}),
          likedByMe: patch.likedByMe ?? post.likedByMe,
          bookmarkedByMe: patch.bookmarkedByMe ?? post.bookmarkedByMe,
          _count: {
            ...post._count,
            likes: patch.likesCount ?? post._count?.likes ?? 0,
            comments: patch.commentsCount ?? post._count?.comments ?? 0,
            bookmarks: patch.bookmarksCount ?? post._count?.bookmarks ?? 0,
          },
        };
      })
    );
  }

    function handleFollowChange(authorId, following) {
      setPosts((prev) =>
        prev.map((post) =>
          post.authorId === authorId
            ? { ...post, isFollowingAuthor: following }
            : post
        )
      );
    }

    function handlePostDelete(deletedId) {
      setPosts((prev) => prev.filter((post) => post.id !== deletedId));
      setPagination((prev) => ({
        ...prev,
        total: Math.max(0, (prev.total ?? 1) - 1),
      }));
    }

  const activeCategoryObj = categories.find((c) => c.key === selectedCategory);
  const activeSubcategories = activeCategoryObj?.subcategories || [];

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="mx-auto w-full max-w-[540px]"
    >
      {(pullDistance > 10 || refreshing) && (
        <div
          style={{ height: refreshing ? 40 : pullDistance }}
          className="mb-2 flex items-center justify-center gap-2 overflow-hidden text-xs font-medium text-[#2563EB] transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span>
            {refreshing
              ? "Menyegarkan konten..."
              : pullDistance >= 55
                ? "Lepaskan untuk menyegarkan"
                : "Tarik ke bawah untuk muat ulang"}
          </span>
        </div>
      )}

        {isForbidden && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Halaman <span className="font-mono font-semibold">/admin</span>{" "}
              hanya tersedia untuk Administrator dan Moderator.
            </span>
          </div>
        )}

      {activeEvents.length > 0 && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-[#2563EB]/25 bg-white px-3.5 py-2.5 text-xs dark:border-slate-700 dark:bg-[#1E293B]">
          <div className="no-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-[#2563EB]" />
            <span className="shrink-0 font-semibold">Event:</span>
            {activeEvents.slice(0, 2).map((ev) => (
              <Link
                key={ev.id}
                href={`/search?event=${encodeURIComponent(ev.slug)}`}
                className="shrink-0 rounded-md bg-[#2563EB]/10 px-2 py-0.5 font-semibold text-[#2563EB] hover:bg-[#2563EB]/20 dark:text-blue-300"
              >
                {ev.title}
              </Link>
            ))}
          </div>
          <Link
            href="/events"
            className="shrink-0 font-semibold text-[#2563EB] hover:underline"
          >
            Semua &rarr;
          </Link>
        </div>
      )}

        <div className="mb-4 overflow-hidden rounded-xl border border-[#CBD5E1] bg-white dark:border-slate-700 dark:bg-[#1E293B]">
          <div className="flex items-center justify-between gap-2 px-4 pt-1.5">
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => handleModeChange("feed")}
                className={`border-b-2 pb-2.5 pt-1.5 text-sm transition ${mode === "feed"
                  ? "border-[#2563EB] font-semibold text-[#2563EB]"
                  : "border-transparent font-medium text-slate-500 hover:text-[#1E293B] dark:hover:text-white"
                  }`}
              >
                Untuk Anda
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("following")}
                className={`border-b-2 pb-2.5 pt-1.5 text-sm transition ${mode === "following"
                  ? "border-[#2563EB] font-semibold text-[#2563EB]"
                  : "border-transparent font-medium text-slate-500 hover:text-[#1E293B] dark:hover:text-white"
                  }`}
              >
                Mengikuti
              </button>
            </div>
          </div>

          <nav
            aria-label="Kategori konten beranda"
            className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-t border-slate-100 px-3 py-2 dark:border-slate-700"
          >
            <button
              type="button"
              onClick={() => handleCategoryChange("")}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${selectedCategory === ""
                ? "bg-[#2563EB] text-white"
                : "bg-[#F8FAFC] text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
            >
              Semua
            </button>

          {categories.map((item) => {
            const active = selectedCategory === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleCategoryChange(item.key)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-[#2563EB] text-white"
                    : "bg-[#F8FAFC] text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {selectedCategory && activeSubcategories.length > 0 && (
          <nav
            aria-label="Subkategori konten"
            className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-t border-slate-100 bg-[#F8FAFC] px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50"
          >
            <button
              type="button"
              onClick={() => handleSubcategoryChange("")}
              className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                selectedSubcategory === ""
                  ? "bg-[#1E293B] text-white dark:bg-[#2563EB]"
                  : "bg-white text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              Semua {activeCategoryObj?.shortLabel}
            </button>

            {activeSubcategories.map((sub) => {
              const active = selectedSubcategory === sub.slug;
              return (
                <button
                  key={sub.slug}
                  type="button"
                  onClick={() => handleSubcategoryChange(sub.slug)}
                  className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                    active
                      ? "bg-[#1E293B] text-white dark:bg-[#2563EB]"
                      : "bg-white text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {sub.name}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-5">
          {[1, 2].map((skeleton) => (
            <div
              key={skeleton}
              className="overflow-hidden rounded-xl border border-[#CBD5E1] bg-white dark:border-slate-700 dark:bg-[#1E293B]"
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
              <div className="aspect-[4/5] w-full animate-pulse bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-[#CBD5E1] bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-[#1E293B]">
          {mode === "following" && requiresLogin ? (
            <div className="mx-auto max-w-sm space-y-3">
              <Users className="mx-auto h-7 w-7 text-slate-400" />
              <h2 className="text-sm font-semibold">
                Masuk untuk melihat linimasa Mengikuti
              </h2>
              <Link
                href="/login"
                className="inline-flex rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Masuk Sekarang
              </Link>
            </div>
          ) : mode === "following" ? (
            <div className="mx-auto max-w-sm space-y-3">
              <Compass className="mx-auto h-7 w-7 text-slate-400" />
              <h2 className="text-sm font-semibold">
                Belum ada konten dari akun yang diikuti
              </h2>
              <Link
                href="/search"
                className="inline-flex rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Buka Eksplorasi
              </Link>
            </div>
          ) : (
            <div className="mx-auto max-w-sm space-y-3">
              <p className="text-sm font-semibold">
                Belum ada konten pada kategori ini
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex rounded-lg border border-[#CBD5E1] px-4 py-2 text-xs font-semibold hover:border-[#2563EB]"
              >
                Tampilkan Semua Kategori
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              categories={categories}
              currentUser={currentUser}
              onPostChange={handlePostChange}
              onPostDelete={handlePostDelete}
              onFollowChange={handleFollowChange}
            />
          ))}

          <div ref={sentinelRef} className="py-4 text-center">
            {loadingMore ? (
              <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-[#2563EB]" />
                Memuat konten lainnya...
              </span>
            ) : !pagination.hasMore ? (
              <p className="text-xs text-slate-400">
                Akhir linimasa ({pagination.total} konten). Geser ke atas untuk
                menyegarkan.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
