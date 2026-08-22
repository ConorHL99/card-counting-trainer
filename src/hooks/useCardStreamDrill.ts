"use client";

import { useMemo, useRef, useState } from "react";
import { getCountingSystem } from "@/lib/counting-systems";
import { computeRunningCount, computeDecksRemaining } from "@/lib/counting";
import { Shoe, playSimulatedSeatHand, type Card, type SeatSkill, type DealMode } from "@/lib/shoe";
import { wrapCard, type DealtCard, type TableHand } from "@/lib/table/types";
import { randomId } from "@/lib/random-id";

export interface DrillSeat {
  id: string;
  skill: SeatSkill;
}

// Re-exported for existing importers (DealingTable.tsx originally
// sourced these from here) — the actual definitions now live in
// src/lib/table/types.ts so Play Mode's usePlayMode hook can use them
// too without importing a drill-specific hook.
export type { DealtCard, TableHand };

const MAX_SEATS = 6;

function createShoe(dealMode: DealMode, deckCount: number, penetration: number): Shoe {
  return new Shoe({ dealMode, deckCount, penetration });
}

/**
 * Shared state/logic for any drill that streams dealt cards and asks
 * the user to track the running count as they go — Running Count
 * Drill and Speed Drill both need this exact mechanic (system/seat
 * config, shoe management, system-switch confirmation, count
 * checking). Extracted here so neither drill reinvents it, in the
 * same "one engine, reused" spirit as CLAUDE.md rule #2.
 */
export function useCardStreamDrill(initialSystemId: string = "hi-lo") {
  const [systemId, setSystemId] = useState(initialSystemId);
  // Shoe mode by default — the realistic table view is the primary
  // experience; flashcard mode is an opt-out via the toggle.
  const [dealMode, setDealMode] = useState<DealMode>("shoe");
  const [deckCount, setDeckCount] = useState(6);
  const [penetration, setPenetration] = useState(0.75);
  const [seats, setSeats] = useState<DrillSeat[]>([]);

  const shoeRef = useRef<Shoe>(createShoe(dealMode, deckCount, penetration));
  const [dealtSinceShuffle, setDealtSinceShuffle] = useState<Card[]>([]);
  const [lastRoundHands, setLastRoundHands] = useState<TableHand[]>([]);
  const [shuffleNotice, setShuffleNotice] = useState(false);
  // A freshly created shoe is always full — derive the initial stats
  // from config rather than reading shoeRef.current during render.
  const initialSize = deckCount * 52;
  const [shoeStats, setShoeStats] = useState({ remaining: initialSize, size: initialSize });
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<null | { correct: boolean; actual: number }>(null);
  const [pendingSystemId, setPendingSystemId] = useState<string | null>(null);
  // Bumped on every event that invalidates the running count (system
  // switch, mode/deck/penetration change, explicit resetSession) — a
  // single signal callers can watch to know "this is a new drill
  // session" without re-deriving it from a composite of config values.
  const [resetCount, setResetCount] = useState(0);

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
    setLastRoundHands([]);
    setShuffleNotice(false);
    setFeedback(null);
    setGuess("");
    setResetCount((n) => n + 1);
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
      setLastRoundHands([]);
      setFeedback(null);
      setGuess("");
      setResetCount((n) => n + 1);
    }
    setPendingSystemId(null);
  }

  function cancelSystemChange() {
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
      prev.length >= MAX_SEATS
        ? prev
        : [...prev, { id: randomId(), skill: "basic-strategy" }],
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

  function buildRoundHands(shoe: Shoe): TableHand[] {
    if (dealMode === "single-card") {
      return [{ id: "draw", label: "", cards: [wrapCard(shoe.draw())] }];
    }
    // Any shoe-mode round deals the dealer's card and the user's own
    // two-card hand — a real hand at the table, not just a bystander
    // watching. Simulated seats (if any) add further two-card hands
    // on top of that, not in place of it.
    const referenceCard = shoe.draw();
    const yourCards = [wrapCard(shoe.draw()), wrapCard(shoe.draw())];
    const seatHands: TableHand[] = seats.map((seat, i) => {
      const initial: [Card, Card] = [shoe.draw(), shoe.draw()];
      const results = playSimulatedSeatHand(shoe, seat.skill, initial, referenceCard);
      return {
        id: seat.id,
        label: `Seat ${i + 1}`,
        cards: results.flatMap((hand) => hand.cards).map((card) => wrapCard(card)),
      };
    });
    return [
      { id: "dealer", label: "Dealer", cards: [wrapCard(referenceCard)] },
      { id: "you", label: "You", cards: yourCards },
      ...seatHands,
    ];
  }

  function dealNext() {
    const shoe = shoeRef.current;
    let reshuffled = dealMode === "shoe" && shoe.needsShuffle;
    if (reshuffled) shoe.shuffle();

    // A round's actual card need is variable (seats can split/hit
    // unpredictably), so the penetration threshold above is a
    // best-effort trigger, not a guarantee there are enough cards
    // left. If the shoe still runs out mid-round, reshuffle to a full
    // shoe and rebuild the round from scratch rather than letting the
    // draw() exception escape — an uncaught throw here would silently
    // kill Speed Drill's recurring timer (it never reaches the code
    // that schedules the next tick), leaving dealing stopped until a
    // manual restart. See MISTAKES.md.
    let hands: TableHand[];
    try {
      hands = buildRoundHands(shoe);
    } catch {
      shoe.shuffle();
      reshuffled = true;
      hands = buildRoundHands(shoe);
    }

    // Single source of truth: derive the flat card list (for count
    // math) from the same `hands` structure the table renders, so the
    // two can never drift out of sync.
    const roundCards = hands.flatMap((hand) => hand.cards.map((dealt) => dealt.card));

    setShoeStats({ remaining: shoe.remaining, size: shoe.size });
    setShuffleNotice(reshuffled);
    setDealtSinceShuffle((prev) => (reshuffled ? roundCards : [...prev, ...roundCards]));
    setLastRoundHands(hands);
    setFeedback(null);
    setGuess("");
  }

  function checkGuess() {
    const parsed = Number(guess);
    if (Number.isNaN(parsed) || guess.trim() === "") return;
    setFeedback({ correct: parsed === runningCount, actual: runningCount });
  }

  function resetSession() {
    resetShoe(dealMode, deckCount, penetration);
  }

  return {
    systemId,
    dealMode,
    deckCount,
    penetration,
    seats,
    dealtSinceShuffle,
    lastRoundHands,
    shuffleNotice,
    shoeStats,
    runningCount,
    decksRemaining,
    guess,
    setGuess,
    feedback,
    pendingSystemId,
    resetCount,
    handleSystemChange,
    confirmSystemChange,
    cancelSystemChange,
    handleModeChange,
    handleDeckCountChange,
    handlePenetrationChange,
    addSeat,
    removeSeat,
    setSeatSkill,
    dealNext,
    checkGuess,
    resetSession,
  };
}
