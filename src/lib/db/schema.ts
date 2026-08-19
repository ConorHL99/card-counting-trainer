import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Schema per SPEC.md §8. `counting_systems` is deliberately not a
 * table here — that entry was marked "TBD: DB table or config file"
 * in the spec, resolved to config file (the existing
 * src/lib/counting-systems module already satisfies CLAUDE.md rule
 * #1's "adding a system means adding a config entry, not new code
 * paths," and a DB table would just be a sync burden with no
 * benefit). See MISTAKES.md. Anywhere below that references a
 * counting system stores its config `id` as plain text, not a DB
 * foreign key — validated at the application layer against the
 * config array, the same way an enum-like value backed by code
 * (rather than a database row) normally is.
 */

/** Mirrors a PocketID account — created on first login, never
 * self-registered (CLAUDE.md data model conventions). Every other
 * table below keys off `users.id`, never off `pocketIdSub` directly,
 * keeping the PocketID-subject mapping in this one place. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  pocketIdSub: text("pocket_id_sub").notNull().unique(),
  email: text("email"),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Counting-system config id (e.g. "hi-lo") — see the module note above. */
  defaultSystemId: text("default_system_id").notNull().default("hi-lo"),
  defaultRevealCount: boolean("default_reveal_count").notNull().default(false),
  defaultRevealCorrectAction: boolean("default_reveal_correct_action").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const drillSessions = pgTable("drill_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Counting-system config id — see the module note above. */
  systemId: text("system_id").notNull(),
  /** e.g. "running-count" | "true-count" | "speed" | "deviations" |
   * "bet-sizing" — a plain string, not a DB enum, so adding a new
   * drill type never needs a migration. */
  drillType: text("drill_type").notNull(),
  /** "flashcard" | "shoe" — null for scenario-based drills (true
   * count, bet sizing, deviations) that have no deal-mode concept. */
  mode: text("mode"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export const drillResults = pgTable("drill_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => drillSessions.id, { onDelete: "cascade" }),
  accuracyPercent: real("accuracy_percent"),
  avgMsPerCard: integer("avg_ms_per_card"),
  /** Deviation-call accuracy specifically (SPEC.md §6 — a harder,
   * separately-tracked metric than overall accuracy). Null for drills
   * with no deviation component. */
  deviationAccuracyPercent: real("deviation_accuracy_percent"),
  longestStreak: integer("longest_streak"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const playSessions = pgTable("play_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Counting-system config id — see the module note above. */
  systemId: text("system_id").notNull(),
  handsPlayed: integer("hands_played").notNull().default(0),
  /** Win/loss and bankroll trend (SPEC.md §6 — "fun stat, not
   * skill-relevant"), stored as a simple per-hand point array rather
   * than its own table since nothing else ever queries into it. */
  bankrollTrend: jsonb("bankroll_trend").$type<{ hand: number; bankroll: number }[]>(),
  bettingCorrelation: real("betting_correlation"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type DrillSession = typeof drillSessions.$inferSelect;
export type DrillResult = typeof drillResults.$inferSelect;
export type PlaySession = typeof playSessions.$inferSelect;
