# KBL Tracker Audit Triage Decisions

> This file is an exact markdown export of AUDIT_TRIAGE.xlsx for CLI readability.
> Authority: This file = spreadsheet. If they differ, re-export from xlsx.
> Last exported: 2026-02-06 20:11:56

## Column Reference
- A: ID
- B: Severity
- C: Batch
- D: Spec
- E: Code Location
- F: Spec Says
- G: Code Says
- H: Recommended Fix
- I: My Triage (pre-category)
- J: Triage Reason
- K: Your Decision (user override)
- L: Status

## Summary Statistics
- Total rows: 356
- DONE (Phase A): 18
- DONE (Phase C): 11
- APPROVED (Phase B): 312
- DUPLICATE: 8
- SKIP: 0
- DEFERRED: 0
- Phase B BUILD (blank K + I=FEATURE BUILD): 7
- Phase B BUILD (blank K + I=FIX CODE): 12
- NEEDS YOUR CALL (unresolved): 0

**Triage Breakdown:**
- DEFER: 40
- DOC ONLY: 86
- FEATURE BUILD: 128
- FIX CODE: 64
- NEEDS YOUR CALL: 28
- SKIP: 4
- UPDATE SPEC: 6

## All Decisions

### CRIT-B5-001
- Severity: CRITICAL
- Batch: 5
- Spec: OFFSEASON_SYSTEM_SPEC.md §8.3
- Code Location: FreeAgencyFlow.tsx:213-222
- Spec Says: Spec: FA dice assignment order diceOrder=[7,6,8,5,9,4,10,3,11,2,12] — best player gets 7 (16.67% leave chance)
- Code Says: Code: assigns DICE_PROBABILITIES array sequentially to grade-sorted players — best player gets dice value 2 (2.78% leave chance). INVERTED from spec intent
- Recommended Fix: Fix dice assignment mapping to use spec's diceOrder array TO MATCH CODE
- My Triage: NEEDS YOUR CALL
- Triage Reason: You flagged this — FA dice may be intentional design
- Your Decision: UPDATE SPEC
- Status: DONE (Phase C)

### CRIT-B6-004
- Severity: CRITICAL
- Batch: 6
- Spec: CONTRACTION_EXPANSION_FIGMA_SPEC.md §Screens 6-11
- Code Location: ContractionExpansionFlow.tsx:1006-1274
- Spec Says: Spec: 5 detailed screens (Expansion Draft, Scorned Effects, Player Disposal, Team Creation Wizard, Expansion Team Draft)
- Code Says: Code: ALL 5 screens are PLACEHOLDER text only ("Full draft simulation coming in next phase", "Retirement checks complete", etc.)
- Recommended Fix: Implement all 5 placeholder screens
- My Triage: NEEDS YOUR CALL
- Triage Reason: Placeholder/simulation — confirm this should be fully implemented
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### CRIT-B6-005
- Severity: CRITICAL
- Batch: 6
- Spec: DRAFT_FIGMA_SPEC.md §Farm Model
- Code Location: DraftFlow.tsx:72
- Spec Says: Spec: Farm max=10, release modal option triggered when full in order to draft or trade or sign another player (lines 424-495)
- Code Says: Code: Farm "can exceed 10" (line 72, 1347). No release mechanism. Fundamentally different roster model — Screen 6 (Release Player Modal) entirely absent
- Recommended Fix: Decide: adopt spec's 10-cap model and implement release modal, fix code to match new spec
- My Triage: NEEDS YOUR CALL
- Triage Reason: Spec and code differ — need your decision on which is correct
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### CRIT-B7-001
- Severity: CRITICAL
- Batch: 7
- Spec: FINALIZE_ADVANCE_FIGMA_SPEC.md §Season Transition
- Code Location: FinalizeAdvanceFlow.tsx:366-377
- Spec Says: Spec: Season transition performs 8 real operations (archive data, increment ages, recalc salaries, reset mojo, clear stats, apply rookies, increment service, finalize)
- Code Says: Code: startSeasonTransition() is a TIMER SIMULATION — no actual data mutations, just step counter every 600ms. Only real effect: incrementing season number in localStorage
- Recommended Fix: Implement actual season transition operations
- My Triage: NEEDS YOUR CALL
- Triage Reason: Placeholder/simulation — confirm this should be fully implemented
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### CRIT-B7-002
- Severity: CRITICAL
- Batch: 7
- Spec: FINALIZE_ADVANCE_FIGMA_SPEC.md §AI Roster
- Code Location: FinalizeAdvanceFlow.tsx:352-364
- Spec Says: Spec: AI processes non-user team rosters with call-ups, send-downs, retirements
- Code Says: Code: aiProcessing() is TIMER SIMULATION with hardcoded display text — no AI logic generates actual roster transactions
- Recommended Fix: Implement AI roster management engine
- My Triage: NEEDS YOUR CALL
- Triage Reason: Placeholder/simulation — confirm this should be fully implemented
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### CRIT-B7-004
- Severity: CRITICAL
- Batch: 7
- Spec: LEAGUE_BUILDER_FIGMA_SPEC.md §League Editor
- Code Location: LeagueBuilderLeagues.tsx:328-472
- Spec Says: Spec: 5-step creation wizard (Name→Teams→Structure→Rules→Review) with Back/Next
- Code Says: Code: Single flat modal with all fields at once. No step indicator, no wizard navigation
- Recommended Fix: Redesign as 5-step wizard or update spec
- My Triage: NEEDS YOUR CALL
- Triage Reason: Spec and code differ — need your decision on which is correct
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### CRIT-B7-007
- Severity: CRITICAL
- Batch: 7
- Spec: RETIREMENT_FIGMA_SPEC.md §Probability Engine
- Code Location: RetirementFlow.tsx:125-145
- Spec Says: Spec: Age-weighted dice rolls per player in conjunction with agingEngine.ts (factors rating, fame, age)
- Code Says: Code: RetirementFlow uses its OWN local probability function, completely disconnected from base agingEngine.ts — two competing probability systems
- Recommended Fix: Wire RetirementFlow to use agingEngine.ts calculateRetirementProbability
- My Triage: NEEDS YOUR CALL
- Triage Reason: Two competing implementations — need your call
- Your Decision: FIX CODE
- Status: DONE (Phase A)

### CRIT-B8-002
- Severity: CRITICAL
- Batch: 8
- Spec: SEASON_END_FIGMA_SPEC.md §Season End Flow
- Code Location: Multiple files
- Spec Says: Spec: 7-screen sequential Season End flow (Standings→MVP→Championship→Mojo→Archive→Complete)
- Code Says: Code: NO dedicated Season End flow — responsibilities split across FranchiseHome standings tab, FinalizeAdvanceFlow (timer simulation), AwardsCeremonyFlow. Screens 4-6 collapsed into single processing animation
- Recommended Fix: Create unified SeasonEndFlow component
- My Triage: NEEDS YOUR CALL
- Triage Reason: Placeholder/simulation — confirm this should be fully implemented
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### CRIT-B9-007
- Severity: CRITICAL
- Batch: 9
- Spec: MILESTONE_SYSTEM_SPEC.md §Franchise
- Code Location: franchiseStorage.ts
- Spec Says: Spec: Franchise first/leader tracking with 20% season threshold
- Code Says: Code: franchiseStorage.ts is ENTIRELY STUBS — all functions return null. Franchise leader activation is 10% in code vs 50% in spec
- Recommended Fix: Implement franchise storage or document as deferred
- My Triage: NEEDS YOUR CALL
- Triage Reason: Spec and code differ — need your decision on which is correct
- Your Decision: FIX CODE
- Status: DONE (Phase A)

### MAJ-B4-004
- Severity: MAJOR
- Batch: 4
- Spec: GRADE_ALGORITHM_SPEC.md §Position Player Thresholds
- Code Location: leagueBuilderLogic.test.ts:69-80
- Spec Says: Spec thresholds: S≥80, A+≥78, A≥73, A-≥66, B+≥58, B≥55, B-≥48, C+≥45, C≥38, C-≥35, D+≥30, D≥0 (data-driven from 261 player analysis)
- Code Says: Test helper uses: S≥90, A+≥85, A≥80, A-≥75, B+≥70, B≥65, B-≥60, C+≥55, C≥50, C-≥45, D+≥40 (simple 5-point intervals). Every threshold differs by 8-15 points
- Recommended Fix: Decide authoritative thresholds: spec's are data-driven (better), test's are simpler. Update losing side.
- My Triage: NEEDS YOUR CALL
- Triage Reason: Spec and code differ — need your decision on which is correct
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B5-008
- Severity: MAJOR
- Batch: 5
- Spec: OFFSEASON_SYSTEM_SPEC.md §7
- Code Location: RetirementFlow.tsx:125-145
- Spec Says: Spec: retirement probability = rank-based PLUS OTHER SPEC factors within roster (oldest-first ranking, formula: max(5, 50-(ageRank*(45/rosterSize))))
- Code Says: Code: absolute age-based probability (age 42=47%, age 25=3%, etc.) — different algorithm entirely
- Recommended Fix: Implement rank-based retirement formula per spec
- My Triage: NEEDS YOUR CALL
- Triage Reason: Multiple retirement systems exist — need your call on which algorithm
- Your Decision: FIX CODE
- Status: DONE (Phase A)

### MAJ-B5-014
- Severity: MAJOR
- Batch: 5
- Spec: OFFSEASON_SYSTEM_SPEC.md §2
- Code Location: offseasonStorage.ts vs useOffseasonPhase.ts
- Spec Says: Spec: 11 phases in strict order, according to figma spec
- Code Says: Code: TWO conflicting phase systems — offseasonStorage.ts has 10 string-enum phases, useOffseasonPhase.ts has 10 numbered phases with different phase lists (splits FA into 3 sub-phases, omits Contraction/Expansion and Chemistry Rebalancing)
- Recommended Fix: Consolidate into single phase system matching spec's 11 phases
- My Triage: NEEDS YOUR CALL
- Triage Reason: Two competing implementations — need your call
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B6-012
- Severity: MAJOR
- Batch: 6
- Spec: FREE_AGENCY_FIGMA_SPEC.md §Drag Reorder
- Code Location: FreeAgencyFlow.tsx:691-706
- Spec Says: Spec: Drag-to-reorder dice assignment rows with drag handles (lines 236-253)
- Code Says: Code: UP/DOWN arrow buttons for swapping adjacent rows — functionally equivalent but different UX for iPad
- Recommended Fix: Consider implementing drag gesture for iPad-friendly UX
- My Triage: NEEDS YOUR CALL
- Triage Reason: Spec and code differ — need your decision on which is correct
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B9-001
- Severity: MAJOR
- Batch: 9
- Spec: ADAPTIVE_STANDARDS_ENGINE_SPEC.md §3
- Code Location: N/A (missing)
- Spec Says: Spec: AdaptiveStandardsEngine class with IndexedDB persistence for baselines, smoothing algorithm, mid-season estimates
- Code Says: Code: No engine class exists. Static constants only (Phase 1). Phases 2-5 entirely absent
- Recommended Fix: Implement AdaptiveStandardsEngine (or document as future phase)
- My Triage: NEEDS YOUR CALL
- Triage Reason: Spec and code differ — need your decision on which is correct
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B13-001
- Severity: GAP
- Batch: 13
- Spec: STORIES_RETIREMENT.md S-RET005
- Code Location: RetirementFlow.tsx
- Spec Says: Probability recalculation: after each retirement, remaining players' probabilities increase as roster shrinks
- Code Says: No recalculation — probabilities are fixed after initial calculation
- Recommended Fix: Implement dynamic probability recalculation
- My Triage: NEEDS YOUR CALL
- Triage Reason: Multiple retirement systems exist — need your call on which algorithm
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B13-003
- Severity: GAP
- Batch: 13
- Spec: STORIES_SEASON_END.md S-SEP001-014
- Code Location: N/A (not implemented as discrete phase)
- Spec Says: Season End Processing: 7-screen flow (Standings→MVP→Championship→Mojo Reset→Archive→Complete)
- Code Says: NO dedicated Season End flow exists. Responsibilities scattered across FranchiseHome standings tab and FinalizeAdvanceFlow timer simulation
- Recommended Fix: Implement SeasonEndFlow component as discrete offseason Phase 1
- My Triage: NEEDS YOUR CALL
- Triage Reason: Placeholder/simulation — confirm this should be fully implemented
- Your Decision: FIX CODE
- Status: DUPLICATE

### MIS-B11-001
- Severity: MISMATCH
- Batch: 11
- Spec: STORIES_FINALIZE_ADVANCE.md S-FA006
- Code Location: FinalizeAdvanceFlow.tsx:287-310
- Spec Says: Retirement risk: age≥35=+40%, age≥32=+20%, age≥30=+10%; YOS≥10=+30%, YOS≥6=+15%; salary≥$20M=+20%, salary≥$10M=+10%; careerAwards=+15%; priorDemotions×10%; max=90%
- Code Says: Code: age≥35=+20%, age≥32=+10%, age≥30=+5%; YOS≥10=+15%, YOS≥7=+10%; salary≥$10M=+15%, salary≥$5M=+10%; NO careerAwards check; max=95%. All thresholds roughly halved from spec
- Recommended Fix: Update calculateRetirementRisk to match spec formula exactly
- My Triage: NEEDS YOUR CALL
- Triage Reason: Code and spec disagree — need your decision
- Your Decision: FIX CODE
- Status: DONE (Phase A)

### MIS-B11-002
- Severity: MISMATCH
- Batch: 11
- Spec: STORIES_FINALIZE_ADVANCE.md S-FA005
- Code Location: FinalizeAdvanceFlow.tsx:278-285
- Spec Says: Call-up salary: use salary system algorithm to calculate farm player's salaries to start season and multiply by 65%
- Code Says: Code: B=$1.2M (match), B-=$1.1M, C+=$1.0M, C=$0.9M, C-=$0.8M. C+/C/C- all overpriced vs spec
- Recommended Fix: Update calculateRookieSalary to match spec values
- My Triage: NEEDS YOUR CALL
- Triage Reason: Code and spec disagree — need your decision
- Your Decision: FIX CODE
- Status: DUPLICATE (CRIT-B5-002)

### MIS-B11-003
- Severity: MISMATCH
- Batch: 11
- Spec: STORIES_FREE_AGENCY.md S-FA003
- Code Location: FreeAgencyFlow.tsx:124-136
- Spec Says: Dice assignment order: best FA gets 7 (most probable), then 6,8,5,9,4,10,3,11,2,12 — bell-curve-optimized so best FAs roll most likely sums
- Code Says: DICE_PROBABILITIES uses sequential [2,3,4,5,6,7,8,9,10,11,12] — best FA gets 2 (least probable), worst gets 12 (also unlikely). Inverts intended probability distribution
- Recommended Fix: Reorder DICE_PROBABILITIES per code
- My Triage: NEEDS YOUR CALL
- Triage Reason: You flagged this — FA dice may be intentional design
- Your Decision: UPDATE SPEC
- Status: DONE (Phase C)

### MIS-B11-006
- Severity: MISMATCH
- Batch: 11
- Spec: STORIES_FREE_AGENCY.md S-FA005
- Code Location: FreeAgencyFlow.tsx:307-310
- Spec Says: TOUGH personality: FA goes to team with highest OPS
- Code Says: Uses `record.wins` (best win record) instead of team OPS
- Recommended Fix: Change from wins to OPS for TOUGH destination
- My Triage: NEEDS YOUR CALL
- Triage Reason: Code and spec disagree — need your decision
- Your Decision: FIX CODE
- Status: DONE (Phase A)

### MIS-B13-001
- Severity: MISMATCH
- Batch: 13
- Spec: STORIES_RETIREMENT.md S-RET001
- Code Location: RetirementFlow.tsx:125-145
- Spec Says: Retirement probability rank-based within roster: `max(5, 50-(ageRank*(45/rosterSize)))` where oldest gets highest probability
- Code Says: Code uses absolute age-based lookup table (age 42=47%, 25=3%, etc.) — no rank-based calculation
- Recommended Fix: Implement rank-based retirement probability per spec formula
- My Triage: NEEDS YOUR CALL
- Triage Reason: Multiple retirement systems exist — need your call on which algorithm
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIS-B13-002
- Severity: MISMATCH
- Batch: 13
- Spec: STORIES_TRADE.md S-TRD013
- Code Location: TradeFlow.tsx:1144-1146
- Spec Says: Accepting counter-offer executes AI's modified proposal (counter trade data)
- Code Says: `setAIResponse("accepted")` but does NOT update `currentTrade` to `aiCounter` data — accepted screen shows original trade, not counter
- Recommended Fix: Set `currentTrade = aiCounter` on counter acceptance
- My Triage: NEEDS YOUR CALL
- Triage Reason: Code and spec disagree — need your decision
- Your Decision: FIX CODE
- Status: DUPLICATE (CRIT-B8-006)

### MIS-B14-001
- Severity: MISMATCH
- Batch: 14
- Spec: smb_maddux_analysis.md
- Code Location: src/engines/detectionEngine.ts (Maddux check)
- Spec Says: Maddux threshold: 85 pitches for complete game shutout in 9-inning game, weighted for less innings per league builder rules
- Code Says: Code uses 100 pitches as Maddux threshold
- Recommended Fix: update spec and code to weight for number of innings/game in league builder setup
- My Triage: NEEDS YOUR CALL
- Triage Reason: Spec and code differ — need your decision on which is correct
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B1-006
- Severity: MINOR
- Batch: 1
- Spec: RWAR_CALCULATION_SPEC.md §8
- Code Location: N/A
- Spec Says: RunnerAdvancement schema with advancementType: forced/extra/held/out, couldHaveAdvanced
- Code Says: Simpler AdvancementStats interface without granular classification
- Recommended Fix: Consider for full UBR tracking
- My Triage: NEEDS YOUR CALL
- Triage Reason: Spec and code differ — need your decision on which is correct
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B1-007
- Severity: MINOR
- Batch: 1
- Spec: MWAR_CALCULATION_SPEC.md §5
- Code Location: mwarCalculator.ts:214
- Spec Says: Pinch hitter failure: K/GIDP = -0.5×√LI, regular outs = -0.3×√LI (tiered)
- Code Says: Single flat value: failure = -0.4 (averages the two tiers)
- Recommended Fix: Add tiered failure values or document as intentional simplification
- My Triage: NEEDS YOUR CALL
- Triage Reason: Spec and code differ — need your decision on which is correct
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B2-001
- Severity: MINOR
- Batch: 2
- Spec: RUNNER_ADVANCEMENT_RULES.md §4
- Code Location: runnerDefaults.ts:238
- Spec Says: Line out (LO) allows tag-up per spec matrix (same as FO)
- Code Says: Code: isDeepFly = (outType === 'FO') so LO defaults R3 to hold, not tag-up
- Recommended Fix: Either add LO to isDeepFly check or document as intentional (LO tag-up is very rare)
- My Triage: NEEDS YOUR CALL
- Triage Reason: Spec and code differ — need your decision on which is correct
- Your Decision: UPDATE SPEC
- Status: DONE (Phase C)

### MIN-B3-007
- Severity: MINOR
- Batch: 3
- Spec: FIELDING_SYSTEM_SPEC.md §2
- Code Location: game.ts:174-182
- Spec Says: Spec §2 maps result→battedBallType: FO=Fly Ball, LO=Line Drive, GO=Ground Out, PO=Pop Out, FLO=Foul Out
- Code Says: game.ts has simple inferFielder() map that uses LO→LF/CF/RF (outfield-centric) vs fielderInference.ts LINE_DRIVE→3B/SS/P/2B/1B (infield-centric). TWO COMPETING INFERENCE SYSTEMS
- Recommended Fix: Consolidate: game.ts inferFielder() is simpler/less accurate. fielderInference.ts is spec-compliant. Mark game.ts version as deprecated
- My Triage: NEEDS YOUR CALL
- Triage Reason: Two competing implementations — need your call
- Your Decision: FIX CODE
- Status: DONE (Phase A)

### MIN-B10-001
- Severity: MINOR
- Batch: 10
- Spec: STAT_TRACKING_ARCHITECTURE_SPEC.md §2.2
- Code Location: gameStorage.ts:109-126
- Spec Says: Spec: PlayerGameStats has hitOrder: ('1B'\'2B'/'3B'\|'HR')[] for cycle detection 
- Code Says: | Code: PersistedGameState playerStats has no hitOrder field — cycle detection handled elsewhere | Update spec or add hitOrder to PersistedGameState
- Recommended Fix: (blank)
- My Triage: NEEDS YOUR CALL
- Triage Reason: Spec and code differ — need your decision on which is correct
- Your Decision: UPDATE SPEC
- Status: DONE (Phase C)

### CRIT-B5-002
- Severity: CRITICAL
- Batch: 5
- Spec: FARM_SYSTEM_SPEC.md §Rookie Salary
- Code Location: FinalizeAdvanceFlow.tsx:279-283
- Spec Says: Call-up salary: use salary system algorithm to calculate farm player's salaries to start season and mulitiply by 65%
- Code Says: Code: B=$1.2M, B-=$1.1M, C+=$1.0M, C=$0.9M, C-=$0.8M — all values except B are higher
- Recommended Fix: Align rookie salary constants with new spec values
- My Triage: FIX CODE
- Triage Reason: Critical issue needs fixing
- Your Decision: (blank)
- Status: DONE (Phase A)

### CRIT-B6-001
- Severity: CRITICAL
- Batch: 6
- Spec: AWARDS_CEREMONY_FIGMA_SPEC.md §Trait Replacement
- Code Location: AwardsCeremonyFlow.tsx
- Spec Says: Spec: Trait Replacement Modal when player at max 2 traits earns new trait (lines 997-1049)
- Code Says: Code: NO Trait Replacement Modal implemented. Award screens grant traits but never check trait cap or offer replacement choice
- Recommended Fix: Implement TraitReplacementModal component
- My Triage: FIX CODE
- Triage Reason: Critical issue needs fixing
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### CRIT-B6-002
- Severity: CRITICAL
- Batch: 6
- Spec: AWARDS_CEREMONY_FIGMA_SPEC.md §Other Player
- Code Location: AwardsCeremonyFlow.tsx:588,900,1023
- Spec Says: Spec: "Other Player" buttons open searchable modal with league filter (lines 1052-1094)
- Code Says: Code: "Other Player..." buttons exist at 6 locations but have NO onClick handler — completely non-functional
- Recommended Fix: Wire onClick to open player search modal
- My Triage: FIX CODE
- Triage Reason: Critical issue needs fixing
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### CRIT-B6-003
- Severity: CRITICAL
- Batch: 6
- Spec: AWARDS_CEREMONY_FIGMA_SPEC.md §Awards Save
- Code Location: AwardsCeremonyFlow.tsx
- Spec Says: Spec: Awards saved with trait/rating changes applied to player records
- Code Says: Code: addAward() callback is defined but NEVER CALLED by any sub-screen — zero awards are accumulated or saved
- Recommended Fix: Wire addAward() calls in each award sub-screen
- My Triage: FIX CODE
- Triage Reason: Critical: working code exists but is disconnected
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### CRIT-B7-006
- Severity: CRITICAL
- Batch: 7
- Spec: PLAYOFFS_FIGMA_SPEC.md §Clutch Multipliers
- Code Location: clutchCalculator.ts:186
- Spec Says: Spec: Division Series base = 1.75x
- Code Says: Code: division_series = 1.5x — 0.25 lower than spec
- Recommended Fix: Update clutch multiplier constant
- My Triage: UPDATE SPEC
- Triage Reason: Critical issue needs fixing
- Your Decision: (blank)
- Status: DONE (Phase C)

