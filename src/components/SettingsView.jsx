"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  Check,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Moon,
  Phone,
  Sun,
} from "lucide-react";

export default function SettingsView({ initialUser }) {
  const router = useRouter();
  const [theme, setTheme] = useState(initialUser.theme || "LIGHT");
  const [hideLikeCountDefault, setHideLikeCountDefault] = useState(
    Boolean(initialUser.hideLikeCountDefault)
  );
  const [allowDmFromFollowing, setAllowDmFromFollowing] = useState(
    initialUser.allowDmFromFollowing !== false
  );
  const [emailNotifications, setEmailNotifications] = useState(
    initialUser.emailNotifications !== false
  );
  const [phone, setPhone] = useState(initialUser.phone || "");

  const [savingPref, setSavingPref] = useState(false);
  const [prefMessage, setPrefMessage] = useState("");
  const [prefError, setPrefError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPass, setSavingPass] = useState(false);
  const [passMessage, setPassMessage] = useState("");
  const [passError, setPassError] = useState("");

  async function savePreferences(patch, successText = "Pengaturan disimpan.") {
    setSavingPref(true);
    setPrefMessage("");
    setPrefError("");

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPrefError(data.error || "Gagal menyimpan pengaturan.");
        return;
      }

      if (patch.theme === "DARK") {
        document.documentElement.classList.add("dark");
      } else if (patch.theme === "LIGHT") {
        document.documentElement.classList.remove("dark");
      }

      setPrefMessage(successText);
      router.refresh();
    } catch {
      setPrefError("Gagal terhubung ke server.");
    } finally {
      setSavingPref(false);
    }
  }

  function handleThemeChange(nextTheme) {
    setTheme(nextTheme);
    savePreferences(
      { theme: nextTheme },
      nextTheme === "DARK"
        ? "Mode Gelap diaktifkan untuk akun ini."
        : "Mode Terang diaktifkan untuk akun ini."
    );
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPassError("");
    setPassMessage("");

    if (newPassword !== confirmPassword) {
      setPassError("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    setSavingPass(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHANGE_PASSWORD",
          currentPassword,
          newPassword,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPassError(data.error || "Gagal mengubah kata sandi.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPassMessage(data.message || "Kata sandi berhasil diperbarui.");
    } catch {
      setPassError("Gagal terhubung ke server.");
    } finally {
      setSavingPass(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Pengaturan Akun</h1>
        <p className="mt-1 text-xs text-slate-500">
          Preferensi berikut hanya berlaku untuk akun{" "}
          <span className="font-mono font-semibold">@{initialUser.username}</span>.
        </p>
      </div>

      {prefMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-[#2563EB]/30 bg-[#2563EB]/10 px-3.5 py-2.5 text-xs font-medium text-[#2563EB] dark:text-blue-300">
          <Check className="h-4 w-4 shrink-0" />
          <span>{prefMessage}</span>
        </div>
      )}

      {prefError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
          {prefError}
        </div>
      )}

      {/* 1. Tampilan: Dark Mode / Light Mode per akun */}
      <section className="rounded-xl border border-[#CBD5E1] bg-white p-5 dark:border-slate-700 dark:bg-[#1E293B]">
        <h2 className="text-sm font-bold">Tampilan</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Pilih tema terang atau gelap khusus untuk akun Anda.
        </p>

        <div className="mt-3.5 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={savingPref}
            onClick={() => handleThemeChange("LIGHT")}
            className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-xs font-semibold transition ${
              theme === "LIGHT"
                ? "border-[#2563EB] bg-[#2563EB] text-white"
                : "border-[#CBD5E1] bg-[#F8FAFC] text-[#1E293B] hover:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            }`}
          >
            <Sun className="h-4 w-4" />
            Mode Terang
          </button>

          <button
            type="button"
            disabled={savingPref}
            onClick={() => handleThemeChange("DARK")}
            className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-xs font-semibold transition ${
              theme === "DARK"
                ? "border-[#2563EB] bg-[#2563EB] text-white"
                : "border-[#CBD5E1] bg-[#F8FAFC] text-[#1E293B] hover:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            }`}
          >
            <Moon className="h-4 w-4" />
            Mode Gelap
          </button>
        </div>
      </section>

      {/* 2. Privasi & Interaksi (3 Fitur Penting) */}
      <section className="divide-y divide-slate-100 rounded-xl border border-[#CBD5E1] bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-[#1E293B]">
        <div className="flex items-center justify-between gap-4 p-5">
          <div className="flex items-start gap-3">
            <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
            <div>
              <p className="text-sm font-semibold">
                Sembunyikan Jumlah Suka (Bawaan)
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Aktifkan otomatis opsi sembunyikan angka suka setiap mengunggah
                konten baru agar fokus pada kualitas ulasan.
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={hideLikeCountDefault}
            disabled={savingPref}
            onChange={(e) => {
              const next = e.target.checked;
              setHideLikeCountDefault(next);
              savePreferences({ hideLikeCountDefault: next });
            }}
            aria-label="Sembunyikan jumlah suka bawaan"
            className="h-4 w-4 shrink-0 accent-[#2563EB]"
          />
        </div>

        <div className="flex items-center justify-between gap-4 p-5">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
            <div>
              <p className="text-sm font-semibold">
                Izinkan Pesan Langsung (DM)
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Izinkan akun yang mengikuti Anda untuk mengirim pesan privat.
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={allowDmFromFollowing}
            disabled={savingPref}
            onChange={(e) => {
              const next = e.target.checked;
              setAllowDmFromFollowing(next);
              savePreferences({ allowDmFromFollowing: next });
            }}
            aria-label="Izinkan pesan langsung"
            className="h-4 w-4 shrink-0 accent-[#2563EB]"
          />
        </div>

        <div className="flex items-center justify-between gap-4 p-5">
          <div className="flex items-start gap-3">
            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
            <div>
              <p className="text-sm font-semibold">Notifikasi Interaksi</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Tampilkan pemberitahuan untuk suka, komentar, dan pengikut baru.
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={emailNotifications}
            disabled={savingPref}
            onChange={(e) => {
              const next = e.target.checked;
              setEmailNotifications(next);
              savePreferences({ emailNotifications: next });
            }}
            aria-label="Aktifkan notifikasi interaksi"
            className="h-4 w-4 shrink-0 accent-[#2563EB]"
          />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            savePreferences({ phone }, "Nomor telepon berhasil diperbarui.");
          }}
          className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label
              htmlFor="settings-phone"
              className="mb-1 flex items-center gap-1.5 text-xs font-semibold"
            >
              <Phone className="h-3.5 w-3.5 text-[#2563EB]" />
              Nomor Telepon Akun
            </label>
            <input
              id="settings-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="081234567890"
              className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-sm outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
            />
          </div>
          <button
            type="submit"
            disabled={savingPref}
            className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            Simpan Nomor
          </button>
        </form>
      </section>

      {/* 3. Keamanan: Ubah Kata Sandi */}
      <section className="rounded-xl border border-[#CBD5E1] bg-white p-5 dark:border-slate-700 dark:bg-[#1E293B]">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-[#2563EB]" />
          <h2 className="text-sm font-bold">Keamanan — Ubah Kata Sandi</h2>
        </div>

        <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold">
              Kata Sandi Lama
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-sm outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold">
                Kata Sandi Baru
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 karakter + angka"
                className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-sm outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold">
                Konfirmasi Kata Sandi Baru
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-sm outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
          </div>

          {passError && <p className="text-xs text-red-600">{passError}</p>}
          {passMessage && (
            <p className="text-xs font-medium text-[#2563EB]">{passMessage}</p>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={savingPass}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {savingPass && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Perbarui Kata Sandi
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
