export type { CountingSystemConfig, Rank, DifficultyTier } from "./types";
export { RANKS, DIFFICULTY_TIERS } from "./types";
export { COUNTING_SYSTEMS } from "./systems";

import type { CountingSystemConfig, DifficultyTier } from "./types";
import { COUNTING_SYSTEMS } from "./systems";

/** Look up a system config by id. Throws if the id is unknown — callers
 * should treat an invalid system id as a bug, not a silently-ignored case. */
export function getCountingSystem(id: string): CountingSystemConfig {
  const system = COUNTING_SYSTEMS.find((s) => s.id === id);
  if (!system) {
    throw new Error(`Unknown counting system id: "${id}"`);
  }
  return system;
}

export function listCountingSystems(): readonly CountingSystemConfig[] {
  return COUNTING_SYSTEMS;
}

export function listCountingSystemsByDifficulty(
  difficulty: DifficultyTier,
): readonly CountingSystemConfig[] {
  return COUNTING_SYSTEMS.filter((s) => s.difficulty === difficulty);
}
