"use client";

import { AlertTriangle, FileText, Heart, MessageCircle } from "lucide-react";
import { CONTENT_CATEGORIES, getCategoryMeta } from "@/lib/categories";

export default function GridItem({
  post,
  categories = CONTENT_CATEGORIES,
  onSelect,
}) {
  const categoryMeta = getCategoryMeta(post.category, categories);
  const isLandscape = post.imageUrl && post.imageFormat === "LANDSCAPE";
  const isTextOnly = !post.imageUrl || post.imageFormat === "TEXT";
  const isDraft = post.status === "DRAFT";

  return (
    <button
      type="button"
      onClick={() => onSelect(post)}
      className={`bk-protected-media group relative aspect-square w-full overflow-hidden rounded-xl border border-slate-200 text-left focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:border-slate-700 ${
        isTextOnly ? "bg-[#CBD5E1] dark:bg-slate-700" : "bg-[#1E293B]"
      }`}
    >
      {isTextOnly ? (
        <div className="flex h-full w-full flex-col justify-between bg-[#CBD5E1] p-3.5 text-[#1E293B] transition group-hover:brightness-95 dark:bg-slate-700 dark:text-slate-100">
          <div className="flex items-center justify-between gap-1.5">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/80 text-[#2563EB] dark:bg-slate-800 dark:text-blue-300">
              <FileText className="h-3.5 w-3.5" />
            </span>
            <span
              className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${categoryMeta.badgeClass}`}
            >
              {categoryMeta.shortLabel}
            </span>
          </div>

          <div className="my-2 space-y-1">
            <p className="line-clamp-2 text-xs font-bold leading-snug sm:text-sm">
              {post.title}
            </p>
            <p className="line-clamp-3 text-[11px] leading-relaxed opacity-80">
              {post.caption}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-[#1E293B]/15 pt-2 text-[11px] opacity-75 dark:border-slate-500/30">
            <span className="truncate font-mono">
              @{post.author?.username || "kreator"}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {!post.hideLikeCount && (
                <span className="inline-flex items-center gap-0.5">
                  <Heart className="h-3 w-3" />
                  {post._count?.likes ?? 0}
                </span>
              )}
              <span className="inline-flex items-center gap-0.5">
                <MessageCircle className="h-3 w-3" />
                {post._count?.comments ?? 0}
              </span>
            </span>
          </div>
        </div>
      ) : (
        <>
          {isLandscape ? (
            <div className="flex h-full w-full items-center justify-center bg-[#1E293B] p-1">
              <img
                src={post.imageUrl}
                alt={post.title}
                draggable={false}
                className="max-h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]"
              />
            </div>
          ) : (
            <img
              src={post.imageUrl}
              alt={post.title}
              draggable={false}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          )}

          <div className="absolute top-2.5 left-2.5 flex items-center gap-1">
            {isDraft && (
              <span className="rounded-md bg-[#1E293B]/90 px-2 py-0.5 font-mono text-[10px] font-semibold text-white">
                DRAF
              </span>
            )}
            {post.hasViolation && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                <AlertTriangle className="h-2.5 w-2.5" />
              </span>
            )}
          </div>

          <span
            className={`absolute top-2.5 right-2.5 rounded-md border bg-white/95 px-2 py-0.5 text-[10px] font-semibold shadow-2xs ${categoryMeta.badgeClass}`}
          >
            {categoryMeta.shortLabel}
          </span>

          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-[#1E293B]/90 via-[#1E293B]/30 to-transparent p-3 opacity-0 transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
            <p className="line-clamp-1 text-sm font-semibold text-white">
              {post.title}
            </p>
            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-200">
              <span className="truncate font-mono">
                @{post.author?.username || "kreator"}
              </span>
              <span className="flex shrink-0 items-center gap-2.5">
                {!post.hideLikeCount && (
                  <span className="inline-flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5" />
                    {post._count?.likes ?? 0}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {post._count?.comments ?? 0}
                </span>
              </span>
            </div>
          </div>
        </>
      )}
    </button>
  );
}
