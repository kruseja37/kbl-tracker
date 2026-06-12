# MODE 2 SYSTEMS INTEGRATION MAP
**Date:** 2026-06-11 | **Session type:** VISION/INTEGRATION (no build)
**Author:** Claude (Fable 5) | **Status:** DRAFT — pending JK review
**Sources read this session:** IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md v1.1.8 (full),
SALARY_SYSTEM_SPEC_UPDATED.md v3.1 (full), MODE_2_V1_FINAL.md (§1, §16–§22, §26, §28),
FRANCHISE_MODE2_VALUE_DESIGNATION_SALARY_AUDIT.md (2026-05-31),
FRANCHISE_MODE2_DYNAMIC_DESIGNATION_MORALE_BRIDGE.md, AUDIT_LOG.md findings index,
SESSION_LOG.md (June 2026 arc), CURRENT_STATE.md.

**Scope:** maps the chain IV → salary → True Value → roster decisions → expected wins
→ morale/milestones/reporter → Mode 2→3 handoff. Identifies what integrates, what is
specced-but-unwired, and where specs contradict each other. Status labels follow
Evidence Over Assertion: BUILT = audit-verified; SPEC'D = canonical spec exists,
no product path; UNVERIFIED = not checked against code this session.

---

## 1. The Chain at a Glance

```
                         MODE 1 (construction time)
  440 DB / generated pool → computeIV (rawIV→kblIV) → tier caps / luxury tax
                                   │ (pool registered, salaries seeded)
                                   ▼
                         MODE 2 (season time)
  kblIV ──(T5 seam)──► salary = kblIV × age × perf × fame × personality(FA)
                                   │
            ┌──────────────────────┼──────────────────────────┐
            ▼                      ▼                          ▼
   payroll / ledger        True Value (WAR pct          Expected WAR per player
   (D6–D8 dead money)      among position peers)        (salary/posAvg × posAvgWAR)
            │                      │                          │
            ▼                      ▼                          ▼
   EXPECTED WINS  ◄───[RULING NEEDED: 3 definitions]   perf modifier (next salary)
            │                      │
            │                      ▼
            │              Value Delta = TV − contract
            │                      │
            │          ┌───────────┴────────────┐
            │          ▼                        ▼
            │   Fan Favorite / Albatross   Roster decisions
            │   (designations §17)         (T7 call-up/send-down:
            │          │                    surplus vs calloutThreshold)
            ▼          ▼                        │
   FAN MORALE §20 (50% perf gap + 20% desig + 10% roster TV
                   + 10% reporter + 10% random)│
            │                                   ▼
            ▼                          TransactionEvent → ledger,
   playerMorale §17.14 ◄── milestones §18,    trade scrutiny, narrative
            │              narrative §16
            ▼
   SEASON END → SeasonSummary (copy-not-reference) → MODE 3
   → Phase 3/8/10 salary recalc (back through the T5 seam) → next season
```

The single most important vision-level statement, already enshrined in IV spec
v1.1.8 D16: **grade-vs-IV divergence is the strategic surface that seeds every
downstream story.** Because IV now sets payroll and payroll sets expectations,
**IV calibration IS expectations calibration** — every fan-morale swing, Albatross
label, and beat-reporter take ultimately traces back to whether computeIV priced
the player honestly.

---

## 2. Node-by-Node Status

