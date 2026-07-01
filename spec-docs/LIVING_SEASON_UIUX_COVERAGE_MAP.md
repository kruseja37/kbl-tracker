# Living-Season UI/UX Coverage Map — evidence-based audit (2026-06-27)

> **Method:** 6 parallel evidence-strict auditors over the integration worktree
> (`claude/lineups-fenway-hub` = engine trunk + the new Fenway hub) → adversarial existence re-verification
> (19 first-pass classifications corrected) → synthesis. 51 distinct living-season elements. Every claim
> below carries file:line evidence. Items marked **✓VERIFIED** were re-read against the actual code by the
> captain (Opus) — the load-bearing ones. Source run: `wz1nvmii9`. One auditor verify-cell failed to return
> structured output (parallel[26]); its element is covered by sibling auditors.
>
> **v1 scope (JK 2026-06-27):** draft-setup → draft → launch → regular season → playoffs → trades.
> Offseason DEFERRED. **Hidden vs revealed is a hard product rule** (JK 2026-06-27).
>
> **Existence labels:** `live` = runs in prod today · `built-dark` = built but behind an OFF feature flag ·
> `enum-only` = a type/UI exists but NO data/engine populates it · `partial` · `absent` = nothing.

---

## 0. THE TWO v1 BLOCKERS — hidden/revealed violations the new hub INTRODUCED ✓VERIFIED

The legacy Team Hub gates these correctly; the new Fenway adapter (`useFranchiseLensData.ts`) bypasses both.
These must be fixed before the hub can go live.

### BLOCKER 1 — Hidden personality modifiers are displayed (live violation)
- **Evidence ✓VERIFIED:** `buildModifiers(player)` reads `player.hiddenPersonalityModifiers.{loyalty, ambition,
  resilience, charisma}` and returns raw rounded 0-99 values (`useFranchiseLensData.ts:346-355`);
  `buildPlayerRow` sets `detail.modifiers = buildModifiers(player)` (~`:407`); the player-drawer "Makeup"
  section renders them (`FranchiseLensHub.tsx:1473-1483`). A legacy test already encodes the rule:
  `TradeFlow.franchiseTransactions.test.tsx:290` asserts `loyalty|hiddenPersonalityModifiers` must NOT be in
  the document.
- **Rule:** hidden personality modifiers must stay HIDDEN on ALL players (farm + MLB) — they drive
  morale/ties/decisions and are internal; surfacing them leaks intent.
- **Fix:** stop populating `MakeupModVM` from `hiddenPersonalityModifiers` (remove `buildModifiers`'s body /
  the drawer Makeup section). Keep only the PUBLIC `personality` string.

### BLOCKER 2 — Farm prospect TRUE ratings leak (reveal gate not applied)
- **Evidence ✓VERIFIED:** the adapter reads `ratingRevealState`/`scoutedGrade`/`prospectProfile`/
  `perceivedValueRange` **zero** times (grep = 0). The farm panel uses `String(p.overallGrade)` for farm
  prospects unconditionally (`buildRosterExtrasVM` ~`:1066`); `buildPlayerRow` uses `player.overallGrade` for
  everyone (~`:402`). The gate EXISTS and is honored in the legacy path: `ratingRevealState`
  (`leagueBuilderStorage.ts:316`), `franchiseSalary.ts:87-94`, `normalizeRevealState`
  (`franchiseRosterMovement.ts:654`); call-up flips it to `'revealed'` (`franchiseRosterMovement.ts:764`).
- **Rule:** farm prospects BEFORE call-up show scout-perceived grade/range ONLY; true ratings hidden until
  call-up (the reveal trigger). [[hidden-vs-revealed-ui-rule]]
- **Fix:** in `buildRosterExtrasVM` + `buildPlayerRow`, branch on `ratingRevealState` — for FARM + not
  `'revealed'`, surface the scouted/perceived grade + range + confidence (from `prospectProfile` /
  `perceivedValueRange`) instead of `overallGrade`; derive readiness from the scouted grade.

---

## 1. v1 ROSTER MOVES — engines LIVE, UI missing in the new hub (the call-up/send-down/trade work)

