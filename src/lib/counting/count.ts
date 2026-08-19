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

export function computeDecksRemaining(cardsRemainingInShoe: number): number {
  return cardsRemainingInShoe / 52;
}

/**
 * True-count conversion: running count ÷ decks remaining, rounded to
 * one decimal. This is the standard per-deck normalization used by
 * balanced counting systems — callers should only surface it for
 * systems where `system.balanced` is true. Unbalanced systems (e.g.
 * KO) don't use this conversion at all; that's a system-config
 * property to branch a *feature* on, not a reason to special-case the
 * math here.
 */
export function computeTrueCount(runningCount: number, decksRemaining: number): number {
  if (decksRemaining <= 0) return runningCount;
  return Math.round((runningCount / decksRemaining) * 10) / 10;
}
