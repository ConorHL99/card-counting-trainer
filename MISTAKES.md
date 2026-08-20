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
**Follow-up:** The exit fix wasn't sufficient on its own — user still
saw the same symptom after it shipped. The remaining cause: the slide
and the flip were two concurrent `animate()` calls, with the flip
merely `delay`-started 120ms into the slide's 220ms, so for a ~100ms
window the card was still *moving* while also *rotating* — visually
indistinguishable from "a face flashing to back to a different face"
during the old/new crossfade. `delay` staggers a start time; it
doesn't guarantee the first animation has finished. Fixed by making it
genuinely sequential: `await` the slide's `animate()` call before
starting the flip's, so the flip only ever begins once the card is
stationary. Lesson: when a user reports the *same* symptom after a fix
that addressed a plausible-but-different cause, don't assume the fix
was wrong — check whether it was incomplete instead.

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

## [2026-08-20] Flip ran twice under React Strict Mode — cleanup set a flag but never stopped the animation
**What happened:** After the previous flip fix, the user reported the
card still visibly flipped twice — but this time with no identity
glitch (always the correct card). Root cause: React Strict Mode (on by
default in Next.js dev) mounts every component twice on initial
render — mount, run effect cleanup, mount again, run effect again — to
surface exactly this class of bug. `DealtCardView`'s `useLayoutEffect`
cleanup only set a `stopped`/`cancelled` boolean, which gated whether
phase 2 (the flip) would *start*, but never called `.stop()` on an
*already-started* Framer Motion animation. So the first (throwaway)
invocation's flip could partially play before Strict Mode's second
(real) invocation started its own clean flip — two visible flips of
the same, correctly-identified card.
**Why it's a problem:** A boolean-flag guard is enough to stop a
sequential `await` chain from *starting the next step*, but it does
nothing to the WAAPI/Motion animation already running from a prior
step — that keeps playing to completion (or until explicitly told to
stop) regardless of the flag. Only production builds skip the
double-invoke, so this class of bug is invisible in `next build` and
only shows up against the dev server, which is what this project is
verified against without a browser tool.
**Fix / rule going forward:** Capture the return value of every
`animate()` call (Framer Motion's `AnimationPlaybackControls`, which
has `.stop()`) and call `.stop()` on the most recent one from the
effect's cleanup, not just a boolean flag. Any imperative,
effect-driven animation must be *actually* cancellable from cleanup,
not just gated — Strict Mode's double-mount in dev will find the gap
if it isn't.

## [2026-08-20] Card showed its face during the slide — omitted property wasn't preserved across separate animate() calls
**What happened:** Even after the Strict Mode fix, the flip still
looked wrong — but the actual symptom was different from what it first
appeared to be: the card showed its FACE the whole way through the
slide (not the back), then snapped to the back and immediately back to
the face once it arrived. Root cause: phase 1's `animate()` call
covered `x`/`y`/`opacity`/`rotate` but deliberately left `rotateY` out,
assuming it would stay at the 180 value set by an earlier instant
`animate()` call. On a raw DOM element driven by `useAnimate` (not a
`<motion.*>` component with persistent tracked motion values), a
property omitted from one `animate()` call isn't reliably held at
whatever a *previous, separate* call set it to — it drifted back
toward its unanimated default (0 = face-up) during phase 1. Phase 2
then explicitly animated `rotateY: [180, 0]`, which forces a snap to
180 first regardless of the actual current value — so the visible
sequence was face (all through the slide) → snap to back → flip to
face, i.e. the "quickly flips to the back and back round straight
away" the user described.
**Why it's a problem:** This is a subtler version of the same lesson
as the Strict Mode entry above — assuming state persists implicitly
across separate imperative `animate()` calls on a plain DOM node,
rather than each call being a complete, self-contained description of
every property it cares about.
**Fix / rule going forward:** Every `animate()` call in a multi-phase
sequence on a raw DOM element now explicitly restates *all* relevant
properties (including the ones not changing in that phase), and phase
2 animates to a single target (`rotateY: 0`, not `[180, 0]`) rather
than forcing a from-value — removing any reliance on cross-call state
persistence entirely.

