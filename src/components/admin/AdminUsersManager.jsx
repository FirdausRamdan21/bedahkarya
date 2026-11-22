"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Loader2,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { formatFullDateTime, formatRelativeTime } from "@/lib/format";

export default function AdminUsersManager({
  initialUsers,
  currentAdminId,
  currentStaffRole = "ADMIN",
}) {
  const router = useRouter();
  const isAdmin = currentStaffRole === "ADMIN";

  const [users, setUsers] = useState(initialUsers || []);
  const [queryInput, setQueryInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(false);
  const [actionUserId, setActionUserId] = useState("");
  const [error, setError] = useState("");

  const [suspendTarget, setSuspendTarget] = useState(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [durationMode, setDurationMode] = useState("PERMANENT"); // PERMANENT | TIMED
  const [durationValue, setDurationValue] = useState("7");
  const [durationUnit, setDurationUnit] = useState("DAYS"); // DAYS | MONTHS | YEARS

  const [deletingUser, setDeletingUser] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!deletingUser && !suspendTarget) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setDeletingUser(null);
        setSuspendTarget(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [deletingUser, suspendTarget]);

  async function fetchUsers({
    nextQuery = queryInput,
    nextRole = roleFilter,
    nextStatus = statusFilter,
  } = {}) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("resource", "users");
      if (nextQuery.trim()) params.set("q", nextQuery.trim());
      if (nextRole) params.set("role", nextRole);
      if (nextStatus) params.set("status", nextStatus);

      const response = await fetch(`/api/admin?${params.toString()}`);
      const data = await response.json().catch(() => null);
      if (!response.ok || !data) {
        setError(data?.error || "Gagal memuat data pengguna.");
        return;
      }
      setUsers(data.users || []);
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  function openSuspendModal(user) {
    setSuspendTarget(user);
    setSuspendReason("");
    setDurationMode("PERMANENT");
    setDurationValue("7");
    setDurationUnit("DAYS");
    setError("");
  }

  async function handleSubmitSuspend(event) {
    event.preventDefault();
    if (!suspendTarget) return;

    setActionUserId(suspendTarget.id);
    setError("");
    try {
      const payload = {
        action: "TOGGLE_SUSPEND_USER",
        userId: suspendTarget.id,
        isSuspended: true,
        reason: suspendReason.trim() || "Pelanggaran pedoman komunitas.",
      };
      if (durationMode === "TIMED") {
        payload.durationValue = Number(durationValue) || 1;
        payload.durationUnit = durationUnit;
      }

      const response = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Gagal menangguhkan pengguna.");
        return;
      }

      setUsers((prev) =>
        prev.map((item) => (item.id === suspendTarget.id ? data.user : item))
      );
      setSuspendTarget(null);
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setActionUserId("");
    }
  }

  async function handleUnsuspend(user) {
    setActionUserId(user.id);
    setError("");
    try {
      const response = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_SUSPEND_USER",
          userId: user.id,
          isSuspended: false,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Gagal membebaskan pengguna.");
        return;
      }

      setUsers((prev) =>
        prev.map((item) => (item.id === user.id ? data.user : item))
      );
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setActionUserId("");
    }
  }

  async function handleRoleChange(user, nextRole) {
    if (!isAdmin || user.role === nextRole) return;
    setActionUserId(user.id);
    setError("");
    try {
      const response = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_USER_ROLE",
          userId: user.id,
          role: nextRole,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Gagal mengubah peran pengguna.");
        return;
      }

      setUsers((prev) =>
        prev.map((item) => (item.id === user.id ? data.user : item))
      );
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setActionUserId("");
    }
  }

  async function handleConfirmDelete() {
    if (!deletingUser || !isAdmin) return;
    setDeleteLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin?resource=user&id=${encodeURIComponent(deletingUser.id)}`,
        { method: "DELETE" }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Gagal menghapus pengguna.");
        return;
      }

      setUsers((prev) => prev.filter((item) => item.id !== deletingUser.id));
      setDeletingUser(null);
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kelola Pengguna</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isAdmin
            ? `Pengawasan akun (${users.length} akun), pengaturan peran Moderator, penangguhan berjangka/permanen, dan penghapusan akun.`
            : `Mode Moderator (${users.length} akun): Anda dapat menangguhkan atau membebaskan akun pelanggar.`}
        </p>
      </div>

      <section className="rounded-xl border border-[#CBD5E1] bg-white p-4 dark:border-slate-700 dark:bg-[#1E293B]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchUsers();
            }}
            className="flex flex-1 items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Cari nama, @username, atau email..."
                className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] py-2 pr-3 pl-9 text-sm outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Cari
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter role"
              value={roleFilter}
              onChange={(e) => {
                const next = e.target.value;
                setRoleFilter(next);
                fetchUsers({ nextRole: next });
              }}
              className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
            >
              <option value="">Semua Role</option>
              <option value="USER">USER</option>
              <option value="MODERATOR">MODERATOR</option>
              <option value="ADMIN">ADMIN</option>
            </select>

            <select
              aria-label="Filter status akun"
              value={statusFilter}
              onChange={(e) => {
                const next = e.target.value;
                setStatusFilter(next);
                fetchUsers({ nextStatus: next });
              }}
              className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
            >
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="suspended">Ditangguhkan</option>
            </select>
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-[#CBD5E1] bg-white py-14 text-sm text-slate-500 dark:border-slate-700 dark:bg-[#1E293B]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#2563EB]" />
          Memuat daftar pengguna...
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#CBD5E1] bg-white dark:border-slate-700 dark:bg-[#1E293B]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-xs uppercase text-slate-500 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Pengguna</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Bergabung</th>
                  <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {users.map((user) => {
                  const isProtected =
                    user.role === "ADMIN" ||
                    user.id === currentAdminId ||
                    (!isAdmin && user.role === "MODERATOR");
                  const busy = actionUserId === user.id;

                  return (
                    <tr key={user.id} className="hover:bg-[#F8FAFC]/60 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <p className="font-semibold">{user.name}</p>
                        <p className="font-mono text-xs text-slate-500">
                          <Link
                            href={`/profile/${user.username}`}
                            className="hover:underline"
                          >
                            @{user.username}
                          </Link>{" "}
                          · {user.email}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {isAdmin && user.role !== "ADMIN" && user.id !== currentAdminId ? (
                          <select
                            aria-label={`Ubah role ${user.username}`}
                            value={user.role}
                            disabled={busy}
                            onChange={(e) => handleRoleChange(user, e.target.value)}
                            className="rounded-md border border-[#CBD5E1] bg-white px-2 py-1 text-xs font-semibold outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                          >
                            <option value="USER">USER</option>
                            <option value="MODERATOR">MODERATOR</option>
                          </select>
                        ) : (
                          <span className="rounded-md border border-[#2563EB]/30 bg-[#2563EB]/10 px-2 py-0.5 font-semibold text-[#2563EB] dark:text-blue-300">
                            {user.role}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {user.isSuspended ? (
                          <div className="space-y-0.5">
                            <span className="inline-block rounded-md border border-red-200 bg-red-50 px-2 py-0.5 font-semibold text-red-700">
                              Ditangguhkan
                            </span>
                            <p className="text-[11px] text-slate-500">
                              {user.suspendedUntil
                                ? `Hingga ${formatFullDateTime(user.suspendedUntil)}`
                                : "Keputusan Admin/Mod"}
                            </p>
                          </div>
                        ) : (
                          <span className="rounded-md border border-[#CBD5E1] bg-[#F8FAFC] px-2 py-0.5 font-medium dark:border-slate-600 dark:bg-slate-800">
                            Aktif
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                        {formatRelativeTime(user.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isProtected ? (
                          <span className="font-mono text-xs text-slate-400">
                            Dilindungi
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            {user.isSuspended ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleUnsuspend(user)}
                                className="inline-flex items-center gap-1 rounded-lg bg-[#2563EB] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Bebaskan
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => openSuspendModal(user)}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                              >
                                <Ban className="h-3.5 w-3.5" />
                                Tangguhkan
                              </button>
                            )}

                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setDeletingUser(user)}
                                className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Hapus
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {suspendTarget && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSuspendTarget(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/75 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-[#CBD5E1] bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-[#1E293B]"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <h3 className="text-base font-bold">
                Tangguhkan @{suspendTarget.username}
              </h3>
              <button
                type="button"
                onClick={() => setSuspendTarget(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitSuspend} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold">
                  Alasan / Laporan Penangguhan
                </label>
                <textarea
                  rows={3}
                  required
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Jelaskan pelanggaran yang dilakukan akun ini..."
                  className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold">
                  Durasi Penangguhan
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setDurationMode("PERMANENT")}
                    className={`rounded-lg border px-3 py-2 font-semibold ${
                      durationMode === "PERMANENT"
                        ? "border-[#2563EB] bg-[#2563EB] text-white"
                        : "border-[#CBD5E1] bg-[#F8FAFC] dark:border-slate-600 dark:bg-slate-800"
                    }`}
                  >
                    Keputusan Admin/Mod
                  </button>
                  <button
                    type="button"
                    onClick={() => setDurationMode("TIMED")}
                    className={`rounded-lg border px-3 py-2 font-semibold ${
                      durationMode === "TIMED"
                        ? "border-[#2563EB] bg-[#2563EB] text-white"
                        : "border-[#CBD5E1] bg-[#F8FAFC] dark:border-slate-600 dark:bg-slate-800"
                    }`}
                  >
                    Tentukan Durasi
                  </button>
                </div>

                {durationMode === "TIMED" && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={durationValue}
                      onChange={(e) => setDurationValue(e.target.value)}
                      className="w-24 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                    />
                    <select
                      value={durationUnit}
                      onChange={(e) => setDurationUnit(e.target.value)}
                      className="flex-1 rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                    >
                      <option value="DAYS">Hari</option>
                      <option value="MONTHS">Bulan</option>
                      <option value="YEARS">Tahun</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setSuspendTarget(null)}
                  className="rounded-lg border border-[#CBD5E1] px-4 py-2 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionUserId === suspendTarget.id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {actionUserId === suspendTarget.id && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Tangguhkan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingUser && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setDeletingUser(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/75 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-[#CBD5E1] bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-[#1E293B]"
          >
            <h3 className="text-base font-bold">Hapus Akun Pengguna?</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Akun <span className="font-mono font-semibold">@{deletingUser.username}</span>{" "}
              beserta seluruh datanya akan dihapus permanen.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="rounded-lg border border-[#CBD5E1] px-4 py-2 text-xs font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Hapus Pengguna
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
