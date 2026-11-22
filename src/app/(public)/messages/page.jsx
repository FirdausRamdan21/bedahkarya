import { redirect } from "next/navigation";
import MessagesView from "@/components/MessagesView";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MessagesPage({ searchParams }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/messages");
  }

  const resolvedParams = await searchParams;
  const initialPartnerId =
    typeof resolvedParams?.to === "string" ? resolvedParams.to.trim() : "";
  const sharePostId =
    typeof resolvedParams?.sharePost === "string"
      ? resolvedParams.sharePost.trim()
      : "";

  let initialSharedPost = null;
  if (sharePostId) {
    const found = await prisma.post.findUnique({
      where: { id: sharePostId },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        imageFormat: true,
        category: true,
        author: { select: { username: true, name: true } },
      },
    });
    if (found) initialSharedPost = found;
  }

  return (
    <MessagesView
      currentUser={user}
      initialPartnerId={initialPartnerId}
      initialSharedPost={initialSharedPost}
    />
  );
}
