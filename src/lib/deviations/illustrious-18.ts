import { getBasicStrategyAction, type Action, type Card, type CardRank } from "@/lib/shoe";

/**
 * A curated, high-confidence subset of the standard Hi-Lo "Illustrious
 * 18" and "Fab 4" index plays — situations where the true count
 * changes the correct play from what basic strategy alone would say.
 * These specific threshold numbers are widely and consistently
 * published across card-counting literature (e.g. Schlesinger's
 * "Blackjack Attack"), but this is not claimed to be an exhaustive or
 * perfectly canonical 22-entry list — a few commonly-cited low-count
 * "hit instead of stand" plays (e.g. 12 vs 4/5/6, 13 vs 2/3) were left
 * out because their exact thresholds couldn't be verified with
 * confidence from memory alone. See MISTAKES.md.
 *
 * Deliberately Hi-Lo only, per SPEC.md §3's `supportsDeviations` flag
 * — these thresholds are calibrated to Hi-Lo's specific tag values and
 * would be wrong for another system's true count. The drill filters
 * eligible systems by that config flag (not a hardcoded system id),
 * so it stays config-driven per CLAUDE.md rule #1 even though only one
 * system currently qualifies.
 */

export type DeviationKind = "insurance" | "play";

export interface DeviationRule {
  id: string;
  label: string;
  kind: DeviationKind;
  /** Omitted for insurance — insurance is offered independent of the
   * player's own hand. */
  playerCards?: [CardRank, CardRank];
  dealerUpRank: CardRank;
  /** The count threshold. All entries in this curated set deviate at
   * or above their threshold — high true counts favor the more
   * aggressive play (stand, double, split, insurance, surrender). */
  threshold: number;
  deviationAction: Action | "insurance";
  /** Options passed to getBasicStrategyAction to compute the "off
   * count" baseline action — e.g. hit/stand deviations assume
   * surrender isn't in play, so canSurrender is false there even for
   * a hand that would otherwise be a surrender candidate. */
  basicOptions: { canDouble: boolean; canSplit: boolean; canSurrender: boolean };
}

const NO_EXTRAS = { canDouble: false, canSplit: false, canSurrender: false };
const DOUBLE_ONLY = { canDouble: true, canSplit: false, canSurrender: false };
const SPLIT_ONLY = { canDouble: false, canSplit: true, canSurrender: false };
const SURRENDER_ONLY = { canDouble: false, canSplit: false, canSurrender: true };

