"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type RefObject,
} from "react";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import { PlayingCardView } from "@/components/PlayingCard";
import { CardBackView } from "@/components/CardBack";
import type { DealtCard, TableHand } from "@/hooks/useCardStreamDrill";

interface DealingTableProps {
  hands: TableHand[];
}

const TABLE_BACKGROUND: CSSProperties = {
  backgroundImage:
    "radial-gradient(ellipse at 50% 0%, var(--color-felt-700) 0%, var(--color-felt-900) 80%)",
};

// Shares the deck stack's DOM node with every dealt card so each one
// can measure the real on-screen distance from deck to hand, instead
// of a guessed fixed offset — see the "cards don't slide from the
// shoe" fix in MISTAKES.md.
const DeckAnchorContext = createContext<RefObject<HTMLDivElement | null> | null>(null);

/**
 * Shared table/dealing-animation component (SPEC.md §7.2, CLAUDE.md
 * rule #11) — every shoe-mode drill and Play Mode render hands through
 * this, never a per-page card renderer. Used for any real shoe-mode
 * hand, including a solo hand with zero seats — not gated on seat
 * count.
 *
 * Layout: dealer position fixed top-center, seat positions (including
 * the user's own hand) arranged in a centered row beneath with a
 * slight per-seat curve (middle closest/largest, outer lower/smaller)
 * approximating a table's curved edge — an offset applied within the
 * existing responsive flex-wrap row, not literal arc positioning, so
 * mobile wrapping safety isn't lost.
 *
 * Animation: seat add/remove gets a real re-flow via Framer Motion's
 * `layout` + `AnimatePresence`. Each dealt card measures the deck
 * stack's real position on mount and slides from there to its hand
 * position while flipping face-up. Old cards get a quick fade-out
 * exit (rather than vanishing instantly) so a new round reads as
 * "old hand leaves, new hand arrives" instead of looking like one
 * card's face inexplicably changing mid-flip.
 */
