/** The face-down side of a dealt card, used by DealingTable's
 * flip-reveal and its deck stack. A traditional red diamond-lattice
 * pattern (the standard playing-card-back look), not a themed color —
 * card backs are meant to look like card backs, not felt tokens.
 * Matches PlayingCardView's exact footprint so the flip doesn't change
 * size mid-animation. */
export function CardBackView() {
  return (
    <span className="inline-flex h-16 w-12 items-center justify-center rounded-card border border-black/15 bg-card p-0.5 sm:h-20 sm:w-14">
      <span
        className="h-full w-full rounded-[3px] border border-black/20"
        style={{
          backgroundColor: "#8f1d2c",
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(255,255,255,0.14) 0px, rgba(255,255,255,0.14) 1px, transparent 1px, transparent 6px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.14) 0px, rgba(255,255,255,0.14) 1px, transparent 1px, transparent 6px)",
        }}
      />
    </span>
  );
}
