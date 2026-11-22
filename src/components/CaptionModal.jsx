"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Calendar, Clock, ExternalLink, FolderOpen, Hash, Layers, X } from "lucide-react";
import Avatar from "@/components/Avatar";
import BadgePill from "@/components/BadgePill";
import {
  CONTENT_CATEGORIES,
  getCategoryMeta,
  getSubcategoryLabel,
  parseMentions,
} from "@/lib/categories";
import { formatFullDateTime, formatRelativeTime } from "@/lib/format";
import { parseTags } from "@/services/feedAlgorithm";

function renderCaptionWithMentions(text, onNavigate) {
  if (!text) return null;
  const parts = text.split(/(@[a-zA-Z0-9_]{3,30})/g);
  return parts.map((part, idx) => {
    if (/^@[a-zA-Z0-9_]{3,30}$/.test(part)) {
      const uname = part.slice(1).toLowerCase();
      return (
        <Link
          key={`${uname}-${idx}`}
          href={`/profile/${uname}`}
          onClick={onNavigate}
          className="font-mono font-semibold text-[#2563EB] hover:underline dark:text-blue-400"
        >
          {part}
        </Link>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export default function CaptionModal({
  isOpen,
  onClose,
  post,
  categories = CONTENT_CATEGORIES,
  onOpenExternalLink,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !post) return null;

  const tags = parseTags(post.tags);
  const mentions = parseMentions(post.mentions);
  const categoryMeta = getCategoryMeta(post.category, categories);
  const subcategoryLabel = post.subcategory
    ? getSubcategoryLabel(post.subcategory, categories)
    : "";
  const authorName = post.author?.name || post.author?.username || "Kreator";
  const authorUsername = post.author?.username || "kreator";
  const topBadge = post.author?.badges?.[0];
  const uploadDate = post.publishedAt || post.createdAt;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Caption konten ${post.title}`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/75 p-4 backdrop-blur-xs"
    >
      <div
        data-testid="caption-modal"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[#CBD5E1] bg-white shadow-xl dark:border-slate-700 dark:bg-[#1E293B]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-700">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar
              name={authorName}
              username={authorUsername}
              avatarUrl={post.author?.avatarUrl}
              size="sm"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Link
                  href={`/profile/${authorUsername}`}
                  onClick={onClose}
                  className="truncate text-sm font-bold text-[#1E293B] hover:text-[#2563EB] hover:underline dark:text-slate-100"
                >
                  {authorName}
                </Link>
                {topBadge && <BadgePill badge={topBadge} compact />}
                <span className="text-slate-300 dark:text-slate-600">&middot;</span>
                <span
                  title={formatFullDateTime(uploadDate)}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"
                >
                  <Clock className="h-3 w-3 text-[#2563EB]" />
                  {formatRelativeTime(uploadDate)}
                </span>
              </div>
              <p className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                @{authorUsername}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup caption"
            className="rounded-lg p-1 text-slate-400 hover:bg-[#F8FAFC] hover:text-[#1E293B] dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <h3 className="text-base font-bold leading-snug text-[#1E293B] dark:text-white">
            {post.title}
          </h3>

          <p className="whitespace-pre-line break-words text-sm leading-relaxed text-[#1E293B]/90 dark:text-slate-200">
            {renderCaptionWithMentions(post.caption, onClose)}
          </p>

          {mentions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-medium text-slate-500 dark:text-slate-400">
                Menandai:
              </span>
              {mentions.map((uname) => (
                <Link
                  key={uname}
                  href={`/profile/${uname}`}
                  onClick={onClose}
                  className="rounded-md bg-[#2563EB]/10 px-2 py-0.5 font-mono font-medium text-[#2563EB] hover:bg-[#2563EB]/20 dark:text-blue-300"
                >
                  @{uname}
                </Link>
              ))}
            </div>
          )}

          {post.externalLink && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenExternalLink?.(post.externalLink);
                }}
                className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-[#2563EB] transition hover:border-[#2563EB] hover:bg-[#2563EB]/5 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{post.externalLink}</span>
              </button>
            </div>
          )}

          <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-700">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/?category=${encodeURIComponent(categoryMeta.key)}`}
                onClick={onClose}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition hover:opacity-85 ${categoryMeta.badgeClass}`}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                {categoryMeta.label}
              </Link>

              {post.subcategory && (
                <Link
                  href={`/?category=${encodeURIComponent(categoryMeta.key)}&subcategory=${encodeURIComponent(post.subcategory)}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-1 text-xs font-semibold text-[#1E293B] hover:border-[#2563EB] hover:text-[#2563EB] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Layers className="h-3 w-3 text-[#2563EB]" />
                  {subcategoryLabel}
                </Link>
              )}

              {post.event && (
                <Link
                  href={`/search?event=${encodeURIComponent(post.event.slug)}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#2563EB]/30 bg-[#2563EB]/10 px-2.5 py-1 text-xs font-semibold text-[#2563EB] hover:bg-[#2563EB]/20 dark:text-blue-300"
                >
                  <Calendar className="h-3 w-3" />
                  {post.event.title}
                </Link>
              )}
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/search?q=${encodeURIComponent(`#${tag}`)}`}
                    onClick={onClose}
                    className="inline-flex items-center gap-0.5 rounded-md border border-[#CBD5E1] bg-[#F8FAFC] px-2 py-0.5 font-mono text-xs text-[#2563EB] transition hover:border-[#2563EB] hover:bg-[#2563EB]/10 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300"
                  >
                    <Hash className="h-3 w-3" />
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
