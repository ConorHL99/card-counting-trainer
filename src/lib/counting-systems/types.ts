/**
 * Core types for the counting-system config engine.
 *
 * Per CLAUDE.md rule #1: no drill, page, or game mode may hardcode a
 * specific system's tag values or balanced/unbalanced assumption.
 * Everything reads from a `CountingSystemConfig` looked up by id.
 */

/** Card ranks as tracked for counting purposes. 10/J/Q/K share a slot
 * because every counting system in use here values them identically. */
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "A";

export const RANKS: readonly Rank[] = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "A",
] as const;

export type DifficultyTier = "easy" | "common" | "advanced" | "expert";

export const DIFFICULTY_TIERS: readonly DifficultyTier[] = [
  "easy",
  "common",
  "advanced",
  "expert",
] as const;

export interface CountingSystemConfig {
  /** Stable identifier, used as the lookup key everywhere (URLs, DB rows, etc). */
  id: string;
  name: string;
  difficulty: DifficultyTier;

  /** Count value contributed by each rank as it's dealt. */
  tagValues: Record<Rank, number>;

  /** Whether the running count requires true-count (per-deck) conversion
   * to be betting/playing relevant. Unbalanced systems (e.g. KO) don't. */
  balanced: boolean;

  /** Standard efficiency metadata, used for stats display — not gameplay logic. */
  bettingCorrelation: number;
  insuranceCorrelation: number;

  /** Whether the Illustrious 18 / Fab 4 deviation module can attach to
   * this system. Initially Hi-Lo only per spec. */
  supportsDeviations: boolean;
}
