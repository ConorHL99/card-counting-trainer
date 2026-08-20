"use client";

import { useSearchParams } from "next/navigation";
import { listCountingSystems, type CountingSystemConfig } from "@/lib/counting-systems";

/**
 * Reads `?system=` (set by the Dashboard's picker and its Resume
 * card — see src/components/DashboardPicker.tsx and src/app/page.tsx)
 * as a drill's starting counting system, falling back to Hi-Lo for a
 * bare visit or an unrecognized id rather than letting a crafted/stale
 * link crash the page via getCountingSystem's throw-on-unknown-id.
 *
 * The Dashboard's picker offers every system regardless of which drill
 * you launch into, but True Count/Bet-Sizing only accept balanced
 * systems and Deviations only accepts supportsDeviations ones (same
 * filters those pages already pass to CountingSystemSelect) — an
 * optional `filter` here makes an incoming id that fails a drill's own
 * constraint (e.g. picking KO, then clicking True Count) fall back to
 * the first system that satisfies it, rather than silently generating
 * a scenario the drill isn't meant to support (e.g. a "true count" for
 * an unbalanced system).
 *
 * Calls useSearchParams, so any page using this must render it inside
 * a <Suspense> boundary (Next.js requirement) — see each drill page's
 * outer default export.
 */
export function useInitialSystemId(
  fallback: string = "hi-lo",
  filter?: (system: CountingSystemConfig) => boolean,
): string {
  const searchParams = useSearchParams();
  const requested = searchParams.get("system");
  const systems = listCountingSystems();

  if (requested && systems.some((s) => s.id === requested && (!filter || filter(s)))) {
    return requested;
  }
  if (filter) {
    const firstMatch = systems.find(filter);
    if (firstMatch) return firstMatch.id;
  }
  return fallback;
}
