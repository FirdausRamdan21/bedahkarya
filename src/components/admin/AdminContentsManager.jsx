"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { CONTENT_CATEGORIES, getCategoryMeta } from "@/lib/categories";
import { formatRelativeTime } from "@/lib/format";

export default function AdminContentsManager({
  initialPosts,
  initialTags,
  categories = CONTENT_CATEGORIES,
  currentStaffRole = "ADMIN",
}) {
  const router = useRouter();
  const isAdmin = currentStaffRole === "ADMIN";

  const [posts, setPosts] = useState(initialPosts || []);
  const [availableTags, setAvailableTags] = useState(initialTags || []);

  const [queryInput, setQueryInput] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [reportedOnly, setReportedOnly] = useState(false);

  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [warningPost, setWarningPost] = useState(null);
  const [warningReason, setWarningReason] = useState("");

  // Edit modal (ADMIN only)
  const [editingPost, setEditingPost] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    category: "KARYA",
    tags: "",
    caption: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Warning / Violation modal (ADMIN & MODERATOR)
  const [warnTarget, setWarnTarget] = useState(null); // { post, mode: "WARN" | "VIOLATION" }
  const [warnReason, setWarnReason] = useState("");
  const [warnSaving, setWarnSaving] = useState(false);

  const [deletingPost, setDeletingPost] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!editingPost && !deletingPost && !warningPost) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setEditingPost(null);
        setDeletingPost(null);
        setWarningPost(null);
        setWarnTarget(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editingPost, deletingPost, warningPost]);

  async function fetchContents({
    nextQuery = queryInput,
    nextTag = selectedTag,
    nextCategory = categoryFilter,
    nextReportedOnly = reportedOnly,
  } = {}) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("resource", "contents");
      if (nextQuery.trim()) params.set("q", nextQuery.trim());
      if (nextTag) params.set("tag", nextTag);
      if (nextCategory) params.set("category", nextCategory);
      if (nextReportedOnly) params.set("reportedOnly", "true");

      const response = await fetch(`/api/admin?${params.toString()}`);
      const data = await response.json().catch(() => null);
      if (!response.ok || !data) {
        setError(data?.error || "Gagal memuat data konten.");
        return;
      }

      setPosts(data.posts || []);
      setAvailableTags(data.availableTags || []);
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitWarning(event) {
    event.preventDefault();
    if (!warningPost) return;
    setBusyId(warningPost.id);
    setError("");
    try {
      const response = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "WARN_POST",
          postId: warningPost.id,
          reason: warningReason.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.post) {
        setError(data.error || "Gagal memberi peringatan.");
        return;
      }

      setPosts((prev) =>
        prev.map((item) =>
          item.id === warningPost.id
            ? { ...item, warningCount: data.post.warningCount }
            : item
        )
      );
      setWarningPost(null);
      setWarningReason("");
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setBusyId("");
    }
  }

  async function handleMarkViolation(post) {
    setBusyId(post.id);
    setError("");
    try {
      const response = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MARK_POST_VIOLATION",
          postId: post.id,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.post) {
        setError(data.error || "Gagal menandai pelanggaran.");
        return;
      }

      setPosts((prev) =>
        prev.map((item) =>
          item.id === post.id ? { ...item, hasViolation: true } : item
        )
      );
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setBusyId("");
    }
  }

  function openEditModal(post) {
    setEditingPost(post);
    setEditForm({
      title: post.title,
      category: post.category,
      tags: post.tags || "",
      caption: post.caption,
    });
    setEditError("");
  }

  async function handleSaveEdit(event) {
    event.preventDefault();
    if (!editingPost) return;
    setEditSaving(true);
    setEditError("");

    try {
      const response = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_POST",
          postId: editingPost.id,
          ...editForm,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.post) {
        setEditError(data.error || "Gagal memperbarui konten.");
        return;
      }

      setPosts((prev) =>
        prev.map((item) =>
          item.id === editingPost.id
            ? {
              ...item,
              title: data.post.title,
              caption: data.post.caption,
              tags: data.post.tags,
              category: data.post.category,
            }
            : item
        )
      );
      setEditingPost(null);
      setSuccessMsg("Konten berhasil diperbarui.");
      router.refresh();
    } catch {
      setEditError("Gagal terhubung ke server.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleSubmitWarnOrViolation(event) {
    event.preventDefault();
    if (!warnTarget) return;
    setWarnSaving(true);
    setError("");
    setSuccessMsg("");

    try {
      const isViolation = warnTarget.mode === "VIOLATION";
      const response = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isViolation
            ? {
              action: "MARK_VIOLATION",
              postId: warnTarget.post.id,
              violationNote: warnReason.trim(),
            }
            : {
              action: "WARN_POST",
              postId: warnTarget.post.id,
              reason: warnReason.trim(),
            }
        ),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.post) {
        setError(data.error || "Gagal memproses sanksi konten.");
        return;
      }

      setPosts((prev) =>
        prev.map((item) =>
          item.id === warnTarget.post.id
            ? { ...item, ...data.post, pendingReportsCount: item.pendingReportsCount }
            : item
        )
      );
      setSuccessMsg(data.message || "Tindakan berhasil diterapkan.");
      setWarnTarget(null);
      setWarnReason("");
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setWarnSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingPost) return;
    setDeleteLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin?resource=post&id=${encodeURIComponent(deletingPost.id)}`,
        { method: "DELETE" }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Gagal menghapus konten.");
        return;
      }

      setPosts((prev) => prev.filter((item) => item.id !== deletingPost.id));
      setDeletingPost(null);
      setSuccessMsg(data.message || "Konten berhasil dihapus.");
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kelola Konten</h1>
        <p className="mt-1 text-sm text-slate-500">
          Total {posts.length} konten. Berikan peringatan 1–2 kali, tandai
          pelanggaran setelah 2 peringatan, atau hapus konten melanggar.
        </p>
      </div>

      <section className="rounded-xl border border-[#CBD5E1] bg-white p-4 dark:border-slate-700 dark:bg-[#1E293B]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchContents();
            }}
            className="flex flex-1 items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Cari judul konten, tag, atau @username..."
                className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] py-2 pr-3 pl-9 text-sm outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Cari
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => {
                const next = e.target.value;
                setCategoryFilter(next);
                fetchContents({ nextCategory: next });
              }}
              className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
            >
              <option value="">Semua Kategori</option>
              {categories.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>

            <select
              value={selectedTag}
              onChange={(e) => {
                const next = e.target.value;
                setSelectedTag(next);
                fetchContents({ nextTag: next });
              }}
              className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
            >
              <option value="">Semua Tag</option>
              {availableTags.map((item) => (
                <option key={item.tag} value={item.tag}>
                  #{item.tag} ({item.count})
                </option>
              ))}
            </select>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs font-medium dark:border-slate-600 dark:bg-slate-800">
              <input
                type="checkbox"
                checked={reportedOnly}
                onChange={(e) => {
                  const next = e.target.checked;
                  setReportedOnly(next);
                  fetchContents({ nextReportedOnly: next });
                }}
                className="accent-[#2563EB]"
              />
              Hanya yang dilaporkan
            </label>
          </div>
        </div>

        {availableTags.length > 0 && (
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => {
                setSelectedTag("");
                fetchContents({ nextTag: "" });
              }}
              className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition ${selectedTag === ""
                ? "bg-[#2563EB] text-white"
                : "bg-[#F8FAFC] text-slate-600 hover:text-[#2563EB]"
                }`}
            >
              Semua Tag
            </button>
            {availableTags.map((item) => (
              <button
                key={item.tag}
                type="button"
                onClick={() => {
                  const next = selectedTag === item.tag ? "" : item.tag;
                  setSelectedTag(next);
                  fetchContents({ nextTag: next });
                }}
                className={`shrink-0 rounded-md px-2.5 py-1 font-mono text-xs transition ${selectedTag === item.tag
                  ? "bg-[#2563EB] font-semibold text-white"
                  : "bg-[#F8FAFC] text-slate-600 hover:text-[#2563EB]"
                  }`}
              >
                #{item.tag}
              </button>
            ))}
          </div>
        )}
      </section>

      {successMsg && (
        <div className="rounded-xl border border-[#2563EB]/30 bg-[#2563EB]/10 px-4 py-3 text-sm font-medium text-[#2563EB]">
          {successMsg}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-[#CBD5E1] bg-white py-14 text-sm text-slate-500 dark:border-slate-700 dark:bg-[#1E293B]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#2563EB]" />
          Memuat daftar konten...
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#CBD5E1] bg-white dark:border-slate-700 dark:bg-[#1E293B]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-xs uppercase text-slate-500 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Konten</th>
                  <th className="px-4 py-3 font-semibold">Kategori</th>
                  <th className="px-4 py-3 font-semibold">Status Pengawasan</th>
                  <th className="px-4 py-3 font-semibold">Waktu</th>
                  <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {posts.map((post) => {
                  const catMeta = getCategoryMeta(post.category, categories);
                  const busy = busyId === post.id;
                  return (
                    <tr key={post.id} className="hover:bg-[#F8FAFC]/60 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {post.imageUrl ? (
                            <img
                              src={post.imageUrl}
                              alt={post.title}
                              className="h-11 w-11 shrink-0 rounded-lg border border-[#CBD5E1] bg-[#1E293B] object-cover"
                            />
                          ) : (
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#CBD5E1] text-[#1E293B]">
                              <FileText className="h-4 w-4" />
                            </span>
                          )}
                          <div className="min-w-0">
                            <Link
                              href={`/post/${post.id}`}
                              className="inline-flex items-center gap-1 font-semibold hover:underline"
                            >
                              <span className="truncate max-w-[220px]">
                                {post.title}
                              </span>
                              <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" />
                            </Link>
                            <p className="font-mono text-xs text-slate-500">
                              @{post.author?.username} · {post.status}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${catMeta.badgeClass}`}
                        >
                          {catMeta.label}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold dark:bg-slate-800">
                            Peringatan {post.warningCount || 0}/2
                          </span>
                          {post.hasViolation && (
                            <span className="rounded bg-red-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-red-700">
                              PELANGGARAN
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                        {formatRelativeTime(post.createdAt)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          {(post.warningCount || 0) < 2 && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                setWarningPost(post);
                                setWarningReason("");
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#CBD5E1] px-2.5 py-1.5 text-xs font-semibold hover:border-[#2563EB] hover:text-[#2563EB] dark:border-slate-600"
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Peringatan {(post.warningCount || 0) + 1}
                            </button>
                          )}

                          {(post.warningCount || 0) >= 2 && !post.hasViolation && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleMarkViolation(post)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                            >
                              <ShieldAlert className="h-3.5 w-3.5" />
                              Beri Pelanggaran
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => openEditModal(post)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#CBD5E1] px-2.5 py-1.5 text-xs font-medium hover:border-[#2563EB] dark:border-slate-600"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setDeletingPost(post)}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {warningPost && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setWarningPost(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/75 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-[#CBD5E1] bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-[#1E293B]"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <h3 className="text-base font-bold">
                Beri Peringatan ke-{(warningPost.warningCount || 0) + 1}
              </h3>
              <button
                type="button"
                onClick={() => setWarningPost(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitWarning} className="mt-4 space-y-3">
              <p className="text-xs text-slate-500">
                Konten: <span className="font-semibold">{warningPost.title}</span>
              </p>
              <textarea
                rows={3}
                required
                value={warningReason}
                onChange={(e) => setWarningReason(e.target.value)}
                placeholder="Alasan peringatan yang akan dikirim ke notifikasi pemilik konten..."
                className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWarningPost(null)}
                  className="rounded-lg border border-[#CBD5E1] px-4 py-2 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={busyId === warningPost.id}
                  className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  Kirim Peringatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Peringatan 1-2x / Pelanggaran */}
      {warnTarget && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setWarnTarget(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/75 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <h3 className="text-base font-bold text-[#1E293B]">
              {warnTarget.mode === "VIOLATION"
                ? "Tetapkan Status Pelanggaran Konten"
                : `Kirim Peringatan ke-${(warnTarget.post.warningCount ?? 0) + 1} (dari 2)`}
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Konten:{" "}
              <span className="font-semibold text-[#1E293B]">
                &ldquo;{warnTarget.post.title}&rdquo;
              </span>{" "}
              (@{warnTarget.post.author.username})
            </p>

            <form
              onSubmit={handleSubmitWarnOrViolation}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#1E293B]">
                  Catatan / Alasan
                </label>
                <textarea
                  rows={3}
                  required
                  maxLength={500}
                  value={warnReason}
                  onChange={(e) => setWarnReason(e.target.value)}
                  placeholder="Tuliskan alasan peringatan atau pelanggaran yang akan dikirim ke pemilik konten..."
                  className="w-full rounded-lg border border-slate-300 bg-[#F8FAFC] px-3 py-2 text-xs text-[#1E293B] outline-none focus:border-[#2563EB] focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setWarnTarget(null)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={warnSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {warnSaving && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {warnTarget.mode === "VIOLATION"
                    ? "Tetapkan Pelanggaran"
                    : "Kirim Peringatan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Konten (Khusus ADMIN) */}
      {editingPost && isAdmin && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setEditingPost(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/75 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-xl border border-[#CBD5E1] bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-[#1E293B]"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <h3 className="text-base font-bold">Edit Konten</h3>
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="rounded p-1 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3">
              <input
                type="text"
                required
                value={editForm.title}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              />
              <select
                value={editForm.category}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, category: e.target.value }))
                }
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              >
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={editForm.tags}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, tags: e.target.value }))
                }
                className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-800"
              />
              <textarea
                rows={4}
                required
                value={editForm.caption}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, caption: e.target.value }))
                }
                className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              />
              {editError && <p className="text-xs text-red-600">{editError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="rounded-lg border border-[#CBD5E1] px-4 py-2 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hapus Konten */}
      {deletingPost && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setDeletingPost(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/75 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-[#CBD5E1] bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-[#1E293B]"
          >
            <h3 className="text-base font-bold">Hapus Konten?</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Konten &ldquo;{deletingPost.title}&rdquo; akan dihapus permanen.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingPost(null)}
                className="rounded-lg border border-[#CBD5E1] px-4 py-2 text-xs font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
