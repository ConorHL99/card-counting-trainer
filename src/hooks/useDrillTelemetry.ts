"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { saveDrillProgress } from "@/lib/db/drill-actions";
import type { DrillProgressInput } from "@/lib/db/drill-persistence";

interface DrillTelemetryConfig {
  drillType: DrillProgressInput["drillType"];
  systemId: string;
  mode: DrillProgressInput["mode"];
}

/**
 * Rolling per-session stats for the drill pages, upserted to the DB
 * after every graded round (see drill-actions.ts for why this is a
 * continuous upsert rather than a single "on completion" write — none
 * of these drills have an explicit end-of-session action). Silently a
 * no-op server-side when nobody's signed in; the caller never needs to
 * branch on auth state.
 */
export function useDrillTelemetry(config: DrillTelemetryConfig) {
  // Held in a ref (rather than as useCallback deps) so recordCheck and
  // recordDeal keep a stable identity across renders — callers hook
  // them into effects keyed on other things (e.g. drill.feedback) and
  // a changing identity there would either need a lint-suppressed
  // effect dep or risk re-firing on the same feedback object. Synced
  // in an effect, not during render — refs are for post-render reads.
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  });

  const sessionIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<string | null>(null);
  const totalRef = useRef(0);
  const correctRef = useRef(0);
  const streakRef = useRef(0);
  const longestStreakRef = useRef(0);
  const dealTimestampsRef = useRef<number[]>([]);

  const reset = useCallback(() => {
    sessionIdRef.current = null;
    startedAtRef.current = null;
    totalRef.current = 0;
    correctRef.current = 0;
    streakRef.current = 0;
    longestStreakRef.current = 0;
    dealTimestampsRef.current = [];
  }, []);

  /** Call once per card/round dealt in shoe-mode drills, to derive
   * avgMsPerCard. Scenario-based drills (true count, bet sizing) have
   * no "card" concept and never call this — avgMsPerCard stays null. */
  const recordDeal = useCallback(() => {
    dealTimestampsRef.current.push(Date.now());
  }, []);

  const recordCheck = useCallback(
    (correct: boolean) => {
      if (!sessionIdRef.current) {
        sessionIdRef.current = crypto.randomUUID();
        startedAtRef.current = new Date().toISOString();
      }
      totalRef.current += 1;
      if (correct) {
        correctRef.current += 1;
        streakRef.current += 1;
        longestStreakRef.current = Math.max(longestStreakRef.current, streakRef.current);
      } else {
        streakRef.current = 0;
      }

      const timestamps = dealTimestampsRef.current;
      let avgMsPerCard: number | null = null;
      if (timestamps.length >= 2) {
        const deltas: number[] = [];
        for (let i = 1; i < timestamps.length; i++) deltas.push(timestamps[i] - timestamps[i - 1]);
        avgMsPerCard = Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length);
      }

      void saveDrillProgress({
        sessionId: sessionIdRef.current,
        systemId: configRef.current.systemId,
        drillType: configRef.current.drillType,
        mode: configRef.current.mode,
        startedAt: startedAtRef.current!,
        accuracyPercent: Math.round((correctRef.current / totalRef.current) * 1000) / 10,
        avgMsPerCard,
        longestStreak: longestStreakRef.current,
      });
    },
    [],
  );

  // Memoized so the returned object itself has a stable identity —
  // callers can depend on `telemetry` as a whole in an effect's
  // dependency array without it re-firing every render.
  return useMemo(() => ({ recordDeal, recordCheck, reset }), [recordDeal, recordCheck, reset]);
}
