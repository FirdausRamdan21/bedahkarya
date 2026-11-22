"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  ImagePlus,
  Loader2,
  Scale,
  Trash2,
} from "lucide-react";
import { formatFullDateTime, formatRelativeTime } from "@/lib/format";

const CATEGORIES_META = [
  { key: "SYSTEM", label: "Sistem" },
  { key: "ADMIN_ANNOUNCEMENT", label: "Pengumuman Admin" },
  { key: "WARNING", label: "Peringatan" },
  { key: "INTERACTION", label: "Interaksi" },
  { key: "HISTORY", label: "Riwayat" },
];

export default function NotificationsView({
  user,
  initialNotifications,
  initialAppeals,
  initialCategory = "",
}) {
  const fileInputRef = useRef(null);
  const [appeals, setAppeals] = useState(initialAppeals || []);
  const [appealOpen, setAppealOpen] = useState(Boolean(user.isSuspended));
  const [targetType, setTargetType] = useState("ACCOUNT");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Hitung item per kategori; sembunyikan kategori yang kosong
  const countMap = {};
  for (const item of initialNotifications) {
    countMap[item.category] = (countMap[item.category] || 0) + 1;
  }

  const visibleCategories = CATEGORIES_META.filter((cat) => {
    if (cat.key === "WARNING" && (user.isSuspended || appeals.length > 0)) {
      return true;
    }
    return (countMap[cat.key] || 0) > 0;
  });

  const defaultCat =
    visibleCategories.some((c) => c.key === initialCategory)
      ? initialCategory
      : visibleCategories[0]?.key || "";

  const [activeCategory, setActiveCategory] = useState(defaultCat);

  const filtered = activeCategory
    ? initialNotifications.filter((n) => n.category === activeCategory)
    : initialNotifications;

  function handleSelectFiles(selectedList) {
    if (!selectedList) return;
    const incoming = Array.from(selectedList);
    const merged = [...files, ...incoming].slice(0, 3);
    setFiles(merged);
    setError("");
  }

  function handleRemoveFile(idx) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmitAppeal(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (message.trim().length < 15) {
      setError("Jelaskan alasan uji banding minimal 15 karakter.");
      return;
    }

    if (files.length < 1 || files.length > 3) {
      setError("Lampirkan minimal 1 foto dan maksimal 3 foto bukti.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("targetType", targetType);
      formData.append("message", message.trim());
      for (const f of files) {
        formData.append("evidence", f);
      }

      const response = await fetch("/api/appeals", {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Gagal mengirim uji banding.");
        return;
      }

      setAppeals((prev) => [data.appeal, ...prev]);
      setMessage("");
      setFiles([]);
      setSuccess(
        data.message || "Uji banding berhasil dikirim untuk ditinjau tim."
      );
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setSubmitting(false);
    }
  }

  const remainingDaysLabel = user.suspendedUntil
    ? `Hingga ${formatFullDateTime(user.suspendedUntil)}`
    : "Tanpa batas waktu (keputusan Admin / Moderator)";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Pengumuman</h1>
        <p className="mt-1 text-xs text-slate-500">
          Pembaruan sistem, informasi admin, peringatan, interaksi, dan riwayat
          aktivitas Anda.
        </p>
      </div>

      {visibleCategories.length > 0 && (
        <div
          role="tablist"
          aria-label="Kategori pengumuman"
          className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1"
        >
          {visibleCategories.map((cat) => {
            const active = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveCategory(cat.key)}
                className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                  active
                    ? "bg-[#2563EB] text-white"
                    : "border border-[#CBD5E1] bg-white text-[#1E293B] hover:border-[#2563EB] dark:border-slate-700 dark:bg-[#1E293B] dark:text-slate-200"
                }`}
              >
                {cat.label}
                {countMap[cat.key] ? ` (${countMap[cat.key]})` : ""}
              </button>
            );
          })}
        </div>
      )}

      {activeCategory === "WARNING" && (
        <section className="space-y-4">
          {user.isSuspended && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-5 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div className="space-y-1.5">
                  <h2 className="text-sm font-bold">
                    Akun ini terkena penangguhan
                  </h2>
                  <p className="text-xs leading-relaxed">
                    <span className="font-semibold">Laporan / Alasan:</span>{" "}
                    {user.suspensionReason ||
                      "Pelanggaran pedoman komunitas BedahKarya."}
                  </p>
                  <p className="text-xs">
                    <span className="font-semibold">Durasi:</span>{" "}
                    {remainingDaysLabel}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-[#CBD5E1] bg-white p-5 dark:border-slate-700 dark:bg-[#1E293B]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-[#2563EB]" />
                <h2 className="text-sm font-bold">Uji Banding</h2>
              </div>
              <button
                type="button"
                onClick={() => setAppealOpen((prev) => !prev)}
                className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                {appealOpen ? "Tutup Form" : "Ajukan Uji Banding"}
              </button>
            </div>

            {appealOpen && (
              <form onSubmit={handleSubmitAppeal} className="mt-4 space-y-3.5 border-t border-slate-100 pt-4 dark:border-slate-700">
                <div>
                  <label className="mb-1 block text-xs font-semibold">
                    Jenis yang Diajukan Banding
                  </label>
                  <select
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value)}
                    className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                  >
                    <option value="ACCOUNT">Penangguhan Akun</option>
                    <option value="POST">Peringatan / Penghapusan Konten</option>
                    <option value="COMMENT">Moderasi Komentar</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold">
                    Penjelasan / Pembelaan
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Jelaskan kronologi dan alasan mengapa pembatasan perlu ditinjau ulang..."
                    className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-sm outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs font-semibold">
                      Bukti Foto (Minimal 1, Maksimal 3 Foto)
                    </label>
                    <span className="font-mono text-[11px] text-slate-500">
                      {files.length}/3 foto
                    </span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => handleSelectFiles(e.target.files)}
                    className="hidden"
                  />
                  {files.length < 3 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] py-3 text-xs font-medium hover:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                    >
                      <ImagePlus className="h-4 w-4 text-[#2563EB]" />
                      Tambah Foto Bukti
                    </button>
                  )}

                  {files.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {files.map((file, idx) => (
                        <li
                          key={`${file.name}-${idx}`}
                          className="flex items-center justify-between rounded-lg border border-[#CBD5E1] px-3 py-1.5 text-xs dark:border-slate-700"
                        >
                          <span className="truncate font-mono">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            className="text-red-600 hover:underline"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {error && <p className="text-xs text-red-600">{error}</p>}
                {success && (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-[#2563EB]">
                    <CheckCircle2 className="h-4 w-4" />
                    {success}
                  </p>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Kirim Uji Banding
                  </button>
                </div>
              </form>
            )}

            {appeals.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-500">
                  Riwayat Uji Banding Anda
                </p>
                {appeals.map((ap) => (
                  <div
                    key={ap.id}
                    className="rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-3 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-semibold">
                        {ap.targetType}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold ${
                          ap.status === "REJECTED"
                            ? "bg-red-100 text-red-700"
                            : "bg-[#2563EB]/15 text-[#2563EB] dark:text-blue-300"
                        }`}
                      >
                        {ap.status === "APPROVED"
                          ? "DIBEBASKAN"
                          : ap.status === "REJECTED"
                            ? "DITOLAK"
                            : "MENUNGGU"}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">
                      {ap.message}
                    </p>
                    {ap.reviewerNote && (
                      <p className="mt-1 text-[11px] font-medium text-[#2563EB]">
                        Catatan Pengawas: {ap.reviewerNote}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[#CBD5E1] bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-[#1E293B]">
          <Bell className="mx-auto h-7 w-7 text-slate-400" />
          <p className="mt-2 text-sm font-semibold">Belum ada pengumuman</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-[#CBD5E1] bg-white p-4 dark:border-slate-700 dark:bg-[#1E293B]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="whitespace-pre-line text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {item.message}
                  </p>
                  <p className="inline-flex items-center gap-1 pt-1 text-[11px] text-slate-400">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(item.createdAt)}
                  </p>
                </div>
                {item.linkUrl && (
                  <Link
                    href={item.linkUrl}
                    className="shrink-0 rounded-lg border border-[#CBD5E1] px-3 py-1.5 text-xs font-semibold text-[#2563EB] hover:bg-[#F8FAFC] dark:border-slate-600"
                  >
                    Buka
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
