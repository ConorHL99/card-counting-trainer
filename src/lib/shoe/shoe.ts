import type { Card, ShoeConfig } from "./types";
import { buildDecks, shuffleInPlace } from "./deck";

/**
 * The single card-dealing engine used by flashcard drills, shoe
 * drills, Play Mode, and simulated seats alike (CLAUDE.md rule #2 —
 * never duplicate card-dealing logic per feature).
 */
export class Shoe {
  readonly config: ShoeConfig;
  private cards: Card[] = [];
  private dealtSinceShuffle = 0;
  private totalCards = 0;

  constructor(config: ShoeConfig) {
    this.config = config;
    this.shuffle();
  }

  /** Cards left before the shoe is physically empty. */
  get remaining(): number {
    return this.cards.length;
  }

  /** Total cards in a full shoe (deckCount * 52). */
  get size(): number {
    return this.totalCards;
  }

  /** Card count at which a reshuffle is due, derived from penetration.
   * Meaningless in "single-card" mode, which never depletes. */
  get shufflePoint(): number {
    return Math.floor(this.totalCards * this.config.penetration);
  }

  /** True once the cut-card point has been reached — the shoe should
   * be reshuffled before the next round starts (never mid-hand). */
  get needsShuffle(): boolean {
    if (this.config.dealMode === "single-card") return false;
    return this.dealtSinceShuffle >= this.shufflePoint;
  }

  shuffle(): void {
    this.cards = buildDecks(this.config.deckCount);
    shuffleInPlace(this.cards);
    this.totalCards = this.cards.length;
    this.dealtSinceShuffle = 0;
  }

  draw(): Card {
    if (this.config.dealMode === "single-card") {
      const fresh = buildDecks(this.config.deckCount);
      this.dealtSinceShuffle += 1;
      return fresh[Math.floor(Math.random() * fresh.length)];
    }

    const card = this.cards.pop();
    if (!card) {
      throw new Error("Shoe is empty — call shuffle() before drawing again.");
    }
    this.dealtSinceShuffle += 1;
    return card;
  }
}
