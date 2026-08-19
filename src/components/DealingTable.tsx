"use client";

import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PlayingCardView } from "@/components/PlayingCard";
import { CardBackView } from "@/components/CardBack";
import type { TableHand } from "@/hooks/useCardStreamDrill";

interface DealingTableProps {
  hands: TableHand[];
}

// Low-opacity fractal-noise SVG, tiled, layered over the felt gradient
// so the table reads as fabric rather than a flat color fill — inline
// so there's no extra asset/network request to source or host.
const FELT_NOISE_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E";

const TABLE_BACKGROUND: CSSProperties = {
  backgroundImage: `radial-gradient(ellipse at 50% 0%, var(--color-felt-700) 0%, var(--color-felt-900) 75%), url("${FELT_NOISE_URL}")`,
  backgroundSize: "cover, 160px 160px",
  backgroundRepeat: "no-repeat, repeat",
};

// Cards enter from this fixed direction (up-and-left, toward the deck
// stack) rather than a live-measured deck-to-hand path. The deck sits
// at a fixed corner at every breakpoint, so a fixed directional offset
// reads as "from the deck" everywhere without the fragility of
// re-measuring DOM positions per breakpoint/seat-count layout.
const CARD_ENTER = { opacity: 0, x: -36, y: -20, rotate: -8, rotateY: 180 };
const CARD_SETTLE = { opacity: 1, x: 0, y: 0, rotate: 0, rotateY: 0 };

/**
 * Shared table/dealing-animation component (SPEC.md §7.2, CLAUDE.md
 * rule #11) — every shoe-mode drill and Play Mode render hands through
 * this, never a per-page card renderer (see MISTAKES.md "Duplicating
 * table rendering per page"). Used for any real shoe-mode hand,
 * including a solo hand with zero seats — not gated on seat count
 * (see MISTAKES.md "DealingTable gated on seat count instead of deal
 * mode").
 *
 * Layout: dealer position fixed top-center, seat positions wrap in a
 * centered row beneath — wraps to multiple rows at narrow widths
 * rather than clipping or requiring horizontal scroll.
 *
 * Animation: seat add/remove gets a real FLIP-style re-flow via
 * Framer Motion's `layout` + `AnimatePresence`, since that's the part
 * that genuinely needs smooth position interpolation. Per-card entry
 * (every deal) deliberately has NO exit animation — old cards are
 * removed instantly when a new round replaces them — so rapid Speed
 * Drill dealing never piles up animation work. Each new card slides in
 * from the deck's direction while flipping face-up (rotateY 180→0
 * over a matching two-sided back/front pair), rather than just fading.
 */
export function DealingTable({ hands }: DealingTableProps) {
  const dealer = hands.find((hand) => hand.id === "dealer");
  const seats = hands.filter((hand) => hand.id !== "dealer");

  return (
    <div
      className="relative flex w-full flex-col items-center gap-6 overflow-hidden rounded-3xl border-2 border-gold-500/40 px-4 py-6 shadow-inner sm:px-8"
      style={TABLE_BACKGROUND}
    >
      <DeckStack />

      {dealer && <HandSlot hand={dealer} />}

      <motion.div layout className="flex flex-wrap items-start justify-center gap-4">
        <AnimatePresence>
          {seats.map((hand) => (
            <motion.div
              key={hand.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <HandSlot hand={hand} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
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
              transition={{ duration: 0.28, ease: "easeOut" }}
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
