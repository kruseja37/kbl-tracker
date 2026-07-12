# Living-Season Tuning Surface — Complete Knob Registry

**Purpose:** a complete inventory of every tunable constant/parameter that shapes
living-season behavior (Fame, Fan Morale, Master Morale Matrix, Relationships,
Ratings/Trait Development, L10 random events, L11 manager firing, L12
races/All-Star, L13 relationship flares, the reporter/news layer, Designations,
Mojo/Fitness, WAR/value, Trade Demand, Hidden Modifiers) so a sim-tuning pass
can adjust them with full knowledge of interactions.

**Method:** every row below was read directly from the file at the cited line.
No values were inferred or guessed. `Live?` reflects the ACTUAL wiring found in
`src/utils/processCompletedGame.ts` and the reporter emission layer, not
assumptions from spec docs.

**Global gating mechanism:** almost the entire Phase-2 living-season stack is
gated by per-subsystem flags in `src/utils/franchisePhase2Flags.ts:1-189`,
compiled default **OFF** (`FRANCHISE_PHASE2_*_ENABLED_DEFAULT = false` at lines
6, 26, 38, 50, 62, 74, 86, 98, 110, 122, 134), resolved at runtime by
`resolveFranchisePhase2FlagActivation` (`src/utils/franchisePhase2Activation.ts:110-120`)
against a persisted override (`appSettings` IndexedDB store) or a session
test-override. Every subsystem below marked "FLAG-GATED (phase2 '&lt;key&gt;')"
uses this exact mechanism — the compute is wired into
`src/utils/processCompletedGame.ts` (confirmed by direct grep of the import
list at lines 79-95 and the call sites at lines 1341-1473) but writes nothing
in a stock game until the flag is switched on.

---

## 1. Fame

| Knob | Value | file:line | What it controls | Interacts with | Live? |
|---|---|---|---|---|---|
| `FAME_TUNING.heat.decayPerUpdate` | 0.85 | `src/engines/fameModel.ts:94` | Per-checkpoint heat retention: `newHeat = oldHeat×0.85 + gameHeatInput` | Feeds fame tier, reach floor, race/All-Star fame tilt | FLAG-GATED (phase2 'fame') |
| `FAME_TUNING.heat.min` / `.max` | -30 / 50 | `src/engines/fameModel.ts:95-96` | Hard clamp on heat value | Same | FLAG-GATED (phase2 'fame') |
| `FAME_TUNING.heat.precision` | 1000 | `src/engines/fameModel.ts:97` | Rounding precision for heat/channel values | — | FLAG-GATED (phase2 'fame') |
| `FAME_TUNING.tierThresholds` | immortalLegend 34, globalSuperstar 24, nationalIcon 15, regionalStar 8, localHero 3, unknownBand 2.999, polarizing -3, notorious -9, despised -18 | `src/engines/fameModel.ts:99-109` | Heat → `FameTier` mapping (9 tiers) | Feeds L12 race fame-tilt weights, honor reach-floor, reporter dramatic weight indirectly | FLAG-GATED (phase2 'fame') |
| `FAME_TUNING.warGravity` | strength 0.2; meritPercentileBands elite 0.90/high 0.70/average 0.40; meritHeatTarget low 0/average 4/high 12/elite 24 | `src/engines/fameModel.ts:110-123` | Pulls heat toward a WAR-justified target each checkpoint ("legitimacy gravity") | Consumes WAR percentile (True Value rows) | FLAG-GATED (phase2 'fame') |
| `FAME_TUNING.tradeReset` | heatRetention 0.35, reachFloorAfterTrade 0 | `src/engines/fameModel.ts:124-127` | Fame haircut + reach-floor reset on trade | — (function `applyTradeReset` exists; no caller found in trade flow — see discrepancies) | DARK (no wired caller found for `applyTradeReset`) |
| `FAME_TUNING.honorHeatBump` | mvp 12, cyYoung 10, silverSlugger 8, goldGlove 7, rookie 6, reliever 5, benchPlayer 3, boogerGlove 2, allStarStarter 6, allStarReserve 3 | `src/engines/fameModel.ts:128-140` | Fame heat bump per season-end/All-Star-lock honor | Consumed by `applyFranchiseHonorReachFloor` (`src/utils/franchiseHonorReachFloor.ts:41`) and L12 payouts | FLAG-GATED (phase2 'fame' AND 'l12', both required — `franchiseHonorReachFloor.ts:28-35`) |
| `FAME_TUNING.channelWeights` | wpa_spine/iconic_event/status/defensive/role_player all 1 | `src/engines/fameModel.ts:141-147` | Per-channel weight multiplier before aggregation | — | FLAG-GATED (phase2 'fame') |
| `FAME_TUNING.classifier` | lowFameMaxRank 1, highFameMinRank 3, bustMeritMaxScore 1, darlingMeritMaxScore 2, snubMeritMinScore 3 | `src/engines/fameModel.ts:148-154` | Fame-vs-merit classification (snub/bust/darling/aligned) | — | FLAG-GATED (phase2 'fame') |
| `FAME_INPUT_TUNING.wpaToHeatScale` | 10 | `src/utils/franchiseFameCompute.ts:49` | Scales a player's total game WPA into fame-heat input units | Bridges KBL-WPA (`kblWpaAttribution.ts`) into Fame's `wpa_spine` channel | FLAG-GATED (phase2 'fame') |
| Honor reach-floor minimum | `FAME_TIER_RANK.REGIONAL_STAR` (rank 2) | `src/utils/franchiseHonorReachFloor.ts:52` | Floor a player's reach-floor can never go below once honored | Interacts with `resolveFameTier` (`fameModel.ts:230-250`) | FLAG-GATED (phase2 'fame' + 'l12') |
| `L12_GG_DEFENSIVE_FAME_SHARE` | 0.2 | `src/utils/franchiseRaceStandingsCompute.ts:37` | Weight of a player's defensive-fame channel added into Gold Glove merit score | Reads Fame's `defensiveFame` aggregate | FLAG-GATED (phase2 'l12') |

**Discrepancy:** `applyTradeReset` (`src/engines/fameModel.ts:252-263`) is exported and has a dedicated tuning block (`tradeReset`), but no caller was found anywhere in `src/utils/*trade*` or `processCompletedGame.ts`. It reads as an intentionally-built-but-unwired seam, not a bug — flagging per instructions rather than guessing.

---

## 2. Fan Morale (classic GameTracker layer + franchise ledger + flashpoint)

| Knob | Value | file:line | What it controls | Interacts with | Live? |
|---|---|---|---|---|---|
| `BASE_MORALE_IMPACTS` (23 event types) | WIN +1, LOSS -1, WALK_OFF_WIN +3, WALK_OFF_LOSS -3, NO_HITTER +5, GOT_NO_HIT -4, SHUTOUT_WIN +2, SHUTOUT_LOSS -2, WIN_STREAK_3/5/7 +2/+5/+8, LOSE_STREAK_3/5/7 -2/-5/-10, WIN_STREAK_BROKEN -3, LOSE_STREAK_BROKEN +4, TRADE_ACQUIRE_STAR +8, TRADE_LOSE_STAR -10, TRADE_SALARY_DUMP -8, TRADE_DEPTH +1, CALL_UP_TOP_PROSPECT +5, CALL_UP_REGULAR +2, STAR_TO_IL -5, STAR_RETURNS +5, PLAYER_DFA -2, PLAYER_MILESTONE +4, WEEKLY_AWARD +2, ALL_STAR_SELECTION +3, LEAD_DIVISION +5, CLINCH_PLAYOFF +15, CLINCH_DIVISION +20, ELIMINATED -15, OPENING_DAY +10, RIVALRY_SWEEP +8, SWEPT_BY_RIVAL -8, CHAMPIONSHIP +20 | `src/engines/fanMoraleEngine.ts:328-383` | Base fan-morale delta per game/season event | Feeds `processMoraleEvent`; duplicated (independently, not shared) in Master Morale Matrix's `EVENT_DELTA.*Fan` (see §3) | LIVE (used via `useFanMorale` hooks, `src/hooks/useFanMorale.ts`, `src/src_figma/app/hooks/useFanMorale.ts`) |
| `FAN_MORALE_CONFIG.driftFrequency` / `.driftAmount` / `.baselineRange` | 3 games / 1 / 5 | `src/engines/fanMoraleEngine.ts:390-392` | Natural drift toward performance-based baseline every N games | — | LIVE |
| `FAN_MORALE_CONFIG.maxMomentumBonus` / `.momentumPerStreak` | 0.5 / 0.1 | `src/engines/fanMoraleEngine.ts:395-396` | Amplifies morale swings on a trend streak (max +50%) | — | LIVE |
| `FAN_MORALE_CONFIG.tradeScrutinyGames` | 14 | `src/engines/fanMoraleEngine.ts:399` | Post-trade fan-verdict tracking window | Drives `getPostTradeGameImpact` amplification | LIVE |
| `FAN_MORALE_CONFIG.blowoutRunDifferential` | 7 | `src/engines/fanMoraleEngine.ts:402` | Run-differential threshold that tags a game "blowout" (±1 modifier) | — | LIVE |
| `FAN_MORALE_CONFIG.rivalMultiplier` / `.walkOffMultiplier` | 1.5 / 3 | `src/engines/fanMoraleEngine.ts:405,408` | Rival-game and walk-off amplification | — | LIVE |
| `FAN_MORALE_CONFIG.playoffRaceMonth` | 8 (August) | `src/engines/fanMoraleEngine.ts:411` | Month after which playoff-race timing multiplier (1.5×) applies | `getTimingMultiplier` | LIVE |
| `FAN_MORALE_CONFIG.tradeDeadlineWindow` | 7 games | `src/engines/fanMoraleEngine.ts:414` | Games-before-deadline window flagged as "trade deadline week" | — | LIVE |
| Performance-classification multiplier table | 0.5×–1.5× across 7 bands (VASTLY_EXCEEDING…VASTLY_UNDER) | `src/engines/fanMoraleEngine.ts:503-534` | Amplifies/dampens event impact based on record-vs-expectation | — | LIVE |
| `clampFranchiseMorale` range | 0–99 | `src/utils/franchiseMoraleState.ts:122-125` | Franchise-ledger morale hard clamp (team-fan and player scopes) | Shared clamp for every morale write in the franchise ledger | FLAG-GATED for matrix-sourced writes (phase2 'morale'); direct ledger writes (draft-seed, manual, channel A/B) are NOT flag-gated themselves but their callers are (see below) |
| `FLASHPOINT_DECAY_TUNING.baseGameTax` | -0.5 | `src/engines/flashpointDecay.ts:38` | Per-game fan-morale tax for a "turned-on" (locked Albatross / active trade-demander) player who stays on the roster | Feeds franchise fan-morale ledger (not yet applied live — see note) | FLAG-GATED (phase2 'flashpoint') |
| `FLASHPOINT_DECAY_TUNING.compoundPerGame` | 0.1 | `src/engines/flashpointDecay.ts:39` | Ramp: +10% of base tax per additional consecutive unresolved game | Same | FLAG-GATED (phase2 'flashpoint') |
| `FLASHPOINT_DECAY_TUNING.maxGameTax` | -3.0 | `src/engines/flashpointDecay.ts:40` | Hard per-game floor ("a tax, not a cliff") | Same | FLAG-GATED (phase2 'flashpoint') |

