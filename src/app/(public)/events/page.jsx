import Link from "next/link";
import { Calendar, FileText, PlusSquare } from "lucide-react";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatFullDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const [user, events] = await Promise.all([
    getCurrentUser(),
    prisma.communityEvent.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      include: {
        _count: { select: { posts: true } },
        posts: {
          where: { status: "PUBLISHED" },
          orderBy: { publishedAt: "desc" },
          take: 4,
          select: {
            id: true,
            title: true,
            imageUrl: true,
            imageFormat: true,
            caption: true,
            author: { select: { username: true } },
          },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Calendar className="h-5 w-5 text-[#2563EB]" />
            Event Komunitas BedahKarya
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Ikuti tema kurasi dan tantangan komunitas yang diadakan tim kurator.
          </p>
        </div>

        {user && !user.isSuspended && (
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <PlusSquare className="h-4 w-4" />
            Unggah Konten Event
          </Link>
        )}
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-[#CBD5E1] bg-white px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-[#1E293B]">
          Belum ada event komunitas saat ini.
        </div>
      ) : (
        <div className="space-y-5">
          {events.map((ev) => (
            <section
              key={ev.id}
              className="rounded-xl border border-[#CBD5E1] bg-white p-5 dark:border-slate-700 dark:bg-[#1E293B]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-2xl space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold">{ev.title}</h2>
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold ${
                        ev.isActive
                          ? "bg-[#2563EB] text-white"
                          : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {ev.isActive ? "SEDANG BERLANGSUNG" : "SELESAI"}
                    </span>
                    {ev.themeTag && (
                      <span className="rounded bg-[#2563EB]/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#2563EB] dark:text-blue-300">
                        #{ev.themeTag}
                      </span>
                    )}
                  </div>

                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {ev.description}
                  </p>

                  <p className="text-[11px] text-slate-400">
                    {ev._count.posts} karya berpartisipasi
                    {ev.endDate
                      ? ` · Berakhir ${formatFullDateTime(ev.endDate)}`
                      : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/search?event=${encodeURIComponent(ev.slug)}`}
                    className="rounded-lg border border-[#CBD5E1] px-3.5 py-2 text-xs font-semibold hover:border-[#2563EB] dark:border-slate-600"
                  >
                    Lihat Semua Karya
                  </Link>
                  {ev.isActive && (!user || !user.isSuspended) && (
                    <Link
                      href={`/upload?event=${encodeURIComponent(ev.id)}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      <PlusSquare className="h-3.5 w-3.5" />
                      Ikuti Event
                    </Link>
                  )}
                </div>
              </div>

              {ev.posts.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4 dark:border-slate-700">
                  {ev.posts.map((item) => (
                    <Link
                      key={item.id}
                      href={`/post/${item.id}`}
                      className="group overflow-hidden rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] transition hover:border-[#2563EB] dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="aspect-square overflow-hidden bg-[#1E293B]">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            draggable={false}
                            className={`bk-protected-media h-full w-full transition group-hover:scale-[1.03] ${
                              item.imageFormat === "LANDSCAPE"
                                ? "object-contain"
                                : "object-cover"
                            }`}
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col justify-between bg-[#CBD5E1] p-2.5 text-[#1E293B] dark:bg-slate-700 dark:text-white">
                            <FileText className="h-4 w-4 text-[#2563EB]" />
                            <p className="line-clamp-3 text-[11px]">
                              {item.caption}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="truncate text-xs font-semibold">
                          {item.title}
                        </p>
                        <p className="truncate font-mono text-[10px] text-slate-500">
                          @{item.author.username}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
