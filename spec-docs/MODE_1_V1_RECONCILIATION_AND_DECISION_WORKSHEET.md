# Mode 1 v1 Reconciliation and Decision Worksheet

**Status:** Draft for user review  
**Created:** 2026-05-26  
**Scope:** Mode 1 only, with cross-mode handoff contracts where Mode 1 creates or stores data for later modes.  
**Decision state:** No final decisions are made in this document. Codex proposes; user approves, modifies, rejects, or discusses.

## 1. Executive summary

Mode 1 is the one-time League Builder and franchise creation hub. The Mode 1 gospel requires template-based league/team/player setup, user-driven schedule input, salary initialization, optional farm startup, named NPC initialization, save-slot creation, copy-not-reference handoff, and active franchise metadata.

The repo already has a real franchise setup foundation: the wizard exists, franchise records are created, selected data is copied into franchise-owned stores, active franchise metadata is set, and Mode 2 can launch from the created franchise. The strongest current areas are save-slot foundation, scoped copied player/team storage, schedule storage after creation, franchise metadata, and Mode 2 handoff.

The biggest Mode 1 mismatches are schedule policy, full player import/generation depth, exact franchise type semantics, optional startup draft/fantasy setup variants, complete NPC initialization, and import/restore expectations. The schedule issue is especially important: the Mode 1 gospel and Spine say the engine must not auto-generate schedules. The user's carried-forward decision confirms that generated schedules are never acceptable; a season may begin with an empty schedule, and users manually enter SMB4 games one by one in the schedule tab.

This worksheet splits broad all-mode FVB decisions into Mode 1-specific M1 decisions so user review can focus on the creation/handoff contract before any later roadmap or implementation prompts exist.

## 2. Mode 1 current repo-state summary

Current repo evidence comes from `FRANCHISE_REPO_IMPLEMENTATION_INVENTORY.md`, `FRANCHISE_REPO_SPEC_CROSSWALK.md`, and `FRANCHISE_V1_SCOPE_USER_REVIEW_WORKSHEET.md`.

**Already built or mostly built**

- Six-step franchise setup route and wizard are implemented and wired.
- Franchise creation creates metadata/config, copies league/team/player data into franchise-owned stores, creates season metadata, sets the active franchise, and navigates to the franchise home.
- Franchise-scoped player/team storage, schedule storage, and active franchise selection have test evidence.
- League Builder appears to have meaningful CRUD surfaces for leagues, teams, players, rules, and rosters.
- Roster assignments and player/team/rules data can be copied into a franchise instance.
- Schedule storage and manual schedule add/delete exist later in Mode 2.
- Export exists for franchise manager flows.

**Partial or drifted**

- Setup currently auto-generates an initial schedule through `generateSchedule`, which conflicts with Mode 1 and Spine authority.
- Team control supports selected human teams, but exact Solo / Couch Co-Op / Custom semantics and per-team `controlledBy` storage are not proven complete.
- League/team/player/rules templates exist, but full CSV import, duplicate semantics, validation constraints, and all rules preset fields are not proven.
- Player data has visible ratings/traits/personality/chemistry/fame/salary surfaces, but hidden modifiers, exact computed-grade contract, and full import/generation behavior are not proven.
- Fantasy draft and startup prospect draft look prototype/non-franchise or unproven as setup mutations.
- Franchise import validates payloads but is not restore-capable.

**Missing or not proven**

- CSV schedule upload and OCR schedule extraction during setup.
- Empty schedule creation as the normal no-upload path.
- Named NPC initialization for one beat reporter, one manager, and one scout per team.
- Full phase-scope config capture for Mode 3 without implementing Mode 3 behavior.
- Complete copy-not-reference store list matching the gospel's separate-franchise-DB model.
- Mode transition screen as a distinct boundary after initialization.

## 3. Mode 1 gospel requirement summary

Primary Mode 1 authority is `MODE_1_LEAGUE_BUILDER_FINAL.md`. Shared data-contract authority is `SPINE_ARCHITECTURE.md`.

Mode 1 must produce:

- A franchise save slot.
- League structure: conferences, divisions, and team assignments.
- Complete rostered player data: ratings, traits, personality, chemistry type, hidden modifiers, arsenal, handedness, age, gender, positions, fame level, salary, and roster level.
- Farm rosters from a Startup Prospect Draft, or empty farms if skipped.
- Rules configuration snapshot.
- User-provided schedule data, or an empty schedule if none is uploaded.
- Franchise type and per-team control configuration.
- Initialized standings, salary ledger, stats stores, and active franchise metadata.
- One beat reporter, one manager, and one scout per team.
- Copy-not-reference handoff into franchise-owned storage.

Mode 1 must not:

- Track games or at-bats.
- Run offseason phases.
- Generate narrative content.
- Auto-generate schedules.
- Implement Mode 3 phase behavior beyond storing phase-scope config for later consumption.

## 4. Gospel-map omission check

`GOSPEL_CONSOLIDATION_MAP.md` was used only as a coverage sanity check. It points Mode 1 coverage to these source families:

- League Builder core and Figma references.
- Season setup and franchise handoff.
- Franchise save slot creation and storage architecture.
- Grade algorithm.
- Startup prospect generation and scouting.
- Personality assignment and hidden modifiers.
- Initial trait distribution.
- Schedule setup.
- SMB4 player/trait import references.

No major Mode 1 source family from the map is intentionally omitted from this worksheet. Items that belong primarily to Mode 2 or Mode 3 are included only when Mode 1 must create, store, or hand off their initial data.

## 5. Drift/mismatch register

