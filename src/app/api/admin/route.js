import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaff, SAFE_USER_SELECT } from "@/lib/auth";
import {
  getAdminAppealsData,
  getAdminContentsData,
  getAdminModerationLogsData,
  getAdminOverviewData,
  getAdminReportsData,
  getAdminUsersData,
} from "@/lib/adminData";
import {
  containsLink,
  isValidCategory,
  validateCaptionLength,
} from "@/lib/categories";
import { createNotification } from "@/lib/notifications";
import { deleteLocalUpload } from "@/lib/uploads";
import { normalizeTagsInput } from "@/services/feedAlgorithm";

async function authorizeStaff() {
  const staff = await requireStaff();
  if (!staff) {
    return {
      errorResponse: NextResponse.json(
        { error: "Akses ditolak. Khusus Administrator atau Moderator." },
        { status: 403 }
      ),
    };
  }
  return { staff };
}

function computeSuspendedUntil(durationValue, durationUnit) {
  const amount = Number(durationValue);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { date: null, label: "Tanpa batas waktu (keputusan Admin/Moderator)" };
  }

  const now = new Date();
  const unit = typeof durationUnit === "string" ? durationUnit.toUpperCase() : "";

  if (unit === "DAYS") {
    now.setDate(now.getDate() + amount);
    return { date: now, label: `${amount} hari` };
  }
  if (unit === "MONTHS") {
    now.setMonth(now.getMonth() + amount);
    return { date: now, label: `${amount} bulan` };
  }
  if (unit === "YEARS") {
    now.setFullYear(now.getFullYear() + amount);
    return { date: now, label: `${amount} tahun` };
  }

  return { date: null, label: "Tanpa batas waktu (keputusan Admin/Moderator)" };
}