## [2026-08-20] Abandoned the 3D rotateY flip entirely after three failed fixes
**What happened:** Even after the explicit-properties fix, the user
reported the front face rendering *mirrored* (backwards text) before
the double-flip, and the slide from the deck had stopped working
entirely. The mirrored text meant `backface-visibility: hidden` (or
`transform-style: preserve-3d` on its parent) wasn't actually taking
effect on the raw DOM element the way the same CSS would on a
declarative `<motion.*>` component — the front face was being rendered
at an angle instead of hidden. The broken slide was a second, separate
regression introduced by the same fix: an un-awaited "instant setup"
`animate()` call followed immediately by a second `animate()` call
that implicitly relied on the first having already committed — a race
that could make the slide's own from-value equal its to-value (no
visible movement) if the setup call hadn't applied yet.
**Why it's a problem:** Three consecutive fixes to the same 3D-CSS +
imperative-animation technique each surfaced a new failure mode
without a browser to verify against. Continuing to patch increasingly
subtle interactions between Tailwind arbitrary 3D-transform properties
and Framer Motion's imperative `useAnimate` on a raw DOM element was
not converging — each fix traded one bug for another.
**Fix / rule going forward:** Replaced the entire technique. The flip
is now a `scaleX` squish-to-a-sliver, a React-state content swap at
the invisible midpoint, then unsquish — a single ordinary 2D transform
with no `perspective`, `preserve-3d`, or `backface-visibility`
involved at all, and no possibility of showing content "at an angle"
that could mirror. When a specific technique fails repeatedly across
several targeted fixes without the ability to visually verify each
one, prefer switching to a structurally simpler technique over a
fourth attempt at patching the same fragile one.

