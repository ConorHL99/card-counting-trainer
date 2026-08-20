import Link from "next/link";
import { auth } from "@/auth";
import { getStatsBySystem, getSessionHistory } from "@/lib/db/stats";
import { getCountingSystem } from "@/lib/counting-systems";
import { getDrillTitle } from "@/lib/drills/registry";

function pct(n: number | null): string {
  return n === null ? "—" : `${n.toFixed(1)}%`;
}

function ms(n: number | null): string {
  return n === null ? "—" : `${Math.round(n)}ms`;
}

function systemName(id: string): string {
  try {
    return getCountingSystem(id).name;
  } catch {
    return id;
  }
}

function formatDuration(startedAt: Date, endedAt: Date | null): string {
  if (!endedAt) return "—";
  const totalSeconds = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function formatDate(d: Date): string {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function StatsPage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Stats / History</h1>
        <section className="felt-panel mt-6 p-4 text-center">
          <p className="text-sm text-ink-muted">
            Stats are tied to your account — sign in from the nav to see your accuracy, speed,
            and session history.
          </p>
          <Link
            href="/drills"
            className="mt-4 inline-block rounded-card bg-felt-700 px-4 py-2 text-sm font-medium text-ink hover:bg-felt-800"
          >
            Practice without signing in
          </Link>
        </section>
      </main>
    );
  }

  const [bySystem, history] = await Promise.all([
    getStatsBySystem(session.user.id),
    getSessionHistory(session.user.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Stats / History</h1>
      <p className="mt-1 text-sm text-ink-muted">Per counting system, from your drill sessions.</p>

      <section className="mt-6">
        {bySystem.length === 0 ? (
          <div className="felt-panel p-4 text-center text-sm text-ink-muted">
            No drill sessions yet — practice a drill while signed in and your stats will show up
            here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted">
                  <th className="px-3">System</th>
                  <th className="px-3">Sessions</th>
                  <th className="px-3">Accuracy</th>
                  <th className="px-3">Avg speed</th>
                  <th className="px-3">Deviation accuracy</th>
                  <th className="px-3">Longest streak</th>
                </tr>
              </thead>
              <tbody>
                {bySystem.map((row) => (
                  <tr key={row.systemId} className="felt-panel">
                    <td className="rounded-l-card px-3 py-2 font-medium text-ink">
                      {systemName(row.systemId)}
                    </td>
                    <td className="px-3 py-2 text-ink">{row.sessionCount}</td>
                    <td className="px-3 py-2 text-gold-400">{pct(row.avgAccuracyPercent)}</td>
                    <td className="px-3 py-2 text-ink">{ms(row.avgMsPerCard)}</td>
                    <td className="px-3 py-2 text-ink">{pct(row.avgDeviationAccuracyPercent)}</td>
                    <td className="rounded-r-card px-3 py-2 text-ink">
                      {row.longestStreak ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-ink-muted">
          Betting correlation and bankroll trend (SPEC.md §6) come from Play Mode, which isn&rsquo;t
          built yet — not shown here.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-ink">Session history</h2>
        {history.length === 0 ? (
          <div className="felt-panel p-4 text-center text-sm text-ink-muted">
            Nothing logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted">
                  <th className="px-3">Date</th>
                  <th className="px-3">Drill</th>
                  <th className="px-3">System</th>
                  <th className="px-3">Mode</th>
                  <th className="px-3">Duration</th>
                  <th className="px-3">Score</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id} className="felt-panel">
                    <td className="rounded-l-card px-3 py-2 whitespace-nowrap text-ink-muted">
                      {formatDate(entry.startedAt)}
                    </td>
                    <td className="px-3 py-2 text-ink">{getDrillTitle(entry.drillType)}</td>
                    <td className="px-3 py-2 text-ink">{systemName(entry.systemId)}</td>
                    <td className="px-3 py-2 text-ink-muted">
                      {entry.mode === "shoe" ? "Shoe" : entry.mode === "single-card" ? "Flashcard" : "—"}
                    </td>
                    <td className="px-3 py-2 text-ink-muted">
                      {formatDuration(entry.startedAt, entry.endedAt)}
                    </td>
                    <td className="rounded-r-card px-3 py-2 text-gold-400">
                      {pct(entry.accuracyPercent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
