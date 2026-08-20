"use client";

import { CountingSystemSelect } from "@/components/CountingSystemSelect";
import { SettingToggle } from "@/components/SettingToggle";
import { Term } from "@/components/Term";
import type { DealMode } from "@/lib/shoe";
import type { DrillSeat } from "@/hooks/useCardStreamDrill";

const DECK_OPTIONS = [1, 2, 4, 6, 8];
const PENETRATION_OPTIONS = [0.5, 0.65, 0.75, 0.85];
const MAX_SEATS = 6;

interface DrillConfigPanelProps {
  systemId: string;
  onSystemChange: (id: string) => void;
  dealMode: DealMode;
  onModeChange: (isShoe: boolean) => void;
  deckCount: number;
  onDeckCountChange: (n: number) => void;
  penetration: number;
  onPenetrationChange: (p: number) => void;
  seats: DrillSeat[];
  onAddSeat: () => void;
  onRemoveSeat: (id: string) => void;
  onSetSeatSkill: (id: string, imperfect: boolean) => void;
  revealCount: boolean;
  onRevealCountChange: (v: boolean) => void;
  /** Play Mode is always shoe mode — there's no flashcard concept for
   * a real blackjack round — so it hides the toggle entirely rather
   * than showing a switch with only one meaningful position. Deck
   * count/penetration/seats still render normally underneath. */
  hideModeToggle?: boolean;
  /** Play Mode shows its own single consolidated overlays panel
   * (reveal count + its own counting-aware toggles together) that
   * stays visible across every round phase, not just while this
   * config panel itself is shown — see src/components/PlayModeView.tsx. */
  hideRevealCount?: boolean;
  /** Disables the system/deck/penetration controls without unmounting
   * them — Play Mode passes this while a round is in progress instead
   * of hiding the whole panel, so the panel's presence (and therefore
   * everything below it) doesn't shift position every time a round
   * starts/ends. Seats stay fully interactive regardless (CLAUDE.md
   * rule #9 — addable/removable "at any point"). See MISTAKES.md. */
  disableConfig?: boolean;
}

/**
 * The config block shared by every card-stream drill (Running Count,
 * Speed): counting system, flashcard vs. shoe mode, deck count /
 * penetration, simulated seats, and the reveal-count toggle. One
 * component so the drills stay visually and behaviorally identical
 * here, per CLAUDE.md's "don't build one-off UI" workflow expectation.
 */
export function DrillConfigPanel({
  systemId,
  onSystemChange,
  dealMode,
  onModeChange,
  deckCount,
  onDeckCountChange,
  penetration,
  onPenetrationChange,
  seats,
  onAddSeat,
  onRemoveSeat,
  onSetSeatSkill,
  revealCount,
  onRevealCountChange,
  hideModeToggle,
  hideRevealCount,
  disableConfig,
}: DrillConfigPanelProps) {
  return (
    <section className="felt-panel flex flex-col gap-4 p-4">
      <div>
        <label htmlFor="system-select" className="mb-1 block text-sm font-medium text-ink">
          Counting system
        </label>
        <CountingSystemSelect
          id="system-select"
          value={systemId}
          onChange={onSystemChange}
          disabled={disableConfig}
        />
      </div>

      {!hideModeToggle && (
        <SettingToggle
          id="mode-toggle"
          label="Shoe mode"
          checked={dealMode === "shoe"}
          onChange={onModeChange}
          offHint="quick reshuffled single cards"
          onHint="realistic depleting multi-deck shoe"
        />
      )}

      {dealMode === "shoe" && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="deck-count" className="mb-1 block text-sm font-medium text-ink">
                Decks
              </label>
              <select
                id="deck-count"
                value={deckCount}
                onChange={(e) => onDeckCountChange(Number(e.target.value))}
                disabled={disableConfig}
                className="w-full rounded-card border border-felt-line bg-felt-900 px-3 py-2 text-sm text-ink disabled:opacity-40"
              >
                {DECK_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="penetration" className="mb-1 block text-sm font-medium text-ink">
                <Term id="penetration">Penetration</Term>
              </label>
              <select
                id="penetration"
                value={penetration}
                onChange={(e) => onPenetrationChange(Number(e.target.value))}
                disabled={disableConfig}
                className="w-full rounded-card border border-felt-line bg-felt-900 px-3 py-2 text-sm text-ink disabled:opacity-40"
              >
                {PENETRATION_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {Math.round(p * 100)}%
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-ink">
                Simulated seats ({seats.length}/{MAX_SEATS})
              </span>
              <button
                type="button"
                onClick={onAddSeat}
                disabled={seats.length >= MAX_SEATS}
                className="rounded-card bg-felt-700 px-3 py-1 text-xs font-medium text-ink hover:bg-felt-800 disabled:opacity-40"
              >
                Add seat
              </button>
            </div>
            <p className="mb-2 text-xs text-ink-muted">
              Extra players consuming cards from the same shoe — more realistic counting
              practice. Adding or removing a seat never resets your count.
            </p>
            <ul className="flex flex-col gap-2">
              {seats.map((seat, i) => (
                <li key={seat.id} className="flex items-center justify-between gap-3">
                  <SettingToggle
                    id={`seat-${seat.id}`}
                    label={`Seat ${i + 1}: imperfect play`}
                    checked={seat.skill === "imperfect"}
                    onChange={(checked) => onSetSeatSkill(seat.id, checked)}
                    offHint="always correct basic strategy"
                    onHint="occasionally misplays, like a real player"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveSeat(seat.id)}
                    className="shrink-0 rounded-card px-2 py-1 text-xs text-ink-muted hover:text-danger"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {!hideRevealCount && (
        <SettingToggle
          id="reveal-count"
          label="Reveal count"
          checked={revealCount}
          onChange={onRevealCountChange}
          offHint="hidden — test yourself"
          onHint="always visible"
        />
      )}
    </section>
  );
}

