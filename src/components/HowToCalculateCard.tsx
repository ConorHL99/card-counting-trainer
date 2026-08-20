"use client";

import { useState, type ReactNode } from "react";

interface HowToCalculateCardProps {
  label?: string;
  children: ReactNode;
}

/**
 * A collapsible worked-example/help block — for explaining HOW to do
 * a calculation (the mental-math technique), as distinct from
 * `<Term>` (a short glossary lookup) or a reveal toggle (the drill's
 * answer). Collapsed by default so it doesn't clutter the page;
 * reused by the Theory pages for the same kind of "show your work"
 * explanation.
 */
export function HowToCalculateCard({ label = "How do I calculate this?", children }: HowToCalculateCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-card border border-felt-line">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-medium text-gold-400"
      >
        {label}
        <span className="text-ink-muted">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="border-t border-felt-line px-4 py-3 text-sm text-ink-muted [&_strong]:text-ink [&_p+p]:mt-2">
          {children}
        </div>
      )}
    </div>
  );
}
