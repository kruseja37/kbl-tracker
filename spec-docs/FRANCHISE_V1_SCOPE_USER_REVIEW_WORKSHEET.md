# Franchise v1 Scope User Review Worksheet

This worksheet condenses `FRANCHISE_V1_SCOPE_DECISION_BOARD_DRAFT.md` into a practical review aid. It uses `FRANCHISE_REPO_SPEC_CROSSWALK.md` as supporting context for repo status, risk, and implementation maturity.

This worksheet does not lock Franchise v1 scope. It does not create a roadmap. It does not change the draft recommendations.

## 1. How to use this worksheet

Review each decision and mark one user decision:

- [ ] approve
- [ ] modify
- [ ] reject
- [ ] discuss

`Approve` means the recommendation is acceptable as written for a future locked v1 scope doc. `Modify` means the direction is close, but the scope wording should change. `Reject` means the recommendation should not carry forward. `Discuss` means the decision needs more product judgment, evidence, or tradeoff conversation before scope is locked.

Roadmap creation comes only after user decisions are locked in a separate v1 scope document. Nothing in this worksheet is final.

## 2. Fast approvals

These are items Codex recommended with high confidence and comparatively low controversy because the repo evidence is strong, the feature is core-loop infrastructure, or the behavior is already stable/read-only.

| Decision ID | Feature | Codex recommendation | One-line rationale | User decision |
|---|---|---|---|---|
| FVB-D001 | Franchise setup and save-slot handoff | Must include in v1 | Franchise needs a trustworthy copy-not-reference save slot before anything else matters. | [ ] approve [ ] modify [ ] reject [ ] discuss |
| FVB-D007 | Franchise Home, schedule display, and scored-game launch | Must include in v1 | This is the playable season hub and the route into scoped GameTracker games. | [ ] approve [ ] modify [ ] reject [ ] discuss |
| FVB-D008 | Core GameTracker event model and one-tap scoring | Must include in v1 | Scored events are the source of truth for stats, standings, history, and analysis. | [ ] approve [ ] modify [ ] reject [ ] discuss |
| FVB-D010 | Active-game autosave, resume, completion, and archive | Must include in v1 | Long-running franchise use requires games to survive refresh and archive cleanly. | [ ] approve [ ] modify [ ] reject [ ] discuss |
| FVB-D014 | Stats pipeline, season leaders, career/almanac registration | Must include in v1 | Franchise mode needs durable stats, leaders, and history to feel like more than exhibition scoring. | [ ] approve [ ] modify [ ] reject [ ] discuss |
| FVB-D015 | LI/WPA, clutch, manager WPA, and Game Detail audit surfaces | Include if already stable | This is already one of the repo's strongest differentiators and adds rich analysis without expanding mutation scope. | [ ] approve [ ] modify [ ] reject [ ] discuss |
| FVB-D025 | Playoff bracket, launch, series advancement, stats, and leaders | Must include in v1 | Playoffs are well-supported and give the regular season a satisfying finish. | [ ] approve [ ] modify [ ] reject [ ] discuss |
| FVB-D029 | Season-end summary and Mode 2 -> Mode 3 handoff | Must include in v1 | Multi-season franchise needs a durable season summary and offseason handoff. | [ ] approve [ ] modify [ ] reject [ ] discuss |
| FVB-D031 | Ratings and salary adjustment phase | Include if already stable | This is one of the few mutation-capable offseason systems already wired. | [ ] approve [ ] modify [ ] reject [ ] discuss |
| FVB-D037 | Farm roster storage, options, call-ups, send-downs, and movement mechanics | Must include in v1 | Roster/farm movement is needed for offseason correction and multi-season continuity. | [ ] approve [ ] modify [ ] reject [ ] discuss |
| FVB-D039 | Phase 11 roster lock, correction actions, and new-season transition | Must include in v1 | Without this, Franchise v1 is effectively one-season-only. | [ ] approve [ ] modify [ ] reject [ ] discuss |
| FVB-D041 | Core storage isolation, save-slot metadata, active franchise, and scoped reads | Must include in v1 | Storage isolation is the trust boundary for every franchise feature. | [ ] approve [ ] modify [ ] reject [ ] discuss |
| FVB-D043 | Almanac and historical read consumers | Include if already stable | Read-only historical consumers make completed games inspectable without adding mutation risk. | [ ] approve [ ] modify [ ] reject [ ] discuss |
| FVB-D045 | Roster analyzer, optimal lineup, and advisory surfaces | Preview/read-only for v1 | Advisory surfaces are useful and low-risk when they do not mutate roster state. | [ ] approve [ ] modify [ ] reject [ ] discuss |

