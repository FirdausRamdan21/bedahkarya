import AdminAppealsManager from "@/components/admin/AdminAppealsManager";
import { getAdminAppealsData } from "@/lib/adminData";

export const dynamic = "force-dynamic";

export default async function AdminAppealsPage() {
  const { appeals } = await getAdminAppealsData();
  return <AdminAppealsManager initialAppeals={appeals} />;
}