### CRIT-B7-008
- Severity: CRITICAL
- Batch: 7
- Spec: SCHEDULE_SYSTEM_FIGMA_SPEC.md §Today's Game
- Code Location: FranchiseHome.tsx:1731-2040
- Spec Says: Spec: Today's Game auto-populates from schedule's next scheduled game
- Code Says: Code: GameDayContent is ENTIRELY HARDCODED (team IDs 'tigers'/'sox', records "42-28"/"38-32", date "7/12", game "71/162") — TODO comments confirm not wired to scheduleData
- Recommended Fix: Wire GameDayContent to scheduleData.nextGame
- My Triage: FIX CODE
- Triage Reason: Critical issue needs fixing
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### CRIT-B8-003
- Severity: CRITICAL
- Batch: 8
- Spec: SEASON_SETUP_FIGMA_SPEC.md §Persistence
- Code Location: FranchiseSetup.tsx:107-108
- Spec Says: Spec: "START FRANCHISE" creates save slot with all config data persisted
- Code Says: Code: navigates to "/franchise/new" (invalid route) with NO save logic — ALL wizard data lost on navigation
- Recommended Fix: Implement franchise config persistence
- My Triage: FIX CODE
- Triage Reason: Critical issue needs fixing
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### CRIT-B8-004
- Severity: CRITICAL
- Batch: 8
- Spec: SEASON_SETUP_FIGMA_SPEC.md §Team Control
- Code Location: FranchiseSetup.tsx:944-987
- Spec Says: Spec: Teams grouped by Conference AND Division (AL East, AL West, NL East, NL West)
- Code Says: Code: Flat grid under single "LEAGUE TEAMS" heading — no conference/division grouping
- Recommended Fix: Add conference/division hierarchy to team grid
- My Triage: FIX CODE
- Triage Reason: Critical issue needs fixing
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### CRIT-B8-005
- Severity: CRITICAL
- Batch: 8
- Spec: TRADE_FIGMA_SPEC.md §Waiver Wire
- Code Location: TradeFlow.tsx (types only)
- Spec Says: Spec: Waiver Wire Claim + Results screens with claim order, roster check, PASS/CLAIM
- Code Says: Code: Screen types and interfaces defined but ZERO UI rendering — both screens entirely unimplemented
- Recommended Fix: Implement waiver wire claim and results screens
- My Triage: FIX CODE
- Triage Reason: Critical issue needs fixing
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### CRIT-B8-006
- Severity: CRITICAL
- Batch: 8
- Spec: TRADE_FIGMA_SPEC.md §Counter Offer
- Code Location: TradeFlow.tsx:1144-1146
- Spec Says: Spec: Accepting counter should use counter-offered deal data
- Code Says: Code: Sets aiResponse="accepted" but does NOT update currentTrade to counter data — accepted screen shows ORIGINAL trade, not the counter offer
- Recommended Fix: Fix to use aiCounter data on acceptance
- My Triage: FIX CODE
- Triage Reason: Critical issue needs fixing
- Your Decision: (blank)
- Status: DONE (Phase A)

### CRIT-B8-007
- Severity: CRITICAL
- Batch: 8
- Spec: SUBSTITUTION_FLOW_SPEC.md §UI Integration
- Code Location: GameTracker.tsx:19-26
- Spec Says: Spec: 6 substitution modals (PH, PR, DEF, PITCH, DS, POS) rendered in GameTracker with Substitution button
- Code Says: Code: ALL 6 modals are ORPHANED — fully built but NEVER imported or rendered by GameTracker.tsx. GameTracker uses LineupCard drag-drop instead
- Recommended Fix: Import and wire all 6 substitution modals into GameTracker
- My Triage: UPDATE SPEC
- Triage Reason: Critical: working code exists but is disconnected
- Your Decision: (blank)
- Status: DONE (Phase C)

### CRIT-B9-001
- Severity: CRITICAL
- Batch: 9
- Spec: ADAPTIVE_STANDARDS_ENGINE_SPEC.md §4
- Code Location: milestoneDetector.ts:22-24
- Spec Says: Spec: Default season 50 games, 9 innings per game
- Code Says: Code defaults: 128 games, 6 innings per game — wrong baseline for SMB4
- Recommended Fix: Change milestoneDetector defaults to 50 games, 9 innings
- My Triage: FIX CODE
- Triage Reason: Critical logic/formula error needs fixing
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### CRIT-B9-002
- Severity: CRITICAL
- Batch: 9
- Spec: ADAPTIVE_STANDARDS_ENGINE_SPEC.md §4
- Code Location: milestoneDetector.ts
- Spec Says: Spec: Counting stat scaling uses opportunityFactor (gamesPerSeason/162 adjusted for PA/IP opportunity)
- Code Says: Code: Uses simple seasonFactor = gamesPerSeason/162 with no PA/IP opportunity adjustment
- Recommended Fix: Implement opportunityFactor per spec
- My Triage: FIX CODE
- Triage Reason: Critical issue needs fixing
- Your Decision: (blank)
- Status: DONE (Phase A)

### CRIT-B9-003
- Severity: CRITICAL
- Batch: 9
- Spec: ADAPTIVE_STANDARDS_ENGINE_SPEC.md §4
- Code Location: milestoneDetector.ts
- Spec Says: Spec: QS threshold scales with innings per game (e.g., 6IP threshold for 9-inning games)
- Code Says: Code: QS threshold hardcoded at 6 IP and 3 ER regardless of innings per game
- Recommended Fix: Scale QS threshold with inningsPerGame
- My Triage: FIX CODE
- Triage Reason: Critical issue needs fixing
- Your Decision: (blank)
- Status: DONE (Phase A)

### CRIT-B9-004
- Severity: CRITICAL
- Batch: 9
- Spec: AUTO_CORRECTION_SYSTEM_SPEC.md §All
- Code Location: useGameState.ts:473
- Spec Says: Spec: autoCorrectResult is core design pattern — should run after every play to correct invalid states
- Code Says: autoCorrectResult() exists at line 473 but is NEVER CALLED from the Figma UI — completely orphaned dead code
- Recommended Fix: Wire autoCorrectResult into play recording flow
- My Triage: FIX CODE
- Triage Reason: Critical: working code exists but is disconnected
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### CRIT-B9-005
- Severity: CRITICAL
- Batch: 9
- Spec: FAN_MORALE_SYSTEM_SPEC.md §UI
- Code Location: FanMoralePanel.tsx
- Spec Says: Spec: 7 FanState thresholds (ECSTATIC ≥90, EXCITED ≥75, ENGAGED ≥60, CONTENT ≥45, RESTLESS ≥30, FRUSTRATED ≥15, HOSTILE <15)
- Code Says: Code: WRONG thresholds AND uses non-spec state "SUPPORTIVE" not in spec
- Recommended Fix: Fix FanMoralePanel.tsx thresholds to match spec
- My Triage: FIX CODE
- Triage Reason: Critical logic/formula error needs fixing
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### CRIT-B9-006
- Severity: CRITICAL
- Batch: 9
- Spec: MILESTONE_SYSTEM_SPEC.md §Fame Values
- Code Location: fameEngine.ts vs milestoneDetector.ts
- Spec Says: Spec: ~20 single-game Fame values specified precisely
- Code Says: Code: ~18 values differ 2-3× between spec and fameEngine (Perfect Game 5 vs 10, No-Hitter 3 vs 6, Cycle 3 vs 2, Walk-Off HR 1.5 vs 1, etc.)
- Recommended Fix: Align all Fame values with spec
- My Triage: FIX CODE
- Triage Reason: Critical issue needs fixing
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B1-001
- Severity: MAJOR
- Batch: 1
- Spec: BWAR_CALCULATION_SPEC.md §9
- Code Location: N/A (missing)
- Spec Says: Calibration data collection structure (seasonData with event totals, runsPerGame, runsPerPA) fed to recalibrateWeights/recalibrateReplacementLevel
- Code Says: Calibration functions exist (bwarCalculator.ts:309-362) but no data pipeline collects league aggregates to feed them
- Recommended Fix: Add season-end aggregation job that collects league totals and calls recalibrate functions
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B2-001
- Severity: MAJOR
- Batch: 2
- Spec: MASTER_BASEBALL_RULES_AND_LOGIC.md §8
- Code Location: useGameState.ts:1974-1975
- Spec Says: Errors (reaching on error) IS an at-bat — counted in AB for AVG/OBP/SLG
- Code Says: Code says "No AB charged on error" — PA++ but NO AB++
- Recommended Fix: Add `batterStats.ab++` in recordError. Affects AVG (H/AB) and SLG (TB/AB)
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: (blank)
- Status: DONE (Phase A)

### MAJ-B2-002
- Severity: MAJOR
- Batch: 2
- Spec: MASTER_BASEBALL_RULES_AND_LOGIC.md §12
- Code Location: GameTracker.tsx:3130-3190
- Spec Says: Button availability: SAC disabled@2outs, SF disabled@2outs/no-R3, DP disabled@2outs/no-runners, D3K disabled@1st-occupied+<2outs
- Code Says: DP/SF/SH/D3K buttons have NO disabled prop — always clickable
- Recommended Fix: Wire isD3KLegal() and add disabled conditions per spec §12
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B2-003
- Severity: MAJOR
- Batch: 2
- Spec: PITCHER_STATS_TRACKING_SPEC.md §6.3-6.4
- Code Location: useGameState.ts calculatePitcherDecisions (702-788)
- Spec Says: Hold: reliever in save situation + maintained lead + not finisher + not W + ≥1 out. Blown Save: entered save situation + lead lost
- Code Says: hold and blownSave fields exist (init false) but NEVER set — calculatePitcherDecisions only computes W/L/ND/SV
- Recommended Fix: Add hold/BS detection to calculatePitcherDecisions using save-situation + lead tracking
- My Triage: FIX CODE
- Triage Reason: Working code exists but is disconnected
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B3-002
- Severity: MAJOR
- Batch: 3
- Spec: CLUTCH_ATTRIBUTION_SPEC.md §4.1
- Code Location: clutchCalculator.ts getBatterBaseValue:397-398
- Spec Says: Spec §4.1: inside_park_hr = +1.2×LI (no CQ modifier)
- Code Says: Code: inside_park_hr returns `{base: 1.2, useCQ: true, modifier: 'multiply'}` — APPLIES CQ when spec says no CQ modifier
- Recommended Fix: Change useCQ to false for inside_park_hr to match spec §4.1
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: UPDATE SPEC
- Status: DONE (Phase C)

### MAJ-B3-004
- Severity: MAJOR
- Batch: 3
- Spec: CLUTCH_ATTRIBUTION_SPEC.md §10
- Code Location: useClutchCalculations.ts:237
- Spec Says: Spec §10 accumulateClutchEvent: receives clutchValue and applies playoffMultiplier INSIDE accumulate
- Code Says: useClutchCalculations hook: walkoff bonus is × 1.5 applied BEFORE accumulate, and playoff multiplier is NEVER passed (hardcoded `false` for isPlayoff)
- Recommended Fix: Wire playoffContext through to accumulateClutchEvent; walkoff ×1.5 bonus is undocumented approach
- My Triage: FIX CODE
- Triage Reason: Hardcoded/mock data needs real data connection
- Your Decision: (blank)
- Status: DONE (Phase A)

### MAJ-B3-007
- Severity: MAJOR
- Batch: 3
- Spec: FIELDING_SYSTEM_SPEC.md §11
- Code Location: fielderInference.ts:93-100
- Spec Says: Spec §11: DP inference by direction: C = "1-6-3 or 6-4-3 (comebacker or up middle)"
- Code Says: Code: DP_CHAINS['Center'] = '6-4-3' only. Spec also mentions 1-6-3 as equal-probability center DP. Code picks one, doesn't offer both options
- Recommended Fix: Add 1-6-3 as alternative center DP chain (secondary option)
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: (blank)
- Status: DONE (Phase A)

