import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import ContentGuard from "@/components/ContentGuard";
import Navbar from "@/components/Navbar";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }) {
  const user = await getCurrentUser();

  let unreadNotifications = 0;
  let unreadMessages = 0;

  if (user) {
    const [notifCount, dmCount] = await Promise.all([
      prisma.notification.count({
        where: { userId: user.id, isRead: false },
      }),
      prisma.directMessage.count({
        where: { receiverId: user.id, isRead: false },
      }),
    ]);
    unreadNotifications = notifCount;
    unreadMessages = dmCount;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#1E293B] dark:bg-[#0F172A] dark:text-[#F8FAFC]">
      <ContentGuard />
      <Navbar
        user={user}
        unreadNotifications={unreadNotifications}
        unreadMessages={unreadMessages}
      />

      {user?.isSuspended && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Akun Anda sedang ditangguhkan (Mode Baca Saja). Anda tetap dapat
              membaca konten dan mengajukan Uji Banding.
            </span>
            <Link
              href="/notifications?category=WARNING"
              className="rounded-md bg-red-600 px-3 py-1 font-semibold text-white hover:bg-red-700"
            >
              Lihat Peringatan &amp; Uji Banding
            </Link>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-20 sm:px-6 md:pb-12">
        {children}
      </main>
    </div>
  );
}
