import Link from "next/link";
import { TheoryChapterLayout } from "@/components/TheoryChapterLayout";
import { HowToCalculateCard } from "@/components/HowToCalculateCard";
import { PlayingCardView } from "@/components/PlayingCard";
import { Term } from "@/components/Term";
import { getCountingSystem } from "@/lib/counting-systems";
import type { Card } from "@/lib/shoe";

const EXAMPLE_CARDS: Card[] = [
  { rank: "5", suit: "hearts" },
  { rank: "5", suit: "clubs" },
  { rank: "3", suit: "spades" },
  { rank: "K", suit: "diamonds" },
  { rank: "2", suit: "hearts" },
  { rank: "7", suit: "clubs" },
  { rank: "4", suit: "spades" },
  { rank: "K", suit: "hearts" },
  { rank: "6", suit: "diamonds" },
  { rank: "A", suit: "spades" },
];

function formatSigned(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}

function WorkedExample() {
  const system = getCountingSystem("hi-lo");
  const steps = EXAMPLE_CARDS.reduce<{ card: Card; tag: number; running: number }[]>((acc, card) => {
    const tag = system.tagValues[card.rank === "J" || card.rank === "Q" || card.rank === "K" ? "10" : card.rank];
    const running = (acc[acc.length - 1]?.running ?? 0) + tag;
    return [...acc, { card, tag, running }];
  }, []);

  return (
    <div className="overflow-x-auto">
      <div className="flex w-max gap-2 pb-2">
        {steps.map((step, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="scale-[0.7] sm:scale-90">
              <PlayingCardView card={step.card} />
            </div>
            <span
              className={`text-xs font-semibold ${
                step.tag > 0 ? "text-success" : step.tag < 0 ? "text-danger" : "text-ink-muted"
              }`}
            >
              {formatSigned(step.tag)}
            </span>
            <span className="text-[10px] text-ink-muted">RC {formatSigned(step.running)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RunningCountChapter() {
  return (
    <TheoryChapterLayout slug="running-count">
      <section className="theory-content">
        <p>
          The <Term id="running-count">running count</Term> is nothing more than a rolling sum: for
          every card you see dealt, add its <Term id="tag-value">tag value</Term> to a running
          total you keep in your head. It resets to 0 every time the shoe is shuffled — a running
          count only ever describes what&rsquo;s happened since the last shuffle.
        </p>
        <h2>Worked example (Hi-Lo)</h2>
        <p>
          Ten cards, dealt left to right. Each card shows its Hi-Lo tag value and the running
          count immediately after it&rsquo;s added.
        </p>
      </section>

      <WorkedExample />

      <section className="theory-content">
        <p>
          The count climbs on small cards (5, 5, 3, 2, 4, 6) and drops on tens and aces (K, K, A) —
          ending at <strong>+3</strong>. That means, relative to a fresh shoe, proportionally more
          small cards have come out than tens/aces — the remaining cards skew slightly favorable to
          the player.
        </p>
      </section>

      <HowToCalculateCard label="Why this is easier than it looks">
        <p>
          You&rsquo;re never adding up all ten cards at once — you&rsquo;re just adding ONE number
          (−1, 0, or +1 for Hi-Lo) to whatever you were already holding in your head, one card at a
          time, as each card is dealt. By the time you&rsquo;ve seen ten cards you&rsquo;ve done
          ten trivially small additions, not one big one.
        </p>
        <p>
          A useful trick: cards often come out in pairs or small groups you can pre-cancel. If you
          see a 5 and a King land close together, that&rsquo;s +1 and −1 — they cancel, and you
          can skip updating the count at all for that pair.
        </p>
      </HowToCalculateCard>

      <section className="theory-content">
        <p>
          The running count on its own is only directly useful for <strong>unbalanced</strong>{" "}
          systems like KO. For a balanced system like Hi-Lo, you need one more step — converting it
          to a <Term id="true-count">true count</Term> — before it tells you anything about how
          favorable the deck actually is. That&rsquo;s the next chapter.
        </p>
        <p>
          Practice this directly in the{" "}
          <Link href="/drills/running-count" className="text-gold-400 hover:underline">
            Running Count Drill
          </Link>{" "}
          — cards stream in one at a time and you keep the count live, exactly like this example.
        </p>
      </section>
    </TheoryChapterLayout>
  );
}
