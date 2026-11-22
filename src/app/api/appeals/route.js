import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaff, requireUser } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { deleteLocalUpload, saveLocalImage } from "@/lib/uploads";

function parseEvidenceUrls(raw) {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(request) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json(
        { error: "Silakan masuk terlebih dahulu." },
        { status: 401 }
      );
    }

    const scope = (request.nextUrl.searchParams.get("scope") || "").trim();
    const statusFilter = (
      request.nextUrl.searchParams.get("status") || ""
    )
      .trim()
      .toUpperCase();

    if (scope === "admin") {
      const staff = await requireStaff();
      if (!staff) {
        return NextResponse.json(
          { error: "Akses ditolak. Khusus Admin atau Moderator." },
          { status: 403 }
        );
      }

      const where = {};
      if (["PENDING", "APPROVED", "REJECTED"].includes(statusFilter)) {
        where.status = statusFilter;
      }

      const appeals = await prisma.appeal.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              email: true,
              isSuspended: true,
              suspendedUntil: true,
              suspensionReason: true,
            },
          },
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      });

      return NextResponse.json(
        {
          appeals: appeals.map((item) => ({
            ...item,
            evidenceList: parseEvidenceUrls(item.evidenceUrls),
            createdAt: item.createdAt.toISOString(),
            reviewedAt: item.reviewedAt ? item.reviewedAt.toISOString() : null,
            user: {
              ...item.user,
              suspendedUntil: item.user.suspendedUntil
                ? item.user.suspendedUntil.toISOString()
                : null,
            },
          })),
        },
        { status: 200 }
      );
    }

    const ownAppeals = await prisma.appeal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      {
        appeals: ownAppeals.map((item) => ({
          ...item,
          evidenceList: parseEvidenceUrls(item.evidenceUrls),
          createdAt: item.createdAt.toISOString(),
          reviewedAt: item.reviewedAt ? item.reviewedAt.toISOString() : null,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Appeals GET error:", error);
    return NextResponse.json(
      { error: "Gagal memuat daftar uji banding." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const uploadedUrls = [];
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json(
        { error: "Silakan masuk terlebih dahulu." },
        { status: 401 }
      );
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { error: "Format unggahan uji banding harus FormData." },
        { status: 400 }
      );
    }

    const rawMessage = formData.get("message");
    const rawTargetType = formData.get("targetType");
    const rawTargetId = formData.get("targetId");

    const message = typeof rawMessage === "string" ? rawMessage.trim() : "";
    const targetType =
      typeof rawTargetType === "string" &&
      ["ACCOUNT", "POST", "COMMENT"].includes(rawTargetType.trim().toUpperCase())
        ? rawTargetType.trim().toUpperCase()
        : "ACCOUNT";
    const targetId =
      typeof rawTargetId === "string" && rawTargetId.trim()
        ? rawTargetId.trim()
        : null;

    if (message.length < 15 || message.length > 1500) {
      return NextResponse.json(
        { error: "Penjelasan uji banding harus 15 hingga 1.500 karakter." },
        { status: 400 }
      );
    }

    const evidenceFiles = formData
      .getAll("evidence")
      .filter(
        (file) =>
          file &&
          typeof file === "object" &&
          typeof file.arrayBuffer === "function" &&
          file.size > 0
      );

    if (evidenceFiles.length < 1 || evidenceFiles.length > 3) {
      return NextResponse.json(
        {
          error:
            "Lampirkan minimal 1 foto dan maksimal 3 foto bukti untuk mengajukan uji banding.",
        },
        { status: 400 }
      );
    }

    for (const file of evidenceFiles) {
      const saved = await saveLocalImage(file, {
        prefix: "appeal",
        maxBytes: 4 * 1024 * 1024,
      });
      if (!saved.ok) {
        await Promise.all(uploadedUrls.map((u) => deleteLocalUpload(u)));
        return NextResponse.json({ error: saved.error }, { status: 400 });
      }
      uploadedUrls.push(saved.url);
    }

    const created = await prisma.appeal.create({
      data: {
        userId: user.id,
        targetType,
        targetId,
        message,
        evidenceUrls: JSON.stringify(uploadedUrls),
        status: "PENDING",
      },
    });

    await createNotification({
      userId: user.id,
      category: "HISTORY",
      title: "Uji Banding Terkirim",
      message:
        "Permohonan uji banding Anda telah diterima dan sedang menunggu peninjauan Admin atau Moderator.",
      linkUrl: "/notifications?category=WARNING",
    });

    return NextResponse.json(
      {
        message: "Uji banding berhasil dikirim untuk ditinjau.",
        appeal: {
          ...created,
          evidenceList: uploadedUrls,
          createdAt: created.createdAt.toISOString(),
          reviewedAt: null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    await Promise.all(uploadedUrls.map((u) => deleteLocalUpload(u)));
    console.error("Appeals POST error:", error);
    return NextResponse.json(
      { error: "Gagal mengirim uji banding." },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const staff = await requireStaff();
    if (!staff) {
      return NextResponse.json(
        { error: "Akses ditolak. Khusus Admin atau Moderator." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const appealId =
      typeof body?.appealId === "string" ? body.appealId.trim() : "";
    const decision =
      typeof body?.decision === "string"
        ? body.decision.trim().toUpperCase()
        : "";
    const reviewerNote =
      typeof body?.reviewerNote === "string" ? body.reviewerNote.trim() : "";

    if (!appealId || !["APPROVED", "REJECTED"].includes(decision)) {
      return NextResponse.json(
        { error: "ID uji banding dan keputusan (APPROVED/REJECTED) wajib diisi." },
        { status: 400 }
      );
    }

    const appeal = await prisma.appeal.findUnique({
      where: { id: appealId },
      include: {
        user: { select: { id: true, username: true } },
      },
    });

    if (!appeal) {
      return NextResponse.json(
        { error: "Data uji banding tidak ditemukan." },
        { status: 404 }
      );
    }

    const updated = await prisma.appeal.update({
      where: { id: appealId },
      data: {
        status: decision,
        reviewerNote: reviewerNote || null,
        reviewedById: staff.id,
        reviewedAt: new Date(),
      },
    });

    if (decision === "APPROVED") {
      if (appeal.targetType === "ACCOUNT") {
        await prisma.user.update({
          where: { id: appeal.userId },
          data: {
            isSuspended: false,
            suspendedUntil: null,
            suspensionReason: null,
          },
        });
      } else if (appeal.targetType === "POST" && appeal.targetId) {
        await prisma.post
          .update({
            where: { id: appeal.targetId },
            data: {
              warningCount: 0,
              hasViolation: false,
            },
          })
          .catch(() => {});
      }

      await createNotification({
        userId: appeal.userId,
        category: "WARNING",
        title: "Uji Banding Diterima — Akun/Konten Dibebaskan",
        message:
          reviewerNote ||
          "Uji banding Anda telah disetujui oleh tim pengawas. Pembatasan telah dicabut dan akun Anda kembali aktif penuh.",
        linkUrl: "/",
      });
    } else {
      await createNotification({
        userId: appeal.userId,
        category: "WARNING",
        title: "Uji Banding Ditolak",
        message:
          reviewerNote ||
          "Setelah peninjauan bukti, uji banding Anda belum dapat disetujui.",
        linkUrl: "/notifications?category=WARNING",
      });
    }

    return NextResponse.json(
      {
        message:
          decision === "APPROVED"
            ? `Akun @${appeal.user.username} berhasil dibebaskan.`
            : "Uji banding telah ditolak.",
        appeal: {
          ...updated,
          evidenceList: parseEvidenceUrls(updated.evidenceUrls),
          createdAt: updated.createdAt.toISOString(),
          reviewedAt: updated.reviewedAt ? updated.reviewedAt.toISOString() : null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Appeals PATCH error:", error);
    return NextResponse.json(
      { error: "Gagal memproses keputusan uji banding." },
      { status: 500 }
    );
  }
}