| Area | Authority | Repo evidence | Drift or mismatch | Review impact |
|---|---|---|---|---|
| Schedule creation | Mode 1 §10, §12.1; Spine §3.5 | Crosswalk says setup auto-generates via `generateSchedule` | Direct conflict. No auto-generated schedules are acceptable. | High |
| Empty schedule start | Mode 1 §10.1, §12.1 | Manual add/delete exists after setup; empty startup not proven | Required no-upload behavior is missing or drifted. | High |
| CSV/OCR schedule import | Mode 1 §10.1 | No setup import evidence found | Gospel says both are v1, but repo state may require v1/later decision. | High |
| Franchise type enum | Mode 1 §2, §11.5; Spine §3.4 | Selected teams exist; exact enum and per-team flags not proven | Need Mode 1-specific control contract. | High |
| Offseason phase scopes | Mode 1 §2.5, §11.5 | Offseason state exists; setup phase-scope capture unclear | Mode 1 should store config only, not implement phases. | Medium |
| Player grade | Mode 1 §5.6-§5.7; Spine §3.7 | Grade/salary engines exist | Exact formula and "computed, not stored" contract need review. | Medium |
| Hidden modifiers | Mode 1 §6.3; Spine §3.1 | Visible personality exists; hidden modifiers not proven | Data must exist at handoff even if behavior waits. | High |
| Initial traits | Mode 1 §6.1-§6.4 | Trait fields exist | SMB4 trait import/rescan and generation distribution incomplete. | Medium |
| Farm startup draft | Mode 1 §8 | Farm storage exists; startup draft mutation unproven | Optional/skippable, but farm handoff must be clear. | Medium |
| Named NPCs | Mode 1 §1.2, §12.1, §13.2 | Reporter storage exists; Mode 1 NPC creation not proven | Handoff identity gap for narrative/scouting systems. | Medium |
| Franchise import | Mode 1 §13.4 | Export real; import validate-only | Need expectation clarity if Mode 1 exposes import. | Medium |
| Separate DB model | Mode 1 §13.2 | Repo uses scoped stores/manifest evidence | Strong isolation exists, but exact separate-IndexedDB model may differ. | Medium |

## 6. Mode 1 decision worksheet

Each item below is draft-only. Mark one user decision and add notes.

### M1-D001: Franchise save-slot creation and copy-not-reference handoff

**Related old FVB ID(s):** FVB-D001, FVB-D041  
**Spec source/section:** Mode 1 §1.2, §1.5, §12, §13; Spine §3.4, §5, §6  
**Repo status summary:** Mostly complete. Setup creates franchise metadata, copies league/team/player data into franchise-owned stores, sets active franchise, and navigates to Mode 2. Exact separate IndexedDB-per-franchise model may differ from gospel text, but scoped storage isolation is present.  
**Codex recommendation:** Must include in v1  
**Confidence:** High  
**Rationale:** This is the trust boundary for every franchise. It is also already one of the repo's strongest areas.  
**Consequence of including:** Franchise starts from isolated copied data; later template edits do not mutate active saves.  
**Consequence of deferring:** Mode 1 cannot safely hand off to Mode 2.  
**Dependencies:** League/team/player/rules copy; active franchise metadata; franchiseId on scoped records.  
**Test confidence:** High for current storage/copy foundation; medium for exact gospel store list.  
**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** Approved.  

### M1-D002: League template baseline

**Related old FVB ID(s):** FVB-D003, FSR-004  
**Spec source/section:** Mode 1 §3; Gospel map Mode 1 League Builder specs  
**Repo status summary:** Mostly complete. League Builder CRUD exists, but exact structural constraints, duplicate behavior, branding completeness, and rules default validation are not fully proven.  
**Codex recommendation:** Include if already stable  
**Confidence:** Medium  
**Rationale:** League templates are essential Mode 1 input, but v1 should preserve stable baseline only rather than expanding variants before the core loop is locked.  
**Consequence of including:** Users can select and maintain reusable league structures for franchise creation.  
**Consequence of deferring:** Franchise creation would rely on seeded or hardcoded leagues only.  
**Dependencies:** Team templates, division/conference validation, rules preset references.  
**Test confidence:** Medium.  
**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** Approved. Include stable baseline only; do not expand setup variants until the core loop is locked.  

### M1-D003: Team template baseline

**Related old FVB ID(s):** FVB-D003, FSR-005  
**Spec source/section:** Mode 1 §4  
**Repo status summary:** Partial to mostly complete. Team editor/storage exists and teams copy into franchises. CSV import, duplicate deep-copy behavior, delete warnings, and all validation are not proven.  
**Codex recommendation:** Include if already stable  
**Confidence:** Medium  
**Rationale:** Teams are reusable templates, but v1 should include the stable editing/storage baseline only.  
**Consequence of including:** Users can maintain team identity, branding, stadium, and league membership inputs.  
**Consequence of deferring:** Mode 1 would depend on preexisting teams and would be less useful as a builder.  
**Dependencies:** League membership, player roster assignment, franchise copy.  
**Test confidence:** Medium-low for full CSV/import semantics; medium for stored team data.  
**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Stadium must be part of team identity going into Mode 2 because park factors feed stat tracking. Team chemistry and other Mode-2-feeding identity fields may also need inclusion, with exact required fields to be resolved during Mode 2 decisions.  

### M1-D004: Player database and SMB4 import baseline

**Related old FVB ID(s):** FVB-D004, FSR-006  
**Spec source/section:** Mode 1 §5.1-§5.4, §6.1; Gospel map SMB4 references  
**Repo status summary:** Partial. Player editor and seed/generator-related systems exist; full user CSV import, SMB4 506-player trait completeness, and all data-contract fields are not proven.  
**Codex recommendation:** Simplify for v1  
**Confidence:** Medium  
**Rationale:** Mode 1 needs player records complete enough for franchise handoff, but broad import/generation depth can overexpand setup before the core loop is locked.  
**Consequence of including:** v1 can create franchises from a stable player pool with key visible player data.  
**Consequence of deferring:** Manual setup or seeded rosters become the only trustworthy input path.  
**Dependencies:** Ratings, positions, salary, roster level, traits, personality, chemistry, fame.  
**Test confidence:** Medium for stored/editorial fields; low for full import behavior.  
**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Keep the stable player database and user-created-player path. v1 is sufficient if users can create players, add those players to teams/leagues, include them in franchise setup, and copy them into Mode 2. Do not expand broad import/generation polish before the core loop is locked.  

