"use client";

import { useState } from "react";
import { usePlayMode } from "@/hooks/usePlayMode";
import { useInitialSystemId } from "@/hooks/useInitialSystemId";
import { breakdownToChips } from "@/lib/chips";
import { DrillConfigPanel } from "@/components/DrillConfigPanel";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DealingTable } from "@/components/DealingTable";
import { DealerChipTray } from "@/components/DealerChipTray";
import { RoundResultBanner } from "@/components/RoundResultBanner";
import { BettingRack } from "@/components/BettingRack";
import { ChipStackView } from "@/components/ChipStack";
import { StrategyCard } from "@/components/StrategyCard";
import { SettingToggle } from "@/components/SettingToggle";
import { Term } from "@/components/Term";

interface PlayModeViewProps {
  /** The user's saved default system — overridden by `?system=` (set
   * by the Dashboard's picker) when present, same precedence as every
   * drill page. */
  defaultSystemId: string;
  initialBankroll: number;
  signedIn: boolean;
}

const ACTION_LABEL: Record<string, string> = {
  hit: "Hit",
  stand: "Stand",
  double: "Double",
  split: "Split",
  surrender: "Surrender",
  insurance: "Insurance",
  "no-insurance": "Decline insurance",
};

export function PlayModeView({ defaultSystemId, initialBankroll, signedIn }: PlayModeViewProps) {
  const initialSystemId = useInitialSystemId(defaultSystemId);
  const play = usePlayMode(initialSystemId, initialBankroll);
  const [revealCount, setRevealCount] = useState(false);
  const [showCorrectness, setShowCorrectness] = useState(false);
  const [showBetSuggestion, setShowBetSuggestion] = useState(false);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Play Mode</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Full blackjack hands, casino table styling. Dealer stands on soft 17, blackjack pays 3:2,
        double after split allowed.
      </p>
      {!signedIn && (
        <p className="mt-2 text-xs text-ink-muted">
          Playing without an account — your bankroll and stats won&rsquo;t be saved. Sign in from
          the nav to keep them.
        </p>
      )}

      {play.phase === "betting" && (
        <div className="mt-6">
          <DrillConfigPanel
            systemId={play.systemId}
            onSystemChange={play.handleSystemChange}
            dealMode="shoe"
            onModeChange={() => {}}
            hideModeToggle
            hideRevealCount
            deckCount={play.deckCount}
            onDeckCountChange={play.onDeckCountChange}
            penetration={play.penetration}
            onPenetrationChange={play.onPenetrationChange}
            seats={play.seats}
            onAddSeat={play.addSeat}
            onRemoveSeat={play.removeSeat}
            onSetSeatSkill={play.setSeatSkill}
            revealCount={revealCount}
            onRevealCountChange={setRevealCount}
          />
        </div>
      )}

      <section className="felt-panel mt-6 flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <SettingToggle
          id="reveal-count"
          label="Reveal count"
          checked={revealCount}
          onChange={setRevealCount}
          offHint="hidden — test yourself"
          onHint="running/true count shown"
        />
        <SettingToggle
          id="show-correctness"
          label="Correctness notification"
          checked={showCorrectness}
          onChange={setShowCorrectness}
          offHint="no feedback per decision"
          onHint="counting-aware right/wrong shown after each play"
        />
        <SettingToggle
          id="show-bet-suggestion"
          label="Suggested bet"
          checked={showBetSuggestion}
          onChange={setShowBetSuggestion}
          offHint="hidden"
          onHint="shows the count-driven bet size vs. yours"
        />
      </section>

      <section className="felt-panel mt-6 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
          <span>
            <Term id="decks-remaining">Decks remaining</Term>: {play.decksRemaining.toFixed(1)} (
            {play.shoeStats.remaining}/{play.shoeStats.size} cards)
          </span>
          {revealCount && (
            <span className="font-medium text-ink">
              Running count: <span className="text-gold-400">{play.runningCount}</span>
              {play.trueCount !== play.runningCount && (
                <>
                  {" "}
                  · <Term id="true-count">True count</Term>: <span className="text-gold-400">{play.trueCount}</span>
                </>
              )}
            </span>
          )}
        </div>
        {play.shuffleNotice && (
          <p className="mb-3 rounded-card bg-felt-700 px-3 py-2 text-sm text-gold-300">
            Shoe reshuffled — running count reset to 0.
          </p>
        )}

        {play.phase === "resolved" && play.roundResults && <RoundResultBanner results={play.roundResults} />}

        <DealerChipTray />

        <div className="mt-3 flex min-h-24 items-center justify-center">
          {play.tableHands.length === 0 ? (
            <p className="text-sm text-ink-muted">Place a bet to begin.</p>
          ) : (
            <DealingTable hands={play.tableHands} />
          )}
        </div>

        {play.phase !== "betting" && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-ink-muted">Bankroll</p>
              <ChipStackView entries={breakdownToChips(play.bankroll)} size="sm" />
            </div>
            {play.activeHandBet !== null && (
              <div className="text-right">
                <p className="text-xs text-ink-muted">This hand&rsquo;s bet</p>
                <p className="text-sm font-semibold text-gold-400">${play.activeHandBet}</p>
              </div>
            )}
          </div>
        )}

        {play.phase === "betting" && (
          <div className="mt-4">
            <BettingRack
              bankroll={play.bankroll}
              currentBet={play.currentBet}
              onAddChip={play.addChipToBet}
              onClearBet={play.clearBet}
              onDeal={play.deal}
            />
            {showBetSuggestion && (
              <p className="mt-2 text-xs text-ink-muted">
                {play.suggestedBetDollars !== null ? (
                  <>
                    Count-suggested bet: <span className="text-gold-400">${play.suggestedBetDollars}</span> (true
                    count {play.trueCount}) · yours: <span className="text-gold-400">${play.currentBet}</span>
                  </>
                ) : (
                  "Suggested bet needs a balanced counting system."
                )}
              </p>
            )}
            {play.bankroll === 0 && <p className="mt-2 text-xs text-danger">Out of chips.</p>}
          </div>
        )}

        {play.phase === "insurance" && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="text-sm text-ink">
              Dealer shows an Ace — <Term id="insurance">Insurance</Term> for ${play.insuranceOffer}?
            </p>
            <button
              type="button"
              onClick={play.takeInsurance}
              className="rounded-card bg-gold-500 px-4 py-1.5 text-sm font-medium text-felt-950 hover:bg-gold-400"
            >
              Take Insurance
            </button>
            <button
              type="button"
              onClick={play.declineInsurance}
              className="rounded-card bg-felt-700 px-4 py-1.5 text-sm font-medium text-ink hover:bg-felt-800"
            >
              Decline
            </button>
          </div>
        )}

        {play.phase === "player-turn" && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={play.hit} className="rounded-card bg-gold-500 px-4 py-2 text-sm font-medium text-felt-950 hover:bg-gold-400">
                Hit
              </button>
              <button type="button" onClick={play.stand} className="rounded-card bg-felt-700 px-4 py-2 text-sm font-medium text-ink hover:bg-felt-800">
                Stand
              </button>
              <button
                type="button"
                onClick={play.double}
                disabled={!play.activeHandOptions.canDouble}
                className="rounded-card bg-felt-700 px-4 py-2 text-sm font-medium text-ink hover:bg-felt-800 disabled:opacity-40"
              >
                Double
              </button>
              <button
                type="button"
                onClick={play.split}
                disabled={!play.activeHandOptions.canSplit}
                className="rounded-card bg-felt-700 px-4 py-2 text-sm font-medium text-ink hover:bg-felt-800 disabled:opacity-40"
              >
                Split
              </button>
              <button
                type="button"
                onClick={play.surrender}
                disabled={!play.activeHandOptions.canSurrender}
                className="rounded-card bg-felt-700 px-4 py-2 text-sm font-medium text-ink hover:bg-felt-800 disabled:opacity-40"
              >
                Surrender
              </button>
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              <Term id="surrender">What&rsquo;s surrender?</Term>
            </p>
          </div>
        )}

        {showCorrectness && play.lastActionFeedback && (
          <p className="mt-2 text-sm">
            <span className={play.lastActionFeedback.correct ? "text-success" : "text-danger"}>
              {play.lastActionFeedback.correct
                ? "Correct!"
                : `Counting-aware play was: ${ACTION_LABEL[play.lastActionFeedback.suggested] ?? play.lastActionFeedback.suggested}`}
            </span>{" "}
            <span className="text-ink-muted">
              (your {ACTION_LABEL[play.lastActionFeedback.action] ?? play.lastActionFeedback.action})
            </span>
          </p>
        )}

        {play.phase === "resolved" && play.roundResults && (
          <div className="mt-4">
            <ul className="flex flex-col gap-1 text-sm">
              {play.roundResults.map((r) => {
                const net = r.payout - r.bet;
                return (
                  <li key={r.handId} className="flex justify-between">
                    <span className="text-ink-muted">Bet ${r.bet}</span>
                    <span className={net > 0 ? "text-success" : net < 0 ? "text-danger" : "text-ink-muted"}>
                      {net > 0 ? `+$${net}` : net < 0 ? `-$${Math.abs(net)}` : "Push"}
                    </span>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={play.nextHand}
              className="mt-3 rounded-card bg-gold-500 px-5 py-2 font-medium text-felt-950 hover:bg-gold-400"
            >
              Next Hand
            </button>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={play.pendingSystemId !== null}
        title="Switch counting system?"
        message="Changing the counting system resets your running count — the cards already dealt were tagged under the previous system's values and no longer apply."
        confirmLabel="Switch & reset"
        onConfirm={play.confirmSystemChange}
        onCancel={play.cancelSystemChange}
      />

      <StrategyCard />
    </main>
  );
}
