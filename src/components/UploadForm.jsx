"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AtSign,
  Calendar,
  CalendarClock,
  Check,
  Crop,
  FileText,
  HeartOff,
  Image as ImageIcon,
  ImagePlus,
  Layers,
  Link2,
  Loader2,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  X,
  ZoomIn,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import {
  CONTENT_CATEGORIES,
  containsLink,
  countWords,
  getCategoryMeta,
  parseMentions,
  validateCaptionLength,
  validateExternalUrl,
} from "@/lib/categories";
import { toDateTimeLocalValue } from "@/lib/format";
import { normalizeTagsInput, parseTags } from "@/services/feedAlgorithm";

const SUGGESTED_TAGS = [
  "poster",
  "ilustrasi",
  "uiux",
  "tipografi",
  "meme",
  "tutorial",
  "komunitas",
  "kode",
];

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function drawFramedImage(canvas, img, { format, fitMode, zoom, offsetX, offsetY }) {
  const ctx = canvas.getContext("2d");
  if (!ctx || !img) return;

  const targetWidth = canvas.width;
  const targetHeight = canvas.height;
  ctx.clearRect(0, 0, targetWidth, targetHeight);
  ctx.fillStyle = "#1E293B";
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  const imgRatio = img.naturalWidth / img.naturalHeight;
  const canvasRatio = targetWidth / targetHeight;
  let baseWidth;
  let baseHeight;

  if (fitMode === "contain") {
    if (imgRatio > canvasRatio) {
      baseWidth = targetWidth;
      baseHeight = targetWidth / imgRatio;
    } else {
      baseHeight = targetHeight;
      baseWidth = targetHeight * imgRatio;
    }
  } else if (imgRatio > canvasRatio) {
    baseHeight = targetHeight;
    baseWidth = targetHeight * imgRatio;
  } else {
    baseWidth = targetWidth;
    baseHeight = targetWidth / imgRatio;
  }

  const scaledWidth = baseWidth * zoom;
  const scaledHeight = baseHeight * zoom;
  const maxPanX = Math.max(0, (scaledWidth - targetWidth) / 2);
  const maxPanY = Math.max(0, (scaledHeight - targetHeight) / 2);
  const drawX = (targetWidth - scaledWidth) / 2 + offsetX * maxPanX;
  const drawY = (targetHeight - scaledHeight) / 2 + offsetY * maxPanY;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, drawX, drawY, scaledWidth, scaledHeight);

  if (targetWidth <= 720 && format) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(targetWidth / 3, 0);
    ctx.lineTo(targetWidth / 3, targetHeight);
    ctx.moveTo((targetWidth * 2) / 3, 0);
    ctx.lineTo((targetWidth * 2) / 3, targetHeight);
    ctx.moveTo(0, targetHeight / 3);
    ctx.lineTo(targetWidth, targetHeight / 3);
    ctx.moveTo(0, (targetHeight * 2) / 3);
    ctx.lineTo(targetWidth, (targetHeight * 2) / 3);
    ctx.stroke();
  }
}

