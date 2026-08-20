import type { StrategyChartRow } from "@/lib/blackjack";
import type { Action, DealerBucket } from "@/lib/shoe";

export const ACTION_LETTER: Record<Action, string> = {
  hit: "H",
  stand: "S",
  double: "D",
  split: "P",
  surrender: "R",
};

export const ACTION_STYLE: Record<Action, string> = {
  hit: "bg-neutral-700 text-white",
  stand: "bg-red-700 text-white",
  double: "bg-amber-600 text-felt-950",
  split: "bg-sky-600 text-white",
  surrender: "bg-purple-700 text-white",
};

interface StrategyChartTableProps {
  title: string;
  rows: StrategyChartRow[];
  dealerColumns: readonly DealerBucket[];
}

/**
 * One color-coded hard/soft/pairs table — shared by Play Mode's
 * StrategyCard (SPEC.md §5.4) and the Theory basic-strategy chapter
 * (SPEC.md §5.2), so the two never drift into slightly different
 * renderings of the same chart.
 */
export function StrategyChartTable({ title, rows, dealerColumns }: StrategyChartTableProps) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-gold-400">{title}</p>
      <div className="overflow-x-auto">
        <table className="border-collapse text-[11px]">
          <thead>
            <tr>
              <th className="w-8 px-1 py-0.5 text-left font-medium text-ink-muted" scope="col" />
              {dealerColumns.map((d) => (
                <th key={d} className="w-6 px-1 py-0.5 font-medium text-ink-muted" scope="col">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="px-1 py-0.5 text-left font-medium text-ink">
                  {row.label}
                </th>
                {dealerColumns.map((d) => (
                  <td key={d} className={`h-6 w-6 text-center font-bold ${ACTION_STYLE[row.actions[d]]}`}>
                    {ACTION_LETTER[row.actions[d]]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