export function DealingTable({ hands }: DealingTableProps) {
  const dealer = hands.find((hand) => hand.id === "dealer");
  const seats = hands.filter((hand) => hand.id !== "dealer");
  const mid = (seats.length - 1) / 2;
  const deckRef = useRef<HTMLDivElement>(null);

  return (
    <DeckAnchorContext.Provider value={deckRef}>
      <div
        className="relative flex w-full flex-col items-center gap-6 overflow-hidden rounded-3xl border-2 border-gold-500/40 px-4 py-6 shadow-inner sm:px-8"
        style={TABLE_BACKGROUND}
      >
        <DeckStack anchorRef={deckRef} />

        {dealer && <HandSlot hand={dealer} />}

        {/* Normal-flow, not absolutely positioned with a guessed
         * offset — sits in the actual gap between the dealer's cards
         * and the seats row regardless of how tall either is. */}
        <FeltInscription />

        <motion.div layout className="flex flex-wrap items-start justify-center gap-4">
          <AnimatePresence>
            {seats.map((hand, i) => {
              const distanceFromCenter = Math.abs(i - mid);
              // Negative: outer seats lift toward the dealer rather
              // than dropping away from the table.
              const curveOffset = -distanceFromCenter * 10;
              const curveScale = Math.max(0.92, 1 - distanceFromCenter * 0.03);
              return (
                <motion.div
                  key={hand.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <div style={{ transform: `translateY(${curveOffset}px) scale(${curveScale})` }}>
                    <HandSlot hand={hand} />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    </DeckAnchorContext.Provider>
  );
}

function FeltInscription() {
  return (
    <svg
      viewBox="0 0 460 80"
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none h-14 w-4/5 max-w-sm opacity-35 sm:h-16"
      aria-hidden="true"
    >
      <path id="dealing-table-arc" d="M 10 66 Q 230 4 450 66" fill="none" />
      <text fontSize="28" fontWeight="800" letterSpacing="1" fill="var(--color-gold-400)">
        <textPath href="#dealing-table-arc" startOffset="50%" textAnchor="middle">
          BLACKJACK PAYS 3 TO 2
        </textPath>
      </text>
    </svg>
  );
}

function DeckStack({ anchorRef }: { anchorRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div
      ref={anchorRef}
      className="absolute left-3 top-3 flex flex-col items-center gap-1 sm:left-5 sm:top-5"
    >
      <div className="relative h-10 w-8 sm:h-12 sm:w-9">
        <span className="absolute inset-0 translate-x-1 translate-y-1 rounded-[3px] border border-gold-500/30 bg-felt-700" />
        <span className="absolute inset-0 translate-x-0.5 translate-y-0.5 rounded-[3px] border border-gold-500/30 bg-felt-700" />
        <span className="absolute inset-0 rounded-[3px] border border-gold-500/50 bg-felt-800" />
      </div>
      <span className="text-[9px] uppercase tracking-wide text-ink-muted">Shoe</span>
    </div>
  );
}

function HandSlot({ hand }: { hand: TableHand }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {hand.label && <span className="text-xs font-medium text-ink-muted">{hand.label}</span>}
      <div className="flex min-h-16 flex-wrap justify-center gap-1 sm:min-h-20">
        <AnimatePresence initial={false}>
          {hand.cards.map((dealt) => (
            <DealtCardView key={dealt.id} dealt={dealt} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function DealtCardView({ dealt }: { dealt: DealtCard }) {
  const deckRef = useContext(DeckAnchorContext);
  const [scope, animate] = useAnimate<HTMLDivElement>();

  useLayoutEffect(() => {
    const el = scope.current;
    if (!el) return;

    // Fall back to a small up-left drift if the deck isn't measurable
    // for some reason — still reads as "dealt from somewhere," just
    // not measured.
    let dx = -36;
    let dy = -20;
    const deckEl = deckRef?.current;
    if (deckEl) {
      const cardRect = el.getBoundingClientRect();
      const deckRect = deckEl.getBoundingClientRect();
      dx = deckRect.left + deckRect.width / 2 - (cardRect.left + cardRect.width / 2);
      dy = deckRect.top + deckRect.height / 2 - (cardRect.top + cardRect.height / 2);
    }

    let stopped = false;
    let activeAnimation: ReturnType<typeof animate> | null = null;

    async function run() {
      // Instantly establish the starting state — every property that
      // either phase touches, all at once. Each animate() call below
      // also restates every property explicitly (not just the ones
      // changing): calling animate() repeatedly on a raw DOM element
      // (not a <motion.*> component) doesn't reliably preserve a
      // property that a later call omits, so leaving rotateY out of
      // phase 1 let it drift back toward 0 — the card showed its face
      // during the slide, then phase 2's explicit [180, 0] forced a
      // snap back to 180 before flipping, reading as two flips. See
      // MISTAKES.md.
      animate(el, { x: dx, y: dy, opacity: 0, rotate: -8, rotateY: 180 }, { duration: 0 });

      // Phase 1: slide from the deck to the hand position, face-down
      // throughout — rotateY is explicitly held at 180, not omitted.
      activeAnimation = animate(
        el,
        { x: 0, y: 0, opacity: 1, rotate: 0, rotateY: 180 },
        { duration: 0.24, ease: "easeOut" },
      );
      await activeAnimation;
      if (stopped) return;

      // Phase 2: now stationary at its final position — x/y/opacity/
      // rotate pinned at their resting values, only rotateY animates,
      // from whatever it currently is (180) to 0.
      activeAnimation = animate(
        el,
        { x: 0, y: 0, opacity: 1, rotate: 0, rotateY: 0 },
        { duration: 0.28, ease: "easeInOut" },
      );
      await activeAnimation;
    }

    run();

    // React Strict Mode (dev only) mounts effects twice — the first
    // invocation's cleanup must actually halt the in-flight animation
    // via .stop(), not just set a flag, or its flip can partially play
    // before the second (real) invocation starts its own, looking
    // like the card flips twice even though its content never
    // changed. See MISTAKES.md.
    return () => {
      stopped = true;
      activeAnimation?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.12 }}
      className="[perspective:600px]"
    >
      <div ref={scope} className="relative [transform-style:preserve-3d]" style={{ opacity: 0 }}>
        <div className="[backface-visibility:hidden]">
          <PlayingCardView card={dealt.card} />
        </div>
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <CardBackView />
        </div>
      </div>
    </motion.div>
  );
}
