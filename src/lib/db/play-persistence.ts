import { desc, eq } from "drizzle-orm";
import { db, playSessions } from "@/lib/db";

/** No dedicated "current bankroll" column anywhere — deliberately.
 * play_sessions.bankroll_trend already exists for exactly this
 * purpose, so a new session's starting bankroll is read from the last
 * point of the user's most recent previous session rather than adding
 * a schema column. See MISTAKES.md. */
export const DEFAULT_STARTING_BANKROLL = 1000;

export async function getStartingBankroll(userId: string): Promise<number> {
  const [row] = await db
    .select({ bankrollTrend: playSessions.bankrollTrend })
    .from(playSessions)
    .where(eq(playSessions.userId, userId))
    .orderBy(desc(playSessions.startedAt))
    .limit(1);

  const trend = row?.bankrollTrend;
  if (trend && trend.length > 0) return trend[trend.length - 1].bankroll;
  return DEFAULT_STARTING_BANKROLL;
}

export interface PlayProgressInput {
  /** Client-generated once per play session, reused across every
   * write for that session — same upsert-per-session shape as
   * drill-persistence.ts, but play_sessions holds its own rollup
   * fields directly (no separate results table needed). */
  sessionId: string;
  systemId: string;
  startedAt: string;
  handsPlayed: number;
  bankrollTrend: { hand: number; bankroll: number }[];
  bettingCorrelation: number | null;
}

/** No auth dependency by design — see drill-persistence.ts for why
 * this split exists (testable directly with an explicit userId). */
export async function persistPlayProgress(userId: string, input: PlayProgressInput): Promise<void> {
  await db
    .insert(playSessions)
    .values({
      id: input.sessionId,
      userId,
      systemId: input.systemId,
      handsPlayed: input.handsPlayed,
      bankrollTrend: input.bankrollTrend,
      bettingCorrelation: input.bettingCorrelation,
      startedAt: new Date(input.startedAt),
      endedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: playSessions.id,
      set: {
        handsPlayed: input.handsPlayed,
        bankrollTrend: input.bankrollTrend,
        bettingCorrelation: input.bettingCorrelation,
        endedAt: new Date(),
      },
    });
}
