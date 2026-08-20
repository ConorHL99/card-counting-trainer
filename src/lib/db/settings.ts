import { eq } from "drizzle-orm";
import { db, userSettings } from "@/lib/db";

export interface UserSettingsValues {
  defaultSystemId: string;
  defaultRevealCount: boolean;
  defaultRevealCorrectAction: boolean;
}

export const DEFAULT_USER_SETTINGS: UserSettingsValues = {
  defaultSystemId: "hi-lo",
  defaultRevealCount: false,
  defaultRevealCorrectAction: false,
};

/**
 * No row exists for a user until they actually save Settings once (see
 * settings-actions.ts) — sign-in only creates the `users` row, per
 * CLAUDE.md. Falls back to the schema's own documented defaults rather
 * than writing a row just because someone viewed the page.
 */
export async function getUserSettings(userId: string): Promise<UserSettingsValues> {
  const row = await db.query.userSettings.findFirst({ where: eq(userSettings.userId, userId) });
  if (!row) return DEFAULT_USER_SETTINGS;
  return {
    defaultSystemId: row.defaultSystemId,
    defaultRevealCount: row.defaultRevealCount,
    defaultRevealCorrectAction: row.defaultRevealCorrectAction,
  };
}
