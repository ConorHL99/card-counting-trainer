import type { Card, CardRank } from "@/lib/shoe";
import type { CountingSystemConfig, Rank } from "@/lib/counting-systems";

/**
 * Bridges the shoe engine's card representation (which distinguishes
 * J/Q/K for display) with the counting-system config's tag-value keys
 * (which collapse them to "10", since every supported system values
 * them identically).
 */
function toCountingRank(rank: CardRank): Rank {
  if (rank === "J" || rank === "Q" || rank === "K") return "10";
  return rank;
}

/** The count value a single card contributes under the given system.
 * Always reads from `system.tagValues` — never branches on system id
 * (CLAUDE.md rule #1). */
export function tagValueFor(card: Card, system: CountingSystemConfig): number {
  return system.tagValues[toCountingRank(card.rank)];
}

/** Running count for a sequence of dealt cards under the given system. */
export function computeRunningCount(cards: Card[], system: CountingSystemConfig): number {
  return cards.reduce((sum, card) => sum + tagValueFor(card, system), 0);
}

/**
 * Rounded to the nearest half deck, not an exact fraction. A real
 * counter estimates this by eye (how much of the shoe/discard tray is
 * left) — nobody actually knows "4.68 decks remaining." Rounding here
 * means every derived true-count calculation divides by a "nice"
 * number (a whole or half deck) instead of an arbitrary decimal,
 * which is both more realistic and dramatically easier to do in your
 * head. See MISTAKES.md.
 */
export function computeDecksRemaining(cardsRemainingInShoe: number): number {
  const exact = cardsRemainingInShoe / 52;
  return Math.round(exact * 2) / 2;
}

/** Since computeDecksRemaining always returns a whole or half number,
 * `.toFixed(1)` would show a misleading "5.0" for a whole deck — this
 * only shows the ".5" when it's actually there. */
export function formatDecksRemaining(decksRemaining: number): string {
  return Number.isInteger(decksRemaining) ? String(decksRemaining) : decksRemaining.toFixed(1);
}

/**
 * True-count conversion: running count ÷ decks remaining, rounded to
 * the nearest WHOLE number — not a decimal. Real counters don't
 * operate at finer precision than this, and nothing in this app's own
 * strategy needs it either: the bet ramp and every Illustrious 18
 * deviation threshold are already whole numbers (see MISTAKES.md).
 * This is the standard per-deck normalization used by balanced
 * counting systems — callers should only surface it for systems where
 * `system.balanced` is true. Unbalanced systems (e.g. KO) don't use
 * this conversion at all; that's a system-config property to branch a
 * *feature* on, not a reason to special-case the math here.
 */
export function computeTrueCount(runningCount: number, decksRemaining: number): number {
  if (decksRemaining <= 0) return runningCount;
  return Math.round(runningCount / decksRemaining);
}
