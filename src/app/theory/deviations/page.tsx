import Link from "next/link";
import { TheoryChapterLayout } from "@/components/TheoryChapterLayout";
import { PlayingCardView } from "@/components/PlayingCard";
import { Term } from "@/components/Term";
import { DEVIATION_RULES, basicActionFor, type DeviationRule } from "@/lib/deviations";
import type { Action, Card, CardRank } from "@/lib/shoe";

const ACTION_LABEL: Record<Action | "insurance" | "no-insurance", string> = {
  hit: "Hit",
  stand: "Stand",
  double: "Double",
  split: "Split",
  surrender: "Surrender",
  insurance: "Take insurance",
  "no-insurance": "Decline insurance",
};

function repCard(rank: CardRank): Card {
  return { rank, suit: "spades" };
}

function ExampleRule({ rule }: { rule: DeviationRule }) {
  const basic = basicActionFor(rule);
  return (
    <div className="felt-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {rule.playerCards ? (
          <div className="flex gap-1">
            {rule.playerCards.map((rank, i) => (
              <PlayingCardView key={i} card={repCard(rank)} />
            ))}
          </div>
        ) : (
          <div className="flex h-16 w-12 items-center justify-center rounded-card border border-dashed border-felt-line text-[10px] text-ink-muted sm:h-20 sm:w-14">
            any hand
          </div>
        )}
        <span className="text-ink-muted">vs</span>
        <PlayingCardView card={repCard(rule.dealerUpRank)} />
      </div>
      <div className="text-sm">
        <p className="text-ink-muted">
          Below TC {rule.threshold}: <span className="text-ink">{ACTION_LABEL[basic]}</span>{" "}
          (basic strategy)
        </p>
        <p className="mt-0.5 font-medium text-gold-400">
          TC ≥ {rule.threshold}: {ACTION_LABEL[rule.deviationAction]}
        </p>
      </div>
    </div>
  );
}

export default function DeviationsChapter() {
  const insurance = DEVIATION_RULES.find((r) => r.kind === "insurance")!;
  const featured = DEVIATION_RULES.filter((r) => r.kind === "play").slice(0, 3);

  return (
    <TheoryChapterLayout slug="deviations">
      <section className="theory-content">
        <p>
          Basic strategy (previous chapter) is optimal <em>on average, across every possible
          shoe</em>. But a few specific hands are close enough calls that the correct play actually
          flips once the true count tells you the remaining shoe is unusually rich or poor in
          certain cards. These are <Term id="deviation">deviations</Term>, or &ldquo;index
          plays&rdquo; — named after the &ldquo;index number&rdquo; (the true count threshold) at
          which each one kicks in.
        </p>
        <p>
          The best-known, most-cited list is the <strong>Illustrious 18</strong> (plus a handful of
          &ldquo;Fab 4&rdquo; surrender plays) — calibrated specifically to Hi-Lo&rsquo;s tag
          values, which is why deviations in this app are Hi-Lo only. A different system&rsquo;s
          true count doesn&rsquo;t mean the same thing at these exact thresholds.
        </p>
      </section>

      <section className="theory-content">
        <h2>The most famous one: insurance</h2>
        <p>
          <Term id="insurance">Insurance</Term> is offered whenever the dealer shows an Ace.
          Basic strategy says never take it — it&rsquo;s a losing bet against a full deck. But
          insurance is really just a bet on whether the dealer&rsquo;s hole card is a ten, and once
          enough small cards have come out, tens make up more than the 1-in-3 share needed to make
          insurance profitable.
        </p>
      </section>

      <ExampleRule rule={insurance} />

      <section className="theory-content">
        <h2>Play deviations</h2>
        <p>
          The same idea applies to ordinary hit/stand/double/split decisions. A hand that&rsquo;s
          normally correct to hit or double can flip to stand (or vice versa) once the count is
          extreme enough. Three examples from this app&rsquo;s curated rule set:
        </p>
      </section>

      <div className="flex flex-col gap-3">
        {featured.map((rule) => (
          <ExampleRule key={rule.id} rule={rule} />
        ))}
      </div>

      <section className="theory-content">
        <p>
          Notice the pattern: every deviation here favors the <em>more aggressive</em> play
          (standing instead of hitting a stiff hand, doubling instead of just hitting, splitting
          instead of standing) once the count is high enough — high counts mean more tens/aces
          left, which is exactly when aggression pays off.
        </p>
        <p>
          There are more published index plays than this app implements — see the note on the{" "}
          <Link href="/drills/deviations" className="text-gold-400 hover:underline">
            Deviation Index Drill
          </Link>{" "}
          page. Practice recognizing these situations there, or turn on the correctness overlay in{" "}
          <Link href="/play" className="text-gold-400 hover:underline">
            Play Mode
          </Link>{" "}
          to get live feedback on whether a deviation applied to a real hand you just played.
        </p>
      </section>
    </TheoryChapterLayout>
  );
}
