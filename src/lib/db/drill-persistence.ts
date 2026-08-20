import { db, drillResults, drillSessions } from "@/lib/db";
import type { DealMode } from "@/lib/shoe";

export interface DrillProgressInput {
  /** Client-generated once per drill session and reused across every
   * write for that session — see the schema comment on
   * drillResults.sessionId for why this is an upsert, not an insert. */
  sessionId: string;
  systemId: string;
  drillType: "running-count" | "true-count" | "speed" | "bet-sizing" | "deviations";
  mode: DealMode | null;
  startedAt: string;
  accuracyPercent: number | null;
  avgMsPerCard: number | null;
  /** Accuracy on just the subset of rounds that were genuine deviation
   * calls (SPEC.md §6) — only the Deviation Index Drill sets this;
   * every other drill leaves it null. Distinct from accuracyPercent
   * because roughly half of that drill's scenarios land under the
   * index threshold (basic strategy is correct, not a deviation). */
  deviationAccuracyPercent: number | null;
  longestStreak: number | null;
}

/** No auth/session dependency by design — kept separate from
 * drill-actions.ts's "use server" boundary so this DB logic can be
 * exercised directly (with an explicit userId) by a smoke test,
 * without needing a real authenticated browser session. */
export async function persistDrillProgress(userId: string, input: DrillProgressInput) {
  await db.transaction(async (tx) => {
    await tx
      .insert(drillSessions)
      .values({
        id: input.sessionId,
        userId,
        systemId: input.systemId,
        drillType: input.drillType,
        mode: input.mode,
        startedAt: new Date(input.startedAt),
        endedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: drillSessions.id,
        set: { endedAt: new Date(), systemId: input.systemId },
      });

    await tx
      .insert(drillResults)
      .values({
        sessionId: input.sessionId,
        accuracyPercent: input.accuracyPercent,
        avgMsPerCard: input.avgMsPerCard,
        deviationAccuracyPercent: input.deviationAccuracyPercent,
        longestStreak: input.longestStreak,
      })
      .onConflictDoUpdate({
        target: drillResults.sessionId,
        set: {
          accuracyPercent: input.accuracyPercent,
          avgMsPerCard: input.avgMsPerCard,
          deviationAccuracyPercent: input.deviationAccuracyPercent,
          longestStreak: input.longestStreak,
        },
      });
  });
}
