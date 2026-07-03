# FABLE MODE-A POOL LAYOUT — "THE ORDER DESK" (Draft Room zone 4, Design first)

**Author:** Fable 5 (design authority) · **Date:** 2026-07-02 · **Status:** BINDING build spec
**Realizes:** FABLE_C4B_CHECKPOINT_2026-07-02.md §2 zone 4, Mode A ("Designs locked: N of M
clubs" → EXTRACT POOL → proposed-pool review → add/subtract → LOCK).
**Governed by:** UX_NORTH_STAR.md §1 (register) · §4 (help) · §6 (banned words) · §9 (checklist).
**Sibling spec:** FABLE_ROSTER_DESIGNER_LAYOUT_2026-07-02.md (zone 3 — the designs this zone
consumes; its §4 verdict-copy table is reused verbatim here).
**Engine contract (design AROUND, never redefine):** `src/engines/poolFromDemand.ts`
(`extractPoolFromDemand`, `PoolFromDemandResult`, `DemandCellReport`, `DemandShortfall`) +
`src/engines/rosterDesignFeasibility.ts` (`evaluateRosterDesign`, `DesignFeasibilityResult`) +
`src/utils/leagueBuilderPoolBuilder.ts` (membership + `lockLeaguePool` + sufficiency).
**Host:** `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx` zone 4 — replaces the
"POOL-FROM-DEMAND COMING" placeholder (~:1039-1048). Builder: Codex. Auditor: Opus, against
§6 below. I design-review the built screen. File:line cites are from the 2026-07-02 read;
Codex re-verifies at point of use.

---

## §1. DESIGN INTENT

Mode A's zone 4 is an **order desk, not a second workshop**. The clubs already said what they
want (zone 3's locked designs); this zone takes the order, draws a right-sized pool from the
league's player list in one press, and hands the owner a **receipt he can argue with**: how
many bodies, whether every club's design still builds, what the player list couldn't supply,
and the full ledger of asks. The argument happens in the same shuttle the owner already knows
from Pool first — the extracted players land in the IN pane, the rest of the list waits in
AVAILABLE, and add/remove works exactly as taught. **Mode A's review IS Mode B's pool floor
with a demand ledger on top.** One new verb (EXTRACT), zero new lock plumbing: membership is
the persisted truth in both modes, so the same LOCK freezes the same thing. The engine's
plain-language findings (shortfall messages, blocker messages) render verbatim — this spec
writes only the chrome around them.

---

## §2. THE FOUR STATES — detection, flow, layout trees

### 2.1 State detection (all from persisted signals — reload-safe)

| State | Condition (evaluated in this order) |
|---|---|
| **A4 · LOCKED** | `poolRecord.locked` (existing `locked`, :371) |
| **A3 · REVIEW** | not locked AND `league.poolExtractedAt` is set (§4.4 — new additive field) |
| **A1 · WAITING** | not locked, never extracted, AND `designsLocked < humanTeams.length` |
| **A2 · READY** | not locked, never extracted, AND every human design locked |

`designsLocked` / `humanTeams` exist (:466-481). The denominator is **human clubs only** —
the sibling spec's §5 wiring correction applies to this zone's copy too. Edge: a league with
zero human clubs (`humanTeams.length === 0`) resolves to A2 with the no-designs line (§5.1);
extraction then rides the identity floors alone — the engine handles it (CPU clubs contribute
no cells by design).

State transitions: A1 ↔ A2 as designs lock/unlock in zone 3 · A2 → A3 on EXTRACT ·
A3 → A3 on RE-EXTRACT · A3 → A4 on LOCK · A4 → A3 on UNLOCK. A design unlocking during A3
does NOT leave A3 — it marks the review **stale** (§4.3).

### 2.2 States A1 + A2 — the order desk plate (NEW, thin)

Replaces the placeholder well (:1040-1045). Same container idiom
(`border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-5`):

```
ZONE 4 · THE POOL  (PanelWithHeaderStrip — existing, REUSE :1033)
├── HelpNote (mode-aware; REPLACES today's one-liner :1035-1037 — copy §5.3) — REUSE HelpNote (:1372)
└── ORDER DESK WELL  (NEW block, existing well idiom)
    ├── Title line (chrome caps, brass, text-sm font-bold):
    │     A1 → "WAITING ON DESIGNS"   ·   A2 → "EVERY DESIGN IS IN"
    ├── Progress line (text-sm, chalk/70):
    │     A1 → "{n} of {m} designs in. Still to come: {Club — GM, Club — GM, …}"
    │     A2 → "Ready to build the pool to order." (or the zero-human line, §5.1)
    └── EXTRACT POOL  (PressButton — REUSE — variant gold, size lg, Download icon)
          disabled in A1 (+ existing busy/savedDraftMutationBlocked); busy label §5.1
```

The who's-left list names **club — GM** (both are on screen in zones 2/3; naming the club
alone hides who to nag). No second counter anywhere in the zone (the zone-3 card badges
already carry per-club state; earn-its-place).

### 2.3 State A3 — the review (top to bottom inside the zone-4 panel)

```
ZONE 4 · THE POOL  (PanelWithHeaderStrip — REUSE)
├── HelpNote (same mode-aware note) — REUSE
├── STALE BANNER  (only when stale, §4.3) — REUSE ballpark-feed-card, left border
│     --ballpark-status-warn; one line, copy §5.1. NEW use of existing primitive.
├── COUNT + ACTIONS ROW — REUSE the Mode-B row wholesale (:1144-1185):
│   ├── sufficiency chip (evaluatePoolDemandSufficiency — IDENTICAL markup/logic; the
│   │     app's ONE pool-sufficiency readout, per the checkpoint dedupe rule)
│   ├── RE-EXTRACT  (PressButton default, size sm, Download icon) — REPLACES the Mode-B
│   │     "Import from branded teams" button in this mode (§3.5); inline ✓/✗ confirm
│   │     when manual edits exist (§4.2)
│   └── LOCK POOL (gold, shadow 4) — REUSE handleLock (:706) + button idiom (:1167-1175);
│         gating §4.5; inline ✓/✗ confirm when any club verdict is non-green
├── THE CLUB CHECK  (NEW block — compact rows, well container border-4 panel-border)
│     one row per human club (§3.3): tone dot + "{Club} · {GM}" + right-aligned state text
├── THE GAPS  (NEW block; renders only when shortfalls exist)
│     one ballpark-feed-card (REUSE primitive) per DemandShortfall, left border
│     --ballpark-status-warn, message VERBATIM (§3.2)
├── THE ASKS  (NEW block — compact table in a recessed self-scrolling well, §3.1;
│     renders only when demand cells exist; else the one quiet line, §5.1)
└── THE PLAYERS — REUSE the Mode-B shuttle VERBATIM (§3.4):
      Pane ×2 (:1677) + Row (:1744) + arrows + FocusedPlayerPanel (:1294) + edit-modal
      path + handleAdd/handleRemove (:686-698). IN THE POOL = current membership
      (extraction wrote it); AVAILABLE = the rest of the league's player list.
```

Order rationale: the chip answers "enough bodies?", the club check answers "does everyone
still build?" — those two lines are the lock decision. The gaps explain the misses, the asks
table is the full receipt, and the shuttle is the adjustment tool. Decision-first, detail
below, tools last.

### 2.4 State A4 — locked

Identical composition to A3 with the Mode-B locked deltas, all existing behavior:

- LOCK POOL → **UNLOCK** (REUSE handleUnlock + button, :1177-1184); RE-EXTRACT hidden.
- Shuttle panes render disabled via the existing `poolEditingBlocked` path (no new code).
- **Archetype market outlook panel** (:1187-1216) renders — REUSE the exact block; it is
  already gated on `locked` and is mode-agnostic. Builder factors the shared JSX out of the
  pool-first branch rather than duplicating it.
- THE CLUB CHECK stays live, now computed against the locked membership — this **is** the
  §6.1 hub-drift check surfaced: if the owner unlocks designs and a club edits after pool
  lock, its row goes red/amber here with zero special "drift" UI.
- THE GAPS + THE ASKS stay (the receipt remains readable); stale banner rules unchanged.

---

## §3. THE REVIEW COMPOSITION — the five decisions

### 3.1 The demand cells → **a compact table ("THE ASKS"), not a grouped list**

One row per `DemandCellReport`. A table wins because every row carries the same four numbers
and the whole point is scanning WANTED vs IN POOL down a column; a grouped list would spend
two lines per cell saying the same thing slower. Recessed well
(`bg-[var(--ballpark-well)] border-2 border-[var(--ballpark-panel-border)]`), self-scrolling
`max-h` ~280px — the table is the zone's only new scroller.

| Column | Content | Source |
|---|---|---|
| `SPOT` | position, or the kind label for kindless slots (`BACKUP C` / `SP` / `RP` / `BENCH` / `SWING`) | parse `cell.key` (format `position-or-kind\|shape\|tagJSON`, split at the first two `\|`) |
| `SHAPE` | shape name (chalk) + `+N` suffix (chalk/55) when N tag filters are in the ask | key segments 2 + 3 (tag count = keys of the parsed tag JSON) |
| `ASKING` | `{asks} club{s}` | `cell.asks` |
| `WANTED` | `cell.wanted` | engine (asks × contest) |
| `IN POOL` | live count of current in-pool players matching the cell (colored, below) | §3.1a |
| (echo) | rows whose ask came via ≥2 clubs need no marker — ASKING says it | — |

Sort: board order (C 1B 2B 3B SS LF CF RF · SP RP · BACKUP C BENCH SWING), then shape name.
Header row: 11px bold tracked chalk/55.

**3.1a — the IN POOL count mirrors the engine, never tightens it.** The engine's cell matcher
reserves by **shape (or allowed near-match), league-wide — tags and position are labels on
the ask, not filters on the match** (poolFromDemand.ts:150-155). The live column must use the
IDENTICAL rule or the table lies against the engine's own `reserved` accounting. To make
drift impossible, the builder adds one tiny pure export to `poolFromDemand.ts` —
`countCellMatches(classifiedPlayers, preference)` — extracted from the existing step-3 filter
(additive seam, zero math change), and the UI calls it with the classified in-pool set (reuse
the classified-pool memo pattern from RosterDesigner.tsx:369-371). Right after an extraction,
IN POOL ≥ WANTED by construction for every non-shortfall row.

Row color on the IN POOL number: ≥ WANTED → `--ballpark-status-green` · ≥ ASKING but
< WANTED → `--ballpark-status-warn` · < ASKING → `--ballpark-status-red-bright`. The number
carries the color; the row text stays chalk (no row flooding).

All-ANY designs produce zero cells: render the single quiet line (§5.1) instead of an empty
table — no empty chrome.

### 3.2 The shortfalls → **feed-cards ("THE GAPS"), warn-amber, verbatim**

One `ballpark-feed-card` per `DemandShortfall`, left border `--ballpark-status-warn`, body =
`shortfall.message` **VERBATIM** (it is already plain: "Your league wants 6 pure-slugger at
SS (3 clubs asking × contest); the uploaded universe holds 3."). Warn, not red: the C1B
floors guarantee draft completion regardless — a gap thins the contest on an ask, it does not
break the draft. Amber is the honest register. No card header, no icon clutter; the block's
micro-label `THE GAPS` (11px bold tracked brass) is the only chrome.

Shortfalls are **player-list facts, not pool facts** — adding players from AVAILABLE cannot
cure them (every AVAILABLE player is already in the list the engine searched). Therefore the
cards refresh only on (re-)extraction, never on shuttle edits, and the help note (§5.3)
carries the one sentence explaining that. If a message ever needs rewording it changes in the
ENGINE (one voice, one source — same rule as the designer spec).

### 3.3 The per-club verdicts → **compact rows ("THE CLUB CHECK"), computed LIVE**

One row per human club: 6px tone dot + `{Club} · {GM}` (chalk, text-sm) + right-aligned state
text in the tone color. State text and precedence come **verbatim from
FABLE_ROSTER_DESIGNER_LAYOUT §4** (one copy source): `BUILDS · {headroom} TO SPARE` green ·
`FILLS · NOT A LEGAL 22` / `OVER BUDGET · {over} OVER` amber · `{N} SPOT{S} WON'T FILL` red.

Computed live against **current membership** on every shuttle edit — not read once from the
extraction snapshot — via `evaluateRosterDesign(design.slots,
buildRosterDesignPool(inPoolPlayers), tierBudget)` (adapter RosterDesigner.tsx:77; tone via
`rosterDesignStatusTone` :150, already imported by the host :26). Debounce with the same
~200ms rhythm as the designer; memoize the classified pool per membership identity. Live is
the point: the owner's add/remove must visibly repair (or break) a club's build before he
locks. The engine's `designVerdicts` (from the extraction result) are the same math at
extraction time — the builder MAY render from them for the first paint, but the live recompute
is the binding source afterward.

Rows are not buttons in v1 (the fix tool is the shuttle directly below; a tap-to-filter
refinement can ride later). No CPU rows — CPU clubs have no designs; listing them would be
empty chrome.

### 3.4 The player review → **REUSE the Mode-B shuttle wholesale. Not a lighter view.**

The decision, and why it is not close:

1. **Membership is the single persisted truth in both modes.** Extraction writes membership
   (§4.1); `lockLeaguePool` → `registerLeaguePoolForLeague` freezes membership. The shuttle
   already renders, filters, edits, and locks exactly that. A lighter read-only list would
   still need add/subtract (the checkpoint requires it) — meaning selection, search, position
   filters, and both directions — i.e., the shuttle rebuilt worse.
2. **The idiom is already taught.** Pool-first owners learned IN/AVAILABLE + Add/Remove; Mode
   A showing the same panes says "same pool, different way of arriving at it," which is the
   true mental model.
3. **The extras come free:** FocusedPlayerPanel, the player-edit modal path, the 500-row
   AVAILABLE cap, the `poolEditingBlocked` discipline, selection reset on league switch.

Mode-A deltas inside the reused shuttle — exactly two:
- **"Import from branded teams" is hidden** in design-first; RE-EXTRACT stands in its slot.
  Extraction owns membership seeding; a bulk import would silently bury the extracted
  proposal. (The players it would import are all present in AVAILABLE anyway.)
- The IN pane's rows keep the value right-label (`ivById`) exactly as in Mode B — no new
  columns. The demand ledger above carries the Mode-A information; the panes stay panes.

### 3.5 What zone 4 Mode A does NOT get

No second sufficiency readout, no per-pane demand annotations, no "coverage %" invented
metric, no CPU-club rows, no inline explanation of contest multiplicity (help layer only),
no snapshot-vs-live double numbers in the asks table (one live column; the shortfall cards
are the record of what extraction couldn't reserve).

---

## §4. EXTRACT + LOCK — semantics and gating

### 4.1 EXTRACT POOL (state A2, and RE-EXTRACT in A3)

On press (through the existing `runAction` wrapper :585-600, so busy/error/refresh come free):

1. Build the universe: the league's **full player list** (`players`, the same set zone 3
   checks in Mode A) adapted to `DemandUniversePlayer` — SimPlayer fields via the
   `toFeasibilitySimPlayer` bridge (leagueBuilderPoolBuilder.ts:333, priced with
   `computePlayerIv`) + `profile` via the `buildRosterDesignPool` profile construction
   (RosterDesigner.tsx:77-…). Builder factors ONE shared Player→DemandUniversePlayer adapter
   (a thin composition of the two existing bridges — no new math).
2. Call `extractPoolFromDemand(universe, lockedHumanDesigns, selectedArchetypes,
   league.tier, { teams: league.teamIds.length, budgetPerTeam: tierBudget })`.
   `selectedArchetypes` = every club's MLB identity resolved to its historical-archetype
   record (the resolution the identity engine already performs — Codex verifies the accessor
   at point of use). Default contest multiplier — no UI knob (R-IA3 spirit: tuning is not a
   player control).
3. **Set membership = the extracted set:** `addPlayersToLeaguePool(extracted − current)` +
   `removePlayersFromLeaguePool(current − extracted)` (:140/:164). Membership after extract
   equals `result.players` exactly.
4. Persist `poolExtractedAt` (§4.4). Hold the result in session state for first-paint
   (`cells`, `shortfalls`, `designVerdicts`); clear the manual-edits flag.

The extraction result is otherwise **ephemeral** — on reload, THE ASKS + THE GAPS are rebuilt
by re-running steps 1-2 **report-only** (compute, do NOT touch membership). Deterministic
from designs + player list, so the receipt reprints itself; the pool the owner edited stays
exactly as he left it.

### 4.2 RE-EXTRACT

Same operation as 4.1, launched from the review. When the manual-edits flag is set (any
Add/Remove since the last extraction — session state), the button runs the inline two-step
confirm (the north-star ✓/✗ pattern, exactly as the designer's RESET): button swaps in place
to `REDRAW? ✓ / ✗` with the one-line warning (§5.1); ✓ extracts, ✗ or clicking elsewhere
cancels. No modal, no `window.confirm`.

### 4.3 Staleness

Stale ⇔ any human design is unlocked, OR any design's `lockedAt > poolExtractedAt`. While
stale: the warn banner shows (naming the clubs), **LOCK disables**, RE-EXTRACT stays enabled
once all designs are locked again (it clears staleness by construction). Rationale: Mode A's
one promise is "the pool was built from the designs" — locking a pool that predates a design
edit breaks the promise silently; one press repairs it honestly.

### 4.4 The one persisted addition

`poolExtractedAt?: string` (ISO) — additive on the existing LeagueTemplate record beside
`draftPoolMode`/`draftSeats` (the seat-spine precedent; **no new IndexedDB**, no version
bump). Written on every extraction; never cleared by unlock (the receipt survives an
unlock-adjust-relock loop); cleared only if the league's mode flips back to pool-first while
unlocked (leaving Mode A abandons the order desk).

### 4.5 LOCK gating (reuses `handleLock` :706 → `lockLeaguePool`, unchanged)

LOCK POOL enables when ALL hold:
1. membership non-empty (existing rule),
2. `sufficiency.meetsFloor` (the same hard floor as Mode B — if extraction lands under the
   floor the chip already says "need N more" and the owner adds bodies via the shuttle;
   honest and self-explaining),
3. every human design locked AND not stale (§4.3),
4. the existing `savedDraftMutationBlocked` checks.

**Shortfalls do NOT block. Red club verdicts do NOT block — they confirm.** A gap is a
player-list fact no amount of waiting fixes; hard-blocking would deadlock a league whose list
simply doesn't hold an ask, and the floors guarantee the draft completes regardless. When any
club-check row is non-green, LOCK runs the inline two-step confirm: `SURE? ✓ / ✗` + the
one-line count (§5.1). All-green → LOCK fires plain. UNLOCK: existing path, no confirm
(unlocking destroys nothing).

### 4.6 Wiring corrections riding this build (host, small, named)

- **Auto-import gates on mode:** the first-open auto-import effect (:570-583) must run only
  when `poolMode === "pool-first"` — in Mode A it would seed membership before extraction and
  corrupt A2/A3 detection.
- **The zone-5 start gate learns Mode A:** `startReady` (:495-499) currently requires
  `poolMode === "pool-first"`; it becomes mode-aware — Mode A start-ready = pool locked +
  sufficient + identities ready + every human design locked. The `startBlocker` string
  "Pool-from-demand comes next" (:504-505) dies; Mode A blockers surface as
  `lock every club's design first` → then the shared pool/identity hints.
- **Designs-locked denominator** = human clubs only (already flagged in the designer spec §5;
  this zone's A1 copy depends on it).

---

## §5. COPY (chrome register, §6 banned-word-checked) + HELP

### 5.1 Chrome strings

| Where | String |
|---|---|
| A1 title / A2 title | `WAITING ON DESIGNS` / `EVERY DESIGN IS IN` |
| A1 progress | `{n} of {m} designs in. Still to come: {Club} — {GM}, …` |
| A2 progress | `Ready to build the pool to order.` |
| A2 progress (zero human clubs) | `No club designs to collect — the pool draws from the league's identities.` |
| Extract button | `EXTRACT POOL` · busy: `DRAWING UP THE POOL…` |
| Re-extract button | `RE-EXTRACT` · confirm swap: `REDRAW? ✓ / ✗` |
| Re-extract confirm line | `Extracting again rebuilds the pool from the designs — your add and remove edits go with it.` |
| Stale banner | `Designs changed since this pool was drawn — {Club}, {Club}. Extract again before locking.` |
| Block micro-labels | `THE CLUB CHECK` · `THE GAPS` · `THE ASKS` |
| Asks table header | `SPOT · SHAPE · ASKING · WANTED · IN POOL` |
| Asking cell | `{n} club{s}` |
| No-cells quiet line | `Every design rides open asks — no shape orders to fill. The pool covers the league's identities.` |
| Club-check state text | verbatim from FABLE_ROSTER_DESIGNER_LAYOUT §4 (BUILDS · … / FILLS · NOT A LEGAL 22 / OVER BUDGET · … / {N} SPOT{S} WON'T FILL) |
| Lock button + confirm | `LOCK POOL` · confirm swap: `SURE? ✓ / ✗` + line `{N} club design{s} won't build from this pool as-is.` |
| Unlock | `UNLOCK` (existing) |
| Zone-5 Mode-A blocker hint | `lock every club's design first` |

Engine text rendered verbatim, never reworded in the UI: `shortfall.message` (THE GAPS) and,
via the club check's shared copy table, the designer-§4 states. Banned-word check: no
"pool-from-demand", "extract" is a plain verb not a system noun, no "universe" in chrome (the
engine's own message says "the uploaded universe holds 3" — engine voice, shipped, verbatim
rule applies; chrome consistently says "player list").

### 5.2 Iconography

EXTRACT/RE-EXTRACT reuse the `Download` icon (already imported); LOCK/UNLOCK keep `Lock`/
`Unlock`. No new icons.

### 5.3 Help-layer annotation (the zone-4 `?` note, Mode A variant)

Replaces the current one-liner when `poolMode === "design-first"` (Mode B keeps its own
line):

> "Design first builds the pool to order. Once every club's design is in, EXTRACT POOL draws
> a right-sized pool from your player list — enough players for every ask, with competition
> built in on the popular ones, plus the depth every club identity needs. Then read the
> receipt: THE CLUB CHECK says whether each design still builds from this exact pool, THE
> GAPS name anything your player list couldn't supply — adding players can't fix those, only
> a bigger player list can — and THE ASKS is the full ledger. Add or remove players below,
> then lock. Locking freezes prices for the auction."

One note, prose register, behind the `?` only. No other inline tutorial text anywhere in the
zone.

---

## §6. AUDITOR VERIFICATION CHECKLIST (Opus, against this doc + north-star §9)

```
MODE-A POOL (ZONE 4) — CONFORMANCE
ENGINE BINDING
□ extractPoolFromDemand called with (full player list adapted, LOCKED human designs only,
  all clubs' MLB identities resolved, league.tier, {teams, budgetPerTeam: tierBudget});
  no contest-multiplier UI knob
□ ONE shared Player→DemandUniversePlayer adapter composing the existing SimPlayer bridge
  (leagueBuilderPoolBuilder.ts toFeasibilitySimPlayer) + the existing profile construction
  (RosterDesigner buildRosterDesignPool) — no new pricing/classification math
□ Membership after EXTRACT === result.players exactly (add missing, remove extras, via the
  existing pool-builder membership functions)
□ Shortfall messages + club-check state copy rendered VERBATIM (no UI rewording); IN POOL
  counts via a countCellMatches helper EXPORTED from poolFromDemand.ts (extracted from the
  existing step-3 filter — additive, zero math change); UI never tightens the match rule
  (shape/near-match, league-wide — tags and position NOT applied)
□ Club check recomputed live on membership edits via evaluateRosterDesign + tierBudget,
  ~200ms debounce, classified pool memoized; tone via rosterDesignStatusTone
STATES
□ A1/A2/A3/A4 detected per §2.1 (locked → poolExtractedAt → design count); reload lands in
  the correct state with membership intact; report-only recompute rebuilds ASKS/GAPS without
  touching membership
□ A1: EXTRACT disabled, who's-left names club — GM; denominator = human clubs only
□ A3 stale (any design unlocked or lockedAt > poolExtractedAt): warn banner names clubs,
  LOCK disabled, RE-EXTRACT clears it
□ A4: UNLOCK + disabled panes via the existing poolEditingBlocked path; market outlook panel
  rendered from the SAME (factored, not duplicated) JSX as Mode B; club check stays live
  against the locked pool (the drift check)
GATING
□ LOCK enables on: non-empty + meetsFloor + all designs locked + not stale + saved-draft
  checks; shortfalls never block; non-green club verdicts trigger inline SURE? ✓/✗ (count
  line correct); all-green locks plain; reuses handleLock/lockLeaguePool unchanged
□ RE-EXTRACT confirm (REDRAW? ✓/✗) fires only when manual edits exist since extraction
□ No modal, no window.confirm anywhere in the zone
REUSE / DEDUPE
□ The shuttle (Pane/Row/FocusedPlayerPanel/edit path/add/remove) reused UNMODIFIED except:
  Import-from-branded-teams hidden in design-first (RE-EXTRACT in its place)
□ Auto-import effect gated to pool-first mode
□ Exactly ONE sufficiency readout (the reused Mode-B chip); no new coverage metrics
□ startReady/startBlocker mode-aware; "Pool-from-demand comes next" string removed
PERSISTENCE
□ poolExtractedAt additive on LeagueTemplate (no new IndexedDB, no version bump); survives
  unlock; cleared on mode flip to pool-first while unlocked
KIT / COPY
□ Tokens only (well/panel-border/brass/status ramp); warn = --ballpark-status-warn; the asks
  table is the zone's only new scroller (max-h, recessed well); press physics on all buttons
□ All §5.1 strings exact; §6 banned-word grep clean over every new string; help prose only
  behind the ? toggle; empty-cell case renders the quiet line, not an empty table
□ GameTracker untouched (git diff confirms)
```