### M1-D005: Ratings and 13-grade computed contract

**Related old FVB ID(s):** FVB-D004, FVB-D018, FSR-007, C-074/C-087  
**Spec source/section:** Mode 1 §5.6-§5.7; Spine §3.7  
**Repo status summary:** Partial. Grade/salary engines exist, but exact Mode 1 formula, two-way premium, trait/position modifiers, and "grade is computed, not stored" are not fully proven.  
**Codex recommendation:** Must include in v1  
**Confidence:** Medium  
**Rationale:** Ratings and grade display are foundational player handoff data, and the 13-grade scale is authoritative.  
**Consequence of including:** Player quality, salary baseline, and prospect generation can share one grade contract.  
**Consequence of deferring:** Salary initialization and roster evaluation become inconsistent.  
**Dependencies:** Player ratings, trait modifiers, salary initialization, prospect generation.  
**Test confidence:** Medium for existing engines; low-medium for exact gospel parity.  
**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** Approved. Grade is derived from player analyzer logic using ratings, traits, handedness, positions, and related factors. This contract also feeds player generation, the Mode 1 prospect draft, and scouting logic. Future inventory should account for player analyzer work that may be in a dirty worktree.  

### M1-D006: Traits at handoff

**Related old FVB ID(s):** FVB-D004, FVB-D022, FSR-008, FSR-022  
**Spec source/section:** Mode 1 §5.5, §6.1, §6.4-§6.5  
**Repo status summary:** Partial. Trait fields and related engines exist. SMB4 trait import/rescan, initial distribution, farm trait hiding, and chemistry potency are not fully franchise-complete.  
**Codex recommendation:** Simplify for v1  
**Confidence:** Medium  
**Rationale:** Trait data should exist when known, but advanced trait assignment/potency behavior can wait if not stable.  
**Consequence of including:** Player handoff preserves SMB4-style trait identity and future chemistry hooks.  
**Consequence of deferring:** Later systems may need migration or backfill for trait-dependent behavior.  
**Dependencies:** Player import, chemistry type, farm reveal state, Mode 2/3 trait consumers.  
**Test confidence:** Medium-low.  
**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Preserve trait fields at handoff, including imported/manual traits and generation-supported traits where already stable. Defer advanced trait potency, award-based mutation, and full downstream chemistry behavior to Mode 2/3 decisions.  

### M1-D007: Personality visible type and hidden modifiers

**Related old FVB ID(s):** FVB-D004, FVB-D022, FSR-008, FSR-086  
**Spec source/section:** Mode 1 §6.2-§6.3; Spine §3.1, §3.6  
**Repo status summary:** Partial. Visible personality appears editable/stored. Hidden modifiers and balanced generation biases are not proven in franchise handoff.  
**Codex recommendation:** Must include in v1 for data fields; guard/defer behavior for v1  
**Confidence:** Medium-high  
**Rationale:** Hidden modifiers are part of the shared player contract and should exist at handoff, but their behavioral effects belong to later systems.  
**Consequence of including:** Future FA, morale, reporter, captain, and retirement systems have stable data to consume.  
**Consequence of deferring:** Player records may need disruptive migration when personality behavior is added.  
**Dependencies:** Player creation/import/generation, named reporters, Mode 2 narrative surfacing.  
**Test confidence:** Low for hidden modifiers; medium for visible personality.  
**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Store personality type and hidden modifiers at handoff, but hide exact personality from the user by default for better downstream surprise. Personality should surface through behavior, reporter/scout hints, morale/relationship/FA/retirement outcomes, or later reveal mechanics; hidden modifiers should remain non-numeric and not directly exposed.  

### M1-D008: Chemistry type as distinct from personality

**Related old FVB ID(s):** FVB-D004, FVB-D022, FSR-022, FSR-087  
**Spec source/section:** Mode 1 §5.4, §6.2, §6.4; Spine §3.6  
**Repo status summary:** Partial. Chemistry fields exist, but relationship/chemistry potency systems are not franchise-complete.  
**Codex recommendation:** Must include in v1 for data fields; guard/defer potency behavior for v1  
**Confidence:** Medium-high  
**Rationale:** Chemistry type is core SMB4 player identity and must not be confused with the 7 personality types.  
**Consequence of including:** Data handoff stays compatible with future trait potency and team chemistry behavior.  
**Consequence of deferring:** Players lack a required SMB4 identity field and future chemistry features need backfill.  
**Dependencies:** Player import/generation, trait catalogue, future relationship/chemistry systems.  
**Test confidence:** Medium for field presence; low for potency behavior.  
**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** Approved. Chemistry type remains distinct from personality and should be stored as player data; potency/rebalancing behavior depends on later Mode 2/3 decisions.  

### M1-D009: Fame level initialization

**Related old FVB ID(s):** FVB-D004, FVB-D020, C-078  
**Spec source/section:** Mode 1 §5.9; Spine §3.1, §3.6  
**Repo status summary:** Partial. Fame fields/events appear in repo evidence, but full initialization and later franchise first/leader persistence are incomplete.  
**Codex recommendation:** Include if already stable  
**Confidence:** Medium  
**Rationale:** Fame is a handoff field and should start from import/generation rules; fame evolution can wait for Mode 2.  
**Consequence of including:** Established players and generated prospects have proper fame boundaries.  
**Consequence of deferring:** Later narrative/milestone systems lack a clean starting value.  
**Dependencies:** Player import, prospect generation, Mode 2 fame events.  
**Test confidence:** Medium-low.  
**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** Include stable initial fame level as player handoff data. Defer fame evolution, fame events, and leader/franchise-first persistence until Mode 2/3 scope decisions.  