## [2026-08-20] Shoe exhaustion mid-round silently killed Speed Drill's timer
**What happened:** `dealNext()` only checked `shoe.needsShuffle` (a
penetration-percentage threshold, e.g. 75%) once at the start of each
round to decide whether to reshuffle. A round's actual card need is
variable — several seats splitting/hitting can consume well more than
a typical round — so a round could start when `needsShuffle` was still
false (enough of a *threshold* buffer left) but run out of *physical*
cards partway through anyway, throwing "Shoe is empty" from inside
`Shoe.draw()`. In Running Count Drill (button click) this just failed
one click silently. In Speed Drill, the throw happened inside the
recurring `setTimeout` callback, before the line that schedules the
next tick — so the callback never got there, the timer's `useEffect`
never rescheduled, and dealing stopped permanently until the user hit
Restart (which builds a fresh shoe from scratch).
**Why it's a problem:** A threshold-based check ("have we crossed X%
penetration") is not the same guarantee as "are there enough cards for
what happens next" when what happens next has unpredictable size. The
gap between those two only shows up right as a shoe empties, which is
exactly what the user reported ("towards the end of all the
decks/cards... stops and no more come out").
**Fix / rule going forward:** Wrapped the round-building logic in a
try/catch inside `dealNext()`: if a draw ever throws (shoe genuinely
out of physical cards), reshuffle to a full shoe and rebuild the round
from scratch, rather than letting the exception propagate. This
guarantees correctness regardless of how many cards any given round
actually needs — no need to guess a safety-margin threshold. Verified
with a smoke test that manually depletes a shoe to 2 cards and forces
a 3-seat round (which would have thrown pre-fix) to confirm it now
recovers cleanly.

## [2026-08-20] Real cause of Speed Drill's stall: React bails on a no-op setState, so the timer stopped rescheduling at max speed
**What happened:** The shoe-exhaustion fix above was a real bug and a
correct fix, but it wasn't *this* bug — the user reported the stall
still happened, consistently, at the same point every time regardless
of shoe/seat config. Actual cause: the timer effect rescheduled itself
by depending on `intervalMs` state (`useEffect(..., [running,
intervalMs])`), and each tick called
`setIntervalMs(prev => Math.max(MIN_INTERVAL_MS, Math.round(prev *
SPEEDUP_FACTOR)))`. Once the ramp reaches `MIN_INTERVAL_MS` (the
floor), that expression evaluates to the *same* number every
subsequent tick. React skips re-rendering when `setState` is called
with a value equal (via `Object.is`) to the current state — so once
pegged at the floor, the state genuinely never changes again, the
effect's dependency never changes, and the effect never re-fires to
schedule the next tick. Dealing stops dead, permanently, the moment
the ramp bottoms out — which happens at a fixed round count
regardless of shoe size, hence the "consistent" stall point the user
noticed (it only *looked* shoe-related by coincidence).
**Why it's a problem:** A `setTimeout` chain that reschedules itself
by depending on a piece of React state that can plateau is fragile in
a way that's easy to miss in code review — it works perfectly right up
until the state stops changing, then stops silently with no error.
**Fix / rule going forward:** Decoupled scheduling from React state
entirely. The live interval now lives in a ref (`intervalRef`), and
the timer schedules its own next tick imperatively from inside the
`setTimeout` callback itself (a self-recursing `tick()` function),
never relying on a state change to trigger a reschedule. `intervalMs`
state still exists, but purely to drive the "X cards/sec" display
text — it's no longer in the effect's dependency array at all. When a
recurring timer's *scheduling* depends on a value that can stop
changing, move the scheduling to an imperative ref-driven loop and
keep React state for display only.

## [2026-08-20] Design change: Speed Drill is a fixed pace, not an auto-ramp
**What happened:** SPEC.md originally described Speed Drill as "timed,
increasing card rate" — dealing speed automatically accelerating over
the session. After adding a user-selectable "starting speed" on top of
that ramp, the user reported (twice, in slightly different framings)
that picking Slow/Normal still "got faster and faster" — the ramp was
still there, the setting only controlled where it *began*. Asked
directly whether the fix should be (a) each preset gets its own
gentler ramp/lower ceiling, (b) speed becomes a fixed pace with no
ramp at all, or (c) both as a toggle. User chose (b).
**Why it's a problem (not really a mistake, a genuine spec change):**
The original "increasing card rate" framing and the later "let the
user pick a speed" request are in tension — auto-acceleration
undermines a manually chosen pace. Building the starting-speed control
without resolving that tension first meant it had to be revisited.
**Fix / rule going forward:** Removed the acceleration entirely —
`speedMs` is now a constant the timer reschedules at indefinitely, no
`SPEEDUP_FACTOR`/`MIN_INTERVAL_MS` any more. Updated SPEC.md's drill
list entry to describe the actual current behavior instead of leaving
it saying "increasing card rate." When a new setting is requested for
a mechanic that has an existing, opposing default behavior (here:
"pick a speed" vs. "it speeds up automatically"), surface that tension
and ask which one should win before implementing, rather than building
the setting as a modifier on top of the behavior it conflicts with.

## [2026-08-20] Design call: Deviation Index Drill uses a curated subset, not the full canonical Illustrious 18/Fab 4
**What happened:** SPEC.md §5.3 calls for an "Illustrious 18 / Fab 4"
deviation drill. Built `src/lib/deviations/illustrious-18.ts` with 16
index plays (1 insurance + 15 hit/stand/double/split/surrender
deviations) that I could verify with high confidence from memory
against widely-repeated published thresholds — and deliberately left
out several commonly-cited low-count "hit instead of stand" plays
(12 vs 4/5/6, 13 vs 2/3) whose exact thresholds I couldn't verify with
confidence without a source to check against.
**Reasoning:** Unlike the bet-ramp (any reasonable spread is fine for
practice purposes), deviation index numbers are specific memorized
facts real counters rely on — getting one wrong would actively teach
something incorrect, which is worse than a smaller-but-correct set.
Every included rule's "basic strategy" baseline is computed live via
the existing `getBasicStrategyAction` engine (not re-typed by hand)
and was cross-checked with a smoke test before committing, so the
"off count" side of each rule is guaranteed consistent with the same
chart simulated seats play by.
**If this call is wrong:** the rule set is fully isolated in one file,
one array (`DEVIATION_RULES`) — adding, correcting, or expanding to
the complete canonical 22-entry list against a verified source touches
only `src/lib/deviations/illustrious-18.ts` and nothing else.

## [2026-08-20] Resolved: counting_systems stays a config file, not a DB table
**What happened:** SPEC.md §8 listed `counting_systems` as "seeded
config table matching §3 (or config file, TBD in CLAUDE.md)" —
explicitly undecided. Setting up the real Postgres schema forced the
decision. Chose config file: the existing `src/lib/counting-systems`
module already *is* that config, every drill already reads from it,
and CLAUDE.md rule #1 already frames "adding a system" as "adding a
config entry, not new code paths" — a DB table would just be a second
copy to keep in sync with the TypeScript one, for no benefit (nothing
needs to query counting systems relationally; the app always wants
"all of them" or "one by id," which the config array already serves
fine). Every table that references a system (`user_settings`,
`drill_sessions`, `play_sessions`) stores the config `id` as plain
text, validated at the application layer, not a DB foreign key.
**If this call is wrong:** promoting it to a real table later is an
additive migration (`CREATE TABLE counting_systems`, seed it from the
existing config array, then add real FK constraints) — doesn't require
touching the columns that already store the id as text.

## [2026-08-20] Auth.js v5 JWT type augmentation targets @auth/core/jwt, not next-auth/jwt
**What happened:** Extending the JWT payload with a custom `userId`
field via `declare module "next-auth/jwt" { interface JWT {...} }`
(the pattern shown in a lot of v4-era and even some v5 docs/examples)
failed to compile — "Invalid module name in augmentation, module
'next-auth/jwt' cannot be found" — even though `next-auth/jwt` is a
real, resolvable subpath export. It's just a re-export barrel
(`export * from "@auth/core/jwt"`) marked "not recommended" in v5;
TypeScript's module augmentation needs to target the module that
actually *defines* the interface, not one that re-exports it.
**Fix / rule going forward:** Augment `@auth/core/jwt` directly:
`declare module "@auth/core/jwt" { interface JWT { userId?: string } }`.
Session augmentation (`declare module "next-auth"`) worked fine as
documented — this is specific to the JWT type. Verified the whole auth
flow end-to-end against the actual dev server afterward (not just
`tsc`): `/api/auth/providers` lists the provider correctly,
`/api/auth/session` returns null when signed out, and a real sign-in
POST correctly attempts OIDC discovery and fails with `fetch failed`
against the placeholder issuer URL — confirming the wiring itself is
correct up to the point where real PocketID credentials are needed.

## [2026-08-20] Real PocketID client secret was pasted into `.env.example` instead of `.env.local`
**What happened:** When wiring up real PocketID credentials, the
issuer/client ID/client secret were added to `.env.example` (tracked
in git) rather than `.env.local` (gitignored). Caught before any
commit — `git status`/`git diff` showed `.env.example` as modified
with real-looking values in it, which is exactly the kind of thing to
double-check before staging.
**Why it's a problem:** `.env.example` exists specifically to be safe
to commit (placeholders only); a real OIDC client secret committed to
git history is hard to fully undo (rotating the PocketID client is the
only real fix) even if a later commit removes it.
**Fix / rule going forward:** Reverted `.env.example` to placeholders;
real values only ever go in `.env.local`. Before staging any `.env*`
file, diff it and confirm it still reads as a template, not real
config — this applies generally any time a file that's supposed to be
a safe-to-commit template gets edited.

## [2026-08-20] Design call: drill_sessions/drill_results are upserted continuously, not written once "on completion"
**What happened:** None of the four drills wired to persistence
(Running Count, True Count, Speed, Bet-Sizing) have an explicit
end-of-session action in the UI — they're open-ended practice loops
you just stop clicking. Rather than inventing an artificial "End
Session" button or trying to hook page-unload (unreliable, and not
asked for), each drill session gets one `drill_sessions` row and one
`drill_results` row, both upserted after every graded round (Check
click). `drillResults.sessionId` got a new unique constraint
specifically to make this an upsert instead of an ever-growing history
of snapshots. `endedAt` is set to "now" on every write, so it always
reflects the true end of the session by the time the user stops
interacting — the last write before they leave *is* the completion
write, there's just no single moment flagged as special.
**Reasoning:** This is more robust than a real "on completion" event
would be anyway (survives a browser crash/tab close with the most
recent state intact) and requires no new UI. A session boundary is
whatever invalidates the running count already (system switch, mode/
deck/penetration change, explicit restart) — reused
`useCardStreamDrill`'s existing reset points (added a `resetCount`
counter it bumps) rather than inventing a second, parallel notion of
"session" alongside the one CLAUDE.md rule #4 already defines.
**If this call is wrong:** the upsert-vs-insert choice is isolated to
`persistDrillProgress`'s `.onConflictDoUpdate` calls and the
`drillResults.sessionId` unique constraint — switching to per-round
history rows would mean dropping that constraint and removing the
`onConflictDoUpdate`, nothing else changes.

