"use client";

import { useEffect, useRef, useState } from "react";
import { useCardStreamDrill } from "@/hooks/useCardStreamDrill";
import { DrillConfigPanel } from "@/components/DrillConfigPanel";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DealingTable } from "@/components/DealingTable";
import { PlayingCardView } from "@/components/PlayingCard";
import { Term } from "@/components/Term";

const DEFAULT_SPEED_MS = 2500;

const SPEED_OPTIONS = [
  { label: "Slow", ms: 3500 },
  { label: "Normal", ms: 2500 },
  { label: "Fast", ms: 1500 },
  { label: "Very fast", ms: 1000 },
];

/** Wraps a handler so any config change stops the auto-dealer first —
 * reconfiguring the shoe while cards are actively flying by would be
 * confusing and could race a fresh shoe against a stale pending tick. */
function withStop<T extends unknown[]>(stop: () => void, fn: (...args: T) => void) {
  return (...args: T) => {
    stop();
    fn(...args);
  };
}

export default function SpeedDrillPage() {
  const drill = useCardStreamDrill("hi-lo");
  const [revealCount, setRevealCount] = useState(false);
  const [running, setRunning] = useState(false);
  const [speedMs, setSpeedMs] = useState(DEFAULT_SPEED_MS);
  // Mirrors speedMs into a ref the timer reads from, so changing speed
  // while running takes effect on the very next tick without needing
  // the effect below to depend on (and re-fire for) speedMs itself.
  const speedRef = useRef(DEFAULT_SPEED_MS);

  // Keep the latest dealNext available to the timer's callback without
  // making it an effect dependency — dealNext's identity changes every
  // render (e.g. every keystroke in the guess box), and depending on
  // it directly would reset the pending timeout's full duration each
  // time instead of letting it run to completion.
  const dealNextRef = useRef(drill.dealNext);
  useEffect(() => {
    dealNextRef.current = drill.dealNext;
  });

  useEffect(() => {
    if (!running) return;

    // Self-scheduling via a ref rather than a plain setInterval, so
    // changing speedRef mid-flight (via handleSpeedChange) is picked
    // up on the very next tick without needing to tear down and
    // rebuild the timer. Fixed pace, deliberately — an earlier version
    // auto-accelerated over time, which fought against a chosen speed
    // setting instead of complementing it (and separately, ramping to
    // a floor value could stop a state-driven reschedule dead — see
    // MISTAKES.md). Kept the ref-based self-scheduling shape since
    // it's still the more robust pattern even without the ramp.
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    function tick() {
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        dealNextRef.current();
        tick();
      }, speedRef.current);
    }

    tick();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [running]);

  function stop() {
    setRunning(false);
  }

  function toggleRunning() {
    setRunning((prev) => !prev);
  }

  function restart() {
    setRunning(false);
    drill.resetSession();
  }

  function handleSpeedChange(nextSpeedMs: number) {
    setSpeedMs(nextSpeedMs);
    // Applies immediately, whether running or stopped. Doesn't touch
    // the shoe or count, so no need to stop the auto-dealer first the
    // way shoe/system config changes do.
    speedRef.current = nextSpeedMs;
  }

  const cardsPerSecond = (1000 / speedMs).toFixed(1);

  return (
    <main className="mx-auto w-full max-w-[60rem] flex-1 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Speed Drill</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Cards deal themselves at a pace you choose — keep the <Term id="running-count" /> as long
        as you can.
      </p>

      <div className="felt-panel mt-6 p-4">
        <label htmlFor="speed" className="mb-1 block text-sm font-medium text-ink">
          Speed
        </label>
        <select
          id="speed"
          value={speedMs}
          onChange={(e) => handleSpeedChange(Number(e.target.value))}
          className="w-full rounded-card border border-felt-line bg-felt-900 px-3 py-2 text-sm text-ink sm:w-auto"
        >
          {SPEED_OPTIONS.map((option) => (
            <option key={option.ms} value={option.ms}>
              {option.label} ({(1000 / option.ms).toFixed(1)} cards/sec)
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-ink-muted">
          A fixed pace — applies immediately, even mid-session.
        </p>
      </div>

      <div className="mt-6">
        <DrillConfigPanel
          systemId={drill.systemId}
          onSystemChange={withStop(stop, drill.handleSystemChange)}
          dealMode={drill.dealMode}
          onModeChange={withStop(stop, drill.handleModeChange)}
          deckCount={drill.deckCount}
          onDeckCountChange={withStop(stop, drill.handleDeckCountChange)}
          penetration={drill.penetration}
          onPenetrationChange={withStop(stop, drill.handlePenetrationChange)}
          seats={drill.seats}
          onAddSeat={drill.addSeat}
          onRemoveSeat={drill.removeSeat}
          onSetSeatSkill={drill.setSeatSkill}
          revealCount={revealCount}
          onRevealCountChange={setRevealCount}
        />
      </div>

      <section className="felt-panel mt-6 p-4">
        {drill.dealMode === "shoe" && (
          <p className="mb-3 text-xs text-ink-muted">
            <Term id="decks-remaining">Decks remaining</Term>: {drill.decksRemaining.toFixed(1)} (
            {drill.shoeStats.remaining}/{drill.shoeStats.size} cards)
          </p>
        )}
        {drill.shuffleNotice && (
          <p className="mb-3 rounded-card bg-felt-700 px-3 py-2 text-sm text-gold-300">
            Shoe reshuffled — running count reset to 0.
          </p>
        )}

        <p className="mb-3 text-xs text-ink-muted">
          Speed: {cardsPerSecond} cards/sec · {drill.dealtSinceShuffle.length} dealt this shoe
        </p>

        <div className="flex min-h-24 items-center justify-center">
          {drill.lastRoundHands.length === 0 ? (
            <p className="text-sm text-ink-muted">Click Start to begin.</p>
          ) : drill.dealMode === "shoe" ? (
            // Any real shoe-mode hand uses the shared table (SPEC.md
            // §7.2 / CLAUDE.md rule #11) — including a solo hand with
            // zero seats, which is still a real hand. The exemption is
            // strictly about flashcard mode, not seat count.
            <DealingTable hands={drill.lastRoundHands} />
          ) : (
            // Flashcard mode: no real shoe/hand structure — keep the
            // simple single-card view.
            <div className="flex flex-wrap items-center justify-center gap-2">
              {drill.lastRoundHands[0].cards.map((dealt) => (
                <PlayingCardView key={dealt.id} card={dealt.card} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={toggleRunning}
            className="rounded-card bg-gold-500 px-5 py-2 font-medium text-felt-950 hover:bg-gold-400"
          >
            {running ? "Stop" : "Start"}
          </button>
          <button
            type="button"
            onClick={restart}
            className="rounded-card bg-felt-700 px-3 py-1.5 text-sm font-medium text-ink hover:bg-felt-800"
          >
            Restart
          </button>

          {revealCount && (
            <span className="text-sm font-medium text-ink">
              Running count: <span className="text-gold-400">{drill.runningCount}</span>
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label htmlFor="guess" className="text-sm text-ink-muted">
            Your count:
          </label>
          <input
            id="guess"
            type="number"
            inputMode="numeric"
            value={drill.guess}
            onChange={(e) => drill.setGuess(e.target.value)}
            className="w-20 rounded-card border border-felt-line bg-felt-900 px-2 py-1 text-sm text-ink"
          />
          <button
            type="button"
            onClick={drill.checkGuess}
            className="rounded-card bg-felt-700 px-3 py-1.5 text-sm font-medium text-ink hover:bg-felt-800"
          >
            Check
          </button>
          {drill.feedback && (
            <span
              className={drill.feedback.correct ? "text-sm text-success" : "text-sm text-danger"}
            >
              {drill.feedback.correct ? "Correct!" : `Actual: ${drill.feedback.actual}`}
            </span>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={drill.pendingSystemId !== null}
        title="Switch counting system?"
        message="Changing the counting system resets your running count — the cards already dealt were tagged under the previous system's values and no longer apply."
        confirmLabel="Switch & reset"
        onConfirm={drill.confirmSystemChange}
        onCancel={drill.cancelSystemChange}
      />
    </main>
  );
}
