"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Scale,
  X,
  XCircle,
} from "lucide-react";
import { formatFullDateTime, formatRelativeTime } from "@/lib/format";

export default function AdminAppealsManager({ initialAppeals }) {
  const router = useRouter();
  const [appeals, setAppeals] = useState(initialAppeals || []);
  const [notes, setNotes] = useState({});
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  async function handleDecision(appealId, decision) {
    setBusyId(appealId);
    setError("");
    try {
      const response = await fetch("/api/appeals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appealId,
          decision,
          reviewerNote: notes[appealId] || "",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Gagal memproses uji banding.");
        return;
      }

      setAppeals((prev) =>
        prev.map((item) =>
          item.id === appealId
            ? {
                ...item,
                status: decision,
                reviewerNote: notes[appealId] || item.reviewerNote,
                user:
                  decision === "APPROVED"
                    ? { ...item.user, isSuspended: false, suspendedUntil: null }
                    : item.user,
              }
            : item
        )
      );
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pusat Uji Banding</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tinjau permohonan uji banding beserta bukti foto dari pengguna yang
          terkena penangguhan atau peringatan.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {appeals.length === 0 ? (
        <div className="rounded-xl border border-[#CBD5E1] bg-white px-6 py-14 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-[#1E293B]">
          <Scale className="mx-auto mb-2 h-7 w-7 text-slate-400" />
          Belum ada permohonan uji banding.
        </div>
      ) : (
        <div className="space-y-4">
          {appeals.map((appeal) => {
            const busy = busyId === appeal.id;
            return (
              <div
                key={appeal.id}
                className="rounded-xl border border-[#CBD5E1] bg-white p-5 dark:border-slate-700 dark:bg-[#1E293B]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-700">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold">
                        {appeal.user.name}
                      </span>
                      <span className="font-mono text-xs text-slate-500">
                        @{appeal.user.username}
                      </span>
                      <span className="rounded bg-[#2563EB]/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#2563EB] dark:text-blue-300">
                        {appeal.targetType}
                      </span>
                    </div>
                    {appeal.user.isSuspended && (
                      <p className="mt-1 text-xs text-red-600">
                        Status Akun: Ditangguhkan{" "}
                        {appeal.user.suspendedUntil
                          ? `(hingga ${formatFullDateTime(appeal.user.suspendedUntil)})`
                          : "(tanpa batas waktu)"}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <span
                      className={`rounded-md px-2.5 py-1 font-mono text-[11px] font-semibold ${
                        appeal.status === "REJECTED"
                          ? "bg-red-100 text-red-700"
                          : "bg-[#2563EB]/15 text-[#2563EB] dark:text-blue-300"
                      }`}
                    >
                      {appeal.status === "APPROVED"
                        ? "DIBEBASKAN"
                        : appeal.status === "REJECTED"
                          ? "DITOLAK"
                          : "MENUNGGU"}
                    </span>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {formatRelativeTime(appeal.createdAt)}
                    </p>
                  </div>
                </div>

                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">
                  {appeal.message}
                </p>

                {appeal.evidenceList?.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <ImageIcon className="h-3.5 w-3.5" />
                      Bukti Foto ({appeal.evidenceList.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {appeal.evidenceList.map((url, idx) => (
                        <button
                          key={`${url}-${idx}`}
                          type="button"
                          onClick={() => setPreviewUrl(url)}
                          className="h-20 w-20 overflow-hidden rounded-lg border border-[#CBD5E1] bg-[#1E293B]"
                        >
                          <img
                            src={url}
                            alt={`Bukti ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {appeal.status === "PENDING" ? (
                  <div className="mt-4 flex flex-col gap-2.5 border-t border-slate-100 pt-3 sm:flex-row sm:items-center dark:border-slate-700">
                    <input
                      type="text"
                      value={notes[appeal.id] || ""}
                      onChange={(e) =>
                        setNotes((prev) => ({
                          ...prev,
                          [appeal.id]: e.target.value,
                        }))
                      }
                      placeholder="Catatan keputusan (opsional)..."
                      className="flex-1 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDecision(appeal.id, "APPROVED")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Bebaskan
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDecision(appeal.id, "REJECTED")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Tolak
                      </button>
                    </div>
                  </div>
                ) : (
                  appeal.reviewerNote && (
                    <p className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-500 dark:border-slate-700">
                      Catatan Pengawas: {appeal.reviewerNote}
                    </p>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {previewUrl && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewUrl("")}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/80 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl overflow-hidden rounded-xl bg-[#1E293B] p-2"
          >
            <button
              type="button"
              onClick={() => setPreviewUrl("")}
              className="absolute top-3 right-3 rounded-full bg-white p-1.5 text-[#1E293B]"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={previewUrl}
              alt="Pratinjau bukti uji banding"
              className="max-h-[80vh] w-auto rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
