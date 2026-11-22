"use client";

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";

export default function ContentGuard() {
  const [toast, setToast] = useState("");

  useEffect(() => {
    let timer = null;

    function triggerNotice(msg) {
      setToast(msg);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setToast(""), 2400);
    }

    function handleContextMenu(event) {
      const target = event.target;
      const isEditable =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (!isEditable) {
        event.preventDefault();
        triggerNotice("Klik kanan dinonaktifkan untuk melindungi hak cipta karya.");
      }
    }

    function handleDragStart(event) {
      if (event.target instanceof HTMLImageElement) {
        event.preventDefault();
      }
    }

    function handleKeyDown(event) {
      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key.toLowerCase() === "s" || event.key.toLowerCase() === "u")
      ) {
        event.preventDefault();
        triggerNotice("Pengunduhan langsung dibatasi untuk melindungi hak cipta.");
      }
    }

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (!toast) return null;

  return (
    <div
      role="status"
      className="fixed bottom-16 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-[#2563EB]/30 bg-[#1E293B] px-3.5 py-2 text-xs font-medium text-[#F8FAFC] shadow-lg md:bottom-6"
    >
      <Shield className="h-3.5 w-3.5 text-[#3B82F6]" />
      <span>{toast}</span>
    </div>
  );
}
