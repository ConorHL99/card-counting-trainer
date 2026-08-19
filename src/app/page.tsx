import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Card Counting Trainer
      </h1>
      <p className="max-w-md text-ink-muted">
        Learn and practice card counting with a configurable engine —
        pick a system, run isolated drills, and eventually play full
        hands at the table.
      </p>
      <Link
        href="/drills"
        className="rounded-card bg-gold-500 px-6 py-3 font-medium text-felt-950 transition-colors hover:bg-gold-400"
      >
        Start Practice Drills
      </Link>
    </main>
  );
}
