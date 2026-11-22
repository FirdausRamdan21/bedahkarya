import AdminSpecialManager from "@/components/admin/AdminSpecialManager";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSpecialPage() {
  const [badges, categories, events, users] = await Promise.all([
    prisma.badge.findMany({
      include: { _count: { select: { assignments: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.category.findMany({
      include: { subcategories: { orderBy: { name: "asc" } } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.communityEvent.findMany({
      include: { _count: { select: { posts: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        userBadges: {
          select: {
            badge: { select: { id: true, slug: true, name: true, icon: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
  ]);

  return (
    <AdminSpecialManager
      initialBadges={badges.map((b) => ({
        ...b,
        assignedCount: b._count?.assignments ?? 0,
        createdAt: b.createdAt.toISOString(),
      }))}
      initialCategories={categories.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        subcategories: c.subcategories.map((s) => ({
          ...s,
          createdAt: s.createdAt.toISOString(),
        })),
      }))}
      initialEvents={events.map((ev) => ({
        ...ev,
        postsCount: ev._count?.posts ?? 0,
        startDate: ev.startDate.toISOString(),
        endDate: ev.endDate ? ev.endDate.toISOString() : null,
        createdAt: ev.createdAt.toISOString(),
      }))}
      initialUsers={users.map((u) => ({
        ...u,
        badges: (u.userBadges || []).map((ub) => ub.badge),
      }))}
    />
  );
}
