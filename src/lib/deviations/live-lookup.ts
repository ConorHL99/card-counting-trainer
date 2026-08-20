import {
  evaluateHand,
  getBasicStrategyAction,
  rankBucket,
  type Action,
  type Card,
  type CardRank,
  type StrategyOptions,
} from "@/lib/shoe";
import type { CountingSystemConfig } from "@/lib/counting-systems";
import { DEVIATION_RULES, type DeviationRule } from "./illustrious-18";

function repCard(rank: CardRank): Card {
  return { rank, suit: "spades" };
}

/**
 * Matches a real, in-progress hand against the Illustrious 18/Fab 4
 * rule set (Play Mode's live equivalent of what the Deviation Index
 * Drill does with synthetic scenarios). Unlike the drill — which only
 * ever needs to construct one representative scenario per rule — a
 * real hand can reach the same total/composition many different ways
 * (e.g. a hard 16 from 10-6, 9-7, or a 3-card 10-3-3), so matching is
 * done by (total, isSoft) for hit/stand/double/surrender rules, and by
 * actual pair rank for split rules, rather than by exact card ranks.
 *
 * `options` gates out a deviation whose action isn't currently legal
 * (e.g. a double-deviation on a 3-card hand, where doubling is no
 * longer available) — falls through to plain basic strategy in that
 * case rather than suggesting an illegal move.
 */
export function findApplicableDeviation(
  playerCards: Card[],
  dealerUpCard: Card,
  options: StrategyOptions,
): DeviationRule | undefined {
  const dealerRank = rankBucket(dealerUpCard.rank);

  return DEVIATION_RULES.find((rule) => {
    if (rule.kind !== "play" || !rule.playerCards) return false;
    if (rankBucket(rule.dealerUpRank) !== dealerRank) return false;

    if (rule.deviationAction === "split") {
      if (!options.canSplit || playerCards.length !== 2) return false;
      const playerBucket = rankBucket(playerCards[0].rank);
      if (rankBucket(playerCards[1].rank) !== playerBucket) return false;
      return rankBucket(rule.playerCards[0]) === playerBucket;
    }

    if (rule.deviationAction === "double" && !options.canDouble) return false;
    if (rule.deviationAction === "surrender" && !options.canSurrender) return false;

    const live = evaluateHand(playerCards);
    const target = evaluateHand(rule.playerCards.map(repCard));
    return live.total === target.total && live.isSoft === target.isSoft;
  });
}

/**
 * The counting-aware correct action — Play Mode's per-decision
 * correctness overlay (SPEC.md §5.4) needs this, not
 * getBasicStrategyAction alone, since a deviation can override basic
 * strategy once the true count crosses its threshold. Only engages for
 * systems flagged `supportsDeviations` (Hi-Lo today) — CLAUDE.md rule
 * #1, config-driven rather than a hardcoded system check.
 */
export function getCountingAwareAction(
  playerCards: Card[],
  dealerUpCard: Card,
  trueCount: number,
  system: CountingSystemConfig,
  options: StrategyOptions,
): Action {
  if (system.supportsDeviations) {
    const rule = findApplicableDeviation(playerCards, dealerUpCard, options);
    if (rule && trueCount >= rule.threshold) return rule.deviationAction as Action;
  }
  return getBasicStrategyAction(playerCards, dealerUpCard, options);
}

/** The counting-aware insurance call — true count at/above the
 * Illustrious 18 insurance rule's threshold, for `supportsDeviations`
 * systems. Not offered as a concept for systems that don't support
 * deviations (insurance is always -EV without a specific threshold to
 * check against) — callers should only surface this when the active
 * system supports deviations, same as the play-action case above. */
export function shouldTakeInsurance(trueCount: number): boolean {
  const rule = DEVIATION_RULES.find((r) => r.kind === "insurance");
  return rule !== undefined && trueCount >= rule.threshold;
}
