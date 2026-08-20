import {
  getBasicStrategyAction,
  type Action,
  type Card,
  type CardRank,
  type DealerBucket,
  type StrategyOptions,
} from "@/lib/shoe";

/**
 * Builds the physical-strategy-card reference chart (SPEC.md §5.4) by
 * calling the same getBasicStrategyAction engine every drill/seat/
 * Play Mode decision already goes through — never a second, re-typed
 * copy of the chart. This is the plain basic-strategy chart (not
 * counting-aware) — real printed strategy cards don't have a true
 * count on them either; Play Mode's separate correctness overlay is
 * what layers deviations on top, on a per-decision basis.
 */

export interface StrategyChartRow {
  /** e.g. "17", "A,7", "8,8" */
  label: string;
  actions: Record<DealerBucket, Action>;
}

export interface StrategyChart {
  hard: StrategyChartRow[];
  soft: StrategyChartRow[];
  pairs: StrategyChartRow[];
  dealerColumns: readonly DealerBucket[];
}

const DEALER_COLUMNS: readonly DealerBucket[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "A"];

// Every cell assumes the action would be legal if chosen — a printed
// card doesn't know how many cards you're holding. Play Mode's own
// live correctness check (src/lib/deviations/live-lookup.ts) is what
// actually gates on real legality; this is a reference chart only.
const FULL_OPTIONS: StrategyOptions = { canDouble: true, canSplit: true, canSurrender: true };

function repCard(rank: CardRank): Card {
  return { rank, suit: "spades" };
}

function rankFor(value: number): CardRank {
  return value === 10 ? "10" : (String(value) as CardRank);
}

function repHandForHardTotal(total: number): [CardRank, CardRank] {
  // 8-12: a "2" plus the remainder (6-10) never accidentally pairs
  // with the 2. 13-17: a "10" plus the remainder (3-7) never
  // accidentally pairs with the 10.
  if (total <= 12) return ["2", rankFor(total - 2)];
  return ["10", rankFor(total - 10)];
}

function buildRow(label: string, playerCards: [CardRank, CardRank]): StrategyChartRow {
  const actions = {} as Record<DealerBucket, Action>;
  for (const bucket of DEALER_COLUMNS) {
    actions[bucket] = getBasicStrategyAction(
      [repCard(playerCards[0]), repCard(playerCards[1])],
      repCard(bucket),
      FULL_OPTIONS,
    );
  }
  return { label, actions };
}

export function buildStrategyChart(): StrategyChart {
  const hard: StrategyChartRow[] = [];
  for (let total = 17; total >= 8; total--) {
    hard.push(buildRow(String(total), repHandForHardTotal(total)));
  }

  const soft: StrategyChartRow[] = [];
  for (let total = 20; total >= 13; total--) {
    soft.push(buildRow(`A,${total - 11}`, ["A", rankFor(total - 11)]));
  }

  const pairs: StrategyChartRow[] = [];
  for (const bucket of DEALER_COLUMNS) {
    pairs.push(buildRow(`${bucket},${bucket}`, [bucket, bucket]));
  }

  return { hard, soft, pairs, dealerColumns: DEALER_COLUMNS };
}
