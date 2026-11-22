import crypto from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const ALLOWED_IMAGE_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function saveLocalImage(
  file,
  { prefix = "post", maxBytes = 5 * 1024 * 1024 } = {}
) {
  if (
    !file ||
    typeof file !== "object" ||
    typeof file.arrayBuffer !== "function" ||
    file.size <= 0
  ) {
    return {
      ok: false,
      error: "Berkas gambar wajib dipilih.",
    };
  }

  const extension = ALLOWED_IMAGE_MIME[file.type];
  if (!extension) {
    return {
      ok: false,
      error:
        "Format gambar tidak didukung. Gunakan file JPG, PNG, WebP, atau GIF.",
    };
  }

  if (file.size > maxBytes) {
    const maxMb = Math.max(1, Math.round(maxBytes / (1024 * 1024)));
    return {
      ok: false,
      error: `Ukuran berkas gambar maksimal ${maxMb} MB.`,
    };
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const safePrefix = String(prefix || "file").replace(/[^a-z0-9_-]/gi, "");
  const filename = `${safePrefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
  const targetPath = path.join(uploadDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(targetPath, buffer);

  return {
    ok: true,
    filename,
    url: `/api/uploads/${filename}`,
  };
}

export async function deleteLocalUpload(url) {
  if (typeof url !== "string" || !url.startsWith("/api/uploads/")) {
    return;
  }

  const baseName = path.basename(url);
  if (!baseName) return;

  const targetPath = path.join(process.cwd(), "public", "uploads", baseName);
  await unlink(targetPath).catch(() => {});
}
