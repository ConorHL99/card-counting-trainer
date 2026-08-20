import { CHIP_DENOMINATIONS } from "@/lib/chips";
import { ChipView } from "@/components/Chip";

/**
 * Purely decorative — there's no real "house bankroll" tracked
 * anywhere (the schema only tracks the player's), and the spec only
 * requires the PLAYER's stack to be numerically accurate. This is
 * table dressing for visual symmetry with the player's rack, in the
 * same "props, not a person" spirit as CLAUDE.md rule #8's no-dealer-
 * avatar rule. See MISTAKES.md.
 */
export function DealerChipTray() {
  return (
    <div className="flex items-center justify-center gap-1 opacity-80" aria-hidden="true">
      {CHIP_DENOMINATIONS.map((denomination) => (
        <ChipView key={denomination.value} denomination={denomination} size="sm" />
      ))}
    </div>
  );
}
