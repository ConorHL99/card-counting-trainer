/**
 * Pearson correlation coefficient between paired suggested/actual bet
 * amounts — Play Mode's betting-correlation stat (SPEC.md §6).
 * Correlation is scale-invariant, so this works directly on dollar
 * amounts without needing to convert back to bet-ramp "units" first.
 * Returns null when undefined (fewer than 2 hands, or either series
 * has zero variance — e.g. the count never moved, or the player bet
 * flat all session) rather than a misleading 0.
 */
export function pearsonCorrelation(pairs: { x: number; y: number }[]): number | null {
  const n = pairs.length;
  if (n < 2) return null;

  const meanX = pairs.reduce((sum, p) => sum + p.x, 0) / n;
  const meanY = pairs.reduce((sum, p) => sum + p.y, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;
  for (const p of pairs) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  if (denomX === 0 || denomY === 0) return null;
  return numerator / Math.sqrt(denomX * denomY);
}
