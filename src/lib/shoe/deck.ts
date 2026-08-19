import type { Card, CardRank, Suit } from "./types";

const SUITS: readonly Suit[] = ["hearts", "diamonds", "clubs", "spades"];

const CARD_RANKS: readonly CardRank[] = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];

export function buildDecks(deckCount: number): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < deckCount; d++) {
    for (const suit of SUITS) {
      for (const rank of CARD_RANKS) {
        cards.push({ rank, suit });
      }
    }
  }
  return cards;
}

export function shuffleInPlace(cards: Card[]): void {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
}