| # | Node | Canonical spec | Build status | Evidence |
|---|------|---------------|--------------|----------|
| 1 | IV Engine (both layers) | IV spec §3 | **BUILT** | T4+T4-FIX, Fable audit CONFORMS, oracle frozen (2026-06-11) |
| 2 | Salary seam (kblIV replaces Steps 1/2/trait-tiers) | IV spec §3.8 | **NOT BUILT — T5, next ticket** | §13 build table |
| 3 | Relativity stack (age/perf/fame/personality/TV machinery) | SALARY_SYSTEM_SPEC | Engine exists; **NOT franchise spine** | 2026-05-31 audit: "True Value/value delta — engine exists, not franchise spine, gated/deferred" |
| 4 | WAR spine (5 components) | MODE_2 §11 | Engines exist; **read-time only, orchestrator unwired; season-scaling risk** | 2026-05-31 audit; FINDING-103 class |
| 5 | Designations (§17) | MODE_2 §17 | Utility only (MVP/Ace/FanFav/Albatross types); **no product calc/persist path**; MVP/Ace preview-only per bridge doc | 2026-05-31 audit + bridge matrix |
| 6 | Roster Analyzer (call-up/send-down, lineups, ledger) | IV spec §8 | **NOT BUILT — T7** | §13 build table |
| 7 | Expected wins | THREE specs (see §4.1) | Conflicting definitions; **RULING NEEDED** | this map |
| 8 | Fan morale (§20) | MODE_2 §20 | Storage exists (0-99 canonical per §17.14 checkpoint note); engine historically STUBBED (F-089/F-101); current wiring **UNVERIFIED** | Feb findings + June checkpoint note |
| 9 | Player morale (§17.14) | MODE_2 §17.14 | Storage exists (0-99, all start 50); effects flow via confirmation-gated random-event workflow only | §17.14 checkpoint + bridge doc |
| 10 | Milestones (§18) | MODE_2 §18 | Multi-path wiring confirmed Feb (F-092); fires at game completion; adaptive scaling **shares the gamesPerTeam metadata risk** | F-092 + 2026-05-31 audit |
| 11 | Narrative/reporter (§16) | MODE_2 §16 + BEAT_REPORTER_VOICE_SPEC | Game recap wired (F-087/F-120); headline engine orphaned; beat reporter LLM system **Phase 1 not implemented** | Feb findings; CURRENT_STATE priorities |
| 12 | Mode 2→3 handoff (SeasonSummary) | MODE_2 §26.3 | Offseason consumer wired (F-090) but season archive was a localStorage stub (F-112); handoff payload gaps in §4.6 below | Feb findings |

---

## 3. Seam-by-Seam: What Actually Connects

### 3.1 IV → Salary (the T5 seam — IV spec §3.8)
`salary = kblIV(p) × ageFactor × perfMod × fameMod × personalityMod(FA only)`,
then relativity/True Value per existing salary spec. Replaced: Step 1 base-rating
salary, Step 2 position multipliers (retired to 1.0 knobs), Step 4 flat trait tiers,
DH-aware batting bonus (superseded by §3.9 usage vectors). Survives: chemistry
potency (now scales trait Δ before marginal pricing — but see CONFLICT §4.3),
age/perf/fame/personality, TV percentile machinery, FA swap rules,
recalc schedule (offseason Phases 3/8/10 + in-season triggers).
Rookie-scale override (D6): 0.50× REPLACES age factor for the call-up season,
reprices at next Phase 3 — T5 must guard against double-discounting and ensure
the rookie-scale flag survives into the offseason recalc.

### 3.2 Salary → True Value → Value Delta
TV = salary at the player's WAR percentile among position peers (merged pools
below size 6). Inputs: (a) salary [Node 2], (b) **persisted, season-scaled WAR**
[Node 4 — currently the broken link], (c) league peer context. Value Delta
(TV − contract) is the sole criterion for Fan Favorite (§17.3) and Albatross
(§17.4) and the 10% rest-of-roster factor in fan morale (§20.1). The bridge doc
explicitly blocks Fan Favorite/Albatross until TV is canonical. **One unwired
function (the WAR orchestrator) is therefore gating: TV → 2 designations →
20%+10% of the fan-morale formula → all Albatross/FanFav narrative + trade
mechanics.** Highest-leverage single fix in the chain.

### 3.3 True Value → Roster Decisions (T7)
Call-up rec: farm surplus (projectedTV(trueIV, hidden) − rookieScaleSalary) minus
MLB surplus (TV − salary) > calloutThreshold, positional fit holding, scout-leak
rule respected (§7.4: never display hidden ratings/true IV pre-call-up).
Consequences flow through TransactionEvent → ledger status change (active ↔
deadMoney at deadMoneyRate) → payroll → expectations → fan morale; plus trade
scrutiny (§20.5) and playerMorale effects (§17.14, §18.7). The dead-money ledger
is the ONLY in-season churn brake until ROSTER_MOVEMENT_GAME_THEORY_SPEC exists
(named deferral, IV spec §0/§14).

### 3.4 Payroll/Ledger → Expected Wins → Fan Morale
The intended loop: ledger capCharge total (active 100% / dead 75% / unrostered 0%)
is the team's effective payroll; measured against a soft payroll-expectation
baseline (the Mode 1 tier cap converted per IV §8.4); the gap drives fan-morale
performanceGap (50% weight) and the §20.6 baseline drift. Anti-churn property:
dead money raises payroll without raising wins → morale consequence. Anti-sandbag
property (v1.1.2): expectations anchor to DECLARED BUDGET so cheap auction wins
don't buy low expectations. **But the formula for expected wins is currently
defined three different ways — see §4.1.**

