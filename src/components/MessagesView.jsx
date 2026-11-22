"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileText,
  ImagePlus,
  Loader2,
  Lock,
  Mail,
  Send,
  X,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import { formatRelativeTime } from "@/lib/format";

export default function MessagesView({
  currentUser,
  initialPartnerId = "",
  initialSharedPost = null,
}) {
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);

  const [contacts, setContacts] = useState([]);
  const [activePartnerId, setActivePartnerId] = useState(initialPartnerId);
  const [messages, setMessages] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);

  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [sharedPost, setSharedPost] = useState(initialSharedPost);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(
    async (partnerId = "") => {
      if (partnerId) {
        setLoadingThread(true);
      } else {
        setLoadingContacts(true);
      }
      try {
        const qs = partnerId ? `?partnerId=${encodeURIComponent(partnerId)}` : "";
        const res = await fetch(`/api/dm${qs}`);
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) return;

        setContacts(data.contacts || []);
        if (partnerId) {
          setMessages(data.messages || []);
        } else if (!activePartnerId && data.contacts?.length > 0) {
          const firstId = data.contacts[0].id;
          setActivePartnerId(firstId);
        }
      } finally {
        setLoadingContacts(false);
        setLoadingThread(false);
      }
    },
    [activePartnerId]
  );

  useEffect(() => {
    loadData(activePartnerId);
  }, [activePartnerId, loadData]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  function handleSelectImage(file) {
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleClearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSend(event) {
    event.preventDefault();
    if (!activePartnerId) return;
    setError("");

    if (!text.trim() && !imageFile && !sharedPost) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append("receiverId", activePartnerId);
      if (text.trim()) formData.append("content", text.trim());
      if (sharedPost?.id) formData.append("sharedPostId", sharedPost.id);
      if (imageFile) formData.append("image", imageFile);

      const response = await fetch("/api/dm", {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Gagal mengirim pesan.");
        return;
      }

      setMessages((prev) => [...prev, data.message]);
      setText("");
      setSharedPost(null);
      handleClearImage();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setSending(false);
    }
  }

  const activePartner = contacts.find((c) => c.id === activePartnerId) || null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Pesan Langsung</h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
            <Lock className="h-3.5 w-3.5 text-[#2563EB]" />
            Privat untuk akun yang Anda ikuti. Admin &amp; Moderator tidak dapat
            melihat percakapan ini.
          </p>
        </div>
      </div>

      <div className="grid min-h-[520px] grid-cols-1 overflow-hidden rounded-xl border border-[#CBD5E1] bg-white md:grid-cols-12 dark:border-slate-700 dark:bg-[#1E293B]">
        {/* Daftar kontak */}
        <aside className="border-b border-[#CBD5E1] md:col-span-4 md:border-r md:border-b-0 dark:border-slate-700">
          <div className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700">
            Akun Diikuti ({contacts.length})
          </div>

          {loadingContacts ? (
            <div className="flex items-center justify-center py-12 text-xs text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Memuat...
            </div>
          ) : contacts.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              <Mail className="mx-auto mb-2 h-6 w-6 text-slate-400" />
              Ikuti kreator lain terlebih dahulu untuk mulai mengirim Pesan
              Langsung.
            </div>
          ) : (
            <ul className="max-h-[460px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-700">
              {contacts.map((contact) => {
                const selected = contact.id === activePartnerId;
                return (
                  <li key={contact.id}>
                    <button
                      type="button"
                      onClick={() => setActivePartnerId(contact.id)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                        selected
                          ? "bg-[#2563EB]/10 dark:bg-[#2563EB]/20"
                          : "hover:bg-[#F8FAFC] dark:hover:bg-slate-800"
                      }`}
                    >
                      <Avatar
                        name={contact.name}
                        username={contact.username}
                        avatarUrl={contact.avatarUrl}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-semibold">
                            {contact.name}
                          </p>
                          {contact.unreadCount > 0 && (
                            <span className="rounded-full bg-[#2563EB] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                              {contact.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="truncate font-mono text-[11px] text-slate-500">
                          @{contact.username}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Ruang chat */}
        <section className="flex flex-col md:col-span-8">
          {!activePartner ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-xs text-slate-500">
              Pilih akun yang Anda ikuti di sebelah kiri untuk memulai
              percakapan privat.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                <Link
                  href={`/profile/${activePartner.username}`}
                  className="flex items-center gap-2.5"
                >
                  <Avatar
                    name={activePartner.name}
                    username={activePartner.username}
                    avatarUrl={activePartner.avatarUrl}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-semibold">{activePartner.name}</p>
                    <p className="font-mono text-[11px] text-slate-500">
                      @{activePartner.username}
                    </p>
                  </div>
                </Link>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-[#F8FAFC] p-4 dark:bg-[#0F172A]">
                {loadingThread ? (
                  <div className="flex items-center justify-center py-10 text-xs text-slate-500">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memuat percakapan...
                  </div>
                ) : messages.length === 0 ? (
                  <p className="py-10 text-center text-xs text-slate-500">
                    Belum ada pesan dengan @{activePartner.username}. Mulai sapa
                    atau bagikan konten!
                  </p>
                ) : (
                  messages.map((msg) => {
                    const fromMe = msg.senderId === currentUser.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${fromMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] space-y-2 rounded-xl px-3.5 py-2.5 text-xs ${
                            fromMe
                              ? "bg-[#2563EB] text-white"
                              : "border border-[#CBD5E1] bg-white text-[#1E293B] dark:border-slate-700 dark:bg-[#1E293B] dark:text-[#F8FAFC]"
                          }`}
                        >
                          {msg.sharedPost && (
                            <Link
                              href={`/post/${msg.sharedPost.id}`}
                              className={`flex items-center gap-2.5 rounded-lg border p-2 ${
                                fromMe
                                  ? "border-white/25 bg-white/10 text-white"
                                  : "border-[#CBD5E1] bg-[#F8FAFC] text-[#1E293B] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                              }`}
                            >
                              {msg.sharedPost.imageUrl ? (
                                <img
                                  src={msg.sharedPost.imageUrl}
                                  alt={msg.sharedPost.title}
                                  className="bk-protected-media h-12 w-12 shrink-0 rounded object-cover"
                                />
                              ) : (
                                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-[#CBD5E1] text-[#1E293B]">
                                  <FileText className="h-5 w-5" />
                                </span>
                              )}
                              <div className="min-w-0">
                                <p className="line-clamp-1 font-semibold">
                                  {msg.sharedPost.title}
                                </p>
                                <p className="font-mono text-[10px] opacity-80">
                                  @{msg.sharedPost.author?.username}
                                </p>
                              </div>
                            </Link>
                          )}

                          {msg.imageUrl && (
                            <img
                              src={msg.imageUrl}
                              alt="Lampiran pesan"
                              className="bk-protected-media max-h-60 rounded-lg object-contain"
                            />
                          )}

                          {msg.content && (
                            <p className="whitespace-pre-line break-words leading-relaxed">
                              {msg.content}
                            </p>
                          )}

                          <p className="text-right text-[10px] opacity-70">
                            {formatRelativeTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-slate-100 p-3 dark:border-slate-700">
                {sharedPost && (
                  <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-[#2563EB]/30 bg-[#2563EB]/5 px-3 py-2 text-xs">
                    <span className="truncate font-medium">
                      Balas konten:{" "}
                      <span className="font-semibold">{sharedPost.title}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSharedPost(null)}
                      className="text-slate-500 hover:text-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {imagePreview && (
                  <div className="mb-2 flex items-center gap-2 rounded-lg border border-[#CBD5E1] p-2 dark:border-slate-700">
                    <img
                      src={imagePreview}
                      alt="Pratinjau gambar DM"
                      className="h-12 w-12 rounded object-cover"
                    />
                    <span className="flex-1 truncate font-mono text-xs">
                      {imageFile?.name}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

                <form onSubmit={handleSend} className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => handleSelectImage(e.target.files?.[0])}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Kirim gambar"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#CBD5E1] text-slate-600 hover:border-[#2563EB] hover:text-[#2563EB] dark:border-slate-600 dark:text-slate-300"
                  >
                    <ImagePlus className="h-4 w-4" />
                  </button>

                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Tulis pesan privat..."
                    disabled={currentUser.isSuspended}
                    className="flex-1 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                  />

                  <button
                    type="submit"
                    disabled={sending || currentUser.isSuspended}
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {sending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Kirim
                  </button>
                </form>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