## [2026-08-20] Design call: signed-out users get fully working, non-persisted drills
**What happened:** SPEC.md/CLAUDE.md never say whether practice drills
require an account. Decided: never gate a drill on auth state, and
never show a sign-in prompt from a drill page. `saveDrillProgress`
checks `auth()` internally and silently no-ops when nobody's signed
in — the client-side telemetry hook always calls it the same way,
never branching on auth state itself.
**Reasoning:** Consistent with CLAUDE.md rule #9's stance that
simulated seats need no account — the app's core practice loop
shouldn't require signing in either. Persistence is a bonus for
signed-in users (history/stats later), not a gate.
**If this call is wrong:** the no-op branch is one `if (!userId)
return;` in `saveDrillProgress` (`src/lib/db/drill-actions.ts`) —
swapping to "prompt sign-in" would touch only that function and the
UI that calls it, not the telemetry-accumulation logic.

## [2026-08-20] Fixed a stale `mode` value in the drill_sessions schema comment
**What happened:** `schema.ts`'s comment on `drillSessions.mode` said
the column holds `"flashcard" | "shoe"`, but the actual shared type
(`DealMode` in `src/lib/shoe`) uses `"single-card" | "shoe"` —
"flashcard" is only the UI label shown in `DrillConfigPanel`, never a
value that exists in code. Caught immediately by `tsc` when wiring the
persistence types to reuse `DealMode` instead of retyping the union.
**Fix / rule going forward:** `DrillProgressInput.mode` is typed as
`DealMode | null` (imported, not re-declared) so this can't drift
again. Updated the schema comment to point at the actual type instead
of restating it.

