import { getInitials } from "@/lib/format";

const SIZE_CLASSES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-20 w-20 text-xl",
};

export default function Avatar({
  name,
  username,
  avatarUrl,
  size = "md",
  className = "",
}) {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const label = name || username || "Kreator";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`Foto profil ${label}`}
        className={`shrink-0 rounded-full border border-neutral-200 bg-neutral-100 object-cover ${sizeClass} ${className}`}
      />
    );
  }

  const initials = getInitials(name, username);

  return (
    <span
      aria-label={`Avatar ${label}`}
      className={`flex shrink-0 items-center justify-center rounded-full bg-neutral-900 font-semibold text-white ${sizeClass} ${className}`}
    >
      {initials}
    </span>
  );
}
