import prisma from "@/lib/prisma";

export const NOTIFICATION_CATEGORIES = [
  { key: "SYSTEM", label: "Sistem" },
  { key: "ADMIN_ANNOUNCEMENT", label: "Pengumuman Admin" },
  { key: "WARNING", label: "Peringatan" },
  { key: "INTERACTION", label: "Interaksi" },
  { key: "HISTORY", label: "Riwayat" },
];

export async function createNotification({
  userId = null,
  category,
  title,
  message,
  linkUrl = null,
}) {
  try {
    if (!category || !title || !message) return null;
    return await prisma.notification.create({
      data: {
        userId,
        category,
        title: String(title).slice(0, 160),
        message: String(message).slice(0, 1000),
        linkUrl,
      },
    });
  } catch (error) {
    console.error("Gagal mencatat notifikasi:", error);
    return null;
  }
}
