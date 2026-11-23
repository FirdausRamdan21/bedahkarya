export default function BrandMark({ size = "md", onNavbar = false }) {
  const boxSize =
    size === "lg" ? "h-10 w-10 text-sm rounded-lg" : "h-8 w-8 text-xs rounded-md";
  const textSize = size === "lg" ? "text-xl" : "text-[17px]";

  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`flex shrink-0 items-center justify-center font-bold tracking-tight ${boxSize} ${onNavbar
          ? "bg-white text-[#2563EB] shadow-2xs"
          : "bg-[#2563EB] text-white"
          }`}
      >
        BK
      </span>
      <span
        className={`font-bold tracking-tight ${textSize} ${onNavbar ? "text-white" : "text-[#1E293B]"
          }`}
      >
        BedahKarya
      </span>
    </span>
  );
}