### M1-D010: Salary initialization baseline

**Related old FVB ID(s):** FVB-D018, FVB-D031, FSR-082, C-076  
**Spec source/section:** Mode 1 §8.7, §11.6, §12.3; Spine §3.4  
**Repo status summary:** Mostly complete for salary/grade engines and offseason salary adapter; exact Mode 1 salary ledger initialization is not fully proven.  
**Codex recommendation:** Must include in v1  
**Confidence:** Medium-high  
**Rationale:** Startup salaries determine payroll baseline and startup prospect draft order.  
**Consequence of including:** Franchise starts with usable salary data and later recalculation has a baseline.  
**Consequence of deferring:** Draft ordering, payroll summaries, and salary recalc become unreliable.  
**Dependencies:** Grade/rating contract, copied players, salary ledger or salary fields.  
**Test confidence:** Medium-high for engine; medium for initialization details.  
**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** Salary must be calculated during Mode 1 as rosters are finalized for franchise handoff. Mode 1 must initialize a stable salary/payroll baseline from the approved salary model. Salary recalculation, true-value adjustments, luxury/tax consequences, and offseason salary evolution are Mode 2/3 decisions unless already stable.  

### M1-D011: Roster templates and validation

**Related old FVB ID(s):** FVB-D003, FVB-D037, FSR-009  
**Spec source/section:** Mode 1 §7  
**Repo status summary:** Mostly complete. Roster assignment and analyzer surfaces exist; exact non-blocking validation and optional depth chart completeness are not fully proven.  
**Codex recommendation:** Include if already stable  
**Confidence:** Medium-high  
**Rationale:** Existing rosters are the stable setup path and should be preserved.  
**Consequence of including:** Franchises can start from existing MLB/farm/free-agent assignments.  
**Consequence of deferring:** Setup would need draft or manual assignment before every franchise.  
**Dependencies:** Player/team templates, roster levels, franchise copy.  
**Test confidence:** Medium.  
**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** v1 must hand off a valid franchise roster shape: 22 MLB players and 10 farm players for every team included in the franchise. Roster validation should prevent broken franchise starts. Farm players must be selected via prospect draft during setup or another approved stable assignment flow; the exact farm-population mechanism is resolved in M1-D012. Defer only unrelated setup variants such as fantasy-draft-style roster replacement or broad roster-generation modes.  

### M1-D012: Farm roster handoff and startup prospect draft

**Related old FVB ID(s):** FVB-D006, FVB-D037, FVB-D038, FSR-011, FSR-075  
**Spec source/section:** Mode 1 §8.3-§8.8, §11.6  
**Repo status summary:** Farm storage/movement exists, but startup prospect draft is not proven as a franchise setup mutation.  
**Codex recommendation:** Guard/defer for v1, except preserve existing stable farm roster handoff  
**Confidence:** Medium  
**Rationale:** User decision FVB-D003 says do not expand setup variants until the core loop is locked. Startup draft is optional/skippable in the gospel.  
**Consequence of including:** Farms can be populated through a richer startup draft, but setup complexity increases.  
**Consequence of deferring:** Farms may start from existing roster data or empty farms; annual draft/farm depth can come later.  
**Dependencies:** Prospect generation, scouts, scouted grades, salary initialization, farm reveal state.  
**Test confidence:** Medium for farm storage; low for startup draft mutation.  
**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** v1 must produce a 10-player farm system per franchise team before Mode 2; the farm roster requirement itself is not deferred. Preferred mechanism is the Mode 1 startup prospect draft described in the prospect generation/scouting/farm specs. If the full prospect draft is not stable enough for v1, use a simpler approved farm assignment fallback temporarily, but preserve the Mode 1 to Mode 2/3 farm/scouting handoff contract.  

### M1-D013: Fantasy draft roster mode

**Related old FVB ID(s):** FVB-D006, FSR-010  
**Spec source/section:** Mode 1 §8.1-§8.2, §11.6  
**Repo status summary:** Prototype/non-franchise or unproven as setup handoff mutation.  
**Codex recommendation:** Post-v1  
**Confidence:** Medium  
**Rationale:** It is an alternate setup variant, and the user already requested stable baseline only before expanding setup variants.  
**Consequence of including:** Users could build MLB rosters from scratch before Season 1.  
**Consequence of deferring:** v1 focuses on existing rosters and avoids draft-order/AI-draft mutation risk.  
**Dependencies:** Draft UI, generated pools, AI draft logic, roster writes.  
**Test confidence:** Low.  
**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** Post-v1. Do not confuse fantasy draft roster mode with the startup prospect draft/farm population requirement, which remains required for v1 or needs an approved fallback.  

### M1-D014: Rules preset baseline

**Related old FVB ID(s):** FVB-D003, FSR-012  
**Spec source/section:** Mode 1 §9, §11.3-§11.4; Spine §3.4  
**Repo status summary:** Partial. Rules and season/playoff controls exist; full awards/offseason/AI sliders/read-only default coverage is not fully proven.  
**Codex recommendation:** Include if already stable  
**Confidence:** Medium  
**Rationale:** Rules snapshot is required, but v1 should not expand preset breadth beyond stable fields.  
**Consequence of including:** Franchises carry an immutable rules snapshot for season/playoff setup.  
**Consequence of deferring:** Mode 2 cannot trust season/playoff configuration.  
**Dependencies:** League default rules preset, setup wizard, franchise metadata.  
**Test confidence:** Medium.  
**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** Include stable rules preset/config snapshot at franchise handoff. Avoid expanding rules customization until the core Mode 1 to Mode 2 loop is locked. During implementation/refinement, clean up Mode 1 rules because some current rules are unnecessary or do not apply to SMB4.  