## 3. Likely deferrals

These are items Codex recommended deferring. Only FVB-D044 is high-confidence in the draft; the rest are likely deferrals with medium confidence and should still be reviewed rather than treated as automatic.

| Decision ID | Feature | Codex recommendation | Why defer is safe or wise | User decision |
|---|---|---|---|---|
| FVB-D044 | Cloud sync, accounts, archive-vs-delete, revenue sharing, arbitration, multi-year contracts | Post-v1 | High confidence: these are platform/economy expansions, not needed for a local-first trustworthy v1. | [ ] approve [ ] modify [ ] reject [ ] discuss |
| FVB-D006 | Optional startup fantasy/prospect draft and abbreviated Playoff Mode setup | Post-v1 | Medium confidence: normal franchise setup can work first; draft-built setup variants increase initialization risk. | [ ] approve [ ] modify [ ] reject [ ] discuss |
| FVB-D024 | Special modifier registry and farm/injury event depth | Post-v1 | Medium confidence: this depends on morale, relationships, narrative, injuries, and farm persistence. | [ ] approve [ ] modify [ ] reject [ ] discuss |
| FVB-D026 | Abbreviated Playoff Mode entry point | Post-v1 | Medium confidence: playoff operations are already useful after a season; direct bracket-only setup can wait. | [ ] approve [ ] modify [ ] reject [ ] discuss |
| FVB-D036 | Expansion, contraction, stadium changes, spring training, farm reconciliation, and chemistry offseason tabs | Post-v1 | Medium confidence: these tabs are placeholder, ambiguous, or optional and would widen v1 too much. | [ ] approve [ ] modify [ ] reject [ ] discuss |
| FVB-D040 | Farm narratives, warnings, recommendations, farm events, and revenge arcs | Post-v1 | Medium confidence: movement mechanics can ship first; narrative consequences need other deferred systems. | [ ] approve [ ] modify [ ] reject [ ] discuss |
| FVB-D048 | SMB4 generators, profile engines, and historical conversion tools | Post-v1 | Medium confidence: content generators should follow user decisions on draft/import scope. | [ ] approve [ ] modify [ ] reject [ ] discuss |

## 4. Needs discussion

These items have medium/low confidence, product-taste tradeoffs, fun-factor versus complexity tradeoffs, or ambitious specs with partial repo implementation. Use the explicit options to keep discussion concrete.

