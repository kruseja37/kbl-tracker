# FABLE ROSTER-DESIGNER LAYOUT — "THE TWENTY-TWO" (Draft Room zone 3)

**Author:** Fable 5 (design authority) · **Date:** 2026-07-02 · **Status:** BINDING build spec
**Realizes:** FABLE_C4B_CHECKPOINT_2026-07-02.md §2 zone 3 ("Design your roster" — the 22-slot
per-position archetype/tag/tilt designer with the live feasibility verdict chip).
**Governed by:** UX_NORTH_STAR.md §1 (register) · §4 (help layer) · §6 (copy) · §9 (checklist).
**Engine contract (design AROUND, never redefine):** `src/engines/rosterDesignFeasibility.ts`
(`DesignSlot`, `SlotPreference`, `buildDefaultDesignSlots`, `evaluateRosterDesign`,
`DesignFeasibilityResult`) + `src/data/playerArchetypeTaxonomy.ts` (`menuForPosition`,
`PersonalityTilt`, `ExtendedShapeDefinition.identityLine`) +
`src/engines/playerArchetypeClassifier.ts` (`shapeAlignmentScore`, `pitcherAlignmentGroupFor`).
**Host:** `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx` zone 3 — replaces the
"Design your roster · POOL-FROM-DEMAND COMING" placeholder (~:917-920). Builder: Codex.
Auditor: Opus, against §7 below. I design-review the built screen.

---

## §1. DESIGN INTENT

