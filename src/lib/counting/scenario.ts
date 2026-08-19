import { getCountingSystem } from "@/lib/counting-systems";
import { Shoe, type Card } from "@/lib/shoe";
import { computeRunningCount, computeDecksRemaining, computeTrueCount } from "./count";

export interface TrueCountScenario {
  runningCount: number;
  decksRemaining: number;
  trueCount: number;
}

/**
 * Generates a true-count scenario by actually dealing a random-length
 * sequence from a fresh shoe (shared shoe engine, CLAUDE.md rule #2)
 * rather than synthesizing arbitrary running-count/decks-remaining
 * pairs out of thin air — keeps scenarios in a realistic range. Used
 * by both the True Count Conversion Drill and the Bet-Sizing Drill.
 */
export function generateTrueCountScenario(systemId: string, deckCount: number): TrueCountScenario {
  const system = getCountingSystem(systemId);
  const shoe = new Shoe({ dealMode: "shoe", deckCount, penetration: 0.75 });
  const maxDraw = Math.max(1, shoe.shufflePoint - 1);
  const drawCount = 1 + Math.floor(Math.random() * maxDraw);
  const cards: Card[] = [];
  for (let i = 0; i < drawCount; i++) cards.push(shoe.draw());

  const runningCount = computeRunningCount(cards, system);
  const decksRemaining = computeDecksRemaining(shoe.remaining);
  const trueCount = computeTrueCount(runningCount, decksRemaining);
  return { runningCount, decksRemaining, trueCount };
}