| Decision ID | Feature | Draft recommendation | Why discuss | Explicit decision options |
|---|---|---|---|---|
| FVB-D002 | Franchise type and team control semantics | Simplify for v1 | Product-defining: how much Solo/Couch/Custom behavior should v1 promise? | Approve simplified control / Modify for full franchise types / Defer multi-team semantics / Discuss |
| FVB-D003 | League, team, roster, and rules template baseline | Include if already stable | Useful setup baseline, but exact import/validation/rules breadth is not proven. | Keep stable template baseline / Narrow to seeded data / Expand setup requirements / Discuss |
| FVB-D004 | Player import, generation, traits, and hidden personality depth | Simplify for v1 | Visible player data is useful; hidden personality depth may overbuild before downstream systems are ready. | Visible data only / Add limited hidden fields / Full personality contract / Discuss |
| FVB-D005 | Schedule setup contract | Needs user decision | Direct spec/repo mismatch: specs prefer user-driven/empty schedule; repo auto-generates. | Approve auto-generated v1 default / Require empty/manual start / Require import path / Discuss |
| FVB-D009 | Between-play events, substitutions, pitcher changes, and user-observed mojo/fitness | Simplify for v1 | Baseball correctness is important, but full long-term modifier effects are not necessary. | Include baseball-critical events / Add more long-term state / Narrow to minimum scoring / Discuss |
| FVB-D011 | Regular-season skipped games, batch operations, and season completion | Include if already stable | Skip is useful; batch operations may bypass trust if not proven. | Include manual skip only / Include batch skip if stable / Require simulation instead / Discuss |
| FVB-D012 | AI-vs-AI regular-season simulation | Needs user decision | This strongly affects whether full-league seasons are practical without scoring every game. | Keep guarded / Allow skip-only v1 / Include simplified stat-bearing sim / Discuss |
| FVB-D013 | Standings, playoff qualification, tiebreaks, and trade deadline | Simplify for v1 | Basic standings are needed; advanced tiebreak/deadline details are less proven. | Basic standings/playoff eligibility / Full tiebreak/deadline scope / Defer advanced math / Discuss |
| FVB-D016 | WAR, fielding precision, pitching achievements, and advanced stat calibration | Simplify for v1 | Advanced stats are valuable, but full spec parity is not proven. | Display stable advanced stats / Full WAR calibration / Basic stats only / Discuss |
| FVB-D017 | Awards, dynamic designations, True Value, and ROI leaderboards | Preview/read-only for v1 | Big flavor upside, but full durable carryover is cross-system heavy. | Read-only flavor / Mutating designations / Defer entirely / Discuss |
| FVB-D018 | Salary formula and salary recalculation | Simplify for v1 | Salary matters, but True Value and trigger rules conflict across specs. | Simple salary baseline / Full trigger lifecycle / Defer salary effects / Discuss |
| FVB-D019 | Reporter/news/game stories as flavor layer | Include if already stable | Product-feel decision: enrich v1 without overpromising narrative carryover. | Keep stable read surfaces / Expand narrative / Hide until complete / Discuss |
| FVB-D020 | Milestones, Fame, franchise firsts, and franchise leader persistence | Needs user decision | Detection exists, but franchise first/leader storage is stubbed. | Light milestone alerts / Durable franchise history / Defer milestones / Discuss |
| FVB-D021 | Fan morale and player morale | Guard/defer for v1 | Fun but risky: engine exists, durable lifecycle does not. | Keep guarded / Read-only flavor only / Full morale state / Discuss |
| FVB-D022 | Relationships, chemistry, hidden personality effects, and trait potency | Guard/defer for v1 | Engine exists, but active franchise persistence/formulas are incomplete. | Keep guarded / Cosmetic-only chemistry / Full persisted system / Discuss |
| FVB-D023 | Stadium analytics, park factors, and adaptive standards | Preview/read-only for v1 | Useful flavor, but seed/refinement and WAR integration are unresolved. | Stadium identity only / Read-only analytics / Full park-adjusted stats / Discuss |
| FVB-D027 | Postseason MVP, champion Fame, and playoff narrative rewards | Simplify for v1 | Championship needs meaning, but full Fame/narrative mutation is less proven. | Champion + leaders only / Add MVP/Fame / Full narrative rewards / Discuss |
| FVB-D028 | Canonical offseason phase model | Needs user decision | Specs conflict on 11 vs 13 phases and repo tabs are uneven. | 11-phase model / 13-phase model / Simplified v1 phase list / Discuss |
| FVB-D030 | Awards ceremony and awards mutation | Preview/read-only for v1 | Flavorful but candidate source/franchise ownership is uncertain. | Read-only ceremony / Summary only / Mutating awards / Discuss |
| FVB-D032 | Retirement, retirement ceremony preview, jerseys, and HOF | Simplify for v1 | Retirement mutation exists, but full probability/ceremony/HOF depth is broader. | Explicit retirements only / Add ceremony preview / Full jersey/HOF flow / Discuss |
| FVB-D033 | Free agency mutation | Needs user decision | Central offseason feature, but current adapter is read-only and valuation rules conflict. | Preview-only / Simplified mutation / Full spec FA / Discuss |
| FVB-D034 | Annual draft mutation | Needs user decision | Important for renewal, but current adapter is read-only and generation specs conflict. | Preview-only / Simplified draft mutation / Full annual draft / Discuss |
| FVB-D035 | Offseason trades | Preview/read-only for v1 | Trade mutation touches salary, chemistry, morale, transaction history, and a separate trade spec. | Preview-only / Simplified manual trades / Full trade market / Discuss |
| FVB-D038 | Farm reveal, scouted grades, rookie salary, and prospect control | Simplify for v1 | Reveal exists, but rookie salary/control conflicts remain. | Reveal only / Add scouted grade UI / Full prospect economy / Discuss |
| FVB-D042 | Franchise manager import/export and backup/restore promise | Needs user decision | Export exists but import validates then throws; backup promise needs clarity. | Export diagnostic only / Require restore-capable import / Hide import/export / Discuss |
| FVB-D046 | Synthetic simulation and full AI Game Engine | Needs user decision | Same product fork as FVB-D012, with full AI engine explicitly V2. | Keep guarded / Simplified v1 sim / Full AI engine post-v1 / Discuss |
| FVB-D047 | Advanced standalone engines not yet franchise-complete | Guard/defer for v1 | Engines exist, but user-facing durable lifecycles are not coherent yet. | Keep guarded / Expose read-only outputs / Promote selected engines / Discuss |

## 5. High-impact decisions

These decisions most affect what Franchise v1 feels like to a user.

