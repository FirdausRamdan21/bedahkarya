"use client";

import { useEffect } from "react";
import { AlertTriangle, ExternalLink, ShieldAlert, X } from "lucide-react";

export default function ExternalLinkModal({ isOpen, onClose, url }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !url) {
    return null;
  }

  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = url;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Peringatan tautan eksternal"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/75 p-4 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 shadow-xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-neutral-950">
                Waspada Tautan Eksternal
              </h3>
              <p className="text-xs text-neutral-500">
                Anda akan meninggalkan BedahKarya
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup peringatan tautan"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3.5">
          <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs leading-relaxed text-slate-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
            <p>
              Tautan ini mengarah ke situs di luar pengawasan{" "}
              <span className="font-semibold">BedahKarya</span>. Berhati-hatilah
              terhadap tautan berbahaya, situs phishing, atau unduhan yang tidak
              dikenal. Jangan memasukkan kata sandi maupun data pribadi Anda jika
              meragukan keamanannya.
            </p>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
              Alamat Tujuan ({hostname})
            </p>
            <p className="mt-1 break-all font-mono text-xs text-neutral-900">
              {url}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-neutral-100 pt-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            Batal
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800"
          >
            Lanjutkan ke Tautan
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