**Note (important seam boundary):** `src/utils/franchiseFlashpointDecayCompute.ts:1-18` explicitly documents that L5b ONLY accumulates the tax into `franchiseFlashpointDecay` rows — it does **not** yet mutate any live fan-morale snapshot. The tax is computed and stored but not applied to `franchiseMoraleState` until a later ticket. This is a real "half-wired" knob: tuning `baseGameTax` today changes nothing a player would see.

---

## 3. Master Morale Matrix

| Knob | Value | file:line | What it controls | Interacts with | Live? |
|---|---|---|---|---|---|
| `EVENT_DELTA` (~55 named deltas: fan-facing + self + teammate-lift/drop) | e.g. `winSelf` 1, `noHitterSelf` 6, `blownSaveSelf` -6, `albatrossLockedSelf` -5, `smallTeammateLift/Drop` ±1, `mediumTeammateLift/Drop` ±2, `largeTeammateLift/Drop` ±3 (full table) | `src/engines/masterMoraleMatrix.ts:107-180` | Base self/fan/teammate morale deltas per event type — the canonical event→morale table (independent from `fanMoraleEngine.ts`'s `BASE_MORALE_IMPACTS`, same magnitudes for shared events but a separate literal table) | Consumed by `PLAYER_EVENT_BASE_TABLE` (lines 308-432) | FLAG-GATED (phase2 'morale') |
| `MORALE_TUNING.scale` | moraleMin 0/moraleMax 99, modifierNeutral 50/modifierRangeHalf 50, deltaPrecision 100, fanMoraleNeutral 50/fanMoraleRangeHalf 50 | `src/engines/masterMoraleMatrix.ts:185-192` | Global clamp/centering scale for every derived delta | — | FLAG-GATED (phase2 'morale') |
| `MORALE_TUNING.modifierMultipliers` | ambitionUpSwing 0.35, resilienceDownSwing 0.35, charismaOtherTouchedSwing 0.5, loyaltyFanLinkSwing 0.35, fameHeatDeltaMoraleScale 0.25 | `src/engines/masterMoraleMatrix.ts:194-200` | How much each hidden modifier tilts its associated delta | `fameHeatDeltaMoraleScale` bridges Fame heat deltas into player morale via the `fame` tap (line 439-451) | FLAG-GATED (phase2 'morale') |
| `MORALE_TUNING.fanMoraleLink.maxPlayerDelta` | 2 | `src/engines/masterMoraleMatrix.ts:203` | Max player-morale swing a team's fan mood can push per event | `calculateFanMoraleLink` (line 756-767) | FLAG-GATED (phase2 'morale') |
| `MORALE_TUNING.personality` (7 personalities × 5 params) | e.g. COMPETITIVE positiveSelf 1.15/negativeSelf 1.05/positiveFan 1.05/negativeFan 1/fanSensitivity 1.15; EGOTISTICAL positiveSelf 1.25/fanSensitivity 1.5 (full table) | `src/engines/masterMoraleMatrix.ts:205-254` | Personality-specific amplify/dampen multipliers on every self and fan delta | Shared with trait acquisition's image-driver logic conceptually (separate table) | FLAG-GATED (phase2 'morale') |
| `MORALE_TUNING.relation` | teammate 1, captain_teammate 2, young_teammate 1.5, position_group 1, clubhouse 1.25 | `src/engines/masterMoraleMatrix.ts:255-261` | Multiplier applied to "other touched" ripple deltas based on relation type | — | FLAG-GATED (phase2 'morale') |
| Fame tap heat→morale scale | reuses `MORALE_TUNING.modifierMultipliers.fameHeatDeltaMoraleScale` (0.25) | `src/engines/masterMoraleMatrix.ts:439-451` | Converts a Fame heat delta directly into a self-morale delta via the `fame` matrix tap | Cross-links §1 Fame → this subsystem | FLAG-GATED (phase2 'morale' AND 'fame') |
| Race-snub self delta | `EVENT_DELTA.raceSnubSelf` = -4 | `src/engines/masterMoraleMatrix.ts:166,457-461` | Morale hit for a player snubbed from an award/All-Star race | Cross-links §8 L12 races | FLAG-GATED (phase2 'morale' AND 'l12') |
| Relationship-derived base deltas (RIVALRY/FEUD/FRIENDSHIP/MENTORSHIP) | derived from `relationshipEngine.ts` `MORALE_EFFECTS` via a representative-type mapping, not independently numbered here | `src/engines/masterMoraleMatrix.ts:292-306,609-619` | Base self-morale delta when a relationship-typed event fires | Cross-links §4 Relationships | FLAG-GATED (phase2 'morale' AND 'l13') |

---

## 4. Relationships (formation, intensity/decay, overtake, envy, All-Star snub)

| Knob | Value | file:line | What it controls | Interacts with | Live? |
|---|---|---|---|---|---|
| `RELATIONSHIP_FORMATION_TUNING.thresholds` | RIVALRY 0.78, FEUD 0.78, MENTORSHIP 0.8, FRIENDSHIP 0.84 | `src/engines/relationshipFormation.ts:87-92` | Composite-score reference line separating the potential-window and active hazard formulas | Compared against `score` computed by `scoreRivalry`/`scoreFeud`/`scoreMentorship`/`scoreFriendship` (lines 212-296) | FLAG-GATED (phase2 'l13') |
| `RELATIONSHIP_FORMATION_TUNING.seededThresholdWindow` | 0.03 | `src/engines/relationshipFormation.ts:93` | Defines the below-threshold potential-hazard window; scores below `threshold − 0.03` have zero formation chance | R-F organic per-game formation ruling (2026-07-11) | FLAG-GATED (phase2 'l13') |
| `RELATIONSHIP_FORMATION_TUNING.perGameHazard.activeBase` | 0.02 | `src/engines/relationshipFormation.ts` | Base per-game formation chance for a pair at or above its active threshold | R-F organic per-game formation ruling (2026-07-11) | LIVE-BEHIND-L13-FLAG |
| `RELATIONSHIP_FORMATION_TUNING.perGameHazard.activeSlopePerPoint` | 3.0 | `src/engines/relationshipFormation.ts` | Adds hazard in proportion to score margin above the active threshold | R-F organic per-game formation ruling (2026-07-11) | LIVE-BEHIND-L13-FLAG |
| `RELATIONSHIP_FORMATION_TUNING.perGameHazard.activeCap` | 0.35 | `src/engines/relationshipFormation.ts` | Caps active-edge formation chance on any one completed game | R-F organic per-game formation ruling (2026-07-11) | LIVE-BEHIND-L13-FLAG |
| `RELATIONSHIP_FORMATION_TUNING.perGameHazard.potentialBase` | 0.03 | `src/engines/relationshipFormation.ts` | Base per-game chance at the bottom of the seeded potential window; applies only to cross-team candidate pools | R-F organic per-game formation ruling (2026-07-11) | LIVE-BEHIND-L13-FLAG; DORMANT in the live same-team writer |
| `RELATIONSHIP_FORMATION_TUNING.perGameHazard.potentialSlopePerPoint` | 2.0 | `src/engines/relationshipFormation.ts` | Adds hazard across the below-threshold potential window; applies only to cross-team candidate pools | R-F organic per-game formation ruling (2026-07-11) | LIVE-BEHIND-L13-FLAG; DORMANT in the live same-team writer |
| `RELATIONSHIP_FORMATION_TUNING.perGameHazard.potentialCap` | 0.15 | `src/engines/relationshipFormation.ts` | Caps cross-team potential-window formation chance on any one completed game | R-F organic per-game formation ruling (2026-07-11) | LIVE-BEHIND-L13-FLAG; DORMANT in the live same-team writer |
| `RELATIONSHIP_FORMATION_TUNING.youngAgeMax` / `.veteranAgeMin` | 24 / 30 | `src/engines/relationshipFormation.ts:94-95` | Age gate for mentor/protégé eligibility | `directionalMentorshipScore` | FLAG-GATED (phase2 'l13') |
| `RELATIONSHIP_FORMATION_TUNING.activeIntensityFloor` / `.potentialIntensityFloor` | 0.35 / 0.18 | `src/engines/relationshipFormation.ts:96-97` | Minimum starting intensity for an active vs. cross-team "potential" edge | `relationshipIntensity()` helper | FLAG-GATED (phase2 'l13') |
| `RELATIONSHIP_FORMATION_TUNING.accuracyFloor` / `.accuracyRange` | 0.55 / 0.4 | `src/engines/relationshipFormation.ts:98-99` | Maps formation score into a 0.55–0.95 "accuracy" (confidence) band | `relationshipAccuracy()` helper | FLAG-GATED (phase2 'l13') |
| Rivalry/Feud/Friendship/Mentorship scoring weights | e.g. rivalry: 0.42×ambition avg + 0.22×(1-loyalty avg) + 0.18×ambition gap + 0.18×personality clash; friendship: 0.3×loyalty + 0.25×resilience + 0.2×charisma + 0.15×(1-ambition gap) + 0.1×personality compat | `src/engines/relationshipFormation.ts:212-296` | The composite-score formula per edge type (drives whether the edge forms at all) | Feeds the thresholds above | FLAG-GATED (phase2 'l13') |
| `RELATIONSHIP_INTENSITY_TUNING.formationIntensityFloor` / `.formationIntensityRange` | 0.72 / 0.18 | `src/engines/relationshipIntensity.ts:34-35` | Seeded baseline intensity range (0.72–0.90) at edge formation | — | FLAG-GATED (phase2 'l13') |
| `RELATIONSHIP_INTENSITY_TUNING.baseDecayPerGame` / `.compoundPerGame` / `.maxDecayPerGame` | 0.012 / 0.08 / 0.06 | `src/engines/relationshipIntensity.ts:36-38` | Per-game intensity decay, compounding, capped at 0.06/game | `computeRelationshipCumulativeDecay` | FLAG-GATED (phase2 'l13') |
| `RELATIONSHIP_INTENSITY_TUNING.chargedMatchupBump` | 0.14 | `src/engines/relationshipIntensity.ts:39` | One-game intensity bump when both edge members play on opposing teams | — | FLAG-GATED (phase2 'l13') |
| `RELATIONSHIP_INTENSITY_TUNING.formThreshold` / `.dissolveThreshold` | 0.6 / 0.25 | `src/engines/relationshipIntensity.ts:40-41` | Intensity bands: new-edge form-above line and existing-edge dissolve-below line | Also read directly by `franchiseRelationshipMoraleCompute.ts:277` | FLAG-GATED (phase2 'l13') |
| `OVERTAKE_RIVALRY_TUNING` | intensity 0.5, accuracy 1 | `src/utils/franchiseRelationshipOvertakeCompute.ts:29` | Seed intensity/accuracy for a RIVALRY edge formed by a stadium-record overtake | Cross-links stadium records (`franchiseStadiumRecordsStorage`) | FLAG-GATED (phase2 'l13') |
| `ENVY_RIVALRY_TUNING.accuracy` | 1 | `src/utils/franchiseRelationshipEnvyCompute.ts:17` | Accuracy for a RIVALRY edge formed from a race snub (intensity uses the shared lifecycle seed, not a separate knob) | Cross-links §8 L12 race snubs | FLAG-GATED (phase2 'l13') |
| `ALL_STAR_SNUB_RIVALRY_TUNING.accuracy` | 1 | `src/utils/franchiseRelationshipAllStarSnubCompute.ts:21` | Accuracy for a RIVALRY edge formed from an All-Star snub | Cross-links §8 All-Star lock | FLAG-GATED (phase2 'l13') |
| `ALL_STAR_SNUB_TOP_N` | 3 | `src/utils/franchiseAllStarLockPayouts.ts:13` | Number of top-merit non-selected players who become "snub victims" at All-Star lock | Feeds both the race-snub morale event (§3) and the relationship envy/snub edges above | FLAG-GATED (phase2 'l12') |

---

## 5. Ratings & Trait Development (checkpoints)

| Knob | Value | file:line | What it controls | Interacts with | Live? |
|---|---|---|---|---|---|
| `CHECKPOINT_CADENCE_COUNTS` | standard 5, frequent 10 | `src/data/rosterEngineConstants.ts:284-287` | Number of checkpoint boundaries per season (the "5/10" cadence) | Consumed by both ratings-development (`franchiseCheckpointSweepCompute.ts:496`) and trait-grant (`franchiseTraitGrantCompute.ts:201`) sweeps | FLAG-GATED (phase2 'checkpoint' / 'traits') |
| `RATINGS_DEVELOPMENT_TUNING.baseDeltaScale` | 3 | `src/engines/ratingsDevelopment.ts:54` | Overall magnitude scale for a checkpoint rating move | — | FLAG-GATED (phase2 'checkpoint') |
| `RATINGS_DEVELOPMENT_TUNING.performanceSignalScale` | 10 (base); overridden to 200000 for the real checkpoint sweep | `src/engines/ratingsDevelopment.ts:56`; override at `src/utils/franchiseCheckpointSweepCompute.ts:88-91` | Raw performance-signal magnitude that maps to a full ±1 signal | The override exists because the real sweep's signal arrives pre-normalized in dollar units, not the generic scale | FLAG-GATED (phase2 'checkpoint') |
| `RATINGS_DEVELOPMENT_TUNING.moraleWeightUp` / `.moraleWeightDown` | 0.4 / 0.4 | `src/engines/ratingsDevelopment.ts:58-59` | How much player morale amplifies gains / shrinks drops | — | FLAG-GATED (phase2 'checkpoint') |
| `RATINGS_DEVELOPMENT_TUNING.moraleMultiplierMin` / `.Max` | 0.5 / 1.5 | `src/engines/ratingsDevelopment.ts:60-61` | Clamp on the morale multiplier | — | FLAG-GATED (phase2 'checkpoint') |
| `RATINGS_DEVELOPMENT_TUNING.shiftThreshold` | 0.75 | `src/engines/ratingsDevelopment.ts:62` | Minimum dampened delta magnitude required to actually shift a rating | — | FLAG-GATED (phase2 'checkpoint') |
| `RATINGS_DEVELOPMENT_TUNING.maxAbsDelta` | 6 | `src/engines/ratingsDevelopment.ts:63` | Hard cap on a single checkpoint's rating move | — | FLAG-GATED (phase2 'checkpoint') |
| `RATINGS_DEVELOPMENT_TUNING.ageCurveSlopeByBand` | 18-21 +0.8, 22-24 +0.35, 25-31 0, 32-35 -0.35, 36+ -0.8 | `src/engines/ratingsDevelopment.ts:69-75` | Age-based gravity added to every rating move (young players trend up, old trend down) | — | FLAG-GATED (phase2 'checkpoint') |
| `RATINGS_DEVELOPMENT_TUNING.ageSteepnessByRatingKey` | speed 1.25, fielding 1.2, arm 1.25, velocity 1.1, power/contact/junk/accuracy 1.0 | `src/engines/ratingsDevelopment.ts:77-86` | Per-rating multiplier on the age gravity (speed/fielding/arm age faster) | — | FLAG-GATED (phase2 'checkpoint') |
| `CHECKPOINT_FULL_SEASON_SAMPLE` | power/contact 502, speed 40, fielding 350, arm 80, velocity/junk/accuracy 600 | `src/utils/franchiseCheckpointSweepCompute.ts:105-114` | Sample size at which confidence reaches 1.0 before season-length scaling | `ratingConfidence()` | FLAG-GATED (phase2 'checkpoint') |
| `FAN_DAMPENER_TUNING.baseStrength` / `.maxDampen` | 0.6 / 0.9 | `src/engines/fanMoraleDampener.ts:16,18` | How strongly a counter-trend fan mood softens a rating move | Consumed directly inside `computeCheckpointRatingDevelopment` (`ratingsDevelopment.ts:176-182`) | FLAG-GATED (phase2 'checkpoint') |
| `FAN_DAMPENER_TUNING.personalityMultiplier` (7 personalities) | e.g. EGOTISTICAL down/up 0.5/0.5 (least dampened... actually strongest dampen — see file), RELAXED/JOLLY 1.15/1.15 | `src/engines/fanMoraleDampener.ts:19-27` | Per-personality dampening strength | — | FLAG-GATED (phase2 'checkpoint') |
| `FAN_DAMPENER_TUNING.loyaltyAmplification` / `.resilienceWeight` / `.ambitionWeight` | atZero 1.0/atFull 1.4; atZero 0.6/atFull 1.0 (both) | `src/engines/fanMoraleDampener.ts:28-30` | Hidden-modifier lerp ranges feeding the dampen-strength formula | — | FLAG-GATED (phase2 'checkpoint') |
| `TRAIT_ACQUISITION_TUNING.gainThreshold` / `.loseThreshold` | 0.75 / 0.35 | `src/engines/traitAcquisition.ts:107-108` | Probability bands to propose gaining/losing a trait (tier-specific overrides exist via `assignTier`) | — | FLAG-GATED (phase2 'traits') |
| `TRAIT_ACQUISITION_TUNING.maxTraits` | 2 | `src/engines/traitAcquisition.ts:109` | Max held traits per player; gates displacement logic | — | FLAG-GATED (phase2 'traits') |
| `TRAIT_ACQUISITION_TUNING.incumbencyBeta` | 1.25 (RULED value) | `src/engines/traitAcquisition.ts:110` | Boost a held trait's defense score gets over a new candidate | `keepScore()` in `reconcileGainProposals` | FLAG-GATED (phase2 'traits') |
| `TRAIT_ACQUISITION_TUNING.ambitionSwing/resilienceSwing/imageSwing/moraleSwing/rosterSwing/charismaSwing` | 0.35/0.35/0.25/0.30/0.30/0.30 | `src/engines/traitAcquisition.ts:101-106` | Per-factor tilt strength on trait-gain/loss probability | — | FLAG-GATED (phase2 'traits') |
| `POSITION_MISMATCH_KEEP_BOOST` | 3 | `src/engines/traitAcquisition.ts:120` | Multiplier protecting a position-locked trait (e.g. Cannon Arm on an IF) from displacement | — | FLAG-GATED (phase2 'traits') |
| `TRAIT_FIRING_CURVE` | base 0.15, slope 0.80, floor 0.05, ceil 0.97, tierHardness ELITE/SEVERE 0.10, RARE/MODERATE 0.05, UNCOMMON 0.02, COMMON/MINOR 0 | `src/engines/traitAcquisition.ts:123-137` | The seeded "does this proposal actually fire" probability curve, harder for rarer tiers | `firingProbability()` | FLAG-GATED (phase2 'traits') |
| `DEFAULT_TRAIT_WEIGHT_FALLBACK` | 0.15 | `src/engines/traitAcquisition.ts:140` | Fallback trait weight when `computeTraitWeight` throws (untiered trait) | — | FLAG-GATED (phase2 'traits') |

---

## 6. L10 Random Events

| Knob | Value | file:line | What it controls | Interacts with | Live? |
|---|---|---|---|---|---|
| `FRANCHISE_L10_EVENT_TUNING.baseRate` (8 families) | performance 0.006, pitching 0.0035, trait 0.0025, role 0.002, cosmetic 0.0018, team 0.0018, roster 0.0025, wildcard 0.001 | `src/engines/franchiseL10EventEngine.ts:51-60` | Per-game base probability of each event family firing per candidate | Continuous cadence — rolled every completed game per §L10-3 | FLAG-GATED (phase2 'l10') |
| `FRANCHISE_L10_EVENT_TUNING.nameChangeBaseRate` | 0.0004 | `src/engines/franchiseL10EventEngine.ts:61` | Separate, rarer rate for the cosmetic "name change" sub-event | — | FLAG-GATED (phase2 'l10') |
| `FRANCHISE_L10_EVENT_TUNING.intensityMultiplier` | juiced 1.3, standard 1.0, nerfed 0.6 | `src/engines/franchiseL10EventEngine.ts:62-66` | Global intensity dial scaling all base rates (dial itself is hardcoded 'standard' — see below) | — | FLAG-GATED (phase2 'l10') |
| `FRANCHISE_L10_EVENT_TUNING.personalitySensitivity` (7 personalities) | EGOTISTICAL 1.25 (most event-prone) … RELAXED 0.75 (least) | `src/engines/franchiseL10EventEngine.ts:67-75` | Personality-based multiplier on event probability | — | FLAG-GATED (phase2 'l10') |
| `FRANCHISE_L10_EVENT_TUNING.moraleWeight` / `.fanMoraleSuppression` / `.positiveMoraleBias` | 0.35 / 0.65 / 0.5 | `src/engines/franchiseL10EventEngine.ts:77-79` | Morale-driven probability tilt and positive/negative valence bias | `getMoraleFactor`, `getPositiveBias` | FLAG-GATED (phase2 'l10') |
| Hardcoded intensity dial | `'standard'` (`DEFAULT_L10_INTENSITY`) | `src/utils/franchiseL10SweepCompute.ts:88` | No franchise-level intensity setting is wired yet — every league runs at the `standard` multiplier regardless of settings | Cross-links `FRANCHISE_L10_EVENT_TUNING.intensityMultiplier` above | FLAG-GATED (phase2 'l10') |

---

## 7. L11 Manager Firing

| Knob | Value | file:line | What it controls | Interacts with | Live? |
|---|---|---|---|---|---|
| `L11_AUTO_BACKSTOP_TUNING.armingThreshold` | 25 (fan morale) | `src/utils/franchiseManagerAutoBackstop.ts:33` | Fan morale must fall below this before the auto-backstop roll is even attempted | Reads franchise fan-morale ledger (§2) | FLAG-GATED (phase2 'l11') |
| `L11_AUTO_BACKSTOP_TUNING.perGameProbability` | 0.004 | `src/utils/franchiseManagerAutoBackstop.ts:34` | Flat per-game firing probability once armed (payroll-band refinement deferred per file header) | — | FLAG-GATED (phase2 'l11') |
| `FRANCHISE_L11_FIRING_TUNING.reliefBase` / `.reliefStruggleScale` / `.reliefMax` | 4 / 2 / 12 | `src/engines/franchiseL11FiringEngine.ts:46-48` | Fan-morale "relief bump" on a firing, scaled by how bad the struggle was, capped at +12 | Writes to franchise fan-morale ledger via `fireManager()` | FLAG-GATED (phase2 'l11') |
| `FRANCHISE_L11_FIRING_TUNING.managerSelfBase` | -2 | `src/engines/franchiseL11FiringEngine.ts:49` | Flat morale self-delta recorded for the fired manager (not applied to a player — informational) | — | FLAG-GATED (phase2 'l11') |
| `FRANCHISE_L11_FIRING_TUNING.rippleBase` / `.rippleFloor` / `.valueDeltaScale` | -2 / -6 / 200000 | `src/engines/franchiseL11FiringEngine.ts:50-51,53` | Player-morale ripple magnitude for underperforming players, scaled by True-Value dollar delta, floored at -6 | — | FLAG-GATED (phase2 'l11') |
| `FRANCHISE_L11_FIRING_TUNING.loyaltyWeight` / `.resilienceWeight` | 0.5 / 0.5 | `src/engines/franchiseL11FiringEngine.ts:53-54` | Hidden-modifier tilt on the ripple (loyal players hit harder, resilient players shrug it off) | — | FLAG-GATED (phase2 'l11') |
| `FRANCHISE_L11_FIRING_TUNING.personalitySensitivity` (7 personalities) | TIMID 1.2 (most affected) … EGOTISTICAL 0.5 (least) | `src/engines/franchiseL11FiringEngine.ts:55-63` | Personality multiplier on the ripple tilt | — | FLAG-GATED (phase2 'l11') |

---

## 8. L12 Races, All-Star, Honors

| Knob | Value | file:line | What it controls | Interacts with | Live? |
|---|---|---|---|---|---|
| `MERIT_RACE_WEIGHTS` | wMerit 1, wFame 0.15, fameAlwaysOn false, tiltWindow 0.5, meritFloor 1, bandGap 0.08 | `src/engines/franchiseRaceStandingScorer.ts:31-43` | Merit-led award races (MVP/Cy Young/etc.): fame only tilts a close race within a 0.5-unit window | Cross-links §1 Fame heat/reachFloor | FLAG-GATED (phase2 'l12') |
| `FAN_VOTE_WEIGHTS` | wMerit 0.35, wFame 0.65, fameAlwaysOn true, bandGap 0.08 | `src/engines/franchiseRaceStandingScorer.ts:45-57` | All-Star starter voting: fame-led (65%), always-on | Used as `starterWeights` in `V1_ALL_STAR_ROSTER_CONFIG` | FLAG-GATED (phase2 'l12') |
| `WILDCARD_WEIGHTS` | wMerit 0, wFame 1, fameAlwaysOn true | `src/engines/franchiseAllStarSelector.ts:11-14` | All-Star wildcard slot: 100% fame-driven | JK-flagged as "§16-tunable to the 65% starter floor" | FLAG-GATED (phase2 'l12') |
| `V1_ALL_STAR_ROSTER_CONFIG` roster shape | 8 position starters, 4 SP + 1 backup SP, 5 RP + 2 backup RP, 1 wildcard, 4 backup slots (C/corner-IF/middle-IF/2×OF) | `src/engines/franchiseAllStarSelector.ts:55-70` | Exact roster composition for the All-Star team | — | FLAG-GATED (phase2 'l12') |
| `ALL_STAR_LOCK_FRACTION` | 0.6 (60% of scheduled games) | `src/utils/franchiseAllStarLock.ts:2` | Game-number checkpoint at which the All-Star roster locks (overrides an original 0.5) | Gates `runFranchiseAllStarLockPayouts` (honors, snub morale, career selections, reach-floor ratchet) | FLAG-GATED (phase2 'l12') |
| `ALL_STAR_SNUB_TOP_N` | 3 | `src/utils/franchiseAllStarLockPayouts.ts:13` | Top-N non-selected players who become snub victims at lock | Cross-links §3 race-snub morale and §4 relationship envy/snub edges | FLAG-GATED (phase2 'l12') |
| `L12_GG_DEFENSIVE_FAME_SHARE` | 0.2 | `src/utils/franchiseRaceStandingsCompute.ts:37` | (duplicated from §1 for cross-reference) Gold Glove merit boost from defensive fame | Cross-links §1 Fame | FLAG-GATED (phase2 'l12') |
| TV-family race scoring | pure rank/percentile, no tunable weights found | `src/engines/franchiseTvFamilyScorer.ts:1-91` | KK (biggest value gainer) / Bust (biggest loser) / Comeback (biggest recovery from season-low) races | Reads True-Value snapshot history | FLAG-GATED (phase2 'l12') |

---

## 9. L13 Relationship Flares + News/Dramatic-Weight Layer (all reporter adapters)

| Knob | Value | file:line | What it controls | Interacts with | Live? |
|---|---|---|---|---|---|
| `L13_RELATIONSHIP_FLARE_NEWS_DRAMATIC_WEIGHT.base` (6 edge types) | RIVALRY 0.55, FEUD 0.65, MENTORSHIP 0.45, FRIENDSHIP 0.35, ROMANCE 0.45, HISTORY 0.5 | `src/src_figma/app/engines/reporter/franchiseL13RelationshipFlareNewsAdapter.ts:18-25` | Base "how dramatic is this news item" score per relationship type | Feeds `shouldEmitSeasonNews` gating and reporter LLM prompt | DARK (adapter has no production caller — confirmed by grep; only self-referenced) |
| `L13_RELATIONSHIP_FLARE_NEWS_DRAMATIC_WEIGHT.intensityScale` / `.potentialPenalty` | 0.25 / 0.1 | `src/src_figma/app/engines/reporter/franchiseL13RelationshipFlareNewsAdapter.ts:26-27` | Scales edge intensity into the dramatic weight; docks weight for still-"potential" (cross-team) edges | — | DARK |
| `L13_RELATIONSHIP_FAN_NUDGE_TUNING.baseDelta` / `.intensityScale` / `.maxMagnitude` | 1 / 2 / 3 | `src/src_figma/app/engines/reporter/franchiseRelationshipFlareEmission.ts:16-18` | Fan-morale nudge magnitude when a relationship flare is emitted (capped at ±3) | Would write to franchise fan-morale ledger via `applyFranchiseMoraleEffect` | DARK (the whole `emitFranchiseRelationshipFlareNews*` function pair has zero production callers) |
| `L10_NEWS_DRAMATIC_WEIGHT.base` | neutral 0.3, positive 0.45, negative 0.5 | `src/src_figma/app/engines/reporter/franchiseL10NewsAdapter.ts:33-37` | Base dramatic weight for an L10 random-event news item | — | DARK ("NO production caller yet" — file's own header, confirmed) |
| `L10_NEWS_DRAMATIC_WEIGHT.magnitudeScale` | 0.15 | `src/src_figma/app/engines/reporter/franchiseL10NewsAdapter.ts:38` | Scales event magnitude into dramatic weight | — | DARK |
| `L11_NEWS_DRAMATIC_WEIGHT.base` | neutral 0.4, negative 0.6 | `src/src_figma/app/engines/reporter/franchiseL11ManagerChangeNewsAdapter.ts:38-41` | Base dramatic weight for a manager-change news item | — | DARK (confirmed, no caller) |
| `L11_NEWS_DRAMATIC_WEIGHT.magnitudeScale` | 0.3 | `src/src_figma/app/engines/reporter/franchiseL11ManagerChangeNewsAdapter.ts:42` | Scales fan-morale-at-firing magnitude into dramatic weight | — | DARK |
| `L12_NEWS_DRAMATIC_WEIGHT.base` (9 honor kinds) | MVP 0.8, CY_YOUNG 0.7, ALL_STAR 0.6, SILVER_SLUGGER 0.53, GOLD_GLOVE 0.47, ROOKIE_OF_YEAR 0.4, RELIEVER_OF_YEAR 0.33, BENCH_PLAYER 0.2, BOOGER_GLOVE 0.13 | `src/src_figma/app/engines/reporter/franchiseL12AwardNewsAdapter.ts:5-16` | Base dramatic weight per award/honor kind | Feeds `franchiseHonorEmission.ts:47`, called from `franchiseAllStarLockPayouts.ts` (§8, All-Star lock) and `franchiseSeasonEndHonors.ts` (season-end honors) — the one adapter in this section with real production callers | FLAG-GATED (phase2 'l12') — the only §9 adapter that is wired at all; still gated, not unconditionally live |
| `L12_NEWS_DRAMATIC_WEIGHT.magnitudeScale` | 0.3 | `src/src_figma/app/engines/reporter/franchiseL12AwardNewsAdapter.ts:17` | Scales award-margin/notability magnitude into dramatic weight | — | FLAG-GATED (phase2 'l12') |
| `L4B_MATRIX_NEWS_TUNING.seasonTakeSignificanceThreshold` | 5 (abs morale points) | `src/src_figma/app/engines/reporter/franchiseL3MatrixNewsAdapter.ts:37` | Minimum |morale delta| before a Master-Morale-Matrix consequence becomes a season-level news take (below this, it's per-play noise) | — | DARK ("NO production caller yet — the post-D13/browser emission seam", file's own header, confirmed) |
| `L4B_MATRIX_NEWS_TUNING.base` / `.magnitudeScale` / `.magnitudeDenominator` | 0.35 / 0.35 / 10 | `src/src_figma/app/engines/reporter/franchiseL3MatrixNewsAdapter.ts:38-40` | Dramatic-weight formula for a qualifying matrix consequence | — | DARK |
| `STADIUM_RECORD_NEWS_DRAMATIC_WEIGHT.setBase` / `.overtakeBase` / `.magnitudeScale` | 0.5 / 0.6 / 0.25 | `src/src_figma/app/engines/reporter/franchiseStadiumRecordNewsAdapter.ts:23-27` | Dramatic weight for a park-record set vs. overtaken | — | DARK (no production caller found for `buildFranchiseStadiumRecordSeasonNewsEvent`) |
| `DRAFT_RECAP_DRAMATIC_WEIGHT.base` / `.magnitudeScale` | 0.5 / 0.3 | `src/src_figma/app/engines/reporter/franchiseDraftRecapNewsAdapter.ts:5` | Dramatic weight for the post-draft recap news item | — | DARK (no production caller found outside its own file) |
| `NARRATIVE_INTENSITY_THRESHOLDS` (low/medium/high) | commentaryWpaThreshold 0.15/0.08/0.04; commentaryDramaticWeightThreshold 4/2.5/1.5; summaryRegenDelta 10/5/3; postGameColumnTargetWords 150/300/500; expectedGrokCallsPerGame 3-5/10-15/25-40 | `src/src_figma/app/engines/reporter/narrativeIntensity.ts:18-43` | User-facing "how chatty is my reporter" dial — controls the play-by-play commentary trigger thresholds and post-game column length | Read by `commentaryEngine.ts` / `reporterContext.ts` | LIVE (user-selectable intensity setting feeds the live in-game commentary path) |
| `shouldEmitSeasonNews` gate | `config.perEventRate[eventType] > 0`, else `!config.marqueeOnly` | `src/src_figma/app/engines/reporter/seasonNewsGenerator.ts:135-145` | Master per-event-type on/off + "marquee only" gate before any season news is generated | Reads `SeasonEmissionConfig` (below) | LIVE |
| `DEFAULT_SEASON_EMISSION_CONFIG` | `marqueeOnly: true`, `perEventRate: {}` | `src/utils/seasonEmissionConfigStorage.ts:9-12` | Default emission posture: only marquee (non-rate-limited) events emit news until the user configures rates | — | LIVE |
| Season-news LLM call params | `model: "claude-sonnet-4-6"`, `temperature: 0.6`, `maxTokens: 900`, `intensity: "medium"` (hardcoded) | `src/src_figma/app/engines/reporter/seasonNewsGenerator.ts:163-169` | LLM sampling parameters for season-news generation | Reporter heat/intensity stays hardcoded 'medium' regardless of user's narrative-intensity setting for this particular path (per several adapters' own comments) | LIVE |
| In-game commentary LLM default temperature | `DEFAULT_TEMPERATURE = 0.7` | `src/src_figma/app/engines/reporter/commentaryEngine.ts:36` | Default sampling temperature for live in-game commentary (distinct from the season-news 0.6) | — | LIVE |

**Cross-cutting discrepancy:** the season-news dramatic-weight layer is split between the L12 award adapter (flag-gated but genuinely wired via `franchiseHonorEmission.ts`) and explicitly DARK-by-design everywhere else (L10, L11, L13, L3-matrix, stadium-record, draft-recap — each adapter's own file header says "NO production caller yet"). A sim-tuning pass on the DARK adapters' weights has **zero observable effect** until the corresponding emission seam is wired — tune the L12 numbers first if the goal is an observable effect.

---

## 10. Designations

| Knob | Value | file:line | What it controls | Interacts with | Live? |
|---|---|---|---|---|---|
| `ALBATROSS_UNDERPERFORMANCE_THRESHOLD` | -0.25 (valueDelta-over-contract ratio) | `src/utils/franchiseDesignationEligibility.ts:102,424` | Threshold below which a player becomes Albatross-eligible | Feeds §2 Flashpoint's "turned-on" player detection (`franchiseFlashpointDecayCompute.ts:80-96` reads the ALBATROSS designation row) | LIVE (`TEAM_MVP`/`ACE`/`FAN_FAVORITE`/`ALBATROSS` are "active v1" per the policy matrix at lines 118-150+) |
| ACE eligibility score floor | `score < 0.5` blocks ACE | `src/utils/franchiseDesignationEligibility.ts:236-237` | Minimum trusted pWAR-based score to qualify as team Ace | — | LIVE |
| Designation badge visuals (not numeric) | color/border per designation × projected/active state | `src/utils/franchiseDesignations.ts:105-160` | Cosmetic only — included for completeness, not a tuning knob | — | LIVE |

---

## 11. Mojo / Fitness (GameTracker-live system — distinct from the draft/IV-layer "Effective Ratings" mojo below)

| Knob | Value | file:line | What it controls | Interacts with | Live? |
|---|---|---|---|---|---|
| `MOJO_STATES` stat multipliers | RATTLED 0.82, TENSE 0.90, NORMAL 1.00, LOCKED_IN 1.10, ON_FIRE 1.14, JACKED 1.18 | `src/engines/mojoEngine.ts:111-154` | Stat multiplier applied per mojo level (-2..+3, 6 states) | Combined with fitness multiplier in `applyCombinedModifiers` | LIVE (used throughout GameTracker UI/hooks) |
| `MOJO_TRIGGERS` (20 triggers) | e.g. HOME_RUN +1.5, ERROR -1.0, CAUGHT_STEALING -1.0, STRIKEOUT -0.5, PITCHER_CLEAN_INNING +0.5 | `src/engines/mojoEngine.ts:160-187` | Base mojo delta per in-game event | `getMojoDelta`, `processMojoTriggers` | LIVE |
| `MOJO_AMPLIFICATION` | tieGameLateInnings 1.5, rispTwoOuts 1.3, closeGame 1.2, playoffGame 1.5, basesLoaded 1.4 | `src/engines/mojoEngine.ts:193-199` | Situational multipliers on mojo-trigger magnitude | `calculateAmplification` | LIVE |
| `MOJO_CARRYOVER_RATE` | 0.3 (30%) | `src/engines/mojoEngine.ts:205` | Fraction of end-of-game mojo carried into the next game | `calculateStartingMojo` | LIVE |
| `FITNESS_STATES` multipliers + injury chance | JUICED 1.20/0.5% inj, FIT 1.00/1%, WELL 0.95/2%, STRAINED 0.85/5%, WEAK 0.70/15%, HURT 0.00/100% | `src/engines/fitnessEngine.ts:140-207` | Stat multiplier + injury probability per fitness state | Combined with mojo in `applyCombinedMultiplier` | LIVE |
| `FITNESS_DECAY` (by role) | starter base -15/-2 per inning/-5 for 100+ pitches; reliever -5/-3/-3 backToBack; closer -8/-2/-5 backToBack; catcher -5/-0.5/+3 rest; position player -3 started/-1 pinch/+2 rest | `src/engines/fitnessEngine.ts:220-247` | Per-game fitness decay by role and usage | `calculateFitnessDecay` | LIVE |
| `FITNESS_RECOVERY` | positionPlayer +5%/day, pitcher +8%/day, catcher +6%/day, maxDailyRecovery 15, durable ×1.5, injuryProne ×0.7, consecutive-rest bonus up to ×1.25 at 4+ days | `src/engines/fitnessEngine.ts:253-267` | Daily fitness recovery rate + trait/rest modifiers | — | LIVE |
| `JUICED_REQUIREMENTS` | minConsecutiveDaysOff 5, cooldownGames 20, duration: extendedRest 3/allStarBreak 10/seasonStart 10/randomEvent 5 | `src/engines/fitnessEngine.ts:273-282` | Gates for entering/duration of the "Juiced" (PED-like) fitness boost | — | LIVE |

**Drift-risk finding (parallel system):** `src/data/rosterEngineConstants.ts:86-158` defines an entirely SEPARATE "Effective Ratings" mojo/fitness model for the draft/roster-intelligence (IV) layer — its own `MOJO_STATES` array (`Rattled/Tense/Normal/Locked In/On Fire/Jacked`), its own `MOJO_DELTAS` (-10 to +15, additive not multiplicative), its own `PRESSURE_MULTIPLIER` (high 1.5/extreme 2.0) and `FATIGUE_MODEL`. This is a **different numeric scale from the live GameTracker mojo system above** (additive rating points vs. multiplicative stat scaling) and has no shared source — a sim-tuning pass must not assume changing one affects the other. See §16 discrepancies.

---

## 12. WAR / Value Engines

| Knob | Value | file:line | What it controls | Interacts with | Live? |
|---|---|---|---|---|---|
| `SMB4_BASELINES` | leagueWOBA 0.329, wobaScale 1.7821, leagueFIP 4.04, fipConstant 3.28, replacementRunsPer600PA -12.0, gamesPerTeam 50, runsPerGame 3.19 (full 20-field block) | `src/types/war.ts:53-91` | The canonical SMB4 run-environment baseline used by every WAR calculator | Consumed by `bwarCalculator.ts`, `pwarCalculator.ts` | LIVE |
| `SMB4_WOBA_WEIGHTS` | uBB 0.521, HBP 0.566, single 0.797, double 1.332, triple 1.813, homeRun 2.495 | `src/types/war.ts:151-158` | Weighted-event coefficients for wOBA | `calculateWOBA` (`bwarCalculator.ts:47-67`) | LIVE |
| `MLB_BASELINES` (reference only) | runsPerWin 10.0, leagueWOBA 0.320, wobaScale 1.226 | `src/types/war.ts:37-44` | MLB comparison baseline, not used in live calc paths directly | — | LIVE (reference constant, read by `createDefaultLeagueContext`) |
| `runsPerWinForSeason()` scaling | `10 × (gamesPerSeason / 162)` | `src/utils/franchiseAdaptiveStandards.ts:173-181` | THE runs-per-win formula — critical gotcha (must scale with season length, not use the 17.87 Pythagorean constant) | Feeds every WAR calculator's win-conversion step | LIVE |
| `MLB_BASELINE_GAMES` / `MLB_BASELINE_INNINGS` / `MLB_BASELINE_RUNS_PER_WIN` | 162 / 9 / 10 | `src/utils/franchiseAdaptiveStandards.ts:8-10` | Anchors for every season-length scaling factor | — | LIVE |
| `SMB4_DEFAULT_GAMES` / `SMB4_DEFAULT_INNINGS` | 128 / 6 | `src/utils/franchiseAdaptiveStandards.ts:13-14` | Default assumed season shape when no league config is available | `DEFAULT_ADAPTIVE_STANDARDS_CONFIG` | LIVE |
| `FIELDING_RUN_VALUES` (putout/assist/doublePlay/error run values) | e.g. unassisted DP 0.25, mental error -0.25, wrong-base throw error -0.25 | `src/engines/fwarCalculator.ts:23-53` | Base run value per fielding outcome type | `POSITION_MODIFIERS` scales these per position | LIVE |
| `POSITION_MODIFIERS` / `DIFFICULTY_MULTIPLIERS` / `POSITIONAL_ADJUSTMENTS` | e.g. C putout 1.3×, diving catch 2.5×, robbed-HR 5.0×; positional adj C +3.7 runs/48g, 1B -3.7 | `src/engines/fwarCalculator.ts:63-110` | Position-difficulty and positional-adjustment scaling for fWAR | — | LIVE |
| `SMB4_PITCHING_BASELINES`, `DEFAULT_PARK_FACTOR`, `SMB4_PARK_FACTORS` | `DEFAULT_PARK_FACTOR = 1.00` | `src/engines/pwarCalculator.ts:19,519,526` | Pitching-side baselines + per-park factor table | — | LIVE |
| `STOLEN_BASE_VALUES`, `ADVANCEMENT_VALUES`, `GIDP_VALUES` | (named blocks; not individually enumerated here) | `src/engines/rwarCalculator.ts:24,41,64` | Baserunning run values (rWAR) | — | LIVE |
| `LI_BOUNDS` / `BASE_OUT_LI` (24-cell table) | min 0.1/max 10.0; base-out LI ranges 0.86 (empty, 0 outs) to 2.67 (bases loaded, 2 outs) | `src/engines/leverageCalculator.ts:104-134` | Leverage Index lookup table + clamp | Feeds clutch detection, fame's iconic-event LI multiplier, WPA weighting | LIVE |
| `INNING_MULTIPLIERS` / `WALKOFF_BOOST` | inning 1→0.70 ... inning 9→2.00; walk-off boost ×1.40 | `src/engines/leverageCalculator.ts:140-155` | Late-inning leverage escalation + walk-off situational boost | — | LIVE |
| `LI_CATEGORIES` | LOW ≤0.85, MEDIUM 0.85-2.0, HIGH 2.0-5.0, EXTREME ≥5.0 | `src/engines/leverageCalculator.ts:160-165` | LI banding used for clutch/extreme-leverage classification | Clutch flags at LI≥1.5 (line 483), high-stakes LI≥2.5 (line 491), game-on-line LI≥5.0 (line 499) | LIVE |
| `getScoreDampener` blowout bands | ≥7 runs → 0.10×, ≥5 → 0.25×, ≥4 → 0.40×, tie → 1.00× | `src/engines/leverageCalculator.ts:253-273` | Dampens leverage in blowout games | — | LIVE |
| KBL-WPA credit-share fractions | ITPHR 70% batting/30% baserunning; SF/SAC 30% runner-advancement budget; FC fielding share 10%, DP 20%, error-context up to 30%; defensive-sequence shares 20-35% per touch | `src/utils/kblWpaAttribution.ts:428-429,436,901-932,1011-1066` | How a single play's total WPA gets split across the batter/runner/fielders involved | Feeds §1 Fame's `wpa_spine` channel (via `wpaToHeatScale`) and the reporter's commentary WPA threshold | LIVE |

**Two-copy drift risk (confirmed DEAD, not just drifted):** `src/src_figma/app/types/war.ts` is a full duplicate of `src/types/war.ts` with materially different values (e.g. `SeasonLength` is `24\|32\|40\|48\|56\|81\|100\|162` in the canonical file vs. `'mini'\|'short'\|'standard'\|'long'` mapped to `16/20/32/48` games in the app copy). A repo-wide grep of every `types/war` import (`src/src_figma/app/hooks/useWARCalculations.ts:35`, `src/src_figma/app/engines/warOrchestrator.ts:27`) shows **both actual callers resolve to the canonical `src/types/war.ts`**, not the app copy. The app copy has zero importers — it is fully orphaned, not merely a drift risk. Do not tune it; it has no runtime effect. See §16 discrepancies.

---

## 13. Trade Demand (propensity, feeds L10)

| Knob | Value | file:line | What it controls | Interacts with | Live? |
|---|---|---|---|---|---|
| `TRADE_REQUEST_TUNING.discontentWeight` / `.loyaltyInversionWeight` / `.angerWeight` | 0.6 / 0.5 / 1.0 | `src/engines/tradeRequestGeneration.ts:32-34` | Weights combining player discontent, a signed loyalty term (inverts under angry-fan conditions), and fan anger into trade-request propensity | Gates the L10 `roster/trade_demand` event (`franchiseL10EventEngine.ts:296-307` calls `computeTradeRequestPropensity`) | FLAG-GATED (phase2 'l10', transitively — this engine has no other caller) |
| `TRADE_REQUEST_TUNING.requestThreshold` | 0.5 | `src/engines/tradeRequestGeneration.ts:36` | Propensity score above which a player actually requests a trade | — | FLAG-GATED (phase2 'l10') |
| `TRADE_REQUEST_TUNING.personalitySensitivity` (7 personalities) | EGOTISTICAL 1.5 (most likely to demand) … RELAXED 0.5 (least) | `src/engines/tradeRequestGeneration.ts:37-45` | Personality multiplier on propensity | — | FLAG-GATED (phase2 'l10') |
| `TRADE_REQUEST_TUNING.intensityMultiplier` | juiced 1.3, standard 1.0, nerfed 0.6 | `src/engines/tradeRequestGeneration.ts:46-50` | Same intensity dial pattern as L10 (currently hardcoded to 'standard' at the sweep) | Shared shape with `FRANCHISE_L10_EVENT_TUNING.intensityMultiplier` (§6) — duplicated, not shared code | FLAG-GATED (phase2 'l10') |

---

## 14. Hidden Modifiers Generation & Captain Selection

| Knob | Value | file:line | What it controls | Interacts with | Live? |
|---|---|---|---|---|---|
| Hidden-modifier distribution | `clamp(50 + normal(seed) × 20, 0, 100)` for loyalty/ambition/resilience/charisma | `src/utils/prospectScoutingDraftEngine.ts:1438-1445` | The actual random-distribution generator (mean 50, spread factor ×20 on a seeded normal draw), clamped 0-100 — called by `generateFranchiseHiddenModifierBackfill` (`src/utils/franchiseInitializer.ts:278-297`) for any player missing modifiers | Every hidden-modifier consumer across Fame, Morale Matrix, Relationships, Trait Acquisition, Trade Demand reads this distribution's output | LIVE |
| `CAPTAIN_AGE_TILT_TIERS` | ≤22 → -6, ≤26 → -2, ≤30 → 0, ≤34 → +4, else +6 | `src/utils/franchiseInitializer.ts:312-318` | Age tilt (±6 points) added to loyalty+charisma when selecting a team captain | `computeTeamCaptains` (lines 332-362) | LIVE |

**Note:** the task brief attributed "modifier distribution" to `franchiseInitializer.ts`; the actual generator lives in `prospectScoutingDraftEngine.ts:1438` and `franchiseInitializer.ts` only calls it for backfill. Filed as read, not as an error in the brief.

---

## 15. Roster Engine Constants — cross-cutting registry (`src/data/rosterEngineConstants.ts`)

This file is primarily the **draft/IV-layer (auction/roster-intelligence) constant registry**, not a living-season runtime file — most of its ~40 exported constants (usage weights, potency scale, reserve-price curve, salary floors, lineup-slot weights) govern draft valuation, not in-season simulation. The living-season-relevant knobs already captured elsewhere:

| Knob | Value | file:line | What it controls | Interacts with | Live? |
|---|---|---|---|---|---|
| `CHECKPOINT_CADENCE_COUNTS` | standard 5, frequent 10 | `src/data/rosterEngineConstants.ts:284-287` | (duplicated from §5 for cross-reference) | §5 Development | FLAG-GATED (phase2 'checkpoint'/'traits') |
| `MOJO_STATES` / `MOJO_DELTAS` / `PRESSURE_MULTIPLIER` / `FATIGUE_MODEL` (Effective-Ratings layer) | see §11 drift-risk note | `src/data/rosterEngineConstants.ts:86-159` | A parallel, non-shared mojo/fitness model used by IV/roster-intelligence engines, NOT the live GameTracker mojo/fitness system | See §11 | Confirmed used only by IV/draft engines (`deriveUsageWeights` and friends), not `processCompletedGame.ts` — OUT OF SCOPE for living-season runtime tuning |

---

## Cross-System Interaction Map

```
Hidden Modifiers (generateHiddenPersonalityModifiers, §14)
  └─→ feeds loyalty/ambition/resilience/charisma into:
        Master Morale Matrix (§3: personality tilt, ambition/resilience swing)
        Relationship Formation (§4: rivalry/feud/friendship/mentorship scoring)
        Trait Acquisition (§5: ambitionTilt/resilienceTilt/charismaTilt)
        Trade Demand (§13: loyalty inversion term)
        Fan Morale Dampener (§5: loyaltyAmplification)
        Franchise Initializer captain-age tilt (§14)

KBL-WPA Attribution (§12)
  └─→ wpaToHeatScale (§1) → Fame heat (wpa_spine channel)
        └─→ Fame heat/reachFloor → L12 Race Standings fame-tilt (§8)
        └─→ Fame heat → Master Morale Matrix `fame` tap → player self-morale (§3)
        └─→ Fame reachFloor → Honor reach-floor ratchet on award win (§1/§8)

WAR / True Value (§12)
  └─→ WAR percentile → Fame's warGravity (§1)
  └─→ valueDelta ($) → Checkpoint ratings-development performance signal (§5)
  └─→ valueDelta ($) → L10 event performanceSignal (§6)
  └─→ valueDelta ($) → L11 firing player-ripple severity (§7)
  └─→ valueDelta ($) → Designation eligibility (Albatross/Ace/MVP/Fan Favorite) (§10)
  └─→ trueValue/valueDelta → L12 TV-family races (KK/Bust/Comeback) (§8)

Fan Morale (classic + franchise ledger, §2)
  └─→ Fed BY: game results, streaks, trades, roster moves (fanMoraleEngine.ts, always-live)
  └─→ Fed BY (franchise ledger, flag-gated): Master Morale Matrix teamFanMoraleDelta (§3),
        L11 firing relief bump (§7), L13 relationship-flare fan nudge (§9, DARK),
        Flashpoint per-game tax (§2, computed but not yet applied)
  └─→ Feeds: Ratings Development dampener (§5), L10 event moraleFactor/fanMoraleSuppression (§6),
        L11 auto-backstop arming threshold (§7), Trade Demand fan-anger term (§13)

Designations (§10)
  └─→ ALBATROSS status → Flashpoint's "turned-on player" detection (§2)
  └─→ Feeds no salary/morale/relationship effects automatically (per policy matrix, §10)

Relationship Edges (§4)
  └─→ Formed BY: RelationshipFormation scoring (§4), Stadium-record overtakes (§4),
        Race snubs (§4/§8), All-Star snubs (§4/§8)
  └─→ Intensity decays every game (§4) → dissolveThreshold gates edge lifecycle
  └─→ Feeds: Master Morale Matrix relationship tap (§3), L13 news dramatic weight (§9, DARK),
        L13 fan-morale nudge (§9, DARK)

L12 All-Star Lock (§8)
  └─→ Triggers: Career selection increment, Honor reach-floor ratchet (§1),
        Race-snub morale event (§3/§8), Relationship snub edges (§4), L12 award news emission (§9, flag-gated 'l12')

Reporter Dramatic Weight (§9)
  └─→ Only the L12 award adapter has a real production caller (still flag-gated); L10/L11/L13/L3-matrix/stadium-record/draft-recap
        adapters are fully built but DARK (no emission caller) — tuning them has
        zero observable effect until wired.
```

---

## Highest-Risk Knobs (small change → cascades across 3+ systems)

1. **`FAME_INPUT_TUNING.wpaToHeatScale` (10)** — `src/utils/franchiseFameCompute.ts:49`. Every play's WPA flows through this single scalar into Fame heat, which then feeds L12 race standings, the Morale Matrix's `fame` tap (player morale), and the honor reach-floor ratchet. A change here silently re-tunes four downstream systems at once.
2. **`RATINGS_DEVELOPMENT_TUNING.performanceSignalScale` (10, overridden to 200000 for the real sweep)** — `src/engines/ratingsDevelopment.ts:56` / `src/utils/franchiseCheckpointSweepCompute.ts:88-91`. Two different magnitudes for "the same" constant across the generic engine and its real caller is itself a landmine — tuning the generic default without touching the override (or vice versa) desyncs playtest expectations from production behavior.
3. **`CHECKPOINT_CADENCE_COUNTS` (standard 5 / frequent 10)** — `src/data/rosterEngineConstants.ts:284-287`. Shared denominator for BOTH the ratings-development checkpoint sweep (§5) and the trait-grant checkpoint sweep (§5) — changing cadence changes how much in-window data each sweep aggregates, silently changing confidence (`ratingConfidence`) and trait-candidate sample sizes system-wide.
4. **`FAN_DAMPENER_TUNING` block** — `src/engines/fanMoraleDampener.ts:15-31`. Consumed directly inside the ratings-development checkpoint math (§5), meaning any Fan Morale tuning pass (§2) has a second-order effect on player ratings development that is easy to miss if you only look at the morale spec.
5. **`ALL_STAR_LOCK_FRACTION` (0.6)** — `src/utils/franchiseAllStarLock.ts:2`. Single trigger for the entire L12 lock cascade: career-selection increments, honor reach-floor ratchets, race-snub morale events, AND relationship-snub-edge formation (§4/§8) all fire off this one game-number checkpoint. Moving it earlier/later shifts five separate systems' timing simultaneously.
6. **`RELATIONSHIP_INTENSITY_TUNING.dissolveThreshold` (0.25) / `.formThreshold` (0.6)** — `src/engines/relationshipIntensity.ts:40-41`. Read directly by three different callers (`franchiseRelationshipMoraleCompute.ts:277`, the intensity lifecycle itself, and indirectly by every overtake/envy/snub edge writer in §4) — a small change re-times when every relationship-driven morale/news effect turns on or off.

---

## Discrepancies Found

1. **`FAME_TUNING.tradeReset` / `applyTradeReset`** (`src/engines/fameModel.ts:124-127,252-263`) has a fully-built tuning block and function but no caller was found anywhere in the trade-execution path. Either an unwired seam or a stale export — not verified further per the "don't invent, flag" rule.
2. **`src/src_figma/app/types/war.ts`** is a full duplicate of `src/types/war.ts` with a materially different `SeasonLength` type/mapping, but has **zero importers** anywhere in the repo (`useWARCalculations.ts` and `warOrchestrator.ts` both resolve to the canonical `src/types/war.ts`). This is DEAD CODE, not merely a drift risk as the task brief characterized it — worth a cleanup ticket, flagged rather than deleted here (read-only sweep).
3. **`src/engines/kblWpaAttribution.ts`** has no single named tuning object (unlike every other subsystem swept) — its credit-share fractions are inline numeric literals scattered across ~15 call sites (lines 428-429, 436, 901-932, 1011-1066). This makes it the one subsystem in this registry without a central tunable surface; a sim-tuning pass would need to hand-edit each literal.
4. **The reporter/dramatic-weight adapter layer (§9)** is mostly DARK by the adapters' own file-header admission (`franchiseL10NewsAdapter.ts`, `franchiseL11ManagerChangeNewsAdapter.ts`, `franchiseL3MatrixNewsAdapter.ts`, `franchiseStadiumRecordNewsAdapter.ts`, `franchiseRelationshipFlareEmission.ts`/`franchiseL13RelationshipFlareNewsAdapter.ts`, `franchiseDraftRecapNewsAdapter.ts` all say "NO production caller yet" in their own comments) — confirmed by grep, not merely asserted. Only the L12 award adapter is wired live via `franchiseHonorEmission.ts`.
5. **`src/data/rosterEngineConstants.ts`** duplicates a "mojo" and "fitness" naming scheme (`MOJO_STATES`, `MOJO_DELTAS`, `FATIGUE_MODEL`) that is a completely separate numeric system from the live GameTracker `mojoEngine.ts`/`fitnessEngine.ts` (§11) — same names, unrelated values/scales, no shared source of truth. This is a real naming-collision risk for anyone editing "the mojo constants" without checking which file they're in.
6. Every file named in the task's subsystem list existed and was read in full; no missing-file discrepancies beyond the two path corrections already resolved (`franchiseRelationshipFlareEmission.ts` lives at `src/src_figma/app/engines/reporter/`, not `src/utils/`; `kblWpaAttribution.ts` lives at `src/utils/`, not `src/engines/`).

---

## Count Summary

| Subsystem | Knob rows |
|---|---|
| §1 Fame | 12 |
| §2 Fan Morale (classic + ledger + flashpoint) | 12 |
| §3 Master Morale Matrix | 8 |
| §4 Relationships | 13 |
| §5 Ratings & Trait Development | 18 |
| §6 L10 Random Events | 6 |
| §7 L11 Manager Firing | 6 |
| §8 L12 Races/All-Star | 7 |
| §9 L13 Flares + News/Dramatic-Weight | 16 |
| §10 Designations | 3 |
| §11 Mojo/Fitness | 7 |
| §12 WAR/Value | 13 |
| §13 Trade Demand | 4 |
| §14 Hidden Modifiers/Captain | 2 |
| §15 Roster Engine Constants (living-season cross-reference) | 2 |
| **Total tunable knob rows** | **134** |

(Several rows are multi-value clusters — e.g. `MORALE_TUNING.personality` is one row covering 7 personalities × 5 parameters each, `BASE_MORALE_IMPACTS` is one row covering 23 event types — so the raw count of individually-adjustable numbers is materially higher than 134, likely 300+. JK's ~100 estimate is a reasonable floor for "named tunable clusters"; this registry counts at the cluster level for readability while preserving every sub-value inline.)


> **CORRECTION 2026-07-11 (hunt X12, dual-verified):** `INNING_MULTIPLIERS` (leverageCalculator.ts) is DEAD CODE — zero readers; the live inning factor is computed elsewhere. Any row above listing it as LIVE is wrong; it is being deleted in HUNTFIX-ENGINE E8.
