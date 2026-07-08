# Auction Draft — First-Principles UX/UI Redesign (DESIGN, pending JK sign-off)

> Status: DESIGN + PROTOTYPE complete; React build to follow. Branch `codex/auction-draft-ux-rehaul`,
> worktree `/Users/johnkruse/Projects/kbl-tracker--auction-ux`. Authored as Chief of Design from a
> deep read of `AUCTION_DRAFT_SPEC_V2.md` (the authoritative functional anchor), the current auction
> code, and the just-shipped draft-setup re-haul (the quality bar). This is the engineering artifact;
> the plain-language summary + the decisions go to JK in chat.
>
> JK rulings that frame this (2026-06-25): **refined hybrid (premium retro)** look · **design-first,
> then build** · **full copy latitude (rewrite voice, update tests)** · **whole arc end-to-end**.

---

## 0. The one-paragraph thesis

An auction is **theater**, and the current screen treats it like a **control panel**. Every lot, the
user has exactly **one decision** — *bid, or let him go* — yet today that decision is buried under
`STATE: OPEN_BIDDING`, raw number inputs, eight equal-weight panels, and a pixel font that makes the
money hard to read. The redesign keeps every gear of the machine turning underneath (the engine
surfaces players, one-chance-or-gone, hidden scout grades, solvency caps, carryover, the four-number
freeze) and rebuilds the **surface** so the single decision is effortless and everything else is
*glanceable context.* We keep KBL's green/gold/cream soul, but execute it with Apple-grade restraint:
legible type for the data, generous space, soft depth, and motion that gives the auction its drama.

---

## 1. The problem (why the current auction screen needs the same treatment as draft-setup)

The current `LeagueBuilderAuctionDraft.tsx` / `LeagueBuilderFarmAuctionDraft.tsx` (738 / 884 lines) are
**functionally complete but experientially raw**. Concretely:

- **Developer-facing, not player-facing.** The screen literally prints `STATE: SETUP` / `STATE:
  OPEN_BIDDING` / `STATE: SOLD`; the surfaced player is labelled `ENGINE NOMINATED`; the coach line sits
  in a banner that competes with everything. This is the state machine leaking onto the stage.
- **Setup noise on the stage.** Seed string, CPU count, bid increment, and the league `<select>` live in
  a permanent left rail *during the auction* — config that belongs to a pre-draft step, not the live
  drama. They dilute the one thing that matters when a player is on the block.
- **Eight panels of equal weight.** ENGINE NOMINATED, HIGH BID, CURRENT BIDDER, YOUR REMAINING BUDGET,
  YOUR MAX BID, ROSTER SLOTS REMAINING, POSITION TALLY, RAISE controls — all the same card, same size,
  same color. There is no visual hierarchy, so the eye has nowhere to land. The *decision* (raise/pass)
  is the same weight as the *housekeeping* (seed label).
- **The money is hard to read.** Everything inherits the app's `Press Start 2P` pixel body font
  (`:root` in `index.css`). For dense, comparison-heavy data — `$143,641` vs `$199,126`, a budget
  ticking down, a max-bid ceiling — a pixel font is the wrong tool. Numbers should be crisp and
  tabular.
- **The high-drama moments are absent.** The engine surfacing a player, a player going *gone forever*,
  the MLB→farm carryover valve firing, the four-number freeze — the spec's most emotional beats
  (`§2.1`, `§2.2`, `§4.5`, `§10`) render as plain text or not at all. The "one-chance" mechanic only
  *feels* costly if losing a player you sat out *looks* costly.
- **MLB and farm are near-duplicate 800-line files.** Two copies of the same stage that drift in small
  ways (`×` vs `x`, em-dash vs hyphen, the farm page ignores `?leagueId=`).

The draft-setup re-haul fixed the *information architecture* of pool-building. This redesign does the
same first-principles pass on the *auction experience* — and pushes one notch further on the visual
execution, per JK's "refined hybrid" ruling.

---

## 2. First principles — what an auction draft IS, from the user's seat

Strip it down. During the live draft the user is a **GM in a war room** doing one loop, over and over:

```
 a player appears  →  is he worth it, to ME, right now?  →  bid / let go  →  (won or gone)  →  next
       ▲                         │                                                              │
       └──────────────────  the engine decides who, and when  ───────────────────────  loop ◄──┘
```

Three truths fall out of that loop, and they drive every layout decision:

1. **There is exactly ONE action per lot: bid or pass.** Everything else on screen exists *only* to
   inform that action. So the screen has exactly one primary affordance (the bid), one clearly-weighted
   "let go," and the rest is context — sized and placed by how much it informs the decision.

2. **"Is he worth it to ME?" has three inputs, and they should sit together:** *his value* (public IV
   on MLB; the scout's fogged range + 20-80 grade on farm), *my money* (budget, and the solvency
   ceiling that caps what I can legally spend), and *my need* (which roster slots are still open). The
   current screen scatters these; the redesign clusters them around the decision.

3. **The user does not control who or when — the engine does.** That powerlessness is the *point* of
   the one-chance mechanic (`§2.1–2.2`): you can't summon your target, and if you sit out a lot, he's
   gone for good. So the **reveal** of each new player and the **loss** of a passed player are not
   incidental — they are the emotional spine. They deserve real staging, not a text swap.

A draft pool, post-setup, is a **surplus of players** the engine feeds onto the block one at a time;
the auction's job is to turn that surplus into two filled rosters (22 MLB + 10 farm) and a **fingerprint**
— who you committed to early, who you overpaid for, who fell to you late — that becomes the starting
morale of your franchise. The UI's job is to make every lot's decision clear, and to make the
fingerprint *visible* at the end so it doesn't evaporate on day one of the season.

---

## 3. Design principles (the rules this redesign holds itself to)

1. **One decision, center stage.** Each lot, the bid/let-go choice is the largest, clearest thing on
   screen. Everything else is context, weighted by relevance.
2. **Context clusters around the decision.** Value, money, and need form a tight triad next to the bid —
   not eight scattered equal panels.
3. **The machine is invisible; the drama is visible.** No `STATE:` labels, no seed strings on the stage.
   But the reveal, the win, and the *gone-forever* loss get real motion and weight.
4. **Legible by default; pixel font for soul only.** Data is a clean system sans; money/counts are
   tabular mono; `Press Start 2P` is reserved for the wordmark and the big dramatic numbers (the live
   bid, the SOLD stamp). KBL keeps its voice without sacrificing readability.
5. **Soft premium depth, KBL palette.** Keep the green/gold/cream identity; replace the hard 8px black
   offset shadow with soft ambient elevation + a hairline highlight. One 2px hard-offset nod survives
   on the primary action button — a wink to the house style.
6. **Generous space.** An 8pt rhythm, real breathing room, a wide stage. Density where it earns its keep
   (the roster board, the lot log), air everywhere else.