### M1-D015: Season length and games-per-team setup

**Related old FVB ID(s):** FVB-D003, FVB-D005, C-071  
**Spec source/section:** Mode 1 §9.2, §11.3; Spine §3.4  
**Repo status summary:** Season settings exist. Exact bounds differ between Mode 1 and Spine text in places; schedule must not be generated from this value.  
**Codex recommendation:** Must include in v1  
**Confidence:** High  
**Rationale:** User decision allows setup to collect season length/games-per-team, but only for validation/metadata, not automatic schedule generation.  
**Consequence of including:** Manual schedule entry/import can validate expected season size.  
**Consequence of deferring:** Setup lacks basic season metadata.  
**Dependencies:** Rules preset snapshot, schedule validation, standings expectations.  
**Test confidence:** Medium.  
**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** Mode 1 must collect season length/games-per-team as franchise metadata and validation constraints. It must not auto-generate or alter the schedule. If WAR calculations remain in v1 for Mode 2/3, the engine also needs expected games and innings context for adjusted calculations.  

### M1-D016: Franchise type presets

**Related old FVB ID(s):** FVB-D002, FSR-003  
**Spec source/section:** Mode 1 §2.1, §2.4, §11.5; Spine §3.4  
**Repo status summary:** Partial. Users can select controlled teams; exact Solo / Couch Co-Op / Custom enum and semantics are not proven complete.  
**Codex recommendation:** Simplify for v1  
**Confidence:** Medium  
**Rationale:** Mode 1 must capture the intended franchise type, but v1 should keep behavior to control metadata and experience defaults.  
**Consequence of including:** Users can define Solo, Couch Co-Op, or Custom at creation.  
**Consequence of deferring:** Downstream schedule/dashboard behavior cannot distinguish human and AI teams cleanly.  
**Dependencies:** `controlledBy`, humanTeamIds, aiScoreEntry, phase scopes.  
**Test confidence:** Medium-low.  
**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Include franchise type as stored metadata and stable setup defaults only. Defer complex behavior differences between Solo, Couch Co-Op, Custom, and other variants unless already implemented safely.  

### M1-D017: Per-team controlledBy handoff

**Related old FVB ID(s):** FVB-D002, FSR-003  
**Spec source/section:** Mode 1 §2.2-§2.3, §12.1; Spine §3.2  
**Repo status summary:** Partial. Selected human team metadata exists, but per-team copied `controlledBy: human | ai` is not proven for every copied team.  
**Codex recommendation:** Must include in v1  
**Confidence:** Medium-high  
**Rationale:** `controlledBy` is a handoff contract. It gates experience, not access, and should be present before Mode 2/3 consume it.  
**Consequence of including:** Mode 2 can prioritize human team games while preserving commissioner access to all teams.  
**Consequence of deferring:** AI/human dashboard and offseason scope behavior remains ambiguous.  
**Dependencies:** Franchise type, team copy, schedule display, Mode 3 phase scopes.  
**Test confidence:** Low-medium for exact per-team field.  
**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** Mode 1 must store `controlledBy` per franchise team and hand it to Mode 2. It gates gameplay/management responsibilities and UI defaults, not franchise data visibility.  

### M1-D018: AI score entry flag

**Related old FVB ID(s):** FVB-D002, FVB-D012, FVB-D046  
**Spec source/section:** Mode 1 §2.1, §2.3-§2.4, §11.5  
**Repo status summary:** Partial. AI simulation is guarded off; manual skip/score infrastructure exists later. Exact setup flag persistence is not fully proven.  
**Codex recommendation:** Must include in v1 as metadata; guard/defer simulation behavior  
**Confidence:** Medium  
**Rationale:** The flag belongs to Mode 1 configuration, but Mode 1 should not implement AI score entry or simulation behavior.  
**Consequence of including:** Mode 2 can later decide whether AI-vs-AI manual results are available.  
**Consequence of deferring:** Solo/Custom schedules cannot cleanly express AI-vs-AI handling.  
**Dependencies:** Franchise type, schedule display, Mode 2 score entry.  
**Test confidence:** Low-medium.  
**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Mode 1 may store manual/AI score-entry policy as franchise metadata, but v1 will not include any AI or game simulation components during Mode 1 or Mode 2. v1 may support user-entered SMB4 results for applicable games if stable, but must not auto-simulate or auto-generate game results.  

### M1-D019: Offseason phase scope config handoff

**Related old FVB ID(s):** FVB-D002, FVB-D028, FVB-D036  
**Spec source/section:** Mode 1 §2.3-§2.5, §11.5; Spine §3.4  
**Repo status summary:** Partial. Offseason state exists, but setup capture of all phase scopes is unclear.  
**Codex recommendation:** Must include in v1 as stored config only  
**Confidence:** Medium  
**Rationale:** Mode 1 stores phase scopes for Mode 3. It must not be treated as implementing Mode 3 phase behavior.  
**Consequence of including:** Mode 3 has an explicit user-approved scope configuration when implemented or refined.  
**Consequence of deferring:** Later offseason phases must infer human/all-team scope from incomplete setup data.  
**Dependencies:** Franchise type, Mode 3 phase model, metadata storage.  
**Test confidence:** Low-medium.  
**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** Mode 1 stores offseason scope/config for franchise handoff only. Mode 3/offseason implementation decides behavior; Mode 1 should not execute offseason systems.  

### M1-D020: Schedule policy

