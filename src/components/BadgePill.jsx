"use client";

import {
  Award,
  Brain,
  Crown,
  HeartHandshake,
  Megaphone,
  Shield,
  Star,
  Wrench,
} from "lucide-react";

const BADGE_ICONS = {
  brain: Brain,
  star: Star,
  wrench: Wrench,
  "heart-handshake": HeartHandshake,
  crown: Crown,
  megaphone: Megaphone,
  award: Award,
  shield: Shield,
};

export default function BadgePill({ badge, compact = false }) {
  if (!badge) return null;
  const Icon = BADGE_ICONS[badge.icon] || Award;

  if (compact) {
    return (
      <span
        title={badge.description || badge.name}
        className="inline-flex items-center gap-1 rounded border border-[#2563EB]/30 bg-[#2563EB]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#2563EB] dark:border-[#3B82F6]/40 dark:bg-[#2563EB]/20 dark:text-[#93C5FD]"
      >
        <Icon className="h-2.5 w-2.5 shrink-0" />
        <span>{badge.name}</span>
      </span>
    );
  }

  return (
    <span
      title={badge.description || badge.name}
      className="inline-flex items-center gap-1.5 rounded-md border border-[#2563EB]/30 bg-[#2563EB]/10 px-2.5 py-1 text-xs font-semibold text-[#2563EB] dark:border-[#3B82F6]/40 dark:bg-[#2563EB]/20 dark:text-[#93C5FD]"
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{badge.name}</span>
    </span>
  );
}
