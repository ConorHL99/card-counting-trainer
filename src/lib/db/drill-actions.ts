"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, drillSessions } from "@/lib/db";
import { persistDrillProgress, type DrillProgressInput } from "@/lib/db/drill-persistence";

export type { DrillProgressInput };

/**
 * Fire-and-forget telemetry write, called after every graded round in
 * a drill. Not signed in → drills stay fully usable, they just don't
 * persist (no login prompt, no error surfaced) — practice shouldn't
 * require an account, in the same spirit as CLAUDE.md rule #9 not
 * requiring accounts for simulated seats. See MISTAKES.md.
 *
 * Never throws: this is best-effort background persistence, not part
 * of any drill's critical path, so a DB hiccup must never surface as
 * a broken drill UI.
 */
export async function saveDrillProgress(input: DrillProgressInput): Promise<void> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return;
    await persistDrillProgress(userId, input);
  } catch (err) {
    console.error("saveDrillProgress failed", err);
  }
}

/** Used only by the smoke test, to avoid leaving test rows behind in
 * a real developer's local database. */
export async function deleteDrillSession(sessionId: string) {
  await db.delete(drillSessions).where(eq(drillSessions.id, sessionId));
}
