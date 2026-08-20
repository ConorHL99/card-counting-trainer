"use client";

import { Suspense, useEffect, useState } from "react";
import { generateTrueCountScenario, type TrueCountScenario } from "@/lib/counting";
import { BET_RAMP, getBetUnits } from "@/lib/betting";
import { useDrillTelemetry } from "@/hooks/useDrillTelemetry";
import { useInitialSystemId } from "@/hooks/useInitialSystemId";
import { CountingSystemSelect } from "@/components/CountingSystemSelect";
import { SettingToggle } from "@/components/SettingToggle";
import { Term } from "@/components/Term";

const DECK_OPTIONS = [1, 2, 4, 6, 8];
const BET_OPTIONS = Array.from(new Set(BET_RAMP.map((step) => step.units)));

export default function BetSizingDrillPage() {
  return (
    <Suspense fallback={null}>
      <BetSizingDrillPageInner />
    </Suspense>
  );
}

function BetSizingDrillPageInner() {
  const initialSystemId = useInitialSystemId("hi-lo", (system) => system.balanced);
  const [systemId, setSystemId] = useState(initialSystemId);
  const [deckCount, setDeckCount] = useState(6);
  const [revealAnswer, setRevealAnswer] = useState(false);
  const [scenario, setScenario] = useState<TrueCountScenario>(() =>
    generateTrueCountScenario(initialSystemId, 6),
  );
  const [selectedUnits, setSelectedUnits] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<null | { correct: boolean; actual: number }>(null);
  const telemetry = useDrillTelemetry({ drillType: "bet-sizing", systemId, mode: null });

  useEffect(() => {
    telemetry.reset();
  }, [systemId, deckCount, telemetry]);

  function newScenario(nextSystemId: string = systemId, nextDeckCount: number = deckCount) {
    setScenario(generateTrueCountScenario(nextSystemId, nextDeckCount));
    setSelectedUnits(null);
    setFeedback(null);
  }

  function handleSystemChange(nextId: string) {
    // No confirmation dialog: each scenario is independently generated
    // with no accumulated session count to lose, same reasoning as the
    // True Count Conversion Drill (see MISTAKES.md).
    setSystemId(nextId);
    newScenario(nextId, deckCount);
  }

  function handleDeckCountChange(next: number) {
    setDeckCount(next);
    newScenario(systemId, next);
  }

  function checkGuess() {
    if (selectedUnits === null) return;
    const actual = getBetUnits(scenario.trueCount);
    const correct = selectedUnits === actual;
    setFeedback({ correct, actual });
    telemetry.recordCheck(correct);
  }

  return (
    <main className="mx-auto w-full max-w-[45rem] flex-1 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Bet-Sizing Drill</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Given a <Term id="true-count" />, choose the correct bet size from the ramp below.
      </p>

      <section className="felt-panel mt-6 flex flex-col gap-4 p-4">
        <div>
          <label htmlFor="system-select" className="mb-1 block text-sm font-medium text-ink">
            Counting system
          </label>
          <CountingSystemSelect
            id="system-select"
            value={systemId}
            onChange={handleSystemChange}
            filter={(system) => system.balanced}
          />
          <p className="mt-1 text-xs text-ink-muted">
            Only <Term id="balanced-count">balanced</Term> systems produce a true count to bet
            off.
          </p>
        </div>

        <div>
          <label htmlFor="deck-count" className="mb-1 block text-sm font-medium text-ink">
            Decks in shoe
          </label>
          <select
            id="deck-count"
            value={deckCount}
            onChange={(e) => handleDeckCountChange(Number(e.target.value))}
            className="w-full rounded-card border border-felt-line bg-felt-900 px-3 py-2 text-sm text-ink"
          >
            {DECK_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <SettingToggle
          id="reveal-answer"
          label="Reveal correct action"
          checked={revealAnswer}
          onChange={setRevealAnswer}
          offHint="hidden — test yourself"
          onHint="always visible"
        />
      </section>

      <section className="felt-panel mt-6 p-4">
        <p className="text-xs font-medium text-ink-muted">Bet ramp (reference)</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink-muted">
          {BET_RAMP.map((step, i) => (
            <span key={i} className="rounded-card border border-felt-line px-2 py-1">
              TC {step.minTrueCount === -Infinity ? "≤ 1" : `≥ ${step.minTrueCount}`}: {step.units}
              x
            </span>
          ))}
        </div>
      </section>

      <section className="felt-panel mt-6 p-4 text-center">
        <p className="text-xs text-ink-muted">
          <Term id="true-count">True count</Term>
        </p>
        <p className="text-3xl font-semibold text-gold-400">{scenario.trueCount}</p>

        {revealAnswer && (
          <p className="mt-3 text-sm font-medium text-ink">
            Correct bet: <span className="text-gold-400">{getBetUnits(scenario.trueCount)}x</span>
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {BET_OPTIONS.map((units) => (
            <button
              key={units}
              type="button"
              onClick={() => setSelectedUnits(units)}
              className={`rounded-card border px-4 py-2 text-sm font-medium transition-colors ${
                selectedUnits === units
                  ? "border-gold-500 bg-gold-500 text-felt-950"
                  : "border-felt-line bg-felt-900 text-ink hover:border-gold-500/60"
              }`}
            >
              {units}x
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={checkGuess}
            disabled={selectedUnits === null}
            className="rounded-card bg-felt-700 px-3 py-1.5 text-sm font-medium text-ink hover:bg-felt-800 disabled:opacity-40"
          >
            Check
          </button>
        </div>

        {feedback && (
          <p
            className={`mt-2 text-sm ${feedback.correct ? "text-success" : "text-danger"}`}
          >
            {feedback.correct ? "Correct!" : `Correct bet: ${feedback.actual}x`}
          </p>
        )}

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => newScenario()}
            className="rounded-card bg-gold-500 px-5 py-2 font-medium text-felt-950 hover:bg-gold-400"
          >
            New Scenario
          </button>
        </div>
      </section>
    </main>
  );
}
