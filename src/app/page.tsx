import Link from "next/link";
import { auth } from "@/auth";
import { getUserSettings } from "@/lib/db/settings";
import { getDashboardSummary, getLastSession } from "@/lib/db/stats";
import { getCountingSystem } from "@/lib/counting-systems";
import { getDrillRegistryEntry } from "@/lib/drills/registry";
import { DashboardPicker } from "@/components/DashboardPicker";

function systemName(id: string): string {
  try {
    return getCountingSystem(id).name;
  } catch {
    return id;
  }
}

function timeAgo(d: Date): string {
  const minutes = Math.round((Date.now() - d.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default async function Home() {
  const session = await auth();
  const userId = session?.user?.id;

  const [settings, summary, lastSession] = userId
    ? await Promise.all([getUserSettings(userId), getDashboardSummary(userId), getLastSession(userId)])
    : [null, null, null];

  const lastSessionEntry = lastSession ? getDrillRegistryEntry(lastSession.drillType) : undefined;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Card Counting Trainer
        </h1>
        <p className="mx-auto mt-2 max-w-md text-ink-muted">
          Pick a system, run a drill, or pick up where you left off.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardPicker initialSystemId={settings?.defaultSystemId ?? "hi-lo"} />

        <div className="flex flex-col gap-6">
          {lastSessionEntry && lastSession && (
            <section className="felt-panel p-4">
              <h2 className="text-sm font-semibold text-ink">Resume</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Last time: <span className="text-ink">{lastSessionEntry.title}</span> ·{" "}
                {systemName(lastSession.systemId)}
                {lastSession.accuracyPercent !== null && (
                  <> · <span className="text-gold-400">{lastSession.accuracyPercent.toFixed(1)}%</span></>
                )}
                {lastSession.endedAt && <> · {timeAgo(lastSession.endedAt)}</>}
              </p>
              <Link
                href={`${lastSessionEntry.href}?system=${lastSession.systemId}`}
                className="mt-3 inline-block rounded-card bg-gold-500 px-4 py-2 text-sm font-medium text-felt-950 hover:bg-gold-400"
              >
                Resume {lastSessionEntry.title}
              </Link>
            </section>
          )}

          <section className="felt-panel p-4">
            <h2 className="text-sm font-semibold text-ink">Quick stats</h2>
            {!userId ? (
              <p className="mt-2 text-sm text-ink-muted">
                Sign in from the nav to track accuracy, streaks, and session history.
              </p>
            ) : summary && summary.totalSessions > 0 ? (
              <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
                <div>
                  <dt className="text-xs text-ink-muted">Sessions</dt>
                  <dd className="text-xl font-semibold text-ink">{summary.totalSessions}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Avg accuracy</dt>
                  <dd className="text-xl font-semibold text-gold-400">
                    {summary.avgAccuracyPercent !== null
                      ? `${summary.avgAccuracyPercent.toFixed(1)}%`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Best streak</dt>
                  <dd className="text-xl font-semibold text-ink">{summary.longestStreak ?? "—"}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">
                No sessions yet — practice a drill and your stats will show up here.
              </p>
            )}
            {userId && (
              <Link href="/stats" className="mt-3 inline-block text-xs text-gold-400 hover:underline">
                Full stats & history →
              </Link>
            )}
          </section>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-ink-muted">
        Or browse every drill: <Link href="/drills" className="text-gold-400 hover:underline">Practice Drills</Link>
      </p>
    </main>
  );
}