export async function GET(request) {
  const auth = await authorizeStaff();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = request.nextUrl;
    const resource = (searchParams.get("resource") || "overview").trim();

    if (resource === "overview") {
      const data = await getAdminOverviewData();
      return NextResponse.json(data, { status: 200 });
    }

    if (resource === "contents") {
      const data = await getAdminContentsData({
        q: searchParams.get("q") || "",
        tag: searchParams.get("tag") || "",
        category: searchParams.get("category") || "",
        reportedOnly: searchParams.get("reportedOnly") === "true",
      });
      return NextResponse.json(data, { status: 200 });
    }

    if (resource === "users") {
      const data = await getAdminUsersData({
        q: searchParams.get("q") || "",
        role: searchParams.get("role") || "",
        status: searchParams.get("status") || "",
      });
      return NextResponse.json(data, { status: 200 });
    }

    if (resource === "reports") {
      const data = await getAdminReportsData({
        status: searchParams.get("status") || "",
        q: searchParams.get("q") || "",
      });
      return NextResponse.json(data, { status: 200 });
    }

    if (resource === "appeals") {
      const data = await getAdminAppealsData();
      return NextResponse.json(data, { status: 200 });
    }

    if (resource === "moderation") {
      const data = await getAdminModerationLogsData();
      return NextResponse.json(data, { status: 200 });
    }

    return NextResponse.json(
      { error: "Parameter resource tidak dikenal." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Admin GET error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data panel pengawasan." },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  const auth = await authorizeStaff();
  if (auth.errorResponse) return auth.errorResponse;
  const { staff } = auth;
  const isAdmin = staff.role === "ADMIN";

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Format permintaan tidak valid." },
        { status: 400 }
      );
    }

    const action =
      typeof body.action === "string" ? body.action.trim().toUpperCase() : "";

    if (action === "UPDATE_POST") {
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Moderator hanya dapat memberi peringatan atau menghapus konten." },
          { status: 403 }
        );
      }

      const postId = typeof body.postId === "string" ? body.postId.trim() : "";
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const caption =
        typeof body.caption === "string" ? body.caption.trim() : "";
      const category =
        typeof body.category === "string"
          ? body.category.trim().toUpperCase()
          : "";
      const tags = normalizeTagsInput(
        typeof body.tags === "string" ? body.tags : ""
      );

      if (!postId || title.length < 3 || title.length > 120) {
        return NextResponse.json(
          { error: "ID konten dan judul (3–120 karakter) wajib valid." },
          { status: 400 }
        );
      }

      if (containsLink(title) || !isValidCategory(category)) {
        return NextResponse.json(
          { error: "Judul tidak boleh mengandung link dan kategori harus valid." },
          { status: 400 }
        );
      }

      const captionCheck = validateCaptionLength(caption, { isDraft: true });
      if (!captionCheck.ok) {
        return NextResponse.json({ error: captionCheck.error }, { status: 400 });
      }

      const updatedPost = await prisma.post.update({
        where: { id: postId },
        data: { title, caption, tags, category },
        include: {
          author: { select: { id: true, username: true, name: true, role: true } },
          _count: { select: { likes: true, comments: true, bookmarks: true, reports: true } },
        },
      });

      return NextResponse.json(
        {
          message: "Konten berhasil diperbarui.",
          post: {
            ...updatedPost,
            publishedAt: updatedPost.publishedAt.toISOString(),
            createdAt: updatedPost.createdAt.toISOString(),
          },
        },
        { status: 200 }
      );
    }

    if (action === "WARN_POST") {
      const postId = typeof body.postId === "string" ? body.postId.trim() : "";
      const reason =
        typeof body.reason === "string" ? body.reason.trim() : "";

      if (!postId || reason.length < 5) {
        return NextResponse.json(
          { error: "ID konten dan alasan peringatan (min. 5 karakter) wajib diisi." },
          { status: 400 }
        );
      }

      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { id: true, title: true, authorId: true, warningCount: true, hasViolation: true },
      });

      if (!post) {
        return NextResponse.json(
          { error: "Konten tidak ditemukan." },
          { status: 404 }
        );
      }

      const nextWarningCount = Math.min(2, post.warningCount + 1);

      const [updatedPost] = await prisma.$transaction([
        prisma.post.update({
          where: { id: postId },
          data: { warningCount: nextWarningCount },
          include: {
            author: { select: { id: true, username: true, name: true, role: true } },
            _count: { select: { likes: true, comments: true, bookmarks: true, reports: true } },
          },
        }),
        prisma.postWarning.create({
          data: {
            postId,
            issuedById: staff.id,
            level: nextWarningCount,
            reason,
          },
        }),
      ]);

      await createNotification({
        userId: post.authorId,
        category: "WARNING",
        title: `Peringatan ke-${nextWarningCount} pada Konten "${post.title}"`,
        message: `Konten Anda menerima peringatan ke-${nextWarningCount}/2 dari tim pengawas. Alasan: ${reason}. Jika mencapai 2 peringatan, konten dapat dikenai status pelanggaran. Anda dapat mengajukan uji banding.`,
        linkUrl: "/notifications?category=WARNING",
      });

      return NextResponse.json(
        {
          message: `Peringatan ke-${nextWarningCount} berhasil diberikan.`,
          post: {
            ...updatedPost,
            publishedAt: updatedPost.publishedAt.toISOString(),
            createdAt: updatedPost.createdAt.toISOString(),
          },
        },
        { status: 200 }
      );
    }

    if (action === "MARK_POST_VIOLATION") {
      const postId = typeof body.postId === "string" ? body.postId.trim() : "";
      const reason =
        typeof body.reason === "string" && body.reason.trim()
          ? body.reason.trim()
          : "Melampaui batas 2 kali peringatan konten.";

      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { id: true, title: true, authorId: true, warningCount: true },
      });

      if (!post) {
        return NextResponse.json(
          { error: "Konten tidak ditemukan." },
          { status: 404 }
        );
      }

      if (post.warningCount < 2) {
        return NextResponse.json(
          {
            error:
              "Pelanggaran hanya dapat diberikan setelah konten menerima 2 kali peringatan.",
          },
          { status: 400 }
        );
      }

      const updatedPost = await prisma.post.update({
        where: { id: postId },
        data: { hasViolation: true },
        include: {
          author: { select: { id: true, username: true, name: true, role: true } },
          _count: { select: { likes: true, comments: true, bookmarks: true, reports: true } },
        },
      });

      await createNotification({
        userId: post.authorId,
        category: "WARNING",
        title: `Pelanggaran pada Konten "${post.title}"`,
        message: `Konten Anda telah diberi tanda Pelanggaran setelah 2 kali peringatan. Catatan: ${reason}. Anda dapat mengajukan Uji Banding beserta bukti foto.`,
        linkUrl: "/notifications?category=WARNING",
      });

      return NextResponse.json(
        {
          message: "Status pelanggaran berhasil diterapkan pada konten.",
          post: {
            ...updatedPost,
            publishedAt: updatedPost.publishedAt.toISOString(),
            createdAt: updatedPost.createdAt.toISOString(),
          },
        },
        { status: 200 }
      );
    }

    if (action === "UPDATE_USER_ROLE") {
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Hanya Administrator yang dapat mengubah peran pengguna." },
          { status: 403 }
        );
      }

      const userId = typeof body.userId === "string" ? body.userId.trim() : "";
      const nextRole =
        typeof body.role === "string" ? body.role.trim().toUpperCase() : "";

      if (!userId || !["USER", "MODERATOR"].includes(nextRole)) {
        return NextResponse.json(
          { error: "Peran tujuan harus USER atau MODERATOR." },
          { status: 400 }
        );
      }

      const target = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, username: true },
      });

      if (!target || target.role === "ADMIN") {
        return NextResponse.json(
          { error: "Pengguna tidak ditemukan atau merupakan akun ADMIN." },
          { status: 400 }
        );
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role: nextRole },
        select: {
          ...SAFE_USER_SELECT,
          _count: {
            select: {
              posts: true,
              comments: true,
              reports: true,
              followers: true,
              following: true,
            },
          },
        },
      });

      await createNotification({
        userId: target.id,
        category: "SYSTEM",
        title: `Perubahan Peran Akun: ${nextRole}`,
        message:
          nextRole === "MODERATOR"
            ? "Selamat! Akun Anda kini memiliki peran Moderator untuk membantu pengawasan konten dan pengguna."
            : "Peran akun Anda dikembalikan menjadi Pengguna biasa (USER).",
        linkUrl: nextRole === "MODERATOR" ? "/admin" : "/",
      });

      return NextResponse.json(
        {
          message: `Peran @${updatedUser.username} diubah menjadi ${nextRole}.`,
          user: {
            ...updatedUser,
            suspendedUntil: updatedUser.suspendedUntil
              ? updatedUser.suspendedUntil.toISOString()
              : null,
            createdAt: updatedUser.createdAt.toISOString(),
          },
        },
        { status: 200 }
      );
    }

    if (action === "TOGGLE_SUSPEND_USER") {
      const userId = typeof body.userId === "string" ? body.userId.trim() : "";
      if (!userId) {
        return NextResponse.json(
          { error: "ID pengguna wajib disertakan." },
          { status: 400 }
        );
      }

      if (userId === staff.id) {
        return NextResponse.json(
          { error: "Anda tidak dapat menangguhkan akun Anda sendiri." },
          { status: 400 }
        );
      }

      const target = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, username: true, isSuspended: true },
      });
      if (!target) {
        return NextResponse.json(
          { error: "Pengguna tidak ditemukan." },
          { status: 404 }
        );
      }

      if (target.role === "ADMIN") {
        return NextResponse.json(
          { error: "Akun dengan peran ADMIN tidak dapat ditangguhkan." },
          { status: 400 }
        );
      }

      if (!isAdmin && target.role === "MODERATOR") {
        return NextResponse.json(
          { error: "Moderator tidak dapat menangguhkan sesama Moderator." },
          { status: 403 }
        );
      }

      const nextSuspended =
        typeof body.isSuspended === "boolean"
          ? body.isSuspended
          : !target.isSuspended;

      const reason =
        typeof body.reason === "string" && body.reason.trim()
          ? body.reason.trim()
          : "Pelanggaran pedoman komunitas BedahKarya.";

      let suspendedUntil = null;
      let durationLabel = "";

      if (nextSuspended) {
        const computed = computeSuspendedUntil(
          body.durationValue,
          body.durationUnit
        );
        suspendedUntil = computed.date;
        durationLabel = computed.label;
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          isSuspended: nextSuspended,
          suspendedUntil: nextSuspended ? suspendedUntil : null,
          suspensionReason: nextSuspended ? reason : null,
        },
        select: {
          ...SAFE_USER_SELECT,
          _count: {
            select: {
              posts: true,
              comments: true,
              reports: true,
              followers: true,
              following: true,
            },
          },
        },
      });

      if (nextSuspended) {
        await createNotification({
          userId: target.id,
          category: "WARNING",
          title: "Akun ini terkena penangguhan",
          message: `Laporan / Alasan: ${reason} | Durasi: ${durationLabel}. Akun Anda tetap dapat masuk dalam mode baca dan mengajukan Uji Banding.`,
          linkUrl: "/notifications?category=WARNING",
        });
      } else {
        await createNotification({
          userId: target.id,
          category: "WARNING",
          title: "Penangguhan Akun Dicabut",
          message:
            "Akun Anda telah dibebaskan oleh tim pengawas dan kini kembali aktif penuh.",
          linkUrl: "/",
        });
      }

      return NextResponse.json(
        {
          message: nextSuspended
            ? `Akun @${updatedUser.username} berhasil ditangguhkan (${durationLabel}).`
            : `Akun @${updatedUser.username} dibebaskan dan diaktifkan kembali.`,
          user: {
            ...updatedUser,
            suspendedUntil: updatedUser.suspendedUntil
              ? updatedUser.suspendedUntil.toISOString()
              : null,
            createdAt: updatedUser.createdAt.toISOString(),
          },
        },
        { status: 200 }
      );
    }

    if (action === "UPDATE_REPORT_STATUS") {
      const reportId =
        typeof body.reportId === "string" ? body.reportId.trim() : "";
      const status =
        typeof body.status === "string" ? body.status.trim().toUpperCase() : "";

      if (!reportId || !["PENDING", "RESOLVED", "DISMISSED"].includes(status)) {
        return NextResponse.json(
          { error: "ID laporan dan status yang valid wajib disertakan." },
          { status: 400 }
        );
      }

      const updatedReport = await prisma.report.update({
        where: { id: reportId },
        data: { status },
      });

      return NextResponse.json(
        {
          message: "Status laporan diperbarui.",
          report: {
            ...updatedReport,
            createdAt: updatedReport.createdAt.toISOString(),
          },
        },
        { status: 200 }
      );
    }

    if (action === "RESOLVE_AND_DELETE_POST") {
      const reportId =
        typeof body.reportId === "string" ? body.reportId.trim() : "";
      if (!reportId) {
        return NextResponse.json(
          { error: "ID laporan wajib disertakan." },
          { status: 400 }
        );
      }

      const report = await prisma.report.findUnique({
        where: { id: reportId },
        include: {
          post: {
            select: {
              id: true,
              title: true,
              authorId: true,
              imageUrl: true,
              reports: { select: { evidenceUrl: true } },
            },
          },
        },
      });

      if (!report || !report.post) {
        return NextResponse.json(
          { error: "Tiket laporan atau konten terkait tidak ditemukan." },
          { status: 404 }
        );
      }

      const deletedPostId = report.post.id;
      const imageUrl = report.post.imageUrl;
      const evidenceUrls = report.post.reports.map((r) => r.evidenceUrl);

      await prisma.post.delete({ where: { id: deletedPostId } });
      await Promise.all([
        deleteLocalUpload(imageUrl),
        ...evidenceUrls.map((url) => deleteLocalUpload(url)),
      ]);

      await createNotification({
        userId: report.post.authorId,
        category: "WARNING",
        title: `Konten "${report.post.title}" Dihapus Tim Moderasi`,
        message: `Konten Anda dihapus berdasarkan laporan: ${report.reason}. Jika merasa keberatan, Anda dapat mengajukan Uji Banding.`,
        linkUrl: "/notifications?category=WARNING",
      });

      return NextResponse.json(
        {
          message:
            "Konten melanggar beserta seluruh data dan tiket terkait telah dihapus.",
          deletedPostId,
          reportId,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "Aksi PATCH admin tidak dikenali." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Admin PATCH error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memperbarui data pengawasan." },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const auth = await authorizeStaff();
  if (auth.errorResponse) return auth.errorResponse;
  const { staff } = auth;
  const isAdmin = staff.role === "ADMIN";

  try {
    let resource = request.nextUrl.searchParams.get("resource")?.trim() || "";
    let id = request.nextUrl.searchParams.get("id")?.trim() || "";

    if (!resource || !id) {
      const body = await request.json().catch(() => null);
      if (body && typeof body === "object") {
        if (!resource && typeof body.resource === "string") {
          resource = body.resource.trim();
        }
        if (!id && typeof body.id === "string") {
          id = body.id.trim();
        }
      }
    }

    if (!resource || !id) {
      return NextResponse.json(
        { error: "Parameter resource dan id wajib disertakan." },
        { status: 400 }
      );
    }

    if (resource === "post") {
      const post = await prisma.post.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          authorId: true,
          imageUrl: true,
          reports: { select: { evidenceUrl: true } },
        },
      });
      if (!post) {
        return NextResponse.json(
          { error: "Konten tidak ditemukan." },
          { status: 404 }
        );
      }

      await prisma.post.delete({ where: { id } });
      await Promise.all([
        deleteLocalUpload(post.imageUrl),
        ...post.reports.map((r) => deleteLocalUpload(r.evidenceUrl)),
      ]);

      await createNotification({
        userId: post.authorId,
        category: "WARNING",
        title: `Konten "${post.title}" Dihapus`,
        message:
          "Konten Anda dihapus oleh tim pengawas karena melanggar ketentuan komunitas. Anda dapat mengajukan Uji Banding jika diperlukan.",
        linkUrl: "/notifications?category=WARNING",
      });

      return NextResponse.json(
        {
          message: `Konten "${post.title}" berhasil dihapus.`,
          deletedId: id,
        },
        { status: 200 }
      );
    }

    if (resource === "user") {
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Moderator tidak memiliki izin menghapus akun pengguna." },
          { status: 403 }
        );
      }

      if (id === staff.id) {
        return NextResponse.json(
          { error: "Anda tidak dapat menghapus akun Anda sendiri." },
          { status: 400 }
        );
      }

      const targetUser = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          username: true,
          role: true,
          avatarUrl: true,
          posts: { select: { imageUrl: true } },
        },
      });
      if (!targetUser || targetUser.role === "ADMIN") {
        return NextResponse.json(
          { error: "Pengguna tidak ditemukan atau akun ADMIN dilindungi." },
          { status: 400 }
        );
      }

      await prisma.user.delete({ where: { id } });
      await Promise.all([
        deleteLocalUpload(targetUser.avatarUrl),
        ...targetUser.posts.map((post) => deleteLocalUpload(post.imageUrl)),
      ]);

      return NextResponse.json(
        {
          message: `Pengguna @${targetUser.username} berhasil dihapus.`,
          deletedId: id,
        },
        { status: 200 }
      );
    }

    if (resource === "moderationLog") {
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Hanya Administrator yang dapat menghapus log moderasi." },
          { status: 403 }
        );
      }

      await prisma.moderationLog.delete({ where: { id } });
      return NextResponse.json(
        { message: "Entri log moderasi dihapus.", deletedId: id },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "Tipe resource DELETE tidak valid." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Admin DELETE error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menghapus data." },
      { status: 500 }
    );
  }
}
