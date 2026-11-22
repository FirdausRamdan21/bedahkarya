import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { isStaffRole } from "@/lib/session";
import { checkCommentModeration } from "@/services/moderationService";

const COMMENT_USER_SELECT = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
  role: true,
  userBadges: {
    select: {
      badge: {
        select: { id: true, slug: true, name: true, icon: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 2,
  },
};

async function attachHelpfulCounts(comments) {
  const userIds = Array.from(new Set(comments.map((c) => c.userId)));
  if (userIds.length === 0) return comments;

  const grouped = await prisma.comment.groupBy({
    by: ["userId"],
    where: {
      userId: { in: userIds },
      isHelpful: true,
    },
    _count: { id: true },
  });

  const countMap = new Map(grouped.map((g) => [g.userId, g._count.id]));

  return comments.map((comment) => {
    const { userBadges, ...restUser } = comment.user || {};
    return {
      ...comment,
      createdAt:
        comment.createdAt instanceof Date
          ? comment.createdAt.toISOString()
          : comment.createdAt,
      user: {
        ...restUser,
        badges: Array.isArray(userBadges)
          ? userBadges.map((ub) => ub.badge).filter(Boolean)
          : [],
        helpfulCount: countMap.get(comment.userId) || 0,
      },
    };
  });
}

export async function GET(request) {
  try {
    const postId = request.nextUrl.searchParams.get("postId")?.trim() || "";
    if (!postId) {
      return NextResponse.json(
        { error: "Parameter postId wajib disertakan." },
        { status: 400 }
      );
    }

    const comments = await prisma.comment.findMany({
      where: { postId },
      include: {
        user: {
          select: COMMENT_USER_SELECT,
        },
      },
      orderBy: [{ isHelpful: "desc" }, { createdAt: "asc" }],
    });

    const enriched = await attachHelpfulCounts(comments);

    return NextResponse.json(
      {
        comments: enriched,
        total: enriched.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Gagal mengambil komentar:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memuat komentar." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { user, errorResponse } = await requireActiveUser();
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Format permintaan tidak valid." },
        { status: 400 }
      );
    }

    const postId = typeof body.postId === "string" ? body.postId.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!postId) {
      return NextResponse.json(
        { error: "ID konten wajib disertakan." },
        { status: 400 }
      );
    }

    if (content.length < 1 || content.length > 1000) {
      return NextResponse.json(
        { error: "Komentar harus berisi 1 hingga 1000 karakter." },
        { status: 400 }
      );
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, title: true, authorId: true },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Konten tidak ditemukan." },
        { status: 404 }
      );
    }

    const moderation = checkCommentModeration(content);
    if (moderation.isFlagged) {
      await prisma.moderationLog.create({
        data: {
          content,
          matchedWords: moderation.matchedWords.join(", "),
          postId,
          userId: user.id,
        },
      });

      await createNotification({
        userId: user.id,
        category: "WARNING",
        title: "Komentar Diblokir Otomatis",
        message: `Komentar Anda pada "${post.title}" diblokir otomatis karena mengandung kata terlarang. Jika merasa keliru, Anda dapat mengajukan uji banding.`,
        linkUrl: "/notifications?category=WARNING",
      });

      return NextResponse.json(
        {
          blocked: true,
          error:
            "Komentar ditolak otomatis oleh sistem moderasi karena mengandung kata terlarang. Harap gunakan bahasa yang santun dan konstruktif.",
          matchedWords: moderation.matchedWords,
        },
        { status: 422 }
      );
    }

    const createdComment = await prisma.comment.create({
      data: {
        postId,
        userId: user.id,
        content,
      },
      include: {
        user: {
          select: COMMENT_USER_SELECT,
        },
      },
    });

    if (post.authorId !== user.id) {
      await createNotification({
        userId: post.authorId,
        category: "INTERACTION",
        title: `Ulasan baru dari @${user.username}`,
        message: `@${user.username} mengomentari "${post.title}": "${content.slice(0, 100)}"`,
        linkUrl: `/post/${post.id}`,
      });
    }

    const [commentsCount, enriched] = await Promise.all([
      prisma.comment.count({ where: { postId } }),
      attachHelpfulCounts([createdComment]),
    ]);

    return NextResponse.json(
      {
        comment: enriched[0],
        commentsCount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Gagal memproses komentar:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengirim komentar." },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const { user, errorResponse } = await requireActiveUser();
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => null);
    const commentId =
      typeof body?.commentId === "string" ? body.commentId.trim() : "";

    if (!commentId) {
      return NextResponse.json(
        { error: "ID komentar wajib disertakan." },
        { status: 400 }
      );
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          select: { id: true, title: true, authorId: true },
        },
      },
    });

    if (!comment) {
      return NextResponse.json(
        { error: "Komentar tidak ditemukan." },
        { status: 404 }
      );
    }

    if (comment.post.authorId !== user.id) {
      return NextResponse.json(
        {
          error:
            "Hanya pemilik konten yang dapat menandai Ulasan Paling Membantu.",
        },
        { status: 403 }
      );
    }

    const nextHelpful = !comment.isHelpful;

    await prisma.$transaction([
      prisma.comment.updateMany({
        where: { postId: comment.postId, isHelpful: true },
        data: { isHelpful: false },
      }),
      prisma.comment.update({
        where: { id: commentId },
        data: { isHelpful: nextHelpful },
      }),
    ]);

    if (nextHelpful && comment.userId !== user.id) {
      await createNotification({
        userId: comment.userId,
        category: "INTERACTION",
        title: "Ulasan Anda Ditandai Paling Membantu",
        message: `@${user.username} memilih ulasan Anda pada "${comment.post.title}" sebagai Ulasan Paling Membantu. Anda memperoleh lencana Pengulas Konstruktif!`,
        linkUrl: `/post/${comment.postId}`,
      });
    }

    return NextResponse.json(
      {
        commentId,
        postId: comment.postId,
        isHelpful: nextHelpful,
        message: nextHelpful
          ? "Ditandai sebagai Ulasan Paling Membantu."
          : "Tanda Ulasan Paling Membantu dibatalkan.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Gagal menandai ulasan membantu:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memperbarui tanda ulasan." },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { user, errorResponse } = await requireActiveUser();
    if (errorResponse) return errorResponse;

    let id = request.nextUrl.searchParams.get("id")?.trim() || "";
    if (!id) {
      const body = await request.json().catch(() => null);
      if (body && typeof body.id === "string") {
        id = body.id.trim();
      }
    }

    if (!id) {
      return NextResponse.json(
        { error: "ID komentar wajib disertakan." },
        { status: 400 }
      );
    }

    const comment = await prisma.comment.findUnique({
      where: { id },
      select: { id: true, userId: true, postId: true },
    });

    if (!comment) {
      return NextResponse.json(
        { error: "Komentar tidak ditemukan." },
        { status: 404 }
      );
    }

    if (comment.userId !== user.id && !isStaffRole(user.role)) {
      return NextResponse.json(
        { error: "Anda tidak memiliki izin untuk menghapus komentar ini." },
        { status: 403 }
      );
    }

    await prisma.comment.delete({
      where: { id },
    });

    const commentsCount = await prisma.comment.count({
      where: { postId: comment.postId },
    });

    return NextResponse.json(
      {
        deletedId: id,
        postId: comment.postId,
        commentsCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Gagal menghapus komentar:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menghapus komentar." },
      { status: 500 }
    );
  }
}
