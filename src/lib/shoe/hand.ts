import type { Card, CardRank } from "./types";

export interface HandValue {
  total: number;
  isSoft: boolean;
  isBlackjack: boolean;
}

function cardValue(rank: CardRank): number {
  if (rank === "A") return 11;
  if (rank === "10" || rank === "J" || rank === "Q" || rank === "K") return 10;
  return Number(rank);
}

export function evaluateHand(cards: Card[]): HandValue {
  let total = 0;
  let softAces = 0;
  for (const card of cards) {
    total += cardValue(card.rank);
    if (card.rank === "A") softAces += 1;
  }
  while (total > 21 && softAces > 0) {
    total -= 10;
    softAces -= 1;
  }
  return {
    total,
    isSoft: softAces > 0,
    isBlackjack: cards.length === 2 && total === 21,
  };
}
