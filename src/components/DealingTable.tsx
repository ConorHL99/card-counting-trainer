"use client";

import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PlayingCardView } from "@/components/PlayingCard";
import { CardBackView } from "@/components/CardBack";
import type { TableHand } from "@/hooks/useCardStreamDrill";

interface DealingTableProps {
  hands: TableHand[];
}

// Grayscale fractal-noise SVG, tiled, layered OVER the felt gradient
// so the table reads as fabric rather than a flat color fill — inline
// so there's no extra asset/network request to source or host.
//
// Layer order matters here: in a multi-layer `background-image`, the
// FIRST listed layer paints on top. The noise must come first — an
// earlier version listed the (fully opaque) gradient first, which
// completely covered the noise regardless of its own opacity. See
// MISTAKES.md.
const FELT_NOISE_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.12' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E";

const TABLE_BACKGROUND: CSSProperties = {
  backgroundImage: `url("${FELT_NOISE_URL}"), radial-gradient(ellipse at 50% 0%, var(--color-felt-700) 0%, var(--color-felt-900) 80%)`,
  backgroundSize: "200px 200px, cover",
  backgroundRepeat: "repeat, no-repeat",
};

// Cards enter from this fixed direction (up-and-left, toward the deck
// stack) rather than a live-measured deck-to-hand path. The deck sits
// at a fixed corner at every breakpoint, so a fixed directional offset
// reads as "from the deck" everywhere without the fragility of
// re-measuring DOM positions per breakpoint/seat-count layout.
const CARD_ENTER = { opacity: 0, x: -36, y: -20, rotate: -8, rotateY: 180 };
const CARD_SETTLE = { opacity: 1, x: 0, y: 0, rotate: 0, rotateY: 0 };

// Slide finishes first (~220ms), then the flip runs on its own
// (~320ms, starting after a short delay) — sequencing them, rather
// than animating simultaneously, is what makes the flip actually
// readable instead of blurring into the slide.
const CARD_TRANSITION = {
  x: { duration: 0.22, ease: "easeOut" },
  y: { duration: 0.22, ease: "easeOut" },
  opacity: { duration: 0.16 },
  rotate: { duration: 0.22, ease: "easeOut" },
  rotateY: { duration: 0.32, delay: 0.12, ease: "easeInOut" },
} as const;

/**
 * Shared table/dealing-animation component (SPEC.md §7.2, CLAUDE.md
 * rule #11) — every shoe-mode drill and Play Mode render hands through
 * this, never a per-page card renderer (see MISTAKES.md "Duplicating
 * table rendering per page"). Used for any real shoe-mode hand,
 * including a solo hand with zero seats — not gated on seat count.
 *
 * Layout: dealer position fixed top-center, seat positions arranged in
 * a centered row beneath with a slight per-seat curve (middle seats
 * closest/largest, outer seats lower/smaller) approximating a table's
 * curved edge — an offset applied within the existing responsive
 * flex-wrap row, not literal arc positioning, so mobile wrapping
 * safety isn't lost.
 *
 * Animation: seat add/remove gets a real FLIP-style re-flow via
 * Framer Motion's `layout` + `AnimatePresence`. Per-card entry
 * (every deal) deliberately has NO exit animation — old cards are
 * removed instantly when a new round replaces them — so rapid Speed
 * Drill dealing never piles up animation work.
 */
export function DealingTable({ hands }: DealingTableProps) {
  const dealer = hands.find((hand) => hand.id === "dealer");
  const seats = hands.filter((hand) => hand.id !== "dealer");
  const mid = (seats.length - 1) / 2;

  return (
    <div
      className="relative flex w-full flex-col items-center gap-6 overflow-hidden rounded-3xl border-2 border-gold-500/40 px-4 py-6 shadow-inner sm:px-8"
      style={TABLE_BACKGROUND}
    >
      <FeltInscription />
      <DeckStack />

      {dealer && <HandSlot hand={dealer} />}

      <motion.div layout className="flex flex-wrap items-start justify-center gap-4">
        <AnimatePresence>
          {seats.map((hand, i) => {
            const distanceFromCenter = Math.abs(i - mid);
            const curveOffset = distanceFromCenter * 10;
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
                <div
                  style={{ transform: `translateY(${curveOffset}px) scale(${curveScale})` }}
                >
                  <HandSlot hand={hand} />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function FeltInscription() {
  return (
    <svg
      viewBox="0 0 400 60"
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute left-1/2 top-20 h-10 w-4/5 max-w-xs -translate-x-1/2 opacity-25 sm:top-24"
      aria-hidden="true"
    >
      <path id="dealing-table-arc" d="M 10 50 Q 200 0 390 50" fill="none" />
      <text fontSize="15" letterSpacing="4" fill="var(--color-gold-400)">
        <textPath href="#dealing-table-arc" startOffset="50%" textAnchor="middle">
          COUNT EVERY CARD
        </textPath>
      </text>
    </svg>
  );
}

function DeckStack() {
  return (
    <div className="absolute left-3 top-3 flex flex-col items-center gap-1 sm:left-5 sm:top-5">
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
        {hand.cards.map((dealt) => (
          <div key={dealt.id} className="[perspective:600px]">
            <motion.div
              className="relative [transform-style:preserve-3d]"
              initial={CARD_ENTER}
              animate={CARD_SETTLE}
              transition={CARD_TRANSITION}
            >
              <div className="[backface-visibility:hidden]">
                <PlayingCardView card={dealt.card} />
              </div>
              <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <CardBackView />
              </div>
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  );
}
