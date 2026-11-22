export const CONTENT_CATEGORIES = [
  {
    key: "KARYA",
    label: "Konten Karya",
    shortLabel: "Karya",
    description:
      "Karya visual, ilustrasi, desain grafis, fotografi, antarmuka pengguna, dan kreasi orisinal lainnya.",
    badgeClass:
      "border-[#2563EB]/25 bg-[#2563EB]/10 text-[#2563EB] dark:border-[#3B82F6]/35 dark:bg-[#2563EB]/20 dark:text-[#93C5FD]",
    subcategories: [
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
    description:
      "Humor visual, parodi kreatif, dan konten hiburan ringan khas komunitas kreator.",
    badgeClass:
      "border-[#1E293B]/20 bg-[#CBD5E1]/50 text-[#1E293B] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
    subcategories: [
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
    description:
      "Bedah teknis kode, arsitektur aplikasi, tipografi, grid tata letak, dan evaluasi struktur mendalam.",
    badgeClass:
      "border-[#2563EB]/30 bg-[#3B82F6]/12 text-[#1E293B] dark:border-[#3B82F6]/40 dark:bg-[#3B82F6]/20 dark:text-slate-100",
    subcategories: [
      { slug: "teknis-kode", name: "Kode & Arsitektur" },
      { slug: "teknis-uiux", name: "UI/UX & Sistem Desain" },
      { slug: "teknis-tipografi", name: "Tipografi & Grid" },
    ],
  },
  {
    key: "PENDIDIKAN",
    label: "Konten Pendidikan",
    shortLabel: "Pendidikan",
    description:
      "Materi belajar, tutorial, catatan studi, infografis, dan berbagi wawasan edukatif.",
    badgeClass:
      "border-[#1E293B]/20 bg-[#F8FAFC] text-[#1E293B] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
    subcategories: [
      { slug: "pendidikan-tutorial", name: "Tutorial" },
      { slug: "pendidikan-infografis", name: "Infografis" },
      { slug: "pendidikan-catatan", name: "Catatan Studi" },
    ],
  },
  {
    key: "SOSIAL",
    label: "Konten Sosial",
    shortLabel: "Sosial",
    description:
      "Diskusi komunitas, opini kreatif, pengumuman kolaborasi, dan cerita keseharian kreator.",
    badgeClass:
      "border-[#2563EB]/20 bg-[#CBD5E1]/35 text-[#1E293B] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
    subcategories: [
      { slug: "sosial-diskusi", name: "Diskusi Komunitas" },
      { slug: "sosial-kolaborasi", name: "Kolaborasi" },
      { slug: "sosial-cerita", name: "Opini & Cerita" },
    ],
  },
];

export const CATEGORY_MAP = Object.fromEntries(
  CONTENT_CATEGORIES.map((item) => [item.key, item])
);

const DEFAULT_CUSTOM_BADGE_CLASS =
  "border-[#2563EB]/25 bg-[#2563EB]/10 text-[#2563EB] dark:border-[#3B82F6]/35 dark:bg-[#2563EB]/20 dark:text-[#93C5FD]";

export function slugifyKey(raw, { uppercase = false } = {}) {
  const base = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]+/g, "")
    .replace(/[\s_]+/g, uppercase ? "_" : "-")
    .replace(/^[-_]+|[-_]+$/g, "");
  return uppercase ? base.toUpperCase() : base;
}

export function isValidCategory(value) {
  return (
    typeof value === "string" &&
    /^[A-Z0-9_]{2,64}$/.test(value.trim().toUpperCase())
  );
}

export function getCategoryMeta(value, customCategories = []) {
  const key = typeof value === "string" ? value.trim().toUpperCase() : "KARYA";
  if (Array.isArray(customCategories) && customCategories.length > 0) {
    const found = customCategories.find((item) => item.key === key);
    if (found) {
      return {
        ...found,
        badgeClass:
          found.badgeClass ||
          CATEGORY_MAP[key]?.badgeClass ||
          DEFAULT_CUSTOM_BADGE_CLASS,
      };
    }
  }
  if (CATEGORY_MAP[key]) {
    return CATEGORY_MAP[key];
  }
  if (key && /^[A-Z0-9_]{2,64}$/.test(key)) {
    const pretty = key
      .split("_")
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(" ");
    return {
      key,
      label: pretty,
      shortLabel: pretty,
      description: `Konten komunitas pada kategori ${pretty}.`,
      badgeClass: DEFAULT_CUSTOM_BADGE_CLASS,
      subcategories: [],
    };
  }
  return CONTENT_CATEGORIES[0];
}

