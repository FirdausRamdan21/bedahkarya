import { revalidateTag, unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import { CATEGORY_MAP, CONTENT_CATEGORIES } from "@/lib/categories";

export const getCachedCategories = unstable_cache(
  async () => {
    const rows = await prisma.category.findMany({
      include: {
        subcategories: {
          orderBy: { name: "asc" },
          select: { id: true, slug: true, name: true, categoryId: true },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    if (rows.length === 0) {
      return CONTENT_CATEGORIES;
    }

    return rows.map((cat) => ({
      id: cat.id,
      key: cat.key,
      label: cat.label,
      shortLabel: cat.shortLabel,
      description: cat.description,
      badgeClass:
        CATEGORY_MAP[cat.key]?.badgeClass ||
        "border-[#2563EB]/25 bg-[#2563EB]/10 text-[#2563EB] dark:border-[#3B82F6]/35 dark:bg-[#2563EB]/20 dark:text-[#93C5FD]",
      subcategories: cat.subcategories,
    }));
  },
  ["bedahkarya-categories-v1"],
  { tags: ["taxonomy"], revalidate: 60 }
);

export const getCachedActiveEvents = unstable_cache(
  async () => {
    const events = await prisma.communityEvent.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { posts: true } },
      },
    });

    return events.map((ev) => ({
      id: ev.id,
      slug: ev.slug,
      title: ev.title,
      description: ev.description,
      themeTag: ev.themeTag,
      isActive: ev.isActive,
      startDate: ev.startDate.toISOString(),
      endDate: ev.endDate ? ev.endDate.toISOString() : null,
      postsCount: ev._count?.posts ?? 0,
    }));
  },
  ["bedahkarya-active-events-v1"],
  { tags: ["taxonomy"], revalidate: 60 }
);

export const getCachedAllBadges = unstable_cache(
  async () => {
    const badges = await prisma.badge.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        icon: true,
      },
    });
    return badges;
  },
  ["bedahkarya-badges-v1"],
  { tags: ["taxonomy"], revalidate: 60 }
);

export function revalidateTaxonomy() {
  revalidateTag("taxonomy");
}
