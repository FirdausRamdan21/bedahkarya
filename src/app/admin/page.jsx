import Link from "next/link";
import { Flag, Layers, Scale, ShieldAlert, Users } from "lucide-react";
import AdminAnnouncementBox from "@/components/admin/AdminAnnouncementBox";
import { getAdminOverviewData } from "@/lib/adminData";
import { getCurrentUser } from "@/lib/auth";
import { getCategoryMeta } from "@/lib/categories";
import { formatRelativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [staff, { metrics, recentUsers, recentPosts, recentModerationLogs }] =
    await Promise.all([getCurrentUser(), getAdminOverviewData()]);

  const metricCards = [
    {
      label: "Total Pengguna",
      value: metrics.totalUsers,
      sub: `${metrics.suspendedUsers} ditangguhkan · +${metrics.todayUsers} hari ini`,
      href: "/admin/users",
      icon: Users,
    },
    {
      label: "Total Konten",
      value: metrics.totalPosts,
      sub: `+${metrics.todayPosts} konten diunggah hari ini`,
      href: "/admin/contents",
      icon: Layers,
    },
    {
      label: "Laporan Menunggu",
      value: metrics.pendingReports,
      sub: `${metrics.resolvedReports} selesai · ${metrics.dismissedReports} diabaikan`,
      href: "/admin/reports",
      icon: Flag,
    },
    {
      label: "Uji Banding Menunggu",
      value: metrics.pendingAppeals,
      sub: `${metrics.blockedComments} komentar terblokir otomatis`,
      href: "/admin/appeals",
      icon: Scale,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Dashboard Statistik BedahKarya
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Ringkasan pengawasan komunitas untuk{" "}
          <span className="font-mono font-semibold">{staff?.role}</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-xl border border-[#CBD5E1] bg-white p-5 transition hover:border-[#2563EB] dark:border-slate-700 dark:bg-[#1E293B]"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {card.label}
                </p>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2563EB]/10 text-[#2563EB]">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-bold">{card.value}</p>
              <p className="mt-1 text-xs text-slate-500">{card.sub}</p>
            </Link>
          );
        })}
      </div>

      {staff?.role === "ADMIN" && <AdminAnnouncementBox />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-[#CBD5E1] bg-white p-5 dark:border-slate-700 dark:bg-[#1E293B]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
            <h2 className="text-sm font-bold">Konten Terbaru</h2>
            <Link
              href="/admin/contents"
              className="text-xs font-semibold text-[#2563EB] hover:underline"
            >
              Lihat semua &rarr;
            </Link>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {recentPosts.map((post) => {
              const catMeta = getCategoryMeta(post.category);
              return (
                <li
                  key={post.id}
                  className="flex items-center justify-between gap-3 py-3 text-xs"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/post/${post.id}`}
                      className="block truncate font-semibold hover:underline"
                    >
                      {post.title}
                    </Link>
                    <p className="text-slate-500">
                      @{post.author.username} · {formatRelativeTime(post.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-semibold ${catMeta.badgeClass}`}
                  >
                    {catMeta.shortLabel}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-xl border border-[#CBD5E1] bg-white p-5 dark:border-slate-700 dark:bg-[#1E293B]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
            <h2 className="text-sm font-bold">Pengguna Terbaru</h2>
            <Link
              href="/admin/users"
              className="text-xs font-semibold text-[#2563EB] hover:underline"
            >
              Kelola &rarr;
            </Link>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {recentUsers.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between gap-3 py-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{u.name}</p>
                  <p className="font-mono text-slate-500">
                    @{u.username} · {u.role}
                  </p>
                </div>
                <span
                  className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold ${u.isSuspended
                    ? "bg-red-100 text-red-700"
                    : "bg-[#2563EB]/10 text-[#2563EB] dark:text-blue-300"
                    }`}
                >
                  {u.isSuspended ? "Ditangguhkan" : "Aktif"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section
        id="moderation-logs"
        className="rounded-xl border border-[#CBD5E1] bg-white p-5 dark:border-slate-700 dark:bg-[#1E293B]"
      >
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-700">
          <ShieldAlert className="h-4 w-4 text-red-600" />
          <h2 className="text-sm font-bold">Log Moderasi Otomatis Terbaru</h2>
        </div>

        {recentModerationLogs.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">
            Belum ada komentar terblokir.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {recentModerationLogs.map((log) => (
              <li key={log.id} className="py-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono font-semibold">
                    @{log.user?.username || "anonim"}
                  </span>
                  <span className="rounded bg-red-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-red-700">
                    Kata: {log.matchedWords}
                  </span>
                </div>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  {log.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
