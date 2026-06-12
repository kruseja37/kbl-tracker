# FRANCHISE ENGINE MAP
**Date:** 2026-06-11 | **Status:** DRAFT v0.2 — pending JK review
**v0.2 (same session):** added §4.5 existing-asset crosswalk + reclassified §5
holes after JK direction: existing specs/code are the starting point — the
job is tie-together (consolidate/amend/wire), not boil-the-ocean respec.
**Author:** Claude (Fable 5), from the 2026-06-11 vision session
**Inputs:** FRANCHISE_ENGINE_VISION_QA.md (14 design rulings + amendments, same
session — the binding authority for every design statement here),
MODE2_SYSTEMS_INTEGRATION_MAP.md (build-status evidence), IV spec v1.1.8,
MODE_2_V1_FINAL.md, BEAT_REPORTER_VOICE_SPEC.md, Feb 2026 audit findings.

**What this document is:** the vision-level architecture for Franchise Mode
(Modes 1 + 2 + 3) as a system of interacting ENGINES. It names every engine,
its charter, its layer, its data contracts, and its build status; it lists the
holes that need specs; it queues the per-engine design sessions. It sits ABOVE
the build sequence (T5, WAR hardening, etc.) and points at it — it does not
relitigate it.

---

## 1. The Vision in One Paragraph

The user is the GM of every team they control — one chair or several. Fame is
a scoreboard; the clubhouse is a mystery you read through journalism. Ratings
breathe. Fans have teeth. Snubs are systemic, not scripted. Every career
becomes a binder of cards. Reporters are columnists, never stenographers. And
nothing important happens that nobody earned: stories emerge from performance,
relationships, and morale — chaos is seasoning, not plot. The app's job is to
ask and answer five questions about a fictional baseball world, forever:

| Question | Engines that answer it |
|---|---|
| **WHO?** (identity & worth) | IV Engine, Scouting Engine |
| **WHAT?** (what happened) | GameTracker, Transaction, Schedule, Stats |
| **SO WHAT?** (what it means) | Narrative, Morale, Relationships, Recognition |
| **WHAT'S NEXT?** (consequence & growth) | Development, Offseason, Economy |
| **WHAT WAS?** (memory) | Almanac/Archive |
| **WHAT IF?** (seasoning) | Chaos (d20, deferred — light-chaos bound) |

---

## 2. Engineering Architecture: Three Layers + Two Rules

The question framing above is the vision lens. The ENGINEERING structure is
three layers (ruling Q1/Q2, 2026-06-11, Claude as engineering owner):

```
TRUTH LAYER      GameTracker · Transaction · Schedule
   (only writers of events; immutable streams; replay guarantee)
        │ events
        ▼
JUDGMENT LAYER   IV · Effective Ratings · Stats · Economy · Scouting
   (deterministic derivation of value from truth; pure functions)
        │ snapshots
        ▼
STORY LAYER      Narrative · Morale · Relationships · Recognition
   (convert judgment into feeling & meaning; never write back)
        │ suggestions (user-gated) / archives
        ▼
CONTINUITY       Development · Offseason · Almanac
   (close the loop: ratings evolve, seasons turn, memory persists)
```

**Rule 1 — Communication discipline:** strict between layers (typed snapshot
contracts only), direct pure-function calls allowed within a layer. No shared
mutable state anywhere.
**Rule 2 — Writes are one-directional:** only Truth engines write events.
Story never writes into Judgment (F-087 precedent). Development's ratings
suggestions and Chaos's events re-enter ONLY as user-confirmed
TransactionEvents — the user is the bridge, always.

The Modifier Registry (MODE_2 §15) is the plugin bus: new quirks attach
without touching engine cores. Every layer boundary is a typed contract a
test harness can drive (engine-discovery / season-simulator compatible).

---

## 3. Engine Inventory

Status legend: BUILT (audit-verified) · PARTIAL (real code, gaps named) ·
SPEC'D (canonical spec, no product path) · MISSING (needs spec from scratch).

