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

## [2026-08-19] Design call: bet-sizing ramp lives outside CountingSystemConfig
**What happened:** SPEC.md §5.3 lists a "Bet-sizing drill (given a
true count, choose bet size)" but never defines the actual true-count
→ bet-size mapping. Built one as its own module
(`src/lib/betting/bet-ramp.ts`, a simple ramp keyed only on true
count) rather than adding a `betRamp` field to `CountingSystemConfig`.
**Reasoning:** A given true count means the same thing for betting
purposes regardless of which counting system produced it — betting
strategy is a function of true count, not of tag values or
balanced-ness. Putting it on `CountingSystemConfig` would conflate two
unrelated concerns and violate the config schema SPEC.md §3 actually
defines (id/name/difficulty/tagValues/balanced/correlations/
supportsDeviations — no betting field). Used the "1-2-4-6-8" spread
commonly cited in card-counting literature (e.g. Schlesinger's
"Blackjack Attack") as a defensible default rather than inventing
arbitrary numbers.
**If this call is wrong:** the ramp is fully isolated in one file with
one exported function (`getBetUnits`) — swapping the numbers, or
making the ramp itself user-configurable, touches only
`src/lib/betting/bet-ramp.ts` and nothing else.

## [2026-08-20] DealingTable gated on seat count instead of deal mode
**What happened:** Running Count Drill and Speed Drill rendered
`<DealingTable>` only when `seats.length > 0`, falling back to the old
simple single-card view otherwise — including for a solo shoe-mode
hand (real depleting shoe, zero simulated seats). SPEC.md §7.2's
flashcard exemption was about deal *mode*, not seat count, but the
implementation used seat count as a proxy for "is there a real hand,"
which is wrong: a solo shoe-mode round is still a real hand.
**Why it's a problem:** Violated the rule the component exists to
enforce (CLAUDE.md rule #11) — the shared table silently didn't cover
every shoe-mode case it was supposed to, and nothing caught it because
the bug was about *which condition to render on*, not a crash or
type error tsc/lint would flag. Caught by the user testing in a real
browser, not by any check this session ran.
**Fix / rule going forward:** Gate shared-component usage on the
actual semantic condition named in the spec (`dealMode === "shoe"`),
never on a proxy value that merely correlates with it (`seats.length`)
— proxies break the moment the zero case is legitimate. Updated
SPEC.md §7.2 to say this explicitly so it can't be misread the same
way again.

## [2026-08-20] Invisible felt texture: opaque top layer covered the noise
**What happened:** `DealingTable`'s felt background used a two-layer
`background-image: radial-gradient(...), url(noiseSvg)`. In a
multi-layer `background-image`, the FIRST-listed layer paints on top.
The gradient was listed first and is fully opaque (solid colors, no
alpha), so it completely covered the noise layer underneath it —
regardless of the noise's own opacity or frequency. The texture was
never visible, on any browser, at any zoom level; there was nothing
subtle to tune.
**Why it's a problem:** Looked like a "make it more visible" tuning
problem (opacity/frequency), which is what it was first mistaken for,
but no amount of tuning those values would have fixed a layer that's
fully hidden behind an opaque layer on top of it. Caught by re-deriving
the CSS layering rule from first principles while addressing the
user's screenshot-confirmed report, not by visual inspection (no
browser tool available this session).
**Fix / rule going forward:** In a multi-layer background-image, the
translucent/detail layer must be listed BEFORE (on top of) the opaque
base layer, not after. When a layered visual effect seems completely
absent rather than merely subtle, check layer *order*, not just each
layer's own opacity — an opaque layer above will hide anything below
it completely, and no per-layer tuning will surface it.

## [2026-08-20] Flip looked broken: no exit animation made a new round look like one card mutating
**What happened:** Per-card entry had a flip-in animation but
deliberately no exit animation (to keep Speed Drill snappy) — old
cards were removed from the DOM the instant a new round replaced them.
Since the new card for the same hand position mounts in the exact same
screen slot, the transition read as: old face → (instantly) card back
→ flip to a *different* face — looking like a single card's identity
was glitching mid-flip, when it was actually two separate cards (old
one vanishing, new one's own flip beginning) with no visible
separation between the two events.
**Why it's a problem:** The animation was individually correct (each
card's own back→front flip was right), but the *sequence of two
cards sharing a position* had no visual seam, so it read as a bug in
the flip itself rather than what it was — a missing transition between
rounds.
**Fix / rule going forward:** Reintroduced a short (~120ms) fade+scale
exit for outgoing cards via `AnimatePresence`, giving a clear "old hand
leaves, then new hand arrives" moment. When two independently-correct
animations share a screen position with no gap between them, the
combination can still look wrong — evaluate transitions between states,
not just each state's own animation in isolation.

## [2026-08-20] Card slide used a guessed offset instead of the deck's real position
**What happened:** Cards entered with a fixed `{x: -36, y: -20}`
offset meant to approximate "coming from the deck." Since the deck
sits in a fixed corner while cards land at varying distances (dealer
close by, seats further out), the same small constant offset was
right for nothing in particular — it read as "drifting from the top
of the box," not "sliding from the shoe," exactly as the user
reported.
**Why it's a problem:** A fixed directional approximation was chosen
deliberately during planning to avoid live DOM measurement (flagged as
a trade-off at the time), but the resulting motion didn't actually
read as "from the deck" the way the spec asked for — the simplification
traded away the one thing that made the effect legible.
**Fix / rule going forward:** Switched to real measurement: the deck
stack's DOM node is shared via React context, and each dealt card
measures its own position relative to the deck's actual position in a
`useLayoutEffect` (before paint, so there's no flash of the wrong
start point), then animates imperatively via Framer Motion's
`useAnimate` from that measured delta to zero. When a "simplified,
no-measurement" approximation is chosen for robustness, check that it
still achieves the actual visual goal before committing to it — here
it didn't, for any hand more than a few pixels from the deck.

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

## Duplicating table rendering per page
**What happens:** A shoe-mode drill or Play Mode grows its own
one-off way of laying out hands/cards on screen — a flat list or grid
of cards, cards appearing instantly instead of dealt, a different seat
layout per page — instead of using one shared table/dealing-animation
component.
**Why it's a problem:** Every page ends up with subtly different
table layout, animation, and responsive behavior; a fix or improvement
made on one page (e.g. handling a seat being removed mid-deal without
breaking layout) doesn't carry over to the others, and the app stops
feeling like one consistent "table" product across drills and Play
Mode.
**Fix / rule going forward:** One shared table/dealing-animation
component (see `SPEC.md` §7.2, `CLAUDE.md` rule #11), used by every
shoe-mode drill and Play Mode. Flashcard-mode drills are the one
exception — they keep their simpler single-card view since they have
no hand/table structure to lay out.

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