### 3.5 Expected Wins / Designations / Events → Morale → Narrative
Fan morale §20.1 = 50% performance gap + 20% designation score + 10% roster TV +
10% reporter sentiment + 10% random events. Designation holders convert game
events to morale per §17.10, weighted by establishment multiplier §17.11
(season % + playoff status — which itself reads standings, which read game
results). Reporter influence capped ±3/game (C-069). playerMorale consumes:
milestones (+3..+8), team results, fan-morale coupling (±3 at the 80/30
thresholds), narrative mentions (±1..3), designations (±5), trades, Captain
ripple (±2). Morale → rating-change SUGGESTIONS only (user-is-the-bridge
preserved). Milestones ALSO feed Fame → fameMod → salary → expectations —
see feedback-loop inventory §5.

### 3.6 Season End → Mode 3
Lock designations → award Cornerstone → final standings → archive stats →
snapshot park factors → SeasonSummary (copy-not-reference, C-076) → Mode 3.
Mode 3 runs salary recalc at Phases 3/8/10 **through the T5 seam** — meaning the
new IV pipeline becomes the offseason repricing engine too. Ledger resets at
Phase 3. Carryovers re-enter next season: FanFav/Albatross until 10% of new
season; Cornerstone permanent-while-on-team; fan morale baseline + C-084 EOS
modifier. The loop closes: next season's salaries (IV × modifiers) set next
season's expectations.

---

## 4. CONFLICTS & RULINGS NEEDED (the session's main findings)

### 4.1 RULING NEEDED — Expected wins has three competing definitions
1. **SALARY_SYSTEM_SPEC:** `getExpectedWinPctFromPayroll(payrollPercentile)` —
   step function on REALIZED payroll percentile (.600/.550/.500/.450/.400).
2. **IV spec v1.1.2 / §8.4:** expectation baseline anchors to **DECLARED BUDGET**,
   never realized spend (anti-sandbagging; "unspent budget is never free
   expectation relief").
3. **Designation-morale bridge doc:** "Expected wins should remain based on
   **roster True Value** once that path is trusted" (and warns against
   overperformance raising the bar so fast that success becomes disappointment).
These are materially different systems: (1) is relative-spend, (2) is
commitment-based, (3) is talent-based. MODE_2 §20 consumes "expected wins"
without defining the source. Recommended framing for the ruling: declared budget
sets the SEASON-START anchor (2); realized roster TV adjusts it slowly
mid-season (3) with damping per the bridge doc's warning; raw payroll percentile
(1) retires with the rest of the pre-IV salary machinery. Needs a D-number.

### 4.2 CONFLICT — Two fan-morale formulas in two gospels
SALARY_SYSTEM_SPEC carries a full `calculateFanMorale` (start 50, payroll
amplifiers, star-underperformance penalties, **mid-season manager firing** at
5–25% per check, +15 morale on firing). MODE_2_V1_FINAL §20 defines the
canonical 50/20/10/10/10 formula with 7 fan states, and its consequence list
(§20.7–20.8) does NOT include manager firing. The IV spec's amendment table says
the salary spec's "fan morale" section SURVIVES UNCHANGED — which now points at
dead/conflicting text. Ruling needed: declare MODE_2 §20 canonical, mark the
salary-spec fan-morale section superseded, and explicitly decide whether
manager firing is v1, v2, or dead (it interacts with mWAR).

### 4.3 CONFLICT — MODE_2 §15.5 potency-reprices-salary vs IV D15 potency-neutral
MODE_2_V1_FINAL §15.5/§2075: "Trait Potency is calculated at the moment of
salary generation. A higher Potency Level results in a higher salary valuation."
IV spec v1.1.7/D15 (later, JK-ratified): **IV/salary is potency-NEUTRAL at the
L2 reference forever; realized potency NEVER reprices salary** — construction
surplus is captured by True Value instead. The salary spec's
`calculateTraitModifierWithPotency` is the same stale machinery (it's a Step 4
retiree anyway). T5 regression risk if a builder reads MODE_2 §15.5 or the
salary spec verbatim. Action: amend both docs to point at IV §3.9/D15 before T5
is contracted.

### 4.4 GATING DEPENDENCY — WAR persistence + season-length metadata
The 2026-05-31 audit: WAR computed on read; `calculateAndPersistSeasonWAR` has
no product caller; manual-schedule franchises risk `gamesPerTeam = 0` from
schedule-row counting, corrupting season scaling. This single class of gap
blocks, in order: trustworthy WAR → True Value → Fan Favorite/Albatross →
30% of the fan-morale formula → designation morale/narrative effects → T7
roster recs → §18 WAR milestones → Mode 3 awards inputs. The adaptive standards
engine (§23) and milestone scaling (§18.1) read the SAME metadata — one
metadata fix serves three subsystems. This is the recommended first Phase-2-style
fix of the franchise value spine, sequenced naturally inside/alongside T5.

