"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { GLOSSARY, type GlossaryKey } from "@/lib/glossary";

interface TermProps {
  id: GlossaryKey;
  children?: React.ReactNode;
}

const POPOVER_WIDTH = 224; // matches the former w-56 Tailwind class
const VIEWPORT_MARGIN = 8;

/**
 * Shared glossary tooltip (CLAUDE.md rule #6). Wraps a term with a
 * tap/click-to-reveal popover pulling its formula + definition from
 * the one glossary dictionary — never inline an ad-hoc explanation of
 * a term elsewhere.
 */
export function Term({ id, children }: TermProps) {
  const entry = GLOSSARY[id];
  const [open, setOpen] = useState(false);
  // Measured in viewport coordinates and rendered with `position:
  // fixed` rather than `absolute` — a Term near the edge of any
  // scrollable/overflow-clipped ancestor (e.g. a table wrapped in
  // overflow-x-auto, like the Theory Counting Systems chapter) would
  // otherwise get its popover silently clipped by that ancestor. See
  // MISTAKES.md.
  const [popoverPos, setPopoverPos] = useState<{ left: number; top: number } | null>(null);
  const containerRef = useRef<HTMLSpanElement>(null);
  const popoverId = useId();

  useLayoutEffect(() => {
    if (!open || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const idealLeft = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
    const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - POPOVER_WIDTH - VIEWPORT_MARGIN);
    const left = Math.min(Math.max(idealLeft, VIEWPORT_MARGIN), maxLeft);
    setPopoverPos({ left, top: rect.bottom + 8 });
  }, [open]);

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
    // Closes rather than re-tracks on scroll — simpler than
    // continuously repositioning a `position: fixed` popover, and
    // matches how most tooltip UIs behave. `capture: true` so this
    // also fires for scrolling inside a nested container (e.g. the
    // Counting Systems table), not just the page itself.
    function handleScrollOrResize() {
      setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
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
      {open && popoverPos && (
        <span
          id={popoverId}
          role="tooltip"
          style={{ left: popoverPos.left, top: popoverPos.top, width: POPOVER_WIDTH }}
          // Deliberately not `.felt-panel` here: that shared class's
          // translucent background is un-layered CSS, which always
          // wins the cascade over a layered Tailwind bg-* utility
          // regardless of source order — it was silently defeating
          // `bg-felt-900` and leaving this popover too see-through to
          // read reliably over arbitrary page content. See MISTAKES.md.
          className="fixed z-20 rounded-card border border-felt-line bg-felt-900 p-3 text-left text-sm shadow-lg"
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