**Related old FVB ID(s):** FVB-D005, FVB-D011, FSR-013  
**Spec source/section:** Mode 1 §10, §12.1; Spine §3.5  
**Repo status summary:** Overbuilt/drifted. Repo setup auto-generates a schedule; manual add/delete exists later; CSV/OCR setup import is not proven.  
**Codex recommendation:** Must include in v1: no auto-generated schedules; empty schedule allowed; manual SMB4 entry one game at a time allowed  
**Confidence:** High  
**Rationale:** This carries forward the user's explicit decision. Generated schedules are not an acceptable v1 option.  
**Consequence of including:** Schedule behavior aligns with SMB4 reality and avoids fake/generated league calendars.  
**Consequence of deferring:** Franchise setup remains in direct conflict with Mode 1 authority and user decision.  
**Dependencies:** Season length metadata, schedule storage, schedule tab manual entry.  
**Test confidence:** Medium for storage/manual entry; low for setup empty-start path.  
**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** No auto-generated schedules ever. Franchise may start with an empty schedule. Users manually enter SMB4 schedule games one by one in the schedule tab. Season length/games-per-team are metadata and validation only, not generation inputs.  

### M1-D021: CSV schedule upload

**Related old FVB ID(s):** FVB-D005, FSR-013  
**Spec source/section:** Mode 1 §10.1-§10.2  
**Repo status summary:** Missing or not proven for setup.  
**Codex recommendation:** Needs user decision  
**Confidence:** Medium  
**Rationale:** The gospel says CSV upload is v1, but repo evidence does not show it. User may choose whether CSV import is required for Mode 1 v1 or later.  
**Consequence of including:** Users can bulk-load SMB4 schedules if they can prepare CSV data.  
**Consequence of deferring:** Empty start plus manual entry remains the v1 schedule path.  
**Dependencies:** Team abbreviation matching, schedule validation, preview/confirm flow.  
**Test confidence:** Low.  
**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Allow CSV schedule upload only as a user-supplied SMB4 schedule import aid with strict validation and review before acceptance. Manual schedule entry remains the required v1 path. No schedule generation, auto-repair, or inferred games. After schedule upload and Mode 2 start, users should still be able to manually correct schedule errors if needed. `.xlsx` upload and OCR can be deferred unless already stable.  

### M1-D022: OCR schedule extraction

**Related old FVB ID(s):** FVB-D005, FSR-013  
**Spec source/section:** Mode 1 §10.1-§10.2  
**Repo status summary:** Missing or not proven.  
**Codex recommendation:** Needs user decision  
**Confidence:** Medium  
**Rationale:** OCR is high convenience but potentially higher risk than manual or CSV schedule entry.  
**Consequence of including:** Users can extract SMB4 screenshots into editable schedules.  
**Consequence of deferring:** v1 avoids OCR reliability risk and can still support empty/manual schedule entry.  
**Dependencies:** Image upload, OCR parser, team matching, review/confirm UI.  
**Test confidence:** Low.  
**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** Post-v1. OCR can later create reviewable draft schedule rows from SMB4 screenshots, but v1 relies on manual entry and optional CSV import. OCR must never directly accept schedule rows without user review.  

### M1-D023: Manual schedule entry and empty startup

**Related old FVB ID(s):** FVB-D005, FVB-D007, FSR-013  
**Spec source/section:** Mode 1 §10.1-§10.3, §12.1; Spine §3.5  
**Repo status summary:** Manual add/delete exists later in Mode 2; empty schedule at creation is not proven.  
**Codex recommendation:** Must include in v1  
**Confidence:** High  
**Rationale:** User decision requires season can start with an empty schedule and user manually enters SMB4 games one by one in the schedule tab.  
**Consequence of including:** Users can create a franchise before SMB4 schedule data is ready.  
**Consequence of deferring:** Setup remains blocked or forced into unacceptable generated schedules.  
**Dependencies:** Schedule storage, Mode 2 schedule tab, no generated schedule initialization.  
**Test confidence:** Medium for manual entry; low-medium for empty-start initialization.  
**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** v1 requires empty schedule startup plus manual SMB4 game entry/editing. Manual schedule entry is the source-of-truth fallback even if CSV import exists. If the user uploads a CSV schedule, those user-supplied schedule rows must persist into Mode 2 and may auto-populate the visible schedule, but only as a reflection of the uploaded SMB4 schedule, not engine-generated scheduling.  

### M1-D024: Named NPC initialization

**Related old FVB ID(s):** FVB-D019, FVB-D022, FSR-025  
**Spec source/section:** Mode 1 §1.2, §8.6, §12.1, §13.2  
**Repo status summary:** Partial. Reporter-related storage exists elsewhere; Mode 1 creation of one beat reporter, one manager, and one scout per team is not proven.  
**Codex recommendation:** Must include in v1 as identity records; guard/defer advanced behavior  
**Confidence:** Medium  
**Rationale:** Mode 1 must seed identities used by narrative and scouting, even if their later mechanics are deferred.  
**Consequence of including:** Every team has stable reporter/manager/scout identities at franchise start.  
**Consequence of deferring:** Later narrative/scouting systems must create identities retroactively.  
**Dependencies:** Team copy, name generation, reporter/scout schemas.  
**Test confidence:** Low-medium.  
**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Initialize required named NPC identities for franchise continuity if specified by the gospel specs, but defer advanced narrative, scouting, and relationship behavior until those systems are explicitly in v1 scope.  

### M1-D025: Initial standings, stats stores, and salary ledger

