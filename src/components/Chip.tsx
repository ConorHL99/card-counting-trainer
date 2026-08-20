import type { ChipDenomination } from "@/lib/chips";

interface ChipViewProps {
  denomination: ChipDenomination;
  size?: "sm" | "md";
}

/** One casino chip — solid color per denomination (CLAUDE.md rule #7's
 * felt/gold tokens are the app's theme, but chips need their own
 * standard casino colors to be recognizable, hence the plain Tailwind
 * palette classes here rather than app design tokens). */
export function ChipView({ denomination, size = "md" }: ChipViewProps) {
  const dims = size === "sm" ? "h-8 w-8 text-[9px]" : "h-11 w-11 text-[11px] sm:h-12 sm:w-12 sm:text-xs";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-[3px] border-dashed font-mono font-bold shadow-sm ${dims} ${denomination.colorClass} ${denomination.edgeClass}`}
    >
      ${denomination.value}
    </span>
  );
}
