"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Award,
  Bookmark,
  Calendar,
  Camera,
  ExternalLink,
  FileEdit,
  Grid3X3,
  Loader2,
  Mail,
  Pencil,
  PlusSquare,
  Settings,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import BadgePill from "@/components/BadgePill";
import GridItem from "@/components/GridItem";
import PostCard from "@/components/PostCard";
import { CONTENT_CATEGORIES, getCategoryMeta } from "@/lib/categories";
import { formatRelativeTime } from "@/lib/format";

const ALLOWED_AVATAR_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export default function ProfileView({
  profile,
  initialPosts,
  initialSavedPosts = [],
  initialDraftPosts = [],
  categories = CONTENT_CATEGORIES,
  initialTab = "own",
  initialFollowing,
  currentUser,
}) {
  const router = useRouter();
  const avatarInputRef = useRef(null);
  const isOwnProfile = currentUser?.id === profile.id;

  const [posts, setPosts] = useState(initialPosts || []);
  const [savedPosts, setSavedPosts] = useState(initialSavedPosts || []);
  const [draftPosts, setDraftPosts] = useState(initialDraftPosts || []);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [filterCategory, setFilterCategory] = useState("");
  const [deletingDraftId, setDeletingDraftId] = useState("");

  const [isFollowing, setIsFollowing] = useState(Boolean(initialFollowing));
  const [followersCount, setFollowersCount] = useState(
    profile._count?.followers ?? 0
  );
  const [followLoading, setFollowLoading] = useState(false);

  const [selectedPost, setSelectedPost] = useState(null);

  const [profileName, setProfileName] = useState(profile.name);
  const [profileBio, setProfileBio] = useState(profile.bio || "");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(
    profile.avatarUrl || null
  );

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editBio, setEditBio] = useState(profile.bio || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    setPosts(initialPosts || []);
    setSavedPosts(initialSavedPosts || []);
    setDraftPosts(initialDraftPosts || []);
    setActiveTab(initialTab);
    setIsFollowing(Boolean(initialFollowing));
    setFollowersCount(profile._count?.followers ?? 0);
    setProfileName(profile.name);
    setProfileBio(profile.bio || "");
    setProfileAvatarUrl(profile.avatarUrl || null);
  }, [
    profile,
    initialPosts,
    initialSavedPosts,
    initialDraftPosts,
    initialTab,
    initialFollowing,
  ]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  useEffect(() => {
    if (!selectedPost && !editOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSelectedPost(null);
        setEditOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedPost, editOpen]);

  async function handleToggleFollow() {
    if (!currentUser) {
      router.push(
        `/login?next=${encodeURIComponent(`/profile/${profile.username}`)}`
      );
      return;
    }

    if (followLoading || isOwnProfile || currentUser.isSuspended) return;

    const prevFollowing = isFollowing;
    const prevCount = followersCount;
    setIsFollowing(!prevFollowing);
    setFollowersCount(
      prevFollowing ? Math.max(0, prevCount - 1) : prevCount + 1
    );
    setFollowLoading(true);

    try {
      const response = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "FOLLOW",
          targetUserId: profile.id,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data) {
        setIsFollowing(prevFollowing);
        setFollowersCount(prevCount);
        return;
      }

      setIsFollowing(Boolean(data.following));
      if (typeof data.followersCount === "number") {
        setFollowersCount(data.followersCount);
      }
      router.refresh();
    } catch {
      setIsFollowing(prevFollowing);
      setFollowersCount(prevCount);
    } finally {
      setFollowLoading(false);
    }
  }

  function openEditModal() {
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setEditName(profileName);
    setEditBio(profileBio);
    setAvatarFile(null);
    setAvatarPreviewUrl("");
    setRemoveAvatar(false);
    setEditError("");
    setEditOpen(true);
  }

  function handleAvatarFileSelect(file) {
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setEditError("Format foto profil harus JPG, PNG, WebP, atau GIF.");
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setEditError("Ukuran foto profil maksimal 2 MB.");
      return;
    }

    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);

    setEditError("");
    setRemoveAvatar(false);
    setAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
  }

  function handleRemoveAvatarClick() {
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarFile(null);
    setAvatarPreviewUrl("");
    setRemoveAvatar(true);
    setEditError("");
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    setEditError("");

    const trimmedName = editName.trim();
    const trimmedBio = editBio.trim();

    if (trimmedName.length < 2 || trimmedName.length > 60) {
      setEditError("Nama lengkap harus 2 hingga 60 karakter.");
      return;
    }

    setEditSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", trimmedName);
      formData.append("bio", trimmedBio);
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      } else if (removeAvatar) {
        formData.append("removeAvatar", "true");
      }

      const response = await fetch("/api/profile", {
        method: "PATCH",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setEditError(data.error || "Gagal menyimpan perubahan profil.");
        return;
      }

      setProfileName(data.user.name);
      setProfileBio(data.user.bio || "");
      setProfileAvatarUrl(data.user.avatarUrl || null);
      const updateAuthor = (list) =>
        list.map((post) =>
          post.authorId === profile.id
            ? {
              ...post,
              author: {
                ...post.author,
                name: data.user.name,
                avatarUrl: data.user.avatarUrl || null,
              },
            }
            : post
        );
      setPosts(updateAuthor);
      setSavedPosts(updateAuthor);
      setDraftPosts(updateAuthor);
      setEditOpen(false);
      router.refresh();
    } catch {
      setEditError("Gagal terhubung ke server.");
    } finally {
      setEditSaving(false);
    }
  }

  function handlePostChange(postId, patch) {
    const applyPatch = (post) => {
      if (!post || post.id !== postId) return post;
      return {
        ...post,
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.caption !== undefined ? { caption: patch.caption } : {}),
        ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
        ...(patch.category !== undefined ? { category: patch.category } : {}),
        ...(patch.subcategory !== undefined
          ? { subcategory: patch.subcategory }
          : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.externalLink !== undefined
          ? { externalLink: patch.externalLink }
          : {}),
        ...(patch.mentions !== undefined ? { mentions: patch.mentions } : {}),
        ...(patch.hideLikeCount !== undefined
          ? { hideLikeCount: patch.hideLikeCount }
          : {}),
        ...(patch.imageUrl !== undefined ? { imageUrl: patch.imageUrl } : {}),
        likedByMe: patch.likedByMe ?? post.likedByMe,
        bookmarkedByMe: patch.bookmarkedByMe ?? post.bookmarkedByMe,
        _count: {
          ...post._count,
          likes: patch.likesCount ?? post._count?.likes ?? 0,
          comments: patch.commentsCount ?? post._count?.comments ?? 0,
          bookmarks: patch.bookmarksCount ?? post._count?.bookmarks ?? 0,
        },
      };
    };

    setPosts((prev) => prev.map(applyPatch));
    setDraftPosts((prev) => prev.map(applyPatch));

    if (isOwnProfile && patch.bookmarkedByMe === false) {
      setSavedPosts((prev) => prev.filter((item) => item.id !== postId));
    } else if (isOwnProfile && patch.bookmarkedByMe === true) {
      const target =
        posts.find((p) => p.id === postId) ||
        (selectedPost?.id === postId ? selectedPost : null);
      if (target) {
        setSavedPosts((prev) =>
          prev.some((item) => item.id === postId)
            ? prev.map(applyPatch)
            : [applyPatch(target), ...prev]
        );
      }
    } else {
      setSavedPosts((prev) => prev.map(applyPatch));
    }

    setSelectedPost((prev) => applyPatch(prev));
  }

  function handleFollowChange(authorId, following) {
    const applyFollow = (list) =>
      list.map((post) =>
        post.authorId === authorId
          ? { ...post, isFollowingAuthor: following }
          : post
      );
    setPosts(applyFollow);
    setSavedPosts(applyFollow);
    setSelectedPost((prev) =>
      prev && prev.authorId === authorId
        ? { ...prev, isFollowingAuthor: following }
        : prev
    );
  }

  function handlePostDelete(deletedId) {
    setPosts((prev) => prev.filter((post) => post.id !== deletedId));
    setSavedPosts((prev) => prev.filter((post) => post.id !== deletedId));
    setDraftPosts((prev) => prev.filter((post) => post.id !== deletedId));
    setSelectedPost(null);
    router.refresh();
  }

  async function handleDeleteDraft(draftId) {
    setDeletingDraftId(draftId);
    try {
      const response = await fetch(`/api/posts/${encodeURIComponent(draftId)}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setDraftPosts((prev) => prev.filter((item) => item.id !== draftId));
      }
    } finally {
      setDeletingDraftId("");
    }
  }

  const currentSource =
    activeTab === "saved"
      ? savedPosts
      : activeTab === "draft"
        ? draftPosts
        : posts;

  const filteredPosts = filterCategory
    ? currentSource.filter((post) => post.category === filterCategory)
    : currentSource;

  const modalAvatarUrl = removeAvatar
    ? null
    : avatarPreviewUrl || profileAvatarUrl;

  const joinedLabel = new Intl.DateTimeFormat("id-ID", {
    month: "short",
    year: "numeric",
  }).format(new Date(profile.createdAt));

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Avatar
              name={profileName}
              username={profile.username}
              avatarUrl={profileAvatarUrl}
              size="xl"
            />

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">
                  {profileName}
                </h1>
                {(profile.role === "ADMIN" || profile.role === "MODERATOR") && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-[#2563EB]/30 bg-[#2563EB]/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#2563EB]">
                    <Shield className="h-3 w-3" />
                    {profile.role === "ADMIN" ? "Administrator" : "Moderator"}
                  </span>
                )}
                {(profile.helpfulReviewsCount ?? 0) >= 1 && (
                  <span
                    data-testid="helpful-contributor-badge"
                    className="inline-flex items-center gap-1 rounded-md bg-[#2563EB] px-2.5 py-0.5 text-[11px] font-semibold text-white"
                  >
                    <Award className="h-3 w-3" />
                    Pengulas Konstruktif ({profile.helpfulReviewsCount})
                  </span>
                )}
                {(profile.badges || []).map((badge) => (
                  <BadgePill key={badge.id} badge={badge} />
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="font-mono text-sm text-slate-600">
                  @{profile.username}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-[#2563EB]" />
                  Bergabung {joinedLabel}
                </span>
              </div>

              <p className="max-w-xl text-sm leading-relaxed text-slate-700">
                {profileBio || "Kreator ini belum menambahkan bio."}
              </p>

              <div className="flex flex-wrap items-center gap-6 pt-2">
                <div>
                  <span className="text-base font-bold text-[#1E293B]">
                    {posts.length}
                  </span>{" "}
                  <span className="text-xs text-slate-500">Konten</span>
                </div>
                <div>
                  <span
                    data-testid="followers-count"
                    className="text-base font-bold text-[#1E293B]"
                  >
                    {followersCount}
                  </span>{" "}
                  <span className="text-xs text-slate-500">Pengikut</span>
                </div>
                <div>
                  <span className="text-base font-bold text-[#1E293B]">
                    {profile._count?.following ?? 0}
                  </span>{" "}
                  <span className="text-xs text-slate-500">Mengikuti</span>
                </div>
                <div>
                  <span className="text-base font-bold text-[#1E293B]">
                    {savedPosts.length}
                  </span>{" "}
                  <span className="text-xs text-slate-500">Disimpan</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 md:shrink-0">
            {isOwnProfile ? (
              <>
                <button
                  type="button"
                  disabled={currentUser?.isSuspended}
                  onClick={openEditModal}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-[#1E293B] transition hover:border-[#2563EB] hover:text-[#2563EB] disabled:opacity-50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Profil
                </button>
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-[#1E293B] transition hover:border-[#2563EB] hover:text-[#2563EB]"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Pengaturan
                </Link>
                {!currentUser?.isSuspended && (
                  <Link
                    href="/upload"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1D4ED8]"
                  >
                    <PlusSquare className="h-3.5 w-3.5" />
                    Unggah Konten
                  </Link>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleToggleFollow}
                  disabled={followLoading || currentUser?.isSuspended}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${isFollowing
                    ? "border border-[#2563EB]/30 bg-[#2563EB]/10 text-[#2563EB] hover:bg-[#2563EB]/15"
                    : "bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
                    }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="h-4 w-4" />
                      Mengikuti
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Ikuti
                    </>
                  )}
                </button>

                {isFollowing &&
                  currentUser &&
                  !currentUser.isSuspended &&
                  profile.allowDm !== false && (
                    <Link
                      href={`/messages?to=${encodeURIComponent(profile.id)}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#2563EB] bg-white px-4 py-2 text-sm font-semibold text-[#2563EB] transition hover:bg-[#2563EB]/10"
                    >
                      <Mail className="h-4 w-4" />
                      Kirim DM
                    </Link>
                  )}
              </>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
          <div
            role="tablist"
            aria-label="Kategori konten profil"
            className="flex items-center gap-1 sm:gap-2"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "own"}
              onClick={() => {
                setActiveTab("own");
                setFilterCategory("");
              }}
              className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm transition ${activeTab === "own"
                ? "border-[#2563EB] font-semibold text-[#2563EB]"
                : "border-transparent font-medium text-slate-500 hover:text-[#1E293B]"
                }`}
            >
              <Grid3X3 className="h-4 w-4" />
              <span>Konten Sendiri</span>
              <span className="rounded-md bg-[#F8FAFC] px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                {posts.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "saved"}
              onClick={() => {
                setActiveTab("saved");
                setFilterCategory("");
              }}
              className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm transition ${activeTab === "saved"
                ? "border-[#2563EB] font-semibold text-[#2563EB]"
                : "border-transparent font-medium text-slate-500 hover:text-[#1E293B]"
                }`}
            >
              <Bookmark className="h-4 w-4" />
              <span>Disimpan</span>
              <span className="rounded-md bg-[#F8FAFC] px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                {savedPosts.length}
              </span>
            </button>

            {isOwnProfile && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "draft"}
                onClick={() => {
                  setActiveTab("draft");
                  setFilterCategory("");
                }}
                className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm transition ${activeTab === "draft"
                  ? "border-[#2563EB] font-semibold text-[#2563EB]"
                  : "border-transparent font-medium text-slate-500 hover:text-[#1E293B]"
                  }`}
              >
                <FileEdit className="h-4 w-4" />
                <span>Draf</span>
                <span className="rounded-md bg-[#F8FAFC] px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                  {draftPosts.length}
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setFilterCategory("")}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filterCategory === ""
              ? "bg-[#2563EB] text-white"
              : "border border-slate-200 bg-white text-slate-600 hover:border-[#3B82F6] hover:text-[#2563EB]"
              }`}
          >
            Semua Kategori
          </button>

          {categories.map((item) => {
            const active = filterCategory === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilterCategory(active ? "" : item.key)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${active
                  ? "bg-[#2563EB] text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-[#3B82F6] hover:text-[#2563EB]"
                  }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {activeTab === "draft" ? (
          filteredPosts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
              Belum ada draf konten tersimpan.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filteredPosts.map((draft) => {
                const catMeta = getCategoryMeta(draft.category, categories);
                return (
                  <div
                    key={draft.id}
                    className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start gap-3">
                      {draft.imageUrl ? (
                        <div className="bk-protected-media h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-[#1E293B]">
                          <img
                            src={draft.imageUrl}
                            alt={draft.title}
                            className={`h-full w-full ${draft.imageFormat === "LANDSCAPE"
                              ? "object-contain"
                              : "object-cover"
                              }`}
                          />
                        </div>
                      ) : (
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-[#CBD5E1] text-[#1E293B]">
                          <FileEdit className="h-6 w-6" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded bg-[#F8FAFC] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#1E293B]">
                            DRAF
                          </span>
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${catMeta.badgeClass}`}
                          >
                            {catMeta.label}
                          </span>
                        </div>
                        <p className="line-clamp-1 text-sm font-bold text-[#1E293B]">
                          {draft.title}
                        </p>
                        <p className="line-clamp-2 text-xs text-slate-600">
                          {draft.caption}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Disimpan {formatRelativeTime(draft.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => handleDeleteDraft(draft.id)}
                        disabled={
                          deletingDraftId === draft.id ||
                          currentUser?.isSuspended
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Hapus
                      </button>
                      <Link
                        href={`/upload?draft=${encodeURIComponent(draft.id)}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1D4ED8]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Lanjutkan &amp; Publikasikan
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : filteredPosts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
            {activeTab === "saved"
              ? savedPosts.length === 0
                ? "Belum ada konten yang disimpan. Tekan tombol Simpan pada postingan untuk menandainya di sini."
                : "Tidak ada konten tersimpan pada kategori ini."
              : posts.length === 0
                ? "Kreator ini belum mempublikasikan konten."
                : "Tidak ada konten pada kategori ini."}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {filteredPosts.map((post) => (
              <GridItem
                key={post.id}
                post={post}
                categories={categories}
                onSelect={(item) => setSelectedPost(item)}
              />
            ))}
          </div>
        )}
      </section>

      {selectedPost && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Detail konten ${selectedPost.title}`}
          onClick={() => setSelectedPost(null)}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#1E293B]/75 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative my-auto w-full ${selectedPost.imageUrl && selectedPost.imageFormat === "LANDSCAPE"
              ? "max-w-2xl"
              : "max-w-[540px]"
              }`}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <Link
                href={`/post/${selectedPost.id}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-[#2563EB] shadow-md transition hover:bg-[#F8FAFC]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Buka Halaman Detail
              </Link>
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                aria-label="Tutup pratinjau konten"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#1E293B] shadow-md transition hover:bg-[#F8FAFC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <PostCard
              post={selectedPost}
              categories={categories}
              currentUser={currentUser}
              variant={
                selectedPost.imageUrl &&
                  selectedPost.imageFormat === "LANDSCAPE"
                  ? "detail-landscape"
                  : "feed"
              }
              onPostChange={handlePostChange}
              onPostDelete={handlePostDelete}
              onFollowChange={handleFollowChange}
            />
          </div>
        </div>
      )}

      {editOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit profil pengguna"
          onClick={() => setEditOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/75 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#1E293B]">
                Edit Profil
              </h3>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                aria-label="Tutup edit profil"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#1E293B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
              <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-[#F8FAFC] p-3.5">
                <Avatar
                  name={editName || profileName}
                  username={profile.username}
                  avatarUrl={modalAvatarUrl}
                  size="lg"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) =>
                      handleAvatarFileSelect(e.target.files?.[0])
                    }
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-[#1E293B] hover:border-[#2563EB] hover:text-[#2563EB]"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      Ganti Foto
                    </button>
                    {modalAvatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatarClick}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Hapus Foto
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    JPG, PNG, WebP, atau GIF (maks. 2 MB)
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="edit-profile-name"
                  className="mb-1.5 block text-xs font-semibold text-[#1E293B]"
                >
                  Nama Lengkap
                </label>
                <input
                  id="edit-profile-name"
                  type="text"
                  required
                  maxLength={60}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E293B] outline-none focus:border-[#2563EB] focus:bg-white"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-profile-bio"
                  className="mb-1.5 block text-xs font-semibold text-[#1E293B]"
                >
                  Bio Kreator
                </label>
                <textarea
                  id="edit-profile-bio"
                  rows={3}
                  maxLength={300}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Ceritakan minat desain atau fokus karyamu..."
                  className="w-full rounded-lg border border-slate-300 bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E293B] outline-none focus:border-[#2563EB] focus:bg-white"
                />
              </div>

              {editError && (
                <p className="text-xs text-red-600">{editError}</p>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-[#F8FAFC]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60"
                >
                  {editSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editSaving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
