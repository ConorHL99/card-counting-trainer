"use server";

import { auth } from "@/auth";
import { db, userSettings } from "@/lib/db";
import type { UserSettingsValues } from "@/lib/db/settings";

/**
 * Unlike saveDrillProgress (drill-actions.ts), this throws when nobody
 * is signed in rather than silently no-opping — Settings is a signed-in
 * -only page to begin with (see src/app/settings/page.tsx), so reaching
 * here while signed out means the session expired mid-visit, which the
 * caller should surface as an error, not swallow.
 */
export async function updateUserSettings(values: UserSettingsValues): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not signed in");

  await db
    .insert(userSettings)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { ...values, updatedAt: new Date() },
    });
}
