"use client";

import { useEffect, useId, useRef, useState } from "react";
import { GLOSSARY, type GlossaryKey } from "@/lib/glossary";

interface TermProps {
  id: GlossaryKey;
  children?: React.ReactNode;
}

/**
 * Shared glossary tooltip (CLAUDE.md rule #6). Wraps a term with a
 * tap/click-to-reveal popover pulling its formula + definition from
 * the one glossary dictionary — never inline an ad-hoc explanation of
 * a term elsewhere.
 */
export function Term({ id, children }: TermProps) {
  const entry = GLOSSARY[id];
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!entry) return <>{children}</>;

  return (
    <span ref={containerRef} className="relative inline-block">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen((v) => !v)}
        className="cursor-help underline decoration-dotted decoration-ink-muted underline-offset-2"
      >
        {children ?? entry.term}
      </button>
      {open && (
        <span
          id={popoverId}
          role="tooltip"
          className="felt-panel absolute left-1/2 top-full z-20 mt-2 w-56 -translate-x-1/2 bg-felt-900 p-3 text-left text-sm shadow-lg"
        >
          <span className="block font-medium text-gold-400">{entry.term}</span>
          {entry.formula && (
            <span className="mt-1 block font-mono text-xs text-ink-muted">{entry.formula}</span>
          )}
          <span className="mt-1 block text-ink-muted">{entry.definition}</span>
        </span>
      )}
    </span>
  );
}
