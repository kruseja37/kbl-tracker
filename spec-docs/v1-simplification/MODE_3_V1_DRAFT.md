# MODE 3: OFFSEASON WORKSHOP — V1 Triage Draft

## Triage Status
**Document:** MODE_3_OFFSEASON_WORKSHOP.md
**Total Sections:** 21
**Completed:** 21/21 ✅
**Started:** 2026-03-04
**Finished:** 2026-03-04

---

## Rulings

### §1 — Overview & Mode Definition
**Ruling:** KEEP AS-IS (with cosmetic spec correction)
**v1 Scope:** Everything —
- §1.1 Mode definition: 13-phase ceremony-driven offseason hub, runs once per season boundary
- §1.2 All 12 outputs: awards, ratings, salaries ×3, expansion (optional), stadium changes (optional), retirements, FA, draft, trades, farm reconciliation, chemistry rebalancing, finalize/advance
- §1.3 Negative boundaries: 5 exclusions (cosmetic correction: AI simulation reference updated for v1 context — deferred entirely, not "Mode 2's AI Game Engine")
- §1.4 Entry/exit points: 3 transitions (Mode 2→3 on season end, Mode 3→2 on finalize, resume on return)
- §1.5 Key principles: all 7 (sequential phases, ceremony-first, triple salary recalc, personality-driven, no salary matching, farm-first draft, 13-phase structure)

**SPEC CORRECTION — §1.3 wording:**
"Simulate AI-vs-AI games (that's Mode 2's AI Game Engine)" → update to reflect AI Game Engine is deferred entirely (Mode 2 §25 DEFER), not a Mode 2 v1 feature. Cosmetic only — scope unchanged.

**v2 Deferred:** Nothing
**JK's Reasoning:** Expansion stays v1 (will be detailed in §6/Phase 4). Triple salary recalc stays — all 3 passes needed. Everything in this framing section earns its place.
**Dependencies Flagged:** N/A.

---

### §2 — Phase Structure
**Ruling:** SIMPLIFY (with spec corrections)
**v1 Scope:**
- §2.1 The 13 Phases: KEEP AS-IS — full master table with phase numbers, names, default scopes, and purposes
- §2.2 Phase Scope: KEEP with CORRECTION — replace stale `offseasonPhaseScopes` array reference with 3-value global selector. `offseasonScope: 'default' | 'human-only' | 'all-teams'`. When `default`: uses per-phase scope assignments from §2.1 table. When `human-only`: overrides all 13 phases to human-only. When `all-teams`: overrides all 13 phases to all-teams. Couch Co-Op still forces `all-teams`.
- §2.3 Phase Persistence: KEEP AS-IS — `OffseasonState` interface (5 fields), `PhaseStatus` type, IndexedDB persistence, resume-at-last-incomplete
- §2.4 Interaction Modes: SIMPLIFY — Game Night Mode only for v1. Streamlined Mode deferred.

**v1 KEEPS:**
- Full 13-phase table with default scope assignments
- 3-value offseason scope selector (default/human-only/all-teams)
- AI auto-resolution for human-only phases
- Couch Co-Op all-teams override
- Full phase persistence and resume logic
- Game Night Mode (full ceremony experience)

**v2 DEFERS:**
- Streamlined Mode (batch processing, condensed UI, ~60% time reduction)

**SPEC CORRECTIONS (2):**
1. §2.2: Replace `offseasonPhaseScopes` array with `offseasonScope: 'default' | 'human-only' | 'all-teams'`. The 'default' value uses the per-phase scope column from the §2.1 table. The other two values override all phases uniformly.
2. **MODE 1 §2 CORRECTION:** `offseasonScope` type changes from `'all-teams' | 'human-only'` (binary toggle) to `'default' | 'human-only' | 'all-teams'` (3-value selector). This propagates to Mode 1 §2.3 FranchiseTypeConfig, §2.5 scope description, §11.5 Step4Data, and §12.1 initialization metadata.

**JK's Reasoning:** Game Night is the core experience — ship that first. Streamlined Mode is a UX optimization that can come later. Offseason scope needs three options: the defaults from the phase table, or uniform human-only, or uniform all-teams.
**Dependencies Flagged:** Mode 1 §2 spec correction — offseasonScope type expands from 2 to 3 values. Must propagate to §2.3, §2.5, §11.5, §12.1.

---

### §3 — Phase 1: Season End Processing
**Ruling:** KEEP AS-IS (with spec corrections)
**v1 Scope:** Everything —
- §3.1 Purpose: KEEP AS-IS — finalize standings, postseason MVP, championship bonuses, mojo reset
- §3.2 Screen Flow: KEEP AS-IS — full 7-screen ceremony flow (Final Standings → Postseason MVP card reveal → MVP Confirmation with rating bonus → Championship Processing → Mojo Reset → Season Archive → Phase Complete). No-playoffs path (4 screens: skip screens 2-4).
- §3.3 Data Operations: KEEP with CORRECTIONS — `SeasonEndResult` interface (5 fields), all 5 store operations

**SPEC CORRECTIONS (2):**
1. §3.2 Screen 4 Championship Processing: fame bonus changed from +1 to **+3 fame** per championship team player. Morale stays +20.
2. §3.2 Screen 5 Mojo Reset: expanded to **Mojo + Fitness Reset**. All players reset to Normal mojo AND Fit fitness state (neutral baseline for both systems). Display confirmation with count of players affected for each.

