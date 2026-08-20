import Link from "next/link";
import { TheoryChapterLayout } from "@/components/TheoryChapterLayout";
import { StrategyChartTable } from "@/components/StrategyChartTable";
import { Term } from "@/components/Term";
import { buildStrategyChart } from "@/lib/blackjack";

export default function BasicStrategyChapter() {
  const chart = buildStrategyChart();

  return (
    <TheoryChapterLayout slug="basic-strategy">
      <section className="theory-content">
        <p>
          <strong>Basic strategy</strong> is the mathematically optimal play for every possible
          hand against every possible dealer up-card — computed independent of the count, purely
          from the odds of a fixed set of house rules. It&rsquo;s the foundation every counting
          decision builds on: you play basic strategy by default, and only deviate from it (next
          chapter) once the count crosses a specific threshold.
        </p>
        <p>
          The chart below assumes this app&rsquo;s house rules (used in Play Mode): dealer stands
          on soft 17, double after split allowed, late surrender allowed. Every cell assumes the
          action would be legal to choose — whether double/split/surrender are actually available
          depends on how many cards you&rsquo;re holding, same as at a real table.
        </p>
      </section>

      <div className="flex flex-col gap-4">
        <StrategyChartTable title="Hard totals" rows={chart.hard} dealerColumns={chart.dealerColumns} />
        <StrategyChartTable
          title="Soft totals (Ace + …)"
          rows={chart.soft}
          dealerColumns={chart.dealerColumns}
        />
        <StrategyChartTable title="Pairs" rows={chart.pairs} dealerColumns={chart.dealerColumns} />
      </div>
      <p className="text-xs text-ink-muted">
        H hit · S stand · D double · P split · R surrender. Columns are the dealer&rsquo;s up-card;
        rows are your hand.
      </p>

      <section className="theory-content">
        <h2>How to read it</h2>
        <ul>
          <li>
            <strong>Hard totals</strong> — any hand without an ace counted as 11 (or with an ace
            counted as 1). Below 8 always hits, above 17 always stands — those rows aren&rsquo;t
            shown since there&rsquo;s no decision to make.
          </li>
          <li>
            <strong>Soft totals</strong> — a hand with an ace still counted as 11 (e.g. Ace-7 =
            &ldquo;soft 18&rdquo;). Soft hands can never bust on the next card, which is why
            doubling is correct far more often here than on a hard total of the same value.
          </li>
          <li>
            <strong>Pairs</strong> — checked first, before falling back to the hard/soft chart, on
            your very first two cards only.
          </li>
        </ul>
      </section>

      <section className="theory-content">
        <p>
          This exact chart is also available as a toggleable reference card in the corner of the
          screen during{" "}
          <Link href="/play" className="text-gold-400 hover:underline">
            Play Mode
          </Link>{" "}
          — turn on <Term id="deviation">deviation</Term>-aware correctness checking there to see
          when the count actually changes one of these calls, which is exactly what the next
          chapter covers.
        </p>
      </section>
    </TheoryChapterLayout>
  );
}