### MAJ-B3-008
- Severity: MAJOR
- Batch: 3
- Spec: GAMETRACKER_DRAGDROP_SPEC.md §Coordinate
- Code Location: FieldCanvas.tsx:505-509 classifyHomeRun
- Spec Says: Spec: wall_scraper if y<1.05, deep if y<1.2, bomb≥1.2 (based on spec's 0-1.4 y-range)
- Code Says: Code: wall_scraper if y<0.88, deep if y<0.94, bomb≥0.94 (based on FieldCanvas normalized coords where fence ≈ y=0.85). Different thresholds but may be equivalent in physical space due to different coordinate mapping
- Recommended Fix: Verify that both specs describe the same physical zones; if so, update spec thresholds to match FieldCanvas geometry
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B3-009
- Severity: MAJOR
- Batch: 3
- Spec: GAMETRACKER_DRAGDROP_SPEC.md §Fielder Positions
- Code Location: FieldCanvas.tsx:366-376 FIELDERS_FEET
- Spec Says: Spec: fielder positions at simple coordinates like P(0.5, 0.18), C(0.5, 0.08), SS(0.42, 0.40)
- Code Says: Code: uses field-feet coordinate system (e.g., P at mound coords, C at (5,5), SS at (65,95)) converted via fieldToNormalized(). Physical placement differs but is mathematically correct to real baseball geometry
- Recommended Fix: Update spec to reference FieldCanvas FIELDER_POSITIONS (computed), not hardcoded simple coords. Spec's coords are approximate, code's are precise
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B3-010
- Severity: MAJOR
- Batch: 3
- Spec: FIELD_ZONE_INPUT_SPEC.md §6
- Code Location: N/A (missing)
- Spec Says: Spec §6: getCQTrajectoryFromZone(), getContactQualityFromZone(), getFoulContactQuality() — zone-to-CQ integration with depth→speed/depth mapping for fly/ground balls, foul CQ table (F06=0.15, F02/F03=0.20, F01/F04=0.35, F00/F05=0.50)
- Code Says: NO CQ integration functions exist anywhere in codebase. Zero zone-to-CQ bridge. Clutch calculator gets CQ from exit type only, not from zone depth
- Recommended Fix: Implement 3 CQ integration functions per spec §6; wire into recordBattedBall flow
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B3-011
- Severity: MAJOR
- Batch: 3
- Spec: FIELD_ZONE_INPUT_SPEC.md §8
- Code Location: N/A (missing)
- Spec Says: Spec §8: generateSprayPoint(zoneId, randomize), createSprayChartEntry(), createStadiumBattedBallEvent(), mapToStadiumSprayZone(), estimateDistance(), SPRAY_COLORS, SPRAY_SIZES — full spray chart generation from zone taps
- Code Says: NO spray chart generation functions exist anywhere in codebase. Zone data is captured but never converted to spray chart points or stadium batted ball events
- Recommended Fix: Implement spray chart generation layer per spec §8; integrate with STADIUM_ANALYTICS_SPEC
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B4-002
- Severity: MAJOR
- Batch: 4
- Spec: FAME_SYSTEM_TRACKING.md §Not Started
- Code Location: useFameDetection.ts:905-999
- Spec Says: Tracking doc lists COMPLETE_GAME, SHUTOUT, MADDUX as "NOT STARTED" detection functions
- Code Says: Code has detectCompleteGameShutout() (line 905-948) and detectMaddux() (line 955-999) FULLY IMPLEMENTED and called in checkEndGameFame() (line 1568-1580)
- Recommended Fix: Update tracking doc: mark COMPLETE_GAME, SHUTOUT, MADDUX as ✅ COMPLETE
- My Triage: UPDATE SPEC
- Triage Reason: Major: code differs from spec
- Your Decision: (blank)
- Status: DONE (Phase C)

### MAJ-B4-003
- Severity: MAJOR
- Batch: 4
- Spec: FAME_SYSTEM_TRACKING.md §FameEventType
- Code Location: types/game.ts:571-756
- Spec Says: Doc says "67 types" for FameEventType
- Code Says: FameEventType has 154 entries — includes season milestones, career milestones, and negative milestone types added after tracking doc creation
- Recommended Fix: Update tracking doc count to 154
- My Triage: UPDATE SPEC
- Triage Reason: Major: code differs from spec
- Your Decision: UPDATE SPEC
- Status: DONE (Phase C)

### MAJ-B4-005
- Severity: MAJOR
- Batch: 4
- Spec: GRADE_ALGORITHM_SPEC.md §Complete Implementation
- Code Location: N/A (missing engine)
- Spec Says: Spec defines full grade calculation engine: calculatePositionPlayerWeighted(), calculatePitcherWeighted(), getGradeFromWeighted(), generateProspectRatings(), generateProspectGrade(), generatePotentialCeiling(), generateArsenal()
- Code Says: NO grade calculation engine exists in production code. Only: (1) test helper in leagueBuilderLogic.test.ts, (2) hardcoded mock prospects in DraftFlow.tsx, (3) random-grade generator in LeagueBuilderDraft.tsx
- Recommended Fix: Create gradeEngine.ts implementing all spec functions
- My Triage: FIX CODE
- Triage Reason: Hardcoded/mock data needs real data connection
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B4-006
- Severity: MAJOR
- Batch: 4
- Spec: GRADE_ALGORITHM_SPEC.md §Two-Way Players
- Code Location: N/A (missing)
- Spec Says: Spec: twoWayValue = (positionWeightedRating + pitcherWeightedRating) × 1.25
- Code Says: No two-way player grade formula implemented anywhere
- Recommended Fix: Implement two-way player valuation in gradeEngine.ts
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B4-007
- Severity: MAJOR
- Batch: 4
- Spec: GRADE_ALGORITHM_SPEC.md §Prospect Generation
- Code Location: LeagueBuilderDraft.tsx:51-92
- Spec Says: Spec: round-based probability distributions (Rd1: 25% B, 35% B-, 25% C+, 10% C, 5% C-), position stat bias (C:+10 FLD/ARM, -10 SPD), weighted rating calculation
- Code Says: Code: random index from GRADES array, no weighted calculation, no position bias, no round-based probability
- Recommended Fix: Replace LeagueBuilderDraft.tsx generateProspects() with spec algorithm
- My Triage: FIX CODE
- Triage Reason: Hardcoded/mock data needs real data connection
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B5-009
- Severity: MAJOR
- Batch: 5
- Spec: OFFSEASON_SYSTEM_SPEC.md §9.3
- Code Location: DraftFlow.tsx:47
- Spec Says: Spec: draft max grade A- (A-=5%, B+=10%, B=20%, B-=25%, C+=20%, C=15%, C-=5%)
- Code Says: Code: DraftProspect grade type limited to B/B-/C+/C/C- — no A- or B+ grades
- Recommended Fix: Expand grade type and implement weighted distribution
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B5-010
- Severity: MAJOR
- Batch: 5
- Spec: OFFSEASON_SYSTEM_SPEC.md §4.3
- Code Location: AwardsCeremonyFlow.tsx
- Spec Says: Spec: MVP weights WAR 40%, Clutch 25%, Traditional 15%, Team 12%, Fame 8%; CY weights pWAR 40%, Advanced 25%, Clutch 25%, Team 5%, Fame 5%
- Code Says: Code: No voting weight calculations — awards are user-selected from mock candidates
- Recommended Fix: Implement voting weight calculations per spec
- My Triage: FIX CODE
- Triage Reason: Hardcoded/mock data needs real data connection
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B5-011
- Severity: MAJOR
- Batch: 5
- Spec: TRADE_SYSTEM_SPEC.md §4
- Code Location: FreeAgencyFlow.tsx, TradeFlow.tsx
- Spec Says: Spec: trade matching uses Contract Value with 10% threshold (max(valueA,valueB)*0.10)
- Code Says: Code: Figma TradeFlow has NO trade validation; older TradeProposalBuilder uses different ratio-based approach
- Recommended Fix: update spec, trust code
- My Triage: UPDATE SPEC
- Triage Reason: Major: code differs from spec
- Your Decision: (blank)
- Status: DONE (Phase C)

### MAJ-B5-012
- Severity: MAJOR
- Batch: 5
- Spec: NARRATIVE_SYSTEM_SPEC.md §3
- Code Location: narrativeEngine.ts:763
- Spec Says: Spec: streak amplifier activates at streak >= 3
- Code Says: Code: activates at streak >= 5
- Recommended Fix: Change threshold from 5 to 3
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: (blank)
- Status: DONE (Phase A)

### MAJ-B5-013
- Severity: MAJOR
- Batch: 5
- Spec: FARM_SYSTEM_SPEC.md §Send-Down
- Code Location: FinalizeAdvanceFlow.tsx:267
- Spec Says: Spec: graduated send-down morale (1st=-20, 2nd=-30, 3rd+=-40)
- Code Says: Code: flat -18 morale hit regardless of demotion count
- Recommended Fix: Implement graduated morale per spec
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: (blank)
- Status: DONE (Phase A)

### MAJ-B6-006
- Severity: MAJOR
- Batch: 6
- Spec: AWARDS_CEREMONY_FIGMA_SPEC.md §All Data
- Code Location: AwardsCeremonyFlow.tsx:480-1878
- Spec Says: Spec: Candidates computed from actual season stats
- Code Says: Code: ALL candidates/winners across ALL 13 screens use HARDCODED mock data (real player names like Lindor, Ohtani, etc.) — data wiring infra exists but unused by sub-screens
- Recommended Fix: Connect sub-screens to useOffseasonData/convertToAwardPlayer
- My Triage: FIX CODE
- Triage Reason: Hardcoded/mock data needs real data connection
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B6-007
- Severity: MAJOR
- Batch: 6
- Spec: CONTRACTION_EXPANSION_FIGMA_SPEC.md §Persistence
- Code Location: ContractionExpansionFlow.tsx
- Spec Says: Spec: Results must persist
- Code Says: Code: ALL state in React useState — no IndexedDB calls. offseasonStorage.ts has CONTRACTION_EXPANSION phase but no dedicated store operations. All data lost on refresh
- Recommended Fix: Implement contraction-specific IndexedDB store operations
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B6-008
- Severity: MAJOR
- Batch: 6
- Spec: DRAFT_FIGMA_SPEC.md §Auto-Draft
- Code Location: DraftFlow.tsx
- Spec Says: Spec: Auto-Draft Options modal with 3 modes + priority settings (lines 740-782)
- Code Says: Code: AI picks handled silently, no user-facing auto-draft configuration UI
- Recommended Fix: Implement auto-draft options modal
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B6-009
- Severity: MAJOR
- Batch: 6
- Spec: EOS_RATINGS_FIGMA_SPEC.md §Two-Way
- Code Location: RatingsAdjustmentFlow.tsx:7,832
- Spec Says: Spec: Dedicated Two-Way card showing BOTH batting+pitching adjustments (lines 610-626)
- Code Says: Code: "TWO-WAY" in Position type but zero rendering logic for two-way players
- Recommended Fix: Add two-way player detection and dual-card rendering
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B6-010
- Severity: MAJOR
- Batch: 6
- Spec: EOS_RATINGS_FIGMA_SPEC.md §Synthetic Data
- Code Location: RatingsAdjustmentFlow.tsx:133
- Spec Says: Spec: Rating changes from actual EOS adjustment engine
- Code Says: Code: convertToLocalPlayer generates RANDOM rating changes (Math.random() * 20 - 8) even with real data loaded — display data is entirely synthetic
- Recommended Fix: Wire actual EOS adjustment engine output
- My Triage: FIX CODE
- Triage Reason: Hardcoded/mock data needs real data connection
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B7-010
- Severity: MAJOR
- Batch: 7
- Spec: LEAGUE_BUILDER_FIGMA_SPEC.md §Presets
- Code Location: leagueBuilderStorage.ts:619-698
- Spec Says: Spec: 4 presets (Standard 32 games, Quick Play, Full Sim 12 playoffs, Arcade Mode)
- Code Says: Code: 3 presets (Standard 50 games, Quick Play, Full Sim 10 playoffs) — Arcade Mode absent, games/playoffs wrong
- Recommended Fix: Add Arcade Mode preset, fix Standard games to 32, fix Full Sim playoffs to 12
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B7-011
- Severity: MAJOR
- Batch: 7
- Spec: LEAGUE_BUILDER_FIGMA_SPEC.md §Missing Screens
- Code Location: N/A
- Spec Says: Spec: Team CSV Import (P1), Player Generator (P1), Draft Board (P1)
- Code Says: Code: All three P1-priority screens entirely absent — no CSV import, no player generation, no draft execution
- Recommended Fix: Implement 3 missing P1 screens
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B7-012
- Severity: MAJOR
- Batch: 7
- Spec: PLAYOFFS_FIGMA_SPEC.md §Round Names
- Code Location: playoffStorage.ts, WorldSeries.tsx, test file
- Spec Says: Spec: "Wild Card", "Division Series", "Championship", "World Series"
- Code Says: Code: Three DIFFERENT naming schemes across 3 files — none match spec. "World Series" never appears in any getRoundName function
- Recommended Fix: Consolidate to single getRoundName matching spec names
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B7-013
- Severity: MAJOR
- Batch: 7
- Spec: RETIREMENT_FIGMA_SPEC.md §Team History
- Code Location: RetirementFlow.tsx:781-797
- Spec Says: Spec: Jersey decision shows player's actual team history with per-team seasons/WAR/awards
- Code Says: Code: teamsPlayedFor HARDCODED to first 2 teams from allTeams with fake stats (8 seasons/32.1 WAR and 12 seasons/48.7 WAR) — every retired player shows same history
- Recommended Fix: Wire real player career history data
- My Triage: FIX CODE
- Triage Reason: Hardcoded/mock data needs real data connection
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B7-014
- Severity: MAJOR
- Batch: 7
- Spec: RETIREMENT_FIGMA_SPEC.md §Stadium Name
- Code Location: RetirementFlow.tsx:929
- Spec Says: Spec: "Jersey will hang at Thunder Stadium"
- Code Says: Code: `team.name.split(' ')[0] + ' Stadium'` produces "New Stadium" for "New York Thunder" — takes city name not team name
- Recommended Fix: Fix to extract last word (team nickname) not first word
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B7-015
- Severity: MAJOR
- Batch: 7
- Spec: SCHEDULE_SYSTEM_FIGMA_SPEC.md §Empty State
- Code Location: FranchiseHome.tsx GameDayContent
- Spec Says: Spec: "NO GAMES IN QUEUE" empty state with [Go to Schedule] and [Add Game Now] buttons
- Code Says: Code: No empty state — always renders hardcoded "TIGERS vs SOX" card regardless of schedule
- Recommended Fix: Implement empty state when no scheduled games exist
- My Triage: FIX CODE
- Triage Reason: Hardcoded/mock data needs real data connection
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B8-008
- Severity: MAJOR
- Batch: 8
- Spec: SEASON_END_FIGMA_SPEC.md §Championship
- Code Location: FinalizeAdvanceFlow.tsx:1016-1035
- Spec Says: Spec: +1 Fame to all championship players, +20 morale, two-column roster display
- Code Says: Code: Season summary hardcodes "San Francisco Giants"/"Barry Bonds" — no real fame/morale bonuses applied
- Recommended Fix: Wire real champion data and apply fame/morale bonuses
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B8-010
- Severity: MAJOR
- Batch: 8
- Spec: TRADE_FIGMA_SPEC.md §AI Proposals
- Code Location: TradeFlow.tsx:305-315
- Spec Says: Spec: Multiple AI proposals from different teams with real logic
- Code Says: Code: Single hardcoded mockAIProposals entry; Counter button goes to inbox instead of builder; Decline doesn't remove proposal
- Recommended Fix: Implement real AI proposal generation
- My Triage: FIX CODE
- Triage Reason: Hardcoded/mock data needs real data connection
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B9-002
- Severity: MAJOR
- Batch: 9
- Spec: ADAPTIVE_STANDARDS_ENGINE_SPEC.md §Maddux
- Code Location: milestoneDetector.ts
- Spec Says: Spec: Maddux threshold 85 pitches for 9-inning game, weight by innings/game settings
- Code Says: Code: Uses 100 pitches as threshold
- Recommended Fix: Change Maddux threshold from 100 to 85, weight by innings/game settings
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: (blank)
- Status: DONE (Phase A)

### MAJ-B9-003
- Severity: MAJOR
- Batch: 9
- Spec: ADAPTIVE_STANDARDS_ENGINE_SPEC.md §rWAR
- Code Location: rwarCalculator.ts
- Spec Says: Spec: runsPerGame baseline 3.19 (SMB4-specific)
- Code Says: Code: Uses 4.8 as runsPerGame baseline
- Recommended Fix: Change runsPerGame from 4.8 to 3.19
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: (blank)
- Status: DONE (Phase A)

### MAJ-B9-004
- Severity: MAJOR
- Batch: 9
- Spec: DYNAMIC_DESIGNATIONS_SPEC.md §Cornerstone
- Code Location: designationEngine.ts
- Spec Says: Spec: RETAINED_CORNERSTONE Fame +0.3
- Code Says: Code: RETAINED_CORNERSTONE = +0.5
- Recommended Fix: Change from 0.5 to 0.3
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: (blank)
- Status: DONE (Phase A)

### MAJ-B9-006
- Severity: MAJOR
- Batch: 9
- Spec: FAN_MORALE_SYSTEM_SPEC.md §Integration
- Code Location: fanMoraleEngine.ts
- Spec Says: Spec: Engine functions wired to game-end, trade, roster move, streak, drift events
- Code Says: Code: EXCELLENT core engine but MOSTLY ORPHANED — functions exist but are rarely called from UI
- Recommended Fix: Wire fanMoraleEngine integration points
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B9-007
- Severity: MAJOR
- Batch: 9
- Spec: MILESTONE_SYSTEM_SPEC.md §Team
- Code Location: N/A (missing)
- Spec Says: Spec: Team milestones section with franchise records
- Code Says: Code: Entire team milestones section unimplemented
- Recommended Fix: Implement team milestone detection
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B10-001
- Severity: MAJOR
- Batch: 10
- Spec: SPECIAL_EVENTS_SPEC.md §6.1
- Code Location: N/A (missing)
- Spec Says: Spec §6.1: GameSpecialEvents aggregate record with events array, quick counts (nutShots, killedPitchers, tootblans, webGems, robberies, walkOffs, comebackWin)
- Code Says: No GameSpecialEvents type or storage exists — individual Fame events recorded but no game-level special events aggregation
- Recommended Fix: Implement GameSpecialEvents type and storage
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B10-002
- Severity: MAJOR
- Batch: 10
- Spec: SPECIAL_EVENTS_SPEC.md §6.2
- Code Location: N/A (missing)
- Spec Says: Spec §6.2: PlayerSpecialStats season/career tracking (nutShotsDelivered, killedPitchers, tootblans, webGems, robberies, cyclesHit, madduxes, etc.)
- Code Says: No PlayerSpecialStats interface or tracking exists — special events are Fame events only, not tracked as player stats
- Recommended Fix: Implement PlayerSpecialStats interface and aggregation
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B10-003
- Severity: MAJOR
- Batch: 10
- Spec: SPECIAL_EVENTS_SPEC.md §7.1
- Code Location: GameTracker.tsx
- Spec Says: Spec §7.1: Special Events Quick Access buttons in GameTracker (🥜 Nut Shot, 💥 Killed Pitcher, 🤦 TOOTBLAN, ⭐ Web Gem, 🎭 Robbery, 🏠 Inside Park HR)
- Code Says: Code: NO special event quick-access buttons in GameTracker UI. handleSpecialEvent function exists (line 1624) but no buttons trigger it
- Recommended Fix: UPDATE SPEC to match current UI
- My Triage: UPDATE SPEC
- Triage Reason: Major: code differs from spec
- Your Decision: (blank)
- Status: DONE (Phase C)

### MAJ-B10-004
- Severity: MAJOR
- Batch: 10
- Spec: SPECIAL_EVENTS_SPEC.md §7.2
- Code Location: GameTracker.tsx
- Spec Says: Spec §7.2: Post-play prompts for special events (comebacker→Killed Pitcher?, diving catch→Web Gem?, pickoff→TOOTBLAN?)
- Code Says: Code: Detection functions exist in detectionFunctions.ts but are NEVER called from the GameTracker play flow. runPlayDetections() exists in detectionIntegration.ts but unused
- Recommended Fix: Wire runPlayDetections into GameTracker after each special event play
- My Triage: FIX CODE
- Triage Reason: Working code exists but is disconnected
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B10-005
- Severity: MAJOR
- Batch: 10
- Spec: SPECIAL_EVENTS_SPEC.md §7.3-7.5
- Code Location: N/A (missing)
- Spec Says: Spec §7.3-7.5: Auto-detected event notification toasts, special events log view, end-of-game special events summary
- Code Says: Code: UIDetectionResult type exists but no toast rendering, no event log view, no end-of-game summary
- Recommended Fix: Implement notification toasts and summary views
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B10-006
- Severity: MAJOR
- Batch: 10
- Spec: SPECIAL_EVENTS_SPEC.md §8
- Code Location: N/A (missing)
- Spec Says: Spec §8: SPECIAL_EVENT_COMMENTARY arrays (10 event types × 4 lines each), generateWeeklyNarrative(), SeasonAwardsNominations (mrClutch, webGemKing, intimidationAward, ironMan, tootblanKing, rallyKillerAward, goldenSombreroChamp)
- Code Says: No narrative generation for special events exists anywhere in codebase
- Recommended Fix: Implement special event commentary and season awards tracking
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B10-007
- Severity: MAJOR
- Batch: 10
- Spec: SPECIAL_EVENTS_SPEC.md §2-4
- Code Location: N/A (missing)
- Spec Says: Spec §2-4: Detailed typed event interfaces (NutShotEvent, TootblanEvent, KilledPitcherEvent) with rich data: severity, playResult, hitLocation, tootblanType, situationBefore, etc.
- Code Says: Code: Detection uses simple FameEventType strings with no structured event data — only eventType + message returned, no rich data captured
- Recommended Fix: Implement detailed event interfaces for rich event recording
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B10-008
- Severity: MAJOR
- Batch: 10
- Spec: STADIUM_ANALYTICS_SPEC.md §2-3
- Code Location: N/A (missing)
- Spec Says: Spec §2-3: Full Stadium data structure with StadiumDimensions, dynamic park factor calculation from game data, seed factor generation, confidence-based blending, historical tracking
- Code Says: Code: Only ParkFactors interface exists in bwarCalculator.ts (consumed for WAR). No Stadium object, no dimension tracking, no dynamic calculation, no seed generation, no blending, no historical snapshots
- Recommended Fix: Implement Stadium data structure and park factor calculation engine (DRAFT spec — defer until core features complete)
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B10-009
- Severity: MAJOR
- Batch: 10
- Spec: STADIUM_ANALYTICS_SPEC.md §4
- Code Location: N/A (missing)
- Spec Says: Spec §4: Spray chart tracking with 7 SprayZone types, BattedBallEvent recording, zone aggregation, handedness splits, heat map visualization
- Code Says: No spray chart system exists. FIELD_ZONE_INPUT_SPEC spray chart gap (MAJ-B3-011) already identified. This spec provides the target data model
- Recommended Fix: Implement spray chart system per this spec (prerequisite: FIELD_ZONE_INPUT zone-to-spray bridge from MAJ-B3-011)
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B10-010
- Severity: MAJOR
- Batch: 10
- Spec: STADIUM_ANALYTICS_SPEC.md §5
- Code Location: N/A (missing)
- Spec Says: Spec §5: Stadium records system (single-game records, HR distance records by zone, career records at stadium, team records) with record checking after each game and notifications
- Code Says: No stadium records system exists
- Recommended Fix: Implement after Stadium data structure (MAJ-B10-008)
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B10-011
- Severity: MAJOR
- Batch: 10
- Spec: STADIUM_ANALYTICS_SPEC.md §8
- Code Location: ParkFactorDisplay.tsx (ORPHANED)
- Spec Says: Spec §8: Stadium tab with spray chart, park factors, records, historical factors, player context UI with park-adjusted stats
- Code Says: ParkFactorDisplay.tsx exists (236 lines) but is ORPHANED — never imported. No stadium tab, no spray chart UI, no records view, no historical view, no player park-adjusted context
- Recommended Fix: Wire ParkFactorDisplay into FranchiseHome or create Stadium tab
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B10-012
- Severity: MAJOR
- Batch: 10
- Spec: STAT_TRACKING_ARCHITECTURE_SPEC.md §6
- Code Location: useDataIntegrity.ts:61-178
- Spec Says: Spec §6: Recovery path re-aggregates from event log if aggregation failed
- Code Says: aggregateGameFromEventLog() has TODO comments — logs rebuilt stats but does NOT actually call aggregateToSeason(). Recovery is incomplete
- Recommended Fix: Wire actual season aggregation into recovery path
- My Triage: FIX CODE
- Triage Reason: Major: code differs from spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIS-B11-004
- Severity: MISMATCH
- Batch: 11
- Spec: STORIES_FREE_AGENCY.md S-FA005
- Code Location: FreeAgencyFlow.tsx:288-291
- Spec Says: COMPETITIVE personality: FA goes to team with best H2H record against FA's former team (findRival())
- Code Says: Hardcoded `TEAMS.find(t => t.id === "redsox")` — always routes COMPETITIVE FAs to Red Sox regardless of actual rivalry
- Recommended Fix: Implement findRival() using H2H records or remove hardcoded team
- My Triage: FIX CODE
- Triage Reason: Clear implementation error vs spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIS-B11-005
- Severity: MISMATCH
- Batch: 11
- Spec: STORIES_FREE_AGENCY.md S-FA005
- Code Location: FreeAgencyFlow.tsx:293-299
- Spec Says: RELAXED personality: roll 1-N where N=number of teams, FA goes to rolled team (equal probability)
- Code Says: Uses `Math.random() > 0.5` (50/50 stay vs random team) — not spec's 1-N equal-probability roll across all teams
- Recommended Fix: Replace 50/50 with 1-N team roll per spec
- My Triage: FIX CODE
- Triage Reason: Clear implementation error vs spec
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### CRIT-B7-003
- Severity: CRITICAL
- Batch: 7
- Spec: LEAGUE_BUILDER_FIGMA_SPEC.md §Rules Editor
- Code Location: LeagueBuilderRules.tsx:9
- Spec Says: Spec: 8 Rules Editor tabs (Game, Season, Playoffs, DH, Roster, Econ, Dev, AI)
- Code Says: Code: Only 3 tabs (game, season, playoffs) — 5 tabs entirely missing (DH, Roster, Econ, Dev, AI)
- Recommended Fix: Implement missing 5 Rules Editor tabs
- My Triage: FEATURE BUILD
- Triage Reason: Critical: feature entirely absent
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### CRIT-B7-005
- Severity: CRITICAL
- Batch: 7
- Spec: PLAYOFFS_FIGMA_SPEC.md §Screens 2-6,9
- Code Location: N/A (missing)
- Spec Says: Spec: 6 screens (Series Detail, Start Game Modal, Game Complete, Series MVP, Championship Celebration, Roster Management)
- Code Says: Code: ALL 6 screens entirely missing — no UI pathway to start playoff games, record results, award MVPs, or celebrate championships
- Recommended Fix: Implement all 6 missing playoff screens
- My Triage: FEATURE BUILD
- Triage Reason: Critical: feature entirely absent
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### CRIT-B8-001
- Severity: CRITICAL
- Batch: 8
- Spec: SEASON_END_FIGMA_SPEC.md §Screens 2-3
- Code Location: N/A (missing)
- Spec Says: Spec: Postseason MVP 3-card flip reveal + confirmation with pWAR ranking, 3D card animation, rating +10 bonus
- Code Says: Code: ENTIRELY MISSING — no postseason MVP card reveal, no pWAR calculation, no rating bonus mechanism
- Recommended Fix: Implement Postseason MVP card reveal flow
- My Triage: FEATURE BUILD
- Triage Reason: Critical: feature entirely absent
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B1-001
- Severity: MAJOR
- Batch: 1
- Spec: BWAR_CALCULATION_SPEC.md §9
- Code Location: seasonAggregator.ts or new calibrationService.ts
- Spec Says: Season-end calibration data aggregation pipeline
- Code Says: (Not implemented)
- Recommended Fix: Functions exist but nothing feeds them data
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B1-002
- Severity: MAJOR
- Batch: 1
- Spec: BWAR_CALCULATION_SPEC.md §9
- Code Location: New calibrationService.ts
- Spec Says: Calibration scheduling + blend logic
- Code Says: (Not implemented)
- Recommended Fix: Config (blend=0.3, minSeasons=2, minPA=10k) not implemented
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B1-004
- Severity: MAJOR
- Batch: 1
- Spec: PWAR_CALCULATION_SPEC.md §11
- Code Location: pwarCalculator.ts
- Spec Says: Pitcher park factor adjustment (applyPitcherParkFactor, getParkAdjustedERA)
- Code Says: (Not implemented)
- Recommended Fix: Spec'd but not implemented — same issue as bWAR park factors
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B1-002
- Severity: MAJOR
- Batch: 1
- Spec: BWAR_CALCULATION_SPEC.md §9
- Code Location: N/A (missing)
- Spec Says: Calibration config: minSeasonsBeforeCalibration=2, minTotalPA=10000, blendFactor=0.3, blendCalibration() function
- Code Says: Not implemented — no scheduling, thresholds, or blending logic
- Recommended Fix: Implement calibration scheduler with blend logic per spec
- My Triage: FEATURE BUILD
- Triage Reason: Major feature gap
- Your Decision: (blank)
- Status: DUPLICATE

### MAJ-B1-003
- Severity: MAJOR
- Batch: 1
- Spec: PWAR_CALCULATION_SPEC.md §11
- Code Location: N/A (missing)
- Spec Says: Park factor adjustment for pitchers: applyPitcherParkFactor() adjusts FIP based on HR factor, getParkAdjustedERA() adjusts ERA
- Code Says: Not implemented in pwarCalculator.ts
- Recommended Fix: Add pitcher park factor functions per spec
- My Triage: FEATURE BUILD
- Triage Reason: Major feature gap
- Your Decision: (blank)
- Status: DUPLICATE

### GAP-B2-003
- Severity: MAJOR
- Batch: 2
- Spec: INHERITED_RUNNERS_SPEC.md §6.1
- Code Location: PitcherGameStats in useGameState.ts
- Spec Says: inheritedRunnersStranded field — spec requires tracking stranded count for escape rate + clutch integration
- Code Says: (Not implemented)
- Recommended Fix: PitcherGameStats has inheritedRunners + inheritedRunnersScored but NO inheritedRunnersStranded — cannot calculate escape rate for clutch
- My Triage: FEATURE BUILD
- Triage Reason: Missing engine/calculation logic
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B2-004
- Severity: MAJOR
- Batch: 2
- Spec: INHERITED_RUNNERS_SPEC.md §7.1
- Code Location: clutchCalculator.ts or new function
- Spec Says: evaluateInheritedRunnerEscape() — clutch credit for relievers stranding inherited runners (full=1.0-2.0, partial=0.5, ×√LI)
- Code Says: (Not implemented)
- Recommended Fix: No inherited runner escape/choke evaluation anywhere in clutchCalculator — no integration between tracker and clutch system
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B2-009
- Severity: MAJOR
- Batch: 2
- Spec: PITCHER_STATS_TRACKING_SPEC.md §6.3-6.4
- Code Location: calculatePitcherDecisions in useGameState.ts
- Spec Says: Hold/blown save detection logic: enteredInSaveSituation + lead tracking during appearance
- Code Says: (Not implemented)
- Recommended Fix: No hold or blown save calculation — fields exist but never populated
- My Triage: FEATURE BUILD
- Triage Reason: Missing engine/calculation logic
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B3-001
- Severity: MAJOR
- Batch: 3
- Spec: CLUTCH_ATTRIBUTION_SPEC.md §7
- Code Location: clutchCalculator.ts
- Spec Says: Shift tracking system: applyShiftAdjustment() adjusts fielder/manager credit when shift is on (pull-side ground out = +0.2 manager, opposite field hit = -0.3 manager + 0 fielder)
- Code Says: (Not implemented)
- Recommended Fix: shift_on exists as manager decision type (line 837) with success/failure values, but NO applyShiftAdjustment() function, no shift toggle tracking, no direction-based adjustment
- My Triage: FEATURE BUILD
- Triage Reason: Missing engine/calculation logic
- Your Decision: SKIP
- Status: SKIP (Phase B)

### GAP-B3-005
- Severity: MAJOR
- Batch: 3
- Spec: CLUTCH_ATTRIBUTION_SPEC.md §6
- Code Location: calculatePlayAttribution or integration layer
- Spec Says: Manager decision inference: auto-detect pitching_change, pinch_hitter, pinch_runner, defensive_sub, IBB; prompt for steal/bunt/squeeze/hit-and-run
- Code Says: (Not implemented)
- Recommended Fix: Manager attribution exists in calculatePlayAttribution (lines 802-817) and getManagerBaseValue (lines 825-842) with all 11 decision types and values, but NO auto-detection logic — depends on caller explicitly providing managerDecision. No prompt system for steal/bunt/squeeze calls
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B3-009
- Severity: MAJOR
- Batch: 3
- Spec: FIELDING_SYSTEM_SPEC.md §7
- Code Location: fielderInference.ts
- Spec Says: Foul ball handling: 5 foul territory zones (FL-LINE, FL-HOME, FR-LINE, FR-HOME, FOUL-BACK) with distinct fielder priorities per zone
- Code Says: (Not implemented)
- Recommended Fix: No foul territory zones in code at all. Direction type only supports 5 fair territory directions. Foul ball putouts cannot be correctly attributed
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B3-010
- Severity: MAJOR
- Batch: 3
- Spec: FIELDING_SYSTEM_SPEC.md §16
- Code Location: fielderInference.ts + useGameState.ts
- Spec Says: Shift handling: shift types (Standard, Pull, No Shift), shift-adjusted inference probabilities, shift state tracking per AB, user toggle before at-bat
- Code Says: (Not implemented)
- Recommended Fix: No shift logic in inference engine. game.ts FieldingData has shiftActive field but never populated. No UI toggle for shift
- My Triage: FEATURE BUILD
- Triage Reason: Missing engine/calculation logic
- Your Decision: SKIP
- Status: SKIP (Phase B)

### GAP-B3-011
- Severity: MAJOR
- Batch: 3
- Spec: FIELDING_SYSTEM_SPEC.md §19
- Code Location: game.ts FieldingData (partial), fieldingStatsAggregator.ts FieldingPlay (simplified)
- Spec Says: FieldingPlay record interface: 40+ fields including battedBallType, direction (7-way), depth, playType, errorType, errorContext, assists[], dpRole, shiftActive, nutshotEvent, comebackerInjury, robberyAttempted, robberyFailed, infieldFlyRule, groundRuleDouble, badHopEvent, d3kEvent, outsRecorded
- Code Says: (Not implemented)
- Recommended Fix: game.ts FieldingData covers ~70% of fields. fieldingStatsAggregator.ts FieldingPlay only has 9 fields (stripped down). Neither match spec's complete interface. Missing: battedBallType on FieldingData, direction (7-way vs 5-way), depth as required field, grdWallSection, badHopExpectedResult [USER NOTE: Full 40+ field spec, minus shift fields, keep code-only fields zoneId/foulOut/savedRun, align with stat-tracking]
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B3-025
- Severity: MAJOR
- Batch: 3
- Spec: FIELD_ZONE_INPUT_SPEC.md §6
- Code Location: fieldZones.ts or new zoneCQ.ts
- Spec Says: Zone-to-CQ integration: getCQTrajectoryFromZone() maps zone depth to CQ inference params (fly ball: infield→shallow, medium→medium, deep→deep; ground ball: infield→medium speed, outfield→hard speed); getContactQualityFromZone() bridges to clutchCalculator; getFoulContactQuality() with per-zone CQ table (F06=0.15, F02/F03=0.20, F01/F04=0.35, F00/F05=0.50)
- Code Says: (Not implemented)
- Recommended Fix: Entire CQ integration layer is unimplemented — zone taps capture location but CQ is derived only from exit type, ignoring zone depth
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B3-026
- Severity: MAJOR
- Batch: 3
- Spec: FIELD_ZONE_INPUT_SPEC.md §8
- Code Location: fieldZones.ts or new sprayChart.ts
- Spec Says: Spray chart generation: generateSprayPoint(zoneId, ±3 jitter), createSprayChartEntry(zoneId, batterHand, result, exitType), SPRAY_COLORS (HR=red, triple=orange, double=yellow, single=green, out=gray, error=purple), SPRAY_SIZES (HR=12, triple=10, down to out=6)
- Code Says: (Not implemented)
- Recommended Fix: No spray chart generation from zone taps. Zone data captured but never converted to spray chart visualization points
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B3-027
- Severity: MAJOR
- Batch: 3
- Spec: FIELD_ZONE_INPUT_SPEC.md §8.2
- Code Location: stadiumAnalytics.ts or new stadiumSpray.ts
- Spec Says: Stadium spray chart integration: createStadiumBattedBallEvent(), mapToStadiumSprayZone() (25-zone→7 spray zones), estimateDistance() for HR zones (Z13=330ft, Z14=375ft, Z15=400ft, Z16=375ft, Z17=340ft ±30ft random), recordBattedBallToStadium()
- Code Says: (Not implemented)
- Recommended Fix: No zone-to-stadium analytics pipeline. mapToStadiumSprayZone mapping table and estimateDistance constants not implemented anywhere
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B3-005
- Severity: MAJOR
- Batch: 3
- Spec: FIELDING_SYSTEM_SPEC.md §4
- Code Location: fielderInference.ts:61-91
- Spec Says: Spec §4 defines 7 directions (FL, L, LC, C, RC, R, FR) for ALL inference matrices with foul territory fielders (FL: C/3B/P for GB; LF/3B/C for FB; etc.)
- Code Says: Code only has 5 directions (Left, Left-Center, Center, Right-Center, Right) — FL and FR directions completely missing from all 4 matrices
- Recommended Fix: Add FL and FR entries to all inference matrices (GROUND_BALL_INFERENCE, FLY_BALL_INFERENCE, LINE_DRIVE_INFERENCE, POP_FLY_INFERENCE) per spec §4 and §7
- My Triage: FEATURE BUILD
- Triage Reason: Major feature gap
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B3-006
- Severity: MAJOR
- Batch: 3
- Spec: FIELDING_SYSTEM_SPEC.md §4
- Code Location: fielderInference.ts:85-91
- Spec Says: Spec §4: Pop flies have DEPTH-aware inference (Shallow→C/P, Infield→positional, OF Grass→CF/LF/RF) with priority order (CF>Corner OF>SS>2B>1B/3B>P/C)
- Code Says: Code: POP_FLY_INFERENCE has no depth dimension — only direction, always returns infield positions. "Any + Shallow" (C/P) and "Any + OF Grass" (CF/LF/RF) rows completely missing
- Recommended Fix: Add depth parameter to pop fly inference per spec §4 priority matrix
- My Triage: FEATURE BUILD
- Triage Reason: Major feature gap
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B4-001
- Severity: MAJOR
- Batch: 4
- Spec: MOJO_FITNESS_SYSTEM_SPEC.md §6.2
- Code Location: mojoEngine.ts or useGameState.ts
- Spec Says: recordPAWithContext() — per-PA Mojo/Fitness snapshot recording + split accumulation. Spec: store batterMojo, batterFitness, pitcherMojo, pitcherFitness with each PA, then call updateBattingSplits/updatePitchingSplits
- Code Says: (Not implemented)
- Recommended Fix: Data structure exists (MojoSplitStats, PlayerMojoSplits) but NO accumulation function. No recordPAWithContext(), updateBattingSplits(), or updatePitchingSplits(). Splits are defined but never populated
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B4-005
- Severity: MAJOR
- Batch: 4
- Spec: GRADE_ALGORITHM_SPEC.md §Complete Implementation
- Code Location: New gradeEngine.ts
- Spec Says: POSITION_PLAYER_GRADE_THRESHOLDS, PITCHER_GRADE_THRESHOLDS as production constants — no engine file exists
- Code Says: (Not implemented)
- Recommended Fix: Spec provides full implementation code but no engine file was created. All grade logic is either in test helper or hardcoded
- My Triage: FEATURE BUILD
- Triage Reason: Missing engine/calculation logic
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B4-006
- Severity: MAJOR
- Batch: 4
- Spec: GRADE_ALGORITHM_SPEC.md §Two-Way Players
- Code Location: gradeEngine.ts
- Spec Says: Two-way player valuation: (posRating + pitchRating) × 1.25 premium
- Code Says: (Not implemented)
- Recommended Fix: No two-way player support anywhere in grade or salary system
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B4-007
- Severity: MAJOR
- Batch: 4
- Spec: GRADE_ALGORITHM_SPEC.md §Prospect Generation
- Code Location: gradeEngine.ts or draftEngine.ts
- Spec Says: generateProspectRatings() with POSITION_STAT_BIAS, weighted target, clamp 15-85, grade verification + adjustment
- Code Says: (Not implemented)
- Recommended Fix: LeagueBuilderDraft.tsx uses random grade from flat array, no weighted rating calculation, no position-specific stat distribution
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B4-008
- Severity: MAJOR
- Batch: 4
- Spec: GRADE_ALGORITHM_SPEC.md §Prospect Generation
- Code Location: gradeEngine.ts or draftEngine.ts
- Spec Says: generateProspectGrade(round) round-based probability distributions per draft round
- Code Says: (Not implemented)
- Recommended Fix: No round-based probability distribution. Code picks random index from GRADES array uniformly
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B4-009
- Severity: MAJOR
- Batch: 4
- Spec: GRADE_ALGORITHM_SPEC.md §Prospect Generation
- Code Location: gradeEngine.ts or draftEngine.ts
- Spec Says: generatePotentialCeiling(currentGrade) with grade-specific ceiling probability tables
- Code Says: (Not implemented)
- Recommended Fix: LeagueBuilderDraft.tsx ceiling = GRADES[max(0, gradeIdx - random*3)] — very rough approximation, not matching spec's per-grade probability distributions
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B4-010
- Severity: MAJOR
- Batch: 4
- Spec: GRADE_ALGORITHM_SPEC.md §Pitcher Prospect Generation
- Code Location: gradeEngine.ts or draftEngine.ts
- Spec Says: generatePitcherProspectRatings() with SP/RP/CP bias (SP: +5ACC, CP: +8VEL/+5JNK/-13ACC, RP: style roll) + generateArsenal(junk)
- Code Says: (Not implemented)
- Recommended Fix: No pitcher prospect generation. DraftFlow.tsx has hardcoded pitcher prospects; LeagueBuilderDraft.tsx generates all prospects with position player logic
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B4-012
- Severity: MAJOR
- Batch: 4
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §Core Calculation
- Code Location: New fanFavoriteEngine.ts
- Spec Says: detectFanFavorite(team, seasonStats, leagueContext) — highest positive Value Delta on team + generateFanFavoriteReason()
- Code Says: (Not implemented)
- Recommended Fix: ENTIRELY UNIMPLEMENTED. calculateTrueValue() returns valueDelta in salaryCalculator.ts but no detectFanFavorite() wrapper exists. No per-team detection, no one-per-team enforcement
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B4-013
- Severity: MAJOR
- Batch: 4
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §Albatross Detection
- Code Location: New fanFavoriteEngine.ts
- Spec Says: detectAlbatross(team, seasonStats, leagueContext) — most negative Value Delta, min salary ≥2× league minimum, threshold ≥25% underperformance
- Code Says: (Not implemented)
- Recommended Fix: ENTIRELY UNIMPLEMENTED. No Albatross detection logic, no minimum salary filter, no underperformance threshold
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B4-014
- Severity: MAJOR
- Batch: 4
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §Detection Timing
- Code Location: fanFavoriteEngine.ts
- Spec Says: getMinGamesForQualification(): 10% of season, min 3 games + DETECTION_TRIGGERS (GAME_END, TRADE_COMPLETED, PLAYER_INJURED)
- Code Says: (Not implemented)
- Recommended Fix: No qualification threshold calculation. No detection trigger system
- My Triage: FEATURE BUILD
- Triage Reason: Missing engine/calculation logic
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B4-015
- Severity: MAJOR
- Batch: 4
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §Fan Morale Impact
- Code Location: fanMoraleEngine.ts integration
- Spec Says: IN_SEASON_HAPPINESS_EFFECTS: FF_BIG_GAME+0.75, FF_CLUTCH+1.0, FF_WALKOFF+2.0, ALB_CLUTCH_FAILURE-0.75, ALB_ERROR-1.0, ALB_BENCHED-0.5. Season scaling ×0.5/1.0/1.25/1.5
- Code Says: (Not implemented)
- Recommended Fix: fanMoraleEngine exists (1300+ lines) but has NO Fan Favorite/Albatross event processing. No special happiness effects for these designations
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B4-016
- Severity: MAJOR
- Batch: 4
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §Roster Transactions
- Code Location: fanMoraleEngine.ts integration
- Spec Says: TRANSACTION_HAPPINESS_EFFECTS: TRADED_FF=-15, RELEASED_FF=-20, FF_RETIRES=-5, FF_FA_LOSS=-10, TRADED_ALB=+10, RELEASED_ALB=+15, ALB_RETIRES=+5, ALB_FA_LOSS=+8
- Code Says: (Not implemented)
- Recommended Fix: No roster transaction happiness effects for Fan Favorite/Albatross
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B4-017
- Severity: MAJOR
- Batch: 4
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §Trade Value
- Code Location: tradeEngine or salaryCalculator.ts
- Spec Says: Trade value modifier: Fan Favorite ×1.15 premium, Albatross ×0.70 discount
- Code Says: (Not implemented)
- Recommended Fix: No trade value adjustment for Fan Favorite/Albatross status
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B4-018
- Severity: MAJOR
- Batch: 4
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §Contract Negotiation
- Code Location: offseason free agency flow
- Spec Says: Free agency demand: FF +15% with 10% loyalty discount for re-sign, Albatross -10% with no loyalty
- Code Says: (Not implemented)
- Recommended Fix: No contract negotiation modifiers for designations
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B4-019
- Severity: MAJOR
- Batch: 4
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §Narrative
- Code Location: narrativeEngine.ts integration
- Spec Says: FAN_FAVORITE_HEADLINES with 4 event categories × 3 templates each + generateFanFavoriteHeadline()
- Code Says: (Not implemented)
- Recommended Fix: narrativeEngine exists but has no Fan Favorite/Albatross headline templates or generation
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B4-020
- Severity: MAJOR
- Batch: 4
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §Fame Events
- Code Location: types/game.ts FameEventType
- Spec Says: FAN_FAVORITE_FAME_EVENTS: FF_NAMED=+2, ALB_NAMED=-1, FF_CLUTCH=+1.5, ALB_FAILURE=-1.5
- Code Says: (Not implemented)
- Recommended Fix: These 4 Fame event types NOT in FameEventType enum (154 entries, none for Fan Favorite/Albatross)
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B4-021
- Severity: MAJOR
- Batch: 4
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §End of Season
- Code Location: season end processing flow
- Spec Says: processEndOfSeasonFanFavorite() — lock designations, award Fame, record in player history, carry over until 10% of next season
- Code Says: (Not implemented)
- Recommended Fix: No end-of-season Fan Favorite processing
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B4-022
- Severity: MAJOR
- Batch: 4
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §UI Display
- Code Location: Roster view components
- Spec Says: Value Delta color coding (green-bright/green/gray/orange/red), roster view integration with superscript delta values, FF ⭐ and Albatross 💀 badges
- Code Says: (Not implemented)
- Recommended Fix: No Fan Favorite/Albatross UI display. No value delta color coding
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B4-023
- Severity: MAJOR
- Batch: 4
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §UI Display
- Code Location: Roster view or player card
- Spec Says: Dynamic "Projected" status (dotted border badge) updates after every game vs "Season-locked" (solid border) at season end
- Code Says: (Not implemented)
- Recommended Fix: No projected vs locked designation display
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B4-024
- Severity: MAJOR
- Batch: 4
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §Key Principles
- Code Location: Season transition logic
- Spec Says: Season carryover: FF and Albatross persist into next season until 10% mark when new projections begin
- Code Says: (Not implemented)
- Recommended Fix: No cross-season carryover mechanism for designations
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B4-025
- Severity: MAJOR
- Batch: 4
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §Albatross Detection
- Code Location: fanFavoriteEngine.ts
- Spec Says: generateAlbatrossReason() with 3 severity tiers (≥75% under, ≥50% under, default)
- Code Says: (Not implemented)
- Recommended Fix: No Albatross reason generation
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B4-001
- Severity: MAJOR
- Batch: 4
- Spec: MOJO_FITNESS_SYSTEM_SPEC.md §6.2
- Code Location: mojoEngine.ts:802-806 PlayerMojoSplits
- Spec Says: Spec §6.2: MojoFitnessSplits includes battingByMojo, battingByFitness, pitchingByMojo, pitchingByFitness — 4 split categories with full BattingStats/PitchingStats per state
- Code Says: Code PlayerMojoSplits has ONLY battingByMojo (Record<MojoLevel, MojoSplitStats>). Missing: battingByFitness, pitchingByMojo, pitchingByFitness — 3 of 4 split categories absent
- Recommended Fix: Add battingByFitness, pitchingByMojo, pitchingByFitness to PlayerMojoSplits (or create separate FitnessSplits interface)
- My Triage: FEATURE BUILD
- Triage Reason: Major feature gap
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B5-001
- Severity: MAJOR
- Batch: 5
- Spec: FRANCHISE_MODE_SPEC.md §4
- Code Location: New franchiseManager.ts
- Spec Says: FranchiseManager API: createFranchise, loadFranchise, deleteFranchise, renameFranchise, listFranchises, exportFranchise, importFranchise, getActiveFranchise, setActiveFranchise
- Code Says: (Not implemented)
- Recommended Fix: PLANNING SPEC — No FranchiseManager implementation. franchiseStorage.ts is a stub (all functions return null)
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B5-002
- Severity: MAJOR
- Batch: 5
- Spec: FRANCHISE_MODE_SPEC.md §2.2
- Code Location: Storage architecture
- Spec Says: Separate IndexedDB per franchise: kbl-franchise-{id}/ with independent stores per franchise + kbl-app-meta/ for shared data
- Code Says: (Not implemented)
- Recommended Fix: Single DB used for entire app. No per-franchise isolation. No kbl-app-meta DB
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B5-003
- Severity: MAJOR
- Batch: 5
- Spec: FRANCHISE_MODE_SPEC.md §6.2
- Code Location: App navigation
- Spec Says: Franchise switching: close DB, clear state, open new DB, integrity check, load state
- Code Says: (Not implemented)
- Recommended Fix: No franchise switching mechanism. FranchiseHome is a page within single app context
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B5-004
- Severity: MAJOR
- Batch: 5
- Spec: FRANCHISE_MODE_SPEC.md §7
- Code Location: Migration logic
- Spec Says: Migration: detect legacy data, create "Default Franchise", auto-migrate, schema version per franchise
- Code Says: (Not implemented)
- Recommended Fix: No migration path. No schema versioning per franchise
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B5-005
- Severity: MAJOR
- Batch: 5
- Spec: FRANCHISE_MODE_SPEC.md §4.1
- Code Location: franchiseManager.ts
- Spec Says: Export/Import: exportFranchise() → Blob, importFranchise(Blob) → FranchiseId
- Code Says: (Not implemented)
- Recommended Fix: No export/import functionality
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B5-006
- Severity: MAJOR
- Batch: 5
- Spec: FRANCHISE_MODE_SPEC.md §5
- Code Location: New FranchiseSelector page
- Spec Says: Franchise Selector UI: startup screen with franchise cards (name, season count, storage, last played), New Franchise button, actions menu (Continue/Rename/Export/Delete)
- Code Says: (Not implemented)
- Recommended Fix: No franchise selector. App opens directly to navigation
- My Triage: FEATURE BUILD
- Triage Reason: Missing UI component/screen
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B5-007
- Severity: MAJOR
- Batch: 5
- Spec: FRANCHISE_MODE_SPEC.md §5.3
- Code Location: GameTracker header
- Spec Says: In-game franchise indicator: small header showing active franchise name
- Code Says: (Not implemented)
- Recommended Fix: No franchise name indicator in game UI
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B5-008
- Severity: MAJOR
- Batch: 5
- Spec: FRANCHISE_MODE_SPEC.md §3
- Code Location: franchiseManager.ts
- Spec Says: Storage monitoring: show usage per franchise, track storageUsedBytes in FranchiseSummary
- Code Says: (Not implemented)
- Recommended Fix: No storage usage tracking per franchise
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B6-011
- Severity: MAJOR
- Batch: 6
- Spec: FREE_AGENCY_FIGMA_SPEC.md §Signing Screen
- Code Location: FreeAgencyFlow.tsx
- Spec Says: Spec: Free Agent Pool/Signing Screen with contract details, team selector, payroll warning (lines 662-722)
- Code Says: Code: Entire supplemental signing screen NOT implemented
- Recommended Fix: Implement free agent pool browsing and signing screen
- My Triage: FEATURE BUILD
- Triage Reason: Major feature gap
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B7-009
- Severity: MAJOR
- Batch: 7
- Spec: FINALIZE_ADVANCE_FIGMA_SPEC.md §Transaction Report
- Code Location: FinalizeAdvanceFlow.tsx:816-833
- Spec Says: Spec: Report shows retirement count, user/AI breakdown, filter dropdowns
- Code Says: Code: Only shows Total/Call-Ups/Send-Downs — missing retirement count, user/AI split, and filter controls
- Recommended Fix: Add retirement rows, user/AI breakdown, filter dropdowns
- My Triage: FEATURE BUILD
- Triage Reason: Major feature gap
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B8-009
- Severity: MAJOR
- Batch: 8
- Spec: SEASON_SETUP_FIGMA_SPEC.md §Playoff Mode
- Code Location: N/A (missing)
- Spec Says: Spec: SS-F008/F009 Playoff Mode Entry + Seeding screens with drag-to-reorder, auto-seed
- Code Says: Code: Entire Playoff Mode entry flow missing — no seeding configuration UI
- Recommended Fix: Implement playoff mode entry and seeding screens
- My Triage: FEATURE BUILD
- Triage Reason: Major feature gap
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B8-011
- Severity: MAJOR
- Batch: 8
- Spec: SUBSTITUTION_FLOW_SPEC.md §Validation
- Code Location: substitution.ts, game.ts
- Spec Says: Spec: SUBSTITUTION_RULES constant, validateSubstitution with pitch count check, validateLineup with 9-position check
- Code Says: Code: SUBSTITUTION_RULES missing, validateSubstitution has different params, validateLineup missing entirely, validateDefensiveAlignment exists but ORPHANED (never called)
- Recommended Fix: Implement/wire validation functions
- My Triage: FEATURE BUILD
- Triage Reason: Major feature gap
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B9-005
- Severity: MAJOR
- Batch: 9
- Spec: DYNAMIC_DESIGNATIONS_SPEC.md §Fan Favorite
- Code Location: N/A (missing)
- Spec Says: Spec: Fan Favorite + Albatross designation system with detection, UI badges, fame, offseason effects
- Code Says: Code: ENTIRELY MISSING — zero implementation
- Recommended Fix: Implement Fan Favorite/Albatross system
- My Triage: FEATURE BUILD
- Triage Reason: Major feature gap
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B10-001
- Severity: MAJOR
- Batch: 10
- Spec: KBL_XHD_TRACKER_MASTER_SPEC_v3.md §15/§24
- Code Location: New oddityRecordTracker.ts + museumStorage
- Spec Says: Oddity Records system: 19 record types (Shortest Homer, Slowest Triple, etc.) with OddityRecordCandidate interface, GameOddityState tracking, play-by-play/end-of-game/season-end checks
- Code Says: (Not implemented)
- Recommended Fix: Zero implementation. No OddityRecord types, no tracking functions, no storage
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B10-002
- Severity: MAJOR
- Batch: 10
- Spec: KBL_XHD_TRACKER_MASTER_SPEC_v3.md §26
- Code Location: New nicknameEngine.ts + player model
- Spec Says: Nickname system: 16 auto-nickname triggers (Mr. October, The Ace, The Machine, etc.) with checkForNickname(), user override, earned-season tracking
- Code Says: (Not implemented)
- Recommended Fix: Zero implementation. Player model has no nickname field beyond leagueBuilder
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B10-003
- Severity: MAJOR
- Batch: 10
- Spec: KBL_XHD_TRACKER_MASTER_SPEC_v3.md §25
- Code Location: New tradeEngine.ts + seasonStorage update
- Spec Says: In-season Trade system: trade execution, stat splits (byTeam array), trade deadline at 65% season, salary matching, trade history, WAR attribution per team stint
- Code Says: (Not implemented)
- Recommended Fix: Zero implementation. No trade execution, no stat splits, no trade deadline prompt
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B10-004
- Severity: MAJOR
- Batch: 10
- Spec: KBL_XHD_TRACKER_MASTER_SPEC_v3.md §25/§26
- Code Location: Player model + gameTracker integration
- Spec Says: Revenge game tracking: formerTeams array, revengeGames array, firstMeetingPlayed flag, performance tracking vs former team, 3-season duration
- Code Says: (Not implemented)
- Recommended Fix: Zero implementation. No formerTeams, revengeGames, or revenge-game detection
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B10-005
- Severity: MAJOR
- Batch: 10
- Spec: KBL_XHD_TRACKER_MASTER_SPEC_v3.md §24
- Code Location: New awardEmblems.ts + player model
- Spec Says: Award Emblems system: AWARD_EMBLEMS const (16 types), getPlayerEmblems() function, priority ordering, count display (e.g., "⭐(3)"), display in 4 locations (GameTracker, roster, player card, museum)
- Code Says: (Not implemented)
- Recommended Fix: Zero implementation. No emblem constants, display functions, or UI integration
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B10-006
- Severity: MAJOR
- Batch: 10
- Spec: KBL_XHD_TRACKER_MASTER_SPEC_v3.md §6
- Code Location: museumStorage or new hofEngine.ts
- Spec Says: HOF Score calculation: calculateHOFScore() with WAR×1.5 + MVP×15 + CY×15 + AS×3 + GG×2 + champ×5. Entry criteria: WAR≥50 OR MVP≥1 OR AS≥5 OR override
- Code Says: (Not implemented)
- Recommended Fix: Zero implementation. Museum storage exists but no induction logic [USER NOTE: HOF score weighted by games/season variable from season setup]
- My Triage: FEATURE BUILD
- Triage Reason: Missing engine/calculation logic
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B11-001
- Severity: GAP
- Batch: 11
- Spec: STORIES_AWARDS_CEREMONY.md S-AWD001
- Code Location: AwardsCeremonyFlow.tsx:358-464
- Spec Says: League leaders auto-calculated from season stats with min qualifications, tie handling, leader rewards applied
- Code Says: LeagueLeadersScreen is entirely hardcoded mock data — no getAllBattingStats/getAllPitchingStats call, no min PA/IP check, rewards are display-only text not applied
- Recommended Fix: Wire to seasonStorage for real league leader calculation
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B11-002
- Severity: GAP
- Batch: 11
- Spec: STORIES_AWARDS_CEREMONY.md S-AWD002
- Code Location: AwardsCeremonyFlow.tsx:467-618
- Spec Says: Hybrid voting: calculate weighted scores, display top 3-5 candidates, scoring breakdown, "Other Player" opens search, selection calls addAward()
- Code Says: Candidates are hardcoded mock objects, "Other Player" button is non-functional, selection doesn't call addAward() — award is visual-only
- Recommended Fix: Implement candidate scoring from season WAR/clutch/stats + wire addAward() on selection
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B11-003
- Severity: GAP
- Batch: 11
- Spec: STORIES_AWARDS_CEREMONY.md S-AWD015
- Code Location: N/A (missing)
- Spec Says: Trait replacement flow when player with 2 traits earns new trait: show current traits, show new, options Replace/Replace/Decline
- Code Says: No trait replacement flow exists anywhere — Booger Glove has trait LOSS but not the general replacement modal
- Recommended Fix: Implement TraitReplacementModal per story UI wireframe
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B11-004
- Severity: GAP
- Batch: 11
- Spec: STORIES_AWARDS_CEREMONY.md S-AWD004
- Code Location: AwardsCeremonyFlow.tsx:685-767
- Spec Says: Booger Glove: auto-select lowest fWAR, if <2 traits → gain Butter Fingers, if 2 traits → lose one
- Code Says: Player hardcoded, only trait-loss path rendered (no <2 traits → Butter Fingers branch), auto-select logic absent
- Recommended Fix: Add <2 traits branch, wire auto-select from real fWAR data
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B11-005
- Severity: GAP
- Batch: 11
- Spec: STORIES_AWARDS_CEREMONY.md S-AWD006
- Code Location: AwardsCeremonyFlow.tsx:1440-1568
- Spec Says: MVP: show voting breakdown percentages, runner-up and 3rd get random trait, chemistry-weighted trait
- Code Says: Only winner gets trait roll, runner-up/3rd traits absent, voting percentages are hardcoded strings, no chemistry weighting
- Recommended Fix: Add runner-up/3rd trait awards, real voting calc
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B11-006
- Severity: GAP
- Batch: 11
- Spec: STORIES_DRAFT.md S-DRF013
- Code Location: DraftFlow.tsx:144-190
- Spec Says: Procedural draft class generation using round-based probability tables for grade distribution
- Code Says: Draft class is 20 hardcoded mock prospects — not procedurally generated, no probability tables
- Recommended Fix: Implement procedural generation with round-based grade probabilities per spec
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B11-007
- Severity: GAP
- Batch: 11
- Spec: STORIES_DRAFT.md S-DRF008
- Code Location: DraftFlow.tsx:262-274
- Spec Says: Pass/Skip only allowed when Farm roster full (≥10 players) AND drafted at least 1
- Code Says: Code only checks `draftedThisDraft < 1` — no Farm count check. Can pass with Farm at 3
- Recommended Fix: Add farmCount ≥ 10 check to handlePassPick
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B11-008
- Severity: GAP
- Batch: 11
- Spec: STORIES_DRAFT.md S-DRF009
- Code Location: N/A (missing)
- Spec Says: Full Farm Release Rule: when Farm=10, drafting requires releasing a player of same grade or worse
- Code Says: No release mechanism exists. Code at line 1347 says "can exceed 10". Farm over-flow is allowed without release
- Recommended Fix: Implement release modal per spec before confirming pick when farmCount ≥ 10
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B11-009
- Severity: GAP
- Batch: 11
- Spec: STORIES_FINALIZE_ADVANCE.md S-FA007
- Code Location: N/A (missing)
- Spec Says: Swap: combined call-up + send-down in one atomic action with combined impact summary
- Code Says: No swap functionality exists — user must do separate call-up and send-down
- Recommended Fix: Add Swap button and modal per spec
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B11-010
- Severity: GAP
- Batch: 11
- Spec: STORIES_FINALIZE_ADVANCE.md S-FA015
- Code Location: FinalizeAdvanceFlow.tsx:366-377
- Spec Says: Season transition processing: ages +1, salaries recalculated, mojo reset, stats cleared, clutch reset, fame reset, YOS +1, rookie status applied
- Code Says: startSeasonTransition only runs cosmetic animation (processingStep counter) — no actual data transformations to IndexedDB
- Recommended Fix: Wire actual season transition processing to storage layer
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: (blank)
- Status: DUPLICATE

### GAP-B11-011
- Severity: GAP
- Batch: 11
- Spec: STORIES_FINALIZE_ADVANCE.md S-FA009
- Code Location: FinalizeAdvanceFlow.tsx:352-364
- Spec Says: AI auto-manages rosters: call up by ceiling→grade→age, send down by grade→age→salary, release excess
- Code Says: processAITeams only runs cosmetic animation with hardcoded results ("19 teams, 12 call-ups"). No actual roster changes
- Recommended Fix: Implement AI roster management algorithm per spec priority rules
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: (blank)
- Status: DUPLICATE

### GAP-B11-012
- Severity: GAP
- Batch: 11
- Spec: STORIES_FREE_AGENCY.md S-FA001
- Code Location: FreeAgencyFlow.tsx
- Spec Says: Spec defines direct FA signing: click FA card → contract modal → sign with cap space validation
- Code Says: No direct signing action exists. Flow is entirely dice-based (protection → dice → destination → exchange). No contract modal or cap space check
- Recommended Fix: Implement direct signing flow per S-FA001 or remove story if dice-only is intended [USER NOTE: Confirmed - builds supplemental signing screen per Figma spec, coexists with dice flow]
- My Triage: FEATURE BUILD
- Triage Reason: Missing UI component/screen
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B11-013
- Severity: GAP
- Batch: 11
- Spec: STORIES_FREE_AGENCY.md S-FA006
- Code Location: FreeAgencyFlow.tsx
- Spec Says: H2H record tracking: store head-to-head records between teams, use for COMPETITIVE personality rival calculation
- Code Says: No H2H storage or tracking system exists anywhere in codebase. COMPETITIVE hardcodes rival
- Recommended Fix: Implement H2H tracking in franchise storage; wire to findRival() for COMPETITIVE routing
- My Triage: FEATURE BUILD
- Triage Reason: Missing engine/calculation logic
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B11-014
- Severity: GAP
- Batch: 11
- Spec: STORIES_FREE_AGENCY.md S-FA008
- Code Location: FreeAgencyFlow.tsx:391-404
- Spec Says: Two-round flow with state persistence across sessions (resume interrupted FA)
- Code Says: Two rounds work in-session (currentRound 1→2) but no persistence — closing and reopening loses all FA progress
- Recommended Fix: Add FA round state to offseason persistence
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B11-015
- Severity: GAP
- Batch: 11
- Spec: STORIES_FREE_AGENCY.md S-FA009
- Code Location: FreeAgencyFlow.tsx:1283-1443
- Spec Says: Summary UI: team filter dropdown, net WAR/salary change per team, export/print
- Code Says: Summary shows moves grouped by round with personality icons but missing: team filter, net WAR/salary calculations, export/print functionality
- Recommended Fix: Add team filter, WAR/salary deltas, and export to FA summary
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B12-004
- Severity: GAP
- Batch: 12
- Spec: STORIES_GAP_CLOSERS.md NEW-001
- Code Location: FreeAgencyFlow.tsx
- Spec Says: Direct FA signing: Sign button on FA card → contract modal → confirm with cap space validation
- Code Says: No sign button — flow uses dice-based protection/roll/destination/exchange only. No contract modal or cap space check
- Recommended Fix: Already noted as GAP-B11-012. Implement direct sign flow or confirm dice-only is intended
- My Triage: FEATURE BUILD
- Triage Reason: Missing UI component/screen
- Your Decision: (blank)
- Status: DUPLICATE

### GAP-B12-005
- Severity: GAP
- Batch: 12
- Spec: STORIES_GAP_CLOSERS.md NEW-008
- Code Location: src/hooks/useSeasonData.ts, useRosterData.ts
- Spec Says: Data integration layer: useSeasonData, useRosterData, usePlayerData hooks for all route wrappers with loading + error states
- Code Says: Base hooks exist but usePlayerData not found. Not confirmed these hooks are used in route wrappers
- Recommended Fix: Complete data integration layer — add usePlayerData, wire hooks to route components
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B12-006
- Severity: GAP
- Batch: 12
- Spec: STORIES_GAP_CLOSERS.md NEW-010
- Code Location: GameTracker.tsx:2546,2624
- Spec Says: Player names clickable → opens PlayerCard modal with full stats (batter, due-up, pitcher)
- Code Says: Basic onClick handlers set selectedPlayer state, but no full PlayerCard modal opens. Due-up names not confirmed clickable
- Recommended Fix: Wire PlayerCard modal to player name clicks, add to due-up names
- My Triage: FEATURE BUILD
- Triage Reason: Missing UI component/screen
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B12-007
- Severity: GAP
- Batch: 12
- Spec: STORIES_GAP_CLOSERS.md NEW-013
- Code Location: relationshipIntegration.ts
- Spec Says: Relationship engine called at season start, affects morale, generates trade warnings
- Code Says: Integration wrapper exists with all functions exported, but no confirmed call from season initialization or morale calculation pipeline
- Recommended Fix: Wire relationshipEngine to season init and morale calculations
- My Triage: FEATURE BUILD
- Triage Reason: Missing engine/calculation logic
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B12-008
- Severity: GAP
- Batch: 12
- Spec: STORIES_GAP_CLOSERS.md NEW-015
- Code Location: narrativeIntegration.ts
- Spec Says: Beat reporter stories affect fan morale: calculateStoryMoraleImpact() called on story creation, fan morale updated, visible in UI
- Code Says: Functions exist (calculateStoryMoraleImpact exported) but no confirmed integration call in game flow connecting narrative output to fanMoraleEngine
- Recommended Fix: Wire narrative story creation to fanMoraleEngine.applyImpact()
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B12-001
- Severity: GAP
- Batch: 12
- Spec: STORIES_GAMETRACKER_FIXES.md GT-005
- Code Location: EnhancedInteractiveField.tsx:3834
- Spec Says: After fielder drag, original position cleared or shown as ghost with clear distinction — no duplicate labels
- Code Says: Original fielder positions still rendered at line 3834 ("Fielders at original positions"). No GT-005 fix comment found. Fielder may still appear at both old and new location
- Recommended Fix: Implement ghost/hide logic for original fielder position after drag
- My Triage: FEATURE BUILD
- Triage Reason: Missing feature needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B12-002
- Severity: GAP
- Batch: 12
- Spec: STORIES_GAMETRACKER_FIXES.md GT-016
- Code Location: EnhancedInteractiveField.tsx
- Spec Says: Visual throw path lines drawn between fielders as sequence is built, with animation and order badges (1,2,3)
- Code Says: Sequence badges exist but no throw-path line rendering found. No GT-016 fix comment in code
- Recommended Fix: Add SVG line/path between fielders in throw sequence
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B12-003
- Severity: GAP
- Batch: 12
- Spec: STORIES_GAMETRACKER_FIXES.md GT-017
- Code Location: EnhancedInteractiveField.tsx:1319
- Spec Says: Undo button prominently placed with clear undo count indicator
- Code Says: Undo button exists (line 1319) but no prominence enhancement or count indicator found. No GT-017 fix comment
- Recommended Fix: Enhance undo button visibility and add count badge
- My Triage: FEATURE BUILD
- Triage Reason: Missing UI component/screen
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B12-009
- Severity: GAP
- Batch: 12
- Spec: STORIES_LEAGUE_BUILDER.md LB-015
- Code Location: LeagueBuilder.tsx
- Spec Says: League structure tree view with drag-drop team reassignment between divisions
- Code Says: No tree view visualization or drag-drop reassignment found
- Recommended Fix: Implement league structure tree view
- My Triage: FEATURE BUILD
- Triage Reason: Missing UI component/screen
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B12-010
- Severity: GAP
- Batch: 12
- Spec: STORIES_LEAGUE_BUILDER.md LB-025,037
- Code Location: LeagueBuilder.tsx
- Spec Says: CSV import for teams and players with preview, validation, error highlighting
- Code Says: No file upload or CSV import functionality found for either teams or players
- Recommended Fix: Implement CSV import for teams and players modules
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B12-011
- Severity: GAP
- Batch: 12
- Spec: STORIES_LEAGUE_BUILDER.md LB-036
- Code Location: LeagueBuilderPlayers.tsx
- Spec Says: Generate fictional players: count, target grade, position distribution, age range, traits
- Code Says: No "Generate Players" button or configuration modal found
- Recommended Fix: Implement player generation using GRADE_ALGORITHM reverse algorithm
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B12-012
- Severity: GAP
- Batch: 12
- Spec: STORIES_LEAGUE_BUILDER.md LB-054,055
- Code Location: LeagueBuilderRosters.tsx
- Spec Says: Depth chart UI and bench preferences (pinch hit/run/defensive sub priority lists)
- Code Says: Data fields exist in TeamRoster interface (depthChart, pinchHitOrder, etc.) but no UI to configure them
- Recommended Fix: Build depth chart and bench preferences UI screens
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B12-013
- Severity: GAP
- Batch: 12
- Spec: STORIES_LEAGUE_BUILDER.md LB-064,065,066
- Code Location: LeagueBuilderDraft.tsx
- Spec Says: Draft results recap, undo/redo picks, draft trade
- Code Says: Draft board and generation work but results view, pick undo, and draft trade are missing
- Recommended Fix: Implement draft results, undo stack, and pick trading
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B12-014
- Severity: GAP
- Batch: 12
- Spec: STORIES_LEAGUE_BUILDER.md SS-020-025
- Code Location: N/A (not implemented)
- Spec Says: Standalone Playoff Mode: entry point on main menu, abbreviated setup wizard (5 steps), seeding UI
- Code Says: No playoff mode route, setup wizard, or standalone playoff entry exists. /world-series is results view only
- Recommended Fix: Implement playoff mode entry and setup wizard
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B12-015
- Severity: GAP
- Batch: 12
- Spec: STORIES_PLAYOFFS.md S-PLY002
- Code Location: WorldSeries.tsx
- Spec Says: Playoff qualification: division winners auto-qualify, wildcards by best records, tiebreakers (H2H→div record→run diff)
- Code Says: Zero qualification logic. PlayoffTeam interface exists in playoffStorage but no qualification algorithm
- Recommended Fix: Implement playoff qualification with tiebreakers
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B12-016
- Severity: GAP
- Batch: 12
- Spec: STORIES_PLAYOFFS.md S-PLY006
- Code Location: WorldSeries.tsx
- Spec Says: Home field advantage: 2-3-2 (7-game), 2-2-1 (5-game), 2-1 (3-game) patterns
- Code Says: Zero home field logic. No getHomeTeam() function, no pattern configuration
- Recommended Fix: Implement home field patterns per spec
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B12-017
- Severity: GAP
- Batch: 12
- Spec: STORIES_PLAYOFFS.md S-PLY007
- Code Location: WorldSeries.tsx
- Spec Says: Start playoff game from bracket/series view, launches GameTracker with playoff context
- Code Says: No "Start Game" button. BracketView shows matchups but can't launch GameTracker for playoff games
- Recommended Fix: Wire Start Game button to GameTracker with playoff context
- My Triage: FEATURE BUILD
- Triage Reason: Missing UI component/screen
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B12-018
- Severity: GAP
- Batch: 12
- Spec: STORIES_PLAYOFFS.md S-PLY008
- Code Location: WorldSeries.tsx, playoffStorage.ts
- Spec Says: Clinch/elimination detection: visual indicators, clutch multiplier bonuses applied
- Code Says: Zero implementation. isClinch/isElimination fields exist in SeriesState but never calculated
- Recommended Fix: Implement detectClinch() and detectElimination() per spec
- My Triage: FEATURE BUILD
- Triage Reason: Missing engine/calculation logic
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B12-019
- Severity: GAP
- Batch: 12
- Spec: STORIES_PLAYOFFS.md S-PLY011
- Code Location: WorldSeries.tsx
- Spec Says: Series detail view: game-by-game results, pitchers, series leaders, upcoming game info
- Code Says: No series drill-down view. BracketView shows cards but no detailed series view
- Recommended Fix: Implement SeriesDetailView component
- My Triage: FEATURE BUILD
- Triage Reason: Missing UI component/screen
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B12-020
- Severity: GAP
- Batch: 12
- Spec: STORIES_PLAYOFFS.md S-PLY014,015,016,017,018
- Code Location: WorldSeries.tsx
- Spec Says: Playoff stats tracking, roster management, exhibition series, records, season end transition
- Code Says: Zero implementation for all 5 stories. playoffStorage has PlayoffPlayerStats interface but no aggregation
- Recommended Fix: Implement playoff stats pipeline, roster management, exhibition mode, records tracking, and season transition
- My Triage: FEATURE BUILD
- Triage Reason: Missing engine/calculation logic
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B12-021
- Severity: GAP
- Batch: 12
- Spec: STORIES_RATINGS_ADJUSTMENT.md S-EOS002
- Code Location: RatingsAdjustmentFlow.tsx:168
- Spec Says: Position detection using scalable thresholds: SP/RP/CP from starts/relief/saves, UTIL/BENCH from games
- Code Says: No detection logic — `detectedPosition: player.position` copies as-is. No threshold application
- Recommended Fix: Implement detectPosition() per EOS_RATINGS_ADJUSTMENT_SPEC.md
- My Triage: FEATURE BUILD
- Triage Reason: Missing engine/calculation logic
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B12-022
- Severity: GAP
- Batch: 12
- Spec: STORIES_RATINGS_ADJUSTMENT.md S-EOS003
- Code Location: RatingsAdjustmentFlow.tsx
- Spec Says: Peer pool assignment: min 6 players, merge small pools (CP↔RP, 1B↔3B, etc.)
- Code Says: Zero peer pool logic. All players displayed by team, not by position group
- Recommended Fix: Implement getComparisonPool() with merge logic
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B12-023
- Severity: GAP
- Batch: 12
- Spec: STORIES_RATINGS_ADJUSTMENT.md S-EOS004-005
- Code Location: RatingsAdjustmentFlow.tsx:172-181
- Spec Says: WAR/salary percentile calculation within peer pools
- Code Says: UI displays percentiles but values are `Math.floor(Math.random() * 100)` — mock random data
- Recommended Fix: Replace mock percentiles with real WAR/salary percentile calculations
- My Triage: FEATURE BUILD
- Triage Reason: Missing engine/calculation logic
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B12-024
- Severity: GAP
- Batch: 12
- Spec: STORIES_RATINGS_ADJUSTMENT.md S-EOS006
- Code Location: RatingsAdjustmentFlow.tsx:133
- Spec Says: Rating adjustment: delta = WAR percentile - salary percentile, asymmetric tier factors, WAR-to-rating mapping (bWAR→POW/CON, rWAR→SPD, fWAR→FLD/ARM, pWAR→VEL/JNK/ACC), ±10 cap
- Code Says: `netChange = Math.floor(Math.random() * 20) - 8` — random, not formula-based. No delta calculation, no factor application, no WAR-to-rating mapping
- Recommended Fix: Implement calculateRatingAdjustment() with asymmetric factors per spec
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B12-025
- Severity: GAP
- Batch: 12
- Spec: STORIES_RATINGS_ADJUSTMENT.md S-EOS010
- Code Location: RatingsAdjustmentFlow.tsx
- Spec Says: Salary adjustment System B: True Value from WAR, 50% gap adjustment, salary floor/ceiling by grade
- Code Says: salaryChange = netChange × 0.3 (arbitrary). No True Value calculation, no 50% gap formula, no floor/ceiling
- Recommended Fix: Implement calculateSalaryAdjustment() with True Value and grade-based bounds
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B13-002
- Severity: GAP
- Batch: 13
- Spec: STORIES_RETIREMENT.md S-RET007,009
- Code Location: RetirementFlow.tsx:781-797
- Spec Says: Jersey retirement with real career data (teams played for, WAR, seasons) persisted to IndexedDB
- Code Says: `teamsPlayedFor` hardcoded with fake stats ("8 seasons/32.1 WAR") for every player. No IndexedDB persistence
- Recommended Fix: Wire real career data; add retired numbers to franchise storage
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B13-004
- Severity: GAP
- Batch: 13
- Spec: STORIES_SEASON_END.md S-SEP004-006
- Code Location: N/A (not implemented)
- Spec Says: Postseason MVP: face-down card reveal from playoff WAR, selection with +10 rating bonus
- Code Says: Entirely absent — no MVP card reveal, no pWAR ranking, no rating bonus application
- Recommended Fix: Implement postseason MVP card reveal and rating bonus
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: (blank)
- Status: DUPLICATE

### GAP-B13-005
- Severity: GAP
- Batch: 13
- Spec: STORIES_SEASON_END.md S-SEP008-009
- Code Location: N/A (not implemented)
- Spec Says: Championship fame bonus (+1 Fame to roster), championship morale boost
- Code Says: No code to apply fame or morale bonuses to championship roster
- Recommended Fix: Implement championship fame and morale effects
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B13-006
- Severity: GAP
- Batch: 13
- Spec: STORIES_TRADE.md S-TRD018-021
- Code Location: TradeFlow.tsx
- Spec Says: Waiver Wire: claim screen + results screen with waiver order, claim priority, player selection
- Code Says: WaiverPlayer interface defined (line 76-83) but ZERO UI rendering — both screens entirely unimplemented
- Recommended Fix: Implement waiver wire claim and results screens
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B13-007
- Severity: GAP
- Batch: 13
- Spec: STORIES_TRADE.md S-TRD014-015
- Code Location: TradeFlow.tsx
- Spec Says: AI trade proposals: AI generates trade offers using WAR differential, position need, salary analysis
- Code Says: Single hardcoded mockAIProposals entry. No real AI trade generation or evaluation logic
- Recommended Fix: Implement AI trade proposal generation engine
- My Triage: FEATURE BUILD
- Triage Reason: Gap between spec and code needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B13-008
- Severity: GAP
- Batch: 13
- Spec: STORIES_TRADE.md S-TRD016-017
- Code Location: TradeFlow.tsx
- Spec Says: Three-way trades: validation logic, all three teams evaluate independently
- Code Says: Type defined but zero validation flow for three-team trades
- Recommended Fix: Implement three-way trade validation and evaluation
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B1-005
- Severity: MINOR
- Batch: 1
- Spec: FWAR_CALCULATION_SPEC.md §8
- Code Location: fwarCalculator.ts calculateErrorValue()
- Spec Says: Missed dive zero-penalty handler
- Code Says: (Not implemented)
- Recommended Fix: Code reduces penalty with 0.7× but spec says 0.0× for missed dives
- My Triage: FEATURE BUILD
- Triage Reason: Missing feature needs implementation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B1-006
- Severity: MINOR
- Batch: 1
- Spec: RWAR_CALCULATION_SPEC.md §5
- Code Location: rwarCalculator.ts calculateUBR()
- Spec Says: Granular tag-up tracking (2B→Home vs 3B→Home)
- Code Says: (Not implemented)
- Recommended Fix: Both get 0.45 so functionally same; just tracking granularity
- My Triage: FEATURE BUILD
- Triage Reason: Missing engine/calculation logic
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B2-001
- Severity: MINOR
- Batch: 2
- Spec: MASTER_BASEBALL_RULES_AND_LOGIC.md §7
- Code Location: useGameState.ts or new IFR detector
- Spec Says: Infield fly rule auto-detection logic (R1+R2 or loaded, <2 outs, fair fly)
- Code Says: (Not implemented)
- Recommended Fix: CURRENT_STATE says ✅ but only manual PO recording exists, no auto-detection/prompt
- My Triage: FEATURE BUILD
- Triage Reason: Missing engine/calculation logic
- Your Decision: SKIP
- Status: SKIP (Phase B)

### GAP-B2-011
- Severity: MINOR
- Batch: 2
- Spec: PITCHER_STATS_TRACKING_SPEC.md §6.2
- Code Location: useGameState.ts changePitcher
- Spec Says: leadWhenEntered + enteredInSaveSituation tracking during game
- Code Says: (Not implemented)
- Recommended Fix: No save-situation tracking at pitcher entry — needed for hold/BS detection
- My Triage: FEATURE BUILD
- Triage Reason: Missing engine/calculation logic
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B2-013
- Severity: MINOR
- Batch: 2
- Spec: PITCHER_STATS_TRACKING_SPEC.md §11.1
- Code Location: useGameState.ts PitcherGameStats interface
- Spec Says: basesReachedViaError field in per-game PitcherGameStats for perfect game detection
- Code Says: (Not implemented)
- Recommended Fix: Field not in useGameState's PitcherGameStats type (exists in aggregator's type)
- My Triage: FEATURE BUILD
- Triage Reason: Missing engine/calculation logic
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B3-013
- Severity: MINOR
- Batch: 3
- Spec: FIELDING_SYSTEM_SPEC.md §17
- Code Location: adaptiveLearningIntegration.ts:289-339
- Spec Says: Adaptive learning algorithm: updateInferenceProbabilities with n≥20 sample threshold, 70%/30% blend (historical/default)
- Code Says: (Not implemented)
- Recommended Fix: IMPLEMENTED in adaptiveLearningIntegration.ts with matching 70/30 blend and n≥20 threshold. However, spec says update is zone-based (type+direction) and code implements it as zone-based too — MATCH. But code stores in localStorage, spec doesn't specify storage location [USER NOTE: Align all fielding tracking with enhanced FieldCanvas, not legacy field zones]
- My Triage: FEATURE BUILD
- Triage Reason: Missing engine/calculation logic
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B3-014
- Severity: MINOR
- Batch: 3
- Spec: FIELDING_SYSTEM_SPEC.md §14
- Code Location: GameTracker UI or useGameState
- Spec Says: Infield fly rule auto-detection: when PO/FO + R1+R2 or loaded + <2 outs → prompt "IFR called?"
- Code Says: (Not implemented)
- Recommended Fix: game.ts FieldingData has infieldFlyRule boolean + ifrBallCaught field. Test file exists (infieldFlyRule.test.ts, 474 lines). But NO auto-detection/prompt wiring in GameTracker — user must manually set IFR flag
- My Triage: FEATURE BUILD
- Triage Reason: Missing engine/calculation logic
- Your Decision: SKIP
- Status: SKIP (Phase B)

