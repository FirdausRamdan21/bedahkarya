import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { slugifyKey } from "@/lib/categories";
import { createNotification } from "@/lib/notifications";
import { revalidateTaxonomy } from "@/lib/taxonomy";

const VALID_BADGE_ICONS = new Set([
  "brain",
  "star",
  "wrench",
  "heart-handshake",
  "crown",
  "megaphone",
  "award",
  "shield",
]);

async function loadSpecialPanelData() {
  const [badges, categories, events, users] = await Promise.all([
    prisma.badge.findMany({
      include: { _count: { select: { assignments: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.category.findMany({
      include: {
        subcategories: { orderBy: { name: "asc" } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.communityEvent.findMany({
      include: { _count: { select: { posts: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isSuspended: true,
        userBadges: {
          select: {
            badgeId: true,
            badge: {
              select: { id: true, slug: true, name: true, icon: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return {
    badges: badges.map((b) => ({
      ...b,
      assignedCount: b._count?.assignments ?? 0,
      createdAt: b.createdAt.toISOString(),
    })),
    categories: categories.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      subcategories: c.subcategories.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
      })),
    })),
    events: events.map((ev) => ({
      ...ev,
      postsCount: ev._count?.posts ?? 0,
      startDate: ev.startDate.toISOString(),
      endDate: ev.endDate ? ev.endDate.toISOString() : null,
      createdAt: ev.createdAt.toISOString(),
    })),
    users: users.map((u) => ({
      ...u,
      badges: (u.userBadges || []).map((ub) => ub.badge),
    })),
  };
}

export async function GET() {
  const staff = await requireStaff();
  if (!staff) {
    return NextResponse.json(
      { error: "Akses ditolak. Khusus Moderator atau Administrator." },
      { status: 403 }
    );
  }

  try {
    const data = await loadSpecialPanelData();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Special GET error:", error);
    return NextResponse.json(
      { error: "Gagal memuat data Panel Spesial." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const staff = await requireStaff();
  if (!staff) {
    return NextResponse.json(
      { error: "Akses ditolak. Khusus Moderator atau Administrator." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const action =
      typeof body?.action === "string" ? body.action.trim().toUpperCase() : "";

    if (action === "CREATE_BADGE") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const description =
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : `Badge spesial ${name} dari tim pengawas BedahKarya.`;
      const icon = VALID_BADGE_ICONS.has(body.icon) ? body.icon : "award";

      if (name.length < 2 || name.length > 60) {
        return NextResponse.json(
          { error: "Nama badge harus 2 hingga 60 karakter." },
          { status: 400 }
        );
      }

      const baseSlug = slugifyKey(name) || `badge-${Date.now()}`;
      const existing = await prisma.badge.findUnique({
        where: { slug: baseSlug },
        select: { id: true },
      });
      const slug = existing ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug;

      const created = await prisma.badge.create({
        data: {
          slug,
          name,
          description: description.slice(0, 200),
          icon,
          createdById: staff.id,
        },
      });
      revalidateTaxonomy();

      return NextResponse.json(
        {
          message: `Badge "${created.name}" berhasil dibuat.`,
          badge: { ...created, assignedCount: 0, createdAt: created.createdAt.toISOString() },
        },
        { status: 201 }
      );
    }

    if (action === "ASSIGN_BADGE") {
      const userId = typeof body.userId === "string" ? body.userId.trim() : "";
      const badgeId = typeof body.badgeId === "string" ? body.badgeId.trim() : "";
      const note = typeof body.note === "string" ? body.note.trim().slice(0, 200) : null;

      if (!userId || !badgeId) {
        return NextResponse.json(
          { error: "Pengguna dan badge wajib dipilih." },
          { status: 400 }
        );
      }

      const [targetUser, targetBadge] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, username: true },
        }),
        prisma.badge.findUnique({
          where: { id: badgeId },
          select: { id: true, name: true },
        }),
      ]);

      if (!targetUser || !targetBadge) {
        return NextResponse.json(
          { error: "Pengguna atau badge tidak ditemukan." },
          { status: 404 }
        );
      }

      await prisma.userBadge.upsert({
        where: { userId_badgeId: { userId, badgeId } },
        update: { assignedById: staff.id, note },
        create: { userId, badgeId, assignedById: staff.id, note },
      });

      await createNotification({
        userId,
        category: "ADMIN_ANNOUNCEMENT",
        title: `Anda menerima badge ${targetBadge.name}!`,
        message: `Tim pengawas memberikan badge spesial "${targetBadge.name}" kepada profil @${targetUser.username}.`,
        linkUrl: `/profile/${targetUser.username}`,
      });

      return NextResponse.json(
        { message: `Badge "${targetBadge.name}" diberikan ke @${targetUser.username}.` },
        { status: 200 }
      );
    }

    if (action === "CREATE_CATEGORY") {
      const label = typeof body.label === "string" ? body.label.trim() : "";
      const shortLabel =
        typeof body.shortLabel === "string" && body.shortLabel.trim()
          ? body.shortLabel.trim().slice(0, 40)
          : label.replace(/^konten\s+/i, "").slice(0, 40);
      const description =
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : `Ruang publikasi dan diskusi untuk ${label}.`;

      if (label.length < 2 || label.length > 80) {
        return NextResponse.json(
          { error: "Nama kategori harus 2 hingga 80 karakter." },
          { status: 400 }
        );
      }

      const key =
        slugifyKey(label.replace(/^konten\s+/i, ""), { uppercase: true }).slice(
          0,
          60
        ) || `KAT_${Date.now().toString().slice(-4)}`;

      const exists = await prisma.category.findUnique({
        where: { key },
        select: { id: true },
      });
      if (exists) {
        return NextResponse.json(
          { error: `Kategori dengan kunci "${key}" sudah tersedia.` },
          { status: 409 }
        );
      }

      const created = await prisma.category.create({
        data: {
          key,
          label,
          shortLabel,
          description,
          sortOrder: 50,
          createdById: staff.id,
        },
        include: { subcategories: true },
      });
      revalidateTaxonomy();

      return NextResponse.json(
        {
          message: `Kategori "${created.label}" berhasil ditambahkan.`,
          category: { ...created, createdAt: created.createdAt.toISOString() },
        },
        { status: 201 }
      );
    }

    if (action === "CREATE_SUBCATEGORY") {
      const categoryId =
        typeof body.categoryId === "string" ? body.categoryId.trim() : "";
      const name = typeof body.name === "string" ? body.name.trim() : "";

      if (!categoryId || name.length < 2 || name.length > 80) {
        return NextResponse.json(
          { error: "Kategori induk dan nama subkategori (2–80 karakter) wajib diisi." },
          { status: 400 }
        );
      }

      const parentCat = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true, key: true, shortLabel: true },
      });
      if (!parentCat) {
        return NextResponse.json(
          { error: "Kategori induk tidak ditemukan." },
          { status: 404 }
        );
      }

      const baseSlug = `${parentCat.key.toLowerCase()}-${slugifyKey(name)}`;
      const existing = await prisma.subcategory.findUnique({
        where: { slug: baseSlug },
        select: { id: true },
      });
      const slug = existing
        ? `${baseSlug}-${Date.now().toString().slice(-4)}`
        : baseSlug;

      const created = await prisma.subcategory.create({
        data: {
          slug: slug.slice(0, 80),
          name,
          categoryId: parentCat.id,
        },
      });
      revalidateTaxonomy();

      return NextResponse.json(
        {
          message: `Subkategori "${created.name}" berhasil ditambahkan.`,
          subcategory: { ...created, createdAt: created.createdAt.toISOString() },
        },
        { status: 201 }
      );
    }

    if (action === "CREATE_EVENT") {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const description =
        typeof body.description === "string" ? body.description.trim() : "";
      const themeTag =
        typeof body.themeTag === "string" && body.themeTag.trim()
          ? slugifyKey(body.themeTag).slice(0, 60)
          : null;
      const announce = body.announce !== false;

      if (title.length < 3 || title.length > 120 || description.length < 10) {
        return NextResponse.json(
          { error: "Judul event (min. 3 huruf) dan deskripsi (min. 10 huruf) wajib diisi." },
          { status: 400 }
        );
      }

      let endDate = null;
      if (typeof body.endDate === "string" && body.endDate.trim()) {
        const parsed = new Date(body.endDate.trim());
        if (!Number.isNaN(parsed.getTime())) {
          endDate = parsed;
        }
      }

      const baseSlug = slugifyKey(title.replace(/^event\s+/i, "")) || `event-${Date.now()}`;
      const existing = await prisma.communityEvent.findUnique({
        where: { slug: baseSlug },
        select: { id: true },
      });
      const slug = existing
        ? `${baseSlug}-${Date.now().toString().slice(-4)}`
        : baseSlug;

      const created = await prisma.communityEvent.create({
        data: {
          slug: slug.slice(0, 80),
          title,
          description,
          themeTag,
          isActive: true,
          endDate,
          createdById: staff.id,
        },
      });

      if (announce) {
        await createNotification({
          userId: null,
          category: "ADMIN_ANNOUNCEMENT",
          title: `Event Baru: ${created.title}`,
          message: created.description,
          linkUrl: `/events`,
        });
      }

      revalidateTaxonomy();

      return NextResponse.json(
        {
          message: `Event "${created.title}" berhasil dibuat.`,
          event: {
            ...created,
            postsCount: 0,
            startDate: created.startDate.toISOString(),
            endDate: created.endDate ? created.endDate.toISOString() : null,
            createdAt: created.createdAt.toISOString(),
          },
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { error: "Aksi Panel Spesial tidak dikenali." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Special POST error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memproses Panel Spesial." },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  const staff = await requireStaff();
  if (!staff) {
    return NextResponse.json(
      { error: "Akses ditolak. Khusus Moderator atau Administrator." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const action =
      typeof body?.action === "string" ? body.action.trim().toUpperCase() : "";

    if (action === "TOGGLE_EVENT") {
      const eventId =
        typeof body.eventId === "string" ? body.eventId.trim() : "";
      if (!eventId) {
        return NextResponse.json(
          { error: "ID event wajib disertakan." },
          { status: 400 }
        );
      }

      const ev = await prisma.communityEvent.findUnique({
        where: { id: eventId },
        select: { id: true, isActive: true },
      });
      if (!ev) {
        return NextResponse.json(
          { error: "Event tidak ditemukan." },
          { status: 404 }
        );
      }

      const nextActive =
        typeof body.isActive === "boolean" ? body.isActive : !ev.isActive;
      const updated = await prisma.communityEvent.update({
        where: { id: eventId },
        data: { isActive: nextActive },
      });
      revalidateTaxonomy();

      return NextResponse.json(
        {
          message: nextActive ? "Event diaktifkan." : "Event dinonaktifkan.",
          event: {
            ...updated,
            startDate: updated.startDate.toISOString(),
            endDate: updated.endDate ? updated.endDate.toISOString() : null,
            createdAt: updated.createdAt.toISOString(),
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "Aksi PATCH Panel Spesial tidak valid." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Special PATCH error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui data Panel Spesial." },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const staff = await requireStaff();
  if (!staff) {
    return NextResponse.json(
      { error: "Akses ditolak. Khusus Moderator atau Administrator." },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = request.nextUrl;
    const resource = (searchParams.get("resource") || "").trim();
    const id = (searchParams.get("id") || "").trim();

    if (resource === "userBadge") {
      const userId = (searchParams.get("userId") || "").trim();
      const badgeId = (searchParams.get("badgeId") || "").trim();
      if (!userId || !badgeId) {
        return NextResponse.json(
          { error: "Parameter userId dan badgeId wajib diisi." },
          { status: 400 }
        );
      }
      await prisma.userBadge.deleteMany({ where: { userId, badgeId } });
      return NextResponse.json(
        { message: "Badge pengguna berhasil dicabut." },
        { status: 200 }
      );
    }

    if (!resource || !id) {
      return NextResponse.json(
        { error: "Parameter resource dan id wajib diisi." },
        { status: 400 }
      );
    }

    if (resource === "badge") {
      await prisma.badge.delete({ where: { id } });
      revalidateTaxonomy();
      return NextResponse.json({ message: "Badge dihapus." }, { status: 200 });
    }

    if (resource === "subcategory") {
      const sub = await prisma.subcategory.findUnique({
        where: { id },
        select: { slug: true },
      });
      if (!sub) {
        return NextResponse.json(
          { error: "Subkategori tidak ditemukan." },
          { status: 404 }
        );
      }
      await prisma.$transaction([
        prisma.post.updateMany({
          where: { subcategory: sub.slug },
          data: { subcategory: null },
        }),
        prisma.subcategory.delete({ where: { id } }),
      ]);
      revalidateTaxonomy();
      return NextResponse.json(
        { message: "Subkategori dihapus." },
        { status: 200 }
      );
    }

    if (resource === "category") {
      const cat = await prisma.category.findUnique({
        where: { id },
        select: { id: true, key: true, label: true },
      });
      if (!cat) {
        return NextResponse.json(
          { error: "Kategori tidak ditemukan." },
          { status: 404 }
        );
      }

      const postsUsing = await prisma.post.count({
        where: { category: cat.key },
      });
      if (postsUsing > 0) {
        return NextResponse.json(
          {
            error: `Tidak dapat menghapus kategori "${cat.label}" karena masih digunakan oleh ${postsUsing} konten.`,
          },
          { status: 409 }
        );
      }

      await prisma.category.delete({ where: { id } });
      revalidateTaxonomy();
      return NextResponse.json({ message: "Kategori dihapus." }, { status: 200 });
    }

    if (resource === "event") {
      await prisma.communityEvent.delete({ where: { id } });
      revalidateTaxonomy();
      return NextResponse.json({ message: "Event dihapus." }, { status: 200 });
    }

    return NextResponse.json(
      { error: "Tipe resource tidak valid." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Special DELETE error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus item Panel Spesial." },
      { status: 500 }
    );
  }
}
