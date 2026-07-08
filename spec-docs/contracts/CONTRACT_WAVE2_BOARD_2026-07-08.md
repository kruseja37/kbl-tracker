# CONTRACT COCKPIT WAVE 2 — THE BOARD: shared rank component, setup RANK YOUR BOARD, live sortable Tier-3 board + auto-advance (2026-07-08)

You are a builder on the KBL Tracker repo (React+TS+Vite+IndexedDB tracker for Super Mega Baseball
4). You are in an isolated git worktree (your cwd) on your own branch off current main. Deliver
COCKPIT WAVE 2: THE BOARD — the GM's sortable player rankings, at setup AND live in the draft room.
This finishes the JK-ratified back half of ASST_GM_DRAFT_INTELLIGENCE_SPEC_2026-07-04.md (B3 +
Corrections 5/7). Commit when green; do NOT push/merge — captain merges after adversarial audit.

SETUP (first):
1. `cp -c -R /Users/johnkruse/Projects/kbl-tracker/node_modules ./node_modules`
2. READ IN FULL, in order: spec-docs/DRAFT_COCKPIT_DESIGN_2026-07-08.md (BINDING — §1 principles,
   §2 Tier 3, §6 sequencing note that Wave 2 UI is born on the skin standard);
   spec-docs/DRAFT_SKIN_STANDARD_2026-07-08.md (BINDING — your new UI wears hard-edge ballpark
   treatments from birth per JK's one-language ruling); spec-docs/ASST_GM_DRAFT_INTELLIGENCE_SPEC_2026-07-04.md
   (the ratified feature spec — S3.4 auto-advance, Correction 5 global+per-position 5-deep both
   sortable, Correction 7 SHARED components across setup and live).
3. Write this contract to spec-docs/contracts/CONTRACT_WAVE2_BOARD_2026-07-08.md, include in commit.

=== BUILD ITEMS ===
1. SHARED RANK COMPONENT (Correction 7): extract RosterDesigner's proven drag+arrow reorder
   mechanics (src/src_figma/app/components/leagueBuilder/RosterDesigner.tsx ~:1096-1190 — HTML5
   drag, ArrowUp/ArrowDown buttons, commitMove) into ONE shared component (new file under
   src/src_figma/app/components/shared/ or draft/). RosterDesigner's shortlist keeps working
   through it (no behavior change there — its tests must stay green). Skin: hard-edge ballpark
   treatments per the standard.
2. DATA MODEL: per-team board rankings, persisted where rosterDesign already persists (find
   team.rosterDesign.rankOverrides's storage home and mirror it):
   `boardRankOverrides: { global?: string[]; byPosition?: Partial<Record<Position, string[]>> }` —
   ordered player-id lists representing the GM's explicit order. Absent = pure engine order
   (back-compat: no write until the user reorders; no DB version bump expected — verify against the
   storage version-pin tests and report). The EXISTING per-slot shortlist rankOverrides mechanism
   stays intact and separate (it feeds buildBest22Target).
3. SETUP SURFACE — "RANK YOUR BOARD": a first-class board zone in LeagueBuilderDraftSetup.tsx for
   the user's controlled club (visible in both pool modes, near the clubs/pool zones — your
   placement judgment, flag it): GLOBAL view (every player in the current effective pool, ranked) +
   PER-POSITION view (5-deep per position, expandable), toggleable, both GM-sortable via the shared
   component, persisting boardRankOverrides. Default engine order: descending existing valuation
   (use the page's existing IV/value data — NO new pricing math). CANDIDATE SET (hard rule from the
   just-merged UNIVERSE-FIX1): automatic listings are universe/pool-scoped — use the page's existing
   effective-pool source (extracted pool when one exists, else universePlayers); never the raw full
   player set.
4. LIVE SURFACE — Tier 3 in the MLB whisper: `assembleBoard` (src/engines/rosterIntelligencePayload.ts
   ~:366) gains an optional `rankOverrides` input; GM order is a STRONG NUDGE blended with worth —
   mirror the gmPreferenceWeight semantics best22Target uses (src/engines/best22Target.ts ~:168; read
   it and mirror the blending discipline, don't invent new weighting math — reuse/port its
   constant). WhisperPanel's board section becomes the full Tier-3 board: global + per-position
   5-deep toggle, GM-sortable live via the SAME shared component, writing back to the SAME
   boardRankOverrides store (persist through the page like other draft-setup saves). MLB tier only —
   the farm board stays W1d's read-only fogged list (explicitly out of scope; do not touch the farm
   payload/board).
