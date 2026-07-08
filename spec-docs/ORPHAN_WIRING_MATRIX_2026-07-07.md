# Living-Season Orphan/Wiring Matrix — Consolidated

Sources (tag → tracer): [FLAG]=flag-registry mission · [TV]=tv-spine · [PM]=player-morale · [FM]=fan-morale · [RR]=relationships-rivalries · [MH]=matchup-history · [TR]=traits · [RA]=ratings-adjustments/checkpoints · [SS]=season-setup-config · [RI]=roster-intelligence · [FN]=fame-news · [BEAT]=beat-reporter · [SCOUT]=scout-vs-asstgm · [L10]=random-events · [L14]=rebrand · [MGR]=managers · [CHEM]=chem-potency+hidden-modifiers · [CRITIC]=adversarial spot-check (overrides tracer verdict where noted) · [BACKSTOP]=spec-inventory-backstop. All tracers ran read-only against worktree `/private/tmp/kbl-port2`, main-track, HEAD ≈`e2c70323`/`a6faa78f` (single afternoon, 2026-07-07); [FN] ran after commit `260397bc` flipped `/franchise/:id` → FranchiseLensHub, most others ran before it (see §5).

System ordering follows `scratchpad/V1_CANON_DRAFT.md` §4 (23-row Mode-2 living-season list), with cross-mode systems (Scout/Asst-GM, Season-Setup extras) and a legacy-code appendix added after.

---

## §1 THE MATRIX