**Related old FVB ID(s):** FVB-D001, FVB-D014, FVB-D018, C-076  
**Spec source/section:** Mode 1 §12.1-§12.3; Spine §3.5, §4  
**Repo status summary:** Mostly complete for season metadata, stats, standings calculation, and salary engines; exact empty standings and ledger initialization need parity review.  
**Codex recommendation:** Must include in v1  
**Confidence:** Medium-high  
**Rationale:** Mode 1 must hand Mode 2 an initialized franchise shell even before any game is played.  
**Consequence of including:** Mode 2 can record games without missing baseline stores.  
**Consequence of deferring:** First game completion and standings/stats updates become fragile.  
**Dependencies:** FranchiseId, team copy, schedule/season metadata, salary fields.  
**Test confidence:** Medium-high for current gameplay stores; medium for exact gospel initialization shape.  
**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** Mode 1 must initialize franchise-scoped standings, stats baselines, and salary/payroll ledger structures needed by Mode 2. Advanced salary consequences and salary evolution can remain Mode 2/3 work.  

### M1-D026: Active franchise metadata

**Related old FVB ID(s):** FVB-D001, FVB-D041, FVB-D042  
**Spec source/section:** Mode 1 §12.1, §13.4-§13.6; Spine §3.4  
**Repo status summary:** Mostly complete. Active franchise selection, metadata, config, and navigation exist. Import/restore remains incomplete.  
**Codex recommendation:** Must include in v1  
**Confidence:** High  
**Rationale:** App startup and franchise switching depend on trustworthy metadata.  
**Consequence of including:** Users can return to an active franchise and identify current season/team context.  
**Consequence of deferring:** Save slots become hard to load, switch, or resume.  
**Dependencies:** Franchise manager, metadata summary, active franchise pointer.  
**Test confidence:** High for active metadata basics; medium for full summary fields.  
**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** Mode 1 must persist active franchise metadata and canonical season identity for safe Mode 2 routing, scoped reads, and franchise switching.  

### M1-D027: Import/export expectations touched by Mode 1

**Related old FVB ID(s):** FVB-D042, FVB-D044, FSR-016, FSR-090  
**Spec source/section:** Mode 1 §13.4-§13.6  
**Repo status summary:** Partial. Export exists; import validates and throws instead of restoring.  
**Codex recommendation:** Needs user decision  
**Confidence:** High  
**Rationale:** If Mode 1 or startup surfaces advertise import, users will expect restore-capable behavior.  
**Consequence of including:** Save-slot backup/restore trust improves but scope widens.  
**Consequence of deferring:** Import should be hidden or labeled non-restorative; export may remain diagnostic.  
**Dependencies:** Franchise manager, storage manifest, schema migration, active franchise switching.  
**Test confidence:** Medium for export; low for import mutation.  
**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** v1 is internal-use only, not customer-facing. Prioritize stability, recoverability, and clear internal expectations over public-user abuse/security concerns. Do not treat risky import/export as a polished public backup/restore promise unless restore is tested end-to-end, but internal diagnostic/export tools may remain available if useful.  

### M1-D028: Mode transition screen

**Related old FVB ID(s):** FVB-D001, C-077  
**Spec source/section:** Mode 1 §12.2  
**Repo status summary:** Partial or not proven. Setup navigates into franchise home; a distinct transition boundary screen is not clearly proven.  
**Codex recommendation:** Include if already stable  
**Confidence:** Medium-low  
**Rationale:** The transition screen is useful as a mode boundary, but should not distract from handoff correctness.  
**Consequence of including:** User gets a clear "franchise created" moment before Mode 2.  
**Consequence of deferring:** Setup can still hand off directly if metadata/storage is correct.  
**Dependencies:** Franchise metadata, first human team, schedule summary or empty schedule messaging.  
**Test confidence:** Low.  
**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Include a handoff summary/transition screen if stable, mainly for internal verification of Mode 1 outputs. Do not prioritize visual polish over handoff correctness.  

### M1-D029: What Mode 1 hands to Mode 2

**Related old FVB ID(s):** FVB-D001, FVB-D007, FVB-D014, FVB-D041  
**Spec source/section:** Mode 1 §1.2, §12; Spine §6.1  
**Repo status summary:** Mostly complete for core handoff; some derived stores and NPC/farm/schedule-policy fields are partial.  
**Codex recommendation:** Must include in v1  
**Confidence:** High  
**Rationale:** This is the formal Mode 1 completion contract, not a Mode 2 feature decision.  
**Consequence of including:** Mode 2 receives league, teams, players, rosters, rules, schedule records or empty schedule, standings/stats baselines, salary data, metadata, and NPC/scout identities.  
**Consequence of deferring:** Mode 2 behavior has to infer or repair missing setup state.  
**Dependencies:** All core Mode 1 data decisions above.  
**Test confidence:** Medium-high for current core handoff; medium-low for full gospel breadth.  
**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** Mode 1 must define and verify its complete Mode 2 handoff contract. This is the anchor for implementation audits and should be reconciled after all Mode 1 decisions are complete.  

### M1-D030: Playoff Mode abbreviated setup

**Related old FVB ID(s):** FVB-D006, FVB-D026, FSR-015  
**Spec source/section:** Mode 1 §1.4, §11.8  
**Repo status summary:** Partial. Playoff operations inside a franchise are strong; abbreviated Playoff Mode creation entry is not proven.  
**Codex recommendation:** Post-v1  
**Confidence:** Medium  
**Rationale:** This is a setup variant. User decision FVB-D003 says to avoid expanding setup variants until the core loop is locked.  
**Consequence of including:** Users can create bracket-first franchises without regular season setup.  
**Consequence of deferring:** Playoff functionality can still be used after a normal season.  
**Dependencies:** League selection, team control, seeding, playoff bracket initialization.  
**Test confidence:** Medium for playoff engine; low for abbreviated setup.  
**User decision:** [ ] approve [ ] modify [x] reject [ ] discuss  
**User notes:** Remove abbreviated Playoff Mode from Franchise Setup. Elimination Mode replaces what this once was thought to be. Franchise Setup should include only franchise-related setup dynamics. This rejection does not remove normal franchise playoff rules/config, playoff teams, series lengths, seeding/tiebreakers, or end-of-regular-season playoff initialization from the Mode 1/Mode 2 franchise contract.  

