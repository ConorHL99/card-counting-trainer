# Card Counting Trainer — Project Spec

## 1. Overview
A self-hosted web app for learning and practicing card counting: theory
reference, isolated drills, and a full blackjack play mode — all driven
by a shared, configurable counting-system engine.

## 2. Stack
- **Framework**: Next.js (frontend + API routes, single deployable app)
- **Styling**: Tailwind CSS, custom "casino felt" design tokens (see §7)
- **Database**: PostgreSQL
- **Auth**: OIDC via PocketID (existing self-hosted provider). Each
  PocketID account maps to one app user, created on first login. No
  self-service signup/password flow.
- **Hosting**: NAS (TrueNAS), Dockerized, behind nginx-proxy-manager,
  consistent with existing homelab services.

## 3. Counting system engine (core, shared by everything)
A single config-driven engine — no drill, page, or game mode hardcodes
a specific system. Adding a new system means adding a config entry,
not new code paths.

Each system config defines:
- `id`, `name`, `difficulty` tier (`easy` | `common` | `advanced` | `expert`)
- `tagValues`: map of card rank → count value
- `balanced`: boolean (whether true-count conversion is needed)
- `insuranceCorrelation` / `bettingCorrelation` metadata (for stats)
- `supportsDeviations`: boolean — whether Illustrious 18 / Fab 4 module
  can attach to this system (initially Hi-Lo only)

Difficulty tiers:
| Tier | Systems |
|---|---|
| Easy | Hi-Lo |
| Common | KO, Hi-Opt I |
| Advanced | Hi-Opt II, Omega II |
| Expert | Wong Halves, Zen Count |

**System/difficulty is switchable at any time**, including mid-practice
or mid-game. Switching systems resets the current running count and
must show a confirmation/notice before doing so (see MISTAKES.md —
this is a known footgun).

## 4. Shoe engine (shared)
One deck-simulation module used by both drill types and Play Mode:
- Configurable deck count, penetration %, shuffle point
- Flashcard drills use it in "single card, reshuffle after" mode
- Shoe drills and Play Mode use it in real multi-deck/penetration mode
- Guarantees drills and the live game always reflect a consistent,
  correctly-tracked shoe state — never two divergent implementations
  of "what card comes next."

### 4.1 Simulated multi-player seats
Shoe/play sessions can include additional simulated seats (code-driven,
not real players) alongside the dealer and the user's own hand. This
matters for realistic counting practice: in a real game, the count
tracks *every* card dealt at the table, not just the user's own hand —
a single-seat table under-trains this.

- Configurable seat count (e.g. 0–6), **addable/removable at any point,
  in any mode** — not fixed only at session start. A seat can join or
  leave between rounds mid-drill or mid-play-session.
- Adding/removing a seat does **not** reset the running count — unlike
  a counting-system switch, it only affects which cards get consumed
  in future rounds, not any card already dealt. Don't conflate the two.
- Each simulated seat plays out its hand automatically, consuming
  cards from the same shared shoe as the dealer and user
- **Skill level is configurable per seat/session**:
  - `basic-strategy` (default) — always plays mathematically correct
    basic strategy; consistent, predictable card consumption
  - `imperfect` — deliberately plays some hands against basic
    strategy, mimicking a real casual player; added-difficulty mode
    for practicing count accuracy amid real-world noise
- Simulated seats are purely a card-consumption/realism mechanic —
  they don't have their own stats, accounts, or persistence

## 5. Pages / modes

### 5.1 Dashboard
Pick counting system + difficulty (switchable later), quick stats
summary, resume last session.

### 5.2 Theory
Per-system explainer pages: tag values, running count, true count
conversion, betting spread, basic strategy deviations. Every technical
term (true count, penetration, TC, EV, insurance correlation, etc.)
uses a shared `<Term>` tooltip component pulling from one glossary
dictionary — hover/tap shows formula + brief definition inline, no
navigating away.

### 5.3 Practice Drills
Each drill is independently configurable: counting system, difficulty,
flashcard vs. shoe mode, speed, simulated seat count (shoe mode only —
see §4.1). Toggle options available per drill,
consistent everywhere they apply:
- **Reveal count** — show running/true count on demand
- **Reveal correct action** — show correct counting-driven decision
  (bet size, deviation call) on demand, not just basic strategy

Drill types:
- Running count drill (cards shown, track the count)
- True count conversion drill (given running count + decks remaining)
- Speed drill (timed, increasing card rate)
- Deviation index drill (optional, Hi-Lo only initially — Illustrious 18 / Fab 4)
- Bet-sizing drill (given true count, choose bet size)

### 5.4 Play Mode (blackjack game)
Full blackjack hands, styled like a casino table (see §7). No dealer
avatar/person shown — table, felt, cards, chips only. Supports
simulated multi-player seats (see §4.1) for realistic card exposure.

Toggleable overlays (same reveal pattern as drills):
- Running/true count display
- Correctness notification per decision (hit/stand/split/double/
  insurance/surrender) — was this the right counting-aware play, not
  just basic strategy
- Suggested bet size vs. actual bet size (for betting-correlation stats)

### 5.5 Stats / History
Per user, per system. See §6 for tracked metrics. Session history log
(system, mode, drill type, duration, score, date).

### 5.6 Settings
Default system/difficulty, default toggle states, account info (from
PocketID profile).

## 6. Stats tracked
- Accuracy % — overall and per counting system
- Speed — avg ms per card, trend over time
- Deviation-decision accuracy specifically (harder metric than general accuracy)
- Betting correlation — how closely bet size tracked true count in Play Mode
- Longest error-free streak
- Full session history log
- Win/loss and bankroll trend in Play Mode (fun stat, not skill-relevant)

## 7. Design direction
Casino blackjack table aesthetic used consistently across *all* pages,
not just Play Mode — same design tokens (felt green palette, card/chip
styling) so Theory and Drill pages feel part of the same product
rather than a bolted-on game.
- No dealer/person avatar anywhere
- Fully responsive: usable and uncluttered from mobile width up to
  desktop — this is a hard requirement, not a nice-to-have

### 7.1 Toggle/setting explanations
Every toggleable setting anywhere in the app (reveal count, reveal
correct action, seat count, seat skill level, drill mode, deviation
module, etc.) must communicate what turning it on or off actually
changes in practice — e.g. "harder" vs "easier," "realistic" vs
"simplified" — not just a bare on/off label.

- Delivered via a short label and/or a compact tooltip/info icon, not
  paragraphs of inline text — the UI must stay sleek and uncluttered,
  not turn into a wall of explanatory copy next to every switch
- Use the same shared component/pattern for this across the whole app
  (consistent with the `<Term>` tooltip approach in §5.2) rather than
  one-off explanations per toggle
- Prefer a short, consistent phrasing convention over full sentences,
  e.g. a fixed "Off: simplified · On: realistic" style tag, so users
  learn to scan it quickly rather than read it fresh each time

## 8. Data model (high level)
- `users` — mirrors PocketID user ID, created on first login
- `user_settings` — default system, difficulty, toggle preferences
- `drill_sessions` — user, system, drill type, mode (flashcard/shoe), timestamps
- `drill_results` — per-session accuracy, speed, deviation accuracy, streaks
- `play_sessions` — user, system, hands played, bankroll trend, betting correlation
- `counting_systems` — seeded config table matching §3 (or config file, TBD in CLAUDE.md)

## 9. Out of scope (for now)
- Self-service signup (handled by PocketID)
- Multiplayer / shared tables
- Additional pages beyond §5 unless a real need emerges
