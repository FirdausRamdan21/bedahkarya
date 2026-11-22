import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600"],
});

export const metadata = {
  title: "BedahKarya — Ruang Kurasi & Ulasan Karya Kreatif",
  description:
    "Platform media sosial kurasi karya kreatif, diskusi komunitas lintas kategori konten, dan moderasi yang aman bagi kreator maupun pelajar.",
};

export default async function RootLayout({ children }) {
  let isDark = false;
  try {
    const user = await getCurrentUser();
    isDark = user?.theme === "DARK";
  } catch {
    isDark = false;
  }

  return (
    <html
      lang="id"
      className={`${plusJakarta.variable} ${jetbrainsMono.variable} ${
        isDark ? "dark" : ""
      }`}
    >
      <body className="min-h-screen bg-[#F8FAFC] text-[#1E293B] antialiased selection:bg-[#2563EB]/20 selection:text-[#1E293B] dark:bg-[#0F172A] dark:text-[#F8FAFC]">
        {children}
      </body>
    </html>
  );
}
