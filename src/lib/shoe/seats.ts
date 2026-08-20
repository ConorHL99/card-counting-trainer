import type { Action, Card, SeatSkill, SimulatedSeatConfig } from "./types";
import type { Shoe } from "./shoe";
import { getBasicStrategyAction } from "./basic-strategy";
import { evaluateHand } from "./hand";

/** Exported so Play Mode's own interactive split logic uses the exact
 * same cap as the simulated-seat engine, rather than a second
 * hardcoded "4" that could drift out of sync with this one. */
export const MAX_SPLIT_HANDS = 4;
const IMPERFECT_ERROR_RATE = 0.15;

export interface SeatHandResult {
  cards: Card[];
  total: number;
  isBust: boolean;
  isBlackjack: boolean;
  doubled: boolean;
  surrendered: boolean;
}

/**
 * Tracks which simulated seats are active at a table. Deliberately has
 * no knowledge of the shoe or running count — adding/removing a seat
 * must never reset a count (CLAUDE.md rule #9), and keeping this class
 * shoe-agnostic makes that impossible to get wrong by accident. Seats
 * carry no stats/persistence of their own, per the same rule.
 */
export class SeatManager {
  private seats = new Map<string, SimulatedSeatConfig>();

  addSeat(config: SimulatedSeatConfig): void {
    this.seats.set(config.id, config);
  }

  removeSeat(id: string): void {
    this.seats.delete(id);
  }

  listSeats(): SimulatedSeatConfig[] {
    return Array.from(this.seats.values());
  }
}

function pickAction(
  skill: SeatSkill,
  playerCards: Card[],
  dealerUpCard: Card,
  options: { canDouble: boolean; canSplit: boolean; canSurrender: boolean },
): Action {
  const correct = getBasicStrategyAction(playerCards, dealerUpCard, options);
  if (skill === "basic-strategy") return correct;

  // "imperfect" mimics a casual player: occasionally declines an
  // aggressive play (double/split/surrender) for the passive
  // alternative, or misjudges a plain hit/stand call.
  if (Math.random() >= IMPERFECT_ERROR_RATE) return correct;

  switch (correct) {
    case "double":
    case "split":
    case "surrender":
      return "hit";
    case "hit":
      return "stand";
    case "stand":
      return "hit";
    default:
      return correct;
  }
}

interface PendingHand {
  cards: Card[];
  isFirstAction: boolean;
  fromSplitAces: boolean;
}

function finalizeHand(cards: Card[], doubled: boolean, surrendered = false): SeatHandResult {
  const value = evaluateHand(cards);
  return {
    cards,
    total: value.total,
    isBust: value.total > 21,
    isBlackjack: value.isBlackjack,
    doubled,
    surrendered,
  };
}

/**
 * Plays one simulated seat's full round — including any splits — to
 * completion, drawing every card from the given shoe. Callers must
 * pass the same `Shoe` instance used for the dealer and the user's own
 * hand (CLAUDE.md rule #2 / MISTAKES.md "simulated seats bypassing the
 * shared shoe") — never a separate mock deck.
 */
export function playSimulatedSeatHand(
  shoe: Shoe,
  skill: SeatSkill,
  initialCards: [Card, Card],
  dealerUpCard: Card,
): SeatHandResult[] {
  const results: SeatHandResult[] = [];
  const pending: PendingHand[] = [
    { cards: [...initialCards], isFirstAction: true, fromSplitAces: false },
  ];

  while (pending.length > 0) {
    const hand = pending.shift()!;

    if (hand.fromSplitAces) {
      // Standard rule: split aces receive exactly one card each and
      // cannot be acted on further.
      hand.cards.push(shoe.draw());
      results.push(finalizeHand(hand.cards, false));
      continue;
    }

    let doubled = false;
    let surrendered = false;

    for (;;) {
      const value = evaluateHand(hand.cards);
      if (value.total > 21) break;

      const canSplit =
        results.length + pending.length < MAX_SPLIT_HANDS - 1 &&
        hand.cards.length === 2 &&
        hand.cards[0].rank === hand.cards[1].rank;

      const action = pickAction(skill, hand.cards, dealerUpCard, {
        canDouble: hand.cards.length === 2,
        canSplit,
        canSurrender: hand.isFirstAction && hand.cards.length === 2,
      });

      if (action === "stand") break;

      if (action === "surrender") {
        surrendered = true;
        break;
      }

      if (action === "split") {
        const [a, b] = hand.cards;
        const isAceSplit = a.rank === "A";
        // Ace-split hands get their one card lazily, in the
        // `fromSplitAces` branch above, so it isn't dealt twice.
        pending.push({
          cards: isAceSplit ? [a] : [a, shoe.draw()],
          isFirstAction: false,
          fromSplitAces: isAceSplit,
        });
        hand.cards = [b, shoe.draw()];
        hand.isFirstAction = false;
        if (isAceSplit) {
          results.push(finalizeHand(hand.cards, false));
          hand.cards = [];
          break;
        }
        continue;
      }

      if (action === "double") {
        hand.cards.push(shoe.draw());
        doubled = true;
        break;
      }

      // hit
      hand.cards.push(shoe.draw());
      hand.isFirstAction = false;
    }

    if (hand.cards.length > 0) {
      results.push(finalizeHand(hand.cards, doubled, surrendered));
    }
  }

  return results;
}
