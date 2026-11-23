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
  PENDING: "border-red-200 bg-red-50 text-red-600",
  RESOLVED: "border-[#2563EB]/30 bg-[#2563EB]/10 text-[#2563EB]",
  DISMISSED: "border-slate-200 bg-[#F8FAFC] text-slate-600",
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
        setError(data?.error || "Gagal memuat data laporan.");
        return;
      }

      setReports(data.reports || []);
      if (data.counts) setCounts(data.counts);
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusUpdate(reportId, nextStatus) {
    setBusyId(reportId);
    setError("");
    try {
      const response = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_REPORT_STATUS",
          reportId,
          status: nextStatus,
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

  async function handleResolveAndDeletePost() {
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
        setError(data.error || "Gagal menghapus konten terlapor.");
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">
          Pusat Laporan Komunitas
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Tinjau tiket laporan beserta tangkapan layar bukti untuk menjaga
          kualitas ruang diskusi.
        </p>
      </div>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { value: "", label: `Semua (${counts.total})` },
            { value: "PENDING", label: `Menunggu (${counts.pending})` },
            { value: "RESOLVED", label: `Selesai (${counts.resolved})` },
            { value: "DISMISSED", label: `Diabaikan (${counts.dismissed})` },
          ].map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => {
                setStatusFilter(tab.value);
                fetchReports({ nextStatus: tab.value });
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${statusFilter === tab.value
                ? "bg-[#2563EB] text-white"
                : "bg-[#F8FAFC] text-slate-600 hover:text-[#2563EB]"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchReports();
          }}
          className="flex items-center gap-2 border-t border-slate-100 pt-3"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Cari alasan laporan, judul konten, pelapor, atau pembuat..."
              className="w-full rounded-lg border border-slate-300 bg-[#F8FAFC] py-2 pr-3 pl-9 text-sm text-[#1E293B] outline-none focus:border-[#2563EB] focus:bg-white"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
          >
            Cari
          </button>
        </form>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-14 text-sm text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#2563EB]" />
          Memuat laporan...
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500">
          Tidak ada tiket laporan pada status ini.
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const busy = busyId === report.id;
            return (
              <div
                key={report.id}
                className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-3.5">
                    {report.post.imageUrl ? (
                      <div className="bk-protected-media h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-[#1E293B]">
                        <img
                          src={report.post.imageUrl}
                          alt={report.post.title}
                          className={`h-full w-full ${report.post.imageFormat === "LANDSCAPE"
                            ? "object-contain"
                            : "object-cover"
                            }`}
                        />
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-[#CBD5E1] text-[#1E293B]">
                        <FileText className="h-5 w-5" />
                      </div>
                    )}

                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[report.status] || STATUS_STYLES.PENDING
                            }`}
                        >
                          {STATUS_LABELS[report.status] || report.status}
                        </span>
                        <span className="text-xs text-slate-500">
                          Dilaporkan {formatRelativeTime(report.createdAt)} oleh{" "}
                          <Link
                            href={`/profile/${report.reporter.username}`}
                            className="font-mono font-semibold text-[#2563EB] hover:underline"
                          >
                            @{report.reporter.username}
                          </Link>
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-[#1E293B]">
                        <Link
                          href={`/post/${report.post.id}`}
                          className="hover:text-[#2563EB] hover:underline"
                        >
                          {report.post.title}
                        </Link>{" "}
                        <span className="font-mono text-xs font-normal text-slate-500">
                          oleh @{report.post.author.username}
                        </span>
                      </h3>

                      <p className="rounded-lg border border-slate-100 bg-[#F8FAFC] px-3 py-2 text-xs leading-relaxed text-[#1E293B]">
                        {report.reason}
                      </p>

                      {report.evidenceUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewEvidenceUrl(report.evidenceUrl)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#2563EB]/30 bg-[#2563EB]/10 px-2.5 py-1 text-xs font-semibold text-[#2563EB] transition hover:bg-[#2563EB]/20"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          Lihat Screenshot Bukti
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 lg:shrink-0">
                    {report.status !== "RESOLVED" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleStatusUpdate(report.id, "RESOLVED")}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#2563EB]/30 bg-[#2563EB]/10 px-3 py-1.5 text-xs font-semibold text-[#2563EB] hover:bg-[#2563EB]/20 disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Tandai Selesai
                      </button>
                    )}

                    {report.status !== "DISMISSED" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          handleStatusUpdate(report.id, "DISMISSED")
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-[#F8FAFC] disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        Abaikan
                      </button>
                    )}

                    {report.status !== "PENDING" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleStatusUpdate(report.id, "PENDING")}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-[#F8FAFC] disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Buka Lagi
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmDeleteReport(report)}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus Konten
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewEvidenceUrl && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewEvidenceUrl("")}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/80 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-2xl space-y-2"
          >
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewEvidenceUrl("")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#1E293B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <img
              src={previewEvidenceUrl}
              alt="Bukti tangkapan layar laporan"
              className="max-h-[80vh] w-full rounded-xl border border-slate-700 bg-[#1E293B] object-contain"
            />
          </div>
        </div>
      )}

      {confirmDeleteReport && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirmDeleteReport(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/75 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <h3 className="text-base font-bold text-[#1E293B]">
              Hapus Konten Melanggar?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Konten{" "}
              <span className="font-semibold text-[#1E293B]">
                &ldquo;{confirmDeleteReport.post.title}&rdquo;
              </span>{" "}
              akan dihapus permanen beserta seluruh komentar dan laporan
              terkait.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteReport(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResolveAndDeletePost}
                disabled={deletingPost}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deletingPost && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Hapus Konten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
