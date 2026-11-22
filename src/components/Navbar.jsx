"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Calendar,
  ChevronDown,
  Compass,
  Home,
  LogIn,
  LogOut,
  Mail,
  PlusSquare,
  Scale,
  Search,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import BrandMark from "@/components/BrandMark";
import SmartSearchBar from "@/components/SmartSearchBar";
import { isStaffRole } from "@/lib/session";

export default function Navbar({
  user,
  initialUnreadNotifications = 0,
  initialUnreadMessages = 0,
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(
    initialUnreadNotifications
  );
  const [unreadMessages, setUnreadMessages] = useState(initialUnreadMessages);
  const menuRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    setUnreadNotifications(initialUnreadNotifications);
    setUnreadMessages(initialUnreadMessages);
  }, [initialUnreadNotifications, initialUnreadMessages]);

  useEffect(() => {
    if (!user) return undefined;

    async function refreshBadges() {
      try {
        const res = await fetch("/api/notifications?summary=true");
        const data = await res.json().catch(() => null);
        if (res.ok && data) {
          setUnreadNotifications(data.unreadNotifications ?? 0);
          setUnreadMessages(data.unreadMessages ?? 0);
        }
      } catch {
        // Abaikan error jaringan sementara
      }
    }

    refreshBadges();
    const interval = setInterval(refreshBadges, 30000);
    return () => clearInterval(interval);
  }, [user, pathname]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setMenuOpen(false);
      router.push("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  const navItems = [
    { href: "/", label: "Beranda", icon: Home },
    { href: "/search", label: "Eksplorasi", icon: Compass },
    { href: "/events", label: "Event", icon: Calendar },
    { href: "/upload", label: "Unggah", icon: PlusSquare },
  ];

  const isStaff = user && isStaffRole(user.role);

  return (
    <>
      <header className="sticky top-0 z-40 h-16 border-b border-[#2563EB]/30 bg-[#3B82F6] text-white shadow-xs dark:border-slate-700 dark:bg-[#1E293B]">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-5">
            <Link href="/" className="shrink-0">
              <BrandMark onNavbar />
            </Link>

            <nav
              aria-label="Navigasi utama"
              className="hidden h-16 items-center gap-1 md:flex"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex h-full items-center gap-1.5 px-3 text-sm transition ${active
                      ? "font-semibold text-white"
                      : "font-medium text-white/80 hover:text-white"
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {active && (
                      <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-white" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="hidden max-w-[260px] flex-1 md:block lg:max-w-xs">
            <SmartSearchBar
              user={user}
              variant="navbar"
              placeholder="Cari konten, #tag, atau @akun..."
            />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/search"
              aria-label="Cari konten"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white hover:bg-white/20 md:hidden"
            >
              <Search className="h-4 w-4" />
            </Link>

            {user ? (
              <>
                <Link
                  href="/messages"
                  aria-label="Pesan Langsung (DM)"
                  title="Pesan Langsung (DM)"
                  className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition ${pathname.startsWith("/messages")
                    ? "bg-[#2563EB] text-white"
                    : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                >
                  <Mail className="h-4 w-4" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 font-mono text-[10px] font-bold text-white">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </Link>

                <Link
                  href="/notifications"
                  aria-label="Pengumuman dan Notifikasi"
                  title="Pengumuman"
                  className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition ${pathname.startsWith("/notifications")
                    ? "bg-[#2563EB] text-white"
                    : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                >
                  <Bell className="h-4 w-4" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 font-mono text-[10px] font-bold text-white">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
                </Link>

                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((prev) => !prev)}
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                    className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/15 px-2.5 py-1.5 text-sm font-medium text-white transition hover:bg-white/25"
                  >
                    <Avatar
                      name={user.name}
                      username={user.username}
                      avatarUrl={user.avatarUrl}
                      size="xs"
                    />
                    <span className="hidden max-w-[100px] truncate sm:inline">
                      @{user.username}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-white/80" />
                  </button>

                  {menuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-200 bg-white py-1.5 text-[#1E293B] shadow-xl"
                    >
                      <div className="border-b border-slate-100 px-3.5 py-2.5">
                        <p className="truncate text-sm font-semibold text-[#1E293B]">
                          {user.name}
                        </p>
                        <p className="truncate font-mono text-xs text-slate-500">
                          @{user.username} · {user.role}
                        </p>
                      </div>

                      <div className="py-1">
                        <Link
                          href={`/profile/${user.username}`}
                          role="menuitem"
                          className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#2563EB]"
                        >
                          <User className="h-4 w-4 text-[#2563EB]" />
                          Profil Saya
                        </Link>

                        <Link
                          href="/notifications"
                          role="menuitem"
                          className="flex items-center justify-between px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#2563EB]"
                        >
                          <span className="flex items-center gap-2.5">
                            <Bell className="h-4 w-4 text-[#2563EB]" />
                            Pengumuman
                          </span>
                          {unreadNotifications > 0 && (
                            <span className="rounded-full bg-[#2563EB] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                              {unreadNotifications}
                            </span>
                          )}
                        </Link>

                        <Link
                          href="/messages"
                          role="menuitem"
                          className="flex items-center justify-between px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#2563EB]"
                        >
                          <span className="flex items-center gap-2.5">
                            <Mail className="h-4 w-4 text-[#2563EB]" />
                            Pesan Langsung (DM)
                          </span>
                          {unreadMessages > 0 && (
                            <span className="rounded-full bg-[#2563EB] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                              {unreadMessages}
                            </span>
                          )}
                        </Link>

                        <Link
                          href="/events"
                          role="menuitem"
                          className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#2563EB]"
                        >
                          <Calendar className="h-4 w-4 text-[#2563EB]" />
                          Event Komunitas
                        </Link>

                        <Link
                          href="/settings"
                          role="menuitem"
                          className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#2563EB]"
                        >
                          <Settings className="h-4 w-4 text-[#2563EB]" />
                          Pengaturan
                        </Link>

                        {user.isSuspended && (
                          <Link
                            href="/appeal"
                            role="menuitem"
                            className="flex items-center gap-2.5 px-3.5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                          >
                            <Scale className="h-4 w-4" />
                            Uji Banding Akun
                          </Link>
                        )}

                        {isStaff && (
                          <Link
                            href="/admin"
                            role="menuitem"
                            className="flex items-center gap-2.5 px-3.5 py-2 text-sm font-semibold text-[#2563EB] hover:bg-[#2563EB]/10"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            {user.role === "ADMIN"
                              ? "Panel Administrator"
                              : "Panel Moderator"}
                          </Link>
                        )}
                      </div>

                      <div className="border-t border-slate-100 pt-1">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleLogout}
                          disabled={loggingOut}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <LogOut className="h-4 w-4" />
                          {loggingOut ? "Keluar..." : "Keluar"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white transition hover:bg-white/15"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-[#2563EB] transition hover:bg-[#F8FAFC]"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <nav
        aria-label="Navigasi seluler"
        className="fixed inset-x-0 bottom-0 z-40 grid h-14 grid-cols-5 border-t border-slate-200 bg-white text-[#1E293B] md:hidden"
      >
        {navItems
          .filter((item) => item.href !== "/events")
          .map((item) => {
            const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] ${active ? "font-semibold text-[#2563EB]" : "font-medium text-slate-500"
                }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <Link
          href={user ? "/notifications" : "/login"}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] ${pathname.startsWith("/notifications")
            ? "font-semibold text-[#2563EB]"
            : "font-medium text-slate-500"
            }`}
        >
          <Bell className="h-4 w-4" />
          <span>Info</span>
        </Link>

        <Link
          href={user ? `/profile/${user.username}` : "/login"}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] ${pathname.startsWith("/profile") || pathname === "/login"
            ? "font-semibold text-[#2563EB]"
            : "font-medium text-slate-500"
            }`}
        >
          {user ? <User className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
          <span>{user ? "Profil" : "Masuk"}</span>
        </Link>
      </nav>
    </>
  );
}
