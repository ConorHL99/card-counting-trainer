import { TheoryChapterLayout } from "@/components/TheoryChapterLayout";
import { Term } from "@/components/Term";
import { COUNTING_SYSTEMS, RANKS } from "@/lib/counting-systems";

function formatTag(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}

export default function CountingSystemsChapter() {
  return (
    <TheoryChapterLayout slug="counting-systems">
      <section className="theory-content">
        <p>
          Every counting system assigns a <Term id="tag-value">tag value</Term> to each card rank.
          Add up the tag value of every card dealt so far and you have your{" "}
          <Term id="running-count">running count</Term> — the foundation everything else in this
          guide builds on. The table below is the actual configuration this app uses for every
          system it supports; nothing here is simplified for the guide.
        </p>
      </section>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-separate border-spacing-y-1 text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-muted">
              <th className="px-2 py-1">System</th>
              {RANKS.map((rank) => (
                <th key={rank} className="px-2 py-1 text-center">
                  {rank}
                </th>
              ))}
              <th className="px-2 py-1 text-center">
                <Term id="balanced-count">Balanced</Term>
              </th>
            </tr>
          </thead>
          <tbody>
            {COUNTING_SYSTEMS.map((system) => (
              <tr key={system.id} className="felt-panel">
                <td className="rounded-l-card px-2 py-1.5 font-medium text-ink whitespace-nowrap">
                  {system.name}
                </td>
                {RANKS.map((rank) => {
                  const value = system.tagValues[rank];
                  return (
                    <td
                      key={rank}
                      className={`px-2 py-1.5 text-center font-mono text-xs ${
                        value > 0 ? "text-success" : value < 0 ? "text-danger" : "text-ink-muted"
                      }`}
                    >
                      {formatTag(value)}
                    </td>
                  );
                })}
                <td className="rounded-r-card px-2 py-1.5 text-center text-xs text-ink-muted">
                  {system.balanced ? "Yes" : "No"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="theory-content">
        <h2>Reading the table</h2>
        <p>
          Small cards (2 through 6, sometimes 7) get a positive tag — when they&rsquo;re dealt,
          proportionally more high cards are left, which favors the player. Ten-value cards and
          aces get a negative tag, for the opposite reason. 7, 8, and 9 are usually neutral
          (0) — they don&rsquo;t swing the deck&rsquo;s composition enough to matter much either
          way, though a couple of systems (Hi-Opt II, Omega II) do assign them a small value.
        </p>
        <p>
          <Term id="balanced-count">Balanced</Term> systems (every tag value summing to zero across
          a full deck) need the <Term id="true-count">true count</Term> conversion in the next-next
          chapter to be meaningful for betting — an unbalanced system like KO is deliberately
          designed so the running count alone stays usable, at the cost of needing a starting
          count based on the number of decks in play.
        </p>
        <p>
          <Term id="playing-efficiency">Betting/insurance correlation</Term> in the system config
          measures how well a system&rsquo;s tag values track the actual removal effect of each
          card for that specific purpose — no system tops both charts. Hi-Lo is the easiest to
          learn and is what this app&rsquo;s <Term id="deviation">deviation</Term> index plays are
          calibrated to; more complex systems trade ease-of-use for a small efficiency edge.
        </p>
      </section>
    </TheoryChapterLayout>
  );
}
