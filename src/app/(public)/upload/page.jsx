import { redirect } from "next/navigation";
import UploadForm from "@/components/UploadForm";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getCachedActiveEvents, getCachedCategories } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export default async function UploadPage({ searchParams }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/upload");
  }

  const resolvedParams = await searchParams;
  const draftId =
    typeof resolvedParams?.draft === "string"
      ? resolvedParams.draft.trim()
      : "";
  const presetEventSlug =
    typeof resolvedParams?.event === "string"
      ? resolvedParams.event.trim().toLowerCase()
      : "";

  const [categories, activeEvents, foundDraft] = await Promise.all([
    getCachedCategories(),
    getCachedActiveEvents(),
    draftId
      ? prisma.post.findUnique({
          where: { id: draftId },
          select: {
            id: true,
            title: true,
            caption: true,
            imageUrl: true,
            imageFormat: true,
            tags: true,
            category: true,
            subcategory: true,
            eventId: true,
            status: true,
            externalLink: true,
            mentions: true,
            hideLikeCount: true,
            publishedAt: true,
            authorId: true,
          },
        })
      : Promise.resolve(null),
  ]);

  let initialDraft = null;
  if (
    foundDraft &&
    (foundDraft.authorId === user.id || user.role === "ADMIN")
  ) {
    initialDraft = {
      ...foundDraft,
      publishedAt: foundDraft.publishedAt.toISOString(),
    };
  }

  const matchedEvent = presetEventSlug
    ? activeEvents.find((ev) => ev.slug === presetEventSlug)
    : null;

  return (
    <UploadForm
      user={user}
      categories={categories}
      activeEvents={activeEvents}
      initialDraft={initialDraft}
      initialEventId={initialDraft?.eventId || matchedEvent?.id || ""}
    />
  );
}
