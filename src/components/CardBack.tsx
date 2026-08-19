/** The face-down side of a dealt card, used by DealingTable's
 * flip-reveal and its deck stack. Matches PlayingCardView's exact
 * footprint so the flip doesn't change size mid-animation. */
export function CardBackView() {
  return (
    <span
      className="inline-flex h-16 w-12 items-center justify-center rounded-card border border-gold-500/40 sm:h-20 sm:w-14"
      style={{
        backgroundImage:
          "repeating-linear-gradient(135deg, var(--color-felt-700) 0px, var(--color-felt-700) 4px, var(--color-felt-800) 4px, var(--color-felt-800) 8px)",
      }}
    >
      <span className="h-[65%] w-[65%] rounded-[3px] border border-gold-500/30" />
    </span>
  );
}
