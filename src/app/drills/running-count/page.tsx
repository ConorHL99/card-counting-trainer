"use client";

import { useMemo, useRef, useState } from "react";
import { getCountingSystem } from "@/lib/counting-systems";
import { computeRunningCount, computeDecksRemaining } from "@/lib/counting";
import { Shoe, playSimulatedSeatHand, type Card, type SeatSkill, type DealMode } from "@/lib/shoe";
import { CountingSystemSelect } from "@/components/CountingSystemSelect";
import { SettingToggle } from "@/components/SettingToggle";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PlayingCardView } from "@/components/PlayingCard";
import { Term } from "@/components/Term";

interface Seat {
  id: string;
  skill: SeatSkill;
}

const DECK_OPTIONS = [1, 2, 4, 6, 8];
const PENETRATION_OPTIONS = [0.5, 0.65, 0.75, 0.85];
const MAX_SEATS = 6;

function createShoe(dealMode: DealMode, deckCount: number, penetration: number): Shoe {
  return new Shoe({ dealMode, deckCount, penetration });
}

export default function RunningCountDrillPage() {
  const [systemId, setSystemId] = useState("hi-lo");
  const [dealMode, setDealMode] = useState<DealMode>("single-card");
  const [deckCount, setDeckCount] = useState(6);
  const [penetration, setPenetration] = useState(0.75);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [revealCount, setRevealCount] = useState(false);

  const shoeRef = useRef<Shoe>(createShoe(dealMode, deckCount, penetration));
  const [dealtSinceShuffle, setDealtSinceShuffle] = useState<Card[]>([]);
  const [lastRound, setLastRound] = useState<Card[]>([]);
  const [shuffleNotice, setShuffleNotice] = useState(false);
  // A freshly created shoe is always full — derive the initial stats
  // from config rather than reading shoeRef.current during render.
  const initialSize = deckCount * 52;
  const [shoeStats, setShoeStats] = useState({ remaining: initialSize, size: initialSize });
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<null | { correct: boolean; actual: number }>(null);
  const [pendingSystemId, setPendingSystemId] = useState<string | null>(null);

  const system = getCountingSystem(systemId);
  const runningCount = useMemo(
    () => computeRunningCount(dealtSinceShuffle, system),
    [dealtSinceShuffle, system],
  );
  const decksRemaining = useMemo(() => computeDecksRemaining(shoeStats.remaining), [shoeStats]);

  function resetShoe(nextDealMode: DealMode, nextDeckCount: number, nextPenetration: number) {
    const shoe = createShoe(nextDealMode, nextDeckCount, nextPenetration);
    shoeRef.current = shoe;
    setShoeStats({ remaining: shoe.remaining, size: shoe.size });
    setDealtSinceShuffle([]);
    setLastRound([]);
    setShuffleNotice(false);
    setFeedback(null);
    setGuess("");
  }

  function handleSystemChange(nextId: string) {
    if (nextId === systemId) return;
    if (dealtSinceShuffle.length > 0) {
      setPendingSystemId(nextId);
      return;
    }
    setSystemId(nextId);
  }

  function confirmSystemChange() {
    if (pendingSystemId) {
      setSystemId(pendingSystemId);
      // Rule #4: switching systems invalidates the running count — the
      // cards already dealt were tagged under the old system's values.
      setDealtSinceShuffle([]);
      setLastRound([]);
      setFeedback(null);
      setGuess("");
    }
    setPendingSystemId(null);
  }

  function handleModeChange(nextIsShoe: boolean) {
    const next: DealMode = nextIsShoe ? "shoe" : "single-card";
    setDealMode(next);
    resetShoe(next, deckCount, penetration);
  }

  function handleDeckCountChange(next: number) {
    setDeckCount(next);
    resetShoe(dealMode, next, penetration);
  }

  function handlePenetrationChange(next: number) {
    setPenetration(next);
    resetShoe(dealMode, deckCount, next);
  }

  function addSeat() {
    setSeats((prev) =>
      prev.length >= MAX_SEATS ? prev : [...prev, { id: crypto.randomUUID(), skill: "basic-strategy" }],
    );
  }
  function removeSeat(id: string) {
    setSeats((prev) => prev.filter((seat) => seat.id !== id));
  }
  function setSeatSkill(id: string, imperfect: boolean) {
    setSeats((prev) =>
      prev.map((seat) =>
        seat.id === id ? { ...seat, skill: imperfect ? "imperfect" : "basic-strategy" } : seat,
      ),
    );
  }

  function dealNext() {
    const shoe = shoeRef.current;
    const reshuffled = dealMode === "shoe" && shoe.needsShuffle;
    if (reshuffled) shoe.shuffle();

    let roundCards: Card[];
    if (dealMode === "single-card" || seats.length === 0) {
      roundCards = [shoe.draw()];
    } else {
      const referenceCard = shoe.draw();
      const seatCards = seats.flatMap((seat) => {
        const initial: [Card, Card] = [shoe.draw(), shoe.draw()];
        const results = playSimulatedSeatHand(shoe, seat.skill, initial, referenceCard);
        return results.flatMap((hand) => hand.cards);
      });
      roundCards = [referenceCard, ...seatCards];
    }

    setShoeStats({ remaining: shoe.remaining, size: shoe.size });
    setShuffleNotice(reshuffled);
    setDealtSinceShuffle((prev) => (reshuffled ? roundCards : [...prev, ...roundCards]));
    setLastRound(roundCards);
    setFeedback(null);
    setGuess("");
  }

  function checkGuess() {
    const parsed = Number(guess);
    if (Number.isNaN(parsed) || guess.trim() === "") return;
    setFeedback({ correct: parsed === runningCount, actual: runningCount });
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Running Count Drill</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Watch the cards, keep a <Term id="running-count" /> in your head, then check yourself.
      </p>

      <section className="felt-panel mt-6 flex flex-col gap-4 p-4">
        <div>
          <label htmlFor="system-select" className="mb-1 block text-sm font-medium text-ink">
            Counting system
          </label>
          <CountingSystemSelect id="system-select" value={systemId} onChange={handleSystemChange} />
        </div>

        <SettingToggle
          id="mode-toggle"
          label="Shoe mode"
          checked={dealMode === "shoe"}
          onChange={handleModeChange}
          offHint="quick reshuffled single cards"
          onHint="realistic depleting multi-deck shoe"
        />

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
              <div>
                <label htmlFor="penetration" className="mb-1 block text-sm font-medium text-ink">
                  <Term id="penetration">Penetration</Term>
                </label>
                <select
                  id="penetration"
                  value={penetration}
                  onChange={(e) => handlePenetrationChange(Number(e.target.value))}
                  className="w-full rounded-card border border-felt-line bg-felt-900 px-3 py-2 text-sm text-ink"
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
                  onClick={addSeat}
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
                      onChange={(checked) => setSeatSkill(seat.id, checked)}
                      offHint="always correct basic strategy"
                      onHint="occasionally misplays, like a real player"
                    />
                    <button
                      type="button"
                      onClick={() => removeSeat(seat.id)}
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

        <SettingToggle
          id="reveal-count"
          label="Reveal count"
          checked={revealCount}
          onChange={setRevealCount}
          offHint="hidden — test yourself"
          onHint="always visible"
        />
      </section>

      <section className="felt-panel mt-6 p-4">
        {dealMode === "shoe" && (
          <p className="mb-3 text-xs text-ink-muted">
            <Term id="decks-remaining">Decks remaining</Term>: {decksRemaining.toFixed(1)} (
            {shoeStats.remaining}/{shoeStats.size} cards)
          </p>
        )}
        {shuffleNotice && (
          <p className="mb-3 rounded-card bg-felt-700 px-3 py-2 text-sm text-gold-300">
            Shoe reshuffled — running count reset to 0.
          </p>
        )}

        <div className="flex min-h-24 flex-wrap items-center gap-2">
          {lastRound.length === 0 ? (
            <p className="text-sm text-ink-muted">Click Deal to begin.</p>
          ) : (
            lastRound.map((card, i) => <PlayingCardView key={i} card={card} />)
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={dealNext}
            className="rounded-card bg-gold-500 px-5 py-2 font-medium text-felt-950 hover:bg-gold-400"
          >
            Deal
          </button>

          {revealCount && (
            <span className="text-sm font-medium text-ink">
              Running count: <span className="text-gold-400">{runningCount}</span>
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
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            className="w-20 rounded-card border border-felt-line bg-felt-900 px-2 py-1 text-sm text-ink"
          />
          <button
            type="button"
            onClick={checkGuess}
            className="rounded-card bg-felt-700 px-3 py-1.5 text-sm font-medium text-ink hover:bg-felt-800"
          >
            Check
          </button>
          {feedback && (
            <span className={feedback.correct ? "text-sm text-success" : "text-sm text-danger"}>
              {feedback.correct ? "Correct!" : `Actual: ${feedback.actual}`}
            </span>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={pendingSystemId !== null}
        title="Switch counting system?"
        message="Changing the counting system resets your running count — the cards already dealt were tagged under the previous system's values and no longer apply."
        confirmLabel="Switch & reset"
        onConfirm={confirmSystemChange}
        onCancel={() => setPendingSystemId(null)}
      />
    </main>
  );
}