| Decision ID | Feature | What approve means | What defer means | Why it matters |
|---|---|---|---|---|
| FVB-D001 | Franchise setup and save-slot handoff | v1 starts from isolated copied franchise data. | Franchise mode lacks a trustworthy foundation. | This is the mode's root trust boundary. |
| FVB-D005 | Schedule setup contract | User accepts the chosen v1 schedule policy, likely auto-generated or simplified. | Schedule creation remains ambiguous or manual-only. | It determines whether users can start seasons smoothly and whether specs must be reconciled. |
| FVB-D007 | Franchise Home and scored-game launch | v1 has a usable season hub that launches scoped games. | GameTracker works apart from a weak franchise shell. | This is the daily-use surface. |
| FVB-D008 | Core GameTracker scoring | v1 trusts event-sourced manual scoring. | Downstream stats and history cannot be trusted. | It is the source of truth for the whole mode. |
| FVB-D010 | Active-game persistence/archive | Users can safely resume and archive games. | Real franchise use becomes fragile. | Losing a scored game is a trust breaker. |
| FVB-D012 | AI-vs-AI regular-season simulation | v1 can complete non-human games with stat-bearing generated results. | v1 relies on skip/manual scoring for non-human games. | This defines how practical full-league seasons feel. |
| FVB-D014 | Stats pipeline and leaders | Scored games produce meaningful season/history outputs. | Franchise feels like exhibition scoring. | Stats are the reward loop. |
| FVB-D025 | Playoffs | v1 seasons culminate in brackets and postseason stats. | Regular seasons have less payoff. | Playoffs make season completion feel complete. |
| FVB-D028 | Offseason phase model | v1 gets a user-approved phase contract. | Offseason remains ambiguous and mismatched. | It controls the shape of every Mode 3 decision. |
| FVB-D029 | Season-end handoff | v1 can move from completed season to offseason. | Multi-season play is not credible. | It connects Mode 2 to Mode 3. |
| FVB-D033 | Free agency mutation | Offseason includes meaningful roster movement. | FA remains preview/read-only or absent. | It decides whether offseason feels alive or mostly administrative. |
| FVB-D034 | Annual draft mutation | v1 can replenish rosters/farms through draft. | Renewal relies on existing rosters and correction flows. | It strongly affects multi-season longevity. |
| FVB-D039 | Phase 11/new-season transition | v1 supports roster lock and next-season launch. | The mode is effectively one-season-only. | This is the multi-season gate. |
| FVB-D042 | Import/export promise | v1 either supports real restore or clearly narrows export. | Backup/restore trust remains incomplete. | Long-running saves need expectation clarity. |
| FVB-D046 | Synthetic simulation / AI engine | User chooses whether simplified simulation belongs in v1. | Sim stays guarded and full AI remains post-v1. | It pairs with schedule policy and AI team handling. |

## 6. Suggested review order

1. Foundation/trust first: FVB-D001, FVB-D003, FVB-D005, FVB-D041, FVB-D042.
2. Core gameplay second: FVB-D007, FVB-D008, FVB-D009, FVB-D010, FVB-D011, FVB-D012, FVB-D013, FVB-D046.
3. Playoffs/season-end third: FVB-D025, FVB-D027, FVB-D029, FVB-D039.
4. User-facing richness fourth: FVB-D014, FVB-D015, FVB-D016, FVB-D017, FVB-D018, FVB-D019, FVB-D020, FVB-D023, FVB-D043, FVB-D045.
5. Offseason fifth: FVB-D028, FVB-D030, FVB-D031, FVB-D032, FVB-D033, FVB-D034, FVB-D035, FVB-D036, FVB-D037, FVB-D038.
6. Flavor/post-v1 last: FVB-D002, FVB-D004, FVB-D006, FVB-D021, FVB-D022, FVB-D024, FVB-D026, FVB-D040, FVB-D044, FVB-D047, FVB-D048.

## 7. Blank decision log

