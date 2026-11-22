"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Megaphone } from "lucide-react";

export default function AdminAnnouncementBox() {
  const [category, setCategory] = useState("ADMIN_ANNOUNCEMENT");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setFeedback("");
    setSending(true);
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, title, message }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Gagal mengirim pengumuman.");
        return;
      }
      setTitle("");
      setMessage("");
      setFeedback(data.message || "Pengumuman diterbitkan.");
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-xl border border-[#CBD5E1] bg-white p-5 dark:border-slate-700 dark:bg-[#1E293B]">
      <div className="flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-[#2563EB]" />
        <h2 className="text-sm font-bold">Kirim Pengumuman Global</h2>
      </div>
      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
          >
            <option value="ADMIN_ANNOUNCEMENT">Pengumuman Admin (Event)</option>
            <option value="SYSTEM">Sistem (Update)</option>
          </select>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul pengumuman..."
            className="rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs outline-none focus:border-[#2563EB] sm:col-span-2 dark:border-slate-600 dark:bg-slate-800"
          />
        </div>
        <textarea
          rows={2}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tulis isi pengumuman yang akan muncul pada halaman Pengumuman seluruh pengguna..."
          className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        {feedback && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-[#2563EB]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {feedback}
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Terbitkan Pengumuman
          </button>
        </div>
      </form>
    </section>
  );
}
