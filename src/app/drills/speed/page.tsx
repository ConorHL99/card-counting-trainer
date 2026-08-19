"use client";

import { useEffect, useRef, useState } from "react";
import { useCardStreamDrill } from "@/hooks/useCardStreamDrill";
import { DrillConfigPanel } from "@/components/DrillConfigPanel";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DealingTable } from "@/components/DealingTable";
import { PlayingCardView } from "@/components/PlayingCard";
import { Term } from "@/components/Term";

const START_INTERVAL_MS = 2500;
const MIN_INTERVAL_MS = 400;
const SPEEDUP_FACTOR = 0.93;

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
  const [intervalMs, setIntervalMs] = useState(START_INTERVAL_MS);

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
    const id = setTimeout(() => {
      dealNextRef.current();
      setIntervalMs((prev) => Math.max(MIN_INTERVAL_MS, Math.round(prev * SPEEDUP_FACTOR)));
    }, intervalMs);
    return () => clearTimeout(id);
  }, [running, intervalMs]);

  function stop() {
    setRunning(false);
  }

  function toggleRunning() {
    setRunning((prev) => !prev);
  }

  function restart() {
    setRunning(false);
    setIntervalMs(START_INTERVAL_MS);
    drill.resetSession();
  }

  const cardsPerSecond = (1000 / intervalMs).toFixed(1);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Speed Drill</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Cards deal themselves, faster over time — keep the <Term id="running-count" /> as long as
        you can.
      </p>

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