### GAP-B3-015
- Severity: MINOR
- Batch: 3
- Spec: FIELDING_SYSTEM_SPEC.md §15
- Code Location: GameTracker UI or useGameState
- Spec Says: Ground rule double tracking: separate from regular 2B with fielderChasing, bounceLocation, wallSection for park factor analysis
- Code Says: (Not implemented)
- Recommended Fix: game.ts FieldingData has groundRuleDouble boolean but no fielderChasing/bounceLocation/wallSection fields. No UI toggle to mark 2B as ground rule
- My Triage: FEATURE BUILD
- Triage Reason: Missing engine/calculation logic
- Your Decision: SKIP
- Status: SKIP (Phase B)

### GAP-B3-016
- Severity: MINOR
- Batch: 3
- Spec: FIELDING_SYSTEM_SPEC.md §13
- Code Location: GameTracker UI
- Spec Says: Bad hop event tracking: toggle on any hit, with fielderAffected, expectedResult, actualResult, notes
- Code Says: (Not implemented)
- Recommended Fix: game.ts FieldingData has badHopEvent boolean but no badHopExpectedResult field (listed in spec §19 FieldingPlay but missing from FieldingData). No UI toggle
- My Triage: FEATURE BUILD
- Triage Reason: Missing engine/calculation logic
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B3-017
- Severity: MINOR
- Batch: 3
- Spec: FIELDING_SYSTEM_SPEC.md §13
- Code Location: GameTracker UI
- Spec Says: Failed HR robbery tracking: when HR + robberyAttempted + robberyFailed → -1 Fame
- Code Says: (Not implemented)
- Recommended Fix: game.ts FieldingData has robberyAttempted/robberyFailed booleans. StarPlaySubtypePopup.tsx exists. But no automated prompt "Was there an attempted robbery?" on HR result
- My Triage: FEATURE BUILD
- Triage Reason: Missing engine/calculation logic
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B3-024
- Severity: MINOR
- Batch: 3
- Spec: GAMETRACKER_DRAGDROP_SPEC.md §Undo
- Code Location: UndoSystem.tsx
- Spec Says: Undo button "Shows remaining undos: ↩ 3" with 5-step stack
- Code Says: (Not implemented)
- Recommended Fix: UndoSystem.tsx EXISTS with GameSnapshot type, maxSteps=5, toast notification. Component fully built but integration with GameTracker state unclear — need to verify it's wired in
- My Triage: FEATURE BUILD
- Triage Reason: Missing UI component/screen
- Your Decision: (blank)
- Status: DUPLICATE

