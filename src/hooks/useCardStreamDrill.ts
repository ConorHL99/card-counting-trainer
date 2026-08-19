"use client";

import { useMemo, useRef, useState } from "react";
import { getCountingSystem } from "@/lib/counting-systems";
import { computeRunningCount, computeDecksRemaining } from "@/lib/counting";
import { Shoe, playSimulatedSeatHand, type Card, type SeatSkill, type DealMode } from "@/lib/shoe";

export interface DrillSeat {
  id: string;
  skill: SeatSkill;
}

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
  const [dealMode, setDealMode] = useState<DealMode>("single-card");
  const [deckCount, setDeckCount] = useState(6);
  const [penetration, setPenetration] = useState(0.75);
  const [seats, setSeats] = useState<DrillSeat[]>([]);

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
        : [...prev, { id: crypto.randomUUID(), skill: "basic-strategy" }],
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
    lastRound,
    shuffleNotice,
    shoeStats,
    runningCount,
    decksRemaining,
    guess,
    setGuess,
    feedback,
    pendingSystemId,
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
