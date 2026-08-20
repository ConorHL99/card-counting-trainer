"use client";

import { useMemo, useState } from "react";
import { buildStrategyChart } from "@/lib/blackjack";
import { StrategyChartTable } from "@/components/StrategyChartTable";
import { SettingToggle } from "@/components/SettingToggle";

/**
 * Toggleable basic-strategy reference card (SPEC.md §5.4) — a manual
 * lookup for the player to check mid-decision, styled after the
 * physical cards real casinos hand out. Deliberately NOT counting-
 * aware (that's the separate correctness-notification overlay's job,
 * see src/lib/deviations/live-lookup.ts) — a real printed strategy
 * card has no true count on it either.
 *
 * Same toggle convention as every other reveal control (SPEC.md §7.1):
 * a compact SettingToggle, fixed in a corner so it never clutters the
 * table when closed, per your instruction.
 */
export function StrategyCard() {
  const [open, setOpen] = useState(false);
  const chart = useMemo(() => buildStrategyChart(), []);

  return (
    <div className="fixed right-3 bottom-3 z-40 flex flex-col items-end gap-2 sm:right-4 sm:bottom-4">
      {open && (
        <div className="max-h-[70vh] w-[min(92vw,26rem)] overflow-y-auto rounded-card border border-gold-500/40 bg-felt-950 p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Basic Strategy</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close strategy card"
              className="text-ink-muted hover:text-ink"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <StrategyChartTable title="Hard totals" rows={chart.hard} dealerColumns={chart.dealerColumns} />
            <StrategyChartTable
              title="Soft totals (Ace + …)"
              rows={chart.soft}
              dealerColumns={chart.dealerColumns}
            />
            <StrategyChartTable title="Pairs" rows={chart.pairs} dealerColumns={chart.dealerColumns} />
          </div>
          <p className="mt-2 text-[10px] text-ink-muted">
            H hit · S stand · D double · P split · R surrender — plain basic strategy, not
            counting-aware.
          </p>
        </div>
      )}
      <div className="felt-panel px-3 py-2">
        <SettingToggle
          id="strategy-card-toggle"
          label="Strategy card"
          checked={open}
          onChange={setOpen}
          offHint="hidden"
          onHint="reference chart shown"
        />
      </div>
    </div>
  );
}
