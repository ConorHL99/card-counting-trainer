"use client";

import { useMemo, useRef, useState } from "react";
import { getCountingSystem } from "@/lib/counting-systems";
import { computeRunningCount, computeDecksRemaining, computeTrueCount } from "@/lib/counting";
import { getBetUnits } from "@/lib/betting";
import {
  Shoe,
  playSimulatedSeatHand,
  evaluateHand,
  MAX_SPLIT_HANDS,
  type Card,
  type SeatSkill,
  type StrategyOptions,
  type Action,
} from "@/lib/shoe";
import { dealerMayHaveBlackjack, playDealerHand, resolveHand, pearsonCorrelation, type HandOutcome } from "@/lib/blackjack";
import { getCountingAwareAction } from "@/lib/deviations";
import { wrapCard, type DealtCard, type TableHand } from "@/lib/table/types";
import type { DrillSeat } from "@/hooks/useCardStreamDrill";
import { randomId } from "@/lib/random-id";
import { savePlayProgress } from "@/lib/db/play-actions";

const MAX_SEATS = 6;
/** 1 "unit" on the shared bet ramp (src/lib/betting/bet-ramp.ts) is
 * worth $10 for the suggested-bet overlay's dollar figure — an
 * arbitrary but reasonable scale relative to the $1000 starting
 * bankroll (suggested bets range $10-$80). See MISTAKES.md. */
const BASE_UNIT_DOLLARS = 10;

export type RoundPhase = "betting" | "dealing" | "insurance" | "player-turn" | "dealer-turn" | "resolved";

interface PlayerHandState {
  id: string;
  cards: DealtCard[];
  bet: number;
  fromSplit: boolean;
  doubled: boolean;
  surrendered: boolean;
  /** True once any hit has happened on this hand — surrender is only
   * ever offered as a genuinely first decision. */
  hasActed: boolean;
  /** No more actions available (stood, doubled, busted, surrendered,
   * hit to 21, or an ace-split hand that only ever gets one card). */
  done: boolean;
}

export interface RoundResultEntry {
  handId: string;
  outcome: HandOutcome;
  bet: number;
  payout: number;
}

export interface ActionFeedback {
  action: Action | "insurance" | "no-insurance";
  correct: boolean;
  suggested: Action | "insurance" | "no-insurance";
}

function rawCards(cards: DealtCard[]): Card[] {
  return cards.map((d) => d.card);
}

function createShoe(deckCount: number, penetration: number): Shoe {
  return new Shoe({ dealMode: "shoe", deckCount, penetration });
}

/** Proactively reshuffles before drawing from an empty shoe rather
 * than catching Shoe.draw()'s throw — Play Mode can't cleanly "rebuild
 * the round from scratch" the way the drills do on exhaustion (real
 * bets/decisions have already happened), so this is a last-resort
 * safety net for an edge case that's vanishingly unlikely under
 * default settings (a round would need to consume most of a shoe).
 * The running count is deliberately NOT reset here — cards already
 * shown this round stay counted. See MISTAKES.md. */
function safeDraw(shoe: Shoe): Card {
  if (shoe.remaining === 0) shoe.shuffle();
  return shoe.draw();
}

function describeDealerLabel(dealerHand: DealtCard[]): string {
  if (dealerHand.length === 0) return "Dealer";
  if (dealerHand[1]?.faceDown) return "Dealer";
  const value = evaluateHand(rawCards(dealerHand));
  if (value.total > 21) return `Dealer: Bust (${value.total})`;
  if (value.isBlackjack) return "Dealer: Blackjack!";
  return `Dealer: ${value.total}`;
}

const OUTCOME_LABEL: Record<HandOutcome, string> = {
  blackjack: "Blackjack!",
  win: "Win",
  push: "Push",
  loss: "Loss",
  bust: "Bust",
  surrender: "Surrendered",
};

