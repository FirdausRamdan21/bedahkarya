import AdminContentsManager from "@/components/admin/AdminContentsManager";
import { getAdminContentsData } from "@/lib/adminData";
import { getCurrentUser } from "@/lib/auth";
import { getCachedCategories } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export default async function AdminContentsPage() {
  const [staff, categories, { posts, availableTags }] = await Promise.all([
    getCurrentUser(),
    getCachedCategories(),
    getAdminContentsData(),
  ]);

  return (
    <AdminContentsManager
      initialPosts={posts}
      initialTags={availableTags}
      categories={categories}
      currentStaffRole={staff?.role || "MODERATOR"}
    />
  );
}
