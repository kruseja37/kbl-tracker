# L10 RANDOM EVENTS — CONTRACT-READY SCOPE MAP

> Produced by the L10 grounding recon (workflow `wf_b3129cd8-9e3`, 5 readers + synthesis,
> 2026-06-18, AUTH-4). All structural anchors verified against live code on
> `codex/franchise-v1-next` (TRACKER_DB_VERSION=22; 5 phase-2 flag blocks; gate at
> processCompletedGame.ts:609-632; isCheckpointBoundary present; intensity dial present;
> stadium pool present). Build order: L10-1 → L10-2 → L10-3 → L10-4 → L10-5. Build-DARK,
> activate post-D13. Triangle applies (builder ≠ auditor per ticket).

## 1. SUBSYSTEM SURFACE
A new Phase-2 engine injecting "light-chaos" living-season variety (performance swings,
pitch/trait/role/cosmetic shifts, team-level events, the independent stadium-change) at the
20%-of-season ratings-checkpoint cadence as a **league sweep**. Probability decides *who*
shifts (no headcount); player morale + personality weight the rolls; a Juiced/Standard/Nerfed
dial scales the base *rate* (never a count, never season-wrecking). Reporter-surfaced. A
wildcard/cosmetic/role/team layer **on top of** L8 (ratings dev) + L9 (trait grants).

**Greenfield:** the pure event-selection engine; a new dark store `franchiseL10Overlays`
(trackerDb v23); a 6th Phase-2 flag + a 6th gate branch in processCompletedGame; the
stadium-change resolver; the event→SeasonNewsEvent reporter adapter.

**Reused (do NOT rebuild):** intensity dial (`tradeRequestGeneration.ts` TierKey +
intensityMultiplier), cadence gate (`isCheckpointBoundary`), morale/personality weighting
(`masterMoraleMatrix.ts` `composeMoraleConsequence`), stadium pool (`parkLookup.ts` +
`parkFactorDeriver.ts`), reporter pipeline (`seasonNewsGenerator.ts` + `seasonNewsItems`),
L2 ratings overlays + L9 trait overlays as inputs/sinks.

**⚠ BOUNDARY — do NOT extend `src/utils/franchiseRandomEventGenerator.ts`** (DSTACK:85): a
DIFFERENT pre-existing fan-morale-prompt suggestions engine (downstream sink
`franchiseRandomEventLogStorage.ts`, DB `kbl-franchise-random-events`, UI
`TeamHubContent.tsx:126-128`). L10 builds in its OWN module. MAY copy the `deterministicRoll()`
FNV-1a seed pattern (franchiseRandomEventGenerator.ts:238-240); MUST NOT mutate its types,
reuse its trigger enums, or write its DB. **Naming guard:** avoid `franchiseRandomEvent*` /
`*TriggerCategory` / `*Candidate` / `*-morale-prompt`; prefix L10's exports `FranchiseL10*` /
`franchiseL10*`.

## 2. v1 EVENT CATALOG (FRANCHISE_V1_LIVING_SEASON_SPEC.md:177-186; magnitudes SIM-tuned §16)
1. **Performance swings** — temp hot/slump (+/−N for X games), perm breakout/regression, clutch boost, defensive yips. Perf signal + morale + personality; stacks on L8.
2. **Pitching** — add/lose a pitch, velo bump/dip, new arm angle. Pitchers only.
3. **Traits** — earn +/−, lose one. Layers on L9 (read `franchiseTraitOverlays`; reuse `computeTraitAcquisition`).
4. **Position/role** — gain secondary, change primary, utility.
5. **Identity/cosmetic** — facial hair, accessory, stance/windup/arm angle, walk-up, number, **name change (rare/opt-in)**. Light weight.
6. **Personality shift** — rare, career-defining. **Arc-earned, NOT a roll → EXCLUDE from the sweep in v1.**
7. **Team-level (fan-morale-driven)** — manager fired, FO mandate, **stadium change**, promo night, rivalry flare.
8. **Roster/relationship-lite** — **trade demand** (low loyalty+morale → delegate to `tradeRequestGeneration.ts`), veteran mentorship, clubhouse rift.
9. **Wildcard** — low-prob reporter-driven surprise.

**Deferred/cut:** FA-attraction → v1.1 (LSD-2); budget pressure CUT (LSD-4); Cornerstone CUT (LSD-3); custom stadiums never — pool-pick only (LSD-5); personality-shift-via-roll excluded.

