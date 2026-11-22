import ExploreGrid from "@/components/ExploreGrid";
import { getCurrentUser } from "@/lib/auth";
import { isValidCategory } from "@/lib/categories";
import { queryPosts } from "@/lib/posts";
import { getCachedCategories } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }) {
  const resolvedParams = await searchParams;
  const rawQ =
    typeof resolvedParams?.q === "string" ? resolvedParams.q.trim() : "";
  const rawTag =
    typeof resolvedParams?.tag === "string"
      ? resolvedParams.tag.trim().toLowerCase().replace(/^#/, "")
      : "";
  const q = rawQ || (rawTag ? `#${rawTag}` : "");

  const rawCategory =
    typeof resolvedParams?.category === "string"
      ? resolvedParams.category.trim().toUpperCase()
      : "";
  const category = isValidCategory(rawCategory) ? rawCategory : "";
  const subcategory =
    typeof resolvedParams?.subcategory === "string"
      ? resolvedParams.subcategory.trim().toLowerCase()
      : "";
  const event =
    typeof resolvedParams?.event === "string"
      ? resolvedParams.event.trim().toLowerCase()
      : "";

  const [user, categories] = await Promise.all([
    getCurrentUser(),
    getCachedCategories(),
  ]);

  const initialData = await queryPosts({
    mode: "explore",
    q,
    category,
    subcategory,
    event,
    page: 1,
    limit: 12,
    currentUser: user,
  });

  return (
    <ExploreGrid
      initialData={initialData}
      initialQuery={q}
      initialCategory={category}
      initialSubcategory={subcategory}
      initialEvent={event}
      categories={categories}
      currentUser={user}
    />
  );
}
