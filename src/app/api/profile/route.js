import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActiveUser, SAFE_USER_SELECT } from "@/lib/auth";
import { deleteLocalUpload, saveLocalImage } from "@/lib/uploads";

export async function PATCH(request) {
  let newlySavedAvatarUrl = null;

  try {
    const { user, errorResponse } = await requireActiveUser();
    if (errorResponse) return errorResponse;

    const contentType = request.headers.get("content-type") || "";
    let name = "";
    let bio = "";
    let avatarFile = null;
    let removeAvatar = false;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData().catch(() => null);
      if (!formData) {
        return NextResponse.json(
          { error: "Format permintaan FormData tidak valid." },
          { status: 400 }
        );
      }

      const rawName = formData.get("name");
      const rawBio = formData.get("bio");
      const rawAvatar = formData.get("avatar");
      const rawRemove = formData.get("removeAvatar");

      name = typeof rawName === "string" ? rawName.trim() : "";
      bio = typeof rawBio === "string" ? rawBio.trim() : "";
      avatarFile = rawAvatar;
      removeAvatar = rawRemove === "true";
    } else {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return NextResponse.json(
          { error: "Format permintaan tidak valid." },
          { status: 400 }
        );
      }

      name = typeof body.name === "string" ? body.name.trim() : "";
      bio = typeof body.bio === "string" ? body.bio.trim() : "";
      removeAvatar = body.removeAvatar === true;
    }

    if (name.length < 2 || name.length > 60) {
      return NextResponse.json(
        { error: "Nama lengkap harus 2 hingga 60 karakter." },
        { status: 400 }
      );
    }

    if (bio.length > 300) {
      return NextResponse.json(
        { error: "Bio maksimal 300 karakter." },
        { status: 400 }
      );
    }

    const hasUploadedFile =
      avatarFile &&
      typeof avatarFile === "object" &&
      typeof avatarFile.arrayBuffer === "function" &&
      avatarFile.size > 0;

    let avatarPatch = {};
    let shouldDeleteOldAvatar = false;

    if (hasUploadedFile) {
      const saved = await saveLocalImage(avatarFile, {
        prefix: "avatar",
        maxBytes: 2 * 1024 * 1024,
      });

      if (!saved.ok) {
        return NextResponse.json({ error: saved.error }, { status: 400 });
      }

      newlySavedAvatarUrl = saved.url;
      avatarPatch = { avatarUrl: saved.url };
      shouldDeleteOldAvatar = Boolean(user.avatarUrl);
    } else if (removeAvatar) {
      avatarPatch = { avatarUrl: null };
      shouldDeleteOldAvatar = Boolean(user.avatarUrl);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        bio: bio || null,
        ...avatarPatch,
      },
      select: SAFE_USER_SELECT,
    });

    if (shouldDeleteOldAvatar && user.avatarUrl !== updatedUser.avatarUrl) {
      await deleteLocalUpload(user.avatarUrl);
    }

    return NextResponse.json(
      {
        message: "Profil berhasil diperbarui.",
        user: updatedUser,
      },
      { status: 200 }
    );
  } catch (error) {
    if (newlySavedAvatarUrl) {
      await deleteLocalUpload(newlySavedAvatarUrl);
    }
    console.error("Gagal memperbarui profil:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memperbarui profil." },
      { status: 500 }
    );
  }
}
