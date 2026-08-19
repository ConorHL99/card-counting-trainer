"use client";

import { useState } from "react";
import { generateTrueCountScenario, type TrueCountScenario } from "@/lib/counting";
import { CountingSystemSelect } from "@/components/CountingSystemSelect";
import { SettingToggle } from "@/components/SettingToggle";
import { Term } from "@/components/Term";

const DECK_OPTIONS = [1, 2, 4, 6, 8];

export default function TrueCountDrillPage() {
  const [systemId, setSystemId] = useState("hi-lo");
  const [deckCount, setDeckCount] = useState(6);
  const [revealAnswer, setRevealAnswer] = useState(false);
  const [scenario, setScenario] = useState<TrueCountScenario>(() =>
    generateTrueCountScenario("hi-lo", 6),
  );
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<null | { correct: boolean; actual: number }>(null);

  function newScenario(nextSystemId: string = systemId, nextDeckCount: number = deckCount) {
    setScenario(generateTrueCountScenario(nextSystemId, nextDeckCount));
    setGuess("");
    setFeedback(null);
  }

  function handleSystemChange(nextId: string) {
    // No confirmation dialog here (unlike the Running Count Drill):
    // each scenario is independently generated with no accumulated
    // session count to lose, so switching systems is equivalent to
    // clicking "New Scenario" — there's no stale-count state to guard
    // against. See MISTAKES.md.
    setSystemId(nextId);
    newScenario(nextId, deckCount);
  }

  function handleDeckCountChange(next: number) {
    setDeckCount(next);
    newScenario(systemId, next);
  }

  function checkGuess() {
    const parsed = Number(guess);
    if (Number.isNaN(parsed) || guess.trim() === "") return;
    const rounded = Math.round(parsed * 10) / 10;
    setFeedback({ correct: rounded === scenario.trueCount, actual: scenario.trueCount });
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        True Count Conversion Drill
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Given a <Term id="running-count" /> and <Term id="decks-remaining" />, convert to{" "}
        <Term id="true-count" />.
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
            Only <Term id="balanced-count">balanced</Term> systems use true-count conversion.
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
          label="Reveal count"
          checked={revealAnswer}
          onChange={setRevealAnswer}
          offHint="hidden — test yourself"
          onHint="always visible"
        />
      </section>

      <section className="felt-panel mt-6 p-4">
        <dl className="grid grid-cols-2 gap-4 text-center">
          <div>
            <dt className="text-xs text-ink-muted">
              <Term id="running-count">Running count</Term>
            </dt>
            <dd className="text-2xl font-semibold text-gold-400">{scenario.runningCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">
              <Term id="decks-remaining">Decks remaining</Term>
            </dt>
            <dd className="text-2xl font-semibold text-gold-400">
              {scenario.decksRemaining.toFixed(1)}
            </dd>
          </div>
        </dl>

        {revealAnswer && (
          <p className="mt-4 text-center text-sm font-medium text-ink">
            True count: <span className="text-gold-400">{scenario.trueCount}</span>
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <label htmlFor="guess" className="text-sm text-ink-muted">
            True count:
          </label>
          <input
            id="guess"
            type="number"
            step="0.1"
            inputMode="decimal"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            className="w-24 rounded-card border border-felt-line bg-felt-900 px-2 py-1 text-sm text-ink"
          />
          <button
            type="button"
            onClick={checkGuess}
            className="rounded-card bg-felt-700 px-3 py-1.5 text-sm font-medium text-ink hover:bg-felt-800"
          >
            Check
          </button>
        </div>

        {feedback && (
          <p
            className={`mt-2 text-center text-sm ${feedback.correct ? "text-success" : "text-danger"}`}
          >
            {feedback.correct ? "Correct!" : `Actual: ${feedback.actual}`}
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