### 3.1 TRUTH LAYER

**GameTracker Engine** — BUILT (UX complete 2026-03; pipeline gaps per Feb
findings). The atomic event recorder: AtBatEvent + BetweenPlayEvent, 1-tap
record-first-enrich-later, immutable outcomes, versioned enrichment. Owns:
the event log, in-game X feed surface. New obligations from this session:
EXHIBITION MODE (DQ8 — All-Star Game playable, stats excluded from season
totals; big WPA moments still feed Fame, pending JK confirm).

**Transaction Engine** — PARTIAL. The roster-move stream: trades, call-ups,
send-downs, DFA, IL. Owns: roster state changes, deadline enforcement. Every
consequence system (ledger, scrutiny, morale, narrative reaction) keys off
its events. Development suggestions and Chaos events re-enter the world here.

**Schedule Engine** — BUILT (user-provided, editable; Score/Skip). Owns: the
season clock. There is no wall clock in KBL — time advances by game slots and
transactions; ALL cadence logic (reporter, morale drift, awards checkpoints)
pegs to this engine's progression, never to real dates.

### 3.2 JUDGMENT LAYER

**IV Engine** — BUILT (T4 + T4-FIX, CONFORMS, 2026-06-11). Absolute intrinsic
value: rawIV (workbook-exact, anchor-frozen) → kblIV (usage doctrine), the
number all downstream systems consume. Owns: player worth, tier calibration.
Vision role: grade-vs-IV divergence is the strategic surface that seeds every
downstream story (D16/D17) — IV calibration IS expectations calibration.

**Effective Ratings Engine** — SPEC'D (IV spec §4; ticket T6). Context-true
ratings: base + trait matrix + mojo + fitness + handedness + opponent-imposed
deltas + DefensivePlacementRisk. The shared core for lineup optimization,
sub recommendations, and any "how good is he RIGHT NOW" question.

**Stats Engine** — PARTIAL, two named output channels:
- VALUE channel (WAR → True Value → designations → economy): engines exist;
  orchestrator unwired; season-scaling metadata bug (the smoke-test WAR
  explosion). The single highest-leverage fix in franchise mode.
- MEMORY channel (WPA → clutch → Fame → narrative): the strongest spine in
  the codebase (May 31 audit: HIGH confidence). WPA is the story stat — it
  records what people will remember; WAR records what they produced.
  WAR-vs-WPA divergence is a deliberate narrative surface (metronome vs folk
  hero).
Owns: every derived number. Needs: the DATA-CONTRACT AUDIT (per-stat mapping
of event fields → stat, by enrichment tier) before its spec is drafted.

**Economy Engine** — PARTIAL + NEW SCOPE. Salary (kblIV × age × perf × fame ×
personality — T5 seam, next ticket), True Value (WAR-percentile market), the
season ledger (dead money D6–D8), payroll expectations. NEW from DQ6 (full
teeth): attendance/revenue model + rebuild-mandate mechanic — neither exists
in any spec today. Owns: every dollar and every expectation. Open ruling
carried from the integration map: the expected-wins definition (declared
budget vs realized payroll vs roster TV) — now an Economy Engine spec item.

**Scouting Engine** — PARTIAL SPEC (IV spec §7.4 scout-obscured IV). The
"what do you actually know?" system: scout accuracy, displayed-range fog on
farm players, snap-to-truth at call-up, INSIDER reveals as the premium
observability tier. Wants a unifying spec: all hidden-information mechanics
(farm fog, hidden traits, morale response curves) route their REVEALS through
this engine so fog-of-war has one owner.

### 3.3 STORY LAYER

