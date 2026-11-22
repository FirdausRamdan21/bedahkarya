import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";
import {
  containsLink,
  isValidCategory,
  normalizeMentionsInput,
  validateCaptionLength,
  validateExternalUrl,
} from "@/lib/categories";
import { createNotification } from "@/lib/notifications";
import { POST_INCLUDE, queryPosts, serializePost } from "@/lib/posts";
import { saveLocalImage } from "@/lib/uploads";
import { normalizeTagsInput } from "@/services/feedAlgorithm";

export async function GET(request) {
  try {
    const { searchParams } = request.nextUrl;
    const mode = searchParams.get("mode") || "feed";
    const q = searchParams.get("q") || "";
    const category = searchParams.get("category") || "";
    const subcategory = searchParams.get("subcategory") || "";
    const event = searchParams.get("event") || "";
    const tag = searchParams.get("tag") || "";
    const page = Number(searchParams.get("page") || "1");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;

    const result = await queryPosts({
      mode,
      q,
      category,
      subcategory,
      event,
      tag,
      page,
      limit,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Gagal mengambil daftar postingan:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memuat daftar konten." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { user, errorResponse } = await requireActiveUser();
    if (errorResponse) return errorResponse;

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { error: "Format unggahan harus berupa FormData." },
        { status: 400 }
      );
    }

    const rawTitle = formData.get("title");
    const rawCaption = formData.get("caption");
    const rawCategory = formData.get("category");
    const rawSubcategory = formData.get("subcategory");
    const rawEventId = formData.get("eventId");
    const rawStatus = formData.get("status");
    const rawImageFormat = formData.get("imageFormat");
    const rawTags = formData.get("tags");
    const rawExternalLink = formData.get("externalLink");
    const rawMentions = formData.get("mentions");
    const rawPublishedAt = formData.get("publishedAt");
    const rawHideLikeCount = formData.get("hideLikeCount");
    const imageFile = formData.get("image");
    const hideLikeCount =
      rawHideLikeCount === "true" ||
      rawHideLikeCount === "1" ||
      (rawHideLikeCount === null && Boolean(user.hideLikeCountDefault));

    const title = typeof rawTitle === "string" ? rawTitle.trim() : "";
    const caption = typeof rawCaption === "string" ? rawCaption.trim() : "";
    const category =
      typeof rawCategory === "string" ? rawCategory.trim().toUpperCase() : "KARYA";
    const requestedSubcategory =
      typeof rawSubcategory === "string" && rawSubcategory.trim()
        ? rawSubcategory.trim().toLowerCase()
        : null;
    const requestedEventId =
      typeof rawEventId === "string" && rawEventId.trim()
        ? rawEventId.trim()
        : null;

    const status =
      typeof rawStatus === "string" && rawStatus.trim().toUpperCase() === "DRAFT"
        ? "DRAFT"
        : "PUBLISHED";
    const isDraft = status === "DRAFT";
    const tags = normalizeTagsInput(typeof rawTags === "string" ? rawTags : "");
    const mentions = normalizeMentionsInput(
      typeof rawMentions === "string" ? rawMentions : ""
    );

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
        { error: "Format kunci kategori tidak valid." },
        { status: 400 }
      );
    }

    const totalCategoriesInDb = await prisma.category.count();
    let validSubcategory = null;
    if (totalCategoriesInDb > 0) {
      const dbCat = await prisma.category.findUnique({
        where: { key: category },
        include: { subcategories: { select: { slug: true } } },
      });
      if (!dbCat) {
        return NextResponse.json(
          { error: "Kategori konten tidak ditemukan." },
          { status: 400 }
        );
      }
      if (requestedSubcategory) {
        const belongs = dbCat.subcategories.some(
          (s) => s.slug === requestedSubcategory
        );
        if (!belongs) {
          return NextResponse.json(
            { error: "Subkategori tidak sesuai dengan kategori konten yang dipilih." },
            { status: 400 }
          );
        }
        validSubcategory = requestedSubcategory;
      }
    } else {
      validSubcategory = requestedSubcategory;
    }

    let validEventId = null;
    if (requestedEventId) {
      const dbEvent = await prisma.communityEvent.findUnique({
        where: { id: requestedEventId },
        select: { id: true, isActive: true },
      });
      if (!dbEvent || !dbEvent.isActive) {
        return NextResponse.json(
          { error: "Event yang dipilih tidak tersedia atau sudah berakhir." },
          { status: 400 }
        );
      }
      validEventId = dbEvent.id;
    }

    const captionValidation = validateCaptionLength(caption, { isDraft });
    if (!captionValidation.ok) {
      return NextResponse.json(
        { error: captionValidation.error },
        { status: 400 }
      );
    }

    const urlValidation = validateExternalUrl(
      typeof rawExternalLink === "string" ? rawExternalLink : ""
    );
    if (!urlValidation.ok) {
      return NextResponse.json({ error: urlValidation.error }, { status: 400 });
    }

    if (!isDraft && !tags) {
      return NextResponse.json(
        { error: "Sertakan minimal satu tag kategori (contoh: poster, uiux)." },
        { status: 400 }
      );
    }

    let publishedAt = new Date();
    if (typeof rawPublishedAt === "string" && rawPublishedAt.trim()) {
      const parsedDate = new Date(rawPublishedAt.trim());
      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: "Format tanggal publikasi tidak valid." },
          { status: 400 }
        );
      }
      publishedAt = parsedDate;
    }

    const hasImageFile =
      imageFile &&
      typeof imageFile === "object" &&
      typeof imageFile.arrayBuffer === "function" &&
      imageFile.size > 0;

    let imageUrl = null;
    let imageFormat = "TEXT";

    if (hasImageFile) {
      const saved = await saveLocalImage(imageFile, {
        prefix: "post",
        maxBytes: 5 * 1024 * 1024,
      });

      if (!saved.ok) {
        return NextResponse.json({ error: saved.error }, { status: 400 });
      }

      imageUrl = saved.url;
      const requestedFormat =
        typeof rawImageFormat === "string"
          ? rawImageFormat.trim().toUpperCase()
          : "PORTRAIT";
      imageFormat = requestedFormat === "LANDSCAPE" ? "LANDSCAPE" : "PORTRAIT";
    }

    const createdPost = await prisma.post.create({
      data: {
        title,
        caption,
        imageUrl,
        imageFormat,
        tags,
        category,
        subcategory: validSubcategory,
        status,
        externalLink: urlValidation.value,
        mentions,
        hideLikeCount,
        eventId: validEventId,
        publishedAt,
        authorId: user.id,
      },
      include: POST_INCLUDE,
    });

    await createNotification({
      userId: user.id,
      category: "HISTORY",
      title: isDraft ? "Draf Konten Disimpan" : "Konten Berhasil Diunggah",
      message: isDraft
        ? `Draf "${createdPost.title}" berhasil disimpan di profil Anda.`
        : `Konten "${createdPost.title}" kini tayang di BedahKarya.`,
      linkUrl: isDraft
        ? `/profile/${user.username}?tab=draft`
        : `/post/${createdPost.id}`,
    });

    return NextResponse.json(
      {
        message: isDraft
          ? "Konten berhasil disimpan sebagai draf."
          : "Konten berhasil dipublikasikan.",
        post: serializePost(createdPost),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Gagal mengunggah konten:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menyimpan konten." },
      { status: 500 }
    );
  }
}
