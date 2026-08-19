export interface BetRampStep {
  minTrueCount: number;
  units: number;
}

/**
 * A standard example bet spread (units per true count), independent
 * of counting system — a true count of +3 means the same bet
 * regardless of which system produced it, so one ramp works for all
 * balanced systems. This exact 1-2-4-6-8 spread is a commonly cited
 * example ramp in card-counting literature (e.g. Schlesinger's
 * "Blackjack Attack"), chosen as a defensible default since SPEC.md
 * doesn't define one. See MISTAKES.md.
 */
export const BET_RAMP: readonly BetRampStep[] = [
  { minTrueCount: -Infinity, units: 1 },
  { minTrueCount: 2, units: 2 },
  { minTrueCount: 3, units: 4 },
  { minTrueCount: 4, units: 6 },
  { minTrueCount: 5, units: 8 },
];

export function getBetUnits(trueCount: number): number {
  let units = BET_RAMP[0].units;
  for (const step of BET_RAMP) {
    if (trueCount >= step.minTrueCount) units = step.units;
  }
  return units;
}
