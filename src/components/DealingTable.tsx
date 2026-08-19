"use client";

import { AnimatePresence, motion } from "motion/react";
import { PlayingCardView } from "@/components/PlayingCard";
import type { TableHand } from "@/hooks/useCardStreamDrill";

interface DealingTableProps {
  hands: TableHand[];
}

/**
 * Shared table/dealing-animation component (SPEC.md §7.2, CLAUDE.md
 * rule #11) — every shoe-mode drill and Play Mode render hands through
 * this, never a per-page card renderer (see MISTAKES.md "Duplicating
 * table rendering per page").
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
 * Drill dealing never piles up animation work. The card entrance is a
 * short directional drift (not a pixel-measured deck-to-hand path,
 * which would need fragile live DOM measurement recomputed at every
 * breakpoint/seat-count layout) — reads as "dealt" without that cost.
 */
export function DealingTable({ hands }: DealingTableProps) {
  const dealer = hands.find((hand) => hand.id === "dealer");
  const seats = hands.filter((hand) => hand.id !== "dealer");

  return (
    <div className="relative flex flex-col items-center gap-6 py-2">
      <span className="absolute right-0 top-0 rounded-card border border-felt-line px-2 py-1 text-[10px] uppercase tracking-wide text-ink-muted">
        Shoe
      </span>

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

function HandSlot({ hand }: { hand: TableHand }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {hand.label && <span className="text-xs font-medium text-ink-muted">{hand.label}</span>}
      <div className="flex min-h-16 flex-wrap justify-center gap-1 sm:min-h-20">
        {hand.cards.map((dealt) => (
          <motion.div
            key={dealt.id}
            initial={{ opacity: 0, y: -16, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <PlayingCardView card={dealt.card} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
