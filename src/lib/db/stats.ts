import { desc, eq, sql } from "drizzle-orm";
import { db, drillResults, drillSessions } from "@/lib/db";
import type { DealMode } from "@/lib/shoe";

/**
 * Read-only aggregate queries for the Dashboard and Stats/History
 * pages (SPEC.md §5.1, §5.5, §6). No auth dependency — callers (async
 * Server Components) resolve `userId` from `auth()` themselves and
 * pass it in, the same separation as drill-persistence.ts.
 *
 * Every query left-joins drill_results onto drill_sessions rather than
 * assuming a result always exists, since a session row is written
 * before its paired result row in the same upsert transaction (see
 * drill-persistence.ts) — vanishingly unlikely to observe one without
 * the other, but a stats page reading historic data shouldn't crash
 * over it either way.
 */

export interface DashboardSummary {
  totalSessions: number;
  avgAccuracyPercent: number | null;
  longestStreak: number | null;
}

export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  const [row] = await db
    .select({
      totalSessions: sql<number>`count(*)::int`,
      avgAccuracyPercent: sql<number | null>`avg(${drillResults.accuracyPercent})::float8`,
      longestStreak: sql<number | null>`max(${drillResults.longestStreak})::int`,
    })
    .from(drillSessions)
    .leftJoin(drillResults, eq(drillResults.sessionId, drillSessions.id))
    .where(eq(drillSessions.userId, userId));

  return {
    totalSessions: row?.totalSessions ?? 0,
    avgAccuracyPercent: row?.avgAccuracyPercent ?? null,
    longestStreak: row?.longestStreak ?? null,
  };
}

export interface LastSession {
  systemId: string;
  drillType: string;
  mode: DealMode | null;
  endedAt: Date | null;
  accuracyPercent: number | null;
}

export async function getLastSession(userId: string): Promise<LastSession | null> {
  const [row] = await db
    .select({
      systemId: drillSessions.systemId,
      drillType: drillSessions.drillType,
      mode: drillSessions.mode,
      endedAt: drillSessions.endedAt,
      accuracyPercent: drillResults.accuracyPercent,
    })
    .from(drillSessions)
    .leftJoin(drillResults, eq(drillResults.sessionId, drillSessions.id))
    .where(eq(drillSessions.userId, userId))
    .orderBy(desc(drillSessions.endedAt))
    .limit(1);

  return (row as LastSession | undefined) ?? null;
}

export interface SystemStats {
  systemId: string;
  sessionCount: number;
  avgAccuracyPercent: number | null;
  avgMsPerCard: number | null;
  avgDeviationAccuracyPercent: number | null;
  longestStreak: number | null;
}

export async function getStatsBySystem(userId: string): Promise<SystemStats[]> {
  return db
    .select({
      systemId: drillSessions.systemId,
      sessionCount: sql<number>`count(*)::int`,
      avgAccuracyPercent: sql<number | null>`avg(${drillResults.accuracyPercent})::float8`,
      avgMsPerCard: sql<number | null>`avg(${drillResults.avgMsPerCard})::float8`,
      avgDeviationAccuracyPercent: sql<number | null>`avg(${drillResults.deviationAccuracyPercent})::float8`,
      longestStreak: sql<number | null>`max(${drillResults.longestStreak})::int`,
    })
    .from(drillSessions)
    .leftJoin(drillResults, eq(drillResults.sessionId, drillSessions.id))
    .where(eq(drillSessions.userId, userId))
    .groupBy(drillSessions.systemId);
}

export interface SessionHistoryEntry {
  id: string;
  systemId: string;
  drillType: string;
  mode: DealMode | null;
  startedAt: Date;
  endedAt: Date | null;
  accuracyPercent: number | null;
  avgMsPerCard: number | null;
  deviationAccuracyPercent: number | null;
  longestStreak: number | null;
}

export async function getSessionHistory(userId: string, limit = 50): Promise<SessionHistoryEntry[]> {
  const rows = await db
    .select({
      id: drillSessions.id,
      systemId: drillSessions.systemId,
      drillType: drillSessions.drillType,
      mode: drillSessions.mode,
      startedAt: drillSessions.startedAt,
      endedAt: drillSessions.endedAt,
      accuracyPercent: drillResults.accuracyPercent,
      avgMsPerCard: drillResults.avgMsPerCard,
      deviationAccuracyPercent: drillResults.deviationAccuracyPercent,
      longestStreak: drillResults.longestStreak,
    })
    .from(drillSessions)
    .leftJoin(drillResults, eq(drillResults.sessionId, drillSessions.id))
    .where(eq(drillSessions.userId, userId))
    .orderBy(desc(drillSessions.startedAt))
    .limit(limit);

  return rows as SessionHistoryEntry[];
}
