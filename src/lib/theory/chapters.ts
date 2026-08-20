/**
 * The Theory guide's chapter list (SPEC.md §5.2) — one place both the
 * index page and each chapter's prev/next navigation read from, so
 * adding a chapter never means updating nav links in multiple files.
 */
export interface TheoryChapter {
  slug: string;
  title: string;
  description: string;
}

export const THEORY_CHAPTERS: readonly TheoryChapter[] = [
  {
    slug: "introduction",
    title: "Introduction",
    description: "What card counting actually is, and why it works.",
  },
  {
    slug: "counting-systems",
    title: "Counting Systems",
    description: "Tag values compared across every system this app supports.",
  },
  {
    slug: "running-count",
    title: "Running Count",
    description: "Tracking the count, one card at a time.",
  },
  {
    slug: "true-count",
    title: "True Count Conversion",
    description: "Normalizing the running count per deck remaining.",
  },
  {
    slug: "betting",
    title: "Betting Spread",
    description: "Sizing your bet to how favorable the count is.",
  },
  {
    slug: "basic-strategy",
    title: "Basic Strategy",
    description: "The mathematically optimal play for every hand.",
  },
  {
    slug: "deviations",
    title: "Deviations",
    description: "When a high or low count changes the correct play.",
  },
];

export function getChapter(slug: string): TheoryChapter | undefined {
  return THEORY_CHAPTERS.find((c) => c.slug === slug);
}

export function getAdjacentChapters(slug: string): {
  prev: TheoryChapter | undefined;
  next: TheoryChapter | undefined;
} {
  const index = THEORY_CHAPTERS.findIndex((c) => c.slug === slug);
  return {
    prev: index > 0 ? THEORY_CHAPTERS[index - 1] : undefined,
    next: index >= 0 && index < THEORY_CHAPTERS.length - 1 ? THEORY_CHAPTERS[index + 1] : undefined,
  };
}
