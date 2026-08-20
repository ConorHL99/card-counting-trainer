"use client";

import { useState } from "react";
import Link from "next/link";
import { CountingSystemSelect } from "@/components/CountingSystemSelect";
import { DRILL_REGISTRY } from "@/lib/drills/registry";

interface DashboardPickerProps {
  initialSystemId: string;
}

/**
 * Dashboard's "pick a system, then launch a drill" flow (SPEC.md
 * §5.1). The pick isn't a binding commitment — SPEC calls it
 * "switchable later" — it just pre-fills the drill you land on via
 * `?system=`, same as Resume does; every drill still has its own
 * system picker if you change your mind once there.
 */
export function DashboardPicker({ initialSystemId }: DashboardPickerProps) {
  const [systemId, setSystemId] = useState(initialSystemId);

  return (
    <section className="felt-panel p-4">
      <label htmlFor="dashboard-system" className="mb-1 block text-sm font-medium text-ink">
        Counting system
      </label>
      <CountingSystemSelect id="dashboard-system" value={systemId} onChange={setSystemId} />
      <p className="mt-1 text-xs text-ink-muted">
        Grouped by difficulty — switchable per drill any time.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {DRILL_REGISTRY.map((drill) => (
          <Link
            key={drill.href}
            href={`${drill.href}?system=${systemId}`}
            className="rounded-card border border-felt-line bg-felt-900 px-3 py-2 text-sm text-ink transition-colors hover:border-gold-500/60"
          >
            {drill.title}
          </Link>
        ))}
      </div>

      <Link
        href={`/play?system=${systemId}`}
        className="mt-2 block rounded-card border border-gold-500/50 bg-felt-900 px-3 py-2 text-center text-sm font-medium text-gold-400 transition-colors hover:border-gold-500 hover:bg-felt-800"
      >
        Play Mode — full blackjack hands
      </Link>
    </section>
  );
}
