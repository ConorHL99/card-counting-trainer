import type { Card } from "@/lib/shoe";
import { randomId } from "@/lib/random-id";

/** A dealt card with a stable per-instance id, separate from
 * rank/suit — needed so DealingTable (SPEC.md §7.2) can key each card
 * for animation without misidentifying duplicate rank/suit cards from
 * a multi-deck shoe, and without restarting an in-flight animation
 * when unrelated state changes trigger a re-render.
 *
 * `faceDown` is Play Mode-specific (the dealer's hole card) — omitted/
 * false for every card the drills deal, which always show immediately.
 * When a `DealtCard` that was `faceDown: true` transitions to `false`
 * on the same `id` (never a new card), DealingTable replays the flip
 * in place rather than the deck-to-hand slide, since the card is
 * already sitting on the table. See DealingTable.tsx's DealtCardView.
 */
export interface DealtCard {
  id: string;
  card: Card;
  faceDown?: boolean;
}

/** One table position's cards for the most recent round — the dealer,
 * the user's own hand (or hands, if split — one TableHand per split
 * hand), and one entry per active simulated seat (or just the lone
 * drawn card in flashcard mode, which has no hand structure at all). */
export interface TableHand {
  id: string;
  label: string;
  cards: DealtCard[];
}

export function wrapCard(card: Card, faceDown = false): DealtCard {
  return { id: randomId(), card, faceDown };
}
