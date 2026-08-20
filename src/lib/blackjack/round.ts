import { evaluateHand, type Card, type Shoe } from "@/lib/shoe";

/**
 * Pure blackjack round-resolution logic — dealer draw rule and hand
 * payout math — kept independent of React so it can be unit-tested
 * headlessly (same discipline as the rest of this project) and so
 * usePlayMode.ts stays focused on state/UI orchestration rather than
 * game-rule arithmetic.
 *
 * House rules (see MISTAKES.md for the reasoning behind each):
 * dealer stands on soft 17, double after split allowed, standard
 * (4-hand) re-split limit, split aces get one card each with no
 * further action, dealer peeks for blackjack on Ace/10 before the
 * player's turn.
 */

/** Stand-on-soft-17 needs no special soft-total case at all — hitting
 * below 17 and standing at-or-above 17 is the entire rule regardless
 * of softness. (A hit-soft-17 house rule would need one; this one
 * doesn't.) */
export function dealerShouldHit(cards: Card[]): boolean {
  return evaluateHand(cards).total < 17;
}

/** Draws additional cards for the dealer from the shared shoe until
 * the stand condition is met. Returns a new array — never mutates the
 * cards passed in, so callers can keep using the pre-draw hand for
 * comparison/animation purposes if needed. */
export function playDealerHand(shoe: Shoe, initialCards: Card[]): Card[] {
  const cards = [...initialCards];
  while (dealerShouldHit(cards)) {
    cards.push(shoe.draw());
  }
  return cards;
}

/** True when the dealer's up-card makes a blackjack possible at all
 * (Ace or any 10-value card) — the trigger for the pre-player-turn
 * peek, and for offering insurance specifically on Ace. */
export function dealerMayHaveBlackjack(upCard: Card): boolean {
  return upCard.rank === "A" || upCard.rank === "10" || upCard.rank === "J" || upCard.rank === "Q" || upCard.rank === "K";
}

export type HandOutcome = "blackjack" | "win" | "push" | "loss" | "bust" | "surrender";

export interface ResolvedHand {
  outcome: HandOutcome;
  /** Fraction of THIS hand's bet returned to the bankroll — not a net
   * gain/loss. The bet itself is assumed already debited from the
   * bankroll when placed/doubled/split, so "returned" is what credits
   * back at resolution: 2.5x blackjack, 2x win, 1x push, 0 loss/bust,
   * 0.5x surrender. */
  returnMultiplier: number;
}

interface PlayerHandState {
  total: number;
  isBust: boolean;
  /** Only true for the ORIGINAL two-card hand — a post-split hand that
   * happens to total 21 on two cards is NOT a blackjack for payout
   * purposes (real casino rule). Callers must track this themselves;
   * evaluateHand()'s own isBlackjack flag doesn't know about splits. */
  isBlackjack: boolean;
  surrendered: boolean;
}

interface DealerHandState {
  total: number;
  isBust: boolean;
  isBlackjack: boolean;
}

export function resolveHand(player: PlayerHandState, dealer: DealerHandState): ResolvedHand {
  if (player.surrendered) return { outcome: "surrender", returnMultiplier: 0.5 };
  if (player.isBust) return { outcome: "bust", returnMultiplier: 0 };

  if (player.isBlackjack) {
    return dealer.isBlackjack
      ? { outcome: "push", returnMultiplier: 1 }
      : { outcome: "blackjack", returnMultiplier: 2.5 };
  }

  if (dealer.isBlackjack) return { outcome: "loss", returnMultiplier: 0 };
  if (dealer.isBust) return { outcome: "win", returnMultiplier: 2 };
  if (player.total > dealer.total) return { outcome: "win", returnMultiplier: 2 };
  if (player.total < dealer.total) return { outcome: "loss", returnMultiplier: 0 };
  return { outcome: "push", returnMultiplier: 1 };
}
