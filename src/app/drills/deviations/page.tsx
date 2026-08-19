"use client";

import { useState } from "react";
import {
  DEVIATION_RULES,
  correctActionFor,
  type DeviationRule,
} from "@/lib/deviations";
import type { Action } from "@/lib/shoe";
import { CountingSystemSelect } from "@/components/CountingSystemSelect";
import { SettingToggle } from "@/components/SettingToggle";
import { PlayingCardView } from "@/components/PlayingCard";
import { Term } from "@/components/Term";

const PLAY_ACTIONS: Action[] = ["hit", "stand", "double", "split", "surrender"];
const ACTION_LABELS: Record<Action, string> = {
  hit: "Hit",
  stand: "Stand",
  double: "Double",
  split: "Split",
  surrender: "Surrender",
};

type Choice = Action | "insurance" | "no-insurance";

function generateScenario(): { rule: DeviationRule; trueCount: number } {
  const rule = DEVIATION_RULES[Math.floor(Math.random() * DEVIATION_RULES.length)];
  // Straddles the threshold on both sides so roughly half of scenarios
  // land under it (basic strategy is correct) and half over it (the
  // deviation is correct) — a fixed offset would only ever test one
  // side.
  const offset = Math.floor(Math.random() * 7) - 3;
  return { rule, trueCount: rule.threshold + offset };
}

export default function DeviationsDrillPage() {
  const [systemId, setSystemId] = useState("hi-lo");
  const [revealAnswer, setRevealAnswer] = useState(false);
  const [scenario, setScenario] = useState(() => generateScenario());
  const [selected, setSelected] = useState<Choice | null>(null);
  const [feedback, setFeedback] = useState<null | { correct: boolean; actual: Choice }>(null);

  function newScenario() {
    setScenario(generateScenario());
    setSelected(null);
    setFeedback(null);
  }

  function handleSystemChange(nextId: string) {
    // No confirmation dialog: each scenario is independently generated
    // with no accumulated session count to lose, same reasoning as the
    // True Count and Bet-Sizing drills.
    setSystemId(nextId);
    newScenario();
  }

  function checkAnswer() {
    if (!selected) return;
    const actual = correctActionFor(scenario.rule, scenario.trueCount);
    setFeedback({ correct: selected === actual, actual });
  }

  const actual = correctActionFor(scenario.rule, scenario.trueCount);
  const isInsurance = scenario.rule.kind === "insurance";
  const isDeviating = scenario.trueCount >= scenario.rule.threshold;

  return (
    <main className="mx-auto w-full max-w-[45rem] flex-1 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Deviation Index Drill</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Given a hand, a dealer card, and a <Term id="true-count" />, decide whether this is a{" "}
        <Term id="deviation" /> from basic strategy or not.
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
            filter={(system) => system.supportsDeviations}
          />
          <p className="mt-1 text-xs text-ink-muted">
            Index plays are calibrated to one specific system&rsquo;s tag values — only systems
            that support deviations are offered.
          </p>
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

      <section className="felt-panel mt-6 p-4 text-center">
        <p className="text-xs text-ink-muted">
          <Term id="true-count">True count</Term>
        </p>
        <p className="text-3xl font-semibold text-gold-400">{scenario.trueCount}</p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
          <div>
            <p className="mb-1 text-xs text-ink-muted">Dealer shows</p>
            <PlayingCardView card={{ rank: scenario.rule.dealerUpRank, suit: "spades" }} />
          </div>
          {!isInsurance && scenario.rule.playerCards && (
            <div>
              <p className="mb-1 text-xs text-ink-muted">Your hand</p>
              <div className="flex gap-1">
                <PlayingCardView card={{ rank: scenario.rule.playerCards[0], suit: "hearts" }} />
                <PlayingCardView card={{ rank: scenario.rule.playerCards[1], suit: "clubs" }} />
              </div>
            </div>
          )}
        </div>

        {revealAnswer && (
          <p className="mt-4 text-sm font-medium text-ink">
            Correct:{" "}
            <span className="text-gold-400">
              {actual === "insurance"
                ? "Take insurance"
                : actual === "no-insurance"
                  ? "Decline insurance"
                  : ACTION_LABELS[actual]}
            </span>{" "}
            <span className="text-xs text-ink-muted">
              ({isDeviating ? "deviation" : "basic strategy"})
            </span>
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {isInsurance
            ? (["insurance", "no-insurance"] as const).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setSelected(choice)}
                  className={`rounded-card border px-4 py-2 text-sm font-medium transition-colors ${
                    selected === choice
                      ? "border-gold-500 bg-gold-500 text-felt-950"
                      : "border-felt-line bg-felt-900 text-ink hover:border-gold-500/60"
                  }`}
                >
                  {choice === "insurance" ? "Take Insurance" : "Decline"}
                </button>
              ))
            : PLAY_ACTIONS.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => setSelected(action)}
                  className={`rounded-card border px-4 py-2 text-sm font-medium transition-colors ${
                    selected === action
                      ? "border-gold-500 bg-gold-500 text-felt-950"
                      : "border-felt-line bg-felt-900 text-ink hover:border-gold-500/60"
                  }`}
                >
                  {ACTION_LABELS[action]}
                </button>
              ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={checkAnswer}
            disabled={selected === null}
            className="rounded-card bg-felt-700 px-3 py-1.5 text-sm font-medium text-ink hover:bg-felt-800 disabled:opacity-40"
          >
            Check
          </button>
        </div>

        {feedback && (
          <p className={`mt-2 text-sm ${feedback.correct ? "text-success" : "text-danger"}`}>
            {feedback.correct
              ? "Correct!"
              : `Correct: ${
                  feedback.actual === "insurance"
                    ? "Take insurance"
                    : feedback.actual === "no-insurance"
                      ? "Decline insurance"
                      : ACTION_LABELS[feedback.actual]
                }`}
          </p>
        )}

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={newScenario}
            className="rounded-card bg-gold-500 px-5 py-2 font-medium text-felt-950 hover:bg-gold-400"
          >
            New Scenario
          </button>
        </div>
      </section>
    </main>
  );
}
