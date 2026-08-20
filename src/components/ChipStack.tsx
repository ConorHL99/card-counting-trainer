import type { ChipStackEntry } from "@/lib/chips";
import { ChipView } from "@/components/Chip";

interface ChipStackViewProps {
  entries: ChipStackEntry[];
  size?: "sm" | "md";
  emptyLabel?: string;
}

/**
 * Renders an exact chip breakdown (from breakdownToChips) as one chip
 * per denomination with a count badge — not a literal pile of N
 * overlapping chip graphics, which would get unwieldy (and misleading
 * to lay out) for a large count. The badge number is still exact, so
 * the displayed total always equals the real amount it represents.
 */
export function ChipStackView({ entries, size = "md", emptyLabel = "—" }: ChipStackViewProps) {
  if (entries.length === 0) {
    return <span className="text-xs text-ink-muted">{emptyLabel}</span>;
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {entries.map((entry) => (
        <div key={entry.denomination.value} className="relative inline-flex">
          <ChipView denomination={entry.denomination} size={size} />
          {entry.count > 1 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-felt-950 px-1 text-[10px] font-semibold text-gold-400 ring-1 ring-gold-500/60">
              {entry.count}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
