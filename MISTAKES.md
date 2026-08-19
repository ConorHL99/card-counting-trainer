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

## [2026-08-19] Scaffolding overwrote CLAUDE.md and .gitignore
**What happened:** `create-next-app` can't target a directory with capital
letters in its name (npm naming rules), so it was scaffolded into a temp
dir and moved in with `Move-Item -Force`. That force-overwrote the
existing `CLAUDE.md` (replaced with a generated `@AGENTS.md` stub) and
the hand-written `.gitignore` (replaced with Next's default) since both
trees had files of the same name.
**Why it's a problem:** Could have silently destroyed the project's
governing instructions file with no warning — only caught because git
had it committed and `git diff`/`git checkout --` could recover it.
**Fix / rule going forward:** When merging a scaffold tool's output into
an existing directory, never blind-force-move/copy. Diff or list
filename collisions first, and hand-merge any file that already exists
in both trees (`CLAUDE.md`, `.gitignore`, `README.md`, etc.) instead of
letting one side clobber the other.

## [2026-08-19] Ace-split hand dealt a card twice in the shoe engine
**What happened:** In `playSimulatedSeatHand` (src/lib/shoe/seats.ts),
splitting a pair of aces dealt the queued "first" hand its post-split
card at push time (`[a, shoe.draw()]`) *and* dealt it another card
again when later dequeued via the `fromSplitAces` branch — three cards
on a hand that should only ever get two. Caught by a runtime smoke
test asserting split-ace hands have exactly 2 cards, not by type
checking or lint (both passed with the bug present).
**Why it's a problem:** An extra undealt-in-reality card silently
desyncs the shoe from what a real table would have dealt — exactly the
kind of count-accuracy bug rule #2/#9 exist to prevent, just introduced
inside the shared engine itself rather than by a caller bypassing it.
**Fix / rule going forward:** When a state machine hands off
in-progress state between two code paths (queued vs. immediately
continued), only one path may own a given side effect (here: dealing
the card). After any non-trivial change to shoe/seat logic, run a
runtime smoke test that asserts card-count invariants (cards consumed
from shoe == cards appearing in results) — type checking alone won't
catch this class of bug.

## [2026-08-19] Design call: felt theme is fixed dark, no light/dark toggle
**What happened:** SPEC.md §7 says "casino felt design tokens apply
app-wide" but doesn't say whether the app should also support a
light-mode variant (the scaffold's default `globals.css` had a
`prefers-color-scheme: dark` media query for the stock Next.js theme).
Decided to make the felt palette a single fixed dark theme with no
light-mode branch at all, rather than defining a light felt variant.
**Why it's a problem (assumption, not a caught mistake):** This isn't
corrected-after-the-fact; it's a genuine spec ambiguity where I made a
call rather than stopping to ask, per this session's standing
instruction to note reasoning and continue.
**Reasoning:** A casino table doesn't have a "light mode" — the felt
green/gold aesthetic is the whole visual identity (SPEC §7), and a
light-background variant would work against "Theory and Drill pages
should feel part of the same product" rather than support it. If this
assumption is wrong, the fix is additive (add a light palette under
the same design-token names in `src/app/globals.css`) — nothing built
on top of the tokens should need to change.

## [2026-08-19] Design call: no full dealer-hand simulation in the Running Count Drill
**What happened:** SPEC.md §5.3 lists "simulated seat count (shoe mode
only)" as configurable for the Running Count Drill, and §4.1 says
simulated seats consume cards from the shared shoe — but neither spells
out whether a *drill* (as opposed to Play Mode) needs a full simulated
dealer hand (hole card kept secret until seats finish, dealer hits to
17, etc.) for seats to play correctly-informed basic strategy against.
Built a "reference card" instead: one card is drawn and shown to
represent what the seats play against, seats play out their hands
against it via the existing `playSimulatedSeatHand`, and no dealer
hole-card / hit-to-17 logic exists yet.
**Why it's a problem (assumption, not a caught mistake):** A real
dealer hand's hole card and hit-to-17 draws are still real cards a
counter would see and count — skipping them means shoe-mode drill
rounds under-consume cards relative to a real table, which is a
smaller-scope version of the exact "unrealistic card consumption"
failure mode CLAUDE.md rule #2 exists to prevent.
**Reasoning:** A running-count drill's job (per its own description,
"cards shown, track the count") is to test counting, not to model a
full playable blackjack round — that's explicitly Play Mode's job
(§5.4). Building real dealer AI (hole card secrecy, hit/stand-soft-17)
belongs with Play Mode, where it's actually needed for win/loss
resolution; building it now for a drill would be speculative scope
growth. If this call is wrong, add a `playDealerHand` function to
`src/lib/shoe` (mirroring `playSimulatedSeatHand`) and have the drill
call it instead of drawing a bare reference card — Play Mode will need
that function regardless.

## [2026-08-19] Unlayered `.felt-panel` CSS silently beat Tailwind bg-* utilities
**What happened:** `.felt-panel` in `src/app/globals.css` is a plain
CSS rule written after `@import "tailwindcss"`, so it isn't inside any
of Tailwind's cascade layers (`theme`/`base`/`components`/`utilities`).
Per the CSS Cascade Layers spec, unlayered rules always beat layered
rules regardless of specificity or source order — so `.felt-panel`'s
translucent `background: #ffffff0b` always won over a `bg-felt-900`
utility class placed alongside it, no matter which class came first in
the string. `<Term>`'s tooltip used `"felt-panel ... bg-felt-900 ..."`
expecting a solid background and silently got the translucent one
instead, making it too see-through to reliably read. Confirmed by
inspecting the actual compiled dev-server stylesheet (`.bg-felt-900`
inside `@layer utilities`, `.felt-panel` after the layer closes).
**Why it's a problem:** The same `felt-panel` + `bg-felt-900` pairing
also appeared in `CountingSystemSelect`, `ConfirmDialog`, and the
`<select>`/`<input>` elements inline in both drill pages — all had the
identical latent bug. Fixed in a same-day follow-up across every
occurrence, verified against each page's rendered HTML output.
**Fix / rule going forward:** Never combine `.felt-panel` with a `bg-*`
utility expecting the utility to win — it won't. Either drop
`felt-panel` and write the border/radius/background explicitly (what
`<Term>` now does), or give `.felt-panel` itself a layered/overridable
background. Before styling a new element, check whether it already
uses `felt-panel` + `bg-*` together — that combination is a bug
magnet.

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
