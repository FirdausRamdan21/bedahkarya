"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Clock,
  Hash,
  Loader2,
  Search,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import Avatar from "@/components/Avatar";

const LOCAL_HISTORY_KEY = "bk_search_history";

function readGuestHistory() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_HISTORY_KEY);
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => typeof item === "string" && item.trim())
      .slice(0, 5)
      .map((query, idx) => ({ id: `local-${idx}-${query}`, query }));
  } catch {
    return [];
  }
}

function writeGuestHistory(list) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LOCAL_HISTORY_KEY,
      JSON.stringify(list.slice(0, 5))
    );
  } catch {
    // Abaikan jika penyimpanan lokal penuh/diblokir
  }
}

export default function SmartSearchBar({
  user = null,
  initialValue = "",
  variant = "navbar",
  onSubmitQuery,
  placeholder = "Cari karya, #tag, atau @kreator...",
}) {
  const router = useRouter();
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [suggestMode, setSuggestMode] = useState("default");
  const [history, setHistory] = useState([]);
  const [trends, setTrends] = useState([]);
  const [users, setUsers] = useState([]);
  const [tags, setTags] = useState([]);
  const [isRecentTagDefault, setIsRecentTagDefault] = useState(true);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const fetchSuggestions = useCallback(
    async (rawQuery) => {
      const trimmed = rawQuery.trim();
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (trimmed) {
          params.set("q", trimmed);
        }
        const response = await fetch(`/api/search/suggest?${params.toString()}`);
        const data = await response.json().catch(() => null);
        if (!response.ok || !data) return;

        setSuggestMode(data.mode || "default");
        if (data.mode === "mention") {
          setUsers(data.users || []);
        } else if (data.mode === "tag") {
          setTags(data.tags || []);
          setIsRecentTagDefault(Boolean(data.isRecentDefault));
        } else {
          setTrends(data.trends || []);
          if (user) {
            setHistory(data.history || []);
          } else {
            setHistory(readGuestHistory());
          }
        }
      } catch {
        if (!user) {
          setHistory(readGuestHistory());
        }
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (!open) return undefined;

    const trimmed = value.trim();
    const isPrefixOnly = trimmed === "" || trimmed === "@" || trimmed === "#";
    const delay = isPrefixOnly ? 0 : 140;

    const handle = setTimeout(() => {
      fetchSuggestions(trimmed);
    }, delay);

    return () => clearTimeout(handle);
  }, [open, value, fetchSuggestions]);

  async function recordSearch(term) {
    const trimmed = term.trim();
    if (!trimmed) return;

    if (!user) {
      const current = readGuestHistory().map((item) => item.query);
      const next = [
        trimmed,
        ...current.filter((q) => q.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, 5);
      writeGuestHistory(next);
      setHistory(next.map((q, idx) => ({ id: `local-${idx}-${q}`, query: q })));
    }

    try {
      const response = await fetch("/api/search/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const data = await response.json().catch(() => null);
      if (user && response.ok && Array.isArray(data?.history)) {
        setHistory(data.history);
      }
    } catch {
      // Tidak memblokir navigasi pencarian
    }
  }

  function executeSearch(term) {
    const trimmed = (term ?? value).trim();
    setValue(trimmed);
    setOpen(false);
    inputRef.current?.blur();

    if (trimmed) {
      recordSearch(trimmed);
    }

    if (onSubmitQuery) {
      onSubmitQuery(trimmed);
      return;
    }

    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/search");
    }
  }

  function handleFormSubmit(event) {
    event.preventDefault();
    executeSearch(value);
  }

  async function handleRemoveHistory(event, item) {
    event.stopPropagation();
    if (user) {
      setHistory((prev) => prev.filter((row) => row.id !== item.id));
      await fetch(`/api/search/history?id=${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      }).catch(() => {});
    } else {
      const next = readGuestHistory()
        .map((row) => row.query)
        .filter((q) => q !== item.query);
      writeGuestHistory(next);
      setHistory(next.map((q, idx) => ({ id: `local-${idx}-${q}`, query: q })));
    }
  }

  async function handleClearAllHistory(event) {
    event.stopPropagation();
    setHistory([]);
    if (user) {
      await fetch("/api/search/history?clearAll=true", {
        method: "DELETE",
      }).catch(() => {});
    } else {
      writeGuestHistory([]);
    }
  }

  function handleClearInput() {
    setValue("");
    if (onSubmitQuery) {
      onSubmitQuery("");
    }
    inputRef.current?.focus();
    setOpen(true);
  }

  const trimmedValue = value.trim();
  const isExplore = variant === "explore";

  return (
    <div ref={wrapperRef} className="relative w-full">
      <form
        onSubmit={handleFormSubmit}
        className={isExplore ? "flex items-center gap-2" : "w-full"}
      >
        <div className="relative flex-1">
          <Search
            className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-neutral-400 ${
              isExplore ? "left-3.5 h-4 w-4" : "left-3 h-4 w-4"
            }`}
          />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setValue(e.target.value);
              if (!open) setOpen(true);
            }}
            placeholder={placeholder}
            aria-label="Pencarian BedahKarya"
            autoComplete="off"
            className={
              isExplore
                ? "w-full rounded-lg border border-neutral-300 bg-neutral-50 py-2.5 pr-9 pl-10 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:bg-white"
                : "w-full rounded-lg border border-neutral-200 bg-neutral-50 py-1.5 pr-8 pl-9 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-neutral-400 focus:bg-white"
            }
          />
          {value && (
            <button
              type="button"
              onClick={handleClearInput}
              aria-label="Bersihkan pencarian"
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {isExplore && (
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Cari
          </button>
        )}
      </form>

      {open && (
        <div
          data-testid="smart-search-panel"
          className="absolute right-0 left-0 z-50 mt-2 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl"
        >
          {loading && (
            <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-2 text-xs text-neutral-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Memuat saran...
            </div>
          )}

          {trimmedValue.startsWith("@") && suggestMode === "mention" ? (
            <div className="p-2">
              <div className="flex items-center justify-between px-2.5 py-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                  {trimmedValue === "@"
                    ? "Pengikut & Kreator"
                    : `Saran Akun untuk ${trimmedValue}`}
                </span>
              </div>

              {users.length === 0 ? (
                <p className="px-2.5 py-4 text-center text-xs text-neutral-500">
                  Tidak ada akun yang cocok dengan {trimmedValue}.
                </p>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {users.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 transition hover:bg-neutral-50"
                    >
                      <button
                        type="button"
                        onClick={() => executeSearch(`@${item.username}`)}
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                      >
                        <Avatar
                          name={item.name}
                          username={item.username}
                          avatarUrl={item.avatarUrl}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-neutral-950">
                            {item.name}
                          </p>
                          <p className="truncate font-mono text-[11px] text-neutral-500">
                            @{item.username}
                          </p>
                        </div>
                      </button>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                            item.relation === "Pengikut"
                              ? "border border-blue-200 bg-blue-50 text-blue-800"
                              : item.relation === "Mengikuti"
                                ? "border border-blue-200 bg-blue-50 text-blue-800"
                                : "bg-neutral-100 text-neutral-600"
                          }`}
                        >
                          {item.relation}
                        </span>
                        <Link
                          href={`/profile/${item.username}`}
                          onClick={() => setOpen(false)}
                          className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-0.5 text-[11px] font-medium text-neutral-700 hover:bg-neutral-100"
                        >
                          <User className="h-3 w-3" />
                          Profil
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : trimmedValue.startsWith("#") && suggestMode === "tag" ? (
            <div className="p-2">
              <div className="flex items-center justify-between px-2.5 py-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                  {isRecentTagDefault
                    ? "5 Tag Terakhir Digunakan"
                    : `Saran Tag untuk ${trimmedValue}`}
                </span>
              </div>

              {tags.length === 0 ? (
                <p className="px-2.5 py-4 text-center text-xs text-neutral-500">
                  Belum ada tag yang cocok dengan {trimmedValue}.
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {tags.map((item) => (
                    <li key={item.tag}>
                      <button
                        type="button"
                        onClick={() => executeSearch(`#${item.tag}`)}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition hover:bg-neutral-50"
                      >
                        <span className="inline-flex items-center gap-2 font-mono text-xs font-semibold text-neutral-900">
                          <Hash className="h-3.5 w-3.5 text-neutral-400" />
                          {item.tag}
                        </span>
                        <span className="text-[11px] text-neutral-500">
                          {item.count} konten
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {trimmedValue && (
                <div className="p-2">
                  <button
                    type="button"
                    onClick={() => executeSearch(trimmedValue)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-neutral-800 hover:bg-neutral-50"
                  >
                    <Search className="h-3.5 w-3.5 text-neutral-400" />
                    <span>
                      Cari{" "}
                      <span className="font-semibold text-neutral-950">
                        &ldquo;{trimmedValue}&rdquo;
                      </span>{" "}
                      di Eksplorasi
                    </span>
                  </button>
                </div>
              )}

              <div className="p-2">
                <div className="flex items-center justify-between px-2.5 py-1">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                    <Clock className="h-3 w-3" />
                    Riwayat Pencarian
                  </span>
                  {history.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllHistory}
                      className="text-[11px] font-medium text-neutral-500 hover:text-red-600"
                    >
                      Hapus semua
                    </button>
                  )}
                </div>

                {history.length === 0 ? (
                  <p className="px-2.5 py-2.5 text-xs text-neutral-400">
                    Belum ada riwayat pencarian. Gunakan{" "}
                    <span className="font-mono text-neutral-600">#tag</span>{" "}
                    atau{" "}
                    <span className="font-mono text-neutral-600">@username</span>.
                  </p>
                ) : (
                  <ul className="mt-0.5 space-y-0.5">
                    {history.slice(0, 5).map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 hover:bg-neutral-50"
                      >
                        <button
                          type="button"
                          onClick={() => executeSearch(item.query)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs text-neutral-800"
                        >
                          <Clock className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                          <span className="truncate">{item.query}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveHistory(e, item)}
                          aria-label={`Hapus riwayat ${item.query}`}
                          className="rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="p-2">
                <div className="flex items-center justify-between px-2.5 py-1">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                    <TrendingUp className="h-3 w-3" />
                    Tren Pencarian Terkini
                  </span>
                </div>

                {trends.length === 0 ? (
                  <p className="px-2.5 py-2 text-xs text-neutral-400">
                    Belum ada tren pencarian.
                  </p>
                ) : (
                  <div className="mt-1 flex flex-wrap gap-1.5 px-2 pb-1">
                    {trends.map((item) => (
                      <button
                        key={item.id || item.term}
                        type="button"
                        onClick={() => executeSearch(item.term)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-950"
                      >
                        <TrendingUp className="h-3 w-3 text-neutral-400" />
                        <span>{item.term}</span>
                        <span className="font-mono text-[10px] text-neutral-400">
                          {item.count}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between bg-neutral-50 px-3.5 py-2 text-[11px] text-neutral-500">
                <span>
                  Ketik <span className="font-mono font-semibold text-neutral-800">#</span> untuk tag
                </span>
                <span>
                  Ketik <span className="font-mono font-semibold text-neutral-800">@</span> untuk akun
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
