"use client";

import { useState } from "react";
import { useCardStreamDrill } from "@/hooks/useCardStreamDrill";
import { DrillConfigPanel } from "@/components/DrillConfigPanel";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PlayingCardView } from "@/components/PlayingCard";
import { Term } from "@/components/Term";

export default function RunningCountDrillPage() {
  const drill = useCardStreamDrill("hi-lo");
  const [revealCount, setRevealCount] = useState(false);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Running Count Drill</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Watch the cards, keep a <Term id="running-count" /> in your head, then check yourself.
      </p>

      <div className="mt-6">
        <DrillConfigPanel
          systemId={drill.systemId}
          onSystemChange={drill.handleSystemChange}
          dealMode={drill.dealMode}
          onModeChange={drill.handleModeChange}
          deckCount={drill.deckCount}
          onDeckCountChange={drill.handleDeckCountChange}
          penetration={drill.penetration}
          onPenetrationChange={drill.handlePenetrationChange}
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

        <div className="flex min-h-24 flex-wrap items-center gap-2">
          {drill.lastRound.length === 0 ? (
            <p className="text-sm text-ink-muted">Click Deal to begin.</p>
          ) : (
            drill.lastRound.map((card, i) => <PlayingCardView key={i} card={card} />)
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={drill.dealNext}
            className="rounded-card bg-gold-500 px-5 py-2 font-medium text-felt-950 hover:bg-gold-400"
          >
            Deal
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
