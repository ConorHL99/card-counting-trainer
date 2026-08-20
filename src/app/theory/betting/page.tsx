import Link from "next/link";
import { TheoryChapterLayout } from "@/components/TheoryChapterLayout";
import { Term } from "@/components/Term";
import { BET_RAMP } from "@/lib/betting";

function BetRampChart() {
  const maxUnits = Math.max(...BET_RAMP.map((s) => s.units));
  return (
    <div className="flex items-end gap-4 overflow-x-auto pb-2">
      {BET_RAMP.map((step, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <div className="flex h-28 w-10 items-end">
            <div
              className="w-full rounded-t-card bg-gold-500"
              style={{ height: `${(step.units / maxUnits) * 100}%` }}
              aria-hidden="true"
            />
          </div>
          <span className="text-sm font-semibold text-ink">{step.units}×</span>
          <span className="text-[10px] whitespace-nowrap text-ink-muted">
            TC {step.minTrueCount === -Infinity ? "≤ 1" : `≥ ${step.minTrueCount}`}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function BettingChapter() {
  return (
    <TheoryChapterLayout slug="betting">
      <section className="theory-content">
        <p>
          Counting only pays off if your bet size actually responds to the count. Flat-betting
          (the same amount every hand) while counting perfectly in your head still loses money on
          average — you need to bet more when the <Term id="true-count">true count</Term> favors
          you, and little or nothing when it doesn&rsquo;t.
        </p>
        <h2>The bet ramp</h2>
        <p>
          A <strong>bet ramp</strong> maps true count to a bet size, usually expressed in
          &ldquo;units&rdquo; (your base bet = 1 unit). This app&rsquo;s default ramp, used by the
          Bet-Sizing Drill and Play Mode:
        </p>
      </section>

      <BetRampChart />

      <section className="theory-content">
        <p>
          Notice the ramp only starts increasing once the count is genuinely favorable (true count
          2+) — at a neutral or negative count, you bet the table minimum (1 unit) since the odds
          are at best even, more often slightly against you.
        </p>
        <h2>Why not spread more aggressively?</h2>
        <p>
          A steeper spread (betting far more at high counts) increases your edge but also your
          bankroll swings, and makes your betting pattern more obviously correlated with the count
          — which is exactly what casinos watch for. This app tracks that correlation directly as
          a stat (<Term id="betting-correlation">betting correlation</Term>) in Play Mode, so you
          can see how closely your own bets tracked the count over a session.
        </p>
      </section>

      <section className="theory-content">
        <p>
          Practice reading true count into a bet size in the{" "}
          <Link href="/drills/bet-sizing" className="text-gold-400 hover:underline">
            Bet-Sizing Drill
          </Link>
          , or bet for real chips (well — pretend ones) in{" "}
          <Link href="/play" className="text-gold-400 hover:underline">
            Play Mode
          </Link>
          . Next: the basic strategy chart every hand starts from, before counting ever changes
          anything.
        </p>
      </section>
    </TheoryChapterLayout>
  );
}
