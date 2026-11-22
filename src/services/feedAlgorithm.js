export function parseTags(tagsString) {
  if (typeof tagsString !== "string") return [];
  return tagsString
    .split(",")
    .map((tag) => tag.trim().toLowerCase().replace(/^#/, ""))
    .filter(Boolean);
}

/**
 * Membersihkan input tag dari form menjadi string koma yang seragam.
 * Maksimal 8 tag unik per karya.
 */
export function normalizeTagsInput(rawTags) {
  if (typeof rawTags !== "string") return "";

  const unique = [];
  const seen = new Set();

  for (const part of rawTags.split(/[\s,]+/)) {
    const cleaned = part
      .trim()
      .toLowerCase()
      .replace(/^#+/, "")
      .replace(/[^a-z0-9_-]/g, "");

    if (cleaned && !seen.has(cleaned)) {
      seen.add(cleaned);
      unique.push(cleaned);
      if (unique.length >= 8) break;
    }
  }

  return unique.join(",");
}

/**
 * Menghitung frekuensi tag terpopuler dari daftar karya.
 */
export function extractPopularTags(posts, limit = 12) {
  const counts = new Map();

  for (const post of posts) {
    const tags = new Set(parseTags(post.tags));
    for (const tag of tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.tag.localeCompare(b.tag);
    })
    .slice(0, limit);
}

/**
 * Mengurutkan postingan feed berdasarkan relevansi akun yang diikuti,
 * kecocokan tag minat, interaksi, dan kebaruan konten.
 */
export function sortFeedPosts(posts, { followingIds = [], preferredTags = [] } = {}) {
  const followingSet = new Set(followingIds);
  const preferredTagSet = new Set(
    preferredTags
      .map((tag) => tag.trim().toLowerCase().replace(/^#/, ""))
      .filter(Boolean)
  );

  return [...posts].sort((a, b) => {
    const scoreA = computePostScore(a, followingSet, preferredTagSet);
    const scoreB = computePostScore(b, followingSet, preferredTagSet);
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function computePostScore(post, followingSet, preferredTagSet) {
  let score = 0;

  if (followingSet.has(post.authorId)) {
    score += 40;
  }

  const postTags = parseTags(post.tags);
  for (const tag of postTags) {
    if (preferredTagSet.has(tag)) {
      score += 15;
    }
  }

  const likesCount = post._count?.likes ?? 0;
  const commentsCount = post._count?.comments ?? 0;
  score += likesCount * 2 + commentsCount * 3;

  const ageHours = Math.max(
    0,
    (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60)
  );
  score += Math.max(0, 24 - ageHours * 0.25);

  return score;
}
