"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  Crown,
  Flag,
  LayoutDashboard,
  Layers,
  LogOut,
  Scale,
  Users,
} from "lucide-react";

export default function AdminSidebar({
  user,
  pendingReportsCount = 0,
  pendingAppealsCount = 0,
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const menuItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/contents", label: "Kelola Konten", icon: Layers },
    { href: "/admin/users", label: "Kelola Users", icon: Users },
    {
      href: "/admin/appeals",
      label: "Uji Banding",
      icon: Scale,
      badge: pendingAppealsCount,
    },
    {
      href: "/admin/reports",
      label: "Pusat Laporan",
      icon: Flag,
      badge: pendingReportsCount,
    },
    { href: "/admin/special", label: "Panel Spesial", icon: Crown },
  ];

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      document.documentElement.classList.remove("dark");
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <aside className="flex w-full flex-col justify-between border-b border-slate-700 bg-[#1E293B] text-[#F8FAFC] lg:min-h-screen lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
      <div>
        <div className="flex items-center gap-3 border-b border-slate-700 px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#2563EB] text-xs font-bold tracking-tight text-white">
            BK
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-white">
              BedahKarya
            </p>
            <p className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
              {user.role === "ADMIN" ? "Administrator" : "Moderator"}
            </p>
          </div>
        </div>

        <nav
          aria-label="Navigasi panel admin"
          className="grid grid-cols-2 gap-1.5 p-3 sm:grid-cols-3 lg:grid-cols-1 lg:p-3.5"
        >
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm transition ${active
                  ? "bg-[#2563EB] font-semibold text-white"
                  : "font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {typeof item.badge === "number" && item.badge > 0 && (
                  <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-3 border-t border-slate-700 p-4">
        <div className="rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2.5">
          <p className="truncate text-sm font-semibold text-white">
            {user.name}
          </p>
          <p className="truncate font-mono text-xs text-slate-400">
            @{user.username} · {user.role}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Portal Publik
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs font-medium text-red-200 transition hover:bg-red-900/60 disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            {loggingOut ? "Keluar..." : "Keluar"}
          </button>
        </div>
      </div>
    </aside>
  );
}