function describePlayerLabel(hand: PlayerHandState, isActive: boolean, outcome?: HandOutcome): string {
  const value = evaluateHand(rawCards(hand.cards));
  const prefix = isActive ? "▶ " : "";
  const name = hand.fromSplit ? "You (split)" : "You";
  let status = `${value.total}`;
  if (outcome) {
    status = `${value.total} — ${OUTCOME_LABEL[outcome]}`;
  } else if (hand.surrendered) {
    status = `${value.total} — Surrendered`;
  } else if (value.total > 21) {
    status = `Bust (${value.total})`;
  } else if (!hand.fromSplit && value.isBlackjack) {
    status = "Blackjack!";
  }
  return `${prefix}${name}: ${status}`;
}

/**
 * Play Mode's state machine (SPEC.md §5.4). A dedicated hook rather
 * than reusing useCardStreamDrill — a full blackjack round (insurance,
 * dealer peek, splits, doubles, payouts) is structurally too different
 * from that hook's "deal one round, check a guess" shape to share
 * meaningfully, though it reuses every underlying engine
 * (Shoe/seats/counting/basic-strategy/deviations) exactly as built.
 *
 * Critical invariant (see MISTAKES.md): `visibleCardsSinceShuffle`
 * feeds every count/correctness computation and never includes the
 * dealer's hole card until `revealHoleCard`-equivalent logic actually
 * reveals it (dealer peek finding blackjack, or the real dealer turn).
 * The card IS drawn from the shoe immediately at deal time (shoe
 * depletion is always accurate) — only its COUNT visibility and visual
 * faceDown state are delayed, and both flip in the exact same state
 * update so they can never drift apart.
 */
