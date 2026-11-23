"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  FileText,
  Link2,
  Loader2,
  Mail,
  MessageCircle,
  Send,
  Share2,
  X,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import { getCategoryMeta } from "@/lib/categories";

export default function ShareModal({ isOpen, onClose, post, currentUser }) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const [canNativeShare, setCanNativeShare] = useState(false);

  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [dmNote, setDmNote] = useState("");
  const [sendingDm, setSendingDm] = useState(false);
  const [dmStatus, setDmStatus] = useState("");
  const [dmError, setDmError] = useState("");

  useEffect(() => {
    if (!isOpen) return undefined;

    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
      setCanNativeShare(typeof navigator?.share === "function");
    }
    setCopied(false);
    setDmStatus("");
    setDmError("");
    setDmNote("");

    if (currentUser && !currentUser.isSuspended) {
      setLoadingContacts(true);
      fetch("/api/messages")
        .then((r) => r.json())
        .then((data) => {
          const list = data?.followingContacts || [];
          setContacts(list);
          setSelectedContactId(list[0]?.id || "");
        })
        .catch(() => { })
        .finally(() => setLoadingContacts(false));
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, currentUser]);

  if (!isOpen || !post) {
    return null;
  }

  const shareUrl = origin ? `${origin}/post/${post.id}` : `/post/${post.id}`;
  const categoryMeta = getCategoryMeta(post.category);
  const rawCaption = (post.caption || "").trim();
  const captionSnippet =
    rawCaption.length > 140
      ? `${rawCaption.slice(0, 140).trim()}...`
      : rawCaption;
  const shareText = `${post.title}\n\n${captionSnippet}\n\nLihat di BedahKarya: ${shareUrl}`;

  async function handleCopyLink() {
    try {
      await navigator.clipboard?.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Abaikan jika clipboard dibatasi browser
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
      // Pengguna membatalkan dialog share
    }
  }

  async function handleSendToDm(event) {
    event.preventDefault();
    if (!selectedContactId) return;
    setSendingDm(true);
    setDmError("");
    setDmStatus("");
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedContactId,
          sharedPostId: post.id,
          content: dmNote.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setDmError(data.error || "Gagal mengirim konten ke DM.");
        return;
      }
      setDmNote("");
      setDmStatus("Konten berhasil dikirim ke Pesan Langsung!");
    } catch {
      setDmError("Gagal terhubung ke server.");
    } finally {
      setSendingDm(false);
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
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#1E293B]/75 p-4 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="my-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB]/10 text-[#2563EB]">
              <Share2 className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-[#1E293B]">
                Bagikan Konten
              </h3>
              <p className="text-xs text-slate-500">
                Kirim ke DM, salin tautan, atau bagikan ke aplikasi lain
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog bagikan"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#1E293B]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-[#F8FAFC]">
          <div className="flex items-stretch gap-3 p-3">
            {post.imageUrl ? (
              <div className="bk-protected-media h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-[#1E293B]">
                <img
                  src={post.imageUrl}
                  alt={post.title}
                  className={`h-full w-full ${post.imageFormat === "LANDSCAPE"
                    ? "object-contain"
                    : "object-cover"
                    }`}
                />
              </div>
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-[#CBD5E1] text-[#1E293B]">
                <FileText className="h-6 w-6" />
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
                  BedahKarya
                </span>
                <span
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${categoryMeta.badgeClass}`}
                >
                  {categoryMeta.label}
                </span>
              </div>
              <p className="line-clamp-1 text-xs font-bold text-[#1E293B]">
                {post.title}
              </p>
              <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-600">
                {captionSnippet}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200/80 bg-white px-3 py-2">
            <p className="truncate font-mono text-[11px] text-slate-500">
              {shareUrl}
            </p>
          </div>
        </div>

        {currentUser && !currentUser.isSuspended && (
          <div className="mt-4 rounded-xl border border-[#2563EB]/25 bg-[#F8FAFC] p-3.5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#1E293B]">
              <Mail className="h-3.5 w-3.5 text-[#2563EB]" />
              Balas / Kirim Konten ke DM
            </p>
            {loadingContacts ? (
              <p className="text-xs text-slate-500">Memuat daftar diikuti...</p>
            ) : contacts.length === 0 ? (
              <p className="text-xs text-slate-500">
                Ikuti pengguna terlebih dahulu agar dapat mengirim konten ke DM.
              </p>
            ) : (
              <form onSubmit={handleSendToDm} className="space-y-2.5">
                <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
                  {contacts.map((contact) => {
                    const selected = selectedContactId === contact.id;
                    return (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => setSelectedContactId(contact.id)}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${selected
                          ? "border-[#2563EB] bg-[#2563EB] text-white"
                          : "border-slate-200 bg-white text-[#1E293B] hover:border-[#3B82F6]"
                          }`}
                      >
                        <Avatar
                          name={contact.name}
                          username={contact.username}
                          avatarUrl={contact.avatarUrl}
                          size="xs"
                        />
                        <span className="font-mono">@{contact.username}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={400}
                    value={dmNote}
                    onChange={(e) => setDmNote(e.target.value)}
                    placeholder="Tambahkan catatan (opsional)..."
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-[#1E293B] outline-none focus:border-[#2563EB]"
                  />
                  <button
                    type="submit"
                    disabled={sendingDm || !selectedContactId}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50"
                  >
                    {sendingDm ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Kirim DM
                  </button>
                </div>

                {dmStatus && (
                  <p className="text-[11px] font-semibold text-[#2563EB]">
                    {dmStatus}
                  </p>
                )}
                {dmError && (
                  <p className="text-[11px] font-semibold text-red-600">
                    {dmError}
                  </p>
                )}
              </form>
            )}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-slate-700">
              Tautan Konten
            </p>
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate font-mono text-xs text-slate-700">
                  {shareUrl}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#1D4ED8]"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
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
            <p className="mb-2 text-xs font-semibold text-slate-700">
              Bagikan Langsung Ke
            </p>
            <div className="grid grid-cols-3 gap-2">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#2563EB]/30 bg-[#2563EB]/10 px-3 py-2 text-xs font-semibold text-[#2563EB] transition hover:bg-[#2563EB]/20"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#3B82F6]/35 bg-[#3B82F6]/10 px-3 py-2 text-xs font-semibold text-[#1E293B] transition hover:bg-[#3B82F6]/20"
              >
                <Send className="h-3.5 w-3.5 text-[#2563EB]" />
                Telegram
              </a>
              <a
                href={xUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-xs font-semibold text-[#1E293B] transition hover:border-[#2563EB]"
              >
                <Share2 className="h-3.5 w-3.5 text-[#2563EB]" />
                X / Lainnya
              </a>
            </div>

            {canNativeShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-[#1E293B] transition hover:bg-[#F8FAFC]"
              >
                <Share2 className="h-3.5 w-3.5 text-[#2563EB]" />
                Bagikan via Aplikasi Perangkat
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