### 0. Phase-2 Flag Activation Infrastructure (cross-cutting — gates 11 systems below) [FLAG]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| Flags | MORALE flag | PARTIAL | No prod activation path; only vitest setters + dev-gated seed route | Y | `franchisePhase2Flags.ts:1-11`; only non-test caller `FranchiseLensSeedPlayed.tsx:48`, gated by `App.tsx:248-249` DEV/test only |
| Flags | FAME flag | PARTIAL | Same pattern | Y | `franchisePhase2Flags.ts:13-23`; seed route `:49` |
| Flags | FLASHPOINT flag | PARTIAL | Same pattern | Y | `franchisePhase2Flags.ts:25-35`; seed route `:50` |
| Flags | CHECKPOINT flag | PARTIAL | Same pattern | Y | `franchisePhase2Flags.ts:37-47`; seed route `:51` |
| Flags | TRAITS flag | PARTIAL | Same pattern | Y | `franchisePhase2Flags.ts:49-59`; seed route `:52` |
| Flags | L10 flag | PARTIAL | Same pattern | Y | `franchisePhase2Flags.ts:61-71`; seed route `:53` |
| Flags | L11 flag | PARTIAL | Same pattern | Y | `franchisePhase2Flags.ts:73-83`; seed route `:54` |
| Flags | L12 flag | PARTIAL | Same pattern; only Phase-2 chain with a confirmed live UI trigger point (`emitFranchiseSeasonEndHonors`) | Y | `franchisePhase2Flags.ts:85-95`; `FranchiseHome.tsx:3272,3312` — but that page is unrouted (see #17/#19 below) |
| Flags | L13 flag | PARTIAL | Same pattern; one UI-visibility-only gate (not a data path) | Y | `franchisePhase2Flags.ts:97-107`; `LeagueBuilderLeagues.tsx:134` |
| Flags | L14 flag | ORPHANED | Double gap: no prod flip path AND its sole consumer has zero callers even if flipped | Y | `franchisePhase2Flags.ts:109-119`; L14 absent from `processCompletedGame.ts` flag-import block entirely |
| Flags | STADIUM_RECORDS flag | PARTIAL | Worse than the other 10 — omitted even from the dev seed route; never exercised outside raw vitest | Y | `franchisePhase2Flags.ts:121-131`; `FranchiseLensSeedPlayed.tsx:47-58` sets the other 10, omits this one |
| Flags | [CRITIC nuance] | — | Flag-activation gap is a hard LAUNCH blocker but NOT a §16 tuning blocker — L-SIM harness forces flags via test setters, so numeric tuning can proceed in parallel | N (for tuning) / Y (for launch) | [CRITIC] summary |

### 1. True Value & frozen anchors [TV]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| TV | Computed live per game | WIRED-LIVE | — | N | `salaryCalculator.ts:1000` → `franchiseTrueValueStorage.ts:489` → `processCompletedGame.ts:327,1328` |
| TV | Frozen draft-IV baseline | SPEC-DRIFT | No `draftIV`/frozen anchor field exists anywhere; formula is a floating peer-percentile market model, not vs-frozen-baseline | Y | `salaryCalculator.ts:1004-1019`; spec = LSD §3/LS-3/LS-4 |
| TV | `franchiseTrueValueSnapshots` persistence | WIRED-LIVE | — | N | `trackerDb.ts:370-371`, `backupRestore.ts:362`, `syncConfig.ts:23` |
| TV | Kara Kawaguchi/Bust/Comeback awards read TV spine | ORPHANED / SPEC-DRIFT | Flagship TV consumers never call the TV spine; sort on static `grade`+`salary` instead | Y | `AwardsCeremonyFlow.tsx:1873-1919`; zero `trueValue`/`valueDelta` refs in that block |
| TV | Fan Favorite / Albatross read TV | WIRED-LIVE | Small-league peer-pool trust-gate (n≥2) could block edge cases | N | `franchiseDesignations.ts:417-461`; `franchiseTrustedValueStorage.ts:5` |

### 2. Designations (6 live, Cornerstone cut) [PM,TV,CHEM]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| Designations | Fan Favorite / Albatross compute + morale tap | BUILT-DARK-BY-DESIGN | Behind MORALE flag | N | `processCompletedGame.ts:396-467`; matrix rows `masterMoraleMatrix.ts:417,420` [PM f6] |
| Designations | Team Captain selection (charisma+loyalty scoring) | WIRED-LIVE | Only ungated, always-executes Phase-2 consumer in the whole app | N | `franchiseInitializer.ts:343-347` [CHEM Part D3] |
| Designations | Fan Hopeful reseed (rebrand-linked) | BUILT-DARK-BY-DESIGN | Rides L14 (ORPHANED) — see §11 | Y | `franchiseRebrandCascade.ts:42-46` [L14] |

### 3. Master Morale Matrix (one deterministic event×personality×modifier table) [PM,FM]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| Morale Matrix | Row-to-live-tap coverage (59 rows) | PARTIAL | 52/59 rows (88%) have zero production caller — exist only for TS exhaustiveness | Y | `masterMoraleMatrix.ts:308-432`; [CRITIC] independently confirmed exactly 7 live rows |
| Morale Matrix | 7 wired taps (TEAMMATE_AWARD/FAN_FAVORITE_LOCKED/ALBATROSS_LOCKED/TRADE_DEMAND/PARK_RECORD_SET/RIVAL_GAME_WIN/LOSS) | BUILT-DARK-BY-DESIGN | Behind MORALE flag | N | `processCompletedGame.ts:396-829` [PM f2-4,6] |
| Morale Matrix | Ledger store (`kbl-franchise-morale`) | WIRED-LIVE | Populated today via draft-seed baselines, confirmed random events, manual GM overrides — even with every flag off | N | `franchiseMoraleState.ts:98-227,357-450` [PM f7] |
| Morale Matrix | MANAGER_FIRED row vs. bespoke firing morale-delta | SPEC-DRIFT | Two un-reconciled systems for the same event; matrix row is decorative dead weight | N | `franchiseManagerFiring.ts:174-197` never calls `composeMoraleConsequence` [PM f13, MGR confirms] |
| Morale Matrix | Race-snub morale tap | BUILT-DARK-BY-DESIGN | Double-gated L12+MORALE | N | `franchiseRaceSnubMorale.ts:100-140` [PM f14] |
| Morale Matrix | Relationship tap (rivalry/feud/friendship/mentorship contagion) | BUILT-DARK-BY-DESIGN | Real non-stub impl (resolves prior "neutral stub" finding); behind L13+MORALE | N | `masterMoraleMatrix.ts:621-660` [PM f15] |

### 4. Four hidden modifiers (Loyalty/Ambition/Resilience/Charisma) [CHEM]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| Hidden Modifiers | Attachment (draft-pool-lock chokepoint + franchise-init backfill) | WIRED-LIVE | Resolves prior "defined-not-attached" finding — now stale | N | `prospectScoutingDraftEngine.ts:1282`; `franchiseInitializer.ts:273-298,776` [CHEM D1-D2] |
| Hidden Modifiers | Consumer engines (morale/dampener/traits/relationship scoring) | PARTIAL | Real, non-placeholder math, but every consumer sits behind its own default-OFF Phase-2 flag except captain selection | Y | `masterMoraleMatrix.ts,fanMoraleDampener.ts,traitAcquisition.ts` [CHEM D3] |

### 5. Seven visible personalities [CHEM]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| Personality | Attachment + consumption (matrix tuning table, relationship scoring) | PARTIAL | Same generation/chokepoint as hidden modifiers; consumers flag-gated | Y | `masterMoraleMatrix.ts:264-282`; `relationshipFormation.ts` [CHEM D4] |

### 6. Fan-morale ratings dampener [FM]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| Dampener | Directional brake on counter-trend rating swings | PARTIAL | Real math (§16 tuning-locked shape), reads real ledger — but zero UI ever attributes a rating change to it | N | `fanMoraleDampener.ts:15,43`; called from `ratingsDevelopment.ts:176` [FM f3] |

### 7. Traits/ratings separation + checkpoints (20%-cadence sweep, 2-trait cap) [TR,RA]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| Traits/Checkpoints | Dormant-trait detection wave (T-9/DT-B..F/BF-MH/CAP-MISS) | BUILT-DARK-BY-DESIGN | Behind TRAITS flag | N | `traitCandidateBuilder.ts:45-170` [TR f1] |
| Traits/Checkpoints | Trait grant checkpoint sweep | BUILT-DARK-BY-DESIGN | Writes overlay rows `pending`/`applied:false` only | N | `franchiseTraitGrantCompute.ts:166-308` [TR f2] |
| Traits/Checkpoints | Opposite-pairs 2-trait cap | BUILT-DARK-BY-DESIGN | Behind TRAITS flag | N | `traitAcquisition.ts:347-370` [TR f4] |
| Traits/Checkpoints | SP/RP cohort split (Workhorse) | BUILT-DARK-BY-DESIGN | Behind TRAITS flag | N | `traitCandidateBuilder.ts:1894-2005` [TR f5] |
| Traits/Checkpoints | §8C position-mismatch protect — engine half | BUILT-DARK-BY-DESIGN | Behind TRAITS flag | N | `traitAcquisition.ts:115-120,712-715` [TR f6] |
| Traits/Checkpoints | §8C position-mismatch — scout/analyzer display half (T-6b) | MISSING | Zero consumers of the mismatch map outside acquisition engine; self-documented as deferred, not built | N | `scoutMove.ts`,`rosterAnalyzer.ts` — no import [TR f7] |
| Traits/Checkpoints | Trait-overlay confirm/apply (mutate `trait1`/`trait2`) | ORPHANED | Zero callers anywhere; "mark entered" UI checkbox is local React state only | Y | `franchiseTraitConfirmApply.ts:19-55`; `FranchiseLensHub.tsx:2081-2106` [TR f8] |
| Traits/Checkpoints | checkpointRatingSignal pure engine (position-pure mean, thin-pool suppress) | BUILT-DARK-BY-DESIGN | Behind CHECKPOINT flag | Y | `checkpointRatingSignal.ts:279-316` [RA f1] |
| Traits/Checkpoints | Sweep call site in game-completion pipeline | WIRED-LIVE | Single confirmed call site | N | `processCompletedGame.ts:1411-1417` [RA f2] |
| Traits/Checkpoints | Roster-agnostic peer pools + sample floors | WIRED-LIVE | One documented open residual: window scan may miss a player whose only window appearance is the just-finished game | N | `checkpointRatingSignal.ts:71-86`; `franchiseCheckpointSweepCompute.ts:306-456` [RA f3] |
| Traits/Checkpoints | Ratings-overlay pending→confirmed adoption | PARTIAL | `confirmOverlay()` fully built, zero callers; `mergeRatingsOverlays` (live-called) filters to `confirmed`-only, so nothing ever surfaces | Y | `ratingsOverlayConfirmation.ts:71-78`; `ratingsOverlayMerge.ts:50,62` [RA f4] |
| Traits/Checkpoints | Checkpoint cadence (20%-of-season) | PARTIAL | Real toggle exists but gated behind wrong flag (L13, not CHECKPOINT) — every league silently pinned to 'standard' | N | `LeagueBuilderLeagues.tsx:134,636-661` [RA f6] |
| Traits/Checkpoints | Age modifier (RA-5 gravity + A2.5 expected-bar shift) | BUILT-DARK-BY-DESIGN | Real, non-placeholder, committed — behind CHECKPOINT flag only | N | `expectedStatsEngine.ts:126-141`; `ratingsDevelopment.ts:69-86` [RA f7] |
| Traits/Checkpoints | Trend tilt (RA-9, recent-form blend) | BUILT-DARK-BY-DESIGN | Data fully computed/threaded but `trendTiltWeight=0` — explicit §16 placeholder | Y | `ratingsDevelopment.ts:42,64,151-157` [RA f8] |
| Traits/Checkpoints | Checkpoint confirm console UI ("per-team change log") | PARTIAL | Component well-built (`CheckpointTakeover`) but dev-preview-only route; "mark entered" is decorative, never persists | Y | `FranchiseLensHub.tsx:2051-2113`; gated `App.tsx:250` [RA f9] |
| Traits/Checkpoints | Trait UI surfaces (badges/timeline/checkpoint-takeover) | PARTIAL | Two gaps: dev-only route AND a join-key bug (`trait-grant-N` vs `checkpoint-N`) means trait changes can never populate even when reached | N | `franchiseTraitGrantCompute.ts:257` vs `franchiseCheckpointSweepCompute.ts:527`; `useFranchiseLensData.ts:1133` [TR f9] |
| Traits/Checkpoints | Downstream live effect of a trait (advisory ratings + IV) | SPEC-DRIFT | Seed/manual-edit traits DO flow through; earned traits never can (confirm/apply orphaned above) | N | `effectiveRatings.ts:184-185` [TR f10] |

### 8. Random-Events System ("Chaos/d20") [L10]

*Naming trap: `TeamHubContent.tsx` "Random Event Log" panel is a DIFFERENT, unrelated system (`franchiseRandomEventGenerator.ts`) — do not conflate with §10.*

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| L10 Random-Events | Resolution engine (deterministic FNV-1a roll) | WIRED-LIVE (pure fn) | Called from a live gate, but every output stays inert downstream | N | `franchiseL10EventEngine.ts` (450 lines) |
| L10 Random-Events | Event-menu catalog (9 categories) | PARTIAL | 8/9 families present as roll-only; concrete resolution (which trait/pitch/cosmetic, magnitude) unbuilt; team-family only 2/5 sub-events (no promo night/rivalry flare/roll-fire manager firing) | Y | `franchiseL10EventEngine.ts:145-234`; `FRANCHISE_L10_EVENT_MAGNITUDE` hardcodes every family to 1 |
| L10 Random-Events | Cadence (continuous per game) | WIRED-LIVE | Matches ratified JK override (Q5, 2026-06-18), not spec-drift | N | `franchiseL10SweepCompute.ts:1-34` |
| L10 Random-Events | Intensity dial (Juiced/Standard/Nerfed) | SPEC-DRIFT + PARTIAL | Hardcoded `'standard'`; the visible "liveliness" preview control uses a different vocabulary and is a disconnected mock | Y | `franchiseL10SweepCompute.ts:87-88`; `SeasonRulesPreview.tsx:67,106-111` (dev-only) |
| L10 Random-Events | Player-morale weighting input | PARTIAL | Likely reads static default `player.morale`, not the live morale snapshot (unconfirmed sync elsewhere) | Y | `franchiseL10SweepCompute.ts:153` |
| L10 Random-Events | Store/persistence (L10-2) | BUILT-DARK-BY-DESIGN | Reads have zero production callers; no confirm/apply/promotion step | Y | `franchiseL10OverlayStorage.ts:104,124` |
| L10 Random-Events | Stadium-change resolution from an L10 sweep (L10-4) | ORPHANED | Resolver only reachable via unrelated L14 rebrand, never from L10's own candidate events | Y | `franchiseStadiumChangeResolver.ts`; only caller `franchiseRebrandApply.ts:231-243` |
| L10 Random-Events | Reporter tap (L10-5) + UI surface | BUILT-DARK-BY-DESIGN / MISSING | Self-documented "DARK/ORPHANED-PENDING" in its own file header; no routed UI reads any overlay | N | `franchiseL10NewsAdapter.ts:12` |

### 9. Two-Tier Confirmation Model (§11 — morale silent, ratings/trait require confirm) [synthesis]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| Two-Tier Confirm | Confirm/apply step, as a pattern | MISSING | The single biggest cross-cutting gap: none of L10 overlays, trait overlays, or ratings overlays ever get a promotion/confirm step in production — 3 independent instances of the identical missing wire | Y | L10: `franchiseL10OverlayStorage.ts`; Traits: `franchiseTraitConfirmApply.ts`; Ratings: `ratingsOverlayConfirmation.ts` — all zero-caller |

### 10. Managers + firing + MOY truth-layer [MGR]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| Managers | Tracking (WPA/record/tenure → Almanac) | WIRED-LIVE | Uses the new deployment-WPA truth-layer, not the deprecated fixed 60/40 formula | N | `managerWpaGameState.ts`; `almanacQueries.ts:1246,1294`; routed `/almanac/managers` |
| Managers | Firing (fan-relief bump + player ripple) | BUILT-DARK | Both consequences correctly built and wired into live post-game hook, but flag default-off, no manual "hot seat" UI anywhere, and the one display component (`FiringTakeover`) always fed `undefined` | Y | `franchiseL11FiringEngine.ts:66`; `franchiseManagerFiring.ts:139`; `useFranchiseLensData.ts:1345-1346` |
| Managers | Manager of the Year (§23.7) | WIRED-LIVE, weight PARTIAL | Uses correct WPA truth-layer + unit-scaling + no-salary-term (2/3 reconciliation items done); composite weight is an admitted 50/50 §16 placeholder | Y | `franchiseAwardsEngine.ts:131,469,646` |
| Managers | Deprecated `mwarCalculator` fixed 60/40 engine | ORPHANED | Zero live callers into MOY/POG/Almanac/overlay — genuinely retired, retirement candidate | N | `src/hooks/useMWARCalculations.ts`, `src/src_figma/app/hooks/useMWARCalculations.ts` — defined, never imported |

### 11. Rebrand circuit-breaker (dwell → GM offer → 6-step cascade) [L14]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| Rebrand (L14) | Dwell counter (20-game trigger) | BUILT-DARK-BY-DESIGN | Correct primitive, matches JK ruling — but never fed real data (caller is itself unreached) | N | `franchiseRebrandDwell.ts:14-29` |
| Rebrand (L14) | Offer gate (`getRebrandOffer`/`acceptRebrandOffer`) | ORPHANED | Zero non-test callers; flag default-off with no activation path; a 2nd independent gate (MORALE flag) stacks underneath | Y | `franchiseRebrandOffer.ts:43-69` |
| Rebrand (L14) | GM offer UI seam | MISSING | `RebrandTakeover` modal exists but both buttons only call `onClose`; only place `moments.rebrand` populates is a hardcoded preview mock | Y | `FranchiseLensHub.tsx:2259-2276`; `useFranchiseLensData.ts:1345-1346` |
| Rebrand (L14) | 6-step cascade (fire→badges/reseed→stadium→fame-reset→dead-money-stub→morale-hard-set) | BUILT-DARK-BY-DESIGN | One correctly-ordered atomic call site, all 6 steps individually correct per spec; dead-money step is a documented no-op stub (not a gap) | N | `franchiseRebrandApply.ts:169-307` |
| Rebrand (L14) | Relocation history record — read/display path | MISSING | Write path matches spec field names exactly; zero consumers read `teamHistory`/`formerTeamName`; Almanac's "formerly known as X" not built | N | `franchiseRebrandCascade.ts:48-57`; `almanacTeamIdentity.ts` — no reference |

### 12. Fan Morale — the four teeth [FM]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| Fan Morale | Core catalog widening via L3 matrix taps | WIRED-LIVE | 8 call sites in `processCompletedGame.ts`, behind MORALE flag | N | `masterMoraleMatrix.ts:308-432` [FM f2] |
| Fan Morale | Per-team persistence (re-verified) | WIRED-LIVE | Refutes an old audit's "zero writes" claim for today's code | N | `franchiseMoraleState.ts:171,228,258,495` [FM f4] |
| Fan Morale | Home-park rivalry amplifier ("the grudge") | SPEC-DRIFT | Flat +2 fan/+1 captain additive (JK-ruled pivot 2026-06-26); `STADIUM_ANALYTICS_SPEC_V2.md` §7 still describes a 2x multiplier + >.500 gate — doc never updated | Y | `masterMoraleMatrix.ts:171-172,427-428`; [CRITIC] confirmed |
| Fan Morale | Live "FAN MORALE SPEC ALIGNMENT" self-audit panel | SPEC-DRIFT | Tells the user designation inputs are "blocked/not final" — false; two write paths wired since 06-27, adapter file never refreshed | N | `franchiseFanMoraleSpecAdapter.ts:209`; `TeamHubContent.tsx:5165` |
| Fan Morale | Legacy display components (`FanMoralePanel.tsx`, `GameTracker/FanMoraleDisplay.tsx`) | ORPHANED | Zero importers; latter under the known-inactive GameTracker path | N | retirement candidates |
| Fan Morale | GameTracker "prototype" `useFanMorale` hook | ORPHANED | Write-only — `processGameResult()` called, output never read/displayed/persisted, discarded on unmount | N | `GameTracker.tsx:2125-2126,11433,11451` |
| Fan Morale | MODE_2 §20.1 weighted Core Formula (`calculateFanMorale` etc.) | MISSING | Confirmed zero hits anywhere — but explicitly documented as a JK-acknowledged v1 deferral (event-ledger built as substitute), not a silent gap | N | `FAN_MORALE_SYSTEM_SPEC.md` "Franchise Internal v1 Checkpoint" section |

### 13. Relationships-lite (6 edge types) [RR]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| Relationships | L13 edge store + checkpoint formation writer | BUILT-DARK-BY-DESIGN | Behind L13 flag | N | `franchiseRelationshipFormationCompute.ts`; `processCompletedGame.ts:1427` |
| Relationships | Record-overtake edge stamped `type:'RIVALRY'` (morale-bearing) | BUILT-DARK-BY-DESIGN | A 2026-06-23 DECISIONS_LOG ruling recommended the morale-inert HISTORY slot instead, to avoid double-counting the fame-swap the overtake already triggers; canonical spec left it an open choice. **RESOLVED 2026-07-07 — ratified as HISTORY; see `V1_CANON_2026-07-07.md` §6. One-line code change still ticketed to the manifest, not yet applied** | N (ruled 2026-07-07) | `franchiseRelationshipOvertakeCompute.ts:78-79` vs `DECISIONS_LOG.md:272` |
| Relationships | Race-envy + All-Star-snub edge writers | BUILT-DARK-BY-DESIGN | Behind L12/L13 | N | `franchiseRelationshipEnvyCompute.ts`; `franchiseRelationshipAllStarSnubCompute.ts` |
| Relationships | `rivalryScores` legacy team-scoped store | ORPHANED | Schema-registered in 4 places, zero writer function anywhere; structurally can't hold a player-pair edge | N | retirement candidate |
| Relationships | Home-park rival (compute/storage/tap) + rival-red highlighting | BUILT-DARK-BY-DESIGN | Behind STADIUM_RECORDS flag; read path live on OLD hub | N | `franchiseHomeParkRivalCompute.ts:44`; consumed `useFranchiseData.ts:396` |
| Relationships | Pre-move relationship intel / reporter heads-up (§24.5) | ORPHANED | Fully built + unit-tested; zero caller anywhere in trade/call-up/send-down pipeline — the spec's core reporter value-add never fires | Y | `franchiseRelationshipIntel.ts:81,107,134` |
| Relationships | Relationship-flare reporter emission (§24.7) | ORPHANED | Adapter + LLM-gated emission both fully built; zero production caller/trigger exists | Y | `franchiseRelationshipFlareEmission.ts:66,104` |
| Relationships | Rivalry board / dedicated relationship-edge UI | **BUILT-DARK-BY-DESIGN** [CRITIC-OVERTURNED, was MISSING] | Tracer's premise ("no production route") is stale — `/franchise/:id` → FranchiseLensHub is live (commits `6f08945b`/`47320458`) and its Clubhouse "ties" tab IS fed by the wired L13 write path. A *dedicated standalone* rivalry-board screen (distinct from Clubhouse) may still be unbuilt per V1_BUILD_STATUS.md | N | [RR] original chain + [CRITIC] override — root cause: `UI_TRUTH_MAP.md` row 15 is stale, still says FranchiseHome |

### 14. Fame (4-layer: recency WPA + WAR floor + iconic-event + status/celebrity) [FN,TV]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| Fame | Per-game compute (heat/channel aggregation) | PARTIAL | Behind FAME flag; secondary channel depends on `gameState.fameEvents`, sparsely populated — GameTracker's live "+Fame" popup toasts run on a wholly parallel, non-persisted tracker that never reaches the franchise fame record | Y | `franchiseFameCompute.ts:76`; `fameIntegration.ts:290` (parallel, unwired) |
| Fame | Reach-floor / honor-driven heat ratchet | PARTIAL | Mid-season All-Star path reachable; season-end honors path only as reachable as its (orphaned) trigger — see next row | Y | `franchiseHonorReachFloor.ts:22` |
| Fame | Season-end honors emission chain (freeze→WAR-awards→honors→ratchet→news) | ORPHANED | Only non-test caller lived in now-unrouted `FranchiseHome.tsx` (route flip `260397bc` stranded it); nothing in `FranchiseLens.tsx` replaces the trigger — cannot fire in the live app today regardless of flag state | Y | `FranchiseHome.tsx:3262-3348`; `App.tsx:285-286,329` |
| Fame | Fame leaderboard UI (`FameLeaderboardCard`) | ORPHANED | Built + tested, never embedded in any routed page | N | only mounted on `/__preview/fame-leaderboard` |
| Fame | Fame pip on Almanac PlayerInstanceCard | SPEC-DRIFT | Two disconnected fame systems coexist — legacy `player.fame` tier (live pip) vs. new Phase-2 heat/reachFloor model (dark) — never reconciled | N | `PlayerInstanceCard.tsx:606,653` |
| Fame | TV-award family (Kara Kawaguchi/Bust/Comeback) | (see §1 TV row) | Bypasses the TV spine entirely | Y | duplicate of TV §1 row — cross-refs Fame layer |

### 15. Race system (season-long WAR+fame standing, snub tracking) [PM,RR]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| Race | Race-snub morale tap | BUILT-DARK-BY-DESIGN | Double-gated L12+MORALE | N | duplicate of §3 row |
| Race | Race-envy / All-Star-snub rivalry edges | BUILT-DARK-BY-DESIGN | Behind L12/L13 | N | duplicate of §13 row |
| Race | Visibility vs. Emission valve (full leaders table vs. curated push) | NOT AUDITED | No tracer directly walked the race-standings compute/display engine itself (`franchiseRaceStandingsCompute.ts`) beyond its snub/edge outputs | — | flagged gap, see §5 |

### 16. All-Star (voting/selection only, no game) [FN,SS]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| All-Star | Mid-season All-Star honors emission | WIRED-LIVE | Fully wired once L12 flag is on; survived the route flip because its trigger lives in `processCompletedGame`, not a page component | N | `franchiseAllStarRosterCompute.ts:42`; `processCompletedGame.ts:1473` |
| All-Star | Game-toggle in FranchiseSetup wizard | BUILT-DARK-BY-DESIGN (honest) | UI itself is disabled + labeled "(deferred in v1)" — no false promise | N | `FranchiseSetup.tsx:801-802` |

### 17. Awards (merit races, no mechanical rewards) [TV,MGR,FN]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| Awards | TV-award family (Kara/Bust/Comeback) | ORPHANED/SPEC-DRIFT | See §1 TV row — bypasses the spine | Y | `AwardsCeremonyFlow.tsx:1873-1919` |
| Awards | Manager of the Year | WIRED-LIVE, weight PARTIAL | See §10 Managers row | Y | `franchiseAwardsEngine.ts:131` |
| Awards | MVP/Cy Young/ROY/Silver Slugger/Gold Glove (merit-only WAR races) | NOT INDEPENDENTLY AUDITED | No tracer walked these specific categories' compute chain beyond confirming MOY reads the new truth-layer | — | flagged gap, see §5 |

### 18. Beat reporter [BEAT]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| Beat Reporter | Reporter hiring/assignment | WIRED-LIVE (auto) / PARTIAL (no franchise manual-hire UI) | Franchise auto-spawns reporters silently; manual hire UI only reachable in Exhibition/Elimination | N | `ensureFranchiseReporterForTeam` `franchiseGameLaunch.ts:113,397,407` |
| Beat Reporter | Identity/personality/voice/mood (270-combo model) | PARTIAL | Model matches spec exactly; generation is deterministic hash not weighted-random; mood-drift engine built but zero live callers — mood frozen forever | N | `reporterAssignment.ts:91-93`; `moodEngine.ts:207` (orphaned) |
| Beat Reporter | In-game commentary | BUILT-DARK-BY-DESIGN (franchise) / PARTIAL (exhibition) | `liveBeatReporterEnabled` hardcoded false at franchise launch, no toggle; per-play commentary functions exist, zero live callers even when on | N | `franchiseGameLaunch.ts:448`; `CommentaryFeed.tsx:244,250` |
| Beat Reporter | Post-game columns/recaps | WIRED-LIVE | Default ON for franchise; a separate `generateGameRecap` is a dead-end legacy path — don't conflate | N | `commentaryEngine.ts:573`; `gameStoriesStorage.ts:39` ← `GameTracker.tsx:11627` |
| Beat Reporter | Season news takes (9 emission kinds) | PARTIAL | Only 1/9 (L12/Awards) is live-wired, and flag-off by default; other 8 have builder fns but no emission wrapper ever called outside tests | **Y (tracer's own explicit "only genuine blocker")** | `franchiseHonorEmission.ts` vs. 8 dark adapters |
| Beat Reporter | Almanac story archive | WIRED-LIVE | Two sub-kinds silently empty: transaction-history (missing filter args) and park-records (STADIUM_RECORDS flag) | N | `almanacNarrativeArchive.ts:360`; routed `/almanac/narratives` |
| Beat Reporter | "Rival paper" / masthead consistency | BUILT-DARK-BY-DESIGN (concept doesn't exist) | No live user-facing inconsistency — conflicting masthead only in unrouted `FranchiseHome.tsx` | N | `useFranchiseLensData.ts:1081` |

### 19. Almanac archive [FN,BEAT]

*Both [BEAT] and [FN] independently traced this — they agree the compute/read path is live, disagree only on framing (BEAT: "WIRED-LIVE w/ 2 silently-empty sub-kinds"; FN: "PARTIAL, missing park-record filter chip + no SeasonNewsItem ingestion"). Merged below.*

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| Almanac | Narrative archive compute/read (tidbits, post-game-story, transactions, park-records) | WIRED-LIVE / PARTIAL (agreement: real, with gaps) | Park-record kind has no UI filter chip (mislabels as "POST-GAME SUMMARY"); transaction-history silently empty (missing scope filter args at call site) | N | `almanacNarrativeArchive.ts:360`; `AlmanacNarratives.tsx:10-15,36-39` |
| Almanac | SeasonNewsItem (fame/honors/flare) ingestion into Almanac | MISSING | Archive never imports `seasonNewsStorage`/`SeasonNewsItem` at all — fame/honors news has no path into the Almanac even once flags flip | N | `almanacNarrativeArchive.ts` — no import |

### 20. Stadium analytics / park records [MH,FLAG]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| Stadium Analytics | Home-Park Rival compute/persist + OLD-hub display | BUILT-DARK-BY-DESIGN | Behind STADIUM_RECORDS flag; fully wired end-to-end on old hub | N | `franchiseHomeParkRivalTap.ts:26`; `processCompletedGame.ts:1362` |
| Stadium Analytics | Home-Park Rival → FranchiseLensHub display | PARTIAL | `useFranchiseLensData.ts:686` explicitly defers `getHomeParkRival` — one missing wire between a working engine and an already-built display branch; now MORE consequential since the Lens is the live hub post-flip | Y | display branch exists `FranchiseLensHub.tsx:~1365-1369`; [CRITIC] confirmed core, corrected the stale "preview-only" routing claim |
| Stadium Analytics | Home-Park Rival → fan-morale 2x amplification | (dup of §12 row) SPEC-DRIFT | Two unrelated "rival" concepts coexist; only the generic 1.5x same-division multiplier fires, never the home-park-specific 2x | Y | `fanMoraleEngine.ts:374-375,405`; `leagueStructure.ts:197-203` |

### 21. Mojo & fitness [MODE_2 §14]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| Mojo/Fitness | Entire system | NOT AUDITED | No cluster in this pass traced mojo/fitness state, WAR-clutch adjustments, or fame integration (§14.9/14.10) | — | flagged gap, see §5 |

### 22. Milestones [MODE_2 §18]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| Milestones | Entire system | NOT AUDITED | No cluster traced adaptive-threshold milestones, franchise firsts/leaders, or team milestones | — | flagged gap, see §5 |

### 23. Standings [MODE_2 §21.1/21.2/21.4/21.5]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| Standings | Division structure / tiebreaker / magic number | NOT AUDITED (beyond L12 race-standings touch) | Only the race/snub *output* was traced, not the standings compute/display engine itself | — | flagged gap, see §5 |

### 24. Schedule (user-provided) [SS]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| Schedule | Schedule Type / Policy selector | ORPHANED | No interactive control exists at all (unlike mercy/trade-deadline, which are at least live checkboxes); silent hardcoded default carried through storage | N | `FranchiseSetup.tsx:785-795`; `franchiseInitializer.ts:215` |
| Schedule | Manual CSV/OCR/entry pipeline itself | NOT AUDITED | Season-setup cluster confirmed the *type selector* is dead but did not deep-trace the schedule-entry pipeline | — | flagged gap, see §5 |

### 25. Adaptive Standards Engine [MODE_2 §23]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| Adaptive Standards | Opportunity-factor / scaling-factor consumers | WIRED-LIVE (via season-setup 3-knob trace) | Season length + innings knobs fan out correctly to ~25 consumers | N | `franchiseAdaptiveStandards.ts:72-93` [SS f1-2] |
| Adaptive Standards | Full engine (qualification thresholds, position-specific floors) | NOT INDEPENDENTLY AUDITED | Only touched as a downstream consumer of the 3 wizard knobs, not walked as its own system; do not conflate with the LSD §8/§9/§11 checkpoint sweep (shares vocabulary, different system) | — | flagged gap, see §5 |

---

### 26. Scout / Assistant-GM (cross-mode: draft + in-season) [SCOUT,RI]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| Scout/AsstGM | Scout hire flow | WIRED-LIVE, spec-violating | Button reads "Continue to MLB Auction" — scout-hire screen gates MLB draft entry, contradicting farm-only canonical scope | Y | `ScoutHire.tsx:277`; routed `App.tsx:379` |
| Scout/AsstGM | Farm-draft band/fog generation | PARTIAL | Bands computed from hired-scout descriptor, never from `Team.farmArchetypeKey` — no archetype→confidence table exists | Y | `prospectScoutingDraftEngine.ts:1152-1213` |
| Scout/AsstGM | Old scout-hire mechanism (`scoutOrder`/`scoutPool`) | ORPHANED | Dead code — consumer page has no route | N | `leagueBuilderStorage.ts:257-262`; retirement candidate |
| Scout/AsstGM | Hidden-rating gate (true ratings stripped before DTO) | WIRED-LIVE | No bypass found | N | `prospectScoutingDraftEngine.ts:1586+` |
| Scout/AsstGM | Draft-side C1 (roster optimizer) / C2B (2nd-price market) / C3 (pool sizing) | WIRED-LIVE | Live in the routed Draft Room + MLB Auction | N | `rosterDesignFeasibility.ts`; `auctionMarketModel.ts:423-436,691` |
| Scout/AsstGM | Whisper panel — MLB auction | WIRED-LIVE | Full chain confirmed | N | `AuctionStage.tsx:311` ← `LeagueBuilderAuctionDraft.tsx:1174,1584` |
| Scout/AsstGM | Whisper panel — farm auction | MISSING | `LeagueBuilderFarmAuctionDraft.tsx` imports neither `AuctionStage` nor `WhisperPanel` — zero Asst-GM presence on farm, though the shared component was explicitly built farm-capable | Y | `AuctionStage.tsx:8-16` header comment; only exercised via dev preview |
| Scout/AsstGM | Wrong-fit penalty (Option A, JK-locked) | MISSING | Zero code anywhere | Y | grep: 0 hits `wrongFitPenalty`/`archetypePenalty` |
| Scout/AsstGM | Asst-GM named identity (hire/name capture) | MISSING | No `assistantGmName` field exists; product concept has one code comment total | N | `draftStaffingPersistence.ts:50-56` |
| Scout/AsstGM | In-season roster-readiness analyzer (`analyzeRoster`) | BUILT-DARK, now STRANDED | Sole consumer chain lived in now-unrouted `FranchiseHome`/`TeamHubContent` — the July-7 lens flip silently orphaned the only working in-season advisory | Y | `rosterAnalyzerEngine.ts:748`; `App.tsx:284-286` |
| Scout/AsstGM | In-season lineup optimizer | WIRED-LIVE | Real "Accept Optimal" apply action on live Lineups tab | N | `optimalLineup.ts:258`; `FranchiseLineupsBoard.tsx:23` |
| Scout/AsstGM | Dedicated in-season Asst-GM surface (C4-C) | MISSING | Zero route/component exists; the one UI slot shaped for it ("From the Skipper") renders nothing on the live path — biggest gap in the whole cluster | Y | `useFranchiseLensData.ts:1307-1338` (advice field never populated) |
| Scout/AsstGM | rosterIntelligencePayload in-season reuse | MISSING (draft-only) | Every non-test importer is draft-time; `chemistryRemovalAdvice` has zero importers, an explicit "wired after CODEX-ASSTGM-LEGALITY" TODO confirms known-open ticket | N | `rosterIntelligencePayload.ts` importers all draft-scoped |
| Scout/AsstGM | Chemistry-Trait Potency — realized in gameplay (Effective Ratings→TV) | BUILT-DARK, inert-in-practice | All 4 live callers of `effectiveRatings()` default to L2/empty-traits; live TV consumer (`salaryCalculator.ts`) has zero chemistry refs at all | N | `effectiveRatings.ts:503`; `lineupVsStarter.ts:88,146` [CHEM Part C] |

### 27. Season-Setup wizard — non-JK-ruled extras [SS]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| Season Setup | Season Length / Innings / Extra-Innings (JK's 3 ruled v1 knobs) | WIRED-LIVE | Full wizard→initializer→launch→GameTracker chain confirmed for all 3 | N | `FranchiseSetup.tsx:660-774` |
| Season Setup | Mercy Rule toggle | ORPHANED | Persisted, zero downstream reader; checkbox is live/clickable (not disabled/labeled) so user reasonably believes it works | N | `FranchiseSetup.tsx:801-839`; grep 0 consumers |
| Season Setup | Trade Deadline toggle | SPEC-DRIFT | §22.6 commits v1 to enforcement; engine functions exist and match spec exactly but are called from nowhere — live trade path has zero deadline awareness | N | `tradeEngine.ts:75-88`; `franchiseTradeAdapter.ts` 0 refs to "deadline" |
| Season Setup | Playoffs Format selector | PARTIAL | Field stored/echoed but playoff engine hardcodes single-elimination regardless — currently harmless only because UI restricts to the one implemented value | N | `usePlayoffData.ts:133-144` |
| Season Setup | Playoffs — Home Field Advantage | ORPHANED | No series-hosting engine reads it anywhere | N | `FranchiseSetup.tsx:987-1013` |
| Season Setup | League Builder "Rules Presets" subsystem (detailed mercy/trade-deadline-timing/pitch-counts) | ORPHANED (JK-confirmed intentional) | Entire parallel rules schema with zero path into `franchiseInitializer`/GameTracker; JK ruled "LEAVE ALONE" | N | `leagueBuilderStorage.ts:465-500`; `useFranchiseData.ts` 0 refs |

### 28. Matchup history (team-level, general — distinct from Home-Park Rival) [MH]

| System | Feature | Verdict | Missing link | Blocker | Evidence |
|---|---|---|---|---|---|
| Matchup History | General team-pair H2H tracker (`h2hTracker.ts`) | ORPHANED | Zero callers since a Feb-2026 commit; intended consumer (Free Agency's rival-pick logic) still hardcodes "best-record team" | N | `h2hTracker.ts`; `FreeAgencyFlow.tsx:422-427` |
| Matchup History | Old-hub "Today's Game" next-game/H2H preview | MISSING (self-documented cut) | Live static disclaimer, honest about the scope cut — not a silent gap | N | `FranchiseHome.tsx:4150-4157` |
| Matchup History | `MatchupDramaBar` (Lens "reporter drama" widget) | ORPHANED | Mounted only on a dev fixture-preview route with 100% hand-authored data; "rivalry" fields trace to hand-typed lore, not computed history | N | `MatchupDramaBarPreview.tsx`; retirement/promotion candidate |
| Matchup History | Batter-vs-pitcher career matchup (GameTracker panel) | WIRED-LIVE | The one genuinely live "matchup history" feature — unrelated to team-level history, easily confused by name | N | `eventLog.ts:1695`; `fenwayBoardContext.ts:52` |

---

## §2 THE PRE-TUNING BLOCKER LIST

Ordered per the requested framework. "Blocker" here means: blocks §16 Simulation-Gate tuning, blocks JK's launch sign-off, or both — noted per item. [CRITIC] flags that the flag-activation item specifically does NOT block §16 tuning (L-SIM harness bypasses flags via test setters) but IS a hard launch blocker — everything else below genuinely blocks tuning of the number it touches.

### (a) Activation infrastructure — likely THE gating item
1. **Build a real production toggle for the 11 Phase-2 soul flags.** Today the only non-test flip path is a dev/test-gated seed route (`FranchiseLensSeedPlayed.tsx` behind `App.tsx:248-249`). No settings screen, league-config option, or env toggle exists. Fix direction: a franchise-setup or settings-screen control that calls the same setters, gated by environment not by DEV/test mode. [FLAG, all 9 clusters independently confirm]

### (b) Missing consumer/apply pipelines
2. **Build the Two-Tier Confirmation (§11) promote-to-live step — one fix pattern, three instances.** L10 overlays, trait overlays, and ratings overlays each have a fully-built "pending" write path and zero "confirmed"/apply path. Fix direction: one shared confirm-worklist pattern (the UI shell — `CheckpointTakeover` — already exists) wired to `applyConfirmedTraitOverlay`, `confirmOverlay`, and an equivalent L10 promotion function. [TR, RA, L10] — **RULED: wire-all (JK 2026-07-07)** for the L10 portion of this row (§11 confirm/apply pipeline is named explicitly in the ruling); see `V1_CANON_2026-07-07.md` §6
3. **Wire the flashpoint-decay fan-morale tax into the live morale ledger.** Computed tax accumulates in a side table only the L-SIM harness reads; never applied to the number players see. Fix direction: one call from the decay compute into `applyFranchiseMoraleEffect`. [PM] — **RULED: wire-all (JK 2026-07-07)**; see `V1_CANON_2026-07-07.md` §6
4. **Restore the season-end honors emission trigger (freeze→awards→honors→ratchet→news) after the lens route flip.** Its only caller lived in now-unrouted `FranchiseHome.tsx`; nothing in `FranchiseLens.tsx` replaced it — cannot fire today regardless of flags. Fix direction: port the `isSeasonOver` effect into `FranchiseLens.tsx`/`useFranchiseLensData.ts` or a shared hook. [FN]
5. **Wire the L12 emission toggle for the 5 remaining beat-reporter news kinds** (L10 morale, L11 manager-change, L3 matrix, stadium-record, draft-recap) — pure adapters exist, no emission wrapper built yet for any of them (the documented 2-step pattern's step 2 never landed). [BEAT, FN]

### (c) Stranded/orphaned surfaces
6. **Rewire the in-season Assistant-GM (C4-C).** The July-7 lens flip stranded the only working in-season advisory chain (`analyzeRoster`) on the dead `FranchiseHome`/`TeamHubContent` page; populate `RosterExtras.advice`; fill the hardcoded stats-feed stub; wire `chemistryAdviceForCandidate`/`chemistryRemovalAdvice` into call-up/send-down UI. Named across 5+ planning docs, zero commits reference it. [SCOUT]
7. **Rewire the TV-award family (Kara Kawaguchi/Bust/Comeback) to read the TV spine** instead of the placeholder grade+salary sort in `AwardsCeremonyFlow.tsx`. [TV]
8. **Build a manual "hot seat"/firing UI** — manager firing is code-complete (both consequences correct) but has no manual trigger anywhere; only 2 automatic paths exist and both are flag-gated dark. [MGR]
9. **Build the rebrand GM-offer UI** — `RebrandTakeover` modal's buttons don't call the engine; wire `acceptRebrandOffer`/`executeRebrandCascade`. [L14]
10. **Decide fate of the morale-history surfaces on the LENS vs. the old hub.** Old hub (`TeamHubContent`) has a genuine, live per-player + team-fan morale history panel; a richer NEW-CANON popover exists only on the dev preview route. Post-flip, confirm which becomes canonical and port accordingly. [PM]

### (d) Formula/spec forks needing a JK ruling
11. **True Value model: frozen-draft-IV baseline (spec) vs. floating peer-percentile market model (shipped).** No frozen anchor exists anywhere in the codebase. Recommendation in §3. [TV]
12. **§19 Fan Favorite/Albatross trade-mechanics contradiction** — TOC marks deferred-to-v2, decision-traceability table marks C-056 "✅ Applied" to the same section. **RESOLVED 2026-07-07 — all trades MANUAL in v1; AI trade logic (incl. the 15% discount) deferred; the fame/morale consequences of a manual Fan-Favorite/Albatross trade ARE v1 (existing §20.4 systems). See `V1_CANON_2026-07-07.md` §6.** [BACKSTOP]
13. **Purge the 52/59 dead Master Morale Matrix rows**, or explicitly ratify them as intentional exhaustiveness padding for a future wave. **TRACKED 2026-07-07 — PENDING-JK-CONFIRM row added to `V1_CANON_2026-07-07.md` §6; a wire-now/defer/kill triage doc is expected before this closes.** [PM, CRITIC]
14. **Rule on the record-overtake edge type: RIVALRY (morale-bearing, shipped) vs. HISTORY (morale-inert, DECISIONS_LOG-recommended)** — avoid double-counting the fame-swap the overtake already triggers. **RESOLVED 2026-07-07 — ratified as HISTORY; see `V1_CANON_2026-07-07.md` §6. One-line code change ticketed to the manifest.** [RR]
15. **Rule on Home-Park Rival → fan-morale 2x amplification** — spec wants a rival-specific 2x multiplier; shipped code only ever fires a generic 1.5x same-division multiplier from an unrelated static table. [MH, FM]

### (e) Input-quality fixes
16. **L10's player-morale weighting input** — confirm/fix whether it should read the live `getFranchiseMoraleSnapshot` per-player ledger instead of the static `Player.morale` default field. [L10]
17. **Scout farm-draft bands** — derive from `Team.farmArchetypeKey` instead of the hired-scout's own descriptor (the Q11-ratified refactor is entirely unbuilt). [SCOUT]

---

## §3 JK DECISION LIST

1. **True Value formula: rebuild to match the frozen-draft-IV spec, or ratify the shipped floating peer-percentile market model?** Either way the 3 TV-family awards need rewiring to actually read whichever spine wins. Recommendation: ratify the shipped model (it's mature, tested, and rebuilding risks re-opening a settled system) — but this is a real behavior difference (moving target vs. fixed target) worth JK's eyes before §16 tuning locks numbers to it. **TRACKED 2026-07-07 — PENDING-JK-CONFIRM row added to `V1_CANON_2026-07-07.md` §6; explanation delivered, JK confirmation still expected.** [TV]
2. **§19 contradiction: is the Albatross 15% trade discount / Fan-Favorite trade-mechanics chapter deferred to v2 or already applied?** TOC says deferred; the decision-traceability table says C-056 applied it. Recommendation: treat as v1-scope unless JK says otherwise, since a decision-log entry usually postdates and supersedes a TOC line — but flag explicitly, don't infer silently. **RESOLVED 2026-07-07 — see item 12 above / `V1_CANON_2026-07-07.md` §6.** [BACKSTOP]
3. **Record-overtake relationship edge: RIVALRY (ongoing morale effect) or HISTORY (inert)?** Shipped as RIVALRY; a 2026-06-23 ruling recommended HISTORY to avoid double-counting the fame swap the overtake already causes. Recommendation: switch to HISTORY per the existing ruling — it's a one-line type change, and the double-count risk was never actually resolved before shipping. **RESOLVED 2026-07-07 — see item 14 above / `V1_CANON_2026-07-07.md` §6.** [RR]
4. **Home-park-rivalry fan-morale magnitude and mechanism**: spec wants a rival-specific 2x multiplier; shipped code fires a generic 1.5x same-division multiplier and never checks home-park-rival status at all. CURRENT_STATE.md already flags the fan/captain magnitude (2/1) as JK-tunable. Recommendation: fold the home-park-rival check into the vsRival computation and let §16 tune the final magnitude together, rather than tuning two disconnected numbers separately. [MH, FM]
5. **Manager of the Year weight (50/50 deployment-WPA vs. record) is an admitted placeholder** — needs a §16 tuning decision on the real split. **RESOLVED-RATIFIED-SHIPPED 2026-07-07 — MOY = the revamped single-output manager WPA (3:2:1 net-from-zero deployment model) + team record above True-Value expectation, two inputs only, old 4-input MOY-1 framing superseded; final weights land in §16 tuning. See `V1_CANON_2026-07-07.md` §6.** [MGR]
6. **The 52/59 dead Master Morale Matrix rows** — purge now (cleaner, less confusing for tuning) or leave as scaffolding for a later wave (WIN/LOSS/CHAMPIONSHIP/CLUTCH_HIT/MANAGER_FIRED/etc.)? Recommendation: purge — a §16 tuner should not be able to "tune" a row that can never fire. **RESOLVED-WIRE-ALL 2026-07-07 — JK ruled AGAINST this doc's own purge recommendation: all ~52 unwired rows must be WIRED (the data already exists in the GameTracker/hub pipeline), no purge; rows dependent on out-of-v1 systems (e.g. CHAMPIONSHIP → playoffs) defer with their system. Same ruling covers L10 full-wiring. See `V1_CANON_2026-07-07.md` §6.** [PM, CRITIC]
7. **UI_TRUTH_MAP.md needs a full re-walk post-lens-flip** (commit `260397bc`) before anyone trusts its routing claims — at least one finding (relationships rivalry board) was already proven wrong by this staleness. Recommendation: re-walk before the next audit pass, not before this one closes. [CRITIC, all clusters that predate the flip]

---

## §4 RETIREMENT LIST (confirmed-orphaned legacy code, safe to delete)

- **`src/utils/managerStorage.ts`** (DB `kbl-manager`) + **deprecated `mwarCalculator`** (`src/hooks/useMWARCalculations.ts`, `src/src_figma/app/hooks/useMWARCalculations.ts`, `src/src_figma/app/engines/mwarIntegration.ts`) — zero non-test callers into MOY/POG/Almanac; fully superseded by `managerIdentityStorage.ts` + deployment-WPA. [MGR]
- **`rivalryScores` legacy IndexedDB store** (`src/types/reporter.ts:175-186`) — schema-registered in 4 places (trackerDb/sync/backup/reset), zero writer function anywhere, structurally can't hold a player-pair edge. Superseded by `RelationshipEdgeRow`. [RR]
- **Old scout-hire mechanism** (`scoutOrder`/`scoutPool`/`hiredScoutIdsByTeamId`, `leagueBuilderStorage.ts:257-262`) — dead code, consumer page has no route. [SCOUT]
- **`src/components/FanMoralePanel.tsx` and `src/components/GameTracker/FanMoraleDisplay.tsx`** — zero importers; latter under the already-known-inactive GameTracker path. [FM]
- **`h2hTracker.ts`** general team-pair W-L tracker — zero callers since Feb-2026; intended consumer still hardcodes a different mechanism. [MH] — *lower confidence: this one has an approved-but-never-executed spec (S-FA006), so "retire" vs. "finally wire it" is a real fork, not a clean delete; flag to JK if reclaiming the Free-Agency rival-pick feature is still wanted.*
- **`src/src_figma/app/hooks/useFanMorale.ts`** prototype hook — write-only, discarded on unmount, explicitly superseded by the franchise-side ledger per its own (now-stale) call-site comment. [FM]
- **DEV-only mock/preview pages once their real counterpart is promoted**: `FranchiseLensPreview.tsx`, `FranchiseLensSeedPlayed.tsx` (once a real settings toggle replaces it), `DraftGuidePreview.tsx`/`DraftGuideCard.tsx`'s stale MLB-tier scout mental model (§ SPEC-DRIFT list). Not urgent — low risk while dev-gated, but worth a pass once the real surfaces exist. [SCOUT, RA, FM]

*Not included above pending JK ruling: the 52/59 dead Master Morale Matrix rows (§3 item 6) and the League Builder Rules Presets subsystem (JK already ruled "LEAVE ALONE" — not a retirement candidate, just confirmed disconnected-by-design).*

---

## §5 HONEST COVERAGE STATEMENT

**What was audited:** 9 main-workflow clusters (player-morale, fan-morale, relationships-rivalries, matchup-history, traits, ratings-adjustments, season-setup-config, roster-intelligence, fame-news — 91 features total) + 5 standalone tracers (spec-inventory-backstop, beat-reporter, scout-vs-asstgm, random-events/L10, rebrand/L14) + 2 recovered children of a failed parent dispatch (tv-spine, managers, chem-potency+hidden-modifiers — 3, not 2) + a flag-registry special mission (11 Phase-2 flags) + a 15-item adversarial critic spot-check. All read-only, file:line-cited, against a single worktree/afternoon (`/private/tmp/kbl-port2`, main-track, 2026-07-07).

**What was NOT audited (confirmed gaps, not just unlisted):**
- **Random-Events engine (§10) and Rebrand circuit-breaker (§14)** were flagged by the spec-inventory-backstop as having no clear owner among the original 9 clusters — both were subsequently covered by standalone tracers ([L10], [L14]), closing that specific gap.
- **Still genuinely uncovered per the critic's own completeness caveat** (critic saw only 4/9 clusters, so this is the at-risk set, not a proven omission — since resolved for #10/#14 above but the critic's list also named): the Dynamic Designations engine as a *continuous in-season recompute engine* (only audited as a morale input, never as its own system), and the Race/All-Star/Awards season-long honor system as a *whole* (only its snub/edge outputs were traced, not the standings-compute engine itself).
- **Never in scope for this pass at all**: Mojo & fitness (MODE_2 §14), Milestones (§18), Standings compute/display (§21.1/21.2/21.4/21.5) beyond the L12 race touch, the Adaptive Standards Engine as its own system (only touched as a downstream consumer of 3 season-setup knobs), the Schedule manual-entry pipeline itself (only its dead type-selector was traced), and the non-MOY Awards categories (MVP/Cy Young/ROY/Silver Slugger/Gold Glove).
- **Explicitly out of scope by the task framing**: playoffs, offseason, and Elimination Mode were not part of this living-season pass.

**Critic's completeness verdict** (from the workflow result): "VERDICT ACCURACY: 14 of 15 CONFIRMED correct; 1 OVERTURNED" (relationships rivalry board — see §1 row 13). The critic explicitly caveats its own completeness review was based on only 4 of 9 clusters due to a truncated JSON delivery, so its risk list above is inferential, not exhaustive.

**UI_TRUTH_MAP.md staleness — re-walk needed.** Commit `260397bc` ("Flip franchise route to lens") landed *during* this audit day and flipped `/franchise/:id` from the old `FranchiseHome` shell to `FranchiseLensHub`. Most clusters ([PM],[FM],[RR],[MH],[TR],[RA],[RI] in part) traced *before* this flip and describe `/franchise/:id` as still rendering the old hub, citing `UI_TRUTH_MAP.md` row 15/49/50 as their source — those citations are now stale. The [FN] cluster (which ran after the flip) independently discovered a real consequence of it: the season-end honors trigger, which lived only in the now-unrouted `FranchiseHome.tsx`, was silently stranded with no replacement caller (§1 row under Fame/§2 item 4). The critic formally re-verified and overturned exactly one finding on this basis (relationships rivalry board, §1 row 13); the same staleness likely affects — but was NOT independently re-verified for — the traits UI-surfaces row, the ratings-checkpoint-console row, and the roster-intelligence Moves-tab row (all three cite the identical pre-flip routing premise). **Recommendation: a full `UI_TRUTH_MAP.md` re-walk against post-flip HEAD should run before the next audit or before any UI-reachability claim in this matrix is used to plan work**, since several PARTIAL/MISSING verdicts above may already be one route-mapping-refresh away from resolving themselves for free (or, per the [FN] finding, revealing a second silent regression).


---
## §5 EXECUTION RECONCILIATION ADDENDUM (2026-07-08, full 137-row disposition pass)
**Counts:** 68 LANDED (incl. all 12 flag-activation rows via M2a) / 2 IN-FLIGHT (M1D, since merged) / 45 QUEUED-RULED / 12 RULED-OUT / 10 were UNOWNED — owners now assigned below. §2 blocker cross-check: 16/17 owned; #15 RULED (JK 2026-07-08): 2x per spec as wired starting point, tunable at s16 — zero open forks remain.
**Formerly-unowned items → owners (all now queued):**
1. Pre-move relationship intel / reporter heads-up (§24.5, built+tested, zero callers) → C4-C in-season lane (transaction-pipeline trigger).
2. Relationship-flare reporter emission (§24.7) → reporter wave; blocker-5 scope EXTENDED to all 8 dark emission kinds (was 5).
3. GameTracker "+Fame" iconic-event channel (live popups on a non-persisted parallel tracker; never reaches franchise fame record) → new wire ticket fameEvents→franchiseFameCompute; exception-class under the GameTracker freeze (living-season tracking = IN).
4. §8C position-mismatch scout/analyzer display half (T-6b) → trait-UI (S11).
5. Fame leaderboard UI (preview-only) → LENS-PARITY/Almanac embed.
6. Fame pip vs heat-model reconciliation (Almanac card) → fame-completion at flag-flip.
7. Race visibility-vs-emission valve (never audited) → targeted audit + reporter wave (emission side).
8. Franchise in-game commentary (hardcoded false; CANON §4 CONTRADICTION — canon claims wired) → beat-reporter lane; canon corrected this date.
9. SeasonNewsItem→Almanac ingestion (missing wire; Almanac never imports seasonNewsStorage) → Almanac lane.
10. MatchupDramaBar → RULED RETIRED for v1 (JK 2026-07-08); moves to the s4 retirement list.
**Stale verdicts superseded by landings:** all 12 flag-activation rows (M2a landed); Rules Presets leave-alone (superseded by RULES-V1-PRUNE); record-overtake→HISTORY ruled; TV frozen-IV drift resolved (peer-percentile ratified); scout-hire-gates-MLB premise corrected (F10); pre-lens-flip truth-map citations await the queued re-walk. Coverage caveat: 6 NOT-AUDITED rows (non-MOY awards, mojo/fitness, milestones, tiebreakers, schedule pipeline, adaptive-standards) marked LANDED by inference from V1_BUILD_STATUS S9/S10/S12 — spec-anchored verification of these rides the SOT-roundup workflow (running).