### GAP-B4-002
- Severity: MINOR
- Batch: 4
- Spec: MOJO_FITNESS_SYSTEM_SPEC.md §6.1
- Code Location: useGameState.ts PA recording
- Spec Says: Mojo-at-each-PA tracking: spec §6.1 table says "Mojo at each PA" captured "Every plate appearance" in "Per-event record"
- Code Says: (Not implemented)
- Recommended Fix: PA events are recorded but Mojo state at time of PA is not stamped onto the event record. Cannot retrospectively analyze performance-by-Mojo
- My Triage: FEATURE BUILD
- Triage Reason: Missing engine/calculation logic
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B4-003
- Severity: MINOR
- Batch: 4
- Spec: MOJO_FITNESS_SYSTEM_SPEC.md §7.1
- Code Location: FranchiseHome or TeamManagement page
- Spec Says: Team page Mojo/Fitness editor: between-game management screen with filter, dropdown editors per player, Apply Recovery / Simulate Rest Day / Reset All to Normal buttons
- Code Says: (Not implemented)
- Recommended Fix: No between-game Mojo/Fitness management UI. In-game tracking exists in GameTracker but no between-game editor for team-wide updates
- My Triage: FEATURE BUILD
- Triage Reason: Missing UI component/screen
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B4-004
- Severity: MINOR
- Batch: 4
- Spec: MOJO_FITNESS_SYSTEM_SPEC.md §9.3
- Code Location: PlayerCard component
- Spec Says: Combined player card UI showing Mojo bar + Fitness badge + Juiced warning + stat lines
- Code Says: (Not implemented)
- Recommended Fix: PlayerCard.tsx imports MojoLevel/FitnessState and MOJO_STATES/FITNESS_STATES. Some display exists but not the full combined card layout from spec §9.3 with bars, badges, and Juiced warning inline
- My Triage: FEATURE BUILD
- Triage Reason: Missing UI component/screen
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B10-007
- Severity: MINOR
- Batch: 10
- Spec: KBL_XHD_TRACKER_MASTER_SPEC_v3.md §19
- Code Location: Player/Team models
- Spec Says: Legacy status tracking: CORNERSTONE, FRANCHISE_ICON, LEGEND statuses. Dynasty tracking: CONTENDER, MINI_DYNASTY, DYNASTY. Team history with per-team WAR accumulation
- Code Says: (Not implemented)
- Recommended Fix: Partial — TeamMVP/cornerstone exist but no legacy status levels or dynasty detection
- My Triage: FEATURE BUILD
- Triage Reason: Missing engine/calculation logic
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B10-008
- Severity: MINOR
- Batch: 10
- Spec: KBL_XHD_TRACKER_MASTER_SPEC_v3.md §26
- Code Location: New calendarEngine.ts
- Spec Says: Fictional Calendar system: SEASON_CALENDAR const, getGameDate() mapping game# to calendar date, special dates (Opening Day, Trade Deadline, etc.)
- Code Says: (Not implemented)
- Recommended Fix: Zero implementation. Games use game numbers only, no fictional dates
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B10-009
- Severity: MINOR
- Batch: 10
- Spec: KBL_XHD_TRACKER_MASTER_SPEC_v3.md §26
- Code Location: narrativeEngine or new headlineEngine.ts
- Spec Says: Headlines Generator: HEADLINE_TEMPLATES (3 categories: PREGAME, POSTGAME, SEASON), generatePregameHeadlines(), generatePostgameHeadline() with priority ordering
- Code Says: (Not implemented)
- Recommended Fix: narrativeEngine has generateNarrative() for game recaps but NOT the pre/post-game headline template system described in master spec
- My Triage: FEATURE BUILD
- Triage Reason: Entire feature system not yet built — large scope
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B1-003
- Severity: MINOR
- Batch: 1
- Spec: BWAR_CALCULATION_SPEC.md §6
- Code Location: bwarCalculator.ts calculateBWAR()
- Spec Says: Multi-league adjustment
- Code Says: (Not implemented)
- Recommended Fix: Placeholder exists, intentionally unused (single-league)
- My Triage: DEFER
- Triage Reason: Minor gap — low priority
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B1-007
- Severity: MINOR
- Batch: 1
- Spec: RWAR_CALCULATION_SPEC.md §8
- Code Location: rwarCalculator.ts types
- Spec Says: RunnerAdvancement detailed schema
- Code Says: (Not implemented)
- Recommended Fix: Spec'd richer schema, code uses simpler approach
- My Triage: DEFER
- Triage Reason: Minor gap — low priority
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B1-001
- Severity: MINOR
- Batch: 1
- Spec: BWAR_CALCULATION_SPEC.md §6
- Code Location: bwarCalculator.ts:234
- Spec Says: League adjustment for multi-league setups: `applyLeagueAdjustment(battingRuns, playerLeagueRunsPerPA, overallLeagueRunsPerPA, PA)`
- Code Says: `leagueAdjustment = 0` placeholder — single-league by design
- Recommended Fix: Doc-only: note as intentional single-league simplification
- My Triage: DEFER
- Triage Reason: Minor cosmetic/documentation issue
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B1-002
- Severity: MINOR
- Batch: 1
- Spec: PWAR_CALCULATION_SPEC.md §9
- Code Location: pwarCalculator.ts:431
- Spec Says: Calibration min IP = 500 league-wide, dynamic weight = min(0.4, totalIP/2000)
- Code Says: Code uses min IP = 100, fixed blendWeight = 0.3 param
- Recommended Fix: Update minimum to 500 and add dynamic weight calc
- My Triage: DEFER
- Triage Reason: Minor cosmetic/documentation issue
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B1-003
- Severity: MINOR
- Batch: 1
- Spec: PWAR_CALCULATION_SPEC.md §9
- Code Location: pwarCalculator.ts:455
- Spec Says: Confidence starts at 0.3, increases by dataWeight×0.5
- Code Says: Code increases by blendWeight×0.2, starts at 1.0 for default context
- Recommended Fix: Align confidence increment formula
- My Triage: DEFER
- Triage Reason: Minor cosmetic/documentation issue
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B1-004
- Severity: MINOR
- Batch: 1
- Spec: FWAR_CALCULATION_SPEC.md §8
- Code Location: fwarCalculator.ts:283
- Spec Says: Missed dive (good effort) = 0.0x penalty (no fWAR impact)
- Code Says: Code applies wasDifficult=0.7× modifier but doesn't zero out for missed dives
- Recommended Fix: Add missed_dive handling with 0.0 penalty per spec
- My Triage: DEFER
- Triage Reason: Minor cosmetic/documentation issue
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B2-002
- Severity: MINOR
- Batch: 2
- Spec: RUNNER_ADVANCEMENT_RULES.md §5
- Code Location: runnerDefaults.ts
- Spec Says: WildPitchEvent interface with per-runner outcomes + calculateWildPitchDefaults()
- Code Says: (Not implemented)
- Recommended Fix: WP/PB advancement handled by manual runner movement modal, no pre-calculated defaults
- My Triage: DEFER
- Triage Reason: Minor gap — low priority
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B2-005
- Severity: MINOR
- Batch: 2
- Spec: INHERITED_RUNNERS_SPEC.md §6.1
- Code Location: PitcherGameStats in useGameState.ts
- Spec Says: leverageIndexAtEntry + scoreDifferentialAtEntry fields in PitcherAppearance
- Code Says: (Not implemented)
- Recommended Fix: Stats don't capture LI or score diff at pitcher entry — needed for reliever evaluation context
- My Triage: DEFER
- Triage Reason: Minor gap — low priority
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B2-006
- Severity: MINOR
- Batch: 2
- Spec: PITCH_COUNT_TRACKING_SPEC.md §4.1
- Code Location: PitcherGameStats in useGameState.ts
- Spec Says: pitchesByInning per-inning breakdown (store both cumulative AND per-inning)
- Code Says: (Not implemented)
- Recommended Fix: Only cumulative pitchCount stored — no per-inning breakdown for pitch count analysis
- My Triage: DEFER
- Triage Reason: Minor gap — low priority
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B2-007
- Severity: MINOR
- Batch: 2
- Spec: PITCH_COUNT_TRACKING_SPEC.md §6.2
- Code Location: New utility or useGameState.ts
- Spec Says: PITCHES_PER_BATTER_ESTIMATE constants + estimatePitchCount() function
- Code Says: (Not implemented)
- Recommended Fix: No pitch count estimation system — starter=3.9, K=5.5, walk=5.8, etc. not implemented
- My Triage: DEFER
- Triage Reason: Minor gap — low priority
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B2-008
- Severity: MINOR
- Batch: 2
- Spec: PITCH_COUNT_TRACKING_SPEC.md §5.4
- Code Location: GameTracker.tsx or useGameState.ts
- Spec Says: High pitch count alert at 100+ pitches with confirm/correct prompt
- Code Says: (Not implemented)
- Recommended Fix: No automatic alert when pitcher exceeds 100 pitches — user must manually track
- My Triage: DEFER
- Triage Reason: Minor gap — low priority
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B2-010
- Severity: MINOR
- Batch: 2
- Spec: PITCHER_STATS_TRACKING_SPEC.md §11.1
- Code Location: PitcherGameStats in useGameState.ts
- Spec Says: Per-game achievement booleans (qualityStart, completeGame, shutout, noHitter, perfectGame, maddux, immaculateInnings[])
- Code Says: (Not implemented)
- Recommended Fix: Achievements computed in aggregators/fame detection but not stored on per-game PitcherGameStats type
- My Triage: DEFER
- Triage Reason: Minor gap — low priority
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B2-012
- Severity: MINOR
- Batch: 2
- Spec: PITCHER_STATS_TRACKING_SPEC.md §8.2
- Code Location: seasonAggregator.ts:198, GameTracker.tsx:1868
- Spec Says: Complete game scales with game length (outsRecorded === game.totalOuts)
- Code Says: (Not implemented)
- Recommended Fix: Hardcoded to 27 outs (9-inning games) — doesn't scale for 6/7-inning games
- My Triage: DEFER
- Triage Reason: Minor gap — low priority
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B2-002
- Severity: MINOR
- Batch: 2
- Spec: INHERITED_RUNNERS_SPEC.md §9.1
- Code Location: inheritedRunnerTracker.ts:330
- Spec Says: Multiple pitching changes: runners trace back to original pitcher (inheritedFrom shows chain A→B→C)
- Code Says: handlePitchingChange overwrites inheritedFromPitcherId to latest outgoing on every call — loses chain history (A→B overwrites A)
- Recommended Fix: Only set inheritedFromPitcherId if not already set: `inheritedFromPitcherId: runner.inheritedFromPitcherId ?? outgoingPitcherId`
- My Triage: DEFER
- Triage Reason: Minor cosmetic/documentation issue
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B2-003
- Severity: MINOR
- Batch: 2
- Spec: PITCHER_STATS_TRACKING_SPEC.md §9.1
- Code Location: GameTracker.tsx:1876
- Spec Says: Maddux threshold: < ceil(9 × 9.44) = 85 pitches for 9-inning game
- Code Says: Code: `pStats.pitchCount < 100` — too lenient (95-pitch CGSO would qualify as Maddux)
- Recommended Fix: Change threshold to 85 or implement getMadduxThreshold(innings) per spec
- My Triage: DEFER
- Triage Reason: Minor cosmetic/documentation issue
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B3-002
- Severity: MINOR
- Batch: 3
- Spec: CLUTCH_ATTRIBUTION_SPEC.md §8
- Code Location: clutchCalculator.ts
- Spec Says: D3K (Dropped Third Strike) attribution: runner_safe gives batter +0.3, pitcher +0.7, catcher -0.5; runner_out gives batter -1.0, pitcher +1.0, catcher -0.1
- Code Says: (Not implemented)
- Recommended Fix: No getD3KAttribution() function. D3K mapped to strikeout_swinging in useClutchCalculations hook (line 111) — catcher gets no blame for the drop
- My Triage: DEFER
- Triage Reason: Minor gap — low priority
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B3-003
- Severity: MINOR
- Batch: 3
- Spec: CLUTCH_ATTRIBUTION_SPEC.md §8
- Code Location: clutchCalculator.ts
- Spec Says: 3 Pickoff Attempts Rule attribution: runner +0.2, pitcher -0.3 when 3rd pickoff forces advance
- Code Says: (Not implemented)
- Recommended Fix: No THREE_PICKOFF_RULE handling. Pickoff events exist (pickoff_pitcher, pickoff_catcher) but no 3-attempt auto-advance tracking
- My Triage: DEFER
- Triage Reason: Minor gap — low priority
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B3-004
- Severity: MINOR
- Batch: 3
- Spec: CLUTCH_ATTRIBUTION_SPEC.md §4.6
- Code Location: clutchCalculator.ts getRunnerBaseValue
- Spec Says: Baserunning attributions: TOOTBLAN=-1.2, extra base taken=+0.7, thrown out advancing=-0.8, tag-up scores=+0.4
- Code Says: (Not implemented)
- Recommended Fix: Only SB(+1.0), CS(-1.0), pickoff(-0.8) implemented. Missing: TOOTBLAN, extra base taken, thrown out advancing, tag-up scores
- My Triage: DEFER
- Triage Reason: Minor gap — low priority
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B3-006
- Severity: MINOR
- Batch: 3
- Spec: CLUTCH_ATTRIBUTION_SPEC.md §3
- Code Location: clutchCalculator.ts or fieldZoneInput module
- Spec Says: Zone-based depth integration: getContactQualityFromZoneTap() linking field zone tap to CQ
- Code Says: (Not implemented)
- Recommended Fix: No getContactQualityFromZoneTap(), getCQTrajectoryFromZone(), or getDepthFromZone() functions anywhere in codebase
- My Triage: DEFER
- Triage Reason: Minor gap — low priority
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B3-007
- Severity: MINOR
- Batch: 3
- Spec: CLUTCH_ATTRIBUTION_SPEC.md §12
- Code Location: clutchCalculator.ts
- Spec Says: ManagerDecision record interface: decisionId, gameId, managerId, decisionType, leverageIndex, inferred boolean, outcome, clutchImpact
- Code Says: (Not implemented)
- Recommended Fix: No ManagerDecision interface. Manager attribution is part of PlayAttribution but not stored as separate decision records
- My Triage: DEFER
- Triage Reason: Minor gap — low priority
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B3-008
- Severity: MINOR
- Batch: 3
- Spec: LEVERAGE_INDEX_SPEC.md §11
- Code Location: eventLog.ts or gameStorage
- Spec Says: PlateAppearanceContext interface with leverageIndex and clutchValue/chokeValue per PA — spec requires LI to be stored per plate appearance
- Code Says: (Not implemented)
- Recommended Fix: LI is calculated at use-time but not persisted per PA for historical analysis
- My Triage: DEFER
- Triage Reason: Minor gap — low priority
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B3-012
- Severity: MINOR
- Batch: 3
- Spec: FIELDING_SYSTEM_SPEC.md §19
- Code Location: fieldingStatsAggregator.ts PlayerFieldingProfile
- Spec Says: PlayerFieldingStats aggregated interface: 40+ stat fields per position including doublePlaysStarted/Turned/Completed, star play counts (diving/leaping/wall/running/sliding/overShoulder), outfieldAssistsToSecond/Third/Home, errorBreakdown (fielding/throwing/mental), catcher-specific (strikeoutPutouts, passedBalls)
- Code Says: (Not implemented)
- Recommended Fix: fieldingStatsAggregator has simplified PlayerFieldingProfile with gamesPlayed, innings, putouts, assists, errors, totalChances, fieldingPct. Missing all star play counts, DP role breakdown, error type breakdown, OFA target breakdown, catcher-specific stats
- My Triage: DEFER
- Triage Reason: Minor gap — low priority
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B3-018
- Severity: MINOR
- Batch: 3
- Spec: FIELDING_SYSTEM_SPEC.md §18
- Code Location: GameTracker.tsx
- Spec Says: Contextual UI: show toggles only when relevant (IFR→PO+runners+<2outs, GRD→2B, BadHop→hit, Nutshot→Center+BIP, Robbery→HR)
- Code Says: (Not implemented)
- Recommended Fix: No contextual toggle system — fielding data fields exist but no conditional UI rendering based on play context
- My Triage: DEFER
- Triage Reason: Minor gap — low priority
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B3-019
- Severity: MINOR
- Batch: 3
- Spec: FIELDING_SYSTEM_SPEC.md §6
- Code Location: GameTracker.tsx D3K flow
- Spec Says: D3K field handler selection: "Who fielded?" → [Catcher] [Pitcher] [3B] with Catcher default
- Code Says: (Not implemented)
- Recommended Fix: D3K outcome tracking (OUT/WP/PB/E_CATCHER/E_1B) exists in game.ts but no "who fielded?" selector for the D3K scenario — always assumes Catcher
- My Triage: DEFER
- Triage Reason: Minor gap — low priority
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B3-020
- Severity: MINOR
- Batch: 3
- Spec: GAMETRACKER_DRAGDROP_SPEC.md §Pattern 2
- Code Location: EnhancedInteractiveField.tsx
- Spec Says: Batter drag past fence (y>1.0) for HR entry: spec says "Drag batter beyond the wall" triggers HR recording
- Code Says: (Not implemented)
- Recommended Fix: HR button method exists; batter drag-to-stands HR entry exists (drag batter to stands area). IMPLEMENTED — verified batter drag to stands records HR
- My Triage: DEFER
- Triage Reason: Minor gap — low priority
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B3-021
- Severity: MINOR
- Batch: 3
- Spec: GAMETRACKER_DRAGDROP_SPEC.md §Pattern 9
- Code Location: EnhancedInteractiveField.tsx
- Spec Says: Error entry via long-press/double-tap fielder to enter error mode
- Code Says: (Not implemented)
- Recommended Fix: FielderIcon has isErrorMode prop but no long-press gesture to trigger it. Error entry handled through play classifier result rather than fielder interaction
- My Triage: DEFER
- Triage Reason: Minor gap — low priority
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B3-022
- Severity: MINOR
- Batch: 3
- Spec: GAMETRACKER_DRAGDROP_SPEC.md §Pattern 2
- Code Location: EnhancedInteractiveField.tsx or GameTracker.tsx
- Spec Says: HR distance text input: "Distance (ft)?" after HR entry
- Code Says: (Not implemented)
- Recommended Fix: HR distance tracking mentioned in spec but no distance input UI component found. SMB4 shows exact feet, not captured
- My Triage: DEFER
- Triage Reason: Minor gap — low priority
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B3-023
- Severity: MINOR
- Batch: 3
- Spec: GAMETRACKER_DRAGDROP_SPEC.md §Substitution
- Code Location: GameTracker.tsx substitution flow
- Spec Says: Double switch: make pitching change + drag bench player to lineup slot in single combined move
- Code Says: (Not implemented)
- Recommended Fix: Pitching change and position player subs are separate flows. No combined double-switch UX as described in spec
- My Triage: DEFER
- Triage Reason: Minor gap — low priority
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B3-028
- Severity: MINOR
- Batch: 3
- Spec: FIELD_ZONE_INPUT_SPEC.md §9.4
- Code Location: useGameState.ts or FieldingModal integration
- Spec Says: recordBattedBall() integration: combines zone data + CQ from zone + spray point + fielder into play data record
- Code Says: (Not implemented)
- Recommended Fix: FieldingModal handleZoneSelect maps zone depth to FieldingModal DepthType but does NOT call getContactQualityFromZone() or generateSprayPoint() — only partial integration
- My Triage: DEFER
- Triage Reason: Minor gap — low priority
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B3-001
- Severity: MINOR
- Batch: 3
- Spec: CLUTCH_ATTRIBUTION_SPEC.md §4.2
- Code Location: clutchCalculator.ts getPitcherBaseValue:534-535
- Spec Says: Spec §4.2: Routine fly/ground out for pitcher = +0.4×CQ (same value for both). Popup = +0.5×LI
- Code Says: Code: fly/ground/popup all return `{base: 0.4}` — Popup should be 0.5 per spec
- Recommended Fix: Change popup_out pitcher base to 0.5
- My Triage: DEFER
- Triage Reason: Minor cosmetic/documentation issue
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B3-002
- Severity: MINOR
- Batch: 3
- Spec: CLUTCH_ATTRIBUTION_SPEC.md §4.2
- Code Location: clutchCalculator.ts getPitcherBaseValue:534
- Spec Says: Spec §4.2: Ground out for pitcher = +0.5×CQ×LI
- Code Says: Code: ground_out returns same as fly_out `{base: 0.4}` — spec says 0.5 for ground_out
- Recommended Fix: Change ground_out pitcher base to 0.5
- My Triage: DEFER
- Triage Reason: Minor cosmetic/documentation issue
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B3-003
- Severity: MINOR
- Batch: 3
- Spec: CLUTCH_ATTRIBUTION_SPEC.md §4.6
- Code Location: clutchCalculator.ts getPitcherBaseValue:556-558
- Spec Says: Spec §4.8: Wild pitch runner advances = -0.6×LI, run scores = -0.8×LI
- Code Says: Code: wild_pitch flat -0.7 regardless of whether run scored or runner just advanced
- Recommended Fix: Split WP into WP_advance (-0.6) and WP_scores (-0.8) or keep as minor averaging
- My Triage: DEFER
- Triage Reason: Minor cosmetic/documentation issue
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B3-005
- Severity: MINOR
- Batch: 3
- Spec: LEVERAGE_INDEX_SPEC.md §6
- Code Location: leverageCalculator.ts getScoreDampener:269-271
- Spec Says: Spec §6: 3-run game dampener "scale from 0.60 (early) to 0.72 (late)" — comment says early = lower LI for deficit
- Code Says: Code comment says "Early inning = more comeback potential = higher leverage" and "Late inning = less comeback potential = lower leverage" — but formula produces HIGHER values later (0.60 + 0.12×inning/9), meaning late-inning 3-run games get MORE leverage. This is backwards from the comment but matches the SPEC formula exactly
- Recommended Fix: Fix comment to match behavior: early deficit = less urgent (0.60), late deficit = more urgent (0.72)
- My Triage: DEFER
- Triage Reason: Minor cosmetic/documentation issue
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B3-008
- Severity: MINOR
- Batch: 3
- Spec: FIELDING_SYSTEM_SPEC.md §4
- Code Location: fielderInference.ts:77-83
- Spec Says: Spec §4 Line Drive: LC="SS, LF/CF (hard to field)" with secondary as LF/CF
- Code Says: Code: LINE_DRIVE_INFERENCE['Left-Center']={primary:'SS', secondary:'CF'} — only CF, no LF as tertiary
- Recommended Fix: Add LF as tertiary for Left-Center line drives
- My Triage: DEFER
- Triage Reason: Minor cosmetic/documentation issue
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B3-009
- Severity: MINOR
- Batch: 3
- Spec: GAMETRACKER_DRAGDROP_SPEC.md §Fame
- Code Location: EnhancedInteractiveField.tsx:3607-3608
- Spec Says: Spec: ROBBERY=+1.5 Fame, WEB_GEM=+1.0 Fame
- Code Says: Code: ROBBERY=1.0 baseFame, WEB_GEM=0.75 baseFame (per SPECIAL_EVENTS_SPEC.md v3.3 CRIT-06 fix). DragDrop spec is outdated vs implementation
- Recommended Fix: Update GAMETRACKER_DRAGDROP_SPEC.md Fame values to match SPECIAL_EVENTS_SPEC.md v3.3
- My Triage: DEFER
- Triage Reason: Minor cosmetic/documentation issue
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### GAP-B4-011
- Severity: MINOR
- Batch: 4
- Spec: GRADE_ALGORITHM_SPEC.md §Prospect Generation
- Code Location: gradeEngine.ts or draftEngine.ts
- Spec Says: PROSPECT_TRAIT_POOL (12 positive traits) + generateProspectTraits(grade) with grade-based trait chance (B:40%, B-:30%, others:20%)
- Code Says: (Not implemented)
- Recommended Fix: No trait generation for prospects. DraftFlow.tsx has personality field but not traits from the PROSPECT_TRAIT_POOL
- My Triage: DEFER
- Triage Reason: Minor gap — low priority
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B4-001
- Severity: MINOR
- Batch: 4
- Spec: FAME_SYSTEM_TRACKING.md §Infrastructure
- Code Location: gameStorage.ts:143 fameEvents
- Spec Says: Tracking doc says "Fame persistence: Lost on page refresh"
- Code Says: Code: fameEvents saved to IndexedDB in PersistedGameState (gameStorage.ts:143). maxDeficitAway/Home also persisted (line 174-175). Fame IS persisted
- Recommended Fix: Update tracking doc: mark persistence as ✅ COMPLETE
- My Triage: DEFER
- Triage Reason: Minor cosmetic/documentation issue
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B4-002
- Severity: MINOR
- Batch: 4
- Spec: FAME_SYSTEM_TRACKING.md §INC-004
- Code Location: GameTracker/index.tsx:~1498
- Spec Says: INC-004: "winner={null} hardcoded" in EndGameFameSummary
- Code Says: Tracking doc claims winner prop not set — need user to verify if still null in Figma GameTracker
- Recommended Fix: Verify and wire winner prop from game state
- My Triage: DEFER
- Triage Reason: Minor cosmetic/documentation issue
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B10-004
- Severity: MINOR
- Batch: 10
- Spec: STAT_TRACKING_ARCHITECTURE_SPEC.md
- Code Location: seasonStorage.ts:156
- Spec Says: Spec references SMB4 game
- Code Says: seasonStorage has `balks: number` field — SMB4 has no balks per SMB4_GAME_MECHANICS.md
- Recommended Fix: Remove balks field from PlayerSeasonPitching
- My Triage: DEFER
- Triage Reason: Minor cosmetic/documentation issue
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B10-005
- Severity: MINOR
- Batch: 10
- Spec: KBL_XHD_TRACKER_MASTER_SPEC_v3.md §16
- Code Location: N/A
- Spec Says: Grade history tracking: player.gradeHistory = [{grade, startGame, endGame}]
- Code Says: No grade history tracking exists — grades are stored as current value only
- Recommended Fix: Add gradeHistory array to player model (low priority — enhancement)
- My Triage: DEFER
- Triage Reason: Minor cosmetic/documentation issue
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B1-005
- Severity: MINOR
- Batch: 1
- Spec: RWAR_CALCULATION_SPEC.md §5
- Code Location: rwarCalculator.ts:239
- Spec Says: Separate tag-up events: secondToHome_onFlyOut (0.45) vs thirdToHome_onFlyOut (0.45)
- Code Says: Code uses single `tagsScored` for all tag-ups (same value 0.45)
- Recommended Fix: Document simplification or add granularity
- My Triage: DOC ONLY
- Triage Reason: Spec needs updating to match code behavior
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B1-008
- Severity: MINOR
- Batch: 1
- Spec: MWAR_CALCULATION_SPEC.md §5
- Code Location: mwarCalculator.ts:217
- Spec Says: IBB failure: hit = -0.4×√LI (or -0.5×√LI - runs×0.2 if runs score), walk = -0.3×√LI (tiered)
- Code Says: Single flat value: failure = -0.5
- Recommended Fix: Add tiered IBB failure with runs-scored penalty or document simplification
- My Triage: DOC ONLY
- Triage Reason: Spec needs updating to match code behavior
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B2-004
- Severity: MINOR
- Batch: 2
- Spec: PITCHER_STATS_TRACKING_SPEC.md §5.3
- Code Location: useGameState.ts:722-733
- Spec Says: Loss assigned to "pitcher who allowed go-ahead run" (pitcher of record when lead was taken)
- Code Says: Code uses simplified "highest runsAllowed on losing team" approximation
- Recommended Fix: Document as intentional simplification or implement lead-tracking for true POR
- My Triage: DOC ONLY
- Triage Reason: Spec needs updating to match code behavior
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B3-010
- Severity: MINOR
- Batch: 3
- Spec: FIELD_ZONE_INPUT_SPEC.md §2.3
- Code Location: fieldZones.ts:94-199 ZONE_POLYGONS
- Spec Says: Spec polygon paths: Z00='M 50,75 L 55,70 L 55,60 L 45,60 L 45,70 Z'. Code polygon paths: Z00='M 44,72 L 50,66 L 56,72 L 56,60 L 50,54 L 44,60 Z' — different vertex coords
- Code Says: Both are valid SVG polygons covering the same conceptual zones, but code has refined geometry for better tessellation and gap coverage. All 25 zone polygons differ in coordinates
- Recommended Fix: Update spec polygon paths to match code's refined geometry, or document that code has refined polygons
- My Triage: DOC ONLY
- Triage Reason: Spec needs updating to match code behavior
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B3-011
- Severity: MINOR
- Batch: 3
- Spec: FIELD_ZONE_INPUT_SPEC.md §5.2
- Code Location: fieldZones.ts:205-236 ZONE_CENTERS
- Spec Says: Spec centers: Z00(50,67), Z01(70,75), Z04(30,75), F05(2,12), F06(50,98)
- Code Says: Code centers: Z00(50,63), Z01(64,64), Z04(36,64), F05(1,14), F06(50,92) — adjusted to match revised polygon geometry
- Recommended Fix: Update spec ZONE_CENTERS to match code values
- My Triage: DOC ONLY
- Triage Reason: Spec needs updating to match code behavior
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B3-012
- Severity: MINOR
- Batch: 3
- Spec: FIELD_ZONE_INPUT_SPEC.md §5.3
- Code Location: fieldZones.ts:482-487 QUICK_TAP_BUTTONS
- Spec Says: Spec: 6 buttons (foul_left, popup, foul_right, hr_left, hr_center, hr_right)
- Code Says: Code: 4 buttons (popup, hr_left, hr_center, hr_right) — foul_left and foul_right quick tap buttons removed since foul zones are directly tappable on field
- Recommended Fix: Update spec to match code's 4 buttons or restore foul quick taps
- My Triage: DOC ONLY
- Triage Reason: Spec needs updating to match code behavior
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B3-013
- Severity: MINOR
- Batch: 3
- Spec: FIELD_ZONE_INPUT_SPEC.md §9.1
- Code Location: FieldZoneInput.tsx:27-32 FieldZoneInputProps
- Spec Says: Spec: onFielderOverride as separate callback prop
- Code Says: Code: fielder passed as second arg to onZoneSelect(data, fielder) — no separate onFielderOverride callback. Simpler API
- Recommended Fix: Update spec props to match code's simplified onZoneSelect signature
- My Triage: DOC ONLY
- Triage Reason: Spec needs updating to match code behavior
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B4-003
- Severity: MINOR
- Batch: 4
- Spec: MOJO_FITNESS_SYSTEM_SPEC.md §3.1
- Code Location: fitnessEngine.ts:163-166 FITNESS_STATES['WELL']
- Spec Says: Spec §3.1: WELL value=80%
- Code Says: Code: WELL value=80, but getFitnessStateFromValue() (line 298-305) uses thresholds: JUICED≥110, FIT≥90, WELL≥70, STRAINED≥50, WEAK>0. These thresholds mean a value of 80 is WELL (70-89 range), while spec's stated values (JUICED=120, FIT=100, WELL=80, STRAINED=60, WEAK=40) suggest tighter boundaries. The ranges work but boundaries are WIDER than implied by spec values
- Recommended Fix: Document actual ranges in spec: JUICED(≥110), FIT(90-109), WELL(70-89), STRAINED(50-69), WEAK(1-49), HURT(0)
- My Triage: DOC ONLY
- Triage Reason: Spec needs updating to match code behavior
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B10-002
- Severity: MINOR
- Batch: 10
- Spec: STAT_TRACKING_ARCHITECTURE_SPEC.md §4.2
- Code Location: N/A
- Spec Says: Spec §4.2: IndexedDB schema includes dedicated fameEvents store
- Code Says: No dedicated fameEvents store; fame events stored inline in game state and event log AtBatEvent.fameEvents
- Recommended Fix: Update spec to reflect inline storage approach
- My Triage: DOC ONLY
- Triage Reason: Spec needs updating to match code behavior
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B10-003
- Severity: MINOR
- Batch: 10
- Spec: STAT_TRACKING_ARCHITECTURE_SPEC.md §5.5
- Code Location: careerStorage.ts
- Spec Says: Spec §5.5: Phase 5 (multi-season, career, export) marked PENDING
- Code Says: careerStorage.ts EXISTS with DB_VERSION=3 and career stores (batting/pitching/fielding/milestones) — spec is outdated
- Recommended Fix: Update spec: Phase 5 partially implemented (career storage exists)
- My Triage: DOC ONLY
- Triage Reason: Spec needs updating to match code behavior
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B1-001
- Severity: DOC_ONLY
- Batch: 1
- Spec: BWAR_CALCULATION_SPEC.md §6
- Code Location: bwarCalculator.ts:109-113
- Spec Says: (Not documented in any spec)
- Code Says: Switch hitter (S) park factor: averages L and R handedness factors
- Recommended Fix: Document in BWAR_CALCULATION_SPEC.md §6
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B1-002
- Severity: DOC_ONLY
- Batch: 1
- Spec: BWAR_CALCULATION_SPEC.md (new section)
- Code Location: bwarCalculator.ts:277-288
- Spec Says: (Not documented in any spec)
- Code Says: Batch bWAR calculation for multiple players
- Recommended Fix: Document in BWAR_CALCULATION_SPEC.md (new section)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B1-003
- Severity: DOC_ONLY
- Batch: 1
- Spec: BWAR_CALCULATION_SPEC.md (new appendix)
- Code Location: bwarCalculator.ts:371-389
- Spec Says: (Not documented in any spec)
- Code Says: Display helpers: formatWOBA, formatWAR, formatRuns
- Recommended Fix: Document in BWAR_CALCULATION_SPEC.md (new appendix)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B1-004
- Severity: DOC_ONLY
- Batch: 1
- Spec: BWAR_CALCULATION_SPEC.md §6
- Code Location: bwarCalculator.ts:228
- Spec Says: (Not documented in any spec)
- Code Says: Default homePA to 50% of PA when not tracked
- Recommended Fix: Document in BWAR_CALCULATION_SPEC.md §6
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B1-005
- Severity: DOC_ONLY
- Batch: 1
- Spec: PWAR_CALCULATION_SPEC.md §11
- Code Location: pwarCalculator.ts:244
- Spec Says: (Not documented in any spec)
- Code Says: Hold-rate based LI estimation (holdRate > 0.3 → 1.3) extends spec's saves-only approach
- Recommended Fix: Document in PWAR_CALCULATION_SPEC.md §11
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B1-006
- Severity: DOC_ONLY
- Batch: 1
- Spec: PWAR_CALCULATION_SPEC.md (new appendix)
- Code Location: pwarCalculator.ts:466-478
- Spec Says: (Not documented in any spec)
- Code Says: IP formatting/parsing (formatIP, parseIP)
- Recommended Fix: Document in PWAR_CALCULATION_SPEC.md (new appendix)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B1-007
- Severity: DOC_ONLY
- Batch: 1
- Spec: FWAR_CALCULATION_SPEC.md §7
- Code Location: fwarCalculator.ts:82
- Spec Says: (Not documented in any spec)
- Code Says: `charging` difficulty multiplier (1.3) not in spec
- Recommended Fix: Document in FWAR_CALCULATION_SPEC.md §7
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B1-008
- Severity: DOC_ONLY
- Batch: 1
- Spec: FWAR_CALCULATION_SPEC.md §8
- Code Location: fwarCalculator.ts:51
- Spec Says: (Not documented in any spec)
- Code Says: `missed_catch` error type (-0.18) not in spec
- Recommended Fix: Document in FWAR_CALCULATION_SPEC.md §8
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B1-009
- Severity: DOC_ONLY
- Batch: 1
- Spec: FWAR_CALCULATION_SPEC.md (new section)
- Code Location: fwarCalculator.ts:461-509
- Spec Says: (Not documented in any spec)
- Code Says: Simplified fWAR from counting stats (calculateFWARFromStats)
- Recommended Fix: Document in FWAR_CALCULATION_SPEC.md (new section)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B1-010
- Severity: DOC_ONLY
- Batch: 1
- Spec: FWAR_CALCULATION_SPEC.md (new section)
- Code Location: fwarCalculator.ts:556-665
- Spec Says: (Not documented in any spec)
- Code Says: Persistence adapter: maps eventLog.ts events → calculator events
- Recommended Fix: Document in FWAR_CALCULATION_SPEC.md (new section)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B1-011
- Severity: DOC_ONLY
- Batch: 1
- Spec: FWAR_CALCULATION_SPEC.md §6
- Code Location: fwarCalculator.ts:518-528
- Spec Says: (Not documented in any spec)
- Code Says: Position-adjusted fWAR tier classification (getFWARTier)
- Recommended Fix: Document in FWAR_CALCULATION_SPEC.md §6
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B1-012
- Severity: DOC_ONLY
- Batch: 1
- Spec: RWAR_CALCULATION_SPEC.md (new section)
- Code Location: rwarCalculator.ts:211-220
- Spec Says: (Not documented in any spec)
- Code Says: Simplified wSB without league stats (assumes lg avg = 0)
- Recommended Fix: Document in RWAR_CALCULATION_SPEC.md (new section)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B1-013
- Severity: DOC_ONLY
- Batch: 1
- Spec: RWAR_CALCULATION_SPEC.md (new section)
- Code Location: rwarCalculator.ts:308-314
- Spec Says: (Not documented in any spec)
- Code Says: Simplified wGDP using standard 12% GIDP rate
- Recommended Fix: Document in RWAR_CALCULATION_SPEC.md (new section)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B1-014
- Severity: DOC_ONLY
- Batch: 1
- Spec: RWAR_CALCULATION_SPEC.md §9
- Code Location: rwarCalculator.ts:404-425
- Spec Says: (Not documented in any spec)
- Code Says: Scalable default league stats generator (createDefaultLeagueStats)
- Recommended Fix: Document in RWAR_CALCULATION_SPEC.md §9
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B1-015
- Severity: DOC_ONLY
- Batch: 1
- Spec: RWAR_CALCULATION_SPEC.md §11
- Code Location: rwarCalculator.ts:434-441
- Spec Says: (Not documented in any spec)
- Code Says: rWAR quality tier classification (getRWARTier)
- Recommended Fix: Document in RWAR_CALCULATION_SPEC.md §11
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B1-016
- Severity: DOC_ONLY
- Batch: 1
- Spec: RWAR_CALCULATION_SPEC.md §4
- Code Location: rwarCalculator.ts:446-456
- Spec Says: (Not documented in any spec)
- Code Says: SB efficiency utilities (getSBSuccessRate, isSBProfitable)
- Recommended Fix: Document in RWAR_CALCULATION_SPEC.md §4
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B1-017
- Severity: DOC_ONLY
- Batch: 1
- Spec: RWAR_CALCULATION_SPEC.md §11
- Code Location: rwarCalculator.ts:462-474
- Spec Says: (Not documented in any spec)
- Code Says: Speed→rWAR range estimator (estimateRWARFromSpeed)
- Recommended Fix: Document in RWAR_CALCULATION_SPEC.md §11
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B1-018
- Severity: DOC_ONLY
- Batch: 1
- Spec: MWAR_CALCULATION_SPEC.md §5
- Code Location: mwarCalculator.ts:223
- Spec Says: (Not documented in any spec)
- Code Says: shift_off as separate decision type with values (+0.1/-0.1) — spec mentions shift toggle but doesn't explicitly define shift_off values
- Recommended Fix: Document in MWAR_CALCULATION_SPEC.md §5
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B1-019
- Severity: DOC_ONLY
- Batch: 1
- Spec: MWAR_CALCULATION_SPEC.md §10
- Code Location: mwarCalculator.ts:245-258
- Spec Says: (Not documented in any spec)
- Code Says: EXPECTED_SUCCESS_RATES constant with exact rates per decision type (e.g., pitching_change=0.575, steal_call=0.675) — spec §10 gives ranges only
- Recommended Fix: Document in MWAR_CALCULATION_SPEC.md §10
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B1-020
- Severity: DOC_ONLY
- Batch: 1
- Spec: MWAR_CALCULATION_SPEC.md (new section)
- Code Location: mwarIntegration.ts:143-181
- Spec Says: (Not documented in any spec)
- Code Says: ManagerMomentState interface + checkManagerMoment() — full Manager Moment prompt system with inferRelevantDecisionType/buildManagerMomentContext/getSuggestedAction
- Recommended Fix: Document in MWAR_CALCULATION_SPEC.md (new section)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B1-021
- Severity: DOC_ONLY
- Batch: 1
- Spec: MWAR_CALCULATION_SPEC.md (new appendix)
- Code Location: mwarIntegration.ts:320-338
- Spec Says: (Not documented in any spec)
- Code Says: getLITierDescription/getLIColor — UI display helpers for LI tiers with color coding
- Recommended Fix: Document in MWAR_CALCULATION_SPEC.md (new appendix)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B1-022
- Severity: DOC_ONLY
- Batch: 1
- Spec: MWAR_CALCULATION_SPEC.md (new appendix)
- Code Location: mwarCalculator.ts:921-931
- Spec Says: (Not documented in any spec)
- Code Says: getMWARColor — hex color mapping for mWAR ratings (Elite=gold, Poor=red, etc.)
- Recommended Fix: Document in MWAR_CALCULATION_SPEC.md (new appendix)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B1-023
- Severity: DOC_ONLY
- Batch: 1
- Spec: MWAR_CALCULATION_SPEC.md (new appendix)
- Code Location: mwarCalculator.ts:913-916
- Spec Says: (Not documented in any spec)
- Code Says: formatMWAR — display formatting with +/- sign prefix
- Recommended Fix: Document in MWAR_CALCULATION_SPEC.md (new appendix)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B2-001
- Severity: DOC_ONLY
- Batch: 2
- Spec: MASTER_BASEBALL_RULES_AND_LOGIC.md §12
- Code Location: useGameState.ts:473-510
- Spec Says: (Not documented in any spec)
- Code Says: autoCorrectResult() — GO→DP auto-correction more aggressive than spec ("suggest SAC" says spec, code auto-corrects GO→DP when runner thrown out)
- Recommended Fix: Document in MASTER_BASEBALL_RULES_AND_LOGIC.md §12
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B2-002
- Severity: DOC_ONLY
- Batch: 2
- Spec: MASTER_BASEBALL_RULES_AND_LOGIC.md §12 (new section)
- Code Location: useGameState.ts:517-531
- Spec Says: (Not documented in any spec)
- Code Says: isExtraAdvancement() — detects when runner advancement exceeds standard for result type, triggers explanation prompt
- Recommended Fix: Document in MASTER_BASEBALL_RULES_AND_LOGIC.md §12 (new section)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B2-003
- Severity: DOC_ONLY
- Batch: 2
- Spec: MASTER_BASEBALL_RULES_AND_LOGIC.md §8 (new section)
- Code Location: useGameState.ts:1992-1994
- Spec Says: (Not documented in any spec)
- Code Says: Error recording marks runs as unearned via inherited runner tracker — spec doesn't detail earned/unearned attribution logic
- Recommended Fix: Document in MASTER_BASEBALL_RULES_AND_LOGIC.md §8 (new section)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B2-004
- Severity: DOC_ONLY
- Batch: 2
- Spec: RUNNER_ADVANCEMENT_RULES.md (new section)
- Code Location: runnerDefaults.ts:303-313
- Spec Says: (Not documented in any spec)
- Code Says: calculateFoulOutDefaults() — foul out as distinct category not in spec
- Recommended Fix: Document in RUNNER_ADVANCEMENT_RULES.md (new section)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B2-005
- Severity: DOC_ONLY
- Batch: 2
- Spec: RUNNER_ADVANCEMENT_RULES.md §6
- Code Location: runnerDefaults.ts:426
- Spec Says: (Not documented in any spec)
- Code Says: TBL (TOOTBLAN) as runner event type alongside SB/CS/PK — not defined in advancement rules
- Recommended Fix: Document in RUNNER_ADVANCEMENT_RULES.md §6
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B2-006
- Severity: DOC_ONLY
- Batch: 2
- Spec: RUNNER_ADVANCEMENT_RULES.md §4
- Code Location: runnerDefaults.ts:361-387
- Spec Says: (Not documented in any spec)
- Code Says: calculateFieldersChoiceDefaults(bases, runnerOut) — separate FC defaults with per-runner-out parameter
- Recommended Fix: Document in RUNNER_ADVANCEMENT_RULES.md §4
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B2-007
- Severity: DOC_ONLY
- Batch: 2
- Spec: INHERITED_RUNNERS_SPEC.md §5 (partially covered in spec as pseudocode but not formalized)
- Code Location: inheritedRunnerTracker.ts:449-490
- Spec Says: (Not documented in any spec)
- Code Says: getERSummary() — aggregates ER/UER per pitcher from runner tracking state
- Recommended Fix: Document in INHERITED_RUNNERS_SPEC.md §5 (partially covered in spec as pseudocode but not formalized)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B2-008
- Severity: DOC_ONLY
- Batch: 2
- Spec: INHERITED_RUNNERS_SPEC.md §10 (UI display helpers)
- Code Location: inheritedRunnerTracker.ts:495-528
- Spec Says: (Not documented in any spec)
- Code Says: getCurrentBases() — converts TrackedRunner[] to Bases UI type with inheritedFrom info
- Recommended Fix: Document in INHERITED_RUNNERS_SPEC.md §10 (UI display helpers)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B2-009
- Severity: DOC_ONLY
- Batch: 2
- Spec: INHERITED_RUNNERS_SPEC.md (new section: integration layer)
- Code Location: useGameState.ts:669-694
- Spec Says: (Not documented in any spec)
- Code Says: processTrackerScoredEvents() — bridges inheritedRunnerTracker scored events to pitcherStats Map
- Recommended Fix: Document in INHERITED_RUNNERS_SPEC.md (new section: integration layer)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B2-010
- Severity: DOC_ONLY
- Batch: 2
- Spec: PITCH_COUNT_TRACKING_SPEC.md §5.3 (partial implementation)
- Code Location: useGameState.ts:2908
- Spec Says: (Not documented in any spec)
- Code Says: End-of-game pitch count prompt only captures CURRENT pitcher, not all pitchers. Comment: "(simplified - full spec requires all pitchers)"
- Recommended Fix: Document in PITCH_COUNT_TRACKING_SPEC.md §5.3 (partial implementation)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B2-011
- Severity: DOC_ONLY
- Batch: 2
- Spec: PITCH_COUNT_TRACKING_SPEC.md §5.1 (Cancel behavior not spec'd)
- Code Location: GameTracker.tsx:3546-3553
- Spec Says: (Not documented in any spec)
- Code Says: dismissPitchCountPrompt allows Cancel on "required" pitch count prompts — Cancel closes modal and pitch change doesn't execute, but user can re-initiate
- Recommended Fix: Document in PITCH_COUNT_TRACKING_SPEC.md §5.1 (Cancel behavior not spec'd)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B2-012
- Severity: DOC_ONLY
- Batch: 2
- Spec: PITCHER_STATS_TRACKING_SPEC.md (new section: streak tracking)
- Code Location: useGameState.ts:105,1217-1219
- Spec Says: (Not documented in any spec)
- Code Says: consecutiveHRsAllowed field — tracks back-to-back HR streaks, reset on non-HR hit or out
- Recommended Fix: Document in PITCHER_STATS_TRACKING_SPEC.md (new section: streak tracking)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B2-013
- Severity: DOC_ONLY
- Batch: 2
- Spec: PITCHER_STATS_TRACKING_SPEC.md §2 (new stat)
- Code Location: useGameState.ts:103,1700-1702
- Spec Says: (Not documented in any spec)
- Code Says: basesLoadedWalks field — counts BB/HBP/IBB with bases loaded
- Recommended Fix: Document in PITCHER_STATS_TRACKING_SPEC.md §2 (new stat)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B2-014
- Severity: DOC_ONLY
- Batch: 2
- Spec: PITCHER_STATS_TRACKING_SPEC.md §5.3 (document as known simplification)
- Code Location: useGameState.ts:723-725
- Spec Says: (Not documented in any spec)
- Code Says: Loss determination uses "highest runsAllowed" simplification (comment acknowledges spec wants pitcher-of-record)
- Recommended Fix: Document in PITCHER_STATS_TRACKING_SPEC.md §5.3 (document as known simplification)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B3-001
- Severity: DOC_ONLY
- Batch: 3
- Spec: CLUTCH_ATTRIBUTION_SPEC.md §9.5 (walkoff is a trigger category, not a flat multiplier)
- Code Location: useClutchCalculations.ts:237
- Spec Says: (Not documented in any spec)
- Code Says: Walk-off bonus applies ×1.5 multiplier to clutchValue — spec doesn't define a walkoff multiplier in accumulateClutchEvent; spec uses clutch trigger stacking instead
- Recommended Fix: Document in CLUTCH_ATTRIBUTION_SPEC.md §9.5 (walkoff is a trigger category, not a flat multiplier)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B3-002
- Severity: DOC_ONLY
- Batch: 3
- Spec: CLUTCH_ATTRIBUTION_SPEC.md §10 (already documented — verified match)
- Code Location: clutchCalculator.ts:1001-1035
- Spec Says: (Not documented in any spec)
- Code Says: getClutchVotingComponent() and scaleToRange() — All-Star voting integration with 30% weight. Spec documents this in §10 but it's an integration point not obvious from the main clutch spec
- Recommended Fix: Document in CLUTCH_ATTRIBUTION_SPEC.md §10 (already documented — verified match)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B3-003
- Severity: DOC_ONLY
- Batch: 3
- Spec: CLUTCH_ATTRIBUTION_SPEC.md §4.5 (add TP row or document mapping)
- Code Location: useClutchCalculations.ts:105
- Spec Says: (Not documented in any spec)
- Code Says: TP (Triple Play) mapped to 'gidp' for clutch purposes — no separate triple play attribution in spec
- Recommended Fix: Document in CLUTCH_ATTRIBUTION_SPEC.md §4.5 (add TP row or document mapping)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B3-004
- Severity: DOC_ONLY
- Batch: 3
- Spec: LEVERAGE_INDEX_SPEC.md §6 (add extra innings section)
- Code Location: leverageCalculator.ts:232-234
- Spec Says: (Not documented in any spec)
- Code Says: Extra innings ramp-up: `Math.min(2.5, 1.8 + (inning - totalInnings) * 0.15)` — spec doesn't define extra-inning multiplier scaling, only shows standard 9-inning multipliers
- Recommended Fix: Document in LEVERAGE_INDEX_SPEC.md §6 (add extra innings section)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B3-005
- Severity: DOC_ONLY
- Batch: 3
- Spec: LEVERAGE_INDEX_SPEC.md §3 (minor utility)
- Code Location: leverageCalculator.ts:185-191
- Spec Says: (Not documented in any spec)
- Code Says: decodeBaseState() — converts base state int back to RunnersOnBase object. Utility not in spec
- Recommended Fix: Document in LEVERAGE_INDEX_SPEC.md §3 (minor utility)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B3-006
- Severity: DOC_ONLY
- Batch: 3
- Spec: LEVERAGE_INDEX_SPEC.md (new section or separate WP spec)
- Code Location: leverageCalculator.ts:522-561
- Spec Says: (Not documented in any spec)
- Code Says: estimateWinProbability() — simplified WP calculation using score diff, game progress, runner boost. Not in LI spec
- Recommended Fix: Document in LEVERAGE_INDEX_SPEC.md (new section or separate WP spec)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B3-007
- Severity: DOC_ONLY
- Batch: 3
- Spec: LEVERAGE_INDEX_SPEC.md §9 (partially covered but exact values undocumented)
- Code Location: leverageCalculator.ts:440-472
- Spec Says: (Not documented in any spec)
- Code Says: estimateGmLI() — role-based gmLI estimation with save/hold adjustments. CLOSER ranges 1.75-1.95, SETUP 1.40-1.60
- Recommended Fix: Document in LEVERAGE_INDEX_SPEC.md §9 (partially covered but exact values undocumented)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B3-008
- Severity: DOC_ONLY
- Batch: 3
- Spec: LEVERAGE_INDEX_SPEC.md §9 (accumulation mentioned but interface not detailed)
- Code Location: leverageCalculator.ts:370-421
- Spec Says: (Not documented in any spec)
- Code Says: LIAccumulator interface + createLIAccumulator + addLIAppearance + calculateGmLI — per-player LI tracking system
- Recommended Fix: Document in LEVERAGE_INDEX_SPEC.md §9 (accumulation mentioned but interface not detailed)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B3-009
- Severity: DOC_ONLY
- Batch: 3
- Spec: LEVERAGE_INDEX_SPEC.md (new appendix: display helpers)
- Code Location: leverageCalculator.ts:570-596
- Spec Says: (Not documented in any spec)
- Code Says: formatLI(), getLIColor(), getLIEmoji() — UI display utilities for LI values
- Recommended Fix: Document in LEVERAGE_INDEX_SPEC.md (new appendix: display helpers)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B3-010
- Severity: DOC_ONLY
- Batch: 3
- Spec: FIELDING_SYSTEM_SPEC.md §3 (add x-coordinate thresholds)
- Code Location: fielderInference.ts:131-137
- Spec Says: (Not documented in any spec)
- Code Says: inferDirectionFromX(x) — maps raw x-coordinate to 5-zone direction (0.25/0.4/0.6/0.75 thresholds). Spec only defines sector-to-direction mapping, not raw coordinate mapping
- Recommended Fix: Document in FIELDING_SYSTEM_SPEC.md §3 (add x-coordinate thresholds)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B3-011
- Severity: DOC_ONLY
- Batch: 3
- Spec: FIELDING_SYSTEM_SPEC.md §3 (add y-coordinate → exit type mapping)
- Code Location: fielderInference.ts:171-201
- Spec Says: (Not documented in any spec)
- Code Says: inferExitTypeFromLocation(y, isOut) — depth-based exit type inference. For outs: <0.35=LineDrive, <0.55=LineDrive, else=FlyBall. For hits: <0.35=Ground, <0.55=LineDrive, else=FlyBall
- Recommended Fix: Document in FIELDING_SYSTEM_SPEC.md §3 (add y-coordinate → exit type mapping)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B3-012
- Severity: DOC_ONLY
- Batch: 3
- Spec: FIELDING_SYSTEM_SPEC.md §12 (add difficulty inference thresholds)
- Code Location: fielderInference.ts:210-237
- Spec Says: (Not documented in any spec)
- Code Says: inferPlayDifficulty(location, inferredFielder, actualFielder) — depth-based difficulty: OF at wall(>0.95)=impossible, warning(>0.85)=difficult, normal(>0.7)=likely, shallow(>0.5)=routine, very-shallow=difficult. IF: <0.15=routine, <0.25=likely, <0.35=difficult, else=impossible
- Recommended Fix: Document in FIELDING_SYSTEM_SPEC.md §12 (add difficulty inference thresholds)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B3-013
- Severity: DOC_ONLY
- Batch: 3
- Spec: FIELDING_SYSTEM_SPEC.md §4 (add confidence modifiers)
- Code Location: fielderInference.ts:293-300
- Spec Says: (Not documented in any spec)
- Code Says: Confidence adjustment for edge locations: y>0.9 or y<0.1 → ×0.8 confidence; x<0.1 or x>0.9 → ×0.85 confidence (foul line area)
- Recommended Fix: Document in FIELDING_SYSTEM_SPEC.md §4 (add confidence modifiers)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B3-014
- Severity: DOC_ONLY
- Batch: 3
- Spec: GAMETRACKER_DRAGDROP_SPEC.md §Coordinate (update to reference FieldCanvas geometry)
- Code Location: FieldCanvas.tsx:366-388
- Spec Says: (Not documented in any spec)
- Code Says: Field-feet coordinate system with trigonometric field geometry. Fielder positions computed from real baseball feet coords via fieldToNormalized() rather than spec's simple (0-1) grid
- Recommended Fix: Document in GAMETRACKER_DRAGDROP_SPEC.md §Coordinate (update to reference FieldCanvas geometry)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B3-015
- Severity: DOC_ONLY
- Batch: 3
- Spec: GAMETRACKER_DRAGDROP_SPEC.md §Contextual Buttons (already documented but implementation details like PlayContext interface not in spec)
- Code Location: EnhancedInteractiveField.tsx:329-423
- Spec Says: (Not documented in any spec)
- Code Says: Full inferContextualButtons() system with PlayContext interface, SpecialEventType enum, auto-dismiss timeout (3000ms), emoji mapping, Fame event integration
- Recommended Fix: Document in GAMETRACKER_DRAGDROP_SPEC.md §Contextual Buttons (already documented but implementation details like PlayContext interface not in spec)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B3-016
- Severity: DOC_ONLY
- Batch: 3
- Spec: GAMETRACKER_DRAGDROP_SPEC.md §Pattern 5 (verified match — auto-detection working)
- Code Location: playClassifier.ts:158
- Spec Says: (Not documented in any spec)
- Code Says: playClassifier uses isFoulTerritory() from FieldCanvas to auto-classify foul outs when fielder dragged to foul territory — exactly matches spec Pattern 5
- Recommended Fix: Document in GAMETRACKER_DRAGDROP_SPEC.md §Pattern 5 (verified match — auto-detection working)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B3-017
- Severity: DOC_ONLY
- Batch: 3
- Spec: GAMETRACKER_DRAGDROP_SPEC.md §Contextual Buttons (add mutual exclusivity rule)
- Code Location: EnhancedInteractiveField.tsx:3554-3561
- Spec Says: (Not documented in any spec)
- Code Says: KILLED_PITCHER and NUT_SHOT are mutually exclusive — if KILLED completed, NUT_SHOT prompt is skipped. Not in spec
- Recommended Fix: Document in GAMETRACKER_DRAGDROP_SPEC.md §Contextual Buttons (add mutual exclusivity rule)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B3-018
- Severity: DOC_ONLY
- Batch: 3
- Spec: FIELD_ZONE_INPUT_SPEC.md §5.1 (add ray-casting implementation note)
- Code Location: fieldZones.ts:380-415
- Spec Says: (Not documented in any spec)
- Code Says: pointInPolygon() — full ray-casting algorithm for point-in-polygon detection. Spec mentions findZoneAtPoint() but doesn't detail the algorithm implementation
- Recommended Fix: Document in FIELD_ZONE_INPUT_SPEC.md §5.1 (add ray-casting implementation note)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B3-019
- Severity: DOC_ONLY
- Batch: 3
- Spec: FIELD_ZONE_INPUT_SPEC.md §5.1 (add SVG path parsing detail)
- Code Location: fieldZones.ts:390-399
- Spec Says: (Not documented in any spec)
- Code Says: parseSVGPath() — SVG path string parser for M/L commands used by polygon hit-testing. Not in spec
- Recommended Fix: Document in FIELD_ZONE_INPUT_SPEC.md §5.1 (add SVG path parsing detail)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B3-020
- Severity: DOC_ONLY
- Batch: 3
- Spec: FIELD_ZONE_INPUT_SPEC.md §4.1 (update layout spec to match landscape implementation)
- Code Location: FieldZoneInput.tsx:168-361
- Spec Says: (Not documented in any spec)
- Code Says: Full landscape layout with flex container: SVG field left (60% width), zone info + fielder panel right (180px fixed). Spec §4.1 shows portrait layout with field above controls. Code uses iPad-friendly horizontal orientation
- Recommended Fix: Document in FIELD_ZONE_INPUT_SPEC.md §4.1 (update layout spec to match landscape implementation)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B3-021
- Severity: DOC_ONLY
- Batch: 3
- Spec: FIELD_ZONE_INPUT_SPEC.md §4.2 (add selection animation detail)
- Code Location: FieldZoneInput.tsx:248-260
- Spec Says: (Not documented in any spec)
- Code Says: Animated selection indicator: pulsing circle at zone center with CSS animation (r: 2.5→3.5→2.5, 1s repeat). Spec only mentions "SelectedZoneHighlight" in component hierarchy
- Recommended Fix: Document in FIELD_ZONE_INPUT_SPEC.md §4.2 (add selection animation detail)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B3-022
- Severity: DOC_ONLY
- Batch: 3
- Spec: FIELD_ZONE_INPUT_SPEC.md §9.4 (add foul depth→FieldingModal mapping)
- Code Location: FieldingModal.tsx:282-300
- Spec Says: (Not documented in any spec)
- Code Says: handleZoneSelect() maps ZoneTapResult depth to FieldingModal's DepthType (foul_shallow→'shallow', foul_medium→'outfield', foul_catcher→'shallow'). Foul zone depth remapping not in any spec
- Recommended Fix: Document in FIELD_ZONE_INPUT_SPEC.md §9.4 (add foul depth→FieldingModal mapping)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B4-001
- Severity: DOC_ONLY
- Batch: 4
- Spec: MOJO_FITNESS_SYSTEM_SPEC.md §2.2 (add custom delta override)
- Code Location: mojoEngine.ts:398-419
- Spec Says: (Not documented in any spec)
- Code Says: applyMojoChange() customDelta parameter allows bypassing trigger-based delta for USER_ADJUSTMENT. Spec §2.2 mentions user adjustment trigger but not custom override mechanism
- Recommended Fix: Document in MOJO_FITNESS_SYSTEM_SPEC.md §2.2 (add custom delta override)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B4-002
- Severity: DOC_ONLY
- Batch: 4
- Spec: MOJO_FITNESS_SYSTEM_SPEC.md §2.2 (add batch trigger processing)
- Code Location: mojoEngine.ts:424-451
- Spec Says: (Not documented in any spec)
- Code Says: processMojoTriggers() — batch processing of multiple triggers with event array generation. Spec describes event-by-event processing but not a batch processor function
- Recommended Fix: Document in MOJO_FITNESS_SYSTEM_SPEC.md §2.2 (add batch trigger processing)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B4-003
- Severity: DOC_ONLY
- Batch: 4
- Spec: MOJO_FITNESS_SYSTEM_SPEC.md §6.1 (add game stats aggregation)
- Code Location: mojoEngine.ts:536-568
- Spec Says: (Not documented in any spec)
- Code Says: calculateMojoGameStats() — aggregates MojoEntry into MojoGameStats with totalSwing, netChange, positiveEvents, negativeEvents. Not described in spec
- Recommended Fix: Document in MOJO_FITNESS_SYSTEM_SPEC.md §6.1 (add game stats aggregation)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B4-004
- Severity: DOC_ONLY
- Batch: 4
- Spec: MOJO_FITNESS_SYSTEM_SPEC.md §3.2 (add reliever rest-day recovery multiplier)
- Code Location: fitnessEngine.ts:394-395
- Spec Says: (Not documented in any spec)
- Code Says: Reliever/closer who didn't pitch gets 1.5× position player recovery rate (didNotPlay × 1.5). Spec doesn't define relief pitcher non-play recovery rate
- Recommended Fix: Document in MOJO_FITNESS_SYSTEM_SPEC.md §3.2 (add reliever rest-day recovery multiplier)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B4-005
- Severity: DOC_ONLY
- Batch: 4
- Spec: SALARY_SYSTEM_SPEC.md §8 (add SalaryBreakdown interface)
- Code Location: salaryCalculator.ts:662-727
- Spec Says: (Not documented in any spec)
- Code Says: SalaryBreakdown return type with 12+ fields (baseSalary, positionFactor, traitFactor, ageFactor, performanceFactor, fameFactor, personalityFactor, finalSalary, trueValue, percentile, etc.) — full breakdown structure not in spec
- Recommended Fix: Document in SALARY_SYSTEM_SPEC.md §8 (add SalaryBreakdown interface)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B4-006
- Severity: DOC_ONLY
- Batch: 4
- Spec: SALARY_SYSTEM_SPEC.md §2.2 (add percentile grouping note)
- Code Location: salaryCalculator.ts:220-250
- Spec Says: (Not documented in any spec)
- Code Says: Position merge groups: 2B/SS→MI, LF/CF/RF→OF for percentile calculations. Spec lists individual multipliers but not percentile grouping
- Recommended Fix: Document in SALARY_SYSTEM_SPEC.md §2.2 (add percentile grouping note)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B4-007
- Severity: DOC_ONLY
- Batch: 4
- Spec: SALARY_SYSTEM_SPEC.md (appendix: API surface)
- Code Location: salaryCalculator.ts:1250-1287
- Spec Says: (Not documented in any spec)
- Code Says: Backward compatibility exports: calculateSalary(), calculateTeamSalaries(), getSalaryColor() wrapping newer functions
- Recommended Fix: Document in SALARY_SYSTEM_SPEC.md (appendix: API surface)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B4-008
- Severity: DOC_ONLY
- Batch: 4
- Spec: SALARY_SYSTEM_SPEC.md (appendix: display helpers)
- Code Location: salaryCalculator.ts:1100-1150
- Spec Says: (Not documented in any spec)
- Code Says: Display helpers: getSalaryTier(), getSalaryColor(), formatSalary(), getSalaryEmoji() — UI formatting utilities
- Recommended Fix: Document in SALARY_SYSTEM_SPEC.md (appendix: display helpers)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B4-009
- Severity: DOC_ONLY
- Batch: 4
- Spec: SALARY_SYSTEM_SPEC.md §6 (add ROI tier definitions)
- Code Location: salaryCalculator.ts:874-929
- Spec Says: (Not documented in any spec)
- Code Says: ROI tier calculation within calculateTrueValue — maps salary-to-performance ratio to tier labels (Elite Value, Strong Value, Fair, Overpaid, Anchor Contract)
- Recommended Fix: Document in SALARY_SYSTEM_SPEC.md §6 (add ROI tier definitions)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B4-010
- Severity: DOC_ONLY
- Batch: 4
- Spec: SALARY_SYSTEM_SPEC.md §3 (add DH context for pitcher batting)
- Code Location: salaryCalculator.ts:770-830
- Spec Says: (Not documented in any spec)
- Code Says: DHContext system: when calculating pitcher salary, checks if team uses DH to determine pitcher batting bonus eligibility. Non-DH leagues allow pitcher batting bonus, DH leagues suppress it
- Recommended Fix: Document in SALARY_SYSTEM_SPEC.md §3 (add DH context for pitcher batting)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B4-011
- Severity: DOC_ONLY
- Batch: 4
- Spec: GRADE_ALGORITHM_SPEC.md (new section: display helpers — centralize into gradeEngine.ts)
- Code Location: FreeAgencyFlow.tsx:138-146, DraftFlow.tsx:434-443, RetirementFlow.tsx:157, RatingsAdjustmentFlow.tsx:292
- Spec Says: (Not documented in any spec)
- Code Says: getGradeColor() and getGradeTier() duplicated across 5+ UI files with slightly different implementations. No centralized grade display utility
- Recommended Fix: Document in GRADE_ALGORITHM_SPEC.md (new section: display helpers — centralize into gradeEngine.ts)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B4-012
- Severity: DOC_ONLY
- Batch: 4
- Spec: GRADE_ALGORITHM_SPEC.md §Prospect Generation (add personality assignment)
- Code Location: DraftFlow.tsx:146-165
- Spec Says: (Not documented in any spec)
- Code Says: 20 hardcoded mock prospect objects with personality field ('LEADER', 'COMPETITIVE', 'CALM', 'HOTHEAD'). Personality not in grade spec but used for display
- Recommended Fix: Document in GRADE_ALGORITHM_SPEC.md §Prospect Generation (add personality assignment)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B4-013
- Severity: DOC_ONLY
- Batch: 4
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §Overview or fameEngine.ts (consider renaming Fame tier to avoid ambiguity, e.g. "CROWD_PLEASER")
- Code Location: fameEngine.ts:359
- Spec Says: (Not documented in any spec)
- Code Says: FAN_FAVORITE Fame tier (5-15 Fame range) uses same name as the Fan Favorite designation system but is a DIFFERENT concept. Fame tier = cumulative Fame score label. FAN_FAVORITE_SYSTEM_SPEC = value-over-contract designation. Name collision may cause confusion
- Recommended Fix: Document in FAN_FAVORITE_SYSTEM_SPEC.md §Overview or fameEngine.ts (consider renaming Fame tier to avoid ambiguity, e.g. "CROWD_PLEASER")
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B5-001
- Severity: DOC_ONLY
- Batch: 5
- Spec: Multiple specs (this spec only covers save slots, not the franchise hub content itself)
- Code Location: FranchiseHome.tsx (228K)
- Spec Says: (Not documented in any spec)
- Code Says: Massive franchise hub page with 27+ tabs covering standings, stats, trades, playoffs, awards, etc. — far beyond what FRANCHISE_MODE_SPEC covers (which is just save slot management). The page is its own specification
- Recommended Fix: Document in Multiple specs (this spec only covers save slots, not the franchise hub content itself)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B10-001
- Severity: DOC_ONLY
- Batch: 10
- Spec: STAT_TRACKING_ARCHITECTURE_SPEC.md (new section: Standings)
- Code Location: seasonStorage.ts:762-917
- Spec Says: (Not documented in any spec)
- Code Says: calculateStandings() — full standings calculation with W/L records, run differential, streaks, L10, home/away splits, games back
- Recommended Fix: Document in STAT_TRACKING_ARCHITECTURE_SPEC.md (new section: Standings)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B10-002
- Severity: DOC_ONLY
- Batch: 10
- Spec: STAT_TRACKING_ARCHITECTURE_SPEC.md §3.3 or MILESTONE_SYSTEM_SPEC.md (cross-reference)
- Code Location: seasonAggregator.ts:96-100
- Spec Says: (Not documented in any spec)
- Code Says: Milestone detection integration via aggregateGameWithMilestones() — combines season aggregation with milestone checking
- Recommended Fix: Document in STAT_TRACKING_ARCHITECTURE_SPEC.md §3.3 or MILESTONE_SYSTEM_SPEC.md (cross-reference)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### UNDOC-B10-003
- Severity: DOC_ONLY
- Batch: 10
- Spec: STAT_TRACKING_ARCHITECTURE_SPEC.md §5.5 (update: partially implemented)
- Code Location: careerStorage.ts
- Spec Says: (Not documented in any spec)
- Code Says: Career storage with DB_VERSION=3, career batting/pitching/fielding/milestones stores — partially implements Phase 5
- Recommended Fix: Document in STAT_TRACKING_ARCHITECTURE_SPEC.md §5.5 (update: partially implemented)
- My Triage: DOC ONLY
- Triage Reason: Code works, just needs spec documentation
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B3-001
- Severity: MAJOR
- Batch: 3
- Spec: CLUTCH_ATTRIBUTION_SPEC.md §4.1
- Code Location: clutchCalculator.ts getBatterBaseValue:400-401
- Spec Says: Spec §4.1 Hits: single=+0.8×CQ, triple/double=+1.0×CQ (separate rows). Triple and Double have same base +1.0
- Code Says: Code: triple AND double AND ground_rule_double all return `{base: 1.0}` — triple should be higher value than double per baseball value hierarchy. Spec gives same +1.0 for both so CODE MATCHES SPEC, but note XBH isn't differentiated
- Recommended Fix: N/A — matches spec. Consider spec update to differentiate triple (+1.1?) from double (+1.0)
- My Triage: SKIP
- Triage Reason: Already verified as matching
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MAJ-B3-003
- Severity: MAJOR
- Batch: 3
- Spec: CLUTCH_ATTRIBUTION_SPEC.md §4.2
- Code Location: clutchCalculator.ts getPitcherBaseValue:520-521
- Spec Says: Spec §4.2 Outs: Pitcher on XBH allowed = -0.9×(1-CQ), single allowed = -0.8×(1-CQ)
- Code Says: Code: triple/double/GRD all return `{base: -0.9}` but single returns `{base: -0.8}` — MATCHES spec
- Recommended Fix: N/A — verified match
- My Triage: SKIP
- Triage Reason: Already verified as matching
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B3-004
- Severity: MINOR
- Batch: 3
- Spec: CLUTCH_ATTRIBUTION_SPEC.md §4.4
- Code Location: clutchCalculator.ts getFielderBaseValue:583-588
- Spec Says: Spec §4.4: Error on hard grounder fielder = -0.6×LI. Code error on routine = -1.0, on diving = +0.2, else = -0.6
- Code Says: Code matches spec's routine=-1.0, hard=-0.6 mapping for standard errors. Throwing error code=-0.8 matches spec's -0.8×LI
- Recommended Fix: N/A — verified match for standard errors
- My Triage: SKIP
- Triage Reason: Already verified as matching
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### MIN-B3-006
- Severity: MINOR
- Batch: 3
- Spec: FIELDING_SYSTEM_SPEC.md §4
- Code Location: fielderInference.ts:70
- Spec Says: Spec §4 FO+L(Left): Primary=LF, Secondary=CF, Tertiary=3B
- Code Says: Code FLY_BALL_INFERENCE['Left']={primary:'LF', secondary:'CF', tertiary:'3B'} — MATCH
- Recommended Fix: N/A — verified
- My Triage: SKIP
- Triage Reason: Already verified as matching
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### NEW-001
- Severity: MAJOR
- Batch: None
- Spec: League Builder
- Code Location: LeagueBuilderRosters.tsx
- Spec Says: SP/RP should be classified as pitchers (starters/relievers) not position players in roster setups
- Code Says: SP/RP treated same as position players in roster setup
- Recommended Fix: Reclassify SP/RP as pitcher category in roster management
- My Triage: FEATURE BUILD
- Triage Reason: User addition
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### NEW-002
- Severity: MAJOR
- Batch: None
- Spec: Franchise Mode
- Code Location: FranchiseHome or GameTracker entry
- Spec Says: Franchise mode needs pre-game lineup screen like Exhibition to choose starting pitcher and reorder lineup before game starts
- Code Says: Franchise mode launches GameTracker directly without lineup configuration
- Recommended Fix: Add pre-game lineup screen to franchise mode game launch flow (match Exhibition mode pattern)
- My Triage: FEATURE BUILD
- Triage Reason: User addition
- Your Decision: BUILD
- Status: APPROVED (Phase B)

### NEW-003
- Severity: MINOR
- Batch: None
- Spec: League Builder Rules
- Code Location: LeagueBuilderRules.tsx
- Spec Says: Pitch Counts and Mound Visits should not be in Rules tabs
- Code Says: Pitch Counts and Mound Visits currently appear in Rules configuration
- Recommended Fix: Remove Pitch Counts and Mound Visits from Rules in League Builder
- My Triage: FEATURE BUILD
- Triage Reason: User addition
- Your Decision: BUILD
- Status: APPROVED (Phase B)