**v2 Deferred:** Nothing
**JK's Reasoning:** Card reveal for MVP earns v1 — it's ceremony-first design. Championship fame bonus too small at +1, bumped to +3. Fitness should also reset to neutral alongside mojo at season boundary — clean slate for both systems.
**Dependencies Flagged:** Fitness reset is a new addition to Phase 1 — Mode 2 §14 fitness system (KEEP) defines Fit as the neutral state. Consistent with user-observed-only principle: engine sets fitness to baseline at season boundary, user observes new state in-season.

---

### §4 — Phase 2: Awards Ceremony
**Ruling:** SIMPLIFY (with spec corrections)
**v1 Scope:**
- §4.1 Purpose: KEEP — 13 award categories, trait rewards via wheel spin (per C-086). REMOVE Team Captain from this phase (see spec correction below).
- §4.2 Screen Flow: KEEP all 13 screens — League Leaders, Gold Glove (9 positions), Platinum Glove, Booger Glove, Silver Slugger (9 positions), Reliever of the Year, Bench Player of the Year, ROY, Cy Young, MVP, MOY, Special Awards (Kara Kawaguchi/Bust/Comeback), Awards Summary. Full hybrid voting with weighted formulas per award. All dramatic reveals and card animations.
- §4.3 Trait Wheel Spin: SIMPLIFY — keep wheel spin ceremony for award winners (60% get trait) and top performers/non-winners (30% get trait). DEFER the 5% regular player end-of-season development lottery. 2-trait max with replacement modal stays.
- §4.4 Award Voting Data Model: KEEP AS-IS — `AwardVote` interface (8 fields), `AwardType` enum (33 values)
- §4.5 AI Team Award Handling: KEEP AS-IS — AI players eligible for league-wide awards, user-as-commissioner can override