| Decision ID | Feature | Codex recommendation | User decision | User notes |
|---|---|---|---|---|
| FVB-D001 | Franchise setup and save-slot handoff | Must include in v1 |  |  |
| FVB-D002 | Franchise type and team control semantics | Simplify for v1 |  |  |
| FVB-D003 | League, team, roster, and rules template baseline | Include if already stable |  |  |
| FVB-D004 | Player import, generation, traits, and hidden personality depth | Simplify for v1 |  |  |
| FVB-D005 | Schedule setup contract | Needs user decision |  |  |
| FVB-D006 | Optional startup fantasy/prospect draft and abbreviated Playoff Mode setup | Post-v1 |  |  |
| FVB-D007 | Franchise Home, schedule display, and scored-game launch | Must include in v1 |  |  |
| FVB-D008 | Core GameTracker event model and one-tap scoring | Must include in v1 |  |  |
| FVB-D009 | Between-play events, substitutions, pitcher changes, and user-observed mojo/fitness | Simplify for v1 |  |  |
| FVB-D010 | Active-game autosave, resume, completion, and archive | Must include in v1 |  |  |
| FVB-D011 | Regular-season skipped games, batch operations, and season completion | Include if already stable |  |  |
| FVB-D012 | AI-vs-AI regular-season simulation | Needs user decision |  |  |
| FVB-D013 | Standings, playoff qualification, tiebreaks, and trade deadline | Simplify for v1 |  |  |
| FVB-D014 | Stats pipeline, season leaders, career/almanac registration | Must include in v1 |  |  |
| FVB-D015 | LI/WPA, clutch, manager WPA, and Game Detail audit surfaces | Include if already stable |  |  |
| FVB-D016 | WAR, fielding precision, pitching achievements, and advanced stat calibration | Simplify for v1 |  |  |
| FVB-D017 | Awards, dynamic designations, True Value, and ROI leaderboards | Preview/read-only for v1 |  |  |
| FVB-D018 | Salary formula and salary recalculation | Simplify for v1 |  |  |
| FVB-D019 | Reporter/news/game stories as flavor layer | Include if already stable |  |  |
| FVB-D020 | Milestones, Fame, franchise firsts, and franchise leader persistence | Needs user decision |  |  |
| FVB-D021 | Fan morale and player morale | Guard/defer for v1 |  |  |
| FVB-D022 | Relationships, chemistry, hidden personality effects, and trait potency | Guard/defer for v1 |  |  |
| FVB-D023 | Stadium analytics, park factors, and adaptive standards | Preview/read-only for v1 |  |  |
| FVB-D024 | Special modifier registry and farm/injury event depth | Post-v1 |  |  |
| FVB-D025 | Playoff bracket, launch, series advancement, stats, and leaders | Must include in v1 |  |  |
| FVB-D026 | Abbreviated Playoff Mode entry point | Post-v1 |  |  |
| FVB-D027 | Postseason MVP, champion Fame, and playoff narrative rewards | Simplify for v1 |  |  |
| FVB-D028 | Canonical offseason phase model | Needs user decision |  |  |
| FVB-D029 | Season-end summary and Mode 2 -> Mode 3 handoff | Must include in v1 |  |  |
| FVB-D030 | Awards ceremony and awards mutation | Preview/read-only for v1 |  |  |
| FVB-D031 | Ratings and salary adjustment phase | Include if already stable |  |  |
| FVB-D032 | Retirement, retirement ceremony preview, jerseys, and HOF | Simplify for v1 |  |  |
| FVB-D033 | Free agency mutation | Needs user decision |  |  |
| FVB-D034 | Annual draft mutation | Needs user decision |  |  |
| FVB-D035 | Offseason trades | Preview/read-only for v1 |  |  |
| FVB-D036 | Expansion, contraction, stadium changes, spring training, farm reconciliation, and chemistry offseason tabs | Post-v1 |  |  |
| FVB-D037 | Farm roster storage, options, call-ups, send-downs, and movement mechanics | Must include in v1 |  |  |
| FVB-D038 | Farm reveal, scouted grades, rookie salary, and prospect control | Simplify for v1 |  |  |
| FVB-D039 | Phase 11 roster lock, correction actions, and new-season transition | Must include in v1 |  |  |
| FVB-D040 | Farm narratives, warnings, recommendations, farm events, and revenge arcs | Post-v1 |  |  |
| FVB-D041 | Core storage isolation, save-slot metadata, active franchise, and scoped reads | Must include in v1 |  |  |
| FVB-D042 | Franchise manager import/export and backup/restore promise | Needs user decision |  |  |
| FVB-D043 | Almanac and historical read consumers | Include if already stable |  |  |
| FVB-D044 | Cloud sync, accounts, archive-vs-delete, revenue sharing, arbitration, multi-year contracts | Post-v1 |  |  |
| FVB-D045 | Roster analyzer, optimal lineup, and advisory surfaces | Preview/read-only for v1 |  |  |
| FVB-D046 | Synthetic simulation and full AI Game Engine | Needs user decision |  |  |
| FVB-D047 | Advanced standalone engines not yet franchise-complete | Guard/defer for v1 |  |  |
| FVB-D048 | SMB4 generators, profile engines, and historical conversion tools | Post-v1 |  |  |

