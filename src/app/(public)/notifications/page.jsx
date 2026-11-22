import { redirect } from "next/navigation";
import NotificationsView from "@/components/NotificationsView";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({ searchParams }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/notifications");
  }

  const resolvedParams = await searchParams;
  const initialCategory =
    typeof resolvedParams?.category === "string"
      ? resolvedParams.category.trim().toUpperCase()
      : "";

  const [notifications, appeals] = await Promise.all([
    prisma.notification.findMany({
      where: {
        OR: [{ userId: user.id }, { userId: null }],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.appeal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });

  const serializedNotifs = notifications.map((n) => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
  }));

  const serializedAppeals = appeals.map((a) => {
    let evidenceList = [];
    try {
      const parsed = JSON.parse(a.evidenceUrls || "[]");
      if (Array.isArray(parsed)) evidenceList = parsed;
    } catch {
      evidenceList = [];
    }
    return {
      ...a,
      evidenceList,
      createdAt: a.createdAt.toISOString(),
      reviewedAt: a.reviewedAt ? a.reviewedAt.toISOString() : null,
    };
  });

  return (
    <NotificationsView
      user={user}
      initialNotifications={serializedNotifs}
      initialAppeals={serializedAppeals}
      initialCategory={initialCategory}
    />
  );
}
