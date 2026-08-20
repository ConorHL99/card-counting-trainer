import type { Action, Card, CardRank } from "./types";
import { evaluateHand } from "./hand";

/**
 * Standard multi-deck basic strategy: dealer stands on soft 17, double
 * after split allowed, late surrender allowed. This chart is a fixed,
 * publicly-known algorithm independent of any counting system — it is
 * not covered by CLAUDE.md rule #1 (that rule is about counting-system
 * tag values / balanced-count logic, not basic strategy).
 */

export type DealerBucket = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "A";
type ActionRow = Record<DealerBucket, Action>;

const DEALER_BUCKETS: readonly DealerBucket[] = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "A",
];

/** Collapses J/Q/K into "10" — despite the name, used for both the
 * dealer's up-card AND player-card ranks anywhere a rank needs to
 * match a strategy-chart column (e.g. Play Mode's deviation lookup
 * comparing a live pair against a DeviationRule's representative
 * pair). Exported for that reuse rather than re-implemented. */
export function rankBucket(rank: CardRank): DealerBucket {
  if (rank === "J" || rank === "Q" || rank === "K") return "10";
  return rank as DealerBucket;
}

function row(spec: Partial<Record<DealerBucket, Action>>, fallback: Action): ActionRow {
  const result = {} as ActionRow;
  for (const bucket of DEALER_BUCKETS) {
    result[bucket] = spec[bucket] ?? fallback;
  }
  return result;
}

// Keyed by hard total 9-16 (<=8 always hits, >=17 always stands).
const HARD_CHART: Record<number, ActionRow> = {
  9: row({ 3: "double", 4: "double", 5: "double", 6: "double" }, "hit"),
  10: row(
    {
      2: "double",
      3: "double",
      4: "double",
      5: "double",
      6: "double",
      7: "double",
      8: "double",
      9: "double",
    },
    "hit",
  ),
  11: row(
    {
      2: "double",
      3: "double",
      4: "double",
      5: "double",
      6: "double",
      7: "double",
      8: "double",
      9: "double",
      10: "double",
    },
    "hit",
  ),
  12: row({ 4: "stand", 5: "stand", 6: "stand" }, "hit"),
  13: row({ 2: "stand", 3: "stand", 4: "stand", 5: "stand", 6: "stand" }, "hit"),
  14: row({ 2: "stand", 3: "stand", 4: "stand", 5: "stand", 6: "stand" }, "hit"),
  15: row({ 2: "stand", 3: "stand", 4: "stand", 5: "stand", 6: "stand", 10: "surrender" }, "hit"),
  16: row(
    { 2: "stand", 3: "stand", 4: "stand", 5: "stand", 6: "stand", 10: "surrender", A: "surrender" },
    "hit",
  ),
};

function getHardAction(total: number, dealer: DealerBucket): Action {
  if (total <= 8) return "hit";
  if (total >= 17) return "stand";
  return HARD_CHART[total][dealer];
}

// Keyed by soft total 13-18 (A,2 .. A,7). Soft 19/20 always stand.
const SOFT_CHART: Record<number, ActionRow> = {
  13: row({ 5: "double", 6: "double" }, "hit"), // A,2
  14: row({ 5: "double", 6: "double" }, "hit"), // A,3
  15: row({ 4: "double", 5: "double", 6: "double" }, "hit"), // A,4
  16: row({ 4: "double", 5: "double", 6: "double" }, "hit"), // A,5
  17: row({ 3: "double", 4: "double", 5: "double", 6: "double" }, "hit"), // A,6
  18: row(
    { 2: "stand", 3: "double", 4: "double", 5: "double", 6: "double", 7: "stand", 8: "stand" },
    "hit",
  ), // A,7
};

function getSoftAction(total: number, dealer: DealerBucket): Action {
  if (total <= 12) return getHardAction(total, dealer);
  if (total >= 19) return "stand";
  return SOFT_CHART[total][dealer];
}

// Keyed by pair rank bucket (10 covers 10/J/Q/K pairs).
const PAIR_CHART: Record<DealerBucket, ActionRow> = {
  "2": row({ 2: "split", 3: "split", 4: "split", 5: "split", 6: "split", 7: "split" }, "hit"),
  "3": row({ 2: "split", 3: "split", 4: "split", 5: "split", 6: "split", 7: "split" }, "hit"),
  "4": row({ 5: "split", 6: "split" }, "hit"),
  "5": row(
    {
      2: "double",
      3: "double",
      4: "double",
      5: "double",
      6: "double",
      7: "double",
      8: "double",
      9: "double",
    },
    "hit",
  ), // never split — treat as hard 10
  "6": row({ 2: "split", 3: "split", 4: "split", 5: "split", 6: "split" }, "hit"),
  "7": row({ 2: "split", 3: "split", 4: "split", 5: "split", 6: "split", 7: "split" }, "hit"),
  "8": row({}, "split"), // always split
  "9": row(
    {
      2: "split",
      3: "split",
      4: "split",
      5: "split",
      6: "split",
      8: "split",
      9: "split",
      7: "stand",
      10: "stand",
      A: "stand",
    },
    "stand",
  ),
  "10": row({}, "stand"), // never split tens
  A: row({}, "split"), // always split
};

export interface StrategyOptions {
  canDouble: boolean;
  canSplit: boolean;
  canSurrender: boolean;
}

export function getBasicStrategyAction(
  playerCards: Card[],
  dealerUpCard: Card,
  options: StrategyOptions,
): Action {
  const dealer = rankBucket(dealerUpCard.rank);

  if (
    options.canSplit &&
    playerCards.length === 2 &&
    playerCards[0].rank === playerCards[1].rank
  ) {
    const pairBucket = rankBucket(playerCards[0].rank);
    if (PAIR_CHART[pairBucket][dealer] === "split") return "split";
  }

  const hand = evaluateHand(playerCards);
  const rawAction = hand.isSoft
    ? getSoftAction(hand.total, dealer)
    : getHardAction(hand.total, dealer);

  if (rawAction === "double" && !options.canDouble) return "hit";
  if (rawAction === "surrender" && !options.canSurrender) return "hit";
  return rawAction;
}
