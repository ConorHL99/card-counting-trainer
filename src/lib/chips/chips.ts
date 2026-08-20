/**
 * Standard casino chip denominations and colors. Values are whole
 * dollars — Play Mode's bankroll/bets never carry cents (blackjack's
 * 3:2 payout and insurance's half-bet stake both round to the nearest
 * dollar, see MISTAKES.md), so an exact integer breakdown is always
 * possible.
 */
export interface ChipDenomination {
  value: number;
  colorClass: string;
  edgeClass: string;
}

export const CHIP_DENOMINATIONS: readonly ChipDenomination[] = [
  { value: 500, colorClass: "bg-purple-600 text-white", edgeClass: "border-purple-300" },
  { value: 100, colorClass: "bg-neutral-900 text-white", edgeClass: "border-neutral-400" },
  { value: 25, colorClass: "bg-emerald-600 text-white", edgeClass: "border-emerald-200" },
  { value: 5, colorClass: "bg-red-600 text-white", edgeClass: "border-red-200" },
  { value: 1, colorClass: "bg-neutral-100 text-neutral-900", edgeClass: "border-neutral-400" },
];

/** The denominations offered as click targets in the betting UI —
 * $1 exists only to make bankroll breakdowns exact (e.g. after a
 * rounded payout leaves an odd dollar), not as a normal betting
 * increment. */
export const BETTABLE_DENOMINATIONS: readonly number[] = CHIP_DENOMINATIONS.filter(
  (d) => d.value >= 5,
).map((d) => d.value);

export interface ChipStackEntry {
  denomination: ChipDenomination;
  count: number;
}

/**
 * Exact greedy decomposition — the returned stacks always sum to
 * `amount` precisely, which is what makes the player's chip display a
 * true representation of their bankroll rather than a decorative
 * approximation. Negative/fractional input is defensively floored to
 * 0 rather than throwing, since this only ever renders a display.
 */
export function breakdownToChips(amount: number): ChipStackEntry[] {
  let remaining = Math.max(0, Math.floor(amount));
  const result: ChipStackEntry[] = [];
  for (const denomination of CHIP_DENOMINATIONS) {
    const count = Math.floor(remaining / denomination.value);
    if (count > 0) {
      result.push({ denomination, count });
      remaining -= count * denomination.value;
    }
  }
  return result;
}
