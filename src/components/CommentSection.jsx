"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Award, Loader2, Send, ShieldAlert, Trash2 } from "lucide-react";
import Avatar from "@/components/Avatar";
import BadgePill from "@/components/BadgePill";
import { CONTENT_CATEGORIES, getCategoryMeta } from "@/lib/categories";
import { formatRelativeTime } from "@/lib/format";

export default function CommentSection({
  postId,
  postAuthorId,
  category,
  categories = CONTENT_CATEGORIES,
  currentUser,
  onCountChange,
}) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [moderationWarning, setModerationWarning] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [helpfulBusyId, setHelpfulBusyId] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadComments() {
      setLoading(true);
      setLoadError("");
      try {
        const response = await fetch(
          `/api/comments?postId=${encodeURIComponent(postId)}`
        );
        const data = await response.json().catch(() => null);
        if (cancelled) return;

        if (!response.ok || !data) {
          setLoadError(data?.error || "Gagal memuat komentar.");
          return;
        }
        setComments(data.comments || []);
      } catch {
        if (!cancelled) {
          setLoadError("Gagal terhubung ke server saat memuat komentar.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadComments();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setModerationWarning("");
    setSubmitError("");
    const trimmed = content.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, content: trimmed }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.status === 422 && data.blocked) {
        setModerationWarning(
          data.error ||
          "Komentar ditolak otomatis karena mengandung kata terlarang."
        );
        return;
      }

      if (!response.ok) {
        setSubmitError(data.error || "Gagal mengirim komentar.");
        return;
      }

      setComments((prev) => [...prev, data.comment]);
      setContent("");
      if (typeof data.commentsCount === "number") {
        onCountChange?.(data.commentsCount);
      }
    } catch {
      setSubmitError("Gagal terhubung ke server. Coba lagi sebentar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleHelpful(commentId) {
    setHelpfulBusyId(commentId);
    setSubmitError("");
    try {
      const response = await fetch("/api/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSubmitError(data.error || "Gagal memperbarui tanda ulasan.");
        return;
      }

      setComments((prev) =>
        prev
          .map((item) => ({
            ...item,
            isHelpful: item.id === commentId ? Boolean(data.isHelpful) : false,
          }))
          .sort((a, b) => Number(b.isHelpful) - Number(a.isHelpful))
      );
    } catch {
      setSubmitError("Gagal terhubung ke server.");
    } finally {
      setHelpfulBusyId("");
    }
  }

  async function handleDelete(commentId) {
    setDeletingId(commentId);
    setSubmitError("");
    try {
      const response = await fetch(
        `/api/comments?id=${encodeURIComponent(commentId)}`,
        { method: "DELETE" }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSubmitError(data.error || "Gagal menghapus komentar.");
        return;
      }

      setComments((prev) => prev.filter((item) => item.id !== commentId));
      if (typeof data.commentsCount === "number") {
        onCountChange?.(data.commentsCount);
      }
    } catch {
      setSubmitError("Gagal terhubung ke server saat menghapus komentar.");
    } finally {
      setDeletingId("");
    }
  }

  const categoryMeta = getCategoryMeta(category, categories);
  const isPostOwner = Boolean(
    currentUser &&
    postAuthorId &&
    currentUser.id === postAuthorId &&
    !currentUser.isSuspended
  );

  return (
    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-700">
      <div
        className={`mb-3 rounded-lg border px-3 py-2 text-xs ${categoryMeta.badgeClass}`}
      >
        <span className="font-semibold">{categoryMeta.label}</span> — Berikan
        ulasan yang santun dan konstruktif.
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-3 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2563EB]" />
          Memuat ulasan...
        </div>
      ) : loadError ? (
        <p className="py-2 text-xs text-red-600">{loadError}</p>
      ) : comments.length === 0 ? (
        <p className="py-2 text-xs text-slate-500">
          Belum ada ulasan. Jadilah yang pertama memberi masukan konstruktif.
        </p>
      ) : (
        <ul className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
          {comments.map((comment) => {
            const author = comment.user || {};
            const isStaff =
              currentUser?.role === "ADMIN" || currentUser?.role === "MODERATOR";
            const canDelete =
              currentUser &&
              !currentUser.isSuspended &&
              (currentUser.id === comment.userId || isStaff);
            const hasConstructiveBadge = (author.helpfulCount || 0) >= 1;
            const specialBadges = author.badges || [];

            return (
              <li
                key={comment.id}
                className={`rounded-lg border px-3 py-2.5 ${comment.isHelpful
                  ? "border-[#2563EB] bg-[#2563EB]/5 dark:bg-[#2563EB]/15"
                  : "border-slate-100 bg-[#F8FAFC] dark:border-slate-700 dark:bg-slate-800/60"
                  }`}
              >
                {comment.isHelpful && (
                  <div className="mb-1.5 inline-flex items-center gap-1 rounded bg-[#2563EB] px-2 py-0.5 text-[10px] font-semibold text-white">
                    <Award className="h-3 w-3" />
                    Ulasan Paling Membantu
                  </div>
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <Link
                      href={`/profile/${author.username}`}
                      className="shrink-0"
                    >
                      <Avatar
                        name={author.name}
                        username={author.username}
                        avatarUrl={author.avatarUrl}
                        size="sm"
                      />
                    </Link>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <Link
                          href={`/profile/${author.username}`}
                          className="font-semibold hover:underline"
                        >
                          @{author.username}
                        </Link>
                        {specialBadges.map((b) => (
                          <BadgePill key={b.id} badge={b} compact />
                        ))}
                        {hasConstructiveBadge && (
                          <span className="inline-flex items-center gap-0.5 rounded border border-[#2563EB]/30 bg-[#2563EB]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#2563EB] dark:text-blue-300">
                            <Award className="h-2.5 w-2.5" />
                            Pengulas Konstruktif
                          </span>
                        )}
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500">
                          {formatRelativeTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="whitespace-pre-line break-words text-xs leading-relaxed">
                        {comment.content}
                      </p>

                      {isPostOwner && (
                        <div className="pt-1">
                          <button
                            type="button"
                            disabled={helpfulBusyId === comment.id}
                            onClick={() => handleToggleHelpful(comment.id)}
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold transition ${comment.isHelpful
                              ? "text-[#2563EB] hover:underline"
                              : "text-slate-500 hover:text-[#2563EB]"
                              }`}
                          >
                            <Award className="h-3 w-3" />
                            {comment.isHelpful
                              ? "Batalkan Tanda Membantu"
                              : "Tandai Paling Membantu"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      disabled={deletingId === comment.id}
                      aria-label="Hapus komentar"
                      className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {moderationWarning && (
        <div
          data-testid="moderation-alert"
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>{moderationWarning}</span>
        </div>
      )}

      {submitError && (
        <p className="mt-2 text-xs text-red-600">{submitError}</p>
      )}

      {currentUser ? (
        currentUser.isSuspended ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-xs text-red-700">
            Akun ditangguhkan (mode baca). Tidak dapat mengirim komentar.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
            <input
              type="text"
              maxLength={1000}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (moderationWarning) setModerationWarning("");
              }}
              placeholder="Tulis ulasan yang membangun..."
              aria-label="Tulis komentar"
              className="flex-1 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs outline-none transition focus:border-[#2563EB] focus:bg-white dark:border-slate-600 dark:bg-slate-800"
            />
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Kirim
            </button>
          </form>
        )
      ) : (
        <div className="mt-3 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-center text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800">
          <Link href="/login" className="font-semibold text-[#2563EB] hover:underline">
            Masuk ke akun Anda
          </Link>{" "}
          untuk menulis ulasan pada konten ini.
        </div>
      )}
    </div>
  );
}
