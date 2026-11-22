"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Flag,
  ImagePlus,
  Loader2,
  Trash2,
  X,
} from "lucide-react";

const QUICK_REASONS = [
  "Plagiarisme atau bukan karya asli",
  "Konten tidak pantas atau mengandung ujaran kebencian",
  "Tautan berbahaya / penipuan / spam",
  "Kategori konten tidak sesuai",
  "Lainnya",
];

const ALLOWED_EVIDENCE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const MAX_EVIDENCE_BYTES = 3 * 1024 * 1024;

export default function ReportModal({ isOpen, onClose, post }) {
  const fileInputRef = useRef(null);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [reason, setReason] = useState("");
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidencePreview, setEvidencePreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return undefined;

    setSelectedPreset("");
    setReason("");
    setEvidenceFile(null);
    setEvidencePreview("");
    setError("");
    setSuccessMessage("");

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    return () => {
      if (evidencePreview) {
        URL.revokeObjectURL(evidencePreview);
      }
    };
  }, [evidencePreview]);

  if (!isOpen || !post) {
    return null;
  }

  function handlePresetSelect(preset) {
    setSelectedPreset(preset);
    setError("");
    if (preset === "Lainnya") {
      setReason("");
    } else {
      setReason(preset);
    }
  }

  function handleSelectEvidence(file) {
    if (!file) return;
    if (!ALLOWED_EVIDENCE_TYPES.includes(file.type)) {
      setError(
        "Format tangkapan layar harus berupa JPG, PNG, WebP, atau GIF."
      );
      return;
    }
    if (file.size > MAX_EVIDENCE_BYTES) {
      setError("Ukuran file tangkapan layar maksimal 3 MB.");
      return;
    }

    if (evidencePreview) {
      URL.revokeObjectURL(evidencePreview);
    }
    setError("");
    setEvidenceFile(file);
    setEvidencePreview(URL.createObjectURL(file));
  }

  function handleRemoveEvidence() {
    if (evidencePreview) {
      URL.revokeObjectURL(evidencePreview);
    }
    setEvidenceFile(null);
    setEvidencePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const trimmed = reason.trim();
    if (trimmed.length < 8) {
      setError("Jelaskan alasan laporan minimal 8 karakter.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("type", "REPORT");
      formData.append("postId", post.id);
      formData.append("reason", trimmed);
      if (evidenceFile) {
        formData.append("evidence", evidenceFile);
      }

      const response = await fetch("/api/interactions", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Gagal mengirim laporan.");
        return;
      }

      setSuccessMessage(
        data.message || "Laporan telah dikirim ke tim moderasi."
      );
    } catch {
      setError("Gagal terhubung ke server. Coba lagi sebentar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Laporkan konten ${post.title}`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-950/70 p-4 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="my-auto w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 shadow-xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <Flag className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-neutral-950">
                Laporkan Konten
              </h3>
              <p className="line-clamp-1 text-xs text-neutral-500">
                {post.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog laporan"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {successMessage ? (
          <div className="mt-5 space-y-4">
            <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-3 text-sm text-blue-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <span>{successMessage}</span>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-neutral-950 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Tutup
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold text-neutral-700">
                Pilih alasan laporan
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REASONS.map((preset) => {
                  const active = selectedPreset === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handlePresetSelect(preset)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                        active
                          ? "border-neutral-950 bg-neutral-950 text-white"
                          : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor={`report-reason-${post.id}`}
                className="mb-1.5 block text-xs font-semibold text-neutral-700"
              >
                Detail Alasan
              </label>
              <textarea
                id={`report-reason-${post.id}`}
                rows={3}
                required
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Jelaskan pelanggaran yang ditemukan pada konten ini..."
                className="w-full rounded-lg border border-neutral-300 bg-neutral-50/60 px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:bg-white"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-700">
                  Lampiran Tangkapan Layar (Opsional)
                </label>
                <span className="text-[11px] text-neutral-400">Maks. 3 MB</span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => handleSelectEvidence(e.target.files?.[0])}
                className="hidden"
              />

              {evidencePreview ? (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-2.5">
                  <div className="flex items-center gap-3">
                    <img
                      src={evidencePreview}
                      alt="Pratinjau bukti laporan"
                      className="h-14 w-14 shrink-0 rounded-md border border-neutral-200 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs text-neutral-800">
                        {evidenceFile?.name}
                      </p>
                      <button
                        type="button"
                        onClick={handleRemoveEvidence}
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
                      >
                        <Trash2 className="h-3 w-3" />
                        Hapus lampiran
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-3 py-3 text-xs font-medium text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-100"
                >
                  <ImagePlus className="h-4 w-4 text-neutral-500" />
                  Unggah screenshot / bukti pelanggaran
                </button>
              )}

              <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-500">
                Melampirkan tangkapan layar atau bukti pendukung akan membantu
                mempercepat proses verifikasi dan pengawasan oleh tim moderasi.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-neutral-100 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {submitting ? "Mengirim..." : "Kirim Laporan"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
