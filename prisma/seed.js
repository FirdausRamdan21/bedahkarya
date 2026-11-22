const { PrismaClient } = require("../src/generated/prisma-v3");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const modPasswordHash = await bcrypt.hash("mod123", 10);
  const userPasswordHash = await bcrypt.hash("user123", 10);

  // 1. Akun default (tidak menimpa password/data user lain yang sudah mendaftar)
  const admin = await prisma.user.upsert({
    where: { email: "admin@bedahkarya.id" },
    update: { role: "ADMIN", isSuspended: false },
    create: {
      username: "admin",
      name: "Admin BedahKarya",
      email: "admin@bedahkarya.id",
      phone: "081100001000",
      password: adminPasswordHash,
      bio: "Kurator & pengawas ekosistem diskusi sehat di BedahKarya.",
      role: "ADMIN",
      isSuspended: false,
    },
  });

  const moderator = await prisma.user.upsert({
    where: { email: "mod@bedahkarya.id" },
    update: { role: "MODERATOR", isSuspended: false },
    create: {
      username: "mod_bedahkarya",
      name: "Moderator BedahKarya",
      email: "mod@bedahkarya.id",
      phone: "081100001001",
      password: modPasswordHash,
      bio: "Tim moderator komunitas yang menjaga kenyamanan dan tata tertib BedahKarya.",
      role: "MODERATOR",
      isSuspended: false,
    },
  });

  const nadia = await prisma.user.upsert({
    where: { email: "nadia@bedahkarya.id" },
    update: {},
    create: {
      username: "nadia_ilustrasi",
      name: "Nadia Putri",
      email: "nadia@bedahkarya.id",
      phone: "081234567801",
      password: userPasswordHash,
      bio: "Siswa DKV & ilustrator pemula. Senang bereksperimen dengan warna hangat dan poster budaya.",
      role: "USER",
    },
  });

  const raka = await prisma.user.upsert({
    where: { email: "raka@bedahkarya.id" },
    update: {},
    create: {
      username: "raka_uiux",
      name: "Raka Pratama",
      email: "raka@bedahkarya.id",
      phone: "081234567802",
      password: userPasswordHash,
      bio: "Pelajar SMK RPL yang mendalami desain antarmuka aplikasi mobile & sistem komponen.",
      role: "USER",
    },
  });

  const bima = await prisma.user.upsert({
    where: { email: "bima@bedahkarya.id" },
    update: {},
    create: {
      username: "bima_typo",
      name: "Bima Kusuma",
      email: "bima@bedahkarya.id",
      phone: "081234567803",
      password: userPasswordHash,
      bio: "Penggemar tipografi editorial, poster pameran, dan tata letak grid modular.",
      role: "USER",
    },
  });

  // 2. Kategori & Subkategori Konten (dapat ditambah/kelola Moderator & Admin)
  const categoriesSeed = [
    {
      key: "KARYA",
      label: "Konten Karya",
      shortLabel: "Karya",
      sortOrder: 1,
      description:
        "Karya visual, ilustrasi, desain grafis, fotografi, antarmuka pengguna, dan kreasi orisinal lainnya.",
      subs: [
        { slug: "karya-sains", name: "Karya Sains" },
        { slug: "karya-ilustrator", name: "Ilustrator" },
        { slug: "karya-web", name: "Web" },
        { slug: "karya-desain-grafis", name: "Desain Grafis" },
        { slug: "karya-fotografi", name: "Fotografi" },
      ],
    },
    {
      key: "MEME",
      label: "Konten Meme",
      shortLabel: "Meme",
      sortOrder: 2,
      description:
        "Humor visual, parodi kreatif, dan konten hiburan ringan khas komunitas kreator.",
      subs: [
        { slug: "meme-sains", name: "Meme Sains" },
        { slug: "meme-kocak", name: "Meme Kocak" },
        { slug: "meme-dark", name: "Meme Dark" },
        { slug: "meme-kreator", name: "Meme Kreator" },
      ],
    },
    {
      key: "TEKNIS",
      label: "Konten Teknis",
      shortLabel: "Teknis",
      sortOrder: 3,
      description:
        "Bedah teknis kode, arsitektur aplikasi, tipografi, grid tata letak, dan evaluasi struktur mendalam.",
      subs: [
        { slug: "teknis-kode", name: "Kode & Arsitektur" },
        { slug: "teknis-uiux", name: "UI/UX & Sistem Desain" },
        { slug: "teknis-tipografi", name: "Tipografi & Grid" },
      ],
    },
    {
      key: "PENDIDIKAN",
      label: "Konten Pendidikan",
      shortLabel: "Pendidikan",
      sortOrder: 4,
      description:
        "Materi belajar, tutorial, catatan studi, infografis, dan berbagi wawasan edukatif.",
      subs: [
        { slug: "pendidikan-tutorial", name: "Tutorial" },
        { slug: "pendidikan-infografis", name: "Infografis" },
        { slug: "pendidikan-catatan", name: "Catatan Studi" },
      ],
    },
    {
      key: "SOSIAL",
      label: "Konten Sosial",
      shortLabel: "Sosial",
      sortOrder: 5,
      description:
        "Diskusi komunitas, opini kreatif, pengumuman kolaborasi, dan cerita keseharian kreator.",
      subs: [
        { slug: "sosial-diskusi", name: "Diskusi Komunitas" },
        { slug: "sosial-kolaborasi", name: "Kolaborasi" },
        { slug: "sosial-cerita", name: "Opini & Cerita" },
      ],
    },
  ];

  for (const cat of categoriesSeed) {
    const savedCat = await prisma.category.upsert({
      where: { key: cat.key },
      update: {},
      create: {
        key: cat.key,
        label: cat.label,
        shortLabel: cat.shortLabel,
        description: cat.description,
        sortOrder: cat.sortOrder,
        createdById: admin.id,
      },
    });

    for (const sub of cat.subs) {
      await prisma.subcategory.upsert({
        where: { slug: sub.slug },
        update: {},
        create: {
          slug: sub.slug,
          name: sub.name,
          categoryId: savedCat.id,
        },
      });
    }
  }

  // 3. Special Badges (dikelola oleh Moderator & Admin di Panel Spesial)
  const badgesSeed = [
    {
      slug: "si-jenius",
      name: "Si Jenius",
      description:
        "Diberikan kepada kreator atau pengulas dengan analisis teknis dan gagasan brilian.",
      icon: "brain",
    },
    {
      slug: "si-keren",
      name: "Si Keren",
      description:
        "Apresiasi atas gaya visual, eksekusi estetika, dan karya yang memukau komunitas.",
      icon: "star",
    },
    {
      slug: "si-mekanik",
      name: "Si Mekanik",
      description:
        "Ahli membedah detail teknis, struktur kode, grid, dan penyelesaian masalah kompleks.",
      icon: "wrench",
    },
    {
      slug: "si-motivator",
      name: "Si Motivator",
      description:
        "Selalu hadir memberi semangat dan masukan hangat yang membangun bagi sesama kreator.",
      icon: "heart-handshake",
    },
    {
      slug: "si-master",
      name: "Si Master",
      description:
        "Penguasaan teknik dan konsistensi portofolio tingkat mahir di BedahKarya.",
      icon: "crown",
    },
    {
      slug: "si-influencer",
      name: "Si Influencer",
      description:
        "Penggerak tren positif dan inspirasi kolaborasi aktif di komunitas.",
      icon: "megaphone",
    },
  ];

  for (const badge of badgesSeed) {
    await prisma.badge.upsert({
      where: { slug: badge.slug },
      update: {},
      create: {
        ...badge,
        createdById: admin.id,
      },
    });
  }

  // 4. Community Events bawaan (Pembukaan Baru & Inspirasi)
  const eventsSeed = [
    {
      slug: "pembukaan-baru",
      title: "Event Pembukaan Baru",
      description:
        "Perayaan peluncuran fitur baru BedahKarya! Bagikan karya terbaik pertama Anda lengkap dengan kategori dan subkategori untuk saling dibedah bersama komunitas.",
      themeTag: "pembukaanbaru",
      isActive: true,
    },
    {
      slug: "inspirasi",
      title: "Event Inspirasi",
      description:
        "Ajang berbagi karya, studi kasus, dan catatan kreatif yang menginspirasi pelajar maupun kreator pemula untuk berani berkarya.",
      themeTag: "inspirasi",
      isActive: true,
    },
  ];

  const eventRecords = {};
  for (const ev of eventsSeed) {
    eventRecords[ev.slug] = await prisma.communityEvent.upsert({
      where: { slug: ev.slug },
      update: {},
      create: {
        ...ev,
        createdById: moderator.id,
      },
    });
  }

  // 5. Sample posts (tidak menimpa postingan yang sudah diubah atau dibuat user)
  const now = Date.now();
  const hoursAgo = (hours) => new Date(now - hours * 60 * 60 * 1000);

  const samplePosts = [
    {
      id: "seed-post-1",
      title: "Poster Ilustrasi Kopi Senja",
      caption:
        "Latihan pertama saya memadukan gradasi senja hangat dengan siluet pegunungan dan cangkir kopi vektor. Masih belajar menyeimbangkan hierarki teks judul dengan fokus objek utama di tengah.",
      imageUrl: "/uploads/samples/poster-kopi-senja.svg",
      imageFormat: "PORTRAIT",
      tags: "poster,ilustrasi,warna",
      category: "KARYA",
      subcategory: "karya-ilustrator",
      status: "PUBLISHED",
      externalLink: null,
      mentions: "bima_typo",
      eventId: eventRecords["pembukaan-baru"].id,
      authorId: nadia.id,
      publishedAt: hoursAgo(2),
      createdAt: hoursAgo(2),
    },
    {
      id: "seed-post-2",
      title: "Eksplorasi UI Dompet Pelajar",
      caption:
        "Konsep layar beranda aplikasi pencatat uang saku untuk siswa SMA dan SMK. Fokus utama rancangan ini ada pada kontras warna kartu saldo, keterbacaan angka nominal, serta jarak antar komponen agar nyaman diakses di layar kecil.",
      imageUrl: "/uploads/samples/ui-dompet-pelajar.svg",
      imageFormat: "PORTRAIT",
      tags: "uiux,mobile,fintech",
      category: "TEKNIS",
      subcategory: "teknis-uiux",
      status: "PUBLISHED",
      externalLink: "https://developer.mozilla.org/en-US/docs/Web/Accessibility",
      mentions: null,
      authorId: raka.id,
      publishedAt: hoursAgo(5),
      createdAt: hoursAgo(5),
    },
    {
      id: "seed-post-3",
      title: "Karakter Maskot Neon-Neko 07",
      caption:
        "Sketsa karakter kucing futuristik dengan gaya cyberpunk minimalis. Percobaan pertama membuat efek garis neon memakai layer stroke di editor vektor sambil menjaga bentuk siluet tetap mudah dikenali.",
      imageUrl: "/uploads/samples/ilustrasi-kucing-cyber.svg",
      imageFormat: "PORTRAIT",
      tags: "ilustrasi,karakter,vektor",
      category: "MEME",
      subcategory: "meme-kreator",
      status: "PUBLISHED",
      externalLink: null,
      mentions: null,
      authorId: nadia.id,
      publishedAt: hoursAgo(11),
      createdAt: hoursAgo(11),
    },
    {
      id: "seed-post-4",
      title: "Spesimen Tipografi Nusantara",
      caption:
        "Studi tata letak poster editorial menggunakan grid 12 kolom dan perpaduan serif klasik serta monospace. Terbuka untuk bedah detail soal tracking, leading, dan keseimbangan ruang kosong pada halaman cetak.",
      imageUrl: "/uploads/samples/tipografi-nusantara.svg",
      imageFormat: "PORTRAIT",
      tags: "tipografi,editorial,poster",
      category: "PENDIDIKAN",
      subcategory: "pendidikan-infografis",
      status: "PUBLISHED",
      externalLink: null,
      mentions: "nadia_ilustrasi",
      eventId: eventRecords["inspirasi"].id,
      authorId: bima.id,
      publishedAt: hoursAgo(20),
      createdAt: hoursAgo(20),
    },
    {
      id: "seed-post-5",
      title: "Identitas Visual Kedai Aksara",
      caption:
        "Eksplorasi logomark monogram huruf A yang dipadukan dengan bingkai lingkaran untuk usaha kedai buku dan kopi independen. Mohon masukan terkait proporsi ketebalan garis saat diperkecil ke ukuran avatar atau stempel.",
      imageUrl: "/uploads/samples/branding-kedai-aksara.svg",
      imageFormat: "PORTRAIT",
      tags: "branding,logo,tipografi",
      category: "KARYA",
      subcategory: "karya-desain-grafis",
      status: "PUBLISHED",
      externalLink: null,
      mentions: null,
      authorId: bima.id,
      publishedAt: hoursAgo(30),
      createdAt: hoursAgo(30),
    },
    {
      id: "seed-post-6",
      title: "Desain Web Katalog Perpustakaan",
      caption:
        "Rancangan awal halaman pencarian buku untuk portal perpustakaan sekolah menengah. Saya mencoba menjaga tampilan tetap sederhana agar siswa baru mudah menemukan lokasi rak buku dan status ketersediaannya.",
      imageUrl: "/uploads/samples/web-dashboard-perpustakaan.svg",
      imageFormat: "PORTRAIT",
      tags: "uiux,web,layout",
      category: "KARYA",
      subcategory: "karya-web",
      status: "PUBLISHED",
      externalLink: null,
      mentions: null,
      authorId: raka.id,
      publishedAt: hoursAgo(42),
      createdAt: hoursAgo(42),
    },
    {
      id: "seed-post-7",
      title: "Spanduk Landscape Pameran Desain Pelajar 2026",
      caption:
        "Rancangan spanduk rasio lebar 16:9 untuk acara pameran terbuka karya desain grafis dan pengembangan web pelajar. Dikirim dengan format landscape agar komposisi tipografi kiri dan elemen geometris kanan dapat dinilai secara utuh.",
      imageUrl: "/uploads/samples/landscape-pameran-desain.svg",
      imageFormat: "LANDSCAPE",
      tags: "pameran,banner,desain",
      category: "SOSIAL",
      subcategory: "sosial-kolaborasi",
      status: "PUBLISHED",
      externalLink: "https://example.org/pameran-desain-2026",
      mentions: "nadia_ilustrasi,raka_uiux",
      eventId: eventRecords["pembukaan-baru"].id,
      authorId: bima.id,
      publishedAt: hoursAgo(4),
      createdAt: hoursAgo(4),
    },
    {
      id: "seed-post-8",
      title: "Catatan Belajar Konsistensi Grid 8px untuk Pemula",
      caption:
        "Berbagi catatan ringkas hasil latihan selama sebulan terakhir: memakai kelipatan 8 piksel untuk margin, padding, dan jarak antar kartu membuat antarmuka jauh lebih rapi tanpa harus menebak-nebak ukuran secara manual. Semoga membantu teman-teman yang baru belajar tata letak antarmuka.",
      imageUrl: null,
      imageFormat: "TEXT",
      tags: "uiux,catatan,belajar",
      category: "SOSIAL",
      subcategory: "sosial-diskusi",
      status: "PUBLISHED",
      externalLink: null,
      mentions: "raka_uiux",
      eventId: eventRecords["inspirasi"].id,
      authorId: raka.id,
      publishedAt: hoursAgo(9),
      createdAt: hoursAgo(9),
    },
  ];

  for (const post of samplePosts) {
    const existing = await prisma.post.findUnique({
      where: { id: post.id },
      select: { id: true, subcategory: true, eventId: true },
    });
    if (!existing) {
      await prisma.post.create({ data: post });
    } else if (!existing.subcategory || (!existing.eventId && post.eventId)) {
      await prisma.post.update({
        where: { id: post.id },
        data: {
          subcategory: existing.subcategory || post.subcategory,
          eventId: existing.eventId || post.eventId || null,
        },
      });
    }
  }

  const followPairs = [
    { followerId: nadia.id, followingId: raka.id },
    { followerId: raka.id, followingId: nadia.id },
    { followerId: raka.id, followingId: bima.id },
    { followerId: bima.id, followingId: nadia.id },
  ];

  for (const pair of followPairs) {
    await prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId: pair.followerId,
          followingId: pair.followingId,
        },
      },
      update: {},
      create: pair,
    });
  }

  const likePairs = [
    { postId: "seed-post-1", userId: raka.id },
    { postId: "seed-post-1", userId: bima.id },
    { postId: "seed-post-2", userId: nadia.id },
    { postId: "seed-post-4", userId: raka.id },
    { postId: "seed-post-5", userId: nadia.id },
    { postId: "seed-post-7", userId: nadia.id },
  ];

  for (const like of likePairs) {
    await prisma.like.upsert({
      where: {
        postId_userId: {
          postId: like.postId,
          userId: like.userId,
        },
      },
      update: {},
      create: like,
    });
  }

  const bookmarkPairs = [
    { postId: "seed-post-4", userId: nadia.id },
    { postId: "seed-post-7", userId: raka.id },
  ];

  for (const bm of bookmarkPairs) {
    await prisma.bookmark.upsert({
      where: {
        postId_userId: {
          postId: bm.postId,
          userId: bm.userId,
        },
      },
      update: {},
      create: bm,
    });
  }

  const initialTrends = [
    { term: "#poster", count: 24 },
    { term: "#uiux", count: 19 },
    { term: "tipografi", count: 16 },
    { term: "ilustrasi", count: 14 },
    { term: "pameran", count: 11 },
  ];

  for (const trend of initialTrends) {
    await prisma.searchTrend.upsert({
      where: { term: trend.term },
      update: {},
      create: trend,
    });
  }

  const existingComments = await prisma.comment.count();
  if (existingComments === 0) {
    await prisma.comment.createMany({
      data: [
        {
          postId: "seed-post-1",
          userId: bima.id,
          isHelpful: true,
          content:
            "Palet warna senjanya hangat sekali! Untuk langkah berikutnya bisa coba beri sedikit ruang napas di bawah subjudul.",
        },
        {
          postId: "seed-post-2",
          userId: nadia.id,
          isHelpful: false,
          content:
            "Secara visual bersih dan rapi. Kartu pemasukan dan pengeluaran sudah jelas dibedakan lewat ikon warna.",
        },
        {
          postId: "seed-post-4",
          userId: raka.id,
          isHelpful: false,
          content:
            "Kontras antara blok hitam spesimen huruf dengan latar krem sangat kuat, mudah dipindai dari jauh.",
        },
      ],
    });
  }

  const existingNotifs = await prisma.notification.count();
  if (existingNotifs === 0) {
    await prisma.notification.createMany({
      data: [
        {
          userId: null,
          category: "SYSTEM",
          title: "Pembaruan Sistem BedahKarya v2.1",
          message:
            "Kini hadir Subkategori Konten, Event Komunitas (Pembukaan Baru & Inspirasi), Badge Spesial dari Panel Spesial, serta peningkatan kecepatan akses.",
          linkUrl: "/events",
        },
        {
          userId: null,
          category: "ADMIN_ANNOUNCEMENT",
          title: "Event Pembukaan Baru & Event Inspirasi Dimulai",
          message:
            "Unggah karya Anda pada Event Pembukaan Baru atau Event Inspirasi untuk berkesempatan memperoleh Badge Spesial dari tim kurasi.",
          linkUrl: "/events",
        },
      ],
    });
  }

  const existingReports = await prisma.report.count();
  if (existingReports === 0) {
    await prisma.report.create({
      data: {
        postId: "seed-post-3",
        reporterId: bima.id,
        reason:
          "Uji coba tiket laporan: mohon tinjau apakah kategori konten sudah sesuai.",
        status: "PENDING",
      },
    });
  }

  const existingModerationLogs = await prisma.moderationLog.count();
  if (existingModerationLogs === 0) {
    await prisma.moderationLog.create({
      data: {
        content:
          "[Simulasi log awal] Contoh komentar dengan kata terlarang yang diblokir otomatis.",
        matchedWords: "sampah",
        postId: "seed-post-1",
        userId: admin.id,
      },
    });
  }

  console.log("Seed BedahKarya (Revisi Final - Non-Destructive) selesai.");
}

main()
  .catch((error) => {
    console.error("Gagal menjalankan seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
