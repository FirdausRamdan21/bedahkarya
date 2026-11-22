import { redirect } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  if (!isStaffRole(user.role) || user.isSuspended) {
    redirect("/?error=forbidden");
  }

  const [pendingReportsCount, pendingAppealsCount] = await Promise.all([
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.appeal.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#1E293B] lg:flex-row dark:bg-[#0F172A] dark:text-[#F8FAFC]">
      <AdminSidebar
        user={user}
        pendingReportsCount={pendingReportsCount}
        pendingAppealsCount={pendingAppealsCount}
      />
      <main className="flex-1 p-5 sm:p-8">{children}</main>
    </div>
  );
}
