const BAD_WORDS = [
  "anjing",
  "bangsat",
  "bajingan",
  "bego",
  "bodoh",
  "goblok",
  "tolol",
  "sampah",
  "brengsek",
  "keparat",
  "pecundang",
  "idiot",
  "norak",
  "jelek banget",
  "kontol",
  "memek",
  "ngentot",
  "jancok",
  "kampret",
  "bacot",
  "sialan",
  "kunyuk",
];

const LEET_MAP = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  "$": "s",
  "!": "i",
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeLeetspeak(value) {
  return value.replace(/[013457@$!]/g, (char) => LEET_MAP[char] || char);
}

/**
 * Memeriksa teks komentar terhadap kamus kata terlarang (case-insensitive),
 * termasuk variasi leetspeak dan pengulangan huruf.
 */
export function checkCommentModeration(text) {
  if (typeof text !== "string" || !text.trim()) {
    return {
      isFlagged: false,
      matchedWords: [],
    };
  }

  const lower = text.toLowerCase();
  const leetNormalized = normalizeLeetspeak(lower);
  const collapsedRepeated = leetNormalized.replace(/([a-z])\1+/g, "$1");

  const candidates = [lower, leetNormalized, collapsedRepeated];
  const matchedSet = new Set();

  for (const word of BAD_WORDS) {
    const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, "i");
    if (candidates.some((candidate) => pattern.test(candidate))) {
      matchedSet.add(word);
    }
  }

  const matchedWords = Array.from(matchedSet);
  return {
    isFlagged: matchedWords.length > 0,
    matchedWords,
  };
}

export { BAD_WORDS };