export default function UploadForm({
  user,
  categories = CONTENT_CATEGORIES,
  activeEvents = [],
  initialDraft = null,
  initialEventId = "",
}) {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const loadedImageRef = useRef(null);
  const dragStateRef = useRef(null);
  const mentionWrapperRef = useRef(null);

  const isEditingDraft = Boolean(initialDraft);
  const defaultCategory = initialDraft?.category || categories[0]?.key || "KARYA";

  const [title, setTitle] = useState(initialDraft?.title || "");
  const [category, setCategory] = useState(defaultCategory);
  const [subcategory, setSubcategory] = useState(initialDraft?.subcategory || "");
  const [eventId, setEventId] = useState(initialDraft?.eventId || initialEventId || "");
  const [contentMode, setContentMode] = useState(
    initialDraft ? (initialDraft.imageUrl ? "IMAGE" : "TEXT") : "IMAGE"
  );
  const [imageFormat, setImageFormat] = useState(
    initialDraft?.imageFormat === "LANDSCAPE" ? "LANDSCAPE" : "PORTRAIT"
  );
  const [existingImageUrl, setExistingImageUrl] = useState(
    initialDraft?.imageUrl || null
  );
  const [removeExistingImage, setRemoveExistingImage] = useState(false);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageReady, setImageReady] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fitMode, setFitMode] = useState("cover");
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const [caption, setCaption] = useState(initialDraft?.caption || "");
  const [tagsInput, setTagsInput] = useState(initialDraft?.tags || "");
  const [externalLink, setExternalLink] = useState(
    initialDraft?.externalLink || ""
  );

  const [selectedMentions, setSelectedMentions] = useState(
    parseMentions(initialDraft?.mentions || "")
  );
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [mentionLoading, setMentionLoading] = useState(false);

  const [useCustomTime, setUseCustomTime] = useState(Boolean(initialDraft));
  const [publishedAtInput, setPublishedAtInput] = useState(
    toDateTimeLocalValue(initialDraft?.publishedAt || new Date())
  );
  const [hideLikeCount, setHideLikeCount] = useState(
    initialDraft
      ? Boolean(initialDraft.hideLikeCount)
      : Boolean(user?.hideLikeCountDefault)
  );

  const [error, setError] = useState("");
  const [submittingMode, setSubmittingMode] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!previewUrl) {
      loadedImageRef.current = null;
      setImageReady(false);
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      loadedImageRef.current = img;
      setImageReady(true);
      if (img.naturalWidth > img.naturalHeight * 1.15) {
        setImageFormat("LANDSCAPE");
      } else if (img.naturalHeight > img.naturalWidth * 1.05) {
        setImageFormat("PORTRAIT");
      }
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
    };
    img.src = previewUrl;
  }, [previewUrl]);

  const redrawPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    const img = loadedImageRef.current;
    if (!canvas || !img || !imageReady) return;
    canvas.width = imageFormat === "LANDSCAPE" ? 640 : 480;
    canvas.height = imageFormat === "LANDSCAPE" ? 360 : 600;
    drawFramedImage(canvas, img, {
      format: imageFormat,
      fitMode,
      zoom,
      offsetX,
      offsetY,
    });
  }, [imageFormat, fitMode, zoom, offsetX, offsetY, imageReady]);

  useEffect(() => {
    redrawPreview();
  }, [redrawPreview]);

  useEffect(() => {
    function handleOutside(event) {
      if (
        mentionWrapperRef.current &&
        !mentionWrapperRef.current.contains(event.target)
      ) {
        setMentionOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    if (!mentionOpen) return undefined;
    const cleaned = mentionQuery.trim().replace(/^@+/, "");
    const timer = setTimeout(async () => {
      setMentionLoading(true);
      try {
        const response = await fetch(
          `/api/search/suggest?q=${encodeURIComponent(`@${cleaned}`)}`
        );
        const data = await response.json().catch(() => null);
        if (response.ok && Array.isArray(data?.users)) {
          setMentionSuggestions(
            data.users.filter((u) => !selectedMentions.includes(u.username))
          );
        }
      } catch {
        // Abaikan error sementara
      } finally {
        setMentionLoading(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [mentionOpen, mentionQuery, selectedMentions]);

  function handleSelectedFile(selectedFile) {
    if (!selectedFile) return;
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError("Format gambar harus JPG, PNG, WebP, atau GIF.");
      return;
    }
    if (selectedFile.size > MAX_SIZE_BYTES) {
      setError("Ukuran gambar maksimal 5 MB.");
      return;
    }
    setError("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selectedFile);
    setRemoveExistingImage(false);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  }

  function handleRemoveImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl("");
    setImageReady(false);
    loadedImageRef.current = null;
    if (existingImageUrl) {
      setExistingImageUrl(null);
      setRemoveExistingImage(true);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleToggleSuggestedTag(tag) {
    const current = parseTags(normalizeTagsInput(tagsInput));
    if (current.includes(tag)) {
      setTagsInput(current.filter((item) => item !== tag).join(", "));
      return;
    }
    if (current.length >= 8) {
      setError("Maksimal 8 tag untuk setiap konten.");
      return;
    }
    setError("");
    setTagsInput([...current, tag].join(", "));
  }

  function handleAddMention(username) {
    const cleaned = username
      .trim()
      .toLowerCase()
      .replace(/^@+/, "")
      .replace(/[^a-z0-9_]/g, "");
    if (!cleaned || cleaned.length < 3) return;
    if (!selectedMentions.includes(cleaned) && selectedMentions.length < 10) {
      setSelectedMentions((prev) => [...prev, cleaned]);
    }
    setMentionQuery("");
    setMentionOpen(false);
  }

  async function buildCroppedFile() {
    if (!file) return null;
    if (
      file.type === "image/gif" &&
      zoom === 1 &&
      offsetX === 0 &&
      offsetY === 0 &&
      fitMode === "cover"
    ) {
      return file;
    }
    const img = loadedImageRef.current;
    if (!img) return file;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = imageFormat === "LANDSCAPE" ? 1600 : 1080;
    exportCanvas.height = imageFormat === "LANDSCAPE" ? 900 : 1350;
    drawFramedImage(exportCanvas, img, {
      format: imageFormat,
      fitMode,
      zoom,
      offsetX,
      offsetY,
    });

    const outputMime = file.type === "image/png" ? "image/png" : "image/jpeg";
    const extension = outputMime === "image/png" ? "png" : "jpg";
    const blob = await new Promise((resolve) =>
      exportCanvas.toBlob(resolve, outputMime, 0.92)
    );
    if (!blob) return file;
    const baseName = file.name.replace(/\.[^.]+$/, "") || "karya";
    return new File([blob], `${baseName}-cropped.${extension}`, {
      type: outputMime,
    });
  }

  async function submitContent(targetStatus) {
    setError("");
    const isDraft = targetStatus === "DRAFT";
    const trimmedTitle = title.trim();

    if (trimmedTitle.length < 3 || trimmedTitle.length > 120) {
      setError("Judul konten harus 3 hingga 120 karakter.");
      return;
    }
    if (containsLink(trimmedTitle)) {
      setError("Judul tidak boleh mengandung tautan atau alamat situs web.");
      return;
    }

    const captionCheck = validateCaptionLength(caption, { isDraft });
    if (!captionCheck.ok) {
      setError(captionCheck.error);
      return;
    }

    const urlCheck = validateExternalUrl(externalLink);
    if (!urlCheck.ok) {
      setError(urlCheck.error);
      return;
    }

    const normalizedTags = normalizeTagsInput(tagsInput);
    if (!isDraft && !normalizedTags) {
      setError("Tambahkan minimal satu tag # (contoh: poster, uiux).");
      return;
    }

    setSubmittingMode(targetStatus);
    try {
      const formData = new FormData();
      formData.append("title", trimmedTitle);
      formData.append("caption", caption.trim());
      formData.append("category", category);
      formData.append("subcategory", subcategory);
      formData.append("eventId", eventId);
      formData.append("status", targetStatus);
      formData.append("tags", normalizedTags);
      formData.append("externalLink", urlCheck.value || "");
      formData.append("mentions", selectedMentions.join(","));
      formData.append("hideLikeCount", hideLikeCount ? "true" : "false");

      if (useCustomTime && publishedAtInput) {
        const parsed = new Date(publishedAtInput);
        if (!Number.isNaN(parsed.getTime())) {
          formData.append("publishedAt", parsed.toISOString());
        }
      }

      if (contentMode === "IMAGE") {
        formData.append("imageFormat", imageFormat);
        if (file) {
          const cropped = await buildCroppedFile();
          if (cropped) formData.append("image", cropped);
        } else if (isEditingDraft && removeExistingImage) {
          formData.append("removeImage", "true");
        }
      } else {
        formData.append("imageFormat", "TEXT");
        if (isEditingDraft && (existingImageUrl || removeExistingImage)) {
          formData.append("removeImage", "true");
        }
      }

      const endpoint = isEditingDraft
        ? `/api/posts/${encodeURIComponent(initialDraft.id)}`
        : "/api/posts";
      const response = await fetch(endpoint, {
        method: isEditingDraft ? "PATCH" : "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Gagal menyimpan konten.");
        return;
      }

      if (isDraft) {
        router.push(`/profile/${user.username}?tab=draft`);
      } else if (data.post?.id) {
        router.push(`/post/${data.post.id}`);
      } else {
        router.push("/");
      }
      router.refresh();
    } catch {
      setError("Terjadi gangguan koneksi saat mengirim konten.");
    } finally {
      setSubmittingMode("");
    }
  }

  const activeCategoryObj = useMemo(
    () => categories.find((c) => c.key === category) || categories[0],
    [categories, category]
  );
  const activeCategoryMeta = getCategoryMeta(category, categories);
  const subcategories = activeCategoryObj?.subcategories || [];
  const parsedPreviewTags = parseTags(normalizeTagsInput(tagsInput));
  const charCount = caption.trim().length;
  const wordCount = countWords(caption);
  const titleHasLink = containsLink(title);
  const captionTooShort = charCount > 0 && charCount < 50;
  const captionOverLimit = charCount > 2200 || wordCount > 500;
  const busy = Boolean(submittingMode);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#1E293B] dark:text-white sm:text-2xl">
          {isEditingDraft ? "Lanjutkan Draf Konten" : "Unggah Konten Baru"}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Menulis sebagai{" "}
          <span className="font-mono font-medium text-[#2563EB] dark:text-blue-400">
            @{user.username}
          </span>
          . Anda dapat mengunggah dengan gambar atau hanya teks saja.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitContent("PUBLISHED");
        }}
        className="grid grid-cols-1 gap-6 lg:grid-cols-12"
      >
        <div className="space-y-5 lg:col-span-7">
          <div className="space-y-5 rounded-xl border border-[#CBD5E1] bg-white p-5 dark:border-slate-700 dark:bg-[#1E293B] sm:p-6">
            <div>
              <label
                htmlFor="upload-title"
                className="mb-1.5 block text-sm font-semibold"
              >
                Judul Konten
              </label>
              <input
                id="upload-title"
                type="text"
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Poster Edukasi Hemat Energi"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition ${
                  titleHasLink
                    ? "border-red-400 bg-red-50/40 focus:border-red-600"
                    : "border-[#CBD5E1] bg-[#F8FAFC] focus:border-[#2563EB] focus:bg-white dark:border-slate-600 dark:bg-slate-800"
                }`}
              />
              {titleHasLink ? (
                <p className="mt-1 text-xs font-medium text-red-600">
                  Judul tidak boleh memuat tautan/URL. Gunakan kolom Tautan
                  Eksternal di bawah.
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">
                  3–120 karakter, tanpa tautan/URL.
                </p>
              )}
            </div>

            <div>
              <span className="mb-2 block text-sm font-semibold">
                Kategori Konten
              </span>
              <div
                role="radiogroup"
                aria-label="Pilih kategori konten"
                className="flex flex-wrap gap-2"
              >
                {categories.map((item) => {
                  const selected = category === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setCategory(item.key);
                        setSubcategory("");
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                        selected
                          ? "border-[#2563EB] bg-[#2563EB] text-white"
                          : "border-[#CBD5E1] bg-[#F8FAFC] text-slate-700 hover:border-[#2563EB] hover:text-[#2563EB] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {selected && <Check className="h-3.5 w-3.5" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div
                data-testid="selected-category-description"
                className={`mt-3 rounded-lg border px-3.5 py-2.5 text-xs leading-relaxed ${activeCategoryMeta.badgeClass}`}
              >
                <p className="font-semibold">{activeCategoryMeta.label}</p>
                <p className="mt-0.5 opacity-90">
                  {activeCategoryMeta.description}
                </p>
              </div>
            </div>

            {subcategories.length > 0 && (
              <div>
                <span className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <Layers className="h-4 w-4 text-[#2563EB]" />
                  Subkategori Konten (Opsional)
                </span>
                <div className="flex flex-wrap gap-2">
                  {subcategories.map((sub) => {
                    const selected = subcategory === sub.slug;
                    return (
                      <button
                        key={sub.slug}
                        type="button"
                        onClick={() => setSubcategory(selected ? "" : sub.slug)}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                          selected
                            ? "border-[#1E293B] bg-[#1E293B] text-white dark:border-[#2563EB] dark:bg-[#2563EB]"
                            : "border-[#CBD5E1] bg-[#F8FAFC] text-slate-700 hover:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {selected && <Check className="h-3 w-3" />}
                        {sub.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeEvents.length > 0 && (
              <div>
                <label
                  htmlFor="upload-event"
                  className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold"
                >
                  <Calendar className="h-4 w-4 text-[#2563EB]" />
                  Ikut Event Komunitas (Opsional)
                </label>
                <select
                  id="upload-event"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:bg-white dark:border-slate-600 dark:bg-slate-800"
                >
                  <option value="">-- Tidak Mengikuti Event --</option>
                  {activeEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({ev.themeTag})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="upload-caption" className="text-sm font-semibold">
                  Deskripsi / Konsep Karya
                </label>
                <span
                  className={`font-mono text-xs ${
                    captionOverLimit || captionTooShort
                      ? "font-semibold text-red-600"
                      : "text-slate-500"
                  }`}
                >
                  {charCount}/2.200 karakter &middot; {wordCount}/500 kata
                </span>
              </div>
              <textarea
                id="upload-caption"
                rows={5}
                required
                maxLength={2200}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Ceritakan konsep, latar belakang, proses pembuatan, atau poin diskusi (minimal 50 huruf)..."
                className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 py-2.5 text-sm leading-relaxed outline-none transition focus:border-[#2563EB] focus:bg-white dark:border-slate-600 dark:bg-slate-800"
              />
              <p className="mt-1 text-xs text-slate-500">
                Minimal 50 huruf untuk publikasi, maksimal 2.200 karakter atau
                500 kata.
              </p>
            </div>

            <div>
              <label
                htmlFor="upload-tags"
                className="mb-1.5 block text-sm font-semibold"
              >
                Tag # (dipisah koma)
              </label>
              <input
                id="upload-tags"
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="poster, ilustrasi, tipografi"
                className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 py-2.5 font-mono text-sm outline-none transition focus:border-[#2563EB] focus:bg-white dark:border-slate-600 dark:bg-slate-800"
              />
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {SUGGESTED_TAGS.map((tag) => {
                  const selected = parsedPreviewTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleSuggestedTag(tag)}
                      className={`rounded-md px-2 py-0.5 font-mono text-xs transition ${
                        selected
                          ? "bg-[#2563EB] text-white"
                          : "bg-[#F8FAFC] text-slate-600 hover:bg-[#2563EB]/10 hover:text-[#2563EB] dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 dark:border-slate-700 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="upload-link"
                  className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold"
                >
                  <Link2 className="h-3.5 w-3.5 text-[#2563EB]" />
                  Tautan Eksternal (Opsional)
                </label>
                <input
                  id="upload-link"
                  type="url"
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                  placeholder="https://portofolio.contoh.id"
                  className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs outline-none focus:border-[#2563EB] focus:bg-white dark:border-slate-600 dark:bg-slate-800"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Pengunjung mendapat konfirmasi keamanan sebelum keluar aplikasi.
                </p>
              </div>

              <div ref={mentionWrapperRef} className="relative">
                <label
                  htmlFor="upload-mentions"
                  className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold"
                >
                  <AtSign className="h-3.5 w-3.5 text-[#2563EB]" />
                  Tag @ Akun (Opsional)
                </label>
                <input
                  id="upload-mentions"
                  type="text"
                  value={mentionQuery}
                  onFocus={() => setMentionOpen(true)}
                  onChange={(e) => {
                    setMentionQuery(e.target.value);
                    setMentionOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && mentionQuery.trim()) {
                      e.preventDefault();
                      handleAddMention(mentionQuery);
                    }
                  }}
                  placeholder="Ketik @username untuk menandai..."
                  autoComplete="off"
                  className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 font-mono text-xs outline-none focus:border-[#2563EB] focus:bg-white dark:border-slate-600 dark:bg-slate-800"
                />

                {mentionOpen && (
                  <div className="absolute right-0 left-0 z-30 mt-1.5 max-h-52 overflow-y-auto rounded-xl border border-[#CBD5E1] bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-[#1E293B]">
                    {mentionLoading ? (
                      <p className="px-2.5 py-2 text-xs text-slate-500">
                        Mencari akun...
                      </p>
                    ) : mentionSuggestions.length === 0 ? (
                      <p className="px-2.5 py-2 text-xs text-slate-500">
                        Tidak ada saran akun. Tekan Enter untuk manual.
                      </p>
                    ) : (
                      mentionSuggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleAddMention(item.username)}
                          className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[#F8FAFC] dark:hover:bg-slate-800"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <Avatar
                              name={item.name}
                              username={item.username}
                              avatarUrl={item.avatarUrl}
                              size="xs"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold">
                                {item.name}
                              </p>
                              <p className="truncate font-mono text-[11px] text-slate-500">
                                @{item.username}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 rounded bg-[#2563EB]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#2563EB]">
                            {item.relation}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {selectedMentions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedMentions.map((uname) => (
                      <span
                        key={uname}
                        className="inline-flex items-center gap-1 rounded-md border border-[#2563EB]/30 bg-[#2563EB]/10 px-2 py-0.5 font-mono text-[11px] font-medium text-[#2563EB] dark:text-blue-300"
                      >
                        @{uname}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedMentions((prev) =>
                              prev.filter((item) => item !== uname)
                            )
                          }
                          aria-label={`Hapus @${uname}`}
                          className="hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-700">
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-3 dark:border-slate-700 dark:bg-slate-800">
                <input
                  type="checkbox"
                  checked={hideLikeCount}
                  onChange={(e) => setHideLikeCount(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#2563EB]"
                />
                <div className="text-xs">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <HeartOff className="h-3.5 w-3.5 text-[#2563EB]" />
                    Sembunyikan Jumlah Suka (Mode Fokus)
                  </p>
                  <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                    Jumlah suka disembunyikan agar diskusi berfokus pada kualitas karya.
                  </p>
                </div>
              </label>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  <CalendarClock className="h-3.5 w-3.5 text-[#2563EB]" />
                  Waktu Upload / Publikasi
                </span>
                <div className="flex items-center gap-1 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-0.5 text-xs dark:border-slate-700 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setUseCustomTime(false)}
                    className={`rounded-md px-2.5 py-1 font-medium transition ${
                      !useCustomTime
                        ? "bg-[#2563EB] text-white"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    Sekarang
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseCustomTime(true)}
                    className={`rounded-md px-2.5 py-1 font-medium transition ${
                      useCustomTime
                        ? "bg-[#2563EB] text-white"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    Atur Tanggal &amp; Jam
                  </button>
                </div>
              </div>

              {useCustomTime && (
                <input
                  type="datetime-local"
                  value={publishedAtInput}
                  onChange={(e) => setPublishedAtInput(e.target.value)}
                  aria-label="Tanggal dan waktu upload"
                  className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs outline-none focus:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800 sm:w-auto"
                />
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 pt-4 dark:border-slate-700">
              <button
                type="button"
                disabled={busy}
                onClick={() => router.back()}
                className="rounded-lg border border-[#CBD5E1] bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-[#F8FAFC] disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={busy || titleHasLink}
                onClick={() => submitContent("DRAFT")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#2563EB] bg-white px-4 py-2 text-sm font-semibold text-[#2563EB] hover:bg-[#2563EB]/10 disabled:opacity-50 dark:bg-slate-800 dark:text-blue-300"
              >
                {submittingMode === "DRAFT" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {submittingMode === "DRAFT" ? "Menyimpan..." : "Simpan Draf"}
              </button>
              <button
                type="submit"
                disabled={busy || titleHasLink || captionOverLimit}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50"
              >
                {submittingMode === "PUBLISHED" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {submittingMode === "PUBLISHED"
                  ? "Mempublikasikan..."
                  : "Publikasikan"}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="sticky top-20 space-y-4 rounded-xl border border-[#CBD5E1] bg-white p-4 dark:border-slate-700 dark:bg-[#1E293B] sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">Media Konten</span>
              <div
                role="group"
                aria-label="Jenis media konten"
                className="flex items-center gap-1 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-0.5 text-xs dark:border-slate-700 dark:bg-slate-800"
              >
                <button
                  type="button"
                  onClick={() => setContentMode("IMAGE")}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition ${
                    contentMode === "IMAGE"
                      ? "bg-[#2563EB] text-white"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  Gambar
                </button>
                <button
                  type="button"
                  onClick={() => setContentMode("TEXT")}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition ${
                    contentMode === "TEXT"
                      ? "bg-[#2563EB] text-white"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Hanya Teks
                </button>
              </div>
            </div>

            {contentMode === "TEXT" ? (
              <div className="rounded-xl border border-[#CBD5E1] bg-[#CBD5E1] p-5 text-[#1E293B] dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <FileText className="h-4 w-4 text-[#2563EB]" />
                  Pratinjau Konten Teks (#CBD5E1)
                </div>
                <p className="mt-3 text-sm font-bold">
                  {title.trim() || "Judul konten Anda akan tampil di sini"}
                </p>
                <p className="mt-2 line-clamp-6 whitespace-pre-line text-xs leading-relaxed opacity-85">
                  {caption.trim() ||
                    "Konten teks saja ditampilkan dalam kartu editorial berlatar #CBD5E1."}
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Format Rasio
                  </span>
                  <div className="flex items-center gap-1 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-0.5 text-xs dark:border-slate-700 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => setImageFormat("PORTRAIT")}
                      className={`rounded-md px-2.5 py-1 font-medium transition ${
                        imageFormat === "PORTRAIT"
                          ? "bg-[#2563EB] text-white"
                          : "text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      Portrait (4:5)
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageFormat("LANDSCAPE")}
                      className={`rounded-md px-2.5 py-1 font-medium transition ${
                        imageFormat === "LANDSCAPE"
                          ? "bg-[#2563EB] text-white"
                          : "text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      Landscape (16:9)
                    </button>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => handleSelectedFile(e.target.files?.[0])}
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="space-y-3">
                    <div
                      className={`relative w-full overflow-hidden rounded-lg border border-[#CBD5E1] bg-[#1E293B] ${
                        imageFormat === "LANDSCAPE" ? "aspect-[16/9]" : "aspect-[4/5]"
                      }`}
                    >
                      <canvas
                        ref={previewCanvasRef}
                        onPointerDown={(event) => {
                          if (!imageReady) return;
                          event.currentTarget.setPointerCapture?.(event.pointerId);
                          dragStateRef.current = {
                            startX: event.clientX,
                            startY: event.clientY,
                            startOffsetX: offsetX,
                            startOffsetY: offsetY,
                          };
                        }}
                        onPointerMove={(event) => {
                          if (!dragStateRef.current) return;
                          const dx = (event.clientX - dragStateRef.current.startX) / 140;
                          const dy = (event.clientY - dragStateRef.current.startY) / 140;
                          setOffsetX(Math.max(-1, Math.min(1, dragStateRef.current.startOffsetX + dx)));
                          setOffsetY(Math.max(-1, Math.min(1, dragStateRef.current.startOffsetY + dy)));
                        }}
                        onPointerUp={() => {
                          dragStateRef.current = null;
                        }}
                        onPointerLeave={() => {
                          dragStateRef.current = null;
                        }}
                        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
                      />
                    </div>

                    <div className="space-y-2.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-3 dark:border-slate-700 dark:bg-slate-800">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                          <Crop className="h-3.5 w-3.5 text-[#2563EB]" />
                          Sesuaikan Crop &amp; Bingkai
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setFitMode("cover")}
                            className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                              fitMode === "cover"
                                ? "bg-[#2563EB] text-white"
                                : "bg-white text-slate-600 dark:bg-slate-700 dark:text-slate-200"
                            }`}
                          >
                            Crop Penuh
                          </button>
                          <button
                            type="button"
                            onClick={() => setFitMode("contain")}
                            className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                              fitMode === "contain"
                                ? "bg-[#2563EB] text-white"
                                : "bg-white text-slate-600 dark:bg-slate-700 dark:text-slate-200"
                            }`}
                          >
                            Utuh (#1E293B)
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1">
                            <ZoomIn className="h-3 w-3 text-[#2563EB]" />
                            Perbesaran
                          </span>
                          <span className="font-mono">{zoom.toFixed(2)}x</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="2.5"
                          step="0.05"
                          value={zoom}
                          onChange={(e) => setZoom(Number(e.target.value))}
                          className="w-full accent-[#2563EB]"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Seret gambar di kanvas untuk menggeser area</span>
                        <button
                          type="button"
                          onClick={() => {
                            setZoom(1);
                            setOffsetX(0);
                            setOffsetY(0);
                            setFitMode("cover");
                          }}
                          className="inline-flex items-center gap-1 font-semibold text-[#2563EB] hover:underline"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Reset
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <span className="truncate font-mono">{file?.name}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="font-semibold text-[#2563EB] hover:underline"
                        >
                          Ganti
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="inline-flex items-center gap-1 font-semibold text-red-600 hover:underline"
                        >
                          <Trash2 className="h-3 w-3" />
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                ) : existingImageUrl ? (
                  <div className="space-y-3">
                    <div
                      className={`flex w-full items-center justify-center overflow-hidden rounded-lg border border-[#CBD5E1] bg-[#1E293B] ${
                        imageFormat === "LANDSCAPE" ? "aspect-[16/9]" : "aspect-[4/5]"
                      }`}
                    >
                      <img
                        src={existingImageUrl}
                        alt="Gambar draf tersimpan"
                        className={
                          imageFormat === "LANDSCAPE"
                            ? "max-h-full w-full object-contain"
                            : "h-full w-full object-cover"
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <span>Gambar tersimpan pada draf</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="font-semibold text-[#2563EB] hover:underline"
                        >
                          Ganti Gambar
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="font-semibold text-red-600 hover:underline"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragActive(false);
                      handleSelectedFile(event.dataTransfer.files?.[0]);
                    }}
                    className={`flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 text-center transition ${
                      imageFormat === "LANDSCAPE" ? "aspect-[16/9]" : "aspect-[4/5]"
                    } ${
                      dragActive
                        ? "border-[#2563EB] bg-[#2563EB]/10"
                        : "border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#2563EB] dark:border-slate-600 dark:bg-slate-800"
                    }`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#2563EB]/30 bg-white text-[#2563EB] dark:bg-slate-700">
                      <ImagePlus className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-sm font-semibold">
                      Pilih atau seret gambar ke sini
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      JPG, PNG, WebP, atau GIF (maks. 5 MB).
                    </p>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