export function usePlayMode(initialSystemId: string, initialBankroll: number) {
  const [systemId, setSystemId] = useState(initialSystemId);
  const [pendingSystemId, setPendingSystemId] = useState<string | null>(null);
  const [deckCount, setDeckCount] = useState(6);
  const [penetration, setPenetration] = useState(0.75);
  const [seats, setSeats] = useState<DrillSeat[]>([]);

  const shoeRef = useRef<Shoe>(createShoe(deckCount, penetration));
  const [visibleCardsSinceShuffle, setVisibleCardsSinceShuffle] = useState<Card[]>([]);
  const [shuffleNotice, setShuffleNotice] = useState(false);
  const initialSize = deckCount * 52;
  const [shoeStats, setShoeStats] = useState({ remaining: initialSize, size: initialSize });

  const [bankroll, setBankroll] = useState(initialBankroll);
  const [currentBet, setCurrentBet] = useState(0);

  const [phase, setPhase] = useState<RoundPhase>("betting");
  const [dealerHand, setDealerHand] = useState<DealtCard[]>([]);
  const [playerHands, setPlayerHands] = useState<PlayerHandState[]>([]);
  const [activeHandIndex, setActiveHandIndex] = useState(0);
  const [seatHandsView, setSeatHandsView] = useState<TableHand[]>([]);
  const [insuranceBet, setInsuranceBet] = useState(0);
  const [roundResults, setRoundResults] = useState<RoundResultEntry[] | null>(null);
  const [lastActionFeedback, setLastActionFeedback] = useState<ActionFeedback | null>(null);

  // Telemetry — same ref-based, upserted-per-session shape as
  // useDrillTelemetry.ts, but the "unit" persisted per write is one
  // fully-resolved round (not one decision).
  const sessionIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<string | null>(null);
  const handsPlayedRef = useRef(0);
  const bankrollTrendRef = useRef<{ hand: number; bankroll: number }[]>([]);
  const betPairsRef = useRef<{ x: number; y: number }[]>([]);

  const system = getCountingSystem(systemId);
  const runningCount = useMemo(
    () => computeRunningCount(visibleCardsSinceShuffle, system),
    [visibleCardsSinceShuffle, system],
  );
  const decksRemaining = useMemo(() => computeDecksRemaining(shoeStats.remaining), [shoeStats]);
  const trueCount = system.balanced ? computeTrueCount(runningCount, decksRemaining) : runningCount;
  const suggestedBetDollars = system.balanced ? getBetUnits(trueCount) * BASE_UNIT_DOLLARS : null;

  const activeHand = playerHands[activeHandIndex];
  const activeHandOptions: StrategyOptions = activeHand
    ? {
        canDouble: activeHand.cards.length === 2 && !activeHand.doubled && bankroll >= activeHand.bet,
        canSplit:
          activeHand.cards.length === 2 &&
          activeHand.cards[0].card.rank === activeHand.cards[1].card.rank &&
          playerHands.length < MAX_SPLIT_HANDS &&
          bankroll >= activeHand.bet,
        canSurrender: activeHand.cards.length === 2 && !activeHand.fromSplit && !activeHand.hasActed,
      }
    : { canDouble: false, canSplit: false, canSurrender: false };

  const activeHandBet = activeHand?.bet ?? null;
  /** What Take Insurance would cost right now — half the ORIGINAL
   * round bet, computed the same way takeInsurance() itself commits
   * it, so the UI can show the real number before the player decides. */
  const insuranceOffer = playerHands[0] ? Math.round(playerHands[0].bet / 2) : 0;

  const tableHands: TableHand[] = useMemo(() => {
    const resultsById = new Map(roundResults?.map((r) => [r.handId, r.outcome]) ?? []);
    const hands: TableHand[] = [];
    if (dealerHand.length > 0) {
      hands.push({ id: "dealer", label: describeDealerLabel(dealerHand), cards: dealerHand });
    }
    playerHands.forEach((hand, i) => {
      hands.push({
        id: hand.id,
        label: describePlayerLabel(hand, phase === "player-turn" && i === activeHandIndex, resultsById.get(hand.id)),
        cards: hand.cards,
      });
    });
    hands.push(...seatHandsView);
    return hands;
  }, [dealerHand, playerHands, activeHandIndex, phase, seatHandsView, roundResults]);

  function resetShoe(nextDeckCount: number, nextPenetration: number) {
    const shoe = createShoe(nextDeckCount, nextPenetration);
    shoeRef.current = shoe;
    setShoeStats({ remaining: shoe.remaining, size: shoe.size });
    setVisibleCardsSinceShuffle([]);
    setShuffleNotice(false);
  }

  function resetTelemetrySession() {
    sessionIdRef.current = null;
    startedAtRef.current = null;
    handsPlayedRef.current = 0;
    bankrollTrendRef.current = [];
    betPairsRef.current = [];
  }

  // --- Config (betting phase only — a round in progress can't safely
  // swap the shoe/system out from under it, same as a real table never
  // reshuffling or changing games mid-hand) ---

  function handleSystemChange(nextId: string) {
    if (phase !== "betting" || nextId === systemId) return;
    if (visibleCardsSinceShuffle.length > 0) {
      setPendingSystemId(nextId);
      return;
    }
    setSystemId(nextId);
  }

  function confirmSystemChange() {
    if (pendingSystemId) {
      setSystemId(pendingSystemId);
      resetShoe(deckCount, penetration);
      resetTelemetrySession();
    }
    setPendingSystemId(null);
  }

  function cancelSystemChange() {
    setPendingSystemId(null);
  }

  function handleDeckCountChange(next: number) {
    if (phase !== "betting") return;
    setDeckCount(next);
    resetShoe(next, penetration);
    resetTelemetrySession();
  }

  function handlePenetrationChange(next: number) {
    if (phase !== "betting") return;
    setPenetration(next);
    resetShoe(deckCount, next);
    resetTelemetrySession();
  }

  // Seats are addable/removable "at any point in any mode" per
  // CLAUDE.md rule #9 — never gated on phase. In practice a real table
  // only ever adds/removes a seat between hands anyway, which is what
  // the UI naturally allows (the config panel is only shown during
  // betting — see src/app/play/page.tsx), but the handlers themselves
  // place no restriction of their own.
  function addSeat() {
    setSeats((prev) =>
      prev.length >= MAX_SEATS ? prev : [...prev, { id: randomId(), skill: "basic-strategy" as SeatSkill }],
    );
  }
  function removeSeat(id: string) {
    setSeats((prev) => prev.filter((s) => s.id !== id));
  }
  function setSeatSkill(id: string, imperfect: boolean) {
    setSeats((prev) =>
      prev.map((s) => (s.id === id ? { ...s, skill: imperfect ? "imperfect" : "basic-strategy" } : s)),
    );
  }

  // --- Betting ---

  function addChipToBet(value: number) {
    if (phase !== "betting") return;
    setCurrentBet((prev) => Math.min(prev + value, bankroll));
  }

  function clearBet() {
    if (phase !== "betting") return;
    setCurrentBet(0);
  }

  // --- Dealing ---

  function deal() {
    if (phase !== "betting" || currentBet <= 0 || currentBet > bankroll) return;
    const shoe = shoeRef.current;
    const reshuffled = shoe.needsShuffle;
    if (reshuffled) shoe.shuffle();

    const dealerUp = safeDraw(shoe);
    const dealerHole = safeDraw(shoe);
    const yourCards: [Card, Card] = [safeDraw(shoe), safeDraw(shoe)];

    const seatTableHands: TableHand[] = seats.map((seat, i) => {
      const initial: [Card, Card] = [safeDraw(shoe), safeDraw(shoe)];
      const results = playSimulatedSeatHand(shoe, seat.skill, initial, dealerUp);
      return {
        id: seat.id,
        label: `Seat ${i + 1}`,
        cards: results.flatMap((hand) => hand.cards).map((card) => wrapCard(card)),
      };
    });

    // Visible to the table immediately: dealer's up-card, the player's
    // own cards, and every seat's cards (seats resolve their whole
    // hand instantly, same as the drills — see MISTAKES.md). The hole
    // card is drawn (shoe depletion is real) but deliberately excluded
    // here — it isn't added to the count until revealed.
    const visibleThisDeal = [
      dealerUp,
      ...yourCards,
      ...seatTableHands.flatMap((h) => h.cards.map((c) => c.card)),
    ];

    setShoeStats({ remaining: shoe.remaining, size: shoe.size });
    setShuffleNotice(reshuffled);
    setVisibleCardsSinceShuffle((prev) => (reshuffled ? visibleThisDeal : [...prev, ...visibleThisDeal]));

    const bet = currentBet;
    if (suggestedBetDollars !== null) {
      betPairsRef.current.push({ x: suggestedBetDollars, y: bet });
    }
    setBankroll((prev) => prev - bet);
    setCurrentBet(0);

    const initialHand: PlayerHandState = {
      id: "you-0",
      cards: [wrapCard(yourCards[0]), wrapCard(yourCards[1])],
      bet,
      fromSplit: false,
      doubled: false,
      surrendered: false,
      hasActed: false,
      done: false,
    };
    setPlayerHands([initialHand]);
    setActiveHandIndex(0);
    setDealerHand([wrapCard(dealerUp), wrapCard(dealerHole, true)]);
    setSeatHandsView(seatTableHands);
    setRoundResults(null);
    setLastActionFeedback(null);
    setInsuranceBet(0);

    if (dealerUp.rank === "A") {
      setPhase("insurance");
    } else if (dealerMayHaveBlackjack(dealerUp)) {
      setPhase("dealing");
      finishPeek(dealerUp, dealerHole, [initialHand], 0);
    } else {
      enterPlayerTurn(dealerUp, dealerHole, [initialHand]);
    }
  }

  /** A natural (2-card, not-from-split) player blackjack is an
   * automatic win the instant the dealer is confirmed not to also
   * have one — real tables never make you "act" on an unbeatable
   * hand. Auto-marks it done and runs the same advance/resolve path a
   * manual Stand would, rather than requiring a click.
   *
   * Takes the dealer's cards explicitly rather than reading
   * `dealerHand` state — this can fire SYNCHRONOUSLY from within
   * deal()/finishPeek(), before that render's setDealerHand call has
   * flushed, so reading the state closure here would see stale (or
   * even empty, on a fresh deal) data. Every function this calls into
   * (advanceToNextHandOrDealer, beginDealerTurn) threads the same
   * explicit values through for the same reason. */
  function enterPlayerTurn(dealerUp: Card, dealerHole: Card, hands: PlayerHandState[]) {
    const hand = hands[0];
    const isNaturalBlackjack =
      hands.length === 1 && !hand.fromSplit && evaluateHand(rawCards(hand.cards)).isBlackjack;
    if (isNaturalBlackjack) {
      const doneHand: PlayerHandState = { ...hand, hasActed: true, done: true };
      setPlayerHands([doneHand]);
      setActiveHandIndex(0);
      advanceToNextHandOrDealer(dealerUp, dealerHole, [doneHand]);
    } else {
      setPhase("player-turn");
    }
  }

  // --- Insurance (only reached when the dealer shows an Ace) ---

  function takeInsurance() {
    if (phase !== "insurance" || dealerHand.length < 2) return;
    const dealerUpRaw = dealerHand[0].card;
    const dealerHoleRaw = dealerHand[1].card;
    const stake = Math.round(playerHands[0].bet / 2);
    setBankroll((prev) => prev - stake);
    setInsuranceBet(stake);
    finishPeek(dealerUpRaw, dealerHoleRaw, playerHands, stake);
  }

  function declineInsurance() {
    if (phase !== "insurance" || dealerHand.length < 2) return;
    const dealerUpRaw = dealerHand[0].card;
    const dealerHoleRaw = dealerHand[1].card;
    finishPeek(dealerUpRaw, dealerHoleRaw, playerHands, 0);
  }

  /** The dealer peek: checks the hole card for blackjack before the
   * player's turn begins (standard rule). If blackjack, reveals
   * immediately and resolves everything now — the player never gets a
   * turn to act into a hand that was already decided. */
  function finishPeek(dealerUp: Card, dealerHole: Card, hands: PlayerHandState[], insuranceStake: number) {
    const dealerBJ = evaluateHand([dealerUp, dealerHole]).isBlackjack;

    if (insuranceStake > 0 && dealerBJ) {
      setBankroll((prev) => prev + insuranceStake * 3); // 2:1 payout + stake returned
    }

    if (dealerBJ) {
      setDealerHand((prev) => prev.map((d, i) => (i === 1 ? { ...d, faceDown: false } : d)));
      setVisibleCardsSinceShuffle((prev) => [...prev, dealerHole]);
      resolveRound([dealerUp, dealerHole], hands);
    } else {
      enterPlayerTurn(dealerUp, dealerHole, hands);
    }
  }

  // --- Player's turn ---

  /** Safe to read `dealerHand` state here — every call site of this
   * helper is a user-click handler (hit/stand/double/surrender/split),
   * which only ever runs in a render where deal() has already fully
   * flushed, unlike the same-tick auto-blackjack path (see
   * enterPlayerTurn's comment above). */
  function currentDealerCards(): [Card, Card] {
    return [dealerHand[0].card, dealerHand[1].card];
  }

  function recordDecision(action: Action) {
    if (!activeHand) return;
    const dealerUpRaw = dealerHand[0]?.card;
    if (!dealerUpRaw) return;
    const suggested = getCountingAwareAction(rawCards(activeHand.cards), dealerUpRaw, trueCount, system, activeHandOptions);
    setLastActionFeedback({ action, correct: action === suggested, suggested });
  }

  function updateActiveHand(next: PlayerHandState, hands: PlayerHandState[] = playerHands) {
    const newHands = [...hands];
    newHands[activeHandIndex] = next;
    setPlayerHands(newHands);
    return newHands;
  }

  function hit() {
    if (phase !== "player-turn" || !activeHand) return;
    recordDecision("hit");

    const shoe = shoeRef.current;
    const card = safeDraw(shoe);
    setVisibleCardsSinceShuffle((prev) => [...prev, card]);
    setShoeStats({ remaining: shoe.remaining, size: shoe.size });

    const newCards = [...activeHand.cards, wrapCard(card)];
    const value = evaluateHand(rawCards(newCards));
    const done = value.total >= 21;
    const newHands = updateActiveHand({ ...activeHand, cards: newCards, hasActed: true, done });

    if (done) advanceToNextHandOrDealer(...currentDealerCards(), newHands);
  }

  function stand() {
    if (phase !== "player-turn" || !activeHand) return;
    recordDecision("stand");
    const newHands = updateActiveHand({ ...activeHand, hasActed: true, done: true });
    advanceToNextHandOrDealer(...currentDealerCards(), newHands);
  }

  function double() {
    if (phase !== "player-turn" || !activeHand || !activeHandOptions.canDouble) return;
    recordDecision("double");

    setBankroll((prev) => prev - activeHand.bet);
    const shoe = shoeRef.current;
    const card = safeDraw(shoe);
    setVisibleCardsSinceShuffle((prev) => [...prev, card]);
    setShoeStats({ remaining: shoe.remaining, size: shoe.size });

    const newCards = [...activeHand.cards, wrapCard(card)];
    const newHands = updateActiveHand({
      ...activeHand,
      cards: newCards,
      bet: activeHand.bet * 2,
      doubled: true,
      hasActed: true,
      done: true,
    });
    advanceToNextHandOrDealer(...currentDealerCards(), newHands);
  }

  function surrender() {
    if (phase !== "player-turn" || !activeHand || !activeHandOptions.canSurrender) return;
    recordDecision("surrender");
    const newHands = updateActiveHand({ ...activeHand, surrendered: true, hasActed: true, done: true });
    advanceToNextHandOrDealer(...currentDealerCards(), newHands);
  }

  function split() {
    if (phase !== "player-turn" || !activeHand || !activeHandOptions.canSplit) return;
    recordDecision("split");

    setBankroll((prev) => prev - activeHand.bet);
    const shoe = shoeRef.current;
    const [cardA, cardB] = activeHand.cards;
    const isAceSplit = cardA.card.rank === "A";

    // Both resulting hands get their next card immediately (matching
    // the simulated-seat engine's own split behavior — see
    // src/lib/shoe/seats.ts) rather than dealing the second hand's
    // card lazily when it becomes active.
    const drawnA = safeDraw(shoe);
    const drawnB = safeDraw(shoe);
    setVisibleCardsSinceShuffle((prev) => [...prev, drawnA, drawnB]);
    setShoeStats({ remaining: shoe.remaining, size: shoe.size });

    const handA: PlayerHandState = {
      id: `${activeHand.id}a`,
      cards: [cardA, wrapCard(drawnA)],
      bet: activeHand.bet,
      fromSplit: true,
      doubled: false,
      surrendered: false,
      // Split aces get exactly one card each and cannot be acted on
      // further — same rule as the seat engine.
      hasActed: isAceSplit,
      done: isAceSplit,
    };
    const handB: PlayerHandState = {
      id: `${activeHand.id}b`,
      cards: [cardB, wrapCard(drawnB)],
      bet: activeHand.bet,
      fromSplit: true,
      doubled: false,
      surrendered: false,
      hasActed: isAceSplit,
      done: isAceSplit,
    };

    const newHands = [...playerHands];
    newHands.splice(activeHandIndex, 1, handA, handB);
    setPlayerHands(newHands);

    if (isAceSplit) {
      advanceToNextHandOrDealer(...currentDealerCards(), newHands);
    }
    // else activeHandIndex still correctly points at handA (it replaced
    // the original hand at the same array index) — keep acting on it.
  }

  function advanceToNextHandOrDealer(dealerUp: Card, dealerHole: Card, hands: PlayerHandState[]) {
    const nextIndex = hands.findIndex((h, i) => i > activeHandIndex && !h.done);
    if (nextIndex !== -1) {
      setActiveHandIndex(nextIndex);
    } else {
      beginDealerTurn(dealerUp, dealerHole, hands);
    }
  }

  // --- Dealer's turn + resolution ---

  function beginDealerTurn(dealerUpRaw: Card, dealerHoleRaw: Card, hands: PlayerHandState[]) {
    setPhase("dealer-turn");
    const shoe = shoeRef.current;
    const initialDealerCards = [dealerUpRaw, dealerHoleRaw];

    // No need for the dealer to draw further if every hand already
    // busted or surrendered — nothing left to win against. The hole
    // card still gets revealed either way, for transparency.
    const anyLiveHand = hands.some(
      (h) => !h.surrendered && evaluateHand(rawCards(h.cards)).total <= 21,
    );
    const finalDealerCards = anyLiveHand ? playDealerHand(shoe, initialDealerCards) : initialDealerCards;
    const newlyDrawn = finalDealerCards.slice(2);

    setDealerHand((prev) => [
      ...prev.map((d, i) => (i === 1 ? { ...d, faceDown: false } : d)),
      ...newlyDrawn.map((c) => wrapCard(c)),
    ]);
    setVisibleCardsSinceShuffle((prev) => [...prev, dealerHoleRaw, ...newlyDrawn]);
    setShoeStats({ remaining: shoe.remaining, size: shoe.size });

    resolveRound(finalDealerCards, hands);
  }

  function resolveRound(dealerFinalCards: Card[], hands: PlayerHandState[]) {
    const dealerValue = evaluateHand(dealerFinalCards);
    const dealerState = {
      total: dealerValue.total,
      isBust: dealerValue.total > 21,
      isBlackjack: dealerValue.isBlackjack,
    };

    let netChange = 0;
    const results: RoundResultEntry[] = hands.map((hand) => {
      const playerValue = evaluateHand(rawCards(hand.cards));
      const playerState = {
        total: playerValue.total,
        isBust: playerValue.total > 21,
        // A post-split 21 is NOT a blackjack for payout purposes —
        // evaluateHand doesn't know about splits, so that's gated here.
        isBlackjack: !hand.fromSplit && playerValue.isBlackjack,
        surrendered: hand.surrendered,
      };
      const resolved = resolveHand(playerState, dealerState);
      const payout = Math.round(hand.bet * resolved.returnMultiplier);
      netChange += payout;
      return { handId: hand.id, outcome: resolved.outcome, bet: hand.bet, payout };
    });

    // `bankroll` here is this render's closure value — safe to read
    // directly (not via a functional update) because every earlier
    // debit this round (bet/split/double/insurance) happened in an
    // earlier, already-flushed render, and nothing else changes
    // bankroll between those debits and this resolution.
    const finalBankroll = bankroll + netChange;
    setBankroll(finalBankroll);
    setRoundResults(results);
    setPhase("resolved");

    persistAfterRound(finalBankroll);
  }

  function persistAfterRound(finalBankroll: number) {
    if (!sessionIdRef.current) {
      sessionIdRef.current = randomId();
      startedAtRef.current = new Date().toISOString();
    }
    handsPlayedRef.current += 1;
    bankrollTrendRef.current = [
      ...bankrollTrendRef.current,
      { hand: handsPlayedRef.current, bankroll: finalBankroll },
    ];
    const bettingCorrelation = pearsonCorrelation(betPairsRef.current);

    void savePlayProgress({
      sessionId: sessionIdRef.current,
      systemId,
      startedAt: startedAtRef.current!,
      handsPlayed: handsPlayedRef.current,
      bankrollTrend: bankrollTrendRef.current,
      bettingCorrelation,
    });
  }

  function nextHand() {
    setPhase("betting");
    setRoundResults(null);
    setLastActionFeedback(null);
  }

  return {
    systemId,
    pendingSystemId,
    handleSystemChange,
    confirmSystemChange,
    cancelSystemChange,
    deckCount,
    onDeckCountChange: handleDeckCountChange,
    penetration,
    onPenetrationChange: handlePenetrationChange,
    seats,
    addSeat,
    removeSeat,
    setSeatSkill,

    shoeStats,
    shuffleNotice,
    decksRemaining,
    runningCount,
    trueCount,
    suggestedBetDollars,

    bankroll,
    currentBet,
    addChipToBet,
    clearBet,
    deal,

    phase,
    tableHands,
    insuranceBet,
    insuranceOffer,
    takeInsurance,
    declineInsurance,

    activeHandOptions,
    activeHandBet,
    hit,
    stand,
    double,
    split,
    surrender,
    lastActionFeedback,

    roundResults,
    nextHand,
  };
}
