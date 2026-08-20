export interface GlossaryEntry {
  term: string;
  formula?: string;
  definition: string;
}

/**
 * Single source of truth for every term explained by the shared
 * `<Term>` component (CLAUDE.md rule #6). Add a term here once —
 * never inline an ad-hoc explanation of it on a page.
 */
export const GLOSSARY: Record<string, GlossaryEntry> = {
  "running-count": {
    term: "Running Count",
    definition:
      "The sum of tag values for every card dealt so far under the active counting system.",
  },
  "true-count": {
    term: "True Count",
    formula: "Running Count ÷ Decks Remaining",
    definition:
      "The running count normalized per deck remaining in the shoe — makes the count comparable across different points in a shoe.",
  },
  "decks-remaining": {
    term: "Decks Remaining",
    formula: "Cards Remaining ÷ 52",
    definition: "How many decks' worth of cards are left to be dealt before the next shuffle.",
  },
  penetration: {
    term: "Penetration",
    definition:
      "The fraction of the shoe dealt before the cut card is reached and a reshuffle is due. Deeper penetration means more of the shoe is played, giving more time for the count to matter.",
  },
  "tag-value": {
    term: "Tag Value",
    definition:
      "The count contribution assigned to a card rank by a given counting system — e.g. Hi-Lo tags 2-6 as +1.",
  },
  "balanced-count": {
    term: "Balanced Count",
    definition:
      "A system whose tag values sum to zero across a full deck. Balanced counts require true-count conversion to be betting-relevant; unbalanced counts (e.g. KO) don't.",
  },
  deviation: {
    term: "Deviation (Index Play)",
    definition:
      "A play that departs from basic strategy because the true count has crossed a threshold — e.g. standing on 16 vs 10 once the count is high enough that the deck favors it.",
  },
  insurance: {
    term: "Insurance",
    definition:
      "A side bet (up to half your original bet) offered when the dealer shows an Ace, paying 2:1 if the dealer has blackjack. A losing bet on average unless the true count is high enough that a disproportionate number of ten-value cards remain.",
  },
  surrender: {
    term: "(Late) Surrender",
    definition:
      "Forfeiting a hand for half your bet back, before taking any other action — only available as your very first decision on your original two cards, never after a split.",
  },
  "betting-correlation": {
    term: "Betting Correlation",
    definition:
      "How closely your actual bet sizes tracked the true count over a session — a high correlation means you consistently bet more when the count favored you, which is the whole point of counting for betting purposes.",
  },
};

export type GlossaryKey = keyof typeof GLOSSARY;
