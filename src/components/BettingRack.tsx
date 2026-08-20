"use client";

import { BETTABLE_DENOMINATIONS, CHIP_DENOMINATIONS, breakdownToChips } from "@/lib/chips";
import { ChipView } from "@/components/Chip";
import { ChipStackView } from "@/components/ChipStack";

interface BettingRackProps {
  /** True total chips owned — never decremented just by building up a
   * bet, only when the bet actually commits (Deal). */
  bankroll: number;
  currentBet: number;
  onAddChip: (value: number) => void;
  onClearBet: () => void;
  onDeal: () => void;
}

/**
 * The player's betting UI (SPEC.md §5.4) — click a chip to add its
 * value to the bet, same "simpler than drag-and-drop" click-to-add
 * interaction across every denomination. Only rendered during the
 * betting phase; once a round is live, Play Mode shows a plain
 * bankroll readout instead (see src/app/play/page.tsx) — this
 * component doesn't need a "disabled" mode of its own.
 *
 * The rack (chips not yet committed to this bet) and the circle (this
 * bet) are always shown as two separate exact breakdowns that sum to
 * `bankroll` — "the player's chip stack must accurately represent
 * their actual current bankroll value at all times" is satisfied by
 * construction, not by a decorative approximation.
 */
export function BettingRack({ bankroll, currentBet, onAddChip, onClearBet, onDeal }: BettingRackProps) {
  const rackChips = breakdownToChips(bankroll - currentBet);
  const circleChips = breakdownToChips(currentBet);

  return (
    <section className="felt-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-ink-muted">Your rack (${bankroll - currentBet})</p>
          <div className="mt-1">
            <ChipStackView entries={rackChips} size="sm" emptyLabel="Empty" />
          </div>
        </div>
        <div>
          <p className="text-xs text-ink-muted sm:text-right">Betting circle (${currentBet})</p>
          <div className="mt-1 flex sm:justify-end">
            <ChipStackView entries={circleChips} emptyLabel="No bet yet" />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {BETTABLE_DENOMINATIONS.map((value) => {
          const denomination = CHIP_DENOMINATIONS.find((d) => d.value === value)!;
          const disabled = currentBet + value > bankroll;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onAddChip(value)}
              disabled={disabled}
              aria-label={`Add a $${value} chip to your bet`}
              className="rounded-full transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-30"
            >
              <ChipView denomination={denomination} />
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onClearBet}
          disabled={currentBet === 0}
          className="rounded-card bg-felt-700 px-3 py-1.5 text-sm font-medium text-ink hover:bg-felt-800 disabled:opacity-40"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onDeal}
          disabled={currentBet === 0}
          className="rounded-card bg-gold-500 px-5 py-2 font-medium text-felt-950 hover:bg-gold-400 disabled:opacity-40"
        >
          Deal
        </button>
      </div>
    </section>
  );
}
