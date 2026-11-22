import AdminUsersManager from "@/components/admin/AdminUsersManager";
import { getAdminUsersData } from "@/lib/adminData";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [staff, { users }] = await Promise.all([
    getCurrentUser(),
    getAdminUsersData(),
  ]);

  return (
    <AdminUsersManager
      initialUsers={users}
      currentAdminId={staff?.id || ""}
      currentStaffRole={staff?.role || "MODERATOR"}
    />
  );
}
