"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  FileText,
  Link2,
  MessageCircle,
  Send,
  Share2,
  X,
} from "lucide-react";
import { getCategoryMeta } from "@/lib/categories";

export default function ShareModal({ isOpen, onClose, post }) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;

    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
      setCanNativeShare(typeof navigator?.share === "function");
    }
    setCopied(false);

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !post) {
    return null;
  }

  const shareUrl = origin ? `${origin}/post/${post.id}` : `/post/${post.id}`;
  const categoryMeta = getCategoryMeta(post.category);
  const rawCaption = (post.caption || "").trim();
  const captionSnippet =
    rawCaption.length > 140 ? `${rawCaption.slice(0, 140).trim()}...` : rawCaption;
  const shareText = `${post.title}\n\n${captionSnippet}\n\nLihat di BedahKarya: ${shareUrl}`;

  async function handleCopyLink() {
    try {
      await navigator.clipboard?.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback jika clipboard dibatasi browser
    }
  }

  async function handleNativeShare() {
    if (typeof navigator?.share !== "function") return;
    try {
      await navigator.share({
        title: `${post.title} — BedahKarya`,
        text: `${post.title} — ${captionSnippet} (BedahKarya)`,
        url: shareUrl,
      });
    } catch {
      // Pengguna membatalkan share dialog bawaan
    }
  }

  const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`${post.title} — ${captionSnippet} | BedahKarya`)}`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${post.title} — ${captionSnippet} | BedahKarya`)}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Bagikan konten ${post.title}`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/75 p-4 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 shadow-xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-800">
              <Share2 className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-neutral-950">
                Bagikan Konten
              </h3>
              <p className="text-xs text-neutral-500">
                Salin tautan atau kirim ke aplikasi lain
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog bagikan"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
          <div className="flex items-stretch gap-3 p-3">
            {post.imageUrl ? (
              <div
                className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-neutral-200 ${
                  post.imageFormat === "LANDSCAPE"
                    ? "bg-neutral-950"
                    : "bg-neutral-200"
                }`}
              >
                <img
                  src={post.imageUrl}
                  alt={post.title}
                  className={`h-full w-full ${
                    post.imageFormat === "LANDSCAPE"
                      ? "object-contain"
                      : "object-cover"
                  }`}
                />
              </div>
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500">
                <FileText className="h-6 w-6" />
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  BedahKarya
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${categoryMeta.badgeClass}`}
                >
                  {categoryMeta.label}
                </span>
              </div>
              <p className="line-clamp-1 text-xs font-bold text-neutral-950">
                {post.title}
              </p>
              <p className="line-clamp-2 text-[11px] leading-relaxed text-neutral-600">
                {captionSnippet}
              </p>
            </div>
          </div>

          <div className="border-t border-neutral-200/80 bg-white px-3 py-2">
            <p className="truncate font-mono text-[11px] text-neutral-500">
              {shareUrl}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-neutral-700">
              Tautan Konten
            </p>
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <span className="truncate font-mono text-xs text-neutral-700">
                  {shareUrl}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-neutral-950 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-blue-400" />
                    Disalin
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Salin
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-neutral-700">
              Bagikan Langsung Ke
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 transition hover:bg-blue-100"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 transition hover:bg-sky-100"
              >
                <Send className="h-3.5 w-3.5" />
                Telegram
              </a>
              <a
                href={xUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-100"
              >
                <Share2 className="h-3.5 w-3.5" />
                X / Twitter
              </a>
            </div>

            {canNativeShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-50"
              >
                <Share2 className="h-3.5 w-3.5" />
                Bagikan via Aplikasi Perangkat
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
