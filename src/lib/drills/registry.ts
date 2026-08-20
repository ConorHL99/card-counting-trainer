/**
 * The one list of available drills — SPEC.md §5.3. Shared by the
 * Drills index, the Dashboard's quick-launch links, and the Stats
 * page's history log labels, so a new drill only ever gets added here
 * once rather than re-listed per page.
 */
export interface DrillRegistryEntry {
  /** Matches drill_sessions.drill_type exactly (src/lib/db/drill-persistence.ts). */
  drillType: "running-count" | "true-count" | "speed" | "deviations" | "bet-sizing";
  href: string;
  title: string;
  description: string;
}

export const DRILL_REGISTRY: readonly DrillRegistryEntry[] = [
  {
    drillType: "running-count",
    href: "/drills/running-count",
    title: "Running Count",
    description: "Cards are dealt one at a time — track the running count as you go.",
  },
  {
    drillType: "true-count",
    href: "/drills/true-count",
    title: "True Count Conversion",
    description: "Given a running count and decks remaining, convert to true count.",
  },
  {
    drillType: "speed",
    href: "/drills/speed",
    title: "Speed Drill",
    description: "Timed, fixed pace you control.",
  },
  {
    drillType: "deviations",
    href: "/drills/deviations",
    title: "Deviation Index",
    description: "Illustrious 18 / Fab 4 calls (Hi-Lo only).",
  },
  {
    drillType: "bet-sizing",
    href: "/drills/bet-sizing",
    title: "Bet Sizing",
    description: "Given a true count, choose the right bet size.",
  },
];

export function getDrillRegistryEntry(drillType: string): DrillRegistryEntry | undefined {
  return DRILL_REGISTRY.find((d) => d.drillType === drillType);
}

/** Falls back to the raw id for any drill_type value that predates a
 * registry entry (shouldn't happen, but a stats page reading historic
 * DB rows shouldn't crash over a label). */
export function getDrillTitle(drillType: string): string {
  return getDrillRegistryEntry(drillType)?.title ?? drillType;
}