**v1 KEEPS:**
- All 13 award screens with full ceremony (dramatic reveals, card flips, wheel spins)
- All voting formulas (Gold Glove: fWAR 55%/Clutch 25%/Eye Test 20%; Silver Slugger: OPS 40%/wRC+ 30%/bWAR 30%; Cy Young: pWAR 40%/Advanced 25%/Clutch 25%/Team 5%/Fame 5%; MVP: WAR 40%/Clutch 25%/Traditional 15%/Team 12%/Fame 8%)
- Wheel spin for award winners (60%) and top performers (30%)
- Booger Glove negative trait, Reliever guaranteed CLUTCH, ROY random positive
- Special Awards: Kara Kawaguchi (WAR/$M), Bust (lowest WAR/$M), Comeback Player (WAR delta — doesn't fire in season 1)
- Full `AwardVote` interface and 33-value `AwardType` enum
- AI team award eligibility with commissioner override

**v2 DEFERS:**
- 5% regular player end-of-season development trait lottery (too many unfocused wheel spins; trait rewards reserved for recognized performers in v1)

**SPEC CORRECTIONS (2):**
1. §4.3 Trait distribution: remove "5% of regular players receive a trait (end-of-season development)" tier. v1 trait rewards limited to award winners (60%) and top performers/non-winners (30%).
2. §4.2 Screen 11: REMOVE Team Captain designation from Awards Ceremony. Team Captain is not an award — it's a designation based on highest (Loyalty + Charisma) per Mode 2 §17.6. It belongs at the end of Mode 3 (Phase 13: Finalize & Advance) AFTER all roster changes (FA, draft, trades) are complete, so it's calculated on the actual roster entering the new season. Same placement logic as Mode 1: captain is assigned at franchise creation and handed to Mode 2. In Mode 3, captain is reassigned after roster finalization and handed to Mode 2 for the next season.

**JK's Reasoning:** All 13 award screens earn v1 — ceremony-first design. The 5% regular player trait lottery creates too many unfocused wheel spins for players the user may not care about; defer to v2. Team Captain is out of place in awards — it should happen after all roster moves are done, not before, so the captain is from the actual next-season roster.
**Dependencies Flagged:** Team Captain moves to §15 (Phase 13: Finalize & Advance) — flag when we reach that section. Comeback Player of the Year requires prior-season WAR delta — gracefully doesn't fire in season 1 (no prior season exists).

---

### §5 — Phase 3: EOS Ratings & Salary Recalculation #1
**Ruling:** KEEP AS-IS
**v1 Scope:** Everything —
- §5.1 Purpose: performance-based rating adjustments + first salary pass. Fan morale modifier on positive adjustments (per C-044: low morale = 0.7×).
- §5.2 Screen Flow: 6 screens (Overview Dashboard → Team Reveal with before/after cards → DH Special Case → Pitcher Adjustment Card → Manager Distribution with ±20 base pool + mWAR/MOY bonuses, ±10 cap per category → League Summary)
- §5.3 Position Detection Algorithm: 9 classification paths (Two-Way/SP/SP-RP/CP/RP/UTIL/BENCH/DH/Primary), min pool size 6 with merge rules (CP↔RP, 1B↔3B, 2B↔SS, LF↔CF↔RF, UTIL↔BENCH). All thresholds scale with season length (per C-043).
- §5.4 Rating Adjustment Formula: WAR→rating category mapping (bWAR→Power/Contact, rWAR→Speed, fWAR→Fielding/Arm, pWAR→Velocity/Junk/Accuracy). Asymmetric 13-row grade factor table (high-grade resists decline, low-grade resists improvement). Cap ±10 per category per season.
- §5.5 Salary Recalculation #1: Full 6-component salary formula (base position-weighted ratings, position multiplier, age factor, trait modifier with chemistry potency, performance modifier capped ±50%, fame modifier capped ±30%). True Value calculation. No salary cap in v1 (per C-051).
- §5.6 Farm Call-Up Threshold: 20% of games played, scales with season length (per C-043).

**v2 Deferred:** Nothing
**JK's Reasoning:** Everything earns its place. Position detection is pure math — no UI cost. Manager Distribution is the only direct user control over ratings — essential for franchise feel. Full salary formula already confirmed v1 across multiple prior rulings.
**Dependencies Flagged:** N/A — all upstream dependencies (WAR components, fan morale, salary system, chemistry-trait potency) confirmed v1 in prior Mode 1/Mode 2 rulings.

---

### §6 — Phase 4: Expansion & Stadium Changes (Optional)
**Ruling:** SIMPLIFY (with spec correction)
**v1 Scope:**
- §6.1 Purpose: KEEP — expansion-only phase (contraction archived per C-041/C-085), stadium changes included (per F-130). Phase is optional/skippable.
- §6.2 Expansion Draft Flow: KEEP AS-IS — full 5-step process (create team → protection selection → expansion draft from unprotected pool → prospect allocation for farm → salary initialization)
- §6.3 Stadium Change Flow: KEEP with CORRECTION — 4-step process (request → pick from existing SMB4 stadiums → park factor reset to seed values with blending next season → confirmation). REMOVE "create custom" option — no custom stadium creation exists in SMB4, so the picker selects from the existing stadium pool only.
- §6.4 Skip Conditions: KEEP AS-IS — auto-advance if no expansion/no stadium changes/user clicks skip

**v1 KEEPS:**
- Full expansion draft (team creation, protection, draft, prospect allocation, salary init)
- Stadium change with picker from existing SMB4 stadiums
- Park factor reset to seed values on stadium change
- Skip conditions for the whole phase

**v2 DEFERS:**
- Custom stadium creation (no basis in SMB4 — stadiums are the existing SMB4 stadium pool)

**SPEC CORRECTION:**
§6.3 step 2: "Choose from available stadiums or create custom" → remove "or create custom." Stadium picker selects from existing SMB4 stadiums only. There's no custom stadium creation in SMB4, so this option has no basis.

**JK's Reasoning:** Expansion earns v1 — full draft flow stays. Stadium change stays — lightweight and ties into park factors. Custom stadium creation removed because SMB4 doesn't support custom stadiums.
**Dependencies Flagged:** No downstream breaks — Mode 2 §24 park factors (confirmed v1) already defines seed values for existing SMB4 stadiums. Custom creation was the only thing that would have needed new stadium dimension data.

---

### §7 — Phase 5: Retirements
**Ruling:** SIMPLIFY (with spec corrections)
**v1 Scope:**
- §7.1 Purpose: KEEP AS-IS — age-based retirements with dice roll ceremonies + jersey retirement decisions
- §7.2 Screen Flow: KEEP AS-IS — all 7 screens (Retirement Probability Table → Dice Roll Animation → Retirement Announcement with career highlights → No Retirement Result → Jersey Retirement Decision → Jersey Retirement Ceremony with spotlight/confetti → Phase Summary)
- §7.3 Retirement Probability: KEEP with CORRECTION — 5-row age bracket table (28-30: 2-5% through 40+: 50-90%), all 7 modifiers (Resilience ±10%, award -5%, captain -5%, fame -5%, low WAR +10%, high salary/production +5%), all 7 personality influences. **NEW: Three dice roll rounds per team.** Each round, remaining retirement-eligible players get a dice roll. If a player retires in round 1, they're done; survivors roll again in rounds 2 and 3. This increases overall retirement rate, especially for younger rosters where individual probabilities are low. Target remains 1-2 retirements per team per season.
- §7.4 Retired Player Database: KEEP with SIMPLIFICATION — `RetiredPlayer` interface (8 fields), enters Inactive Player Database. HoF eligibility stays. REMOVE "optionally re-added to future draft classes" feature — retired players stay retired in v1.

**v1 KEEPS:**
- Full 7-screen ceremony flow (dice rolls, announcements, jersey retirement with spotlight/confetti)
- All retirement probability logic (age brackets, modifiers, personality influence)
- Three dice roll rounds per team for natural retirement rate
- Jersey retirement as user choice (no eligibility rules)
- Retired Player Database with HoF eligibility
- Full `RetiredPlayer` interface (8 fields)

**v2 DEFERS:**
- Re-adding retired players to future draft classes (retired stays retired in v1)

**SPEC CORRECTIONS (2):**
1. §7.3: Retirement phase runs **three dice roll rounds per team** (not one). Each round, remaining eligible players roll. Retired players exit after their round; survivors re-roll in subsequent rounds. Increases retirement frequency without inflating individual probabilities.
2. §7.4: Remove "Optionally re-added to future draft classes (via Phase 7 pre-draft selection)" — retired players do not return in v1.

**JK's Reasoning:** Three rounds per team ensures adequate retirement rate even with young rosters. Natural variance is acceptable. Jersey retirement ceremony earns v1 — ceremony-first design. Un-retirement is a novelty that can wait for v2.
**Dependencies Flagged:** §9/Phase 7 Draft — remove any UI for selecting returning retired players from the pre-draft flow (consistent with §7.4 deferral). Flag when we reach §9.

---

### §8 — Phase 6: Free Agency
**Ruling:** SIMPLIFY (with spec corrections)
**v1 Scope:**
- §8.1 Purpose: KEEP — two-round FA with personality-driven destinations + salary-matched exchanges (per F-125: ±20% True Value, no position restriction). Cornerstone +10% retention (per C-066). Full personality system drives destinations (per C-052).
- §8.2 Screen Flow: KEEP Screens 1-5 with CORRECTIONS to fallback rule. REMOVE Screen 6 (see §8.4 removal below). Flow becomes: Protection Selection → Dice Roll (2d6 with drag-to-reorder) → Destination Reveal (7-row personality preference table + 3 hidden modifier influences) → Player Exchange (±20% True Value match with revised fallback) → Round Summary. Final summary after both rounds shows net salary/roster/chemistry impact.
- §8.3 Two-Round Structure: KEEP AS-IS — exactly 2 rounds. Round 1 movers can't move in Round 2; Round 1 arrivals CAN depart in Round 2.
- §8.4 Free Agent Pool Signing: REMOVE ENTIRELY — does not fit the 1-for-1 exchange model. Every departure is matched by a return player. There is no unsigned FA pool. Retired player spots from Phase 5 are filled by farm call-ups or the Phase 7 draft, not FA pool signing. This section was a leftover from a traditional FA model that doesn't match the dice-roll exchange design.
- §8.5 Data Operations: KEEP AS-IS — `FreeAgencyResult` interface (8 fields)

**v1 KEEPS:**
- Full 2-round FA with dice roll departure selection (2d6 distribution + drag-to-reorder)
- Personality-driven destination matching (7 personality types → team preferences)
- Hidden modifier influence (Loyalty +15% stay, Ambition → contenders, Cornerstone +10% retention)
- Player exchange with ±20% True Value match
- Round-by-round protection selection
- Round eligibility rules (movers locked, arrivals eligible)
- `FreeAgencyResult` interface (8 fields)

**v2 DEFERS:**
- Nothing deferred to v2

**REMOVED (spec errors):**
- §8.4 Free Agent Pool Signing — removed entirely. Inconsistent with the 1-for-1 exchange model. No unsigned FA pool exists in this system.

**SPEC CORRECTIONS (2):**
1. §8.2 Screen 4 fallback rule revised: ±20% True Value → if no match, expand to ±30% → if still no match, **user selects which player to send from the receiving team's roster** (replaces old rule of auto-sending lowest-salary player + absorbing difference). User always controls the exchange.
2. §8.4 removed — Free Agent Pool Signing is incompatible with the 1-for-1 exchange design. Every departing player is replaced by a returning player. Retired players from Phase 5 leave vacated roster spots filled by farm call-ups or Phase 7 draft, not an FA pool.

**JK's Reasoning:** Full dice roll + personality system earns v1 — this is peak game night design. The ±30% fallback should almost always find someone; if it doesn't, user picks. The FA pool signing was a leftover from a different FA model — every FA move in this system is a 1-for-1 exchange, so no pool accumulates.
**Dependencies Flagged:** No downstream breaks — §8.4 removal is self-contained. Phase 7 Draft and Phase 11 Farm Reconciliation handle roster vacancies from retirements independently.

---

### §9 — Phase 7: Draft
**Ruling:** SIMPLIFY (with spec corrections)
**v1 Scope:**
- §9.1 Purpose: KEEP AS-IS — annual prospect draft from generated pool into farm rosters. All picks → farm. References F-126 (grade distribution), F-127 (rookie salary), F-131 (fat-tail scout deviation).
- §9.2 Screen Flow: SIMPLIFY — **8 screens** (Screen 1 removed). Flow becomes: Draft Class Preview → Draft Order Reveal → Draft Board → Pick Selection Modal → Release Player Modal (conditional) → Pick Confirmation → Undrafted Retirements → Draft Summary. Screen 4 (Draft Board) visibility correction: scouted grade, primary position, secondary position, chemistry, personality, potential ceiling are VISIBLE. **Traits and true ratings are HIDDEN** — revealed only at call-up.
- §9.3 Draft Class Generation: KEEP AS-IS — size formula `40 + (numTeams × 2)`, full A–D bell curve (9 grade tiers, per F-126), position weighting (12 positions), chemistry 20% each of 5 types, trait ratio 30/50/20. Reuses Mode 1 §8.4 prospect generation.
- §9.4 Scouting Accuracy: KEEP AS-IS — 12-position accuracy table (65%–85%), fat-tail deviation formula `σ = (100 - accuracy) / 22` (per F-131). Rare outliers ±3-4 steps.
- §9.5 Draft Rounds & Order: KEEP AS-IS — configurable rounds (default 4), reverse expected WAR order, three options per pick (select, pass/skip, auto-draft highest ceiling).
- §9.6 Draft-Round Salary: KEEP AS-IS — 4-tier salary table (R1 $2.0M, R2 $1.2M, R3 $0.7M, R4+ $0.5M per F-127). Locked through rookie season.

**v1 KEEPS:**
- 8-screen draft ceremony (Screen 1 removed)
- Full draft class generation with A–D bell curve and position weighting
- Full scouting accuracy system with fat-tail deviation model
- Draft board showing scouted grade, primary position, secondary position, chemistry, personality, potential ceiling
- Auto-draft option for AI teams (highest-ceiling selection)
- Configurable rounds with reverse-WAR draft order
- Draft-round salary locked through rookie season
- Release player modal when farm at 10 max
- Undrafted retirements to inactive database

**v2 DEFERS:**
- Nothing deferred to v2

**REMOVED (consistency with prior ruling):**
- Screen 1 (Pre-Draft Inactive Player Selection) — removed. Per §7 ruling, retired players stay retired in v1. No un-retirement via draft class.

**SPEC CORRECTIONS (3):**
1. §9.2: Remove Screen 1 entirely. Draft flow is now 8 screens starting with Draft Class Preview. Consistent with §7.4 ruling (retired stays retired in v1).
2. §9.2 Screen 4 (Draft Board) visibility: traits are HIDDEN at draft time. Visible information is scouted grade, primary position, secondary position, chemistry type, personality, and potential ceiling only. True ratings and traits are revealed at call-up, not at draft. Each team's scout provides their own scouted grades — these are not the real ratings.
3. §9.2 Screen 4: Remove trait display line ("Traits (if any — ~30% have 0, ~50% have 1, ~20% have 2)") from draft board visible information. Trait distribution still applies to generated prospects — it's just not visible until call-up.

**JK's Reasoning:** Full scouting system earns v1 — hidden info is what makes drafting feel like real scouting. Auto-draft needed for AI teams. Screen 1 removed for consistency with §7 un-retirement deferral. Traits hidden at draft: the scout gives you grades and ceiling, personality and chemistry are observable, but you don't know their traits until you call them up.
**Dependencies Flagged:** §7 ruling (retired stays retired) — Screen 1 removal is consistent. Phase 11 Farm Reconciliation and Phase 13 Finalize & Advance handle call-up, which is when traits and true ratings are revealed.

---

### §10 — Phase 8: Salary Recalculation #2
**Ruling:** KEEP AS-IS
**v1 Scope:** Everything —
- §10.1 Purpose: KEEP — second salary pass incorporating roster changes from Phases 4–7 (expansion, retirements, FA, draft)
- §10.2 Process: KEEP — same formula as Phase 3 (§5.5). Draft picks keep draft-round salary. FA acquisitions and expansion players recalculated with new team context. Retired player salaries removed from payroll.
- §10.3 UI: KEEP — condensed 3-screen flow (overview dashboard → team summary → league summary). No manager distribution in this pass.

**v2 Deferred:** Nothing
**JK's Reasoning:** Triple salary recalc confirmed v1 in §1 ruling. This is pass #2 of 3 — straightforward reuse of the §5.5 formula on updated rosters.
**Dependencies Flagged:** N/A — §5.5 formula confirmed v1. All upstream roster changes (§6–§9) confirmed v1.

---

### §11 — Phase 9: Offseason Trades
**Ruling:** SIMPLIFY (with spec corrections)
**v1 Scope:**
- §11.1 Purpose: KEEP AS-IS — open trade window, no salary matching. Fan morale + AI evaluation provide natural constraints.
- §11.2 Screen Flow: SIMPLIFY — **7 screens** (Screens 5–6 removed). Flow becomes: Trade Interface → Beat Reporter Warnings (per F-133, advisory not blocking) → Trade Proposal Confirmation → AI Response (accept/reject/counter) → Waiver Wire Claim → Waiver Wire Results → Trade History.
- §11.2 Screen 4 (AI Response): KEEP with CLARIFICATION — 5-factor weighted AI trade logic (value 30%, needs 25%, future value 20%, competitive window 15%, chemistry 10%) applies to **AI-controlled teams only** when evaluating user-initiated proposals. This is not a universal trade evaluation — human teams make their own decisions.
- §11.2 Screens 7–8 (Waiver Wire): KEEP with CORRECTION — waiver wire source is **players cut during offseason phases** (farm overflow resolution, release decisions from draft/trade roster management). NOT retirements — retired players go to inactive database permanently per §7 ruling. Reverse standings order for claim priority.
- §11.3 Tradeable Assets: KEEP AS-IS — MLB players (22-man roster), farm prospects (salary shown, true ratings hidden), draft swaps (upcoming year only).
- §11.4 Three-Team Trades: KEEP AS-IS — fully supported, each team sends ≥1 and receives ≥1.
- §11.5 Counter-Offers: KEEP AS-IS — CPU generates counters on borderline proposals. AI-controlled teams only.
- §11.6 Player Morale Effects: KEEP AS-IS — 6-row table (trade shock -10, personality modifiers for COMPETITIVE/EGOTISTICAL/TIMID/JOLLY/TOUGH).
- §11.7 Trade Veto: KEEP AS-IS — multiplayer only, simple majority of non-trading human teams.

**v1 KEEPS:**
- 7-screen trade flow (AI-initiated proposal screens removed)
- User-initiated trades with AI accept/reject/counter response
- 5-factor AI trade evaluation logic (AI-controlled teams only)
- Beat reporter pre-decision warnings (advisory, per F-133)
- Full 3-team trade support with flow visualization
- Counter-offer generation for borderline proposals
- Waiver wire for players cut during offseason (farm overflow, release decisions)
- All 6 player morale effects with personality modifiers
- Trade veto for multiplayer (simple majority)
- All tradeable asset types (MLB players, farm prospects, single-year draft swaps)

**v2 DEFERS:**
- AI-initiated trade proposals (Screens 5–6) — v1 is user-initiated only. AI teams respond to proposals but do not proactively generate their own.

**SPEC CORRECTIONS (3):**
1. §11.2: Remove Screens 5–6 (Trade Proposals Inbox, AI Proposal Detail). V1 trades are user-initiated only. AI teams respond to user proposals via Screen 4 (accept/reject/counter) but do not proactively propose trades.
2. §11.2 Screen 4: Clarify that the 5-factor weighted AI trade logic applies to AI-controlled teams evaluating user-initiated proposals only. Not a universal evaluation system.
3. §11.2 Screens 7–8: Waiver wire source corrected — players available are those **cut during offseason phases** (farm overflow from draft/trades, release decisions), NOT retired players. Per §7 ruling, retired players go to inactive database permanently and do not appear on waivers.

**JK's Reasoning:** User-initiated trades only for v1 — AI responding is essential, AI proactively proposing is a v2 enhancement. AI trade logic earns v1 because AI teams need to make intelligent accept/reject/counter decisions. Waiver wire stays but the source should be cut players from offseason roster management, not retirements.
**Dependencies Flagged:** §7 ruling (retired stays retired) — waiver wire source correction is consistent. AI-initiated proposals are self-contained; removing them has no downstream impact.

---

### §12 — Phase 10: Salary Recalculation #3
**Ruling:** KEEP AS-IS
**v1 Scope:** Everything —
- §12.1 Purpose: KEEP — third and final salary pass incorporating trade changes from Phase 9. Establishes definitive salary baseline for upcoming season.
- §12.2 Process: KEEP — same formula as Phases 3/8 (§5.5). Final league-wide pass. Phase 11 farm reconciliation and Phase 13 call-ups/send-downs trigger per-player recalc only.
- §12.3 UI: KEEP — condensed 3-screen flow (overview → team summary → league summary). Same format as Phase 8.

**v2 Deferred:** Nothing
**JK's Reasoning:** Triple salary recalc confirmed v1 in §1 ruling. This is pass #3 of 3 — locks in the definitive baseline before the season starts.
**Dependencies Flagged:** N/A — §5.5 formula confirmed v1. §11 trades confirmed v1.

---

### §13 — Phase 11: Farm Reconciliation
**Ruling:** KEEP AS-IS
**v1 Scope:** Everything —
- §13.1 Purpose: KEEP — standalone phase (per C-049). Enforce 10-player farm max, reset option counters, handle farm overflow from trades/expansion. Farm morale calc excludes `recentPerformance` (per C-042 — no simulated stats for prospects).
- §13.2 Operations: KEEP all 3 — option counter reset (per-season), farm overflow resolution (user picks for human teams, AI releases lowest-ceiling for AI teams, released → inactive DB), farm morale update (4 factors: draft position, team competitiveness, MLB opportunities, peer comparison).
- §13.3 Data Model: KEEP — `FarmReconciliationResult` interface (5 fields: teamId, releasedPlayers, optionResets, finalFarmCount ≤10, moraleUpdates).

**v2 Deferred:** Nothing
**JK's Reasoning:** Essential roster integrity phase — farm cap enforcement and morale update both needed before Finalize & Advance.
**Dependencies Flagged:** N/A — all upstream phases confirmed v1. §15 Finalize & Advance depends on clean farm rosters from this phase.

---

### §14 — Phase 12: Chemistry Rebalancing
**Ruling:** KEEP AS-IS
**v1 Scope:** Everything —
- §14.1 Purpose: KEEP — recalculate team chemistry after all offseason roster moves. Chemistry affects trait potency → salary → gameplay. Uses real SMB4 names (per F-124): Competitive, Crafty, Disciplined, Spirited, Scholarly.
- §14.2 Chemistry Calculation: KEEP — `TeamChemistry` interface (5 fields: teamId, composition, dominantType, tier 1–4, traitPotencyMultiplier). `ChemistryType` enum (5 values). 4-row tier table: Tier 1 (no type >30%) = 1.00×, Tier 2 (30–44%) = 1.25×, Tier 3 (45–59%) = 1.50×, Tier 4 (60%+) = 1.75×.
- §14.3 Screen Flow: KEEP — 3 screens (Chemistry Changes Overview with before/after per team → Detailed Team View showing which roster moves caused the shift → Phase Summary with league-wide tier distribution).

**v2 Deferred:** Nothing
**JK's Reasoning:** Pure math — count chemistry types, determine tier, set multiplier. Feeds directly into salary/trait systems already confirmed v1.
**Dependencies Flagged:** N/A — all upstream roster-change phases confirmed v1. Mode 2 §13 chemistry system confirmed v1.

---

### §15 — Phase 13: Finalize & Advance
**Ruling:** KEEP AS-IS (with spec correction — Team Captain screen added)
**v1 Scope:** Everything —
- §15.1 Purpose: KEEP — final validation, season transition, advancement to next season. Completion triggers Mode 2.
- §15.2 Screen Flow: KEEP with ADDITION — **12 screens** (Team Captain screen added after Chemistry Rebalancing Summary per §4 ruling). Flow becomes:
  - Screen 1: Roster Management (Main) — call-ups/send-downs to reach 22 MLB + 10 Farm per team
  - Screen 2: Call-Up Confirmation — status → ROOKIE, salary stays at draft-round rate (per F-127), true ratings revealed (scouted grades replaced), dramatic scouted-vs-true comparison ceremony. **Traits also revealed at call-up** (per §9 ruling — hidden at draft)
  - Screen 3: Send-Down Confirmation — demotion retirement risk (5-factor table: age 34+ = +20%, prior demotions 2+ = +15% per, high salary = +10%, low Resilience = +10%, high Resilience = -10%), high-grade warning, beat reporter warning (per F-133)
  - Screen 4: AI Processing Summary — AI teams auto-resolve (call-ups by highest ceiling, send-downs by lowest WAR)
  - Screen 5: Validation Summary — every team must hit exactly 22 MLB + 10 Farm = 32. Cannot advance until all valid.
  - Screen 6: Transaction Report — all roster changes formatted for SMB4 sync reference
  - Screen 7: Season Transition Processing — player aging (+1 year), salary recalc (affected players only), mojo reset confirmation, stats initialization, schedule generation
  - Screen 8: Chemistry Rebalancing Summary — recap of Phase 12 (read-only)
  - **Screen 9: Team Captain Designation (NEW)** — per §4 ruling, moved from Awards Ceremony. Highest (Loyalty + Charisma) per team on the finalized roster (per Mode 2 §17.6/C-053). Calculated AFTER all roster changes (FA, draft, trades, call-ups/send-downs) so captain is from the actual next-season roster. Captain designation handed to Mode 2 for the upcoming season.
  - Screen 10: Advance Confirmation — Season N summary (wins, losses, championship, MVP), key offseason moves, roster changes, "Start Season N+1" button
  - Screen 11: Post-Advance Welcome — next season overview, key matchups, storylines to watch (conditional on narrative engine)
  - Screen 12: Add Game Modal (conditional — if schedule empty)
- §15.3 Season Archive: KEEP — `SeasonArchive` interface (11 fields: seasonNumber, finalStandings, championTeamId, mvpPlayerId, awardsGiven, retiredPlayers, draftPicks, trades, freeAgencyMoves, rosterSnapshots, teamStats/playerStats)

**v2 Deferred:** Nothing

**SPEC CORRECTION (1):**
1. §15.2: Add Team Captain Designation screen after Chemistry Rebalancing Summary (new Screen 9). Per §4 ruling, Team Captain was removed from Awards Ceremony (Phase 2) and moved to Phase 13. Captain is designated based on highest (Loyalty + Charisma) hidden modifiers per team, calculated on the finalized roster after all offseason roster changes are complete. Same logic as Mode 1: captain assigned at franchise creation → handed to Mode 2. In Mode 3: captain reassigned after roster finalization → handed to Mode 2 for next season.

**JK's Reasoning:** Everything earns v1. Demotion retirement risk adds meaningful consequence to send-down decisions. Call-up reveal ceremony (scouted-vs-true) is peak ceremony-first design. Team Captain goes after chemistry rebalancing — all roster moves done, captain calculated on actual next-season roster.
**Dependencies Flagged:** §4 ruling (Team Captain moved to Phase 13) — resolved here. §9 ruling (traits revealed at call-up) — Screen 2 confirms traits + true ratings revealed together. Mode 2 §17.6 defines Team Captain formula (Loyalty + Charisma).

---

### §16 — Shared Systems Reference
**Ruling:** KEEP AS-IS (with spec corrections)
**v1 Scope:** Everything — all 6 shared system references kept:
- §16.1 Personality System: KEEP with CORRECTION — Mode 3 consumes for FA destinations (Phase 6), retirement probability (Phase 5), trade morale (Phase 9), Team Captain selection (**Phase 13**, not Phase 2 — corrected per §4/§15 rulings)
- §16.2 Chemistry & Trait Potency: KEEP AS-IS — trait potency after assignment (Phase 2), FA exchange eval (Phase 6), trade preview (Phase 9), rebalancing (Phase 12). Potency only, never eligibility (per C-086/C-064).
- §16.3 Salary System: KEEP AS-IS — triple recalc (Phases 3/8/10), rookie salary at draft (Phase 7), retired player salary removal (Phase 5), expansion player salary init (Phase 4)
- §16.4 Farm System: KEEP AS-IS — farm reconciliation (Phase 11), draft-to-farm pipeline (Phase 7), call-up/send-down in finalization (Phase 13)
- §16.5 Scouting System: KEEP AS-IS — draft prospect evaluation (Phase 7), call-up reveal ceremony (Phase 13), scout accuracy by position
- §16.6 Prospect Generation: KEEP with CORRECTION — annual draft class creation (Phase 7). REMOVE "retired players can re-enter draft class" — per §7 ruling, retired players stay retired in v1.

**v2 Deferred:** Nothing

**SPEC CORRECTIONS (2):**
1. §16.1: Team Captain reference changed from "Phase 2" to **Phase 13** — per §4 ruling (moved from Awards Ceremony) and §15 ruling (Screen 9 in Finalize & Advance).
2. §16.6: Remove "Inactive player database integration: retired players can re-enter draft class" — per §7 ruling, retired stays retired in v1. No un-retirement via draft class.

**JK's Reasoning:** Reference section — no new logic, just cross-references. Two corrections for consistency with prior rulings.
**Dependencies Flagged:** N/A — this section documents dependencies, doesn't create them.

---

### §17 — Franchise Type Implications
**Ruling:** KEEP AS-IS (with spec correction)
**v1 Scope:** Everything —
- §17.1 Solo (1P): KEEP AS-IS — user manages one team, AI auto-resolves in human-only phases, user is commissioner
- §17.2 Couch Co-Op: KEEP AS-IS — all teams human, no AI auto-resolution, full ceremony for every team, turn order by standings/alphabetical
- §17.3 Custom: KEEP AS-IS — 2+ human + AI teams, human teams get full ceremony, AI auto-resolves, commissioner powers for all human managers
- §17.4 Phase Scope Configuration: KEEP with CORRECTION — `OffseasonPhaseConfig` interface (3 fields), full 13-row default scope table. Phase 9 AI resolution description corrected.

**v2 Deferred:** Nothing

**SPEC CORRECTION (1):**
1. §17.4: Phase 9 (Trades) AI resolution description changed from "AI proposes/accepts based on logic" to **"AI responds to user-initiated proposals (accept/reject/counter)"** — per §11 ruling, AI-initiated trade proposals are deferred to v2.

**JK's Reasoning:** Configuration backbone — all three franchise types and the full phase scope table needed for v1. One correction for consistency with §11 ruling.
**Dependencies Flagged:** N/A — §11 ruling (user-initiated only) already recorded. This is the config-level reflection of that decision.

---

### §18 — Data Architecture
**Ruling:** KEEP AS-IS
**v1 Scope:** Everything —
- §18.1 Storage: KEEP — 8 IndexedDB stores (offseasonStateStore, awardsStore, ratingsAdjustmentStore, retirementStore, freeAgencyStore, draftStore, tradeStore, seasonArchiveStore) mapped to specific phases
- §18.2 Cross-Store Operations: KEEP — 3 multi-store patterns (player trade → playerStore + tradeStore + salaryStore; retirement → playerStore + retirementStore + salaryStore + careerStore; draft pick → draftStore + farmRosterStore + salaryStore)
- §18.3 Offseason State Machine: KEEP — `OffseasonPhaseTransition` type (from/to/guard). Strictly sequential 0→1→...→13→complete. No skipping except Phase 4 (optional).

**v2 Deferred:** Nothing
**JK's Reasoning:** Essential plumbing — all 13 phases need persistence. Live stores after Phase 13 completion serve as the post-offseason roster state handed to Mode 2 (no separate exit snapshot needed).
**Dependencies Flagged:** N/A — FRANCHISE_MODE_SPEC defines IndexedDB architecture. All phases confirmed v1.

---

### §19 — V2 Material (Explicitly Out of Scope)
**Ruling:** KEEP AS-IS (with updates from triage)
**v1 Scope:** Keep this section as a quick-reference "don't build this" list within the gospel. Update the table to include all deferrals from our triage. Note that V2_DEFERRED_BACKLOG.md is the authoritative source.

**Updated v2 table (original 9 + 5 new from triage):**

| Feature | Status | Notes |
|---------|--------|-------|
| Contraction | Removed from v1 (C-041/C-085) | Expansion only in v1 |
| Salary cap (hard/soft) | Removed from v1 (C-051) | Soft pressure via fan morale only |
| Arbitration | Future | Not in v1 offseason economics |
| Revenue sharing | Future | Not in v1 |
| Sound effects / animations | Polish layer | V2 (core ceremonies have animation specs but detailed SFX deferred) |
| Multiplayer turn management | V2 | Couch Co-Op handles turn order via standing order |
| Multi-year draft pick trades | Future | V1 allows current-year draft swaps only |
| AI game simulation during offseason | Future | Offseason is fully user-driven |
| Cloud sync for offseason state | Future | Requires account system |
| Streamlined Mode (§2) | V2 | Game Night Mode only in v1; Streamlined is a UX optimization |
| 5% regular player trait lottery (§4) | V2 | Trait rewards reserved for award winners/top performers only |
| Un-retirement via draft class (§7/§9) | V2 | Retired stays retired in v1 |
| AI-initiated trade proposals (§11) | V2 | V1 is user-initiated trades only; AI responds but doesn't propose |
| Custom stadium creation (§6) | V2 | No basis in SMB4 — stadium picker uses existing SMB4 stadiums |

**Note:** V2_DEFERRED_BACKLOG.md is the authoritative deferral record (per Mode 2 §27 ruling). This table is a quick reference within the gospel.

**JK's Reasoning:** Belt and suspenders — if someone reads only the gospel, they still see the fence. V2_DEFERRED_BACKLOG.md has full detail with dependencies for code alignment.
**Dependencies Flagged:** N/A — reference section.

---

### §20 — Cross-References
**Ruling:** KEEP AS-IS
**v1 Scope:** Everything —
- Gospel cross-references (4 rows): SPINE_ARCHITECTURE, MODE_1, MODE_2, ALMANAC relationship map
- Source Specs Consumed (16 rows): 10 fully consumed (OFFSEASON_SYSTEM_SPEC + 8 Figma specs + EOS_RATINGS_ADJUSTMENT_SPEC), 6 partially consumed with remaining valid content noted (SALARY_SYSTEM_SPEC, FARM_SYSTEM_SPEC, TRADE_SYSTEM_SPEC, PERSONALITY_SYSTEM_SPEC, SCOUTING_SYSTEM_SPEC, PROSPECT_GENERATION_SPEC)

**v2 Deferred:** Nothing
**JK's Reasoning:** Provenance record — documents which source specs fed into this gospel. No changes needed from triage.
**Dependencies Flagged:** N/A — documentation only.

---

### §21 — Decision Traceability
**Ruling:** KEEP AS-IS (with spec correction)
**v1 Scope:** Everything —
- STEP4 Decisions table (17 rows): C-041 through C-094, each mapped to affected sections
- Reconciliation Findings table (8 rows): F-124 through F-133, each mapped to affected sections

**v2 Deferred:** Nothing

**SPEC CORRECTION (1):**
1. C-053 section reference: change "§4.2 (Screen 11)" to **§15.2 (Screen 9)** — per §4 ruling (Team Captain removed from Awards Ceremony) and §15 ruling (Team Captain added as Screen 9 in Finalize & Advance).

**JK's Reasoning:** Audit trail — keep as-is with the C-053 reference correction so traceability stays accurate.
**Dependencies Flagged:** N/A — documentation only. Correction flows through from §4/§15 rulings.

---