### 4.5 SEAM HYGIENE — IV spec §3.8 internal staleness
§3.8's table row still says DH context becomes "a usage-weighting ... tunable
constant `pitcherBattingUsageWeight`, default 0.25" — superseded by §3.9's
derived per-role usage vectors (D15/D16). Cosmetic but a T5 contract trap;
one-line amendment.

### 4.6 VERIFY — SeasonSummary payload vs Mode 3 needs
§1.5 prose promises Mode 3 ten artifacts including "Fame scores" and
"relationship data," but the §26.3 `SeasonSummary` interface carries neither,
nor: salary ledger state / rookie-scale flags (needed for Phase 3 reprice and
the no-double-discount rule), playerMorale (§17.14), mojo/fitness carry state,
or declared budget (needed if ruling 4.1 lands on declared-budget anchoring).
Some of these may legitimately live on player/team records rather than the
snapshot — but per C-076 copy-not-reference, anything Mode 3 mutates must be
in the copy. Needs a deliberate field-by-field pass before T5/T7 freeze it.

### 4.7 NOTE — Designation reality layer vs spec layer
MODE_2 §17 specs seven designations fully; the bridge doc (current internal-v1
law) allows only MVP/Ace as preview-only morale-recognition context, with
FanFav/Albatross/Cornerstone/Captain/FanHopeful blocked pending trusted inputs.
Not a conflict — a staged rollout — but any session reading only MODE_2_V1_FINAL
will overestimate what's live. The bridge doc's "Blocked Until Trusted" list is
effectively the designation portion of this map's unblock path.

---

## 5. Feedback Loops & Damping (deliberate design, inventoried)

| Loop | Path | Damping |
|------|------|---------|
| Performance→salary→expectation | WAR vs expectedWAR → perfMod (±10%/WAR, cap ±50%) → next salary → next expectedWAR | Annual reset at Phase 3; cap |
| Fame flywheel | Milestone → Fame → fameMod (±3%/pt, cap ±30%) → salary → expectations → harder to please fans | Fame cap; milestone floors (min 10) |
| Morale↔narrative | Reporter story → fanMorale → reporter tone → story | ±3/game cap (C-069); 80/20 rule |
| Fan↔player morale | fanMorale ≥80/≤30 → ±3 playerMorale → performance suggestions → results → fanMorale | Suggestions are user-gated; ±3 step |
| Churn brake | Demotion → dead money → payroll↑ without wins → morale↓ | deadMoneyRate preset; resets Phase 3 |
| Success raises the bar | Winning → (under ruling 4.1 option 3) TV-based expectations↑ | UNRESOLVED — bridge doc warns; part of ruling 4.1 |

The only loop without a specced damper is the last one — fold into ruling 4.1.

---

## 6. Dependency-Ordered Unblock Path

1. **T5 (already next):** salary seam + the 4.3/4.5 spec amendments folded into
   its contract; regression tests on TV/designations per IV §13.
2. **WAR/metadata hardening (4.4):** wire orchestrator into post-game pipeline;
   gamesPerTeam/innings from stored config, not schedule rows. Unblocks TV.
3. **True Value canonical pass:** persist TV/value-delta rows (audit doc's
   recommended slices 1–4).
4. **Designation slice:** calc/persist projected+locked per §17, staged per
   bridge doc; unblocks fan-morale 20%+10% factors.
5. **Expected-wins ruling (4.1) → fan morale engine** on the canonical formula.
6. **T7 Roster Analyzer** (needs 1–3 + T6 effective ratings) and **T8** (potency
   overlay, scout-obscured farm IV) per existing IV §13 order.
7. **SeasonSummary field pass (4.6)** before first full Mode 2→3 season closes.
8. Beat reporter Phase 1 rides on top at any point after 5 (it consumes, never
   writes back — F-087 architecture).

---

## 7. Open Questions for JK (this session)

1. Ruling 4.1 — expected-wins definition (proposed: declared-budget anchor +
   damped TV drift; payroll-percentile retires). D-number?
2. Ruling 4.2 — MODE_2 §20 canonical over salary-spec fan morale; manager
   firing v1/v2/dead?
3. Confirm 4.3/4.5 spec amendments should be drafted before the T5 contract.
4. Should the WAR/metadata hardening (4.4) be folded INTO T5's contract or run
   as its own ticket between T5 and T6?
5. SeasonSummary field pass (4.6) — schedule it, or defer until first season
   reaches Mode 3 in testing?

---
*End MODE2_SYSTEMS_INTEGRATION_MAP.md — DRAFT pending JK review/commit*