**Narrative Engine** — SPEC'D (MODE_2 §16 + BEAT_REPORTER_VOICE_SPEC), Phase 1
unbuilt; recap thin-wrapper wired, headline engine orphaned (F-087/F-120).
The columnist system. Binding rulings: COLUMNIST DOCTRINE (DQ2 amendment —
angle-driven pieces only, never stenography; notability candidates → strongest
angle → personality colors the take; FEED wire tier owns pure information);
per-controlled-team reporters addressing the user (DQ1 amendment); dueling
columns when controlled teams meet; FEED/ALERT/INTERRUPT delivery tiers with
~2-interrupt session cap; event-driven cadence (no wall clock).

**Morale Engine** — PARTIAL (storage exists 0-99; engine wiring historically
stubbed). Fan morale (per-team, FULLY PUBLIC number+state) and player morale
(per-player, BAND+TREND visible, number + response curve HIDDEN — DQ7).
Design law: predictable inputs, hidden weights, visible trajectory, narrative
observability — journalism is how you read the clubhouse. Binding rulings:
FULL TEETH (DQ6 — mid-season manager firing returns, attendance/revenue
effects, rebuild mandates); existing governors stand (±3/game reporter cap,
baseline drift, establishment multiplier, user-gated profile consequences).

**Relationships Engine** — code ORPHANED (F-119: full system, zero callers,
no persistence); spec needs refresh to this session's rulings. Hidden edges
(mentor/mentee, rivals, bullies, friendships, romance-as-context) that
amplify/dampen morale responses and feed reporter angles. Binding ruling:
SPORTS-DRAMA CEILING (DQ4) — sitcom warmth + real feud/trade stakes; romance
is a morale modifier and a reporter aside, never a dramatized storyline.

**Recognition Engine** — PARTIAL pieces (designation utility uncalled;
milestones wired F-092; awards/All-Star scattered). Unifies two species:
DERIVED LABELS (designations — continuous, automatic, the market talking) and
BESTOWED HONORS (awards, All-Star — discrete events with races, snubs, and
ceremony; the fans talking). Owns: the FAME LEDGER (WPA moments + milestones
+ honors in; tiers/number out — FULLY VISIBLE per DQ3). Binding rulings:
playable ASG full event (DQ8); fame/morale-weighted fan vote with systemic
snubs (DQ8b); recognition NEVER touches ratings (Development owns that).

### 3.4 CONTINUITY LAYER

**Development Engine** — MISSING (F-121: no growth model exists). The SOLE
OWNER of ratings-over-time: age curves, usage/workload, sustained morale
states, farm development, trait evolution. This single-owner rule is what
kills the awards/EOS/aging/morale redundancy — four hands come off the dial.
Binding ruling: LIVING PROFILES (DQ5 — frequent small moves) with the
engineering riders: suggestions QUEUE and batch-apply at series boundaries,
±1 moves, salary repricing at scheduled points only (no per-change churn),
alive-ness as a registry constant. User is the bridge: every change is a
user-confirmed SMB4 edit logged as a TransactionEvent.

**Offseason Engine** — PARTIAL (11-phase structure wired F-090; archive stub
F-112; Mode 3 spec exists). The CONDUCTOR, not a peer: generates no content,
sequences every other engine through the phases — locks Recognition, runs
Development's big annual pass, reprices through Economy (Phases 3/8/10),
resets the ledger, archives to Almanac, carries morale baselines + carryover
designations into Season N+1. Consumes SeasonSummary (copy-not-reference);
the §4.6 payload-gap pass from the integration map lands here.

**Almanac/Archive Engine** — PARTIAL (Almanac specs exist; WPA/archive paths
strong). First-class read-only memory: every at-bat ever, every season's
artifacts. Binding rulings: BASEBALL CARD as the universal primitive (DQ9 —
abstract no-portrait front with fame border + badge foils; Savant percentile
back; Signature Moment line = candidate element; each season's card stored as
a collectible — a career is a binder); THREE-TIER SEARCH (DQ10 — curated
surfaces → structured filters → natural-language magic tier over the event
log); three-surface stats split confirmed (DQ12 — Team Hub operational,
Franchise Hub league-now, Almanac memory).