| Action | Existence | Engine (evidence) | New-hub gap |
|---|---|---|---|
| **Call-up** (farm→MLB) | live | `callUpFranchisePlayer` `franchiseRosterMovement.ts:715-854`; sets reveal='revealed' `:764` | "Call up" button renders `FranchiseLensHub.tsx:864` but has **no onClick** — wire to engine + confirm modal |
| **Send-down** (MLB→farm) | live | `sendDownFranchisePlayer` `franchiseRosterMovement.ts:552-713`; preserves reveal state `:629` | **no affordance** — add a send-down action on MLB roster rows |
| **Trade execution** (in-season) | live | `executeManualFranchiseTrade` `franchiseTradeAdapter.ts:1718`; deadline 65% (`isTradeWindowOpen`); **unrevealed farm prospect CANNOT be traded** `:987,1337,1362` (correctly protects hidden ratings) | only reachable from legacy `TradeFlow.tsx:349` — surface a trade-execution flow from the Trades tab |
| **Moves ledger** (display) | live | `getTransactionsByFranchiseSeason` (`transactionStorage.ts:398`) | Trades tab filters to `type==='trade'` only — broaden to a Moves view (trades + call_up + send_down + release) |
| **Release** (cut a player) | partial | `logRelease` exists; verify the cut+roster-update path at point of use | no UI; no special reveal on release |
| **Injury logging** | live | GameTracker records an `'injury'` event when fitness→WEAK/STRAINED/HURT (`GameTracker.tsx:5929-5940`, `useGameState.ts:8670`) | optional read-only injury-history popover; **do NOT build an IL roster** (deferred) |

Roster moves are the **primary in-season dynamic with live engines but no new-hub surface** — the core of
this build. All move flows must respect the hidden-prospect gates above.

---

## 2. UI PRESENT, DATA EMPTY — adapter doesn't populate (wire-now, no flag)

