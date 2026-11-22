import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { deleteLocalUpload, saveLocalImage } from "@/lib/uploads";

export async function POST(request) {
  let savedEvidenceUrl = null;

  try {
    const { user, errorResponse } = await requireActiveUser();
    if (errorResponse) return errorResponse;

    const contentType = request.headers.get("content-type") || "";
    let type = "";
    let postId = "";
    let targetUserId = "";
    let reason = "";
    let evidenceFile = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData().catch(() => null);
      if (!formData) {
        return NextResponse.json(
          { error: "Format permintaan tidak valid." },
          { status: 400 }
        );
      }

      const rawType = formData.get("type");
      const rawPostId = formData.get("postId");
      const rawTargetUserId = formData.get("targetUserId");
      const rawReason = formData.get("reason");

      type = typeof rawType === "string" ? rawType.trim().toUpperCase() : "";
      postId = typeof rawPostId === "string" ? rawPostId.trim() : "";
      targetUserId =
        typeof rawTargetUserId === "string" ? rawTargetUserId.trim() : "";
      reason = typeof rawReason === "string" ? rawReason.trim() : "";
      evidenceFile = formData.get("evidence");
    } else {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return NextResponse.json(
          { error: "Format permintaan tidak valid." },
          { status: 400 }
        );
      }

      type =
        typeof body.type === "string" ? body.type.trim().toUpperCase() : "";
      postId = typeof body.postId === "string" ? body.postId.trim() : "";
      targetUserId =
        typeof body.targetUserId === "string" ? body.targetUserId.trim() : "";
      reason = typeof body.reason === "string" ? body.reason.trim() : "";
    }

    if (type === "LIKE") {
      if (!postId) {
        return NextResponse.json(
          { error: "ID konten wajib disertakan." },
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

      const existing = await prisma.like.findUnique({
        where: { postId_userId: { postId, userId: user.id } },
        select: { id: true },
      });

      let liked;
      if (existing) {
        await prisma.like.delete({
          where: { postId_userId: { postId, userId: user.id } },
        });
        liked = false;
      } else {
        await prisma.like.create({
          data: { postId, userId: user.id },
        });
        liked = true;
        if (post.authorId !== user.id) {
          await createNotification({
            userId: post.authorId,
            category: "INTERACTION",
            title: `@${user.username} menyukai konten Anda`,
            message: `@${user.username} menyukai "${post.title}".`,
            linkUrl: `/post/${post.id}`,
          });
        }
      }

      const likesCount = await prisma.like.count({ where: { postId } });

      return NextResponse.json(
        { type: "LIKE", postId, liked, likesCount },
        { status: 200 }
      );
    }

    if (type === "BOOKMARK") {
      if (!postId) {
        return NextResponse.json(
          { error: "ID konten wajib disertakan." },
          { status: 400 }
        );
      }

      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { id: true, status: true },
      });
      if (!post || post.status !== "PUBLISHED") {
        return NextResponse.json(
          { error: "Konten tidak ditemukan." },
          { status: 404 }
        );
      }

      const existing = await prisma.bookmark.findUnique({
        where: { postId_userId: { postId, userId: user.id } },
        select: { id: true },
      });

      let bookmarked;
      if (existing) {
        await prisma.bookmark.delete({
          where: { postId_userId: { postId, userId: user.id } },
        });
        bookmarked = false;
      } else {
        await prisma.bookmark.create({
          data: { postId, userId: user.id },
        });
        bookmarked = true;
      }

      const bookmarksCount = await prisma.bookmark.count({
        where: { postId },
      });

      return NextResponse.json(
        {
          type: "BOOKMARK",
          postId,
          bookmarked,
          bookmarksCount,
          message: bookmarked
            ? "Konten disimpan ke daftar simpanan profil."
            : "Konten dihapus dari daftar simpanan.",
        },
        { status: 200 }
      );
    }

    if (type === "FOLLOW") {
      if (!targetUserId) {
        return NextResponse.json(
          { error: "ID pengguna tujuan wajib disertakan." },
          { status: 400 }
        );
      }

      if (targetUserId === user.id) {
        return NextResponse.json(
          { error: "Anda tidak dapat mengikuti akun sendiri." },
          { status: 400 }
        );
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true },
      });
      if (!targetUser) {
        return NextResponse.json(
          { error: "Pengguna tidak ditemukan." },
          { status: 404 }
        );
      }

      const existing = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: user.id,
            followingId: targetUserId,
          },
        },
        select: { id: true },
      });

      let following;
      if (existing) {
        await prisma.follow.delete({
          where: {
            followerId_followingId: {
              followerId: user.id,
              followingId: targetUserId,
            },
          },
        });
        following = false;
      } else {
        await prisma.follow.create({
          data: { followerId: user.id, followingId: targetUserId },
        });
        following = true;
        await createNotification({
          userId: targetUserId,
          category: "INTERACTION",
          title: `@${user.username} mulai mengikuti Anda`,
          message: `@${user.username} sekarang mengikuti profil Anda dan dapat berinteraksi lewat pesan langsung.`,
          linkUrl: `/profile/${user.username}`,
        });
      }

      const [followersCount, followingCount] = await Promise.all([
        prisma.follow.count({ where: { followingId: targetUserId } }),
        prisma.follow.count({ where: { followerId: user.id } }),
      ]);

      return NextResponse.json(
        {
          type: "FOLLOW",
          targetUserId,
          following,
          followersCount,
          followingCount,
        },
        { status: 200 }
      );
    }

    if (type === "REPORT") {
      if (!postId) {
        return NextResponse.json(
          { error: "ID konten wajib disertakan." },
          { status: 400 }
        );
      }

      if (reason.length < 8 || reason.length > 500) {
        return NextResponse.json(
          { error: "Alasan laporan harus 8 hingga 500 karakter." },
          { status: 400 }
        );
      }

      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { id: true },
      });
      if (!post) {
        return NextResponse.json(
          { error: "Konten tidak ditemukan." },
          { status: 404 }
        );
      }

      const existingPending = await prisma.report.findFirst({
        where: {
          postId,
          reporterId: user.id,
          status: "PENDING",
        },
        select: { id: true },
      });

      if (existingPending) {
        return NextResponse.json(
          {
            error:
              "Anda sudah melaporkan konten ini dan laporan sedang dalam peninjauan.",
          },
          { status: 409 }
        );
      }

      const hasEvidence =
        evidenceFile &&
        typeof evidenceFile === "object" &&
        typeof evidenceFile.arrayBuffer === "function" &&
        evidenceFile.size > 0;

      if (hasEvidence) {
        const saved = await saveLocalImage(evidenceFile, {
          prefix: "report",
          maxBytes: 3 * 1024 * 1024,
        });
        if (!saved.ok) {
          return NextResponse.json({ error: saved.error }, { status: 400 });
        }
        savedEvidenceUrl = saved.url;
      }

      const report = await prisma.report.create({
        data: {
          postId,
          reporterId: user.id,
          reason,
          evidenceUrl: savedEvidenceUrl,
          status: "PENDING",
        },
      });

      return NextResponse.json(
        {
          type: "REPORT",
          message: savedEvidenceUrl
            ? "Laporan beserta tangkapan layar bukti telah diterima tim pengawas."
            : "Laporan telah dikirim ke tim moderasi.",
          report,
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Tipe interaksi tidak valid. Gunakan LIKE, BOOKMARK, FOLLOW, atau REPORT.",
      },
      { status: 400 }
    );
  } catch (error) {
    if (savedEvidenceUrl) {
      await deleteLocalUpload(savedEvidenceUrl);
    }
    console.error("Gagal memproses interaksi:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memproses interaksi." },
      { status: 500 }
    );
  }
}