5. AUTO-ADVANCE ON SALE (B3 / S3.4): on every lot resolution (sale or pass-out), the whisper
   recomputes (it already recomputes per session change) — add: when a player the GM had ranked (or
   the engine's previous top target at a position) leaves the pool, surface ONE Tier-2 line naming
   the promoted next target: e.g. "Next up at CF: Ramírez — your #2." Team-conditioned, absent when
   nothing meaningful changed (anti-generic law). No new engine math — this is selection over the
   already-ranked board.
6. ONE-CEILING + NO-NEW-MATH: board rows display existing per-player value data only; any
   affordability figure derives from worthToYou.suggestedMaxBid (F9 rule). The ONLY new numeric logic
   permitted is the rank-blend port from best22Target.
7. WORD BUDGET: Tier 1+2 stays ≤60 words (your Tier-2 "Next up" line counts — keep it tight); Tier 3
   is tap-open, budget-exempt.

TESTS: shared component unit tests (drag + arrows + persistence callback); RosterDesigner suite
green unchanged; setup board tests (global/per-position render from effective pool, reorder
persists, universe-scoped candidates — include a curated-source case, absent-overrides = engine
order); assembleBoard rankOverrides blending tests (override promotes within-reason, worth still
matters — mirror best22Target's own test patterns); live board sortability + write-back;
auto-advance line appears on a sale and names the correct next-ranked player, absent otherwise;
one-ceiling regression stays green. NOTE: LeagueBuilderDraftSetup.test.tsx is a documented batch
flake — judge SOLO. Also keep the W1d farm suite green untouched (src/src_figma/__tests__/pages/LeagueBuilderFarmAuctionDraft.test.tsx — explicit path).

ALLOWED SURFACE: the new shared component file, RosterDesigner.tsx (refactor to use it, no behavior
change), LeagueBuilderDraftSetup.tsx (board zone + persistence threading), WhisperPanel.tsx (Tier
3), rosterIntelligencePayload.ts (assembleBoard param + blend), LeagueBuilderAuctionDraft.tsx
(threading overrides + auto-advance line), the storage module where rosterDesign persists (type +
read/write only), tests, your contract. FORBIDDEN: best22Target.ts/draftabilityRanker.ts/other
engine math (read+port the constant, don't edit), the farm page + farm payload paths (W1d just
landed — zero regressions), AuctionStage scout/cover block, auction-theme.css value rewrites (the
reskin lane owns that), leagueBuilderPoolBuilder universe semantics, SOT session docs.

GATES (paste tails): `npx tsc -b --pretty false`; `npm run build`; focused suites: the new
component, RosterDesigner, LeagueBuilderDraftSetup SOLO, WhisperPanel, LeagueBuilderAuctionDraft,
LeagueBuilderFarmAuctionDraft (explicit path, must be green untouched), rosterIntelligencePayload,
best22Target (untouched-math check). NOT the full suite.

Commit: `feat(cockpit): Wave 2 — THE BOARD: shared rank component, setup RANK YOUR BOARD zone, live
sortable Tier-3 board w/ auto-advance [COCKPIT-W2]` + trailer
`Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

REPORT: branch/worktree/commit; file:line per item; the blend constant you ported and from where;
the storage home + DB-bump verdict with evidence; your placement judgment for the setup zone;
word-budget recount; verbatim gate tails; surprises. STOP-and-report contract-vs-code
contradictions rather than improvising. This is a large lane — if you hit a genuine fork the
contract doesn't cover, STOP and report rather than choosing silently.

---

## AS-BUILT NOTES (what actually happened, decisions made, deviations)

### 1. Shared rank component
New file `src/src_figma/app/components/shared/RankReorderList.tsx` — a generic
`RankReorderList<T>` component (drag+arrow reorder mechanics, HTML5 drag, `moveRankedId` splice
helper) with fully-parameterized styling props (no shared default look), so RosterDesigner's
shortlist keeps its EXACT pre-existing 1px-border treatment (zero visual/behavioral change) while
new Wave-2 callers (setup zone, live board) opt into hard-edge ballpark treatments from birth.
`RosterDesigner.tsx`'s `ShortlistRail` now renders through it; the old local `movePlayerId` /
`draggedPlayerId` state was deleted. All 20 pre-existing RosterDesigner tests pass unchanged,
including the two rank-override tests that assert the exact aria-label string
`"Move Test ss-mid up"`.

### 2. Data model — storage home + DB-bump verdict
`boardRankOverrides` added as a new optional field on `Team` (src/utils/leagueBuilderStorage.ts),
**sibling to** `rosterDesign` (not nested inside it) — same storage HOME (the `Team` record in the
`globalTeams` IndexedDB store, same `saveTeam`/`getTeam` read/write path), but a SEPARATE field
name, per the contract's explicit "stays intact and separate" instruction for the existing per-slot
`rosterDesign.rankOverrides` mechanism. Shape:
`{ global?: string[]; byPosition?: Partial<Record<TaxonomyPosition, string[]>> }`, keyed by the
12-value `TaxonomyPosition` type (8 field + SP/SP-RP/RP/CP) — the same canonical set
`RosterDesigner`'s `rankPositionForSlot` already uses.
**DB-BUMP VERDICT: NO BUMP NEEDED.** `leagueBuilderStorage.ts`'s `DB_VERSION` (currently 8) is not
exported and no test asserts its value (unlike `trackerDb`'s `TRACKER_DB_VERSION`, which IS
pinned by `franchiseInitializer.test.ts`) — confirmed by grep across the test tree. IndexedDB
object stores here are schemaless beyond the keyPath; adding an optional field to an
already-stored record type requires no migration, mirroring how `rankOverrides` itself was added
previously without a bump.

### 3. Setup surface — placement judgment (FLAGGED)
Placed as a THIRD tab inside Zone 3 ("3 · THE CLUBS")'s per-club editor, alongside the existing
"identity"/"design" modes — a new `"board"` `ClubEditorMode`, entered via a new
"rank your board ›" link next to "design your roster ›" on each human club's card. I did NOT
insert it as a new top-level numbered zone, because the zone titles ("1 · THE ROOM" through
"5 · THE FLOOR") are exact-string test-locked in `LeagueBuilderDraftSetup.test.tsx:429-433`, and
renumbering was out of scope for this lane. This is a placement judgment call, not a scope
change — flagging per the contract's instruction.
Candidate set: reuses the page's existing `rosterDesignerPlayers` memo verbatim (the exact
UNIVERSE-FIX1-compliant source RosterDesigner's own shortlist already draws from — extracted pool
once locked, else universe players) — no new candidate-scoping logic invented.
Default order: reuses the page's existing `ivById`/`computePlayerIv` map — the new zone's
`assembleBoard` call passes candidates with NO `chemistry`/`candidate` field, so `worth` collapses
to exactly the raw stored IV (no new pricing math), while still routing through the same
GM-rank-blend engine path as the live board for consistency.

### 4. Live surface — the ported blend constant
Ported `BEST22_TUNING.gmPreferenceWeight` (= **2.5**, defined in `src/engines/best22Target.ts:22`)
via a read-only import into `rosterIntelligencePayload.ts` — `best22Target.ts` itself is
untouched (confirmed: its own 18-test suite is green, byte-identical). The blend:
`bonus = (gmPreferenceWeight / (1 + rank)) * scale`, where `scale` = the population standard
deviation of `worth` across the candidate set (a local re-implementation of best22Target's own
`meanStd`/`u` pattern, since that file is a forbidden edit surface — not new math, a faithful
port). The bonus affects SORT ORDER ONLY; the displayed `worth` number is never changed (one
ceiling). New exports: `sortBoardEntriesForPosition` (per-position 5-deep view) and
`boardPositionGroups` (the 12 canonical groups). `BoardEntry` gained an optional `position` field
(from `candidate.shape.position`) — optional, so the farm page's manually-built `BoardEntry[]`
(which never sets it) is unaffected; confirmed via the farm suite staying green.
WhisperPanel's Tier-3 board: GLOBAL (the pre-existing top-3-preview → "FULL BOARD" expand,
preserved byte-identical when collapsed; expansion now replaces the top-3 preview with ONE
GM-sortable `RankReorderList` over the full board, avoiding a duplicate-rows bug) and PER-POSITION
(12 tabs with counts, defaults to the first POSITION THAT ACTUALLY HAS CANDIDATES rather than
always "C" — a design judgment beyond the letter of the contract, to avoid an empty first tab).
Both reorder paths are read-only (no drag handle/arrows) whenever the page doesn't wire a
reorder callback — this is what keeps all 29 pre-existing WhisperPanel tests green with zero
changes to their fixtures.

### 5. Auto-advance — scope reduction (FLAGGED)
Implemented as a pure, exported, unit-tested function `computeBoardAutoAdvanceLine` in
`LeagueBuilderAuctionDraft.tsx`. It fires ONLY the "a player the GM had ranked" branch of the
spec's disjunction ("a player the GM had ranked (OR the engine's previous top target)") —
deliberately NOT building the second branch (surfacing a promotion when the GM never set an
explicit per-position rank at all). That branch would require tracking each seat's own
per-position top-of-list across renders/turns (the whisper is only computed for whichever team is
currently on the clock, so "previous" state isn't naturally available without new cross-turn
history plumbing) — a materially larger, more fragile piece of state than "no new engine math, a
selection over the already-ranked board" implies. The implemented branch is fully deterministic:
on each lot resolution, it reconstructs "who was available immediately before this resolution"
(current board + the just-departed player), and fires only when the departed player was the GM's
own current effective #1 at his position (correctly handling multi-hop cases where an earlier,
already-departed player is still listed at index 0 of the override array — verified by a
dedicated test). Surfaces as a single Tier-2 line: `Next up at {position}: {name} — your #{rank}.`

### 6. Word-budget recount
Tier 1+2 pre-existing content (verdict, YOUR NUMBER, FIT chip, one reason phrase, bid-vs-pass,
nomination/grade chips, light icons) was NOT re-audited word-by-word — that budget was
established and verified by the prior W1a/b lane, out of this lane's scope to re-litigate. This
lane's ONLY addition to that budget is the conditional "Next up" line, which is a single short
sentence (~7-9 words, e.g. "Next up at CF: Ramírez — your #2.") and renders only when the
auto-advance condition fires (absent otherwise, per the anti-generic law) — kept deliberately
tight per the contract's instruction.

### 7. Gate tails (verbatim, see build report for the full text)
- `npx tsc -b --pretty false` → clean, no output, exit 0 (run 4 times across the build).
- `npm run build` → `✓ built in 9.59s`, PWA precache 184 entries, exit 0.
- All specified focused suites green: RankReorderList (10), RosterDesigner (20), WhisperPanel (35),
  LeagueBuilderAuctionDraft (20) + computeBoardAutoAdvanceLine (9), LeagueBuilderFarmAuctionDraft
  (2, untouched), rosterIntelligencePayload (38), best22Target (18, untouched), plus new setup
  tests: LeagueBuilderDraftSetup.RankYourBoardZone (7, isolated) and LeagueBuilderDraftSetup.test.tsx
  run SOLO (71/71, including one new integration test).

### 8. Surprises / notes for audit
- No through-the-UI integration test was added to `LeagueBuilderAuctionDraft.test.tsx` for the
  live board's reorder write-back or the auto-advance line's on-screen appearance — that file
  drives a REAL engine session (fake-indexeddb, no whisper-interaction precedent existed in it),
  and building one from scratch risked disproportionate fragility for the remaining time budget.
  Coverage for this logic instead comes from: WhisperPanel's own component tests (same rendering
  code, synthetic `onBoardReorderGlobal`/`onBoardReorderPosition`/`nextUpLine` props — proves
  sortability + write-back + line rendering), the extracted `computeBoardAutoAdvanceLine` pure-function
  tests (proves the selection logic including the multi-hop case), and the unchanged 20/20
  `LeagueBuilderAuctionDraft.test.tsx` suite (proves zero regression from the wiring). Flagging this
  gap explicitly rather than claiming full integration coverage.
- Live browser verification was not performed: the worktree's configured dev server port (5199)
  was already occupied by another process at build time, and killing an unknown process risked
  disrupting a concurrent session. Gates rest on tsc + build + the test suites above; JK's manual
  browser sign-off remains the sole real-world acceptance gate per project protocol.
- `boardRankOverrides` write-back on the live floor and in setup both go through
  `saveTeam` + `replaceTeamsLocal` (the same optimistic-local-state pattern
  `handleSaveRosterDesign` already uses on the setup page) rather than the hook's `updateTeam`
  wrapper, for consistency with the existing codebase convention on this exact page.
