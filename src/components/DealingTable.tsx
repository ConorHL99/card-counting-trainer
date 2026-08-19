"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
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

/**
 * The flip is deliberately NOT a true 3D rotateY transform. Three
 * attempts at that (perspective + preserve-3d + backface-visibility +
 * a static-rotated back face) all broke in different ways — including
 * rendering the front face at an angle without properly hiding it
 * (visibly mirrored text), which a raw DOM element driven by
 * useAnimate apparently doesn't handle as reliably as a declarative
 * <motion.*> component would. Switched to a much simpler, structurally
 * safer technique: squish to a sliver via scaleX (a single ordinary 2D
 * transform), swap the rendered content at the invisible midpoint,
 * unsquish. This cannot mirror text — the face is only ever scaled,
 * never rendered at an angle. See MISTAKES.md.
 */
function DealtCardView({ dealt }: { dealt: DealtCard }) {
  const deckRef = useContext(DeckAnchorContext);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const [revealed, setRevealed] = useState(false);

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
      // Phase 1: slide + fade in from the deck. Explicit [from, to]
      // arrays for every property — not a separate prior "instant
      // setup" call that phase 1 then implicitly relies on. That
      // pattern raced: phase 1's own animation could construct its
      // "current value" before the setup call had actually committed,
      // making the slide a no-op (start == end). Each animate() call
      // here is fully self-contained.
      activeAnimation = animate(
        el,
        { x: [dx, 0], y: [dy, 0], opacity: [0, 1], rotate: [-8, 0] },
        { duration: 0.24, ease: "easeOut" },
      );
      await activeAnimation;
      if (stopped) return;

      // Phase 2: flip in place — squish, swap content while invisible,
      // unsquish.
      activeAnimation = animate(el, { scaleX: [1, 0] }, { duration: 0.14, ease: "easeIn" });
      await activeAnimation;
      if (stopped) return;

      setRevealed(true);

      activeAnimation = animate(el, { scaleX: [0, 1] }, { duration: 0.14, ease: "easeOut" });
      await activeAnimation;
    }

    run();

    // React Strict Mode (dev only) mounts effects twice — the first
    // invocation's cleanup must actually halt the in-flight animation
    // via .stop(), not just set a flag, or its flip can partially play
    // before the second (real) invocation starts its own. See
    // MISTAKES.md.
    return () => {
      stopped = true;
      activeAnimation?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div exit={{ opacity: 0, scale: 0.85 }} transition={{ duration: 0.12 }}>
      <div ref={scope}>{revealed ? <PlayingCardView card={dealt.card} /> : <CardBackView />}</div>
    </motion.div>
  );
}