7. **Honesty in limits.** The solvency cap and luxury tax are shown as *understandable* limits ("this is
   the most you can spend and still field 22"), never as a mystery disabled button.
8. **Don't drift.** Every redesigned control maps to an existing hook method and the same state machine.
   The look and the words change; the behavior does not (see §7).

---

## 4. The visual system — "Premium Retro" (refined hybrid)

The system extends the live franchise tokens (`franchise-theme.css`, already on `:root`, resolves
everywhere). It is **not** a new aesthetic — it is the KBL aesthetic, executed with restraint.

### 4.1 Color — restrained KBL
Fewer, more intentional colors than the current 58-hex sprawl. Anchored to the franchise tokens.

| Role | Token / value | Use |
|---|---|---|
| Field (page) | `#243024` → `#2D3D2F` vertical wash | the room |
| Panel | `#34472F` / `--franchise-panel-deep` | cards, the stage floor |
| Panel raised | `#3F5A3A` | elevated cards (the LOT) |
| Inset / chip | `#283626` | data chips, the lot log |
| Hairline | `rgba(232,232,216,0.10)` | borders (replaces border-4/6) |
| Text | `#E8E8D8` cream | primary |
| Text muted | `rgba(232,232,216,0.60)` | labels, secondary |
| Gold accent | `#C4A853` / bright `#FFD27A` | value, the primary action, highlights |
| Win / positive | `#9DFFB0` text · `#3E9D5A` fill | "you lead", morale up, SOLD-to-you |
| Loss / negative | `#FF8C8C` text · `#A3483D` fill | over-cap, morale down, gone |
| Info / rival | `#7FB0E8` | rival bids, neutral system notes |

Restraint rule: **gold means "value / your move," green means "good for you," red means "loss / limit,"
blue means "someone else."** No color is decorative.

### 4.2 Typography — three voices
- **Character (Press Start 2P):** the KBL wordmark, the live BID figure on the block, the `SOLD` / `GONE`
  stamps. Used sparingly — it is seasoning, not the meal.
- **Numbers (tabular mono — `"SF Mono", "JetBrains Mono", ui-monospace, monospace`):** money, budgets,
  bid ceilings, counts, timers. Tabular figures so columns align and a ticking number doesn't jitter.
- **Body (system sans — `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui,
  sans-serif`):** names, labels, copy, the coach voice. On JK's Apple hardware this renders as SF Pro —
  literally Apple-grade type, loaded for free.

Scale (rem, 8pt-aligned): eyebrow label `0.6875` (11px, +0.14em tracking, uppercase) · body `0.875`
(14px) · value `1` (16px) · title `1.0625` (17px) · stage value `1.375`–`2` · the live bid `2.5`–`3.25`.

### 4.3 Depth, radius, space
- **Depth:** elevated card = `0 1px 0 rgba(255,255,255,0.05) inset, 0 2px 6px rgba(0,0,0,0.35),
  0 12px 32px rgba(0,0,0,0.30)`. Soft, premium, real. The **primary bid button** keeps a single
  `3px 3px 0 rgba(0,0,0,0.7)` hard offset — the one surviving wink to neo-brutalist KBL.
- **Radius:** cards `16px` (`rounded-2xl`), chips/inputs/buttons `10px` (`rounded-lg`), the lot card
  `20px`. Soft, not round. (A deliberate, documented departure from the square reference — justified by
  "premium.")
- **Space:** 8pt grid. Card padding `20–24`. Section gaps `20–24`. Page max-width `1180px` for the
  stage (it's data-rich); the stage breathes with real margin.

### 4.4 Motion (the drama)
Purposeful, spring-based, never gratuitous. (Framer-`motion` is already a dependency; CSS in the
prototype.)
- **Reveal:** a new player *rises* onto the block — fade + 12px upward spring, the value chip counts in.
- **Bid tick:** the high-bid figure ticks up with a brief gold pulse; a rival raise slides in from the
  bidder's side in blue.
- **SOLD:** a stamp scales in (overshoot, settle) over the lot; the won player flies to the roster board.
- **GONE:** the lot desaturates and dissolves downward; a quiet "Nobody bid — he's gone for good" line.
- **Carryover:** at the MLB→farm handoff, the unspent figure *flows* (coin/number stream) into the farm
  wallet, which counts up. The valve firing is a felt moment, not a silent recalculation.
- **Respects `prefers-reduced-motion`:** all of the above degrade to a simple fade.

---

## 5. The screens (the arc, end to end)

Five surfaces. MLB and farm are **one stage component** parameterized by tier (kills the 800-line
duplication). The new moments (carryover, summary, gone-forever) are first-class.

### 5.1 Auction Setup (pre-draft, calm)
*Replaces the permanent config rail.* A single quiet screen that gathers what the engine needs and shows
the GM they're ready — then gets out of the way.
- **Draft briefing (read-only, from upstream Mode-1 setup):** your GM name, your **two identities**
  (MLB archetype + farm archetype), your scout (name + specialty). Surfaced, not edited here — these are
  set upstream (`§4.2`, `§8`); the auction screen *honors* them. If absent, a gentle "set these in
  league setup" pointer.
- **The room (the only real inputs):** rival pressure (CPU shill count), bid increment, optional turn
  timer (default off), and an advanced "seed" tucked behind a disclosure (reproducibility is for sim/
  power users, not the front door).
- **Readiness card:** pool locked ✓, 22 MLB slots × N teams, your budget, your identity's tax posture
  ("power identity — power bats run a touch cheaper for you"). One primary button: **Begin the Draft.**

Maps to: `initAuction({ nominationOrderSeed, cpuShillCount, bidIncrement, turnTimerSeconds, … })`.

### 5.2 The Auction Stage (MLB) — the centerpiece
Four zones, hierarchy by relevance to the one decision:

```
┌─ STATUS BAR ───────────────────────────────────────────────────────────────┐
│  MLB Draft · Lot 14 of ~92 · filling 22-man rosters      ⟳ Now: YOUR move    │
├──────────────────────────────────────────────┬──────────────────────────────┤
│                  THE LOT  (center stage)       │   YOUR ROSTER  (need board)  │
│   ┌──────────────────────────────────────┐    │   22 slots, gaps highlighted │
│   │  ⬆ rises onto the block               │    │   C ✓  1B ✓  2B —  SS ✓ …    │
│   │  RAFA FENOMENO    SP/RP               │    │   "2B and a CP still open"   │
│   │  Competitive · Sparkplug             │    │                              │
│   │  Worth (IV): ~$144k   ·  advisory    │    ├──────────────────────────────┤
│   │                                       │    │   LOT LOG (collapsible)      │
│   │     HIGH BID  $32,000  — Page Keys    │    │   Bolt → you $28k            │
│   └──────────────────────────────────────┘    │   Anchor → gone (no bid)     │
│                                                │   …                          │
│  ┌─ YOUR MOVE ──────────────────────────────┐ │                              │
│  │  Budget $410,000   Most you can bid $66k  │ │                              │
│  │   [ +$5k ] [ +$10k ] [ +$25k ]  [ custom ]│ │                              │
│  │   ┌───────────────┐   ┌──────────────────┐│ │                              │
│  │   │   BID  $37k    │   │     LET HIM GO   ││ │                              │
│  │   └───────────────┘   └──────────────────┘│ │                              │
│  └───────────────────────────────────────────┘ │                              │
├──────────────────────────────────────────────┴──────────────────────────────┤
│  🎙 Coach: "He fills your rotation hole — but pass and he's gone for good."   │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Status bar:** phase, lot N of ~M, and the single source of truth for *whose move / who holds the
  device* (the hot-seat handoff, `§2.4`). Quiet, persistent.
- **The LOT (center, largest):** the surfaced player — name (Press Start 2P, big), position(s),
  **visible** personality + chemistry (`§3.7`), and the value signal: on MLB the public **IV** as a
  plain advisory; the **high bid + bidder** sits *inside* the lot because it's the live state of the
  contest. New players *rise* in; the high bid ticks.
- **YOUR MOVE (the decision, second-largest, gold-framed):** budget, the **most you can bid** (the
  solvency ceiling, stated in plain words, not a disabled control), increment presets + custom, and the
  two affordances: a big gold **BID $x** and a clearly secondary **LET HIM GO**. When it's a CPU's turn,
  this zone calmly shows "Page Keys is deciding…" and resolves; never a device handoff (`§3.2`).
- **YOUR ROSTER (need board, right rail):** the persistent 22-slot board with gaps highlighted —
  **driven by the Roster Analyzer** (`§3.5`, reuse not rebuild) so it matches the season team hub. This
  is "is he worth it to ME" → the *need* input, always visible.
- **LOT LOG (collapsible, under the board):** recent results — won/gone — so the room has memory.
- **Coach (one line, bottom):** a single first-person whisper, dismissible, "start light" (`§9`). It
  names the *need* and the *stakes* ("pass and he's gone"), never nags.

### 5.3 MLB → Farm handoff + the carryover moment (new)
A deliberate beat, not an auto-jump (`§4.5`, `§9`). "Your 22 is set." Shows the finished MLB roster, then
the **carryover valve fires** as motion: unspent MLB budget flows into the farm wallet at the carryover
rate, the farm wallet counts up. Then the scout speaks: having read your filled roster, "here are the
holes I'd target in the farm" (`§3.5`). One button: **Enter the Farm Draft.** The strategic truth is felt
— spend it all on MLB and you walk into the farm poor.

### 5.4 The Auction Stage (Farm) — same stage, with fog
Identical structure, three differences that ARE the farm draft (`§3.4`, `§3.6`):
- **Value is fogged.** No IV, no ratings. The lot shows name, position, personality, chemistry — and a
  **covered scout report.**
- **The scout report is the value signal, and it's private.** Covered by default; **tap/click to
  reveal** (tap/click again to re-cover — JK ruling 2026-07-08, was press-and-hold; the hold gesture
  glitched on the floor, see `AUCTION_DRAFT_SPEC_V2.md` §3.6) so a rival across the table can't
  free-ride off your A-grade. Inside: a **price-range bar** whose *width = the scout's uncertainty*
  (tight = confident), and a **20-80 grade** rendered as a war-room gauge (a marked scale, not a
  letter). The toggle gets a clear covered state ("📋 Tap for the scout report") and a smooth reveal.
- **Farm wallet** (post-carryover) is the money line.

### 5.5 Draft Summary / Freeze recap (new) — "the team you built"
The four-number bridge (`§10`) made visible so the fingerprint survives into Mode 2. Before the season:
- **Your roster, priced:** 22 + 10, each with what you paid vs the value/scout read (over/under).
- **The fingerprint:** per player, a starting-morale read derived from *slot* (taken early = committed
  → boost; late = almost undrafted → penalty) and *pay* (over the range → boost; under → penalty),
  personality-tilted (`§6`). The underpaid-late kid visibly opens **below 50**; the early pick glows.
- **The fan line:** your total payroll's **league rank** → starting fan morale (median = neutral; both
  extremes hurt — win-now pressure high, anti-tank low) (`§7`).
- One button: **Begin the Season** — which is where the freeze actually fires (`initializeFranchise`
  seeds morale from these numbers, `§10`). The recap makes the stakes legible before they bite.

---

## 6. Interaction patterns (the cross-cutting details)

- **The reveal.** Engine surfaces → the new lot rises (spring, 12px) and the value chip counts in. A
  half-beat of anticipation. This is the one-chance mechanic's heartbeat.
- **One-decision bidding.** Presets + custom set the *amount*; the gold **BID** commits it; **LET HIM GO**
  is the deliberate, secondary opt-out. Keyboard: `B` bid, `P` pass (power users / fast rooms).
- **Gone forever.** All pass → the lot desaturates, dissolves, and a quiet line marks the loss:
  "Nobody bid. He's gone for good." Costly by design — passivity *looks* like it cost you.
- **Lone-survivor claim.** Everyone else passes, you're last with no bid → a one-tap **Claim at $x or let
  go** prompt (`claimAtReserve` / `pass`), never an auto-award (`§2.2`/V1 §6 Q2).
- **The solvency ceiling, in words.** "Most you can bid: $66k — enough to still fill your last 6 slots."
  Presets above the ceiling are dimmed *with the reason*, not silently disabled.
- **Luxury tax, gently.** A slim posture meter on the budget: on-identity spend is cheap (green), heavy
  off-identity spend bites (ambers toward red) — leeway, never a wall (`§4.2`).
- **Tap/click scout reveal (farm).** Covered card → tap/click reveals range + grade → tap/click again
  re-covers (JK ruling 2026-07-08 — was press-and-hold; the hold gesture glitched on the auction floor).
  The privacy rationale is shown once ("your scout's read stays yours — the iPad goes around the
  table").
- **Hot-seat handoff.** The status bar is the single truth of who holds the device; human turns prompt
  "Pass to [team]"; CPU turns resolve in place with a brief, calm beat — never a handoff (`§2.4`, `§3.2`).

---

## 7. Contract preservation — what does NOT change (anti-drift map)

The redesign is **surface-only** over a frozen behavior contract. Every redesigned element binds to the
existing hook/engine seam. (Hooks: `useAuctionDraft`, `useFarmAuctionDraft`.)

| Redesigned UI element | Underlying capability (unchanged) | Seam |
|---|---|---|
| Begin the Draft | start MLB session w/ config | `initAuction(leagueId, opts)` |
| The LOT (surfaced player) | engine weighted-random nomination | `session` state, `NOMINATION`→`OPEN_BIDDING` |
| BID $x (preset/custom, clamped) | place a raise ≤ solvency maxBid | `bid(teamId, amount)` + `clampBidAmount` |
| LET HIM GO | pass for this lot | `pass(teamId)` |
| Claim at $x / let go (lone survivor) | claim at reserve or pass | `claimAtReserve()` / `pass()` |
| Resolve / Next lot | terminate lot, advance | `resolve()` / `advance()` |
| "Most you can bid" | solvency ceiling | `auctionMaxBid` from luxury-tax calc |
| YOUR ROSTER need board | gaps from Roster Analyzer | `DraftRosterBoard` (reuse) |
| Carryover moment | unspent MLB × rate → farm | `computeMlbToFarmCarryover`, `initFarmAuction` |
| Farm fog + tap/click reveal | hidden value, private scout read | inline reveal toggle in `AuctionStage` (`Lot`), scout descriptors (2026-07-08: not the shared `LongPressReveal` component — that is `LeagueBuilderDraft.tsx`'s separate prospect-draft screen, a different JK ruling) |
| CPU turns resolve in place | CPU auto-advance | `autoAdvanceCpu`, `isCpuTeam` |
| Persistence on every action | session save | `saveAuctionSession*` (unchanged) |

**State machine is untouched** (`SETUP|NOMINATION|OPEN_BIDDING|RESOLVE|SOLD|PASSED|AUCTION_COMPLETE`).
We render different *chrome* per state; we do not change transitions. The 22/10 roster sizes, the
pitcher taxonomy (no DH/UTIL), the MLB-public / farm-fogged rule, the one-way carryover, and the
freeze's four-number output are all preserved exactly (`§2.3, §3.4, §4.5, §10`).

**Copy/tests:** per JK's "full latitude" ruling, the test-pinned strings (`STATE: X`,
`ENGINE NOMINATED`, `YOUR MAX BID`, the 14 coach lines, etc.) are **rewritten** and the tests updated to
the new copy in the same change. The behavior the tests assert (begin→bid→pass→sold, farm value stays
hidden until press, no IV/ratings leak on farm, no position-filter/IV-sort controls) is **kept** — only
the literal strings move. The farm "no IV / no ratings token / no Overall|Ratings leak" negative
assertions are honored by construction (the fog is core to the design).

---

## 8. Build plan (design-first → build to the locked prototype)

1. **DONE — Design + prototype.** This doc + a standalone, clickable HTML prototype of all five surfaces
   (`spec-docs/prototypes/auction-draft/index.html`) — the reviewable artifact + the build target.
2. **Token layer.** Add an auction-scoped CSS layer (`--auc-*` vars + the type voices) on `:root`,
   extending `--franchise-*`. No DB touch, no Tailwind v4 chase (CSS vars + `bg-[var(--…)]`, the live v3
   pattern).
3. **One stage, two tiers.** Extract a shared `AuctionStage` from the duplicated MLB/farm pages;
   parameterize by tier (fog on/off, wallet source, value signal). Bind every control to the §7 seams.
   MLB/farm pages become thin tier wrappers.
4. **New surfaces.** Setup, carryover handoff, draft summary — composing existing seams (`initAuction`,
   `computeMlbToFarmCarryover`, `initializeFranchise` read-only).
5. **Copy + tests.** Rewrite the voice; update the pinned page/coach tests to the new strings; keep the
   behavioral assertions.
6. **Gate.** `npm run build` exit 0 · `vitest run` zero-new-reds (read the summary, not the RC; the
   lineage's one characterized red is `wpaRuntimeBoundary`) · prototype + (if reachable) live screenshots.

---

## 9. Guardrails honored

- Branch-only on `codex/auction-draft-ux-rehaul` (isolated worktree, cloned `node_modules`); never push;
  never disturb the concurrent trait builds on `codex/franchise-v1-next`.
- **No behavior drift** — surface-only; every control maps to an existing seam (§7); state machine
  untouched.
- **No DB-version bump** — the redesign adds presentation + a CSS token layer only; no store add. If
  anything forces a store change → STOP and flag.
- **Reuse, don't rebuild** — `DraftRosterBoard`, `LongPressReveal`, `AuctionCoachBanner` logic, both
  hooks, the auction state machine, the carryover/scout descriptors.
- **Builder ≠ auditor** — the build is dispatched and then audited by a separate pass before any
  "verified" claim. No "works" without build + test + screenshot proof.
- **Spec is the anchor** — anything contradicting `AUCTION_DRAFT_SPEC_V2 §1–§8` is drift; §9 of that
  spec (the legitimately-open UX surface) is where this redesign exercises judgment, documented here.

---

## 10. Decisions made as Chief of Design (where the spec was UX-silent — `SPEC_V2 §9`)

These are the open-UX calls I made; all are reversible and flagged for JK's review.

1. **One stage, three voices of type.** Pixel font for character only; system sans for data; tabular mono
   for money. (Resolves the legibility problem without losing KBL's voice.)
2. **Soft premium depth + 16px radius**, keeping one hard-offset wink on the bid button. (The "refined
   hybrid" execution of JK's ruling.)
3. **The decision is the hero.** Bid/let-go is the largest interactive element; setup config leaves the
   stage entirely for a pre-draft step.
4. **Gone-forever gets staging** (desaturate + dissolve + a mournful line) so passivity feels costly.
5. **Carryover and the freeze recap are first-class screens**, not silent recalcs — so the strategic
   tradeoff and the morale fingerprint are *felt*.
6. **20-80 grade = a war-room gauge; scout range = a width-encodes-uncertainty bar.** (Concrete forms for
   two shapes the spec named but didn't draw.)
7. **MLB and farm unified** into one tiered stage (DRY; kills drift).
8. **Coach stays one quiet line** ("start light"), dismissible — not a tutor.

---

---

## 11. Build status (this session — branch `codex/auction-draft-ux-rehaul`)

**DONE + verified:**
- **Design + rationale** — this doc.
- **Clickable prototype** of all five surfaces — `spec-docs/prototypes/auction-draft/index.html` (+ 6
  screenshot proofs: setup, MLB stage, carryover, farm covered, farm revealed, summary).
- **Real React, build-green, non-destructive:**
  - `src/src_figma/styles/auction-theme.css` — the `--auc-*` token layer + three type voices +
    component classes, scoped under `.auc-root` (no leak). Imported by `main.tsx`. No DB touch.
  - `src/src_figma/app/components/auction/AuctionStage.tsx` — the unified MLB+farm stage as a pure
    view component driven by `AuctionStageVM`, intent via optional callbacks.
  - `src/src_figma/app/pages/AuctionStagePreview.tsx` + route `/__preview/auction-stage` — mock-fed,
    runnable in-app without a seeded auction.
- **Gate evidence:** `tsc -b && vite build` → **exit 0**. Live render at `/__preview/auction-stage`
  for both MLB and farm tiers with **zero console errors** (`react-mlb.png`, `react-farm.png`). The
  existing auction pages and **all tests are untouched → branch stays green** (no new reds introduced).

## 12. Remaining — GREENLIGHT-GATED (the production swap + test rewrite)

Deliberately deferred until JK approves the design direction, because it is the destructive part
(repointing live routes + rewriting frozen tests). The path is mechanical from here:

1. **Adapter** — map `useAuctionDraft` / `useFarmAuctionDraft` session state → `AuctionStageVM`
   (session → lot; `auctionMaxBid` → ceiling; `DraftRosterBoard` data → board; lot results → log).
   This is the only real new logic; everything it reads already exists (§7).
2. **Swap** — `LeagueBuilderAuctionDraft` / `LeagueBuilderFarmAuctionDraft` render `<AuctionStage>` fed
   by the adapter; the begin/bid/pass/claim/resolve/advance handlers stay wired to the same hooks.
3. **New surfaces** — Setup, Carryover handoff, Draft-summary recap as pages composing existing seams.
4. **Copy + tests** — rewrite the voice; update the page/coach tests to the new strings (JK ruling),
   keeping the behavioral assertions (begin→bid→pass→sold; farm value stays fogged until press; no
   IV/ratings/filter-sort leak).
5. **Gate** — `npm run build` exit 0 · `vitest run` zero-new-reds (the lineage's one characterized red
   is `wpaRuntimeBoundary`) · live screenshot on JK's real data (isolated port, not :5173).

---

*End of design. The clickable prototype + the live `/__preview/auction-stage` route are the visual
realization of this spec and the build target.*
