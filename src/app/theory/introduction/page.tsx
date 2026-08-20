import { TheoryChapterLayout } from "@/components/TheoryChapterLayout";
import { PlayingCardView } from "@/components/PlayingCard";
import { Term } from "@/components/Term";
import type { Card } from "@/lib/shoe";

const RICH_SHOE: Card[] = [
  { rank: "A", suit: "spades" },
  { rank: "10", suit: "hearts" },
  { rank: "K", suit: "clubs" },
  { rank: "9", suit: "diamonds" },
  { rank: "A", suit: "hearts" },
  { rank: "10", suit: "spades" },
];

const POOR_SHOE: Card[] = [
  { rank: "3", suit: "spades" },
  { rank: "5", suit: "hearts" },
  { rank: "2", suit: "clubs" },
  { rank: "6", suit: "diamonds" },
  { rank: "4", suit: "hearts" },
  { rank: "7", suit: "spades" },
];

function MiniShoe({ cards, label, tone }: { cards: Card[]; label: string; tone: "good" | "bad" }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 rounded-card border border-felt-line bg-felt-900/60 p-3">
      <div className="flex flex-wrap justify-center gap-1">
        {cards.map((card, i) => (
          <div key={i} className="scale-75 sm:scale-90">
            <PlayingCardView card={card} />
          </div>
        ))}
      </div>
      <p className={`text-xs font-semibold ${tone === "good" ? "text-success" : "text-danger"}`}>
        {label}
      </p>
    </div>
  );
}

export default function IntroductionChapter() {
  return (
    <TheoryChapterLayout slug="introduction">
      <section className="theory-content">
        <p>
          Blackjack is one of the only casino games where the odds genuinely shift back and forth
          between the house and the player as a shoe is dealt — not because of luck changing, but
          because cards that have already been dealt can&rsquo;t be dealt again. <strong>Card
          counting</strong> is simply the practice of tracking which cards have come out, so you
          know whether the cards still left in the shoe favor you or the dealer.
        </p>
        <p>
          A shoe rich in <strong>tens and aces</strong> favors the player: you&rsquo;re more likely
          to be dealt a blackjack (which pays 3:2), more likely to win a double-down, and the
          dealer is more likely to bust drawing to a stiff hand. A shoe rich in <strong>small
          cards</strong> favors the dealer, for the opposite reasons.
        </p>
      </section>

      <section className="theory-content">
        <h2>Two shoes, same number of cards</h2>
        <p>
          These two six-card stretches contain exactly the same number of cards — but very
          different odds for the hand you&rsquo;re about to be dealt from what&rsquo;s left.
        </p>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <MiniShoe cards={RICH_SHOE} label="Ten/Ace-heavy — favors the player" tone="good" />
        <MiniShoe cards={POOR_SHOE} label="Small-card-heavy — favors the dealer" tone="bad" />
      </div>

      <section className="theory-content">
        <h2>What a counting system actually does</h2>
        <p>
          You can&rsquo;t realistically remember every card that&rsquo;s been dealt. A counting
          system solves this by assigning each rank a small <Term id="tag-value">tag value</Term>{" "}
          — usually +1, 0, or −1 — and having you keep a running sum (the{" "}
          <Term id="running-count">running count</Term>) as cards appear. A positive count means
          more small cards have been dealt than big ones, so the cards left are relatively
          ten/ace-rich — good for you. The next chapter compares the specific tag values used by
          every system this app supports.
        </p>
        <p>
          Counting doesn&rsquo;t change any single hand&rsquo;s odds — you still lose plenty of
          hands even at a high count. What it changes is your <Term id="ev">expected value</Term>{" "}
          over many hands: by betting more when the count favors you and less (or nothing) when it
          doesn&rsquo;t, your average result over a long session shifts from slightly negative to
          slightly positive. It&rsquo;s a long-run edge, not a way to win every hand.
        </p>
      </section>

      <section className="theory-content">
        <h2>What&rsquo;s ahead</h2>
        <p>
          The rest of this guide builds up the full toolkit in order: the tag values behind each
          counting system, how to keep a running count, how to convert it to a{" "}
          <Term id="true-count">true count</Term> that&rsquo;s comparable at any point in the shoe,
          how to size bets off that number, the basic strategy chart every hand starts from, and
          finally the specific situations (deviations) where a high or low count changes the
          textbook-correct play. Each chapter links to the drill or Play Mode feature that lets you
          practice it immediately.
        </p>
      </section>
    </TheoryChapterLayout>
  );
}
