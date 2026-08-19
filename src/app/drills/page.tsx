import Link from "next/link";

interface DrillEntry {
  href: string;
  title: string;
  description: string;
  available: boolean;
}

const DRILLS: DrillEntry[] = [
  {
    href: "/drills/running-count",
    title: "Running Count",
    description: "Cards are dealt one at a time — track the running count as you go.",
    available: true,
  },
  {
    href: "/drills/true-count",
    title: "True Count Conversion",
    description: "Given a running count and decks remaining, convert to true count.",
    available: true,
  },
  {
    href: "/drills/speed",
    title: "Speed Drill",
    description: "Timed, fixed pace you control.",
    available: true,
  },
  {
    href: "/drills/deviations",
    title: "Deviation Index",
    description: "Illustrious 18 / Fab 4 calls (Hi-Lo only).",
    available: false,
  },
  {
    href: "/drills/bet-sizing",
    title: "Bet Sizing",
    description: "Given a true count, choose the right bet size.",
    available: true,
  },
];

export default function DrillsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-ink">Practice Drills</h1>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DRILLS.map((drill) => (
          <li key={drill.href}>
            {drill.available ? (
              <Link
                href={drill.href}
                className="felt-panel block h-full p-4 transition-colors hover:border-gold-500/60"
              >
                <h2 className="font-medium text-ink">{drill.title}</h2>
                <p className="mt-1 text-sm text-ink-muted">{drill.description}</p>
              </Link>
            ) : (
              <div className="felt-panel block h-full p-4 opacity-50">
                <h2 className="font-medium text-ink">
                  {drill.title} <span className="text-xs text-ink-muted">(coming soon)</span>
                </h2>
                <p className="mt-1 text-sm text-ink-muted">{drill.description}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
