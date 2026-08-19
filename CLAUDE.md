# CLAUDE.md

This file is read by Claude Code at the start of every session. It
defines the project's conventions and constraints. **Also read
MISTAKES.md every session** — it's a running log of mistakes made
before; don't repeat them.

## Project
Card Counting Trainer — a Next.js web app for learning and practicing
card counting: theory reference, isolated drills, and a full
blackjack play mode. Full spec: `SPEC.md`.

## Stack
- Next.js (frontend + API routes, one app)
- Tailwind CSS
- PostgreSQL
- Auth: OIDC via PocketID — do not build custom signup/password auth
- Deployment target: Docker container on TrueNAS NAS, behind
  nginx-proxy-manager (jc21)

## Non-negotiable rules
1. **Never hardcode a counting system.** All system-specific logic
   (tag values, balanced/unbalanced, deviation support) reads from the
   counting-system config, never from inline if/else per system. If a
   feature only works for one hardcoded system, that's a bug.
2. **One shoe engine.** Flashcard drills, shoe drills, and Play Mode
   all call the same shoe/deck simulation module. Never duplicate
   card-dealing logic per feature. This includes simulated player
   seats (see rule 9) — they consume cards from the same shoe, not a
   separate mock deck.
3. **Fully responsive, always.** Every page must be usable and
   uncluttered from small mobile widths up to desktop. Test at mobile
   width before considering any page/component done. No cut-off
   content, no unusable cramped layouts.
4. **Switching counting system mid-session resets the running count**,
   and must show a clear notice/confirmation before doing so. Never
   let a system switch silently carry over a stale count.
5. **Reveal toggles are consistent everywhere.** "Show count" and
   "show correct action" toggles use the same shared component/pattern
   in both Practice Drills and Play Mode — don't build one-off reveal
   UI per page.
6. **Terms use the shared `<Term>` tooltip component**, pulling from
   one glossary dictionary. Don't inline ad-hoc explanations of terms
   in multiple places — one source of truth per term.
7. **Casino felt design tokens apply app-wide**, not just Play Mode.
   Theory and Drill pages should feel visually consistent with Play
   Mode, not like a separate spreadsheet-style UI bolted onto a game.
8. **No dealer/person avatar** anywhere in the UI.
9. **Simulated player seats are code-driven, not real players, and
   are addable/removable at any point in any mode** — not fixed only
   at session start. Default behavior is perfect basic strategy;
   "imperfect" skill level is an explicit opt-in, not the default.
   They exist purely to consume cards realistically from the shared
   shoe — don't give them their own persistent stats or accounts.
   Adding/removing a seat must NOT reset the running count (only a
   counting-system switch does that — see rule 4); it only changes
   future card consumption.
10. **Every toggle explains its tradeoff, briefly.** Any on/off
    setting (reveal toggles, seat count, seat skill, drill mode, etc.)
    needs a short label or compact tooltip conveying what changes —
    e.g. easier/harder, simplified/realistic. Use one shared
    label/tooltip component for this everywhere; never write inline
    paragraph explanations, and never leave a toggle unexplained. Keep
    it terse enough that the UI stays sleek, not cluttered.
11. **One shared table/dealing-animation component.** Every shoe-mode
    drill and Play Mode render hands through the same table/animation
    component (see `SPEC.md` §7.2) — never a per-page card renderer.
    It must handle simulated seats being added/removed at any time
    (re-flowing the table layout live, per rule 9) and stay fully
    responsive at mobile widths (per rule 3). Flashcard-mode drills are
    exempt — they keep their simpler single-card view.

## Data model conventions
- `users` table mirrors PocketID's user ID — created on first login,
  never self-registered.
- All stats/history/settings tables key off the internal `users.id`,
  never off the PocketID subject ID directly (keep that mapping in
  one place: the `users` table).
- See `SPEC.md` §8 for the full table list.

## Workflow expectations
- Before implementing a new drill or page, check whether it can reuse
  the shoe engine, counting-system config, reveal-toggle component, or
  `<Term>` component instead of introducing a new pattern.
- When something goes wrong or gets corrected during a session, add an
  entry to `MISTAKES.md` in the same session — don't wait to be asked.