export const DEVIATION_RULES: readonly DeviationRule[] = [
  {
    id: "insurance",
    label: "Insurance (dealer shows Ace)",
    kind: "insurance",
    dealerUpRank: "A",
    threshold: 3,
    deviationAction: "insurance",
    basicOptions: NO_EXTRAS,
  },
  {
    id: "16v10",
    label: "Hard 16 vs 10",
    kind: "play",
    playerCards: ["10", "6"],
    dealerUpRank: "10",
    threshold: 0,
    deviationAction: "stand",
    basicOptions: NO_EXTRAS,
  },
  {
    id: "15v10",
    label: "Hard 15 vs 10",
    kind: "play",
    playerCards: ["10", "5"],
    dealerUpRank: "10",
    threshold: 4,
    deviationAction: "stand",
    basicOptions: NO_EXTRAS,
  },
  {
    id: "16v9",
    label: "Hard 16 vs 9",
    kind: "play",
    playerCards: ["10", "6"],
    dealerUpRank: "9",
    threshold: 5,
    deviationAction: "stand",
    basicOptions: NO_EXTRAS,
  },
  {
    id: "12v2",
    label: "Hard 12 vs 2",
    kind: "play",
    playerCards: ["10", "2"],
    dealerUpRank: "2",
    threshold: 3,
    deviationAction: "stand",
    basicOptions: NO_EXTRAS,
  },
  {
    id: "12v3",
    label: "Hard 12 vs 3",
    kind: "play",
    playerCards: ["10", "2"],
    dealerUpRank: "3",
    threshold: 2,
    deviationAction: "stand",
    basicOptions: NO_EXTRAS,
  },
  {
    id: "TT-v5",
    label: "10,10 vs 5",
    kind: "play",
    playerCards: ["10", "10"],
    dealerUpRank: "5",
    threshold: 5,
    deviationAction: "split",
    basicOptions: SPLIT_ONLY,
  },
  {
    id: "TT-v6",
    label: "10,10 vs 6",
    kind: "play",
    playerCards: ["10", "10"],
    dealerUpRank: "6",
    threshold: 4,
    deviationAction: "split",
    basicOptions: SPLIT_ONLY,
  },
  {
    id: "9v2",
    label: "Hard 9 vs 2",
    kind: "play",
    playerCards: ["4", "5"],
    dealerUpRank: "2",
    threshold: 1,
    deviationAction: "double",
    basicOptions: DOUBLE_ONLY,
  },
  {
    id: "9v7",
    label: "Hard 9 vs 7",
    kind: "play",
    playerCards: ["4", "5"],
    dealerUpRank: "7",
    threshold: 3,
    deviationAction: "double",
    basicOptions: DOUBLE_ONLY,
  },
  {
    id: "10v10",
    label: "Hard 10 vs 10",
    kind: "play",
    playerCards: ["4", "6"],
    dealerUpRank: "10",
    threshold: 4,
    deviationAction: "double",
    basicOptions: DOUBLE_ONLY,
  },
  {
    id: "10vA",
    label: "Hard 10 vs Ace",
    kind: "play",
    playerCards: ["4", "6"],
    dealerUpRank: "A",
    threshold: 4,
    deviationAction: "double",
    basicOptions: DOUBLE_ONLY,
  },
  {
    id: "11vA",
    label: "Hard 11 vs Ace",
    kind: "play",
    playerCards: ["5", "6"],
    dealerUpRank: "A",
    threshold: 1,
    deviationAction: "double",
    basicOptions: DOUBLE_ONLY,
  },
  {
    id: "14v10-R",
    label: "Hard 14 vs 10 (surrender)",
    kind: "play",
    playerCards: ["9", "5"],
    dealerUpRank: "10",
    threshold: 3,
    deviationAction: "surrender",
    basicOptions: SURRENDER_ONLY,
  },
  {
    id: "15v9-R",
    label: "Hard 15 vs 9 (surrender)",
    kind: "play",
    playerCards: ["10", "5"],
    dealerUpRank: "9",
    threshold: 2,
    deviationAction: "surrender",
    basicOptions: SURRENDER_ONLY,
  },
  {
    id: "15vA-R",
    label: "Hard 15 vs Ace (surrender)",
    kind: "play",
    playerCards: ["10", "5"],
    dealerUpRank: "A",
    threshold: 1,
    deviationAction: "surrender",
    basicOptions: SURRENDER_ONLY,
  },
] as const;

function card(rank: CardRank): Card {
  return { rank, suit: "spades" };
}

/** The basic-strategy action for a rule's hand, computed via the
 * shared basic-strategy engine rather than re-typed by hand — so the
 * "off count" side of every deviation always agrees with the same
 * chart the simulated seats play by. */
export function basicActionFor(rule: DeviationRule): Action {
  if (rule.kind === "insurance" || !rule.playerCards) return "hit";
  const [a, b] = rule.playerCards;
  return getBasicStrategyAction([card(a), card(b)], card(rule.dealerUpRank), rule.basicOptions);
}

/** The correct action for a rule at a given true count — the
 * deviation action once the count crosses the threshold, otherwise
 * whatever basic strategy says. */
export function correctActionFor(
  rule: DeviationRule,
  trueCount: number,
): Action | "insurance" | "no-insurance" {
  if (trueCount >= rule.threshold) return rule.deviationAction;
  if (rule.kind === "insurance") return "no-insurance";
  return basicActionFor(rule);
}
