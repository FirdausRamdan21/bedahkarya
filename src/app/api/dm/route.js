import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActiveUser, requireUser } from "@/lib/auth";
import { deleteLocalUpload, saveLocalImage } from "@/lib/uploads";

const PARTNER_SELECT = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
  allowDmFromFollowing: true,
};

const SHARED_POST_SELECT = {
  id: true,
  title: true,
  imageUrl: true,
  imageFormat: true,
  category: true,
  author: {
    select: { username: true, name: true },
  },
};

export async function GET(request) {
  try {
    // Strictly private: ONLY the logged-in user can read their OWN DMs.
    // Admin and Moderator cannot inspect other users' DMs.
    const user = await requireUser();
    if (!user) {
      return NextResponse.json(
        { error: "Silakan masuk terlebih dahulu." },
        { status: 401 }
      );
    }

    const partnerId = (
      request.nextUrl.searchParams.get("partnerId") || ""
    ).trim();

    const [followingRows, allMessages] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: user.id },
        include: {
          following: { select: PARTNER_SELECT },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.directMessage.findMany({
        where: {
          OR: [{ senderId: user.id }, { receiverId: user.id }],
        },
        include: {
          sender: { select: PARTNER_SELECT },
          receiver: { select: PARTNER_SELECT },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);

    const contactsMap = new Map();
    for (const row of followingRows) {
      if (row.following) {
        contactsMap.set(row.following.id, {
          ...row.following,
          isFollowing: true,
          lastMessage: null,
          unreadCount: 0,
        });
      }
    }

    let totalUnread = 0;
    for (const msg of allMessages) {
      const other = msg.senderId === user.id ? msg.receiver : msg.sender;
      if (!other) continue;
      if (!contactsMap.has(other.id)) {
        contactsMap.set(other.id, {
          ...other,
          isFollowing: false,
          lastMessage: null,
          unreadCount: 0,
        });
      }
      const entry = contactsMap.get(other.id);
      if (!entry.lastMessage) {
        entry.lastMessage = {
          id: msg.id,
          content: msg.content,
          hasImage: Boolean(msg.imageUrl),
          hasSharedPost: Boolean(msg.sharedPostId),
          createdAt: msg.createdAt.toISOString(),
          fromMe: msg.senderId === user.id,
        };
      }
      if (msg.receiverId === user.id && !msg.isRead) {
        entry.unreadCount += 1;
        totalUnread += 1;
      }
    }

    const contacts = Array.from(contactsMap.values()).sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    let messages = [];
    if (partnerId) {
      const thread = await prisma.directMessage.findMany({
        where: {
          OR: [
            { senderId: user.id, receiverId: partnerId },
            { senderId: partnerId, receiverId: user.id },
          ],
        },
        include: {
          sender: { select: PARTNER_SELECT },
          sharedPost: { select: SHARED_POST_SELECT },
        },
        orderBy: { createdAt: "asc" },
        take: 150,
      });

      await prisma.directMessage.updateMany({
        where: {
          senderId: partnerId,
          receiverId: user.id,
          isRead: false,
        },
        data: { isRead: true },
      });

      messages = thread.map((msg) => ({
        ...msg,
        createdAt: msg.createdAt.toISOString(),
      }));
    }

    return NextResponse.json(
      { contacts, messages, totalUnread },
      { status: 200 }
    );
  } catch (error) {
    console.error("DM GET error:", error);
    return NextResponse.json(
      { error: "Gagal memuat pesan langsung." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  let savedImageUrl = null;
  try {
    const { user, errorResponse } = await requireActiveUser();
    if (errorResponse) return errorResponse;

    const contentType = request.headers.get("content-type") || "";
    let receiverId = "";
    let content = "";
    let sharedPostId = "";
    let imageFile = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData().catch(() => null);
      if (!formData) {
        return NextResponse.json(
          { error: "Format pesan tidak valid." },
          { status: 400 }
        );
      }
      receiverId =
        typeof formData.get("receiverId") === "string"
          ? formData.get("receiverId").trim()
          : "";
      content =
        typeof formData.get("content") === "string"
          ? formData.get("content").trim()
          : "";
      sharedPostId =
        typeof formData.get("sharedPostId") === "string"
          ? formData.get("sharedPostId").trim()
          : "";
      imageFile = formData.get("image");
    } else {
      const body = await request.json().catch(() => null);
      receiverId =
        typeof body?.receiverId === "string" ? body.receiverId.trim() : "";
      content = typeof body?.content === "string" ? body.content.trim() : "";
      sharedPostId =
        typeof body?.sharedPostId === "string" ? body.sharedPostId.trim() : "";
    }

    if (!receiverId || receiverId === user.id) {
      return NextResponse.json(
        { error: "Penerima pesan tidak valid." },
        { status: 400 }
      );
    }

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: PARTNER_SELECT,
    });

    if (!receiver) {
      return NextResponse.json(
        { error: "Akun tujuan tidak ditemukan." },
        { status: 404 }
      );
    }

    if (!receiver.allowDmFromFollowing) {
      return NextResponse.json(
        { error: "Pengguna ini menonaktifkan penerimaan pesan langsung." },
        { status: 403 }
      );
    }

    const [followsTarget, existingThread] = await Promise.all([
      prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: user.id,
            followingId: receiverId,
          },
        },
        select: { id: true },
      }),
      prisma.directMessage.findFirst({
        where: {
          OR: [
            { senderId: user.id, receiverId },
            { senderId: receiverId, receiverId: user.id },
          ],
        },
        select: { id: true },
      }),
    ]);

    if (!followsTarget && !existingThread) {
      return NextResponse.json(
        {
          error:
            "Anda harus mengikuti akun ini terlebih dahulu sebelum dapat mengirim Pesan Langsung (DM).",
        },
        { status: 403 }
      );
    }

    const hasImage =
      imageFile &&
      typeof imageFile === "object" &&
      typeof imageFile.arrayBuffer === "function" &&
      imageFile.size > 0;

    if (!content && !hasImage && !sharedPostId) {
      return NextResponse.json(
        { error: "Tulis pesan, lampirkan gambar, atau pilih konten untuk dikirim." },
        { status: 400 }
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: "Pesan maksimal 2.000 karakter." },
        { status: 400 }
      );
    }

    let validSharedPostId = null;
    if (sharedPostId) {
      const post = await prisma.post.findUnique({
        where: { id: sharedPostId },
        select: { id: true, status: true },
      });
      if (post && post.status === "PUBLISHED") {
        validSharedPostId = post.id;
      }
    }

    if (hasImage) {
      const saved = await saveLocalImage(imageFile, {
        prefix: "dm",
        maxBytes: 4 * 1024 * 1024,
      });
      if (!saved.ok) {
        return NextResponse.json({ error: saved.error }, { status: 400 });
      }
      savedImageUrl = saved.url;
    }

    const created = await prisma.directMessage.create({
      data: {
        senderId: user.id,
        receiverId,
        content: content || null,
        imageUrl: savedImageUrl,
        sharedPostId: validSharedPostId,
      },
      include: {
        sender: { select: PARTNER_SELECT },
        sharedPost: { select: SHARED_POST_SELECT },
      },
    });

    return NextResponse.json(
      {
        message: {
          ...created,
          createdAt: created.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (savedImageUrl) {
      await deleteLocalUpload(savedImageUrl);
    }
    console.error("DM POST error:", error);
    return NextResponse.json(
      { error: "Gagal mengirim pesan langsung." },
      { status: 500 }
    );
  }
}
