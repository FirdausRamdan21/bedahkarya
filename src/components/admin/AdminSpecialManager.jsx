"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Crown,
  FolderPlus,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import BadgePill from "@/components/BadgePill";

const ICON_OPTIONS = [
  { value: "brain", label: "Jenius (Otak)" },
  { value: "star", label: "Keren (Bintang)" },
  { value: "wrench", label: "Mekanik (Kunci)" },
  { value: "heart-handshake", label: "Motivator (Kolaborasi)" },
  { value: "crown", label: "Master (Mahkota)" },
  { value: "megaphone", label: "Influencer (Megafon)" },
  { value: "award", label: "Penghargaan" },
  { value: "shield", label: "Pelindung" },
];

export default function AdminSpecialManager({
  initialBadges,
  initialCategories,
  initialEvents,
  initialUsers,
}) {
  const router = useRouter();
  const [tab, setTab] = useState("badges");
  const [badges, setBadges] = useState(initialBadges || []);
  const [categories, setCategories] = useState(initialCategories || []);
  const [events, setEvents] = useState(initialEvents || []);
  const [users, setUsers] = useState(initialUsers || []);

  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  // Form Badge
  const [badgeName, setBadgeName] = useState("");
  const [badgeDesc, setBadgeDesc] = useState("");
  const [badgeIcon, setBadgeIcon] = useState("award");
  const [selectedUserId, setSelectedUserId] = useState(initialUsers?.[0]?.id || "");
  const [userSearch, setUserSearch] = useState("");

  // Form Kategori & Subkategori
  const [catLabel, setCatLabel] = useState("");
  const [catShort, setCatShort] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [subInputs, setSubInputs] = useState({});

  // Form Event
  const [evTitle, setEvTitle] = useState("");
  const [evDesc, setEvDesc] = useState("");
  const [evTag, setEvTag] = useState("");
  const [evEndDate, setEvEndDate] = useState("");
  const [evAnnounce, setEvAnnounce] = useState(true);

  async function refreshAll() {
    const res = await fetch("/api/special", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (res.ok && data) {
      setBadges(data.badges || []);
      setCategories(data.categories || []);
      setEvents(data.events || []);
      setUsers(data.users || []);
    }
    router.refresh();
  }

  async function callSpecial(method, bodyOrQs) {
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      const url =
        method === "DELETE" ? `/api/special?${bodyOrQs}` : "/api/special";
      const res = await fetch(url, {
        method,
        ...(method === "DELETE"
          ? {}
          : {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(bodyOrQs),
            }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Permintaan gagal diproses.");
        return null;
      }
      setFeedback(data.message || "Berhasil.");
      await refreshAll();
      return data;
    } catch {
      setError("Gagal terhubung ke server.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)
    );
  });

  const selectedUser =
    users.find((u) => u.id === selectedUserId) || filteredUsers[0] || null;
  const selectedUserBadgeIds = new Set(
    (selectedUser?.badges || []).map((b) => b.id)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Crown className="h-5 w-5 text-[#2563EB]" />
          Panel Spesial
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Kelola Badge Spesial pengguna, Kategori &amp; Subkategori konten,
          serta Event komunitas (dapat diakses oleh Moderator &amp; Admin).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-[#CBD5E1] pb-3 dark:border-slate-700">
        {[
          { key: "badges", label: `Badge Spesial (${badges.length})` },
          {
            key: "categories",
            label: `Kategori & Subkategori (${categories.length})`,
          },
          { key: "events", label: `Event Komunitas (${events.length})` },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setTab(item.key);
              setError("");
              setFeedback("");
            }}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
              tab === item.key
                ? "bg-[#2563EB] text-white"
                : "border border-[#CBD5E1] bg-white hover:border-[#2563EB] dark:border-slate-700 dark:bg-[#1E293B]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {feedback && (
        <div className="flex items-center gap-2 rounded-xl border border-[#2563EB]/30 bg-[#2563EB]/10 px-4 py-3 text-xs font-medium text-[#2563EB] dark:text-blue-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {tab === "badges" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            <section className="rounded-xl border border-[#CBD5E1] bg-white p-5 dark:border-slate-700 dark:bg-[#1E293B]">
              <h2 className="text-sm font-bold">
                Berikan atau Cabut Badge ke Pengguna
              </h2>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="search"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Cari nama atau @username..."
                  className="rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                />
                <select
                  aria-label="Pilih pengguna"
                  value={selectedUser?.id || ""}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                >
                  {filteredUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      @{u.username} ({u.name})
                    </option>
                  ))}
                </select>
              </div>

              {selectedUser && (
                <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-4 dark:border-slate-700">
                  <p className="text-xs text-slate-500">
                    Klik badge untuk memasang atau mencabut pada profil{" "}
                    <span className="font-mono font-semibold text-[#2563EB]">
                      @{selectedUser.username}
                    </span>
                    :
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {badges.map((badge) => {
                      const has = selectedUserBadgeIds.has(badge.id);
                      return (
                        <button
                          key={badge.id}
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            has
                              ? callSpecial(
                                  "DELETE",
                                  `resource=userBadge&userId=${encodeURIComponent(selectedUser.id)}&badgeId=${encodeURIComponent(badge.id)}`
                                )
                              : callSpecial("POST", {
                                  action: "ASSIGN_BADGE",
                                  userId: selectedUser.id,
                                  badgeId: badge.id,
                                })
                          }
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                            has
                              ? "border-[#2563EB] bg-[#2563EB] text-white"
                              : "border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                          }`}
                        >
                          <span>{has ? "✓" : "+"}</span>
                          <span>{badge.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-[#CBD5E1] bg-white p-5 dark:border-slate-700 dark:bg-[#1E293B]">
              <h2 className="text-sm font-bold">Daftar Badge Tersedia</h2>
              <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-700">
                {badges.map((badge) => (
                  <li
                    key={badge.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0 space-y-1">
                      <BadgePill badge={badge} />
                      <p className="text-xs text-slate-500">
                        {badge.description} · {badge.assignedCount} penerima
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        callSpecial(
                          "DELETE",
                          `resource=badge&id=${encodeURIComponent(badge.id)}`
                        )
                      }
                      aria-label={`Hapus badge ${badge.name}`}
                      className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="h-fit rounded-xl border border-[#CBD5E1] bg-white p-5 lg:col-span-5 dark:border-slate-700 dark:bg-[#1E293B]">
            <h2 className="text-sm font-bold">Buat Badge Spesial Baru</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await callSpecial("POST", {
                  action: "CREATE_BADGE",
                  name: badgeName,
                  description: badgeDesc,
                  icon: badgeIcon,
                });
                if (res) {
                  setBadgeName("");
                  setBadgeDesc("");
                }
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label className="mb-1 block text-xs font-semibold">
                  Nama Badge
                </label>
                <input
                  type="text"
                  required
                  value={badgeName}
                  onChange={(e) => setBadgeName(e.target.value)}
                  placeholder="Contoh: Si Inovator"
                  className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">Ikon</label>
                <select
                  value={badgeIcon}
                  onChange={(e) => setBadgeIcon(e.target.value)}
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                >
                  {ICON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">
                  Deskripsi Singkat
                </label>
                <textarea
                  rows={2}
                  value={badgeDesc}
                  onChange={(e) => setBadgeDesc(e.target.value)}
                  placeholder="Kriteria penerimaan badge..."
                  className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Tambah Badge
              </button>
            </form>
          </section>
        </div>
      )}

      {tab === "categories" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            {categories.map((cat) => (
              <section
                key={cat.id}
                className="rounded-xl border border-[#CBD5E1] bg-white p-5 dark:border-slate-700 dark:bg-[#1E293B]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold">{cat.label}</h3>
                      <span className="rounded bg-[#2563EB]/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#2563EB]">
                        {cat.key}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {cat.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      callSpecial(
                        "DELETE",
                        `resource=category&id=${encodeURIComponent(cat.id)}`
                      )
                    }
                    className="rounded p-1.5 text-red-600 hover:bg-red-50"
                    title="Hapus kategori (jika tidak dipakai konten)"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-700">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Subkategori ({cat.subcategories?.length || 0})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(cat.subcategories || []).map((sub) => (
                      <span
                        key={sub.id}
                        className="inline-flex items-center gap-1 rounded-md border border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium dark:border-slate-600 dark:bg-slate-800"
                      >
                        <span>{sub.name}</span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            callSpecial(
                              "DELETE",
                              `resource=subcategory&id=${encodeURIComponent(sub.id)}`
                            )
                          }
                          aria-label={`Hapus subkategori ${sub.name}`}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const val = (subInputs[cat.id] || "").trim();
                      if (!val) return;
                      const res = await callSpecial("POST", {
                        action: "CREATE_SUBCATEGORY",
                        categoryId: cat.id,
                        name: val,
                      });
                      if (res) {
                        setSubInputs((prev) => ({ ...prev, [cat.id]: "" }));
                      }
                    }}
                    className="mt-3 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={subInputs[cat.id] || ""}
                      onChange={(e) =>
                        setSubInputs((prev) => ({
                          ...prev,
                          [cat.id]: e.target.value,
                        }))
                      }
                      placeholder={`Tambah subkategori untuk ${cat.shortLabel}...`}
                      className="flex-1 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-1.5 text-xs outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Tambah
                    </button>
                  </form>
                </div>
              </section>
            ))}
          </div>

          <section className="h-fit rounded-xl border border-[#CBD5E1] bg-white p-5 lg:col-span-5 dark:border-slate-700 dark:bg-[#1E293B]">
            <h2 className="flex items-center gap-1.5 text-sm font-bold">
              <FolderPlus className="h-4 w-4 text-[#2563EB]" />
              Tambah Kategori Konten Baru
            </h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await callSpecial("POST", {
                  action: "CREATE_CATEGORY",
                  label: catLabel,
                  shortLabel: catShort,
                  description: catDesc,
                });
                if (res) {
                  setCatLabel("");
                  setCatShort("");
                  setCatDesc("");
                }
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label className="mb-1 block text-xs font-semibold">
                  Nama Kategori
                </label>
                <input
                  type="text"
                  required
                  value={catLabel}
                  onChange={(e) => setCatLabel(e.target.value)}
                  placeholder="Contoh: Konten Musik"
                  className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">
                  Label Singkat (Opsional)
                </label>
                <input
                  type="text"
                  value={catShort}
                  onChange={(e) => setCatShort(e.target.value)}
                  placeholder="Contoh: Musik"
                  className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">
                  Deskripsi Kategori
                </label>
                <textarea
                  rows={3}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Jelaskan jenis konten yang masuk kategori ini..."
                  className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                Simpan Kategori Baru
              </button>
            </form>
          </section>
        </div>
      )}

      {tab === "events" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-7">
            {events.map((ev) => (
              <section
                key={ev.id}
                className="rounded-xl border border-[#CBD5E1] bg-white p-5 dark:border-slate-700 dark:bg-[#1E293B]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold">{ev.title}</h3>
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold ${
                          ev.isActive
                            ? "bg-[#2563EB] text-white"
                            : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {ev.isActive ? "AKTIF" : "BERAKHIR"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      {ev.description}
                    </p>
                    <p className="mt-1.5 font-mono text-[11px] text-slate-500">
                      {ev.postsCount} konten berpartisipasi
                      {ev.themeTag ? ` · #${ev.themeTag}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/search?event=${encodeURIComponent(ev.slug)}`}
                      className="rounded-lg border border-[#CBD5E1] px-2.5 py-1.5 text-xs font-semibold hover:border-[#2563EB]"
                    >
                      Lihat Karya
                    </Link>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        callSpecial("PATCH", {
                          action: "TOGGLE_EVENT",
                          eventId: ev.id,
                          isActive: !ev.isActive,
                        })
                      }
                      className="rounded-lg bg-[#2563EB] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      {ev.isActive ? "Akhiri" : "Aktifkan"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        callSpecial(
                          "DELETE",
                          `resource=event&id=${encodeURIComponent(ev.id)}`
                        )
                      }
                      className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                      aria-label={`Hapus event ${ev.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </section>
            ))}
          </div>

          <section className="h-fit rounded-xl border border-[#CBD5E1] bg-white p-5 lg:col-span-5 dark:border-slate-700 dark:bg-[#1E293B]">
            <h2 className="flex items-center gap-1.5 text-sm font-bold">
              <Calendar className="h-4 w-4 text-[#2563EB]" />
              Adakan Event Komunitas Baru
            </h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await callSpecial("POST", {
                  action: "CREATE_EVENT",
                  title: evTitle,
                  description: evDesc,
                  themeTag: evTag,
                  endDate: evEndDate,
                  announce: evAnnounce,
                });
                if (res) {
                  setEvTitle("");
                  setEvDesc("");
                  setEvTag("");
                  setEvEndDate("");
                }
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label className="mb-1 block text-xs font-semibold">
                  Nama Event
                </label>
                <input
                  type="text"
                  required
                  value={evTitle}
                  onChange={(e) => setEvTitle(e.target.value)}
                  placeholder="Contoh: Event Tantangan Desain Poster"
                  className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">
                  Tag Tema # (Opsional)
                </label>
                <input
                  type="text"
                  value={evTag}
                  onChange={(e) => setEvTag(e.target.value)}
                  placeholder="contoh: pembukaanbaru"
                  className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 font-mono text-xs outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">
                  Tanggal Selesai (Opsional)
                </label>
                <input
                  type="date"
                  value={evEndDate}
                  onChange={(e) => setEvEndDate(e.target.value)}
                  className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">
                  Deskripsi &amp; Aturan Event
                </label>
                <textarea
                  rows={3}
                  required
                  value={evDesc}
                  onChange={(e) => setEvDesc(e.target.value)}
                  placeholder="Jelaskan tema dan cara berpartisipasi..."
                  className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                />
              </div>

              <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={evAnnounce}
                  onChange={(e) => setEvAnnounce(e.target.checked)}
                  className="accent-[#2563EB]"
                />
                <span>Kirim otomatis ke Pengumuman Admin</span>
              </label>

              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                Terbitkan Event
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
