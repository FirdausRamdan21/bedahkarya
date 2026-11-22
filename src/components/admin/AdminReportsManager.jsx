"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  FileText,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/format";

const STATUS_STYLES = {
  PENDING: "border-slate-200 bg-slate-50 text-slate-800",
  RESOLVED: "border-blue-200 bg-blue-50 text-blue-800",
  DISMISSED: "border-neutral-200 bg-neutral-100 text-neutral-700",
};

const STATUS_LABELS = {
  PENDING: "Menunggu",
  RESOLVED: "Selesai",
  DISMISSED: "Diabaikan",
};

export default function AdminReportsManager({ initialReports, initialCounts }) {
  const router = useRouter();
  const [reports, setReports] = useState(initialReports || []);
  const [counts, setCounts] = useState(
    initialCounts || { total: 0, pending: 0, resolved: 0, dismissed: 0 }
  );
  const [statusFilter, setStatusFilter] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [confirmDeleteReport, setConfirmDeleteReport] = useState(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [previewEvidenceUrl, setPreviewEvidenceUrl] = useState("");

  useEffect(() => {
    if (!confirmDeleteReport && !previewEvidenceUrl) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setConfirmDeleteReport(null);
        setPreviewEvidenceUrl("");
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [confirmDeleteReport, previewEvidenceUrl]);

  async function fetchReports({
    nextStatus = statusFilter,
    nextQuery = queryInput,
  } = {}) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("resource", "reports");
      if (nextStatus) params.set("status", nextStatus);
      if (nextQuery.trim()) params.set("q", nextQuery.trim());

      const response = await fetch(`/api/admin?${params.toString()}`);
      const data = await response.json().catch(() => null);
      if (!response.ok || !data) {
        setError(data?.error || "Gagal memuat daftar laporan.");
        return;
      }

      setReports(data.reports || []);
      if (data.counts) {
        setCounts(data.counts);
      }
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(reportId, status) {
    setBusyId(reportId);
    setError("");
    try {
      const response = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_REPORT_STATUS",
          reportId,
          status,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Gagal memperbarui status laporan.");
        return;
      }

      await fetchReports();
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setBusyId("");
    }
  }

  async function handleConfirmDeletePost() {
    if (!confirmDeleteReport) return;
    setDeletingPost(true);
    setError("");
    try {
      const response = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESOLVE_AND_DELETE_POST",
          reportId: confirmDeleteReport.id,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Gagal menghapus konten melanggar.");
        return;
      }

      setConfirmDeleteReport(null);
      await fetchReports();
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setDeletingPost(false);
    }
  }

  const tabs = [
    { value: "", label: "Semua", count: counts.total },
    { value: "PENDING", label: "Menunggu", count: counts.pending },
    { value: "RESOLVED", label: "Selesai", count: counts.resolved },
    { value: "DISMISSED", label: "Diabaikan", count: counts.dismissed },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-950">
          Pusat Laporan
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Tinjau laporan dan tangkapan layar bukti dari pengguna publik.
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {tabs.map((tab) => {
            const active = statusFilter === tab.value;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.value);
                  fetchReports({ nextStatus: tab.value });
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-neutral-950 text-white"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded px-1.5 py-0.2 font-mono text-[10px] ${
                    active ? "bg-white/20 text-white" : "bg-white text-neutral-700"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchReports();
          }}
          className="flex items-center gap-2 lg:w-80"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Cari alasan atau judul konten..."
              className="w-full rounded-lg border border-neutral-300 bg-neutral-50 py-1.5 pr-3 pl-9 text-sm text-neutral-900 outline-none focus:border-neutral-900 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-neutral-950 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
          >
            Cari
          </button>
        </form>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-neutral-200 bg-white py-14 text-sm text-neutral-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Memuat antrean laporan...
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white px-6 py-14 text-center text-sm text-neutral-500">
          Tidak ada tiket laporan pada kategori ini.
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const busy = busyId === report.id;
            return (
              <article
                key={report.id}
                className="flex flex-col justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-3.5">
                  {report.post?.imageUrl ? (
                    <img
                      src={report.post.imageUrl}
                      alt={report.post.title}
                      className="h-16 w-16 shrink-0 rounded-lg border border-neutral-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-100 text-neutral-500">
                      <FileText className="h-5 w-5" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold ${
                          STATUS_STYLES[report.status] || STATUS_STYLES.PENDING
                        }`}
                      >
                        {STATUS_LABELS[report.status] || report.status}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {formatRelativeTime(report.createdAt)}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-neutral-950">
                      {report.post?.title || "Konten tidak tersedia"}
                    </h3>

                    <p className="text-xs text-neutral-500">
                      Kreator:{" "}
                      {report.post?.author ? (
                        <Link
                          href={`/profile/${report.post.author.username}`}
                          className="font-mono text-neutral-700 hover:underline"
                        >
                          @{report.post.author.username}
                        </Link>
                      ) : (
                        "-"
                      )}{" "}
                      · Pelapor:{" "}
                      <Link
                        href={`/profile/${report.reporter.username}`}
                        className="font-mono text-neutral-700 hover:underline"
                      >
                        @{report.reporter.username}
                      </Link>
                    </p>

                    <p className="mt-1 rounded-lg bg-neutral-50 px-3 py-2 text-xs leading-relaxed text-neutral-700">
                      {report.reason}
                    </p>

                    {report.evidenceUrl && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setPreviewEvidenceUrl(report.evidenceUrl)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                        >
                          <ImageIcon className="h-3.5 w-3.5 text-neutral-500" />
                          Lihat Lampiran Tangkapan Layar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {report.status === "PENDING" ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            handleUpdateStatus(report.id, "RESOLVED")
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Selesaikan
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            handleUpdateStatus(report.id, "DISMISSED")
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" />
                          Abaikan
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleUpdateStatus(report.id, "PENDING")}
                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Buka Kembali
                      </button>
                    )}
                  </div>

                  {report.post && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmDeleteReport(report)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus Konten Pelanggar
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {previewEvidenceUrl && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewEvidenceUrl("")}
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-3xl overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 p-3 shadow-2xl"
          >
            <div className="mb-2 flex items-center justify-between text-xs text-neutral-300">
              <span>Lampiran Bukti Laporan</span>
              <button
                type="button"
                onClick={() => setPreviewEvidenceUrl("")}
                className="rounded-lg p-1 hover:bg-neutral-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <img
              src={previewEvidenceUrl}
              alt="Bukti tangkapan layar laporan"
              className="max-h-[78vh] w-auto rounded-lg object-contain"
            />
          </div>
        </div>
      )}

      {confirmDeleteReport && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirmDeleteReport(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl"
          >
            <h3 className="text-base font-bold text-neutral-950">
              Hapus Konten yang Dilaporkan?
            </h3>
            <p className="mt-2 text-sm text-neutral-600">
              Konten{" "}
              <span className="font-semibold text-neutral-950">
                &ldquo;{confirmDeleteReport.post?.title}&rdquo;
              </span>{" "}
              akan dihapus permanen beserta seluruh suka, komentar, dan laporan
              terkait.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteReport(null)}
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePost}
                disabled={deletingPost}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deletingPost && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {deletingPost ? "Menghapus..." : "Hapus Konten"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
