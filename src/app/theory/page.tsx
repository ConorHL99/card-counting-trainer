import Link from "next/link";
import { THEORY_CHAPTERS } from "@/lib/theory/chapters";

export default function TheoryIndexPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Theory</h1>
      <p className="mt-1 text-sm text-ink-muted">
        A short, chaptered guide covering everything the drills and Play Mode assume you already
        know — read in order, or jump to whatever you need.
      </p>

      <ol className="mt-8 flex flex-col gap-3">
        {THEORY_CHAPTERS.map((chapter, i) => (
          <li key={chapter.slug}>
            <Link
              href={`/theory/${chapter.slug}`}
              className="felt-panel flex items-start gap-4 p-4 transition-colors hover:border-gold-500/60"
            >
              <span className="mt-0.5 text-lg font-semibold text-gold-500/70">{i + 1}</span>
              <span>
                <span className="block font-medium text-ink">{chapter.title}</span>
                <span className="mt-0.5 block text-sm text-ink-muted">{chapter.description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