## 3. RECOMMENDED SPLIT (risk-ascending)
- **L10-1 — pure event-selection engine** (greenfield, pure TS, no I/O). League snapshot + per-player morale/personality/perf + IntensityDial → `FranchiseL10EventReport` (candidate events: type/target/magnitude/seed). Owns the roll table; excludes family 6. Mirror `src/engines/tradeRequestGeneration.ts` (pure engine + tuning const + TierKey dial) + `franchiseCheckpointSweepCompute.ts` compute structure (minus I/O). Deps: L3 (`masterMoraleMatrix`), TierKey (`data/tierParams.ts`). **Risk: low.**
- **L10-2 — dark store `franchiseL10Overlays` (trackerDb v23)**. New `franchiseL10OverlayStorage.ts` mirroring `franchiseTraitOverlayStorage.ts`. **Risk: medium — DB version bump; the 8-site mirror incl. the `franchiseSeasonLedgerStorage.test.ts` store-list PIN (MEMORY: broke L6b-1) must all be in this ticket.**
- **L10-3 — flag + dark league-sweep hook**. 6th flag block (`isFranchisePhase2L10Enabled`) + `persistDarkL10ForCompletedGame` gated by flag AND `isCheckpointBoundary`; wires L10-1 → L10-2. Mirror the TRAITS flag/gate/persist (L9b-3b-ii). Insert the 6th gate branch after processCompletedGame.ts:632. **Risk: medium (live path, but dark-gated).**
- **L10-4 — stadium-change event**. Low base rate suppressed by high fan morale; pool-pick from SMB pool (`parkLookup.ts` `getAllParks`/`getParkByName`/`getStableParkId` + `parkFactorDeriver.getDerivedParkFactorsIfAvailable`); writes `FranchiseTeamStadiumSnapshot` (`franchise.ts:54-60`) so analytics recompute. Pool-pick precedent `franchiseManualSmokeFixture.ts:42-51,194-202`; share the helper with L14 (don't fork). **Risk: medium (analytics recompute).**
- **L10-5 — reporter tap**. Applied L10 event → `SeasonNewsEvent` (`eventType: RANDOM_EVENT`, already in `narrativeEngine.ts:77-88`) via `seasonNewsGenerator.ts` (struct :11-19, gate :135-145, gen :147-200) → `seasonNewsStorage.ts:39-63` (`seasonNewsItems`). **Risk: low-med.**

## 4. FORKS — AUTH-4 DEFAULTS TAKEN (proceed unless JK overrides)
- **v1 roll table:** families 1–5, 7, 8, 9; **exclude 6** (arc-earned). Trade-demand (8) delegates to `tradeRequestGeneration.ts`.
- **Cadence:** ~~single timer at the 20% checkpoint boundary~~ **SUPERSEDED — JK Q5 (2026-06-18) → CONTINUOUS per-game.** L10 fires on EVERY completed game (the `isCheckpointBoundary` gate was removed in L10-Q5Q8); flat per-game §16 base rates (≈÷10 from the old per-sweep values), NO season-length scaling. The percentile-vs-peers systems (trait adaptation L9b, ratings dev L8) KEEP the 20% checkpoint for sample synchronization; only L10's independent-per-player dice rolls go continuous.
- **Base rates:** conservative placeholders in a `L10_EVENT_TUNING` const (mirror `TRADE_REQUEST_TUNING`), SIM-tuned later.
- **Intensity dial:** reuse `{ juiced: 1.3, standard: 1.0, nerfed: 0.6 }` verbatim (tradeRequestGeneration.ts:46-49).
- **Stadium-change rate:** low base × `(1 − fanMoraleSuppression)` (suppression rises with fan morale > 50); pool-pick fixed (LSD-5).
- **Store shape:** ONE new `franchiseL10Overlays` store (not L2 reuse); ALL L10 outputs (incl. cosmetic/role) persist there — keeps the chaos layer separable/revertible, doesn't pollute L8's dev-math overlay.
- **Determinism:** seed rolls FNV-1a off franchise+season+gameNumber (reproducible sweep; matches L8/L9 dark-compute determinism).
- **Reporter emission:** conservative `perEventRate[RANDOM_EVENT]`, dramatic-weight gated; reporter heat stays hardcoded "medium" in v1.

## 5. SEAMS + FILE:LINE ANCHORS (✅ = verified)
- **Flag:** clone `franchisePhase2Flags.ts:49-58` (TRAITS) → 6th block. Gate imports `processCompletedGame.ts:58-67`; gate block `:609-632` ✅ (Fame :609 / Flashpoint :616 / Checkpoint :623 / Traits :630) — insert 6th branch after :632.
- **Cadence:** `isCheckpointBoundary(gameNumber, totalGames)` `franchiseCheckpointSweepCompute.ts:106` ✅, guard pattern at :229.
- **Intensity:** `tradeRequestGeneration.ts:26,46-49` ✅ (applied :96); TierKey from `data/tierParams.ts`.
- **Store mirror checklist (L10-2, all in one ticket):** (1) `trackerDb.ts:17` bump 22→**23**; (2) `trackerDb.ts:414-426` add `franchiseL10Overlays` store (clone `franchiseTraitOverlays`); (3) NEW `franchiseL10OverlayStorage.ts` (clone `franchiseTraitOverlayStorage.ts:99-110`); (4) `backupRestore.ts:168-174` registration (KBL_BACKUP_VERSION at :64 stays 2); (5) `syncConfig.ts:18` registry; (6) **`franchiseSeasonLedgerStorage.test.ts:28-70` expected-store array (the PIN that breaks if missed; toBe(22)→23 + alpha-insert)**; (7) backup-parity test; (8) any sync-registry enumeration test.
- **Stadium (L10-4):** pool `src/data/smb4-parks.json` (23 stadiums); accessors `parkLookup.ts:26/34/38` ✅; factors `parkFactorDeriver.ts:78-100`; shape `ParkDimensions parkLookup.ts:5-13` + `FranchiseTeamStadiumSnapshot franchise.ts:54-60`; precedent `franchiseManualSmokeFixture.ts:42-51,194-202`; recompute `franchiseStadiumFoundation.ts:447-546`; event shape `franchiseDesignations.ts:86-101`.
- **Reporter (L10-5):** `narrativeEngine.ts:77-88` (RANDOM_EVENT) · `seasonNewsGenerator.ts:11-19/135-145/147-200` · `seasonNewsStorage.ts:39-63` → `seasonNewsItems trackerDb.ts:334-341` · optional `reporterIntensity.ts:46-67`.
- **Morale/personality weighting (L10-1):** `masterMoraleMatrix.ts` (events :14-31, EVENT_DELTA :91-161, CanonicalPersonality :4-11/:244-252, personality tuning :184-234, `composeMoraleConsequence` :413-487, normalize :489-496); hidden modifiers :416,:546-569; dampener `fanMoraleDampener.ts:43-84`; production example `processCompletedGame.ts:371-400`. **Design note:** L10 consumes RESOLVED `ResolvedMoraleConsequence` deltas as a weight input, not raw params; fan morale is a brake (dampener), never a direct dev weight.

## 6. CADENCE / RATE MODEL
**(UPDATED — JK Q5 2026-06-18: CONTINUOUS.)** Fires as a league sweep on EVERY completed game (the 20%-checkpoint gate was removed in L10-Q5Q8); sweeps every MLB-rostered player league-wide; probability decides who. Base rates are now PER-GAME (flat, no season-length scaling).
```
P(event for candidate) = baseRate[family] × intensityMultiplier[intensity]   // 1.3/1.0/0.6
                         × moraleWeight(player) × personalityWeight(player.personality)
```
Apply the multiplier where `tradeRequestGeneration.ts:96` does. Stadium-change = own low base × (1 − fanMoraleSuppression). All base rates are §16 placeholders.

## 7. OPEN QUESTIONS FOR JK (genuine rulings; AUTH-4 defaults taken meanwhile)
1. **Personality-shift (#6) exclusion** — v1 simply never emits it (Captain lean) vs L10 owns an arc-detection stub? (default: never emit)
2. **Trade-demand ownership** — L10 surfaces/triggers only, propensity math stays in `tradeRequestGeneration.ts` (default) vs L10 owns the whole event?
3. **Single-cadence collapse** — ~~all L10 at the 20% checkpoint (default)~~ **RESOLVED — JK Q5: L10 is CONTINUOUS per-game** (built in L10-Q5Q8); the percentile-ranked systems (trait adaptation, ratings dev) stay periodic for sample sync.
4. **Stadium-change on the USER's team** — allowed (suppressed by morale) (default) vs AI-teams only? (product-feel: forces a mid-season park recompute on JK's team)
5. **Cosmetic changes while dark** — write to overlay, never render pre-D13 (default) — confirm no special-casing.
6. **Name-change opt-in (#5)** — ~~exclude from the auto-roll in v1 (default)~~ **RESOLVED — JK Q8: INCLUDED in the dark catalog** (built in L10-Q5Q8) as a rare DISTINCT cosmetic-family event with its own low rate; opt-in honored at the post-D13 confirm step, NOT by omission.