| Surface | Existence | Evidence |
|---|---|---|
| **Standings · The Races** (leader chases) | partial | UI `FranchiseLensHub.tsx:1042-1069`; `buildStandingsVM` hardcodes `races: []` `:458`. Engine exists: `computeFranchiseRaceCandidateRows` (`franchiseRaceStandingsCompute.ts`) — wire it (derive from completed games, no flag) |
| **Standings · Playoff Picture** (magic #s, leaders, wild-card) | enum-only | `PlayoffPictureVM` type `:217`, render `:984-1005`; no `picture` populated; no deriver. Build from `calculateStandings` |
| **Standings · The Hardware** (award frontrunners) | enum-only | UI `:1072-1091`; `franchiseAwardsEngine` exists, not wired into the VM |
| **Player drawer · Career line / Awards / Milestones** | enum-only | UI `:1523-1545`; no aggregator wired into `buildPlayerRow` |
| **Roster · Skipper advice** (call-up/send-down/watch) | enum-only | `RosterMoveAdviceVM` + UI `:821-835`; `buildRosterExtrasVM` never populates `advice`; no engine. (If built, must respect the reveal gate.) |
| **Fitness chip** | partial | mojo IS shown (`:406`); fitness slot in `PlayerDetailVM` never populated — add a fitness chip from the player's fitness profile |

---

## 3. BUILT-DARK — built + wired read-only, gated OFF by default (v1 = a FLAG decision)

These are fully built (engine + adapter read + UI) but every persist early-returns when its
`franchisePhase2Flags` flag is off (default false). They light up when the flag flips. **v1 "is living"
(per [[mode1-mode2-launch-readiness]]) → flipping these is the v1 activation milestone — a JK call.**

| System | Flag (default false) | Evidence |
|---|---|---|
| **Player + Fan Morale** (20 event types, ledger, history) | `isFranchisePhase2MoraleEnabled` | guards `processCompletedGame.ts:434,598,676,770,1038,1098`; `franchisePhase2Flags.ts:1`. Adapter reads snapshots `:382-389,461-489` (empty until flag on) |
| **Checkpoints** (rating/trait sweep @ 20/40/60/80/100%) | `isFranchisePhase2CheckpointEnabled` | `processCompletedGame.ts:1410`; flags `:37`. Full Checkpoint Takeover modal built (`FranchiseLensHub.tsx:1750-1813`) — a transfer-tracker (checkboxes "entered into SMB4", no backend save) |
| **Fame** (heat, immortality reach, channels) | `isFranchisePhase2FameEnabled` | `processCompletedGame.ts:1366`; flags `:13` |
| **Traits** (grant timeline) | `isFranchisePhase2TraitsEnabled` | `processCompletedGame.ts:1417`; flags `:49`. Current traits are a LIVE read; the timeline fills only when on |
| **Stadium records/aggregates/performers/visitors** | `isFranchisePhase2StadiumRecordsEnabled` + Phase-3 archive | `buildStadiumVM:510-526` hardcodes empty (deferred "Phase 3"); spray fills event-by-event |
| **Rivalries** (home-park rival + rival-game morale) | stadium-records / morale flags | `processCompletedGame.ts:1359,1386`; `rivalId` currently unset in the adapter (deferred rivalry rebase) |
| **Random events / L10** (trade demands, role/trait/cosmetic shifts) | L10 (dark + unwired) | `tradeRequestGeneration.ts`; the "Wants Out" UI `:837-846` is an empty shell |
| **Relationships / Ties** | live (engine) but morale impact dark | corrected to `live`; ties read in the drawer; per-week morale impact gated |

---

## 4. CORRECTLY OUT OF v1 — absent / enum-only / deferred (do NOT build)

| Item | Existence | Evidence |
|---|---|---|
| **Injured List (IL)** | enum-only | `'injury_list'` enum (`transactionStorage.ts:64`) is the ONLY reference — no engine/store/UI. v1 uses fitness + call-up/send-down, no formal IL |
| **Free agency (in-season)** | absent | `logFASigning` hardcodes `phase='OFFSEASON'` `:662`; the FA adapter is dry-run preview, rejects REGULAR_SEASON. `FRANCHISE_V1_LIVING_SEASON_SPEC.md:233`: FA deferred to v1.1 |
| **Waivers** | absent | no references outside archived/tests |
| **In-season draft pick** | enum-only | `'draft_pick'` enum + logger; no `executeManualDraft`. Draft belongs to the draft-SETUP phase |
| **Retirement (in-season)** | enum-only | `logRetirement` exists; retirement is an aging/season-transition outcome (offseason), surface in news when it fires |

---

## 5. HIDDEN vs REVEALED — the full rule table (per surface)

**HIDDEN everywhere:** hidden personality modifiers (loyalty/ambition/resilience/charisma) [BLOCKER 1];
all engine weights/propensities/derivation formulas; end-of-season retirement probability; fitness Fame/WAR
multipliers (user sees only the final number); manager mWAR value + decision log; reporter personality
weighting + reporter morale.

**Farm prospects (pre-call-up):** scout-perceived grade + price RANGE + confidence ONLY; true IV/ratings
HIDDEN until call-up [BLOCKER 2]. Reference impl: `perceivedValueRange` (`scoutValueRange.ts`), press-hold
to reveal to the interacting user only.

**REVEALED (correctly):** standings table (W-L-PCT-GB-L10-STRK-RDIFF), schedule, playoffs (bracket/seeds/
MVP), trades ledger, lineups (opponent SP profile + projected WPA + order), news/recaps, stadium identity +
park factors, almanac leaders/trophies, designations (gold/albatross), career phase + age, ratings overlays
(base/current/delta — but GATE for unrevealed farm), true value gap, fame heat/reach/channels (when live),
current traits + timeline (when live), morale value + 6-wk history (when live), ties (type/intensity).

---

## 6. v1 BUILD PRIORITY (living season)

1. **Fix BLOCKER 1 + 2** (hidden modifiers + farm reveal gate) — product-rule breaches, small adapter edits.
2. **Roster moves into the hub:** wire Call-up (button has no onClick), add Send-down, surface Trade
   execution, broaden Trades→Moves ledger. Engines all live + already enforce the hidden-prospect gates.
3. **Wire UI-present/data-empty:** races, playoff picture, award frontrunners, fitness chip, career line.
4. **Flag decision (JK):** flip the built-dark living-season systems (morale/fame/traits/checkpoints/records)
   — this is the "v1 is living" activation, a JK ruling, not a build.
5. **Defer:** IL, free agency, waivers, in-season draft, retirement (out of v1).