## 7. Existing user decisions carried forward

These prior decisions are preserved and applied to the Mode 1 split above.

| Existing decision | User decision | Mode 1 application |
|---|---|---|
| FVB-D001 | approve | M1-D001, M1-D025, M1-D026, and M1-D029 treat save-slot handoff as v1 foundation. |
| FVB-D003 | modify: include stable baseline only; do not expand setup variants until core loop is locked | M1-D002, M1-D003, M1-D011, and M1-D014 include stable template baselines; M1-D012, M1-D013, and M1-D030 avoid expanding setup variants. |
| FVB-D005 | modify: no auto-generated schedule ever; user manually enters SMB4 schedule; setup may collect season length/games-per-team only | M1-D020 and M1-D023 make no-auto-generation and empty/manual schedule start mandatory; M1-D015 keeps season length only as metadata/validation. |
| FVB-D041 | approve | M1-D001 and M1-D026 preserve storage isolation, active franchise, scoped reads, and metadata as v1 foundation. |

## 8. Mode 1 decision closeout

All Mode 1 worksheet decisions have been reviewed once with the user. This section summarizes the approved direction without replacing the decision-by-decision notes above.

### 8.1 Must-have Mode 1 v1 outcomes

- Franchise creation must copy data into franchise-owned save state rather than reference mutable League Builder templates.
- Franchise Setup must hand Mode 2 a complete, explicit contract: league, teams, stadium/park-factor inputs, players, rosters, farm records, rules/config, active franchise metadata, salary/payroll baseline, standings/stat baselines, schedule state, control metadata, personality/chemistry/fame fields, and approved NPC/scouting/farm identity fields.
- Each franchise team must enter Mode 2 with a valid roster shape: 22 MLB players and 10 farm players.
- Salary must be calculated during Mode 1 as rosters are finalized for franchise handoff.
- Season length and games-per-team must be stored as metadata/validation inputs, including for adjusted stats/WAR context if WAR remains in v1.
- Franchise schedule policy is strict: no auto-generated schedules ever. Empty startup, manual SMB4 schedule entry, and user-supplied CSV import are acceptable; generated or inferred schedules are not.
- Active franchise metadata and canonical season identity must be persisted for safe Mode 2 routing and scoped reads.

### 8.2 Approved simplifications and deferrals

- Franchise type presets are metadata/defaults for v1, not separate behavior-heavy modes.
- AI score-entry policy may be stored, but v1 includes no AI or game simulation components in Mode 1 or Mode 2.
- Offseason phase scope config is stored by Mode 1, but offseason behavior is implemented in Mode 3.
- Fantasy draft roster mode is post-v1 and must not be confused with the required startup prospect/farm population flow.
- OCR schedule extraction is post-v1.
- Advanced trait potency, award-based trait mutation, personality behavior, chemistry rebalancing, fame evolution, and narrative/scouting behavior are deferred to Mode 2/3 scope decisions unless already stable.
- Import/export is internal-use only for v1; prioritize stability and recoverability over polished public backup/restore guarantees.
- A handoff summary/transition screen is useful for internal verification if stable, but visual polish is secondary to handoff correctness.

### 8.3 Rejected or removed from Franchise Setup

- Abbreviated Playoff Mode is removed from Franchise Setup. Elimination Mode replaces that use case.
- This rejection does not remove normal franchise playoff rules/config from the Mode 1/Mode 2 contract.

## 9. Implementation audit questions created by these decisions

These are not new scope decisions. They are targeted repo-verification questions to answer before building or hardening Mode 1 v1.

| Area | Audit question |
|---|---|
| Save-slot handoff | Does franchise creation copy every approved Mode 1 field into franchise-owned state without retaining mutable template references? |
| Team identity | Are stadium and park-factor inputs stored on teams and copied into franchise state for Mode 2 stat tracking? |
| Player analyzer | Where is the current player analyzer/grade logic, including dirty-worktree work if present, and does Mode 1 salary/grade initialization use the approved algorithm? |
| Traits/personality/chemistry/fame | Are these fields present, copied, and initialized at handoff, and can personality be hidden from default user-facing UI while still stored? |
| Salary | Is salary calculated when rosters are finalized, and is the initialized salary/payroll baseline available to Mode 2/3? |
| Farm/prospect draft | Does the repo already implement enough startup prospect generation/draft flow to produce 10 farm players per team, or is a temporary approved farm-assignment fallback needed? |
| Roster validation | Does Mode 1 block or clearly flag invalid 22 MLB / 10 farm handoff states? |
| Schedule manual entry | Can users start with an empty schedule and manually enter/edit SMB4 games in Mode 2? |
| CSV schedule import | Is there an existing safe CSV schedule import/review path, or does v1 need a small user-supplied CSV importer? |
| Rules cleanup | Which current Mode 1 rules do not apply to SMB4 and should be removed or hidden during refinement? |
| Playoff rules handoff | Are playoff teams, format, series lengths, home-field format, and tiebreakers stored as franchise rules for normal season-to-playoffs flow? |
| NPC identities | Are required reporter/manager/scout identities created at setup, or should they be generated lazily with stable franchise IDs? |
| Import/export | Which internal export/diagnostic paths are stable, and which restore/import promises are untested? |
| Transition screen | Is there a stable handoff summary screen, or should direct navigation remain while tests verify handoff state? |

## 10. Next reconciliation step

The next recommended bucket is Mode 2 reconciliation. Mode 2 should start from the Mode 1 handoff requirements above rather than re-opening Mode 1 scope. The first Mode 2 pass should identify what the repo already implements for the regular-season/playoff loop, then compare against the Mode 2 gospel spec and decide v1 inclusion, simplification, or deferral item by item.