The designer is a **lineup card, not a form**. A club's design is 22 slot rows grouped the way
a manager thinks — the lineup, the staff, the bench — every slot starting **open** ("ANY"), so
the default design is always buildable and the GM only spends attention where he has an
opinion. One slot is selected at a time; one editor panel serves all 22 (no wall of 22 forms).
The feasibility verdict is a single chip pinned in the designer's header — always in view,
recomputed live on every edit, speaking plain baseball ("BUILDS · $3.4M to spare" /
"2 SPOTS WON'T FILL"). Shapes are sold by their honest identity line ("Power AND average →
pays for it with the glove and legs"); alignment with the club's declared identity is a brass
**FITS YOUR IDENTITY** tag — identity fit, never "best value" (the recorded trap guard). The
whole surface mounts inside zone 3's existing detail well, using the same select-a-card →
brass-bordered editor idiom the ArchetypePicker already taught the user.

---

## §2. COMPONENT / LAYOUT STRUCTURE

### 2.1 Entry point (the club card, zone 3 grid)

On each **human-owned** club card, next to the existing "set identity" link (same link style,
`text-[11px] font-bold text-[var(--ballpark-brass)] hover:underline`):

- Untouched design → `design your roster ›`
- Edited design → `✓ design set · edit` + a 6px status dot (green/amber/red = last verdict)
- Mode A, locked → `design locked · view` + brass `LOCKED` micro-badge

CPU-owned cards **never** show the link (CPU clubs ride the league floors; they don't design).
Clicking the link selects the club AND opens the designer in the detail well below the card
grid — the same well that hosts the ArchetypePicker (`mt-4 border-4
border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] p-4`). **One editor at a time:** the
well shows either the identity picker or the designer; opening one replaces the other (a
per-club editor mode `'identity' | 'design' | null`, not a stack).

### 2.2 The designer (inside the detail well) — labeled tree

```
ROSTER DESIGNER  (well container, brass border — existing zone-3 detail well)
├── HEADER STRIP  (ballpark-panel-strip idiom: well bg, brass bottom border; sticky top of well)
│   ├── Title (chrome, ALL-CAPS): "THE TWENTY-TWO · {CLUB NAME}"
│   ├── VERDICT CHIP  (§4 — right-aligned, always visible)
│   ├── Source line (11px, chalk/55): "Checked against {the locked pool | today's pool | your player list}"
│   ├── RESET press button (ballpark-press-button, press-sm) → inline ✓/✗ confirm (§2.5)
│   └── Mode A only: LOCK DESIGN / UNLOCK press button (ballpark-press-gold, press-md)
├── SLOT BOARD  (3 group columns on desktop ≥lg, stacked on mobile; grid gap-4)
│   ├── Group "THE LINEUP" (8): C · 1B · 2B · 3B · SS · LF · CF · RF
│   ├── Group "THE STAFF" (8): SP1-SP4 · RP1-RP4
│   └── Group "THE BENCH" (6): BACKUP C · BENCH 1-4 (slotIds FLEX1-4) · SWING
│       Each group: micro-label header (11px bold tracked, brass) + vertical stack of SLOT ROWS
│       SLOT ROW (a press-physics row button, full group width, 2px border):
│       ├── left: slot label (chrome bold, e.g. "SS", "SP2", "BENCH 3")
│       ├── middle: ask summary — "ANY" (chalk/45) or "{SHAPE NAME}" (chalk),
│       │           "+N" suffix when N tag filters set, "≈" amber glyph when the last
│       │           resolution came via runner-up
│       ├── right: candidate count "×{candidateCount}" (11px chalk/55) + status glyph
│       │          (green ● matched · red ✕ blocker · nothing pre-evaluation)
│       └── states: selected = brass border + #3a4d3c bg (the zone-3 selected idiom);
│                   blocker = red border (--ballpark-status-red-bright at 2px)
├── SLOT EDITOR  (full width below the board; renders ONLY when a slot is selected;
│                 default selection on open = none → board only)
│   ├── Editor caption (chrome): "{SLOT LABEL} — THE ASK"
│   ├── LEFT column (~60%): SHAPE LIST (self-scrolling, max-h ~320px, recessed well bg)
│   │   Row per shape (press-physics option row):
│   │   ├── "ANY SHAPE" — always first, selected by default
│   │   ├── shape name (chrome bold) + identity line (human voice, Tox, chalk/70)
│   │   ├── brass tag "FITS YOUR IDENTITY" on the top-3 positive alignment scores
│   │   │   (shapeAlignmentScore vs the club's MLB archetype; pitcher slots use
│   │   │   pitcherAlignmentGroupFor; hidden entirely when no identity is set)
│   │   ├── count chip "×{n}" (players matching at this slot, runner-up included)
│   │   └── n = 0 → row at 45% opacity, disabled (Mode B gray-out rule; Mode A: same
│   │       rule against the player list)
│   └── RIGHT column (~40%): the four small controls (§3) — NEAR MATCHES toggle,
│       TAGS group, TEMPERAMENT segmented, stacked with micro-labels
└── BLOCKERS LIST  (renders only when blockers exist; below the editor)
    └── one ballpark-feed-card per blocker, left border --ballpark-status-red-bright
        (budget/legality blockers: left border warn token), message = the engine's
        `blocker.message` VERBATIM (it is already plain language). Tapping a slot
        blocker selects that slot in the board.
```

Layout notes:
- The shape list is the only self-scrolling region; the board never scrolls (22 rows fit).
- No new page-level scroll behavior beyond what the Draft Room page already has.
- All colors/typography from `ballpark-kit.css` tokens. One sanctioned token addition:
  `--ballpark-status-warn: #fbbf24` (already in the north-star §1 status ramp; the kit
  lacks the var — add it to ballpark-kit.css, do not inline the hex).
- No modal. No `window.confirm`. Press physics on every interactive row/button.

### 2.3 Menus per slot kind (consume the taxonomy, don't invent)

| Slot kind | Shape menu source |
|---|---|
| `pos` (the 8) | `menuForPosition(position)` |
| `backupC` | `menuForPosition('C')` |
| `sp` (SP1-4) | `menuForPosition('SP')` |
| `rp` (RP1-4) | `menuForPosition('RP')` |
| `flex` (BENCH 1-4) | all hitter-role shapes + Balanced, two labeled groups: "BENCH STOCK" (the depthClass shapes: Bench-Bat, Pinch-Runner, Roster-Filler) first, then "EVERYDAY SHAPES" |
| `swing` | two labeled groups: "BATS" (hitter list as flex) then "ARMS" (`menuForPosition('RP')`) |

Menu order inside a group: as returned by `menuForPosition` (affinity-sorted); "ANY SHAPE"
always first overall.

### 2.4 Live evaluation

`evaluateRosterDesign(slots, pool, budget)` runs on **every edit**, debounced ~200ms, and on
open. Pool classification memoized per pool identity (the builder memoizes the classified
pool, not the engine — the engine stays pure). Budget = **the league tier's cap** — the same
number the auction floor seeds each club with (`useAuctionDraft` seeds `budget:
pool.tierCap`; pre-pool in Mode A, resolve the cap from `league.tier`). Codex re-verifies the
exact accessor at point of use. Pool argument per mode: §5.

### 2.5 Reset + default state

- First open of a club's designer: seed from `buildDefaultDesignSlots()` + the key-role
  temperament defaults (§3) → every slot "ANY", verdict chip green on any sane pool. No
  onboarding prose inline — the help layer (§6.2) carries it.
- **RESET** (header strip): restores that same seeded default. Inline two-step confirm —
  the button swaps to `SURE? ✓ / ✗` in place (the north-star inline ✓/✗ pattern for
  destructive row actions); ✓ resets, ✗ or clicking elsewhere cancels.

### 2.6 Persistence (the wiring pattern, Codex verifies the write path)

Additive field on the existing `Team` record in the LeagueTemplate store — the exact
precedent of `mlbArchetypeKey`/`gmSeatId` (checkpoint §3: seat-spine ADDITIVE, **no new
IndexedDB**): `rosterDesign?: { slots: DesignSlot[]; lockedAt?: string }`. Save on edit
(debounced with the evaluation), not on close. A reloaded Draft Room shows the saved design
and its recomputed verdict. Absent field = never designed = the seeded default on open.

---

## §3. PER-CONTROL DECISIONS

| Element | Control | Options | Default | Shown on |
|---|---|---|---|---|
| Slot selection | press-physics slot rows (board) | 22 slots | none selected | always |
| Shape | option-row list (scrolling; identity line + alignment tag + count per row) | "ANY SHAPE" + the slot-kind menu (§2.3) | ANY SHAPE | all slots |
| Near matches (`allowRunnerUp`) | toggle, micro-label "NEAR MATCHES COUNT" | on/off | **ON** (engine default true) | only when a shape is asked |
| Bats (`tags.bats`) | segmented: ANY · L · R · S | 4 | ANY | hitter slots (pos, backupC, flex, swing) |
| Lefty arm (`tags.leftArm`) | toggle "LEFTY ARM" | on/off | off | pitcher slots (sp, rp) + swing |
| Utility (`tags.utility`) | toggle "PLAYS MULTIPLE SPOTS" | on/off | off | hitter slots |
| Two-way (`tags.twoWay`) | toggle "TWO-WAY" | on/off | off | all slots |
| Platoon side (`tags.platoonSide`) | segmented: ANY · VS LHP · VS RHP | 3 | ANY | hitter slots |
| Temperament (`personalityTilt`) | segmented: ANY · STEADY · NO FRAGILE · EGO WELCOME | maps to `'any' \| 'prefer-steady' \| 'avoid-fragile' \| 'embrace-volatility'` | ANY — **except C, SS, SP1 default NO FRAGILE** (the taxonomy §2.2b key-role default; the CP entry applies only if a CP slot ever joins the frame) | all slots |
| Reset | press-sm + inline ✓/✗ | — | — | header strip |
| Lock design | ballpark-press-gold, press-md | LOCK DESIGN ↔ UNLOCK | unlocked | **Mode A only**, header strip |

Rules:
- Inapplicable controls are **hidden**, not disabled (no empty chrome).
- There is **no arsenal control** — `SlotPreference.tags` has no arsenal field; the UI maps
  1:1 onto the engine type and adds nothing.
- The temperament control is a preference the engine weighs, never a filter — the UI must
  not remove candidates by tilt (anti-starve; the engine already enforces this, the UI must
  not "help").
- Tags apply only alongside or without a shape exactly as the engine treats them; no UI-side
  pre-filtering of the pool beyond the count chips (counts are display, the engine decides).

---

## §4. THE VERDICT CHIP — rendering rules

One chip, header strip, right-aligned. Two lines: **state line** (chrome caps, bold) +
**cost line** (11px): `EST. {totalCost} OF {budget}` in the screen's existing money format.
Derived from `DesignFeasibilityResult`:

| Priority | Condition (from the result) | State | Visual (kit tokens) | State-line copy |
|---|---|---|---|---|
| 1 | any blocker with `kind==='no-match'` and `slotId!=='legality'` | **RED** | border+text `--ballpark-status-red-bright` on well bg | `{N} SPOT{S} WON'T FILL` |
| 2 | blocker `slotId==='legality'` | **AMBER** | border+text `--ballpark-status-warn` | `FILLS · NOT A LEGAL 22` |
| 3 | blocker `kind==='budget'` | **AMBER** | same | `OVER BUDGET · {over} OVER` |
| 4 | `feasible === true` | **GREEN** | border+text `--ballpark-status-green` | `BUILDS · {headroom} TO SPARE` |
| — | no pool/list to check against (Mode A, empty player list) | **QUIET** | chalk/45, no color border | `NOTHING TO CHECK AGAINST YET` |

- Precedence is top-down: red beats amber beats green; one state shows at a time.
- Amber headroom note: when GREEN and headroom < 5% of budget, append nothing — the cost
  line already says it; no second warning voice.
- Per-slot echo: every blocker paints its slot row red (§2.2) AND appears verbatim in the
  BLOCKERS list. The chip carries the count; the slots carry the where; the feed-cards carry
  the why. Nothing else on the surface restates the verdict (earn-its-place rule).
- The estimate caveat ("prices here are asking prices — the room sets the real ones") lives
  in the help layer ONLY, never inline.
- Runner-up matches: the slot row shows the amber `≈` glyph; the chip does NOT change state
  for runner-up fills (they are matches by contract).

---

## §5. MODE A vs MODE B

| Aspect | Mode A — "Design first" | Mode B — "Pool first" |
|---|---|---|
| Designer presence | Primary tool: link prominent on every human club card; designs **drive extraction** | Optional planning tool: same link, lower stakes; the design later seeds the GM's draft board |
| Evaluation target (`pool` arg) | Pre-extraction: **the league's full player list** (the same set the shuttle draws from — in-pool + available). Post-extraction/lock: **the locked pool** (the §6.1 drift re-check) | The current in-pool set; label "today's pool" until locked, "the locked pool" after |
| Source line copy | "Checked against your player list" → "Checked against the locked pool" | "Checked against today's pool" / "…the locked pool" |
| Shape-row counts + gray-out | Counts vs the player list; 0 → gray (the ask is impossible anywhere) | Counts vs the pool; 0 → gray at 45%, disabled (the checkpoint's gray-per-pool-presence rule) |
| LOCK DESIGN | Present. Enabled only on **GREEN**; amber/red shows a plain hint under the button: "Fix the blockers first — the pool gets built from locked designs." Locked = board+editor read-only, UNLOCK button shown (allowed until the pool locks; after pool lock, unlock allowed again for the iterate loop — designs stay editable, the drift check re-runs) | Absent |
| Drift after pool lock (Mode A) | Slots whose ask no longer resolves against the locked pool get the red row + blocker card automatically (same rendering, new pool arg — no special "drift" UI) | n/a |
| Zone-4 tie-in (wiring correction) | Zone 4's "Designs locked: N of M clubs" counts **human-owned clubs only** as M (CPU clubs never design — today's code divides by all league teams; fix in this build) | n/a |
| CPU clubs | No link, no designs (they ride the league floors) | same |

---

## §6. COPY (register-checked; §6 banned-word list applied)

### 6.1 Chrome strings

| Where | String |
|---|---|
| Card link (fresh / edited / locked) | `design your roster ›` / `✓ design set · edit` / `design locked · view` |
| Designer title | `THE TWENTY-TWO · {CLUB NAME}` |
| Group headers | `THE LINEUP` · `THE STAFF` · `THE BENCH` |
| Slot labels | `C 1B 2B 3B SS LF CF RF` · `BACKUP C` · `SP1…SP4` · `RP1…RP4` · `BENCH 1…BENCH 4` · `SWING` |
| Open-ask summary | `ANY` |
| Shape list first row | `ANY SHAPE` |
| Alignment tag | `FITS YOUR IDENTITY` |
| Count chip | `×{n}` |
| Editor caption | `{SLOT LABEL} — THE ASK` |
| Toggles | `NEAR MATCHES COUNT` · `LEFTY ARM` · `PLAYS MULTIPLE SPOTS` · `TWO-WAY` |
| Segmented sets | `ANY · L · R · S` · `ANY · VS LHP · VS RHP` · `ANY · STEADY · NO FRAGILE · EGO WELCOME` (caption `TEMPERAMENT`) |
| Buttons | `RESET` → `SURE? ✓ / ✗` · `LOCK DESIGN` · `UNLOCK` |
| Verdict states | per §4 table |
| Cost line | `EST. {cost} OF {budget}` |
| Source lines | per §5 table |
| Mode A lock hint (amber/red) | `Fix the blockers first — the pool gets built from locked designs.` |

Blocker card bodies: the engine's `blocker.message` **verbatim** (already plain: "No Slugger
matching your filters available for SS — 4 eligible players exist ignoring Slugger + your tag
filters." / "The design fills, but costs … Priciest asks vs their market: …"). Do not reword
in the UI; if a message ever needs a copy change it changes in the ENGINE (one voice, one
source).

### 6.2 Help-layer annotations (zone 3, shown only when the screen's one `?` is on)

Three `HelpNote` blocks inside the designer (added to zone 3's existing help set):

1. **What the design is (mode-aware):**
   - Mode A: "Your design tells the league what to stock the draft with. Set the kind of
     player you want at each of the 22 spots — the pool gets built to meet the room's asks,
     then everyone bids from it. Leave a spot on ANY and you're happy taking the best deal
     there."
   - Mode B: "The pool is already set — use the design to sketch your build. The check tells
     you whether the pool can actually hand you this roster, and roughly what it would run."
2. **The check:** "The check fills your 22 with the cheapest players that fit each ask.
   Prices here are asking prices — the room sets the real ones. Green means it builds; the
   red cards name exactly what's in the way."
3. **Shapes, tags, temperament:** "A shape is a player's strengths and the weaknesses that
   come with them — taking a weakness on purpose is how you free up money for the spots you
   care about. FITS YOUR IDENTITY means a shape runs cheap under your club's identity — fit,
   not a bargain guarantee. Tags narrow the ask (lefty, switch, utility). Temperament is a
   preference, not a rule — if the best fit is a fragile head, you'll hear about it, not be
   blocked from him."

No other inline prose anywhere on the surface. Empty states: none needed beyond the QUIET
chip state (§4) — the board itself is never empty.

---

## §7. VERIFICATION CHECKLIST (Opus audits the build against this + north-star §9)

```
ROSTER DESIGNER — CONFORMANCE
ENGINE BINDING
□ Slots seeded from buildDefaultDesignSlots(); slotIds untouched (FLEX1-4 display as BENCH 1-4 only)
□ SlotPreference mapped 1:1 — shape, allowRunnerUp, the 5 tag fields, personalityTilt; NO extra
  fields, NO arsenal control, NO UI-side tilt filtering or pool pre-filtering
□ evaluateRosterDesign called with (slots, mode-correct pool per §5, tier-cap budget);
  debounced ~200ms; classified pool memoized outside the engine
□ Blocker messages rendered verbatim (no UI rewording)
LAYOUT
□ 22 slots grouped 8/8/6 under THE LINEUP / THE STAFF / THE BENCH; one slot editor, not 22 forms
□ Designer mounts in the zone-3 detail well; identity picker and designer never open together
□ Verdict chip in the header strip, visible during any edit; shape list is the only scroller
□ Shape menus per §2.3 (menuForPosition; flex/swing group rules); ANY SHAPE first everywhere
□ Alignment tags: top-3 positive shapeAlignmentScore vs the club's MLB identity; bullpen group
  for RP slots; absent when no identity set; labeled FITS YOUR IDENTITY (never value language)
STATES
□ Verdict precedence red > amber(legality) > amber(budget) > green; QUIET state on empty list
□ Blocker slots painted red on the board; feed-cards listed; tapping a card selects the slot
□ Runner-up fills show ≈ on the slot row and do NOT degrade the chip state
□ Key-role temperament defaults: C, SS, SP1 = NO FRAGILE; all else ANY
□ Mode B: 0-count shape rows grayed 45% + disabled with ×0; Mode A: LOCK gates on GREEN,
  UNLOCK per §5; zone-4 locked-count denominator = human clubs only
□ CPU club cards show no designer link in either mode
PERSISTENCE
□ rosterDesign additive on Team in the LeagueTemplate store (no new IndexedDB); survives
  reload with recomputed verdict; save debounced with evaluation
KIT / COPY
□ Tokens only; the ONE addition is --ballpark-status-warn: #fbbf24 in ballpark-kit.css
□ Press physics on slot rows, option rows, buttons; inline ✓/✗ reset; no modal, no window.confirm
□ §6 banned-word grep clean over every string in §6.1/§6.2; chrome ALL-CAPS; help prose only
  behind the ? toggle
□ GameTracker untouched (git diff confirms)
```
