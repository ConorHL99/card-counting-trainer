import Link from "next/link";
import type { ReactNode } from "react";
import { THEORY_CHAPTERS, getAdjacentChapters } from "@/lib/theory/chapters";

interface TheoryChapterLayoutProps {
  slug: string;
  children: ReactNode;
}

/**
 * Wraps every Theory chapter page (SPEC.md §5.2) — chapter number/
 * title/description header, prev/next navigation, and a link back to
 * the index, so each chapter file only needs to contain its own
 * content, not repeat the surrounding chrome.
 */
export function TheoryChapterLayout({ slug, children }: TheoryChapterLayoutProps) {
  const index = THEORY_CHAPTERS.findIndex((c) => c.slug === slug);
  const chapter = THEORY_CHAPTERS[index];
  const { prev, next } = getAdjacentChapters(slug);

  if (!chapter) return null;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <Link href="/theory" className="text-xs text-gold-400 hover:underline">
        ← Theory
      </Link>
      <p className="mt-3 text-xs font-medium tracking-wide text-ink-muted uppercase">
        Chapter {index + 1} of {THEORY_CHAPTERS.length}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        {chapter.title}
      </h1>
      <p className="mt-1 text-sm text-ink-muted">{chapter.description}</p>

      <article className="theory-content mt-8 flex flex-col gap-6">{children}</article>

      <nav className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-felt-line pt-6">
        {prev ? (
          <Link
            href={`/theory/${prev.slug}`}
            className="rounded-card border border-felt-line bg-felt-900 px-3 py-2 text-sm text-ink transition-colors hover:border-gold-500/60"
          >
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/theory/${next.slug}`}
            className="rounded-card border border-felt-line bg-felt-900 px-3 py-2 text-sm text-ink transition-colors hover:border-gold-500/60"
          >
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
