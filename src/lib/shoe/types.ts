export type Suit = "hearts" | "diamonds" | "clubs" | "spades";

export type CardRank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A";

export interface Card {
  rank: CardRank;
  suit: Suit;
}

/**
 * "single-card" — every draw comes from a freshly composed, freshly
 * shuffled set of `deckCount` decks, independent of any prior draw.
 * Used by flashcard drills that want quick standalone cards with no
 * shoe depletion or penetration tracking.
 *
 * "shoe" — a persistent, depleting shoe with penetration-based
 * reshuffling. Used by shoe drills, Play Mode, and simulated seats.
 */
export type DealMode = "single-card" | "shoe";

export interface ShoeConfig {
  deckCount: number;
  /** Fraction (0, 1] of the shoe dealt before a reshuffle is due. */
  penetration: number;
  dealMode: DealMode;
}

export type Action = "hit" | "stand" | "double" | "split" | "surrender";

export type SeatSkill = "basic-strategy" | "imperfect";

export interface SimulatedSeatConfig {
  id: string;
  skill: SeatSkill;
}
