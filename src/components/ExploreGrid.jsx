"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ExternalLink, Loader2, X } from "lucide-react";
import GridItem from "@/components/GridItem";
import PostCard from "@/components/PostCard";
import SmartSearchBar from "@/components/SmartSearchBar";
import { CONTENT_CATEGORIES, getCategoryMeta } from "@/lib/categories";

export default function ExploreGrid({
  initialData,
  initialQuery = "",
  initialCategory = "",
  initialSubcategory = "",
  initialEvent = "",
  categories = CONTENT_CATEGORIES,
  currentUser,
}) {
  const [posts, setPosts] = useState(initialData.posts || []);
  const [pagination, setPagination] = useState(
    initialData.pagination || { page: 1, hasMore: false, total: 0 }
  );
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedSubcategory, setSelectedSubcategory] = useState(
    initialSubcategory
  );
  const [activeEvent, setActiveEvent] = useState(initialEvent);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    setPosts(initialData.posts || []);
    setPagination(
      initialData.pagination || { page: 1, hasMore: false, total: 0 }
    );
    setActiveQuery(initialQuery);
    setSelectedCategory(initialCategory);
    setSelectedSubcategory(initialSubcategory);
    setActiveEvent(initialEvent);
  }, [initialData, initialQuery, initialCategory, initialSubcategory, initialEvent]);

  useEffect(() => {
    if (!selectedPost) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") setSelectedPost(null);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedPost]);

  function syncUrl(q, cat, sub, ev) {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams();
    if (q) urlParams.set("q", q);
    if (cat) urlParams.set("category", cat);
    if (sub) urlParams.set("subcategory", sub);
    if (ev) urlParams.set("event", ev);
    const qs = urlParams.toString();
    window.history.replaceState(null, "", qs ? `/search?${qs}` : "/search");
  }

  async function fetchExplore({
    nextQuery = activeQuery,
    nextCategory = selectedCategory,
    nextSubcategory = selectedSubcategory,
    nextEvent = activeEvent,
    page = 1,
    append = false,
  }) {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("mode", "explore");
      params.set("page", String(page));
      params.set("limit", "12");
      if (nextQuery) params.set("q", nextQuery);
      if (nextCategory) params.set("category", nextCategory);
      if (nextSubcategory) params.set("subcategory", nextSubcategory);
      if (nextEvent) params.set("event", nextEvent);

      const response = await fetch(`/api/posts?${params.toString()}`);
      const data = await response.json().catch(() => null);

      if (!response.ok || !data) {
        setError(data?.error || "Gagal memuat galeri eksplorasi.");
        return;
      }

      setPosts((prev) => (append ? [...prev, ...data.posts] : data.posts));
      setPagination(data.pagination);
      if (!append) {
        syncUrl(nextQuery, nextCategory, nextSubcategory, nextEvent);
      }
    } catch {
      setError("Tidak dapat terhubung ke server. Coba lagi sebentar.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function handleSmartSearch(trimmedQuery) {
    setActiveQuery(trimmedQuery);
    fetchExplore({ nextQuery: trimmedQuery, page: 1, append: false });
  }

  function handleCategorySelect(nextCategory) {
    const resolved = nextCategory === selectedCategory ? "" : nextCategory;
    setSelectedCategory(resolved);
    setSelectedSubcategory("");
    fetchExplore({
      nextCategory: resolved,
      nextSubcategory: "",
      page: 1,
      append: false,
    });
  }

  function handleSubcategorySelect(slug) {
    const resolved = slug === selectedSubcategory ? "" : slug;
    setSelectedSubcategory(resolved);
    fetchExplore({ nextSubcategory: resolved, page: 1, append: false });
  }

  function handleResetAll() {
    setActiveQuery("");
    setSelectedCategory("");
    setSelectedSubcategory("");
    setActiveEvent("");
    fetchExplore({
      nextQuery: "",
      nextCategory: "",
      nextSubcategory: "",
      nextEvent: "",
      page: 1,
      append: false,
    });
  }

  function handlePostChange(postId, patch) {
    const applyPatch = (post) => {
      if (!post || post.id !== postId) return post;
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
        ...(patch.imageUrl !== undefined ? { imageUrl: patch.imageUrl } : {}),
        likedByMe: patch.likedByMe ?? post.likedByMe,
        bookmarkedByMe: patch.bookmarkedByMe ?? post.bookmarkedByMe,
        _count: {
          ...post._count,
          likes: patch.likesCount ?? post._count?.likes ?? 0,
          comments: patch.commentsCount ?? post._count?.comments ?? 0,
          bookmarks: patch.bookmarksCount ?? post._count?.bookmarks ?? 0,
        },
      };
    };

    setPosts((prev) => prev.map(applyPatch));
    setSelectedPost((prev) => applyPatch(prev));
  }

  function handleFollowChange(authorId, following) {
    setPosts((prev) =>
      prev.map((post) =>
        post.authorId === authorId
          ? { ...post, isFollowingAuthor: following }
          : post
      )
    );
    setSelectedPost((prev) =>
      prev && prev.authorId === authorId
        ? { ...prev, isFollowingAuthor: following }
        : prev
    );
  }

  function handlePostDelete(deletedId) {
    setPosts((prev) => prev.filter((post) => post.id !== deletedId));
    setPagination((prev) => ({
      ...prev,
      total: Math.max(0, (prev.total ?? 1) - 1),
    }));
    setSelectedPost(null);
  }

  const activeCategoryMeta = selectedCategory
    ? getCategoryMeta(selectedCategory, categories)
    : null;
  const activeSubcategories = activeCategoryMeta?.subcategories || [];

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#CBD5E1] bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-[#1E293B]">
        <SmartSearchBar
          user={currentUser}
          variant="explore"
          initialValue={activeQuery}
          onSubmitQuery={handleSmartSearch}
          placeholder="Cari judul, deskripsi, alat, #tag, atau @username..."
        />

        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-700">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <h1 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Kategori Konten
            </h1>
            {activeCategoryMeta && (
              <span className="hidden text-xs text-slate-500 sm:inline">
                {activeCategoryMeta.description}
              </span>
            )}
          </div>

          <div
            role="group"
            aria-label="Filter kategori konten eksplorasi"
            className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5"
          >
            <button
              type="button"
              onClick={() => handleCategorySelect("")}
              className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                selectedCategory === ""
                  ? "bg-[#2563EB] text-white"
                  : "border border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
              }`}
            >
              Semua Kategori
            </button>

            {categories.map((item) => {
              const active = selectedCategory === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleCategorySelect(item.key)}
                  className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                    active
                      ? "bg-[#2563EB] text-white"
                      : "border border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {selectedCategory && activeSubcategories.length > 0 && (
            <div className="no-scrollbar mt-3 flex items-center gap-1.5 overflow-x-auto border-t border-slate-100 pt-3 dark:border-slate-700">
              <span className="shrink-0 text-[11px] font-semibold text-slate-500">
                Subkategori:
              </span>
              <button
                type="button"
                onClick={() => handleSubcategorySelect("")}
                className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                  selectedSubcategory === ""
                    ? "bg-[#1E293B] text-white dark:bg-[#2563EB]"
                    : "bg-[#F8FAFC] text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                Semua
              </button>
              {activeSubcategories.map((sub) => {
                const active = selectedSubcategory === sub.slug;
                return (
                  <button
                    key={sub.slug}
                    type="button"
                    onClick={() => handleSubcategorySelect(sub.slug)}
                    className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                      active
                        ? "bg-[#1E293B] text-white dark:bg-[#2563EB]"
                        : "bg-[#F8FAFC] text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {sub.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <p>
          Menampilkan <span className="font-semibold">{posts.length}</span>{" "}
          dari <span className="font-semibold">{pagination.total}</span> konten
          {activeCategoryMeta ? ` · ${activeCategoryMeta.label}` : ""}
          {activeEvent ? ` · Event #${activeEvent}` : ""}
          {activeQuery ? ` untuk "${activeQuery}"` : ""}
        </p>

        {(activeQuery || selectedCategory || selectedSubcategory || activeEvent) && (
          <button
            type="button"
            onClick={handleResetAll}
            className="font-semibold text-[#2563EB] hover:underline"
          >
            Reset pencarian
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
            <div
              key={item}
              className="aspect-square animate-pulse rounded-xl border border-[#CBD5E1] bg-slate-200 dark:border-slate-700 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-[#CBD5E1] bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-[#1E293B]">
          <p className="text-base font-semibold">Konten tidak ditemukan</p>
          <p className="mt-1 text-xs text-slate-500">
            Coba kata kunci lain, gunakan awalan #tag atau @username, atau pilih
            kategori lain.
          </p>
          <button
            type="button"
            onClick={handleResetAll}
            className="mt-4 inline-flex rounded-lg border border-[#CBD5E1] px-4 py-2 text-xs font-semibold hover:border-[#2563EB]"
          >
            Tampilkan Semua Konten
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {posts.map((post) => (
              <GridItem
                key={post.id}
                post={post}
                categories={categories}
                onSelect={(item) => setSelectedPost(item)}
              />
            ))}
          </div>

          {pagination.hasMore && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() =>
                  fetchExplore({ page: pagination.page + 1, append: true })
                }
                disabled={loadingMore}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-5 py-2.5 text-xs font-semibold transition hover:border-[#2563EB] disabled:opacity-60 dark:border-slate-700 dark:bg-[#1E293B]"
              >
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin text-[#2563EB]" />}
                {loadingMore ? "Memuat..." : "Muat lebih banyak"}
              </button>
            </div>
          )}
        </>
      )}

      {selectedPost && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedPost(null)}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#1E293B]/75 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative my-auto w-full ${selectedPost.imageUrl && selectedPost.imageFormat === "LANDSCAPE"
              ? "max-w-2xl"
              : "max-w-[540px]"
              }`}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <Link
                href={`/post/${selectedPost.id}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-[#1E293B] shadow-md hover:bg-slate-100"
              >
                <ExternalLink className="h-3.5 w-3.5 text-[#2563EB]" />
                Buka Halaman Detail
              </Link>
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                aria-label="Tutup pratinjau konten"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#1E293B] shadow-md hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <PostCard
              post={selectedPost}
              categories={categories}
              currentUser={currentUser}
              variant={
                selectedPost.imageUrl &&
                  selectedPost.imageFormat === "LANDSCAPE"
                  ? "detail-landscape"
                  : "feed"
              }
              onPostChange={handlePostChange}
              onPostDelete={handlePostDelete}
              onFollowChange={handleFollowChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}
