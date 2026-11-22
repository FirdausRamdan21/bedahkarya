import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, requireActiveUser } from "@/lib/auth";
import {
  containsLink,
  isValidCategory,
  normalizeMentionsInput,
  validateCaptionLength,
  validateExternalUrl,
} from "@/lib/categories";
import { createNotification } from "@/lib/notifications";
import { POST_INCLUDE, serializePost } from "@/lib/posts";
import { isStaffRole } from "@/lib/session";
import { deleteLocalUpload, saveLocalImage } from "@/lib/uploads";
import { normalizeTagsInput } from "@/services/feedAlgorithm";

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const postId = decodeURIComponent(id || "").trim();

    if (!postId) {
      return NextResponse.json(
        { error: "ID konten wajib disertakan." },
        { status: 400 }
      );
    }

    const [currentUser, post] = await Promise.all([
      getCurrentUser(),
      prisma.post.findUnique({
        where: { id: postId },
        include: POST_INCLUDE,
      }),
    ]);

    if (!post) {
      return NextResponse.json(
        { error: "Konten tidak ditemukan." },
        { status: 404 }
      );
    }

    if (
      post.status === "DRAFT" &&
      (!currentUser ||
        (currentUser.id !== post.authorId && !isStaffRole(currentUser.role)))
    ) {
      return NextResponse.json(
        { error: "Konten tidak ditemukan." },
        { status: 404 }
      );
    }

    const likedSet = new Set();
    const bookmarkedSet = new Set();
    const followingSet = new Set();

    if (currentUser) {
      const [likeRow, bookmarkRow, followRow] = await Promise.all([
        prisma.like.findUnique({
          where: {
            postId_userId: { postId: post.id, userId: currentUser.id },
          },
          select: { id: true },
        }),
        prisma.bookmark.findUnique({
          where: {
            postId_userId: { postId: post.id, userId: currentUser.id },
          },
          select: { id: true },
        }),
        currentUser.id !== post.authorId
          ? prisma.follow.findUnique({
              where: {
                followerId_followingId: {
                  followerId: currentUser.id,
                  followingId: post.authorId,
                },
              },
              select: { id: true },
            })
          : Promise.resolve(null),
      ]);

      if (likeRow) likedSet.add(post.id);
      if (bookmarkRow) bookmarkedSet.add(post.id);
      if (followRow) followingSet.add(post.authorId);
    }

    const serialized = serializePost(post, {
      likedSet,
      bookmarkedSet,
      followingSet,
    });

    return NextResponse.json(
      {
        post: serialized,
        isFollowingAuthor: serialized.isFollowingAuthor,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Gagal mengambil detail konten:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memuat detail konten." },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const auth = await requireActiveUser();
    if (auth.errorResponse) return auth.errorResponse;
    const { user } = auth;

    const { id } = await params;
    const postId = decodeURIComponent(id || "").trim();

    const existing = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        title: true,
        caption: true,
        tags: true,
        status: true,
        category: true,
        subcategory: true,
        eventId: true,
        imageUrl: true,
        imageFormat: true,
        publishedAt: true,
        externalLink: true,
        mentions: true,
        hideLikeCount: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Konten tidak ditemukan." },
        { status: 404 }
      );
    }

    if (existing.authorId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Anda tidak memiliki izin untuk mengubah konten ini." },
        { status: 403 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    let body = null;
    let imageFile = null;
    let removeImage = false;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData().catch(() => null);
      if (!formData) {
        return NextResponse.json(
          { error: "Format permintaan multipart tidak valid." },
          { status: 400 }
        );
      }
      body = {
        title: formData.has("title") ? formData.get("title") : undefined,
        caption: formData.has("caption") ? formData.get("caption") : undefined,
        category: formData.has("category") ? formData.get("category") : undefined,
        subcategory: formData.has("subcategory")
          ? formData.get("subcategory")
          : undefined,
        eventId: formData.has("eventId") ? formData.get("eventId") : undefined,
        status: formData.has("status") ? formData.get("status") : undefined,
        tags: formData.has("tags") ? formData.get("tags") : undefined,
        externalLink: formData.has("externalLink")
          ? formData.get("externalLink")
          : undefined,
        mentions: formData.has("mentions")
          ? formData.get("mentions")
          : undefined,
        hideLikeCount: formData.has("hideLikeCount")
          ? formData.get("hideLikeCount") === "true" ||
            formData.get("hideLikeCount") === "1"
          : undefined,
        publishedAt: formData.get("publishedAt"),
        imageFormat: formData.get("imageFormat"),
      };
      imageFile = formData.get("image");
      removeImage = formData.get("removeImage") === "true";
    } else {
      body = await request.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return NextResponse.json(
          { error: "Format permintaan tidak valid." },
          { status: 400 }
        );
      }
      removeImage = body.removeImage === true;
    }

    const title =
      body.title !== undefined
        ? typeof body.title === "string"
          ? body.title.trim()
          : ""
        : existing.title;
    const caption =
      body.caption !== undefined
        ? typeof body.caption === "string"
          ? body.caption.trim()
          : ""
        : existing.caption;
    const category =
      typeof body.category === "string"
        ? body.category.trim().toUpperCase()
        : existing.category;
    const nextStatus =
      typeof body.status === "string" && body.status.trim()
        ? body.status.trim().toUpperCase()
        : existing.status;
    const status = nextStatus === "DRAFT" ? "DRAFT" : "PUBLISHED";
    const isDraft = status === "DRAFT";
    const tags =
      body.tags !== undefined
        ? normalizeTagsInput(typeof body.tags === "string" ? body.tags : "")
        : existing.tags || "";

    if (title.length < 3 || title.length > 120) {
      return NextResponse.json(
        { error: "Judul konten harus antara 3 hingga 120 karakter." },
        { status: 400 }
      );
    }

    if (containsLink(title)) {
      return NextResponse.json(
        { error: "Judul tidak boleh mengandung tautan atau alamat situs web." },
        { status: 400 }
      );
    }

    if (!isValidCategory(category)) {
      return NextResponse.json(
        { error: "Pilih kategori konten yang valid." },
        { status: 400 }
      );
    }

    let subcategory = existing.subcategory;
    if (body.subcategory !== undefined) {
      const requestedSub =
        typeof body.subcategory === "string" && body.subcategory.trim()
          ? body.subcategory.trim().toLowerCase()
          : null;
      if (requestedSub) {
        const dbCat = await prisma.category.findUnique({
          where: { key: category },
          include: { subcategories: { select: { slug: true } } },
        });
        if (dbCat && !dbCat.subcategories.some((s) => s.slug === requestedSub)) {
          return NextResponse.json(
            { error: "Subkategori tidak sesuai dengan kategori konten." },
            { status: 400 }
          );
        }
      }
      subcategory = requestedSub;
    } else if (category !== existing.category) {
      subcategory = null;
    }

    let eventId = existing.eventId;
    if (body.eventId !== undefined) {
      const requestedEv =
        typeof body.eventId === "string" && body.eventId.trim()
          ? body.eventId.trim()
          : null;
      if (requestedEv) {
        const dbEv = await prisma.communityEvent.findUnique({
          where: { id: requestedEv },
          select: { id: true },
        });
        if (!dbEv) {
          return NextResponse.json(
            { error: "Event tidak ditemukan." },
            { status: 400 }
          );
        }
      }
      eventId = requestedEv;
    }

    const captionValidation = validateCaptionLength(caption, { isDraft });
    if (!captionValidation.ok) {
      return NextResponse.json(
        { error: captionValidation.error },
        { status: 400 }
      );
    }

    if (!isDraft && !tags) {
      return NextResponse.json(
        { error: "Minimal satu tag wajib diisi sebelum dipublikasikan." },
        { status: 400 }
      );
    }

    let externalLink = existing.externalLink;
    if (body.externalLink !== undefined) {
      const urlCheck = validateExternalUrl(
        typeof body.externalLink === "string" ? body.externalLink : ""
      );
      if (!urlCheck.ok) {
        return NextResponse.json({ error: urlCheck.error }, { status: 400 });
      }
      externalLink = urlCheck.value;
    }

    const mentions =
      body.mentions !== undefined
        ? normalizeMentionsInput(
            typeof body.mentions === "string" ? body.mentions : ""
          )
        : existing.mentions;

    const hideLikeCount =
      typeof body.hideLikeCount === "boolean"
        ? body.hideLikeCount
        : existing.hideLikeCount;

    let publishedAt = existing.publishedAt;
    if (typeof body.publishedAt === "string" && body.publishedAt.trim()) {
      const parsed = new Date(body.publishedAt.trim());
      if (!Number.isNaN(parsed.getTime())) {
        publishedAt = parsed;
      }
    } else if (existing.status === "DRAFT" && status === "PUBLISHED") {
      publishedAt = new Date();
    }

    let imageUrl = existing.imageUrl;
    let imageFormat = existing.imageFormat;
    let oldImageToDelete = null;

    const hasNewImageFile =
      imageFile &&
      typeof imageFile === "object" &&
      typeof imageFile.arrayBuffer === "function" &&
      imageFile.size > 0;

    if (hasNewImageFile) {
      const saved = await saveLocalImage(imageFile, {
        prefix: "post",
        maxBytes: 5 * 1024 * 1024,
      });
      if (!saved.ok) {
        return NextResponse.json({ error: saved.error }, { status: 400 });
      }
      oldImageToDelete = existing.imageUrl;
      imageUrl = saved.url;
      const requestedFormat =
        typeof body.imageFormat === "string"
          ? body.imageFormat.trim().toUpperCase()
          : "PORTRAIT";
      imageFormat = requestedFormat === "LANDSCAPE" ? "LANDSCAPE" : "PORTRAIT";
    } else if (removeImage) {
      oldImageToDelete = existing.imageUrl;
      imageUrl = null;
      imageFormat = "TEXT";
    } else if (
      imageUrl &&
      typeof body.imageFormat === "string" &&
      (body.imageFormat.trim().toUpperCase() === "LANDSCAPE" ||
        body.imageFormat.trim().toUpperCase() === "PORTRAIT")
    ) {
      imageFormat = body.imageFormat.trim().toUpperCase();
    }

    const [updatedPost, likeRow, bookmarkRow] = await Promise.all([
      prisma.post.update({
        where: { id: postId },
        data: {
          title,
          caption,
          tags,
          category,
          subcategory,
          eventId,
          status,
          imageUrl,
          imageFormat,
          externalLink,
          mentions,
          hideLikeCount,
          publishedAt,
        },
        include: POST_INCLUDE,
      }),
      prisma.like.findUnique({
        where: { postId_userId: { postId, userId: user.id } },
        select: { id: true },
      }),
      prisma.bookmark.findUnique({
        where: { postId_userId: { postId, userId: user.id } },
        select: { id: true },
      }),
    ]);

    if (oldImageToDelete && oldImageToDelete !== imageUrl) {
      await deleteLocalUpload(oldImageToDelete);
    }

    if (existing.status === "DRAFT" && status === "PUBLISHED") {
      await createNotification({
        userId: existing.authorId,
        category: "HISTORY",
        title: "Draf Berhasil Dipublikasikan",
        message: `Draf "${title}" kini telah dipublikasikan ke BedahKarya.`,
        linkUrl: `/post/${postId}`,
      });
    }

    return NextResponse.json(
      {
        message: isDraft
          ? "Draf berhasil diperbarui."
          : "Konten berhasil diperbarui.",
        post: serializePost(updatedPost, {
          likedSet: likeRow ? new Set([postId]) : new Set(),
          bookmarkedSet: bookmarkRow ? new Set([postId]) : new Set(),
        }),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Gagal memperbarui konten:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memperbarui konten." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request, { params }) {
  try {
    const auth = await requireActiveUser();
    if (auth.errorResponse) return auth.errorResponse;
    const { user } = auth;

    const { id } = await params;
    const postId = decodeURIComponent(id || "").trim();

    const existing = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        imageUrl: true,
        reports: {
          select: { evidenceUrl: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Konten tidak ditemukan." },
        { status: 404 }
      );
    }

    if (existing.authorId !== user.id && !isStaffRole(user.role)) {
      return NextResponse.json(
        { error: "Anda tidak memiliki izin untuk menghapus konten ini." },
        { status: 403 }
      );
    }

    await prisma.post.delete({ where: { id: postId } });
    await Promise.all([
      deleteLocalUpload(existing.imageUrl),
      ...existing.reports.map((report) => deleteLocalUpload(report.evidenceUrl)),
    ]);

    return NextResponse.json(
      {
        message: "Konten berhasil dihapus.",
        deletedId: postId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Gagal menghapus konten:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menghapus konten." },
      { status: 500 }
    );
  }
}