## [2026-08-20] Real PocketID login failed: custom OIDC provider config silently dropped the `state` check
**What happened:** With real PocketID credentials wired up, sign-in
failed with Auth.js's generic "Try signing in with a different
account" error page. The dev server log showed the real cause:
`/api/auth/callback/pocketid?error=invalid_state&error_description=
The+state+is+missing...+must+be+at+least+8+characters...`. Root cause:
`node_modules/@auth/core/lib/utils/providers.js` defaults a plain
`OIDCConfig` object's `checks` to `["pkce"]` only — `"state"` is not
included unless explicitly listed. Auth.js's own built-in providers
(Google, GitHub, etc.) hardcode `checks: ["pkce", "state"]` in their
provider factories, so this default gap only shows up when hand-rolling
a custom provider config the way `pocketId()` does here. PocketID's
authorization server requires a `state` param with real entropy
regardless of PKCE being used, and rejects the request (redirecting
back to our callback with the error) when it's absent.
**Why it's a problem:** This was invisible until a real OIDC issuer was
available — the earlier end-to-end check (logged in a prior session's
MISTAKES.md entry) only got as far as confirming OIDC discovery was
attempted against a placeholder issuer, which never exercises the
authorize-redirect's actual query parameters.
**Fix / rule going forward:** Added `checks: ["pkce", "state"]`
explicitly to the `pocketId()` provider config in `src/auth.ts`. When
hand-writing a custom Auth.js provider config (as opposed to using one
of the library's built-ins), don't assume it inherits the same
defaults as a built-in provider — check `checks` explicitly, since
that's exactly the kind of security-relevant default that's easy to
silently under-specify.

## [2026-08-20] Design call: Deviation Index Drill splits accuracy into overall vs. deviation-call-only
**What happened:** Wired the Deviation Index Drill into the same
persistence path as the other four drills, but it's the first one to
actually populate `drill_results.deviationAccuracyPercent` — the
column existed since the original schema (SPEC.md §8) but nothing
wrote to it yet. Extended `useDrillTelemetry`'s `recordCheck` to take
an optional `{ isDeviationCall: boolean }` and track a second,
separate correct/total tally alongside the existing overall one;
`deviationAccuracyPercent` stays null for every drill that never
passes that flag (Running Count, True Count, Speed, Bet-Sizing).
**Reasoning:** Roughly half of this drill's generated scenarios land
under the index threshold (basic strategy is already correct — not a
deviation), so "overall accuracy" and "accuracy specifically on the
harder deviation calls" are genuinely different numbers, exactly the
distinction the schema comment on that column already described. A
single shared `accuracyPercent` would have hidden a real signal (e.g.
someone could be great at recognizing "no deviation here" but weak on
the actual index numbers, and overall accuracy alone wouldn't show it).
**If this call is wrong:** the second tally is fully isolated to
`deviationTotalRef`/`deviationCorrectRef` in `useDrillTelemetry.ts` and
the `isDeviationCall` opt-in — removing it just means every drill's
`deviationAccuracyPercent` goes back to always-null, no schema change
needed.

## [2026-08-20] Design call: Dashboard/Resume pre-fill a drill's system via `?system=`, not a shared store
**What happened:** Building the Dashboard (SPEC.md §5.1)'s "pick a
system" + "resume last session" required a way to hand a chosen system
id to whichever drill page the user lands on next. Rather than adding
global client state (context/store) shared between the Dashboard and
every drill page, used a plain `?system=<id>` query param the
Dashboard/Resume links append, read via a new `useInitialSystemId`
hook (`src/hooks/useInitialSystemId.ts`) as each drill's starting
system. Since the hook calls `useSearchParams`, every drill page now
wraps its actual content in `<Suspense>` with an inner
`*PageInner` component (Next.js's required pattern for that hook).
**Reasoning:** A query param is simpler than cross-page state, requires
no provider/context wiring, survives a page refresh, and is trivially
shareable/bookmarkable. The Suspense wrapping is mechanical and
low-risk — verified with `next build` (no warnings) and a live dev-
server smoke test hitting every drill route.
**If this call is wrong:** swapping to shared client state would only
touch `useInitialSystemId` and the two link-building spots
(`DashboardPicker.tsx`, `src/app/page.tsx`'s Resume card) — the drill
pages' own `useInitialSystemId(...)` call sites wouldn't need to change
shape, just what they read from.

## [2026-08-20] Design call: `useInitialSystemId` respects each drill's own system filter
**What happened:** True Count and Bet-Sizing drills only accept
balanced systems (`system.balanced`); Deviations only accepts
`system.supportsDeviations` ones — but the Dashboard's picker offers
every system, so a link like "pick KO, then click True Count" was
possible and would have silently generated a nonsensical "true count"
for an unbalanced system (KO doesn't need conversion at all).
**Why it's a problem (assumption, caught before shipping, not after):**
Would have violated the exact constraint those drills' own
`CountingSystemSelect filter` props already enforce for manual
selection — an incoming id shouldn't be able to bypass a rule the UI
otherwise upholds.
**Fix / rule going forward:** `useInitialSystemId` takes an optional
`filter` (same predicate shape as `CountingSystemSelect`'s), and falls
back to the first system that satisfies it when the requested id
doesn't qualify. True Count/Bet-Sizing pass `(s) => s.balanced`;
Deviations passes `(s) => s.supportsDeviations`. Verified against the
running dev server: `/drills/true-count?system=ko` and
`/drills/deviations?system=ko` both return 200 (silently substitute
Hi-Lo) rather than generating a KO true-count scenario.

## [2026-08-20] Design call: Settings, Stats/History, and Play Mode metrics scope
**What happened:** Three related scope decisions made building
Settings (§5.6) and Stats/History (§5.5):
1. A `user_settings` row is only created when the user actually clicks
   Save on the Settings page (via `updateUserSettings`), not on first
   sign-in — `getUserSettings` falls back to the schema's documented
   defaults (`hi-lo`, both reveal toggles off) when no row exists yet,
   consistent with `users` being the only row auto-created on login
   per CLAUDE.md's data model conventions.
2. Settings' "default toggle states" are saved and displayed, but not
   yet wired to actually initialize each drill page's reveal-count/
   reveal-correct-action toggles (those still always start `false`,
   as before). Built the storage/UI half; wiring drills to read it is
   a follow-up, not attempted here to avoid re-touching all five drill
   pages in an already-large task.
3. Stats/History shows every §6 metric that has a real data source
   (accuracy, speed, deviation accuracy, streak, session history) but
   explicitly labels betting correlation and bankroll trend as
   Play-Mode-sourced and not shown, rather than rendering fabricated
   zero/placeholder values — `play_sessions` stays empty until Play
   Mode (§5.4) exists.
**If any of these calls are wrong:** (1) is a one-line change (insert
a default row in the `jwt` callback in `src/auth.ts` alongside the
`users` insert); (2) means passing `settings.defaultRevealCount` etc.
as each drill page's `useState` initial value instead of `false`,
fetched the same way `useInitialSystemId` reads `?system=` today; (3)
resolves itself automatically once Play Mode writes real
`play_sessions` rows — the Stats page's per-system table would just
need two more columns.

## [2026-08-20] Play Mode house rules: decisions made without being asked, per your instruction
**What happened:** SPEC.md §5.4 didn't spell out several standard
blackjack rule details. Decided each as follows, reusing precedent
already in the codebase wherever it existed rather than inventing new
numbers:
- **Double after split**: allowed. `basic-strategy.ts`'s own header
  comment already documents "double after split allowed" as the
  chart's assumption, and the simulated-seat engine's `canDouble`
  check (`hand.cards.length === 2`) already permits it post-split —
  this wasn't a new decision, just staying consistent with what was
  already implemented and documented.
- **Re-split limit**: reused `seats.ts`'s existing `MAX_SPLIT_HANDS =
  4` (now exported) instead of a second hardcoded number for the
  player's own interactive hand.
- **Split aces**: exactly one card each, no further action to that
  hand — identical to the seat engine's existing rule.
- **Dealer peek**: on an Ace or 10-value up-card, the dealer's hole
  card is checked for blackjack *before* the player's turn begins. If
  blackjack, it resolves immediately (push if the player also has
  blackjack, otherwise a loss) and the player never gets to act into a
  hand that was already decided — the standard Vegas rule, and without
  it a player could double/split into an inevitable dealer blackjack.
- **Blackjack payout after a split**: `evaluateHand().isBlackjack` is
  true for any two-card 21, including a post-split one, which is
  correct for the shared engine's existing uses (drills/seats never
  cared) but wrong for real payout math — a post-split 21 pays 1:1, not
  3:2. Play Mode tracks `fromSplit` per hand and gates on
  `!fromSplit` before trusting that flag for payout purposes.
- **Insurance stake**: fixed at half the original bet (rounded to the
  nearest dollar), not a separate amount picker — matches the standard
  maximum and keeps the betting UI to one mechanism (click chips)
  rather than two.
- **Fractional payouts**: rounded to the nearest whole dollar (e.g. 3:2
  on a $5 bet). Bankroll is a plain integer throughout; standard casino
  denominations were kept as-is rather than inventing non-standard chip
  values to avoid the rounding.
**If any of these are wrong:** each is isolated — the peek is one
function (`finishPeek` in `usePlayMode.ts`), the split-blackjack gate
is one boolean expression in `resolveRound`, the insurance stake is
one `Math.round(bet / 2)`, none of them ripple into the others.

## [2026-08-20] Critical invariant: the dealer's hole card must not affect the count (or correctness) until revealed
**What happened:** Explicitly flagged mid-task as something that would
silently invalidate every Play Mode stat if gotten wrong. The hole
card IS drawn from the shoe immediately at deal time (shoe depletion
is always physically accurate), but it is deliberately NOT added to
`visibleCardsSinceShuffle` — the one array every count/correctness
computation reads from — until the exact moment it's actually revealed
(dealer peek finding blackjack, or the real dealer turn). The reveal is
a single atomic state update that flips the card's visual `faceDown`
flag AND appends it to the count-visible array together, so the visual
state and the count state can never drift apart into two separate
"is it revealed" answers.
**Why it's a problem (assumption to verify, not a caught bug):**
Getting the timing wrong in either direction is invisible in normal
play-testing — a hole card counted one action too early or too late
produces a plausible-looking but wrong number, exactly the kind of bug
that "every stat this mode produces would be silently invalid."
**Fix / rule going forward:** Traced every `setVisibleCardsSinceShuffle`
call site in `usePlayMode.ts` by hand to confirm the hole card is
included in exactly one of two mutually-exclusive paths (the peek-
blackjack early resolution, or the normal `beginDealerTurn`) and never
both, and that every per-decision correctness check
(`recordDecision`) runs before the state update for whatever card that
decision itself is about to reveal. No automated test covers this
directly — the project has no React component-level test runner
installed, and adding one for this single hook felt like a bigger
infrastructure decision than this task warranted. **This is the one
piece of Play Mode most worth a human's own manual verification**:
turn on "Reveal count," play a hand where the dealer shows an Ace or a
10, and confirm the displayed count does NOT change when you act, only
jumping once the dealer's hole card actually flips over.

## [2026-08-20] Design call: Play Mode gets its own hook rather than reusing useCardStreamDrill
**What happened:** A full round (insurance, dealer peek, multi-hand
splits, real money) is structurally too different from
useCardStreamDrill's "deal one round, check a guess" shape to share
meaningfully. Wrote `usePlayMode.ts` as its own hook, reusing every
underlying engine (Shoe, playSimulatedSeatHand, counting, basic
strategy, deviations) exactly as built, but re-implementing the small
amount of structural boilerplate useCardStreamDrill also has (seat
array management, system-switch-confirm state) rather than extracting
a shared hook out of already-shipped, tested drill code mid-way
through an already-large feature.
**If this call is wrong:** the duplicated pieces are small (seat
add/remove/setSkill, ~15 lines; system-switch-confirm, ~15 lines) and
isolated enough to extract into shared hooks later without touching
either call site's behavior.

## [2026-08-20] Design call: no schema migration for bankroll — reused play_sessions.bankroll_trend
**What happened:** "Bankroll persists per user across sessions" could
have meant adding a `bankroll` column to `users`. Instead, a new play
session's starting bankroll is read from the LAST point of the user's
most recent previous `play_sessions.bankroll_trend` array (default
$1000 for a first-ever player) — `getStartingBankroll` in
`play-persistence.ts`. No migration needed; the field already existed
for exactly this purpose (SPEC.md §8's bankroll trend).
**Reasoning:** `users` is documented (CLAUDE.md data model conventions)
as an identity-mirror table only — "stats/history/settings" belong in
other tables keyed off `users.id`. Bankroll is game state, not
identity, and `play_sessions` already had a field that serves as an
exact, auditable record of every bankroll value the account has ever
had, which a bare `users.bankroll` column wouldn't provide on its own.
**If this call is wrong:** adding a dedicated column later is additive
— `getStartingBankroll` would just read from it instead, unchanged
call site.

## [2026-08-20] Design call: dealer's chip stack is decorative; seats stay visual-only in Play Mode too
**What happened:** There's no real "house bankroll" anywhere in the
schema, and the task explicitly required accuracy only for the
player's own stack — `DealerChipTray` renders a fixed, non-numeric row
of chips for visual symmetry, never tied to a real value. Simulated
seats also get no payout tracking of their own in Play Mode, same as
in the drills — CLAUDE.md rule #9 already rules out giving them
persistent stats/accounts.
**If wrong:** both are additive — a real house-edge simulation or
seat-level win/loss tracking would be new code, not a change to
existing behavior.

## [2026-08-20] Design call: seat/config changes gated to the betting phase, not literally "any point"
**What happened:** CLAUDE.md rule #9 says simulated seats are
"addable/removable at any point in any mode." Play Mode's config panel
(system/deck/penetration/seats) only renders during the betting phase
— mid-round, there's no UI to add/remove a seat until the round
resolves and betting reopens.
**Reasoning:** A real blackjack table doesn't let you add a seat mid-
hand either — "any point" for a turn-based round game naturally means
"between hands," which is the granularity every other engine concept
here already respects (a shoe never reshuffles mid-hand, a system
switch is blocked mid-round for the same reason). Drills have no
"hand in progress" concept at all, so rule #9's literal "any point"
reads differently there than for a real turn-based round.
**If this call is wrong:** the seat handlers (`addSeat`/`removeSeat`/
`setSeatSkill`) themselves have no phase guard at all — only the page's
decision to hide the config panel during a round restricts this, so
exposing seat controls during other phases is a UI-only change.

## [2026-08-20] Play Mode: three real bugs found from user testing + dev server logs
**What happened:** Checking the dev server logs (as asked) surfaced a
real hydration error: `<button>` cannot be a descendant of `<button>`
— the Surrender button wrapped `<Term id="surrender">Surrender</Term>`,
and `Term` itself renders a `<button>` for its tooltip trigger, so the
Surrender action button contained a second nested button. Separately,
user testing surfaced two more: the correctness-notification feedback
for a hand's LAST action never appeared, because it was rendered only
inside the `phase === "player-turn"` block — the very last action is
what moves the phase away from "player-turn" (to "dealer-turn" then
"resolved", synchronously), so the block unmounted before the user
could see it. And a natural player blackjack required a manual Stand
click even though it's an unbeatable, already-decided hand.
**Fix / rule going forward:** Term's tooltip button can never nest
inside another interactive button — moved it to a plain explanatory
line below the action row instead. Correctness feedback now renders
based on `lastActionFeedback` being non-null (which itself only exists
after an action and resets at the next deal), not gated to a specific
phase. A natural blackjack is now auto-detected right after dealing/
peek-resolution and routed through the same advance/resolve path a
manual Stand would use.
**A second, subtler bug caused by the blackjack fix itself:** routing
the auto-blackjack case through `advanceToNextHandOrDealer` ->
`beginDealerTurn` meant those functions could now be called
SYNCHRONOUSLY from within `deal()`/`finishPeek()`, before that same
render's `setDealerHand` call had flushed — reading `dealerHand` state
via closure at that point would see stale (sometimes empty) data
instead of the cards just dealt. Fixed by threading the dealer's cards
as explicit parameters through `enterPlayerTurn` ->
`advanceToNextHandOrDealer` -> `beginDealerTurn`, the same discipline
already used for `finishPeek`'s insurance flow — closure reads of
`dealerHand` are only safe from genuine user-click handlers (hit/
stand/double/surrender/split), never from a function that might also
be called same-tick from deal()/finishPeek(). Any future change that
makes a currently-async-only path reachable synchronously needs the
same check.

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
