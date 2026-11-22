"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  AtSign,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  User,
} from "lucide-react";
import BrandMark from "@/components/BrandMark";
import { validateRegisterPassword } from "@/lib/categories";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const passwordState = validateRegisterPassword(form.password);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const normalizedUsername = form.username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) {
      setError(
        "Username harus 3–24 karakter dan hanya boleh huruf kecil, angka, atau garis bawah (_)."
      );
      return;
    }

    const trimmedPhone = form.phone.trim();
    if (!trimmedPhone || !/^[0-9+\-\s()]{9,20}$/.test(trimmedPhone)) {
      setError("Masukkan nomor telepon yang valid (9–20 digit).");
      return;
    }

    if (!passwordState.ok) {
      setError(passwordState.error);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          username: normalizedUsername,
          email: form.email.trim().toLowerCase(),
          phone: trimmedPhone,
          password: form.password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || "Pendaftaran gagal. Silakan coba lagi.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server. Coba lagi sebentar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="mx-auto inline-flex">
            <BrandMark size="lg" />
          </Link>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-neutral-950">
            Buat Akun Kreator
          </h1>
          <p className="mt-1.5 text-sm text-neutral-600">
            Bangun portofolio dan terima ulasan yang konstruktif.
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs sm:p-8">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-semibold text-neutral-900"
              >
                Nama Lengkap
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  id="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Contoh: Dina Rahmawati"
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50/60 py-2.5 pr-3.5 pl-10 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:bg-white focus:ring-2 focus:ring-neutral-900/10"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-sm font-semibold text-neutral-900"
              >
                Username
              </label>
              <div className="relative">
                <AtSign className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  id="username"
                  type="text"
                  required
                  value={form.username}
                  onChange={(e) =>
                    updateField("username", e.target.value.toLowerCase())
                  }
                  placeholder="dina_desain"
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50/60 py-2.5 pr-3.5 pl-10 font-mono text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:bg-white focus:ring-2 focus:ring-neutral-900/10"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-semibold text-neutral-900"
              >
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="dina@contoh.id"
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50/60 py-2.5 pr-3.5 pl-10 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:bg-white focus:ring-2 focus:ring-neutral-900/10"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-1.5 block text-sm font-semibold text-neutral-900"
              >
                No. Telepon
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  id="phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="081234567890"
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50/60 py-2.5 pr-3.5 pl-10 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:bg-white focus:ring-2 focus:ring-neutral-900/10"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-semibold text-neutral-900"
              >
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="Minimal 6 karakter + angka (cth: karya#26)"
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50/60 py-2.5 pr-10 pl-10 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:bg-white focus:ring-2 focus:ring-neutral-900/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="mt-2 space-y-1.5 rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-700">
                    Kekuatan Kata Sandi
                  </span>
                  <span
                    className={`font-mono font-semibold ${
                      !form.password
                        ? "text-neutral-400"
                        : passwordState.strength === "strong"
                          ? "text-blue-700"
                          : passwordState.ok
                            ? "text-slate-700"
                            : "text-red-600"
                    }`}
                  >
                    {!form.password
                      ? "-"
                      : passwordState.strength === "strong"
                        ? "Kuat"
                        : passwordState.ok
                          ? "Cukup"
                          : "Lemah"}
                  </span>
                </div>
                <ul className="space-y-0.5 text-neutral-600">
                  <li className="flex items-center gap-1.5">
                    <Check
                      className={`h-3 w-3 ${
                        passwordState.hasMinLength
                          ? "text-blue-600"
                          : "text-neutral-300"
                      }`}
                    />
                    Minimal 6 karakter (wajib)
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check
                      className={`h-3 w-3 ${
                        passwordState.hasNumber
                          ? "text-blue-600"
                          : "text-neutral-300"
                      }`}
                    />
                    Mengandung angka 0–9 (wajib)
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check
                      className={`h-3 w-3 ${
                        passwordState.hasSymbol
                          ? "text-blue-600"
                          : "text-neutral-300"
                      }`}
                    />
                    Tambahkan tanda/simbol seperti{" "}
                    <span className="font-mono">+-@#$%</span> agar lebih kuat
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-semibold text-neutral-900"
              >
                Konfirmasi Kata Sandi
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={form.confirmPassword}
                  onChange={(e) =>
                    updateField("confirmPassword", e.target.value)
                  }
                  placeholder="Ulangi kata sandi"
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50/60 py-2.5 pr-3.5 pl-10 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:bg-white focus:ring-2 focus:ring-neutral-900/10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
            >
              {submitting ? "Mendaftarkan..." : "Daftar & Masuk"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-neutral-600">
            Sudah memiliki akun?{" "}
            <Link
              href="/login"
              className="font-semibold text-neutral-950 hover:underline"
            >
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
