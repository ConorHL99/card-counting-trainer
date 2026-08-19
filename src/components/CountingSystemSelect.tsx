"use client";

import {
  DIFFICULTY_TIERS,
  listCountingSystemsByDifficulty,
  type CountingSystemConfig,
} from "@/lib/counting-systems";

interface CountingSystemSelectProps {
  id?: string;
  value: string;
  onChange: (id: string) => void;
  /** Optionally restrict the offered systems, e.g. balanced-only for
   * the True Count drill. Never hardcode a system id here — filter on
   * a config property instead (CLAUDE.md rule #1). */
  filter?: (system: CountingSystemConfig) => boolean;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function CountingSystemSelect({ id, value, onChange, filter }: CountingSystemSelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-card border border-felt-line bg-felt-900 px-3 py-2 text-sm text-ink"
    >
      {DIFFICULTY_TIERS.map((tier) => {
        const systems = listCountingSystemsByDifficulty(tier).filter(
          (system) => !filter || filter(system),
        );
        if (systems.length === 0) return null;
        return (
          <optgroup key={tier} label={capitalize(tier)}>
            {systems.map((system) => (
              <option key={system.id} value={system.id}>
                {system.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}
