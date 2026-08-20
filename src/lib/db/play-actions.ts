"use server";

import { auth } from "@/auth";
import { persistPlayProgress, type PlayProgressInput } from "@/lib/db/play-persistence";

export type { PlayProgressInput };

/**
 * Same fire-and-forget, silently-no-op-when-signed-out shape as
 * saveDrillProgress (drill-actions.ts) — Play Mode works fully
 * unauthenticated, persistence is a bonus. Never throws to the caller.
 */
export async function savePlayProgress(input: PlayProgressInput): Promise<void> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return;
    await persistPlayProgress(userId, input);
  } catch (err) {
    console.error("savePlayProgress failed", err);
  }
}
