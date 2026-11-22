import AdminReportsManager from "@/components/admin/AdminReportsManager";
import { getAdminReportsData } from "@/lib/adminData";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const { reports, counts } = await getAdminReportsData();

  return (
    <AdminReportsManager initialReports={reports} initialCounts={counts} />
  );
}