export function getSubcategoryLabel(slug, categories = CONTENT_CATEGORIES) {
  if (!slug) return "";
  for (const cat of categories) {
    const sub = (cat.subcategories || []).find((s) => s.slug === slug);
    if (sub) return sub.name;
  }
  return slug.replace(/^[a-z0-9]+-/, "").replace(/-/g, " ");
}

const LINK_PATTERN =
  /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|id|net|org|io|co|gg|me|xyz|tv|app|dev|link|info|biz|edu|gov)\b)/i;

export function containsLink(text) {
  if (typeof text !== "string") return false;
  return LINK_PATTERN.test(text);
}

export function countWords(text) {
  if (typeof text !== "string") return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function validateCaptionLength(text, { isDraft = false } = {}) {
  const value = typeof text === "string" ? text.trim() : "";
  const charCount = value.length;
  const wordCount = countWords(value);

  if (!isDraft && charCount < 50) {
    return {
      ok: false,
      charCount,
      wordCount,
      error: `Deskripsi minimal 50 karakter (saat ini ${charCount} karakter).`,
    };
  }

  if (isDraft && charCount < 1) {
    return {
      ok: false,
      charCount,
      wordCount,
      error: "Tulis setidaknya ringkasan singkat untuk menyimpan draf.",
    };
  }

  if (charCount > 2200) {
    return {
      ok: false,
      charCount,
      wordCount,
      error: `Deskripsi maksimal 2.200 karakter termasuk spasi (saat ini ${charCount} karakter).`,
    };
  }

  if (wordCount > 500) {
    return {
      ok: false,
      charCount,
      wordCount,
      error: `Deskripsi maksimal 500 kata (saat ini ${wordCount} kata).`,
    };
  }

  return {
    ok: true,
    charCount,
    wordCount,
    error: "",
  };
}

export function validateExternalUrl(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    return { ok: true, value: null };
  }

  const trimmed = rawUrl.trim();
  if (trimmed.length > 500) {
    return { ok: false, error: "Tautan terlalu panjang (maksimal 500 karakter)." };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        ok: false,
        error: "Tautan eksternal harus diawali dengan http:// atau https://.",
      };
    }
    return { ok: true, value: parsed.toString() };
  } catch {
    return {
      ok: false,
      error: "Format tautan eksternal tidak valid (contoh: https://contoh.id).",
    };
  }
}

export function normalizeMentionsInput(rawMentions) {
  if (typeof rawMentions !== "string" || !rawMentions.trim()) {
    return null;
  }

  const seen = new Set();
  const list = [];

  for (const token of rawMentions.split(/[\s,]+/)) {
    const cleaned = token
      .trim()
      .toLowerCase()
      .replace(/^@+/, "")
      .replace(/[^a-z0-9_]/g, "");

    if (cleaned.length >= 3 && !seen.has(cleaned)) {
      seen.add(cleaned);
      list.push(cleaned);
      if (list.length >= 10) break;
    }
  }

  return list.length > 0 ? list.join(",") : null;
}

export function parseMentions(mentionsString) {
  if (typeof mentionsString !== "string") return [];
  return mentionsString
    .split(",")
    .map((m) => m.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
}

export function validateRegisterPassword(password) {
  const value = typeof password === "string" ? password : "";
  const hasMinLength = value.length >= 6;
  const hasNumber = /\d/.test(value);
  const hasSymbol = /[^a-zA-Z0-9\s]/.test(value);
  const hasLetter = /[a-zA-Z]/.test(value);

  if (!hasMinLength) {
    return {
      ok: false,
      strength: "weak",
      hasMinLength,
      hasNumber,
      hasSymbol,
      hasLetter,
      error: "Kata sandi minimal 6 karakter dan harus mengandung angka.",
    };
  }

  if (!hasNumber) {
    return {
      ok: false,
      strength: "weak",
      hasMinLength,
      hasNumber,
      hasSymbol,
      hasLetter,
      error:
        "Kata sandi wajib mengandung minimal satu angka (tambahkan simbol seperti +-@#$% agar lebih kuat).",
    };
  }

  const strength =
    hasMinLength && hasNumber && hasSymbol ? "strong" : "medium";

  return {
    ok: true,
    strength,
    hasMinLength,
    hasNumber,
    hasSymbol,
    hasLetter,
    error: "",
  };
}
