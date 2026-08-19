# MISTAKES.md

A living log of mistakes made (or narrowly avoided) during development
of this project, so they don't get repeated in future sessions. Read
this at the start of every session. Append a new entry whenever a
mistake is caught and corrected — don't wait to be asked.

Format per entry:
```
## [date] Short title
**What happened:**
**Why it's a problem:**
**Fix / rule going forward:**
```

---

## Known risks to watch for from day one

These haven't necessarily happened yet, but are predictable failure
modes for this specific project — treat them as pre-loaded entries.

## Hardcoding a counting system
**What happens:** A feature (e.g. a drill or the true-count display)
gets built against Hi-Lo's tag values or balanced-count assumptions
directly, instead of reading from the active system's config.
**Why it's a problem:** Breaks the "one stop shop, configurable
systems" requirement — the feature silently stops working correctly
the moment a user selects KO, Omega II, etc.
**Fix / rule going forward:** All counting logic must read from the
system config object. If you're about to write a card-value switch
statement, stop and check whether it should be a config lookup.

## Silent count carryover on system switch
**What happens:** User switches counting system mid-session and the
running count isn't reset, or is reset without telling the user.
**Why it's a problem:** Produces a nonsensical count (wrong tag values
applied retroactively) and no clear signal to the user why their count
is suddenly wrong.
**Fix / rule going forward:** System switch always resets the count
and always shows a visible notice when it does.

## Duplicating shoe/deck logic
**What happens:** A new drill type gets its own quick-and-dirty card
draw function instead of using the shared shoe engine.
**Why it's a problem:** Two drills can end up with subtly different
penetration/shuffle behavior, and bugs fixed in one place don't get
fixed in the other.
**Fix / rule going forward:** One shoe engine module, imported
everywhere cards are dealt.

## Inconsistent reveal-toggle UI
**What happens:** Practice Drills and Play Mode each grow their own
version of "show count" / "show correct action" controls with
different behavior or placement.
**Why it's a problem:** Confusing UX, and doubles the maintenance
surface for what should be one component.
**Fix / rule going forward:** Shared reveal-toggle component, used by
both drills and Play Mode.

## Non-responsive layouts
**What happens:** A page looks fine at desktop width but clips content
or becomes unusable at mobile width (a real risk with a felt-table,
card-heavy visual style).
**Why it's a problem:** Explicit hard requirement from the spec —
"looks great, modern, adaptable for any window size."
**Fix / rule going forward:** Check mobile width before marking any
page/component done.

## Simulated seats bypassing the shared shoe
**What happens:** Simulated player seats get their own quick card-draw
logic (e.g. `Math.random()` picking a rank) instead of pulling from
the same shoe instance as the dealer and user.
**Why it's a problem:** Breaks count accuracy entirely — the count is
only meaningful if it reflects every card actually removed from the
one real shoe. A simulated seat with its own random source silently
desyncs the count from the "true" shoe state.
**Fix / rule going forward:** Simulated seats must draw from the same
shoe engine instance as everything else at the table, no separate
logic.

## Resetting count on seat add/remove
**What happens:** Adding or removing a simulated seat mid-session
triggers the same "reset running count" logic used for counting-system
switches.
**Why it's a problem:** These are different events. A system switch
invalidates the count because tag values change. A seat joining/
leaving doesn't touch any card already dealt — resetting the count
here throws away valid, accurate progress for no reason.
**Fix / rule going forward:** Seat changes only affect future card
consumption. Only a counting-system switch resets the count.

## Unexplained or over-explained toggles
**What happens:** A new toggle gets added with just an on/off label
and no indication of what it changes (or the opposite: a paragraph of
explanatory text crammed next to the switch).
**Why it's a problem:** Unexplained toggles force the user to
experiment or check docs to understand impact; over-explained ones
break the "sleek, uncluttered" UI requirement.
**Fix / rule going forward:** Every toggle uses the shared compact
label/tooltip pattern (short phrasing, e.g. "simplified vs realistic")
— never bare, never a wall of text.

## Duplicated glossary/tooltip text
**What happens:** A term like "true count" gets explained inline on
one page and again, slightly differently, on another instead of both
using the shared `<Term>` component.
**Why it's a problem:** Definitions drift out of sync; defeats the
point of "look it up once, everywhere."
**Fix / rule going forward:** One glossary dictionary, one `<Term>`
component, referenced everywhere a term appears.