**Chaos Engine (d20)** — DEFERRED by standing decision; vision now bound by
DQ11: LIGHT CHAOS — rare flavor events, never season-wrecking, no
catastrophic outcomes in the event table, no user-tunable dial. Events enter
only through the confirmation-gated path as TransactionEvents.

---

## 4. The Two Channels (how value and memory flow)

```
            ┌────────────── VALUE CHANNEL ──────────────┐
 events ──► WAR ──► True Value ──► Value Delta ──► designations (labels)
                         │                              │
                         ▼                              ▼
                  Economy (salary,                fan morale (20%+10%)
                  expectations, ledger)
            ┌────────────── MEMORY CHANNEL ─────────────┐
 events ──► WPA/clutch ──► FAME ledger ◄── milestones ◄── honors
                              │
                              ▼
              coverage priority · crowd energy · card borders ·
              vote weighting · HOF gravity · salary fame-mod
```
The channels meet in the Story layer: a player's STORY is the gap between
them (high-WAR/low-WPA metronome; low-WAR/high-WPA folk hero; high-IV/low-TV
albatross; low-fame/high-WAR snub). The engines author archetypes for free.

---

## 4.5 Existing-Asset Crosswalk (v0.2 — added after JK challenge: tie together, don't boil the ocean)

Per engine: the specs and code that ALREADY EXIST. Wiring statuses from
SUBSYSTEM_MAP.md (2026-02-18 — STALE for anything touched Mar–Jun 2026;
re-verify per engine at session time).

| Engine | Existing specs | Existing code (Feb wiring) |
|---|---|---|
| GameTracker | GAMETRACKER_UX_SPEC + rules/runner/sub/pitch/fielding spec family | useGameState + pipeline — WIRED |
| Transaction | TRADE_SYSTEM_SPEC, TRADE_FIGMA_SPEC | tradeEngine/transactionStorage ORPHANED Feb (F-073); manual-transaction adapter built in May–Jun franchise checkpoints — re-verify |
| Schedule | SCHEDULE_SYSTEM_FIGMA_SPEC | scheduleStorage — WIRED |
| IV | IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC v1.1.8 | ivEngine — BUILT (T4) |
| Effective Ratings | IV §4 + MOJO_FITNESS_SYSTEM_SPEC + smb4_traits_reference | mojoEngine/fitnessEngine WIRED (F-088); traitInteractionMatrix BUILT (T2). T6 = ASSEMBLY, not greenfield |
| Stats | bWAR/fWAR/pWAR/rWAR/mWAR specs ×5, LEVERAGE_INDEX, CLUTCH_ATTRIBUTION, WPA rebuild + Manager-WPA + POG-WPA specs, STAT_TRACKING_ARCHITECTURE, ADAPTIVE_STANDARDS, STADIUM_ANALYTICS | calculators exist; warOrchestrator ORPHANED (F-061/103); WPA chain STRONG; clutch trigger missing (F-096) |
| Economy | SALARY_SYSTEM_SPEC_UPDATED + IV §3.8/§8.4 | salaryCalculator WIRED (F-083). Fan economy = genuinely absent |
| Scouting | SCOUTING_SYSTEM_SPEC, FARM_SYSTEM_SPEC, IV §7.4 | farmStorage ORPHANED Feb (F-072); scout/prospect-draft checkpoints landed May–Jun — re-verify |
| Narrative | NARRATIVE_SYSTEM_SPEC (103KB), BEAT_REPORTER_VOICE + DATA_MODEL specs | recap wired, headlineGenerator orphaned (F-087) |
| Morale | FAN_MORALE_SYSTEM_SPEC, FAN_FAVORITE_SYSTEM_SPEC, MODE2 morale worksheets | fanMoraleEngine STUBBED (F-089); 0-99 storage canonical since June |
| Relationships | PERSONALITY_SYSTEM_SPEC (thin, 4KB) | relationshipEngine PARTIAL/orphan (F-086 vs F-119 disagree — resolve at session) |
| Recognition | MILESTONE_SYSTEM_SPEC, FAME_INTEGRATION_SPEC, DYNAMIC_DESIGNATIONS_SPEC, AWARDS_CEREMONY_FIGMA_SPEC (102KB) | fame/milestones WIRED (F-092); designation utility uncalled |
| Development | EOS_RATINGS_ADJUSTMENT + EOS_RATINGS_FIGMA, aging portions of FARM/PROSPECT specs | agingEngine PARTIAL; ratingsAdjustmentEngine ORPHANED (F-077/095) |
| Offseason | OFFSEASON_SYSTEM_SPEC (122KB), MODE_3_OFFSEASON_WORKSHOP | WIRED, 12 consumers (F-090); archive stub (F-112) |
| Almanac | ALMANAC.md + ALMANAC_UX_SPEC/RESEARCH/TRANSCRIPT; Museum/HOF | museum pipeline PARTIAL (F-076); WPA archive paths strong |
| Chaos | SPECIAL_EVENTS_SPEC → Modifier Registry (C-089) | registry concept in MODE_2 §15; d20 deferred |

