import type { Card } from "@/lib/shoe";

const SUIT_SYMBOLS: Record<Card["suit"], string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const RED_SUITS = new Set<Card["suit"]>(["hearts", "diamonds"]);

export function PlayingCardView({ card }: { card: Card }) {
  const isRed = RED_SUITS.has(card.suit);
  return (
    <span
      className={`inline-flex h-16 w-12 flex-col items-center justify-center rounded-card border border-felt-line bg-card font-mono text-lg font-semibold sm:h-20 sm:w-14 sm:text-xl ${
        isRed ? "text-danger" : "text-card-ink"
      }`}
    >
      <span>{card.rank}</span>
      <span>{SUIT_SYMBOLS[card.suit]}</span>
    </span>
  );
}
