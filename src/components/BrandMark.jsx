export default function BrandMark({ size = "md" }) {
  const boxSize =
    size === "lg" ? "h-10 w-10 text-sm rounded-lg" : "h-8 w-8 text-xs rounded-md";
  const textSize = size === "lg" ? "text-xl" : "text-[17px]";

  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`flex shrink-0 items-center justify-center bg-neutral-950 font-bold tracking-tight text-white ${boxSize}`}
      >
        BK
      </span>
      <span
        className={`font-bold tracking-tight text-neutral-950 ${textSize}`}
      >
        BedahKarya
      </span>
    </span>
  );
}