**Limitation logged (Evidence Over Assertion):** this crosswalk was built from
the spec-docs directory listing + SUBSYSTEM_MAP, NOT from reading each gospel.
Each engine's design session MUST begin by reading its existing specs in full —
the session's job is consolidate-and-amend, never parallel-spec.

---

## 5. The Holes List — RECLASSIFIED (v0.2)

Classes: **NEW** (nothing exists) · **CONSOLIDATE** (multiple specs exist —
unify under the engine charter, amend with this session's rulings) ·
**WIRE** (spec + code exist — connect them) · **AMEND** (one spec, targeted edits).

| # | Item | Engine | Class | Notes |
|---|------|--------|-------|-------|
| H1 | Stats data-contract audit | Stats | WIRE+audit | 10+ specs exist; audit maps event fields → stats and consolidates; biggest deliverable is the wiring list, not prose |
| H2 | Development charter | Development | CONSOLIDATE | EOS+aging+farm-growth specs exist; genuinely NEW part = in-season living-profiles layer + suggestion queue (DQ5) |
| H3 | Recognition charter | Recognition | CONSOLIDATE | 4 specs (milestone/fame/designations/awards-ceremony ≈ 190KB) unify; NEW parts = ASG vote model + exhibition event + Fame-ledger framing |
| H4 | Fan economy + mandates | Economy/Morale | **NEW** | The one true greenfield from DQ6 |
| H5 | Exhibition-game mode | GameTracker | **NEW** (small) | Stats quarantine flag on game record |
| H6 | Scouting unification | Scouting | CONSOLIDATE | SCOUTING+FARM specs + IV §7.4; verify May–Jun checkpoint work first |
| H7 | Relationships refresh | Relationships | AMEND+WIRE | Code exists (adopt-or-rebuild decision); PERSONALITY spec thin; DQ4 ceiling applied |
| H8 | Narrative doctrine pass | Narrative | AMEND | 103KB spec stands; add columnist doctrine, per-controlled-team reporters, delivery tiers |
| H9 | Card spec | Almanac | **NEW** (small) | DQ9 rulings; sits on existing Almanac UX specs |
| H10 | Almanac search tiers | Almanac | AMEND | Curated+filters likely in existing UX specs (verify); NL tier is the NEW slice |
| H11 | Expected-wins ruling | Economy | AMEND | One ruling, three docs touched |
| H12 | SeasonSummary field pass | Offseason | AMEND | Against the 122KB offseason gospel |

Net: **3 genuinely new specs** (one large: fan economy; two small), 3
consolidations, the rest amendments and wiring. The vision is mostly a
TIE-TOGETHER job — which is the point of the engine frame.

---

## 6. Per-Engine Design Session Queue (proposed order)

Each session: gametracker-ux-interrogator pattern (one question at a time,
transcript file, synthesis into that engine's spec). Order is dependency-aware:

1. **Stats** (H1 data-contract audit first — everything reads its outputs)
2. **Recognition** (H3 — resolves the awards/designation redundancy; Fame)
3. **Morale + Fan Economy** (H4 — teeth mechanics; consumes Recognition)
4. **Development** (H2 — consumes morale states; living profiles)
5. **Narrative** (H8 — consumes everything above; columnist machinery)
6. **Relationships** (H7 — feeds Morale + Narrative angles)
7. **Almanac + Card** (H9/H10 — memory surfaces)
8. **Scouting** (H6), **Chaos** (vision-bound, build deferred)
Offseason-conductor and Economy-expectations items (H11/H12) ride inside the
existing T5/Mode 3 workstream rather than getting standalone sessions.

---

## 7. Relationship to the Current Build Sequence

Nothing here jumps the queue. The IV workstream order stands: T4 closure
commit → T5 (salary seam) → WAR/metadata hardening → True Value canonical →
T6/T7/T8. That sequence IS the Judgment layer's completion, and the Story
layer is honest only when Judgment is trustworthy — no "So what?" without a
sound "What it's worth." This map adds the spec backlog (§5) that runs in
design sessions PARALLEL to the build, so specs are ratified before their
tickets are drafted.

---

## 8. Operating Plan (added v0.2 — order of operations & session economics)

**Two tracks, two cycles:**
- BUILD track: Fable 5 writes contract → Codex 5.5 builds → Fable 5 CLI
  audits → JK browser-verifies → next. Unchanged.
- DESIGN track: JK + Claude chat sessions (no Codex). Read the engine's
  existing gospels in full → interrogation Q&A → consolidated/amended spec.
  Runs PARALLEL; never blocks the build track.

**Engineering call (Claude, 2026-06-11, closes integration-map open Q4):**
WAR/metadata hardening = its own ticket **W1**, NOT folded into T5. T5 is
already persistence-adjacent; contracts stay scoped. W1 = wire
calculateAndPersistSeasonWAR into the post-game pipeline + gamesPerTeam/
innings from stored config (never schedule rows) + reproduce-the-smoke-test
NFL gate. ROUTE: Codex 5.5 | high → Fable 5 CLI audit.

**Wave 1 — finish the Judgment layer (build, ~10-12 sessions):**
T4 closure commit → T5 (salary seam, contract MUST include pre-build spec
amendments: MODE_2 §15.5 + salary-spec potency text killed per D15; IV §3.8
DH row fixed) → W1 → TV1 (True Value canonical + designation slice) → T6
(Effective Ratings — ASSEMBLY of existing mojo/fitness/matrix) → T7 → T8 →
T9 → T10. Routing per IV spec §13.

**Design track (parallel, ~8-10 chat sessions):**
**D0 SCOPE SESSION (FIRST, before even D1 — added per JK 2026-06-11):**
consolidate existing scope docs (V2_DEFERRED_BACKLOG,
FRANCHISE_V1_STABILITY_PRINCIPLES_AND_CUT_LIST, scope decision board) →
produce FRANCHISE_PLAYABLE_V1_DEFINITION.md: the v1 LOOP (create league via
snake draft → play/score a season with stats/standings/WAR/TV/designations/
fame → feel it via ONE reporter voice done well + morale bands with soft
consequences → playoffs/awards → offseason → Season 2 opens with carryover
intact, zero manual surgery; TWO completed seasons = v1) + item-by-item cut
line across §3/§5. Tiebreaker: memorability per session of work. Staging
principle: RULINGS ARE THE DESTINATION, NOT THE BUILD ORDER — full teeth,
living-profile cadence, exhibition ASG, NL search etc. stage to v1.5/v2
without dying; the soul (reporter voice, visible fame, systemic snubs, card,
draft night) is expression on already-computed data and stays in v1.
Then: D1 Stats data-contract audit → D2 Recognition → D3 Morale + fan economy
(H11 expected-wins ruling lands here; must precede the fan-morale engine
BUILD, not T5) → D4 Development → D5 Narrative amend → D6 Relationships →
D7 Almanac + card → D8 Scouting.

**MANDATORY SESSION-OPENING PROTOCOL (every D-session and build contract):**
1. Read the engine's existing gospels IN FULL.
2. VERIFY current wiring with fresh evidence (grep/build/test — never trust
   the Feb SUBSYSTEM_MAP; May–Jun checkpoints already invalidated its
   Transaction/Farm rows). Heavy verification routes to Fable 5 CLI using the
   franchise-engine-discovery / spec-ui-alignment skills, not chat tokens.
3. Classify every existing asset ADOPT / AMEND / WIRE / REBUILD before any
   new design. "It exists" is a grep result, not a memory.
4. MANDATORY OUTPUT of every session: the v1/v2 split for its spec — no spec
   leaves a session without its own trim.

**Wave 2 — build the Story layer (~8-12 sessions, estimate firm only after
specs exist):** morale, narrative Phase 1, recognition, development engine
builds, each contracted from its consolidated spec.

**Near-term milestone (5 sessions):** T5 + W1 + TV1 + D1 + D2 = trustworthy
value spine + Stats/Recognition specs — the point where designations, fan
morale, and the narrative economy all become buildable.

**NEXT THREAD:** T4 arc closure commit, then Claude drafts the T5 prompt
contract (Codex 5.5 | very high → Fable 5 CLI audit; persistence-adjacent,
audit non-negotiable).

---

## 9. Surfaces (where engines become experience) — added v0.2, JK question

Engines are invisible; SURFACES are what the user touches. The named surfaces:
GameTracker (live games), **the Draft** (roster construction), Team Hub
(operations), Tootwhistle Times + X feed (narrative), Almanac/binder (memory),
Offseason Workshop (the turn of the year).

**The Draft is the flagship surface** — the maximum-convergence point: IV
(prices + pick-value chart + trade validator), Scouting (prospect fog),
Economy (budgets, solvency hard-blocks, green/yellow/red tax signals),
Identity composition (board weights), Effective Ratings (potency overlay +
marginal-synergy insights). ALL ALREADY SPECCED: IV spec §7.3/§7.4 + 
DRAFT_FIGMA_SPEC.md (73KB). Builds in **T8**; auction = v1.5. Two homes, same
engines: Mode 1 construction draft (league birth) + annual rookie draft
inside the Offseason conductor.

Vision role: draft night is where grade-vs-IV divergence stops being an
abstraction and becomes a timed decision — the felt center of the engine
thesis (v1.1.8).

**Design hook (for D5 Narrative session + T8 contract):** the draft echoes
FORWARD — beat reporters publish morning-after DRAFT GRADES (columnist
doctrine, per-controlled-team), then collect receipts all season: draft
position vs True Value divergence generates steal/bust stories automatically
(the C- pick who becomes a Fan Favorite; the "steal" who turns Albatross).
The reporter revisiting his own wrong grade is free, earned narrative.

---
*End FRANCHISE_ENGINE_MAP.md v0.2 — DRAFT pending JK review/commit*


---

## AMENDMENT — 2026-06-12 SEQUENCING RULING (JK, canonical)
§7 (Relationship to the Current Build Sequence) and §8 (Operating Plan)
are AMENDED by the sequencing ruling in CURRENT_STATE.md (2026-06-12):
no design session interleaves with the T-stack. Order: T-stack completion
(→T10) → D0 cut line (FRANCHISE_PLAYABLE_V1_DEFINITION.md) → D1-D8 per
D0's ruling, each producing its own v1/v2 split. The §6 session queue
order stands but its START is gated on T-stack completion. F-138 scoped
post-D0.
