import HomeFeed from "@/components/HomeFeed";
import { getCurrentUser } from "@/lib/auth";
import { isValidCategory } from "@/lib/categories";
import { queryPosts } from "@/lib/posts";
import { getCachedActiveEvents, getCachedCategories } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const isForbidden = resolvedSearchParams?.error === "forbidden";
  const rawCategory =
    typeof resolvedSearchParams?.category === "string"
      ? resolvedSearchParams.category.trim().toUpperCase()
      : "";
  const initialCategory = isValidCategory(rawCategory) ? rawCategory : "";
  const initialSubcategory =
    typeof resolvedSearchParams?.subcategory === "string"
      ? resolvedSearchParams.subcategory.trim().toLowerCase()
      : "";

  const [user, categories, activeEvents] = await Promise.all([
    getCurrentUser(),
    getCachedCategories(),
    getCachedActiveEvents(),
  ]);

  const initialData = await queryPosts({
    mode: "feed",
    category: initialCategory,
    subcategory: initialSubcategory,
    page: 1,
    limit: 4,
    currentUser: user,
  });

  return (
    <HomeFeed
      initialData={initialData}
      initialCategory={initialCategory}
      initialSubcategory={initialSubcategory}
      categories={categories}
      activeEvents={activeEvents}
      currentUser={user}
      isForbidden={isForbidden}
    />
  );
}
