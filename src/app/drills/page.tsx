import Link from "next/link";
import { DRILL_REGISTRY } from "@/lib/drills/registry";

export default function DrillsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-ink">Practice Drills</h1>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DRILL_REGISTRY.map((drill) => (
          <li key={drill.href}>
            <Link
              href={drill.href}
              className="felt-panel block h-full p-4 transition-colors hover:border-gold-500/60"
            >
              <h2 className="font-medium text-ink">{drill.title}</h2>
              <p className="mt-1 text-sm text-ink-muted">{drill.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
