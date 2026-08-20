import Link from "next/link";
import { TheoryChapterLayout } from "@/components/TheoryChapterLayout";
import { HowToCalculateCard } from "@/components/HowToCalculateCard";
import { Term } from "@/components/Term";

function ShoeBar({ dealtFraction, decksRemaining }: { dealtFraction: number; decksRemaining: string }) {
  return (
    <div>
      <div className="h-6 w-full overflow-hidden rounded-card border border-felt-line bg-felt-900">
        <div
          className="h-full bg-felt-700"
          style={{ width: `${dealtFraction * 100}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-ink-muted">
        <span>Dealt (already counted)</span>
        <span className="font-medium text-gold-400">{decksRemaining} decks left</span>
      </div>
    </div>
  );
}

export default function TrueCountChapter() {
  return (
    <TheoryChapterLayout slug="true-count">
      <section className="theory-content">
        <p>
          A <Term id="running-count">running count</Term> of +6 means something very different
          early in a 6-deck shoe than it does with one deck left. The same six extra small cards
          are a much bigger share of what&rsquo;s remaining once most of the shoe is gone. The{" "}
          <Term id="true-count">true count</Term> fixes this by normalizing the running count per
          deck still in play, so a count of a given size means roughly the same thing no matter
          where you are in the shoe.
        </p>
      </section>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <ShoeBar dealtFraction={0.15} decksRemaining="5" />
          <p className="mt-2 text-xs text-ink-muted">
            Running count +6 here → true count <strong className="text-ink">+1</strong> (6 ÷ 5,
            rounded)
          </p>
        </div>
        <div className="flex-1">
          <ShoeBar dealtFraction={0.8} decksRemaining="1" />
          <p className="mt-2 text-xs text-ink-muted">
            The SAME running count +6 here → true count <strong className="text-ink">+6</strong> —
            a far more favorable deck.
          </p>
        </div>
      </div>

      <section className="theory-content">
        <h2>The formula</h2>
        <p>
          <strong>True count = Running count ÷ Decks remaining</strong>, rounded to the nearest
          whole number. Only <Term id="balanced-count">balanced</Term> systems need this step —
          unbalanced systems like KO are designed so the running count alone is already
          betting-relevant.
        </p>
      </section>

      <HowToCalculateCard>
        <p>
          <strong>Decks remaining is rounded to the nearest half deck</strong> — real counters
          estimate this by eye (how much of the shoe/discard tray is left), not as an exact
          decimal. You&rsquo;ll only ever be dividing by a whole or half number.
        </p>
        <p>
          <strong>The shortcut:</strong> if decks remaining is a whole number, divide normally. If
          it&rsquo;s a half (like 4.5), double both numbers first to clear the fraction, then
          divide — dividing by a whole number is much easier.
        </p>
        <p>
          <strong>Worked example:</strong> running count 6, decks remaining 4.5.
          <br />
          Double both: 12 ÷ 9 ≈ 1.3 → round to the nearest whole number → true count{" "}
          <strong>1</strong>.
        </p>
        <p>
          Round your final answer to the nearest whole number and stop there — nothing you&rsquo;d
          actually do with it (bet sizing, a deviation) needs more precision than that.
        </p>
      </HowToCalculateCard>

      <section className="theory-content">
        <p>
          Practice this conversion directly in the{" "}
          <Link href="/drills/true-count" className="text-gold-400 hover:underline">
            True Count Conversion Drill
          </Link>
          . Once you&rsquo;re comfortable with it, the next chapter covers what to actually do with
          the number: how much to bet.
        </p>
      </section>
    </TheoryChapterLayout>
  );
}
