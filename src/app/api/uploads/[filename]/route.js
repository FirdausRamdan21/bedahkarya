import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp|gif)$/;

const MIME_BY_EXT = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(_request, { params }) {
  try {
    const { filename } = await params;
    const baseName = path.basename(decodeURIComponent(filename || ""));

    if (!SAFE_FILENAME_REGEX.test(baseName)) {
      return NextResponse.json(
        { error: "Berkas tidak ditemukan." },
        { status: 404 }
      );
    }

    const ext = baseName.split(".").pop().toLowerCase();
    const contentType = MIME_BY_EXT[ext] || "application/octet-stream";
    const filePath = path.join(process.cwd(), "public", "uploads", baseName);

    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Berkas gambar tidak ditemukan." },
      { status: 404 }
    );
  }
}
