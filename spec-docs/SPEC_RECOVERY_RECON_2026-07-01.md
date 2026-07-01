# SPEC-RECOVERY RECONNAISSANCE — legacy franchise-setup + chat-only design gaps (2026-07-01)

> **Provenance:** first-pass reconnaissance dispatched by Opus (Explore agent) per JK ruling 5a (Wave-0 adoption, 2026-07-01), as-of the adopted trunk (`aaf1fdad`). **This is INPUT to the QUEUED spec-recovery/design session — NOT ratified decisions.** It identifies what the repo captures vs what appears referenced-but-thin or absent (candidate chat-only). JK confirms what actually only lived in chat.
>
> **Standing guard (ruling 5a):** do NOT dispatch Codex UI work against the legacy franchise-setup surface until the spec-recovery session resolves the items below.

---

## (A) LEGACY RULES STILL LIVE IN CODE (contradict the 2026-06-30 re-design / later rulings)

**1. DH rule is ACTIVELY ENFORCED but OBSOLETE (CODE-LEGACY).** Code still branches on `useDH`: `src/types/franchise.ts:31,163` (`useDH?: boolean`), `src/utils/franchiseInitializer.ts:195` (writes it into `FranchiseRulesSnapshot`), `src/src_figma/app/utils/franchiseGameTrackerRoster.ts:150,213,343,353,397–405` (9-vs-8 position-player lineup gate), `franchiseLineupDomain.ts:117–147` (dual `lineupWithDH`/`lineupWithoutDH` storage), and a DH toggle in `src/components/LeagueBuilder.tsx:297–309`. Ruling (cited at `LeagueBuilderDraftSetup.tsx:46`): **DH removed ENTIRELY — pitchers always bat.** Risk: a franchise run with DH=true would follow obsolete logic.

**2. Roster legality ignores secondary-C and Two-Way(C) (CODE-LEGACY vs Ruling A).** `src/data/rosterConstruction.ts:38–42` `RosterSlotPlayer` has no secondary-position field; `isLegalRoster()` (`:68`) counts only `position === 'C'`; `minCatchers:2` (`:25`) is primary-C-only. Ruling A (2026-07-01, expanded in `08342e7b`): backup-C legality counts a SECONDARY-C player OR a Two-Way(C) pitcher. The code will reject rosters that are legal under the ratified ruling. Builder note (from DECISIONS_LOG): verify the secondary-position field + UTILITY-nerf exemption exist in the data model before wiring.

**3. Conferences hard-coded empty (CODE-LEGACY vs Ruling B).** `src/src_figma/app/pages/LeagueBuilderLeagues.tsx:226–227` initializes `conferences: [], divisions: []` and never edits them; no per-team conference picker exists. Ruling B (2026-07-01): conference assignment IS v1 league-setup scope (no divisions). Blocks standings/seeding.

---

## (B) THIN / AMBIGUOUS — referenced but underspecified (candidate chat-only)

**4. Per-league team-instance shadow store (S2 foundation) — THIN.** Spec: V1_HANDOFF §3.1 (additive per-(league,team) identity shadow mirroring `leaguePlayerOverrides`; HARD FENCES: identity-only, NEVER roster/`capIdentity`). Code: NOT-BUILT. The hard fences have no code/comments/tests; the "register in backup/sync/L-SIM-sandbox/save-slot" requirement is complex and underspecified.

**5. Identity-bundle team-edit page — ABSENT.** Spec: V1_HANDOFF §3.1 (page holds GM/Asst-GM/Scout/Manager+style/Beat-reporter names + MLB/Farm archetype dropdowns + draft boards; the Asst GM BUTTON-GENERATES the initial board). Code: does not exist; old scout-hire/staff-hire screens still live. Greenfield UI; interaction model unspecified (auto-gen-on-submit? re-gen on archetype change? board = full ranking or per-position priorities?).

**6. Draft-setup hub persistence — THIN.** Spec: the draft is a THIN EVENT that READS pre-configured league/team state. Code: only a `/__preview/draft-setup` mock in sessionState (lost on refresh); nothing persists. Blocks session-recovery.

**7. Scout archetype→confidence-band mapping — THIN.** Spec: V1_HANDOFF §3.2 (farm archetype DERIVES per-area 3/5/7 confidence bands). Code: bands come from the deprecated hired-scout descriptor, not the farm archetype; no archetype→band lookup table exists. Needs a 24 × 8-area × (3/5/7) table.

**8. Player-archetype "Move 2" taxonomy — ABSENT (deferred).** Spec: V1_HANDOFF §6 (lift the 18 per-position signed templates into a reusable VALUE-AWARE reverse classifier). Code: `ProspectArchetypeFamily` is forward-only. Blocks the ROBUST draft-board dropdowns; ~80% greenfield.

**9. In-season legal-roster enforcement — THIN.** Spec: V1_HANDOFF §4 (every in-season move keeps a legal roster). Code: advisor/roster-move path doesn't enforce it (audit ISAGM-04/05); needs Ruling-A propagation + reads S2's stored per-league priorities.

---

## (C) TOP CANDIDATES FOR JK TO CONFIRM AS CHAT-ONLY (highest risk)

1. **Per-league identity-shadow HARD FENCES** — the interaction between global team, per-league identity, and backup/sync/L-SIM/save-slot layers is entirely unwritten. Needs a sketch + test cases (backward-compat of teamId references; does the shadow affect `capIdentity`/budget or only the identity badge; cloud-sync granularity).
2. **Identity-bundle team-edit page interaction model** — form layout, the "generate draft board" button behavior (auto vs manual, re-gen triggers), and whether "draft board" = full ranking or per-position priorities; storage location (S2 layer?).
3. **Conference-assignment mechanism** — per-league vs global conference list; validation (must every team have one before draft?); does it gate standings math or just playoff bracket.
4. **Scout archetype→band lookup table** — purely verbal today; needs the explicit per-archetype, per-area band-count spec.

---

## (D) CAPTURED & aligned (spec + code + clear build ticket)
- 24 team archetypes: `TEAM_ARCHETYPES_24.md` + `historicalArchetypes.ts` (`efc7cfb6`); picker still shows 15 (QUICK-WIN-CATALOG-24).
- Legal-roster module `rosterConstruction.ts` (locked; gaps = secondary-C/Two-Way + position-aware own_need, both queued).
- Draft economy / wrong-fit penalty: `IN_SEASON_CAP_DEADCAP_ANALYSIS_2026-06-30.md` (spec clear; graduated visible penalty unbuilt).
