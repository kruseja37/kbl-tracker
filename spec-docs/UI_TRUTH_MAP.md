# UI TRUTH MAP — empirical route walk (unified product)

**Date:** 2026-07-07 · **Tree:** /private/tmp/kbl-port2 · **HEAD:** f60abf1e (branch `main-track`, tracking main)
**Method:** `npm run build` (exit 0) → `vite preview` on 127.0.0.1:4310 → one headless Chromium (Playwright MCP), sequential walk. Every style class below is backed by a **computed-style check** (`getComputedStyle`: h1/h2/h3 font-family, body font-family, first non-transparent ground color descending from `#root`, count of `fen-*` classes) — never by screenshot alone. Console errors captured per route (retrieved + cleared after each route).
**Coverage invariant:** the live router (src/App.tsx:313-475) contains **61 `<Route>` elements**; ROUTE_INVENTORY.md's "TOTAL ROUTES: 62" counted the `<Routes>` container line 313 as well. **All 61 route elements walked (61/61 = 100%)**; this map has **62 rows** (61 routes + 1 supplementary wildcard probe), satisfying the ≥62-row invariant with no skips.
**Seed state:** SML + MLB stock imports (2 leagues, 50 teams, 1166 players), a locked 1166-player MLB pool, 30 clubs (1 human / 29 CPU) with identities, one hired scout, and a live persisted auction (3 lots run). No franchise / elimination / played-game records exist → parameterized franchise/game/elimination routes were probed with dummy id `test-1` and marked EMPTY-STATE.

**Style rubric applied:** NEW-CANON (chalk-and-ash Fenway: fen-*/fenway classes, ballpark greens #243028/#3d4a42 family, ash #CBB89C, brass #C4A853, Moms/Tox Typewriter, hard offset shadows) · OLD-DIALECT (army-green league-builder, black/blue generic, old FranchiseHome shell, pixel type outside `/`) · CARTRIDGE (Press Start 2P menu — legitimate only at `/`) · DEV (developer-facing / `__preview`). Where a screen is transitional (ballpark-green ground but system-ui type — the "Draft-Room register"), it is classed OLD-DIALECT with the sub-dialect noted, per UX_NORTH_STAR §1.2 which lists the Draft-Room register among the dialects that migrate to canon.

## 2026-07-14 Snake route addendum (supersedes this map for the draft path)

- Production Snake is shared `/league-builder/draft-setup` → `/snake-room`; companion is
  `/snake-companion`. The retired POC/setup routes are not current UI authority.
- The private room uses one team-first My Board / Assistant GM Board / Player Pool / MLB Trade Picks
  desk. Every team uses the same system with its own archetype, roster, money, and private rankings.
- Mac/laptop fine-pointer screens use the document as the one vertical scroll. iPad/touch layouts
  retain bounded selected-player and board panes. Live 1440x1000 proof has no horizontal overflow.
- There is no normal Pause control because there is no draft clock. A contextual `RESUME ROOM`
  appears only when automatic safety or legacy persisted state has actually stopped the room.
- Companion GM pick submission is intent only; the Hotseat must approve the exact live request.
  Explanatory copy remains behind Help under the ratified Help-button law.
- 2026-07-15: `/league-builder` imports Historical Legends into three read-only Career/Draft/Peak
  source libraries. `/league-builder/draft-setup` exposes those libraries plus an explicit
  Unassigned Players source and keeps manual add/remove; Legend rows carry version badges.
- 2026-07-15: `/snake-room` and `/snake-companion` show the same private cumulative
  `ARCHETYPE ALIGNMENT` grade, room rank, pick count, and fit score for the selected club. No
  hidden personality values or FARM talent ranks render.
- 2026-07-15: production Snake Draft Setup exposes four pool-assembly choices from the selected
  sources: `TIGHT`, `COMPETITIVE` (recommended), `LOOSE`, and exact `FULL SOURCES`. For eight
  clubs the shaped counts are 212 / 238 / 264; the Full Sources count is the actual post-override
  membership. Manual adds/removes persist across reload and reshaping.
- 2026-07-15: the player shuttle is two columns only at 1280px and wider; it stacks on iPad to
  prevent horizontal overflow. Explanations stay behind the Snake `HELP` control. Assistant GM
  methodology stays behind Help rather than competing with live decisions in the private desk.
- 2026-07-16: the live Assistant heading is `ASST GM 22`. My Board and Assistant GM Board retain
  owned players as team-colored `ROSTER` rows, remove rival picks from actionable views, reserve CP
  for the highest-IV owned closer, and keep lower-IV owned closers as committed depth. Player Pool
  provides local Board/Fit/IV/signed Tax If Picked/True Cost/rating sorts plus fit filters; Snake IV
  is salary, so there is no duplicate Salary sort. Sorting and filtering are view-only until `TOP`
  persists the selected player to the current Overall or position board. Optional risk-worker
  lifecycle is one compact board state; only actionable player risk remains on rows.
- 2026-07-19: `/snake-room` is the sole public draft writer. `/snake-companion` reads the immutable
  active-room catalog, writes only the approved private board, and submits pick/trade intent. The
  companion route does not start account-wide backup sync. Realtime is a hint; bounded scoped reads
  restore current public and private state. The original Hotseat profile remains required for final
  local roster handoff until that separate cloud migration is built.

---

## THE TABLE (62 rows)

| # | Route | Component (App.tsx) | What renders | Style (computed evidence) | NS§3 | Proposed verdict | Console | Shot |
|---|-------|---------------------|--------------|---------------------------|------|------------------|---------|------|
| 1 | `/` | AppHome | SNES cartridge menu: KRUSE FAMILY BASEBALL, 5 items (Living Season / Exhibition / Elimination / League Builder / Almanac), PRESS START footer. Note: menu already links LEAGUE BUILDER (R-IA1 retarget appears done); no BUILDER item. | **CARTRIDGE** — body font "Press Start 2P", ground rgb(0,0,0) | KEEP | **KEEP** | 0 | route-00 |
| 2 | `/__preview/draft-archetypes` | DraftSetupArchetypePreview | "Team Identity" archetype explainer + card gallery. Copy still says "15 historical team archetypes" (catalog is 24 — stale, NS flagged). | **DEV** (Draft-Room register: ground #243024, h1 system-ui) | KILL after harvest | **DELETE** (after copy harvest into archetype picker help) | 0 | route-02 |
| 3 | `/__preview/season-rules` | SeasonRulesPreview | "How the Season Runs" season-length/innings preview form. | **DEV** (Draft-Room register, ground #243024, system-ui h1) | KEEP as dev fixture | **HIDE-DEFER** (DEV-gate per R-IA7) | 0 | route-03 |
| 4 | `/__preview/draft-guide` | DraftGuidePreview | "On the Block" draft-read explainer, MLB auction / farm draft tabs. | **DEV** (Draft-Room register) | KEEP as dev fixture | **HIDE-DEFER** (DEV-gate) | 0 | route-04 |
| 5 | `/__preview/scout-panel` | ScoutPanelPreview | "The Scout's Desk" in-season scout read (lineup/rotation strength, win-value framing). | **DEV** (Draft-Room register) | KEEP as dev fixture | **HIDE-DEFER** (DEV-gate) | 0 | route-05 |
| 6 | `/__preview/lineups` | LineupsTabPreview | "Optimal lineup vs Cole Vesper" — lineup vs next starter, rotation auto-advance, mojo/fitness tweaks (mock data). | **DEV** (Draft-Room register) | KEEP as dev fixture | **HIDE-DEFER** (DEV-gate) | 0 | route-06 |
| 7 | `/__preview/ingame-advisor` | InGameAdvisorPreview | "THE BOOK SAYS" bullpen decision card w/ win-prob comparison (mock). | **DEV** (darker ballpark ground rgb(26,36,28)) | KEEP as dev fixture | **HIDE-DEFER** (DEV-gate) | 0 | route-07 |
| 8 | `/__preview/construction-rail` | ConstructionRailPreview | "From League to Launch" 8-step build-a-franchise rail (League→Pool→Draft Setup→Draft→Farm→Staff→Freeze→Season). | **DEV** (Draft-Room register) | KEEP as dev fixture | **HIDE-DEFER** (DEV-gate) | 0 | route-08 |
| 9 | `/__preview/staffing` | EndOfDraftStaffingPreview | "Staff Your Clubs" manager+reporter hire preview (mock clubs). | **DEV** (Draft-Room register) | KEEP as dev fixture | **HIDE-DEFER** (DEV-gate) | 0 | route-09 |
| 10 | `/__preview/scout-hire` | ScoutHirePreview | "Hire Your Scout" scout market preview (mock). | **DEV** (Draft-Room register) | KEEP as dev fixture | **HIDE-DEFER** (DEV-gate) | 0 | route-10 |
| 11 | `/__preview/my-teams` | MyTeamsSwitcherPreview | "MY CLUBS" clubhouse multi-club switcher (mock: Page Capitals / Brass Monkeys). | **DEV** (Draft-Room register) | KEEP as dev fixture | **HIDE-DEFER** (DEV-gate) | 0 | route-11 |
| 12 | `/franchise/select` | FranchiseSelector | "Select Franchise" empty list + New Franchise CTA + inline "Import/upload is not implemented yet" disclaimer (NS kill-list). | **OLD-DIALECT** — black ground rgb(0,0,0), PS2P type (the app's only black/blue generic screen) | RESKIN | **KEEP + RESKIN** (kill the disclaimer) | 0 | route-12 |
| 13 | `/franchise/setup` | FranchiseSetup | "NEW FRANCHISE" 6-step wizard (League/Season/Playoffs/Teams/Rosters/Confirm); seeded MLB/SML league templates appear. **UPDATE (2026-07-08, WT-C `a2a66956`):** the Season step's games-per-team and innings-per-game presets now sit beside a free-entry custom field each (games 8-200, innings 3-9, spec C-071 bound); the extra-innings rule control was restyled from radio-dots to box-buttons matching the rest of the step. | **OLD-DIALECT** — PS2P headers, hardcoded bright green rgb(107,148,98) | KEEP/reskin | **KEEP + RESKIN** (tokenize hexes, help-gate explainers) | 0 | route-13 |
| 14 | `/franchise/:id/season-summary` (`test-1`) | SeasonSummary | EMPTY-STATE renders full scaffolding: "SEASON 1 SUMMARY", 0-0 MLB standings by division, section tabs incl. dev "Season Complete Manifest", CTAs REVIEW PLAYOFF SEEDING / BACK TO FRANCHISE. | **OLD-DIALECT** — army green rgb(86,122,80), PS2P body | KEEP core | **KEEP** (help-gate/remove Manifest tab) | 0 | route-14 |
| 15 | `/franchise/:id` (`test-1`) | FranchiseHome (old hub) | EMPTY-STATE old hub shell renders fully: TOOTWHISTLE TIMES masthead, 9 tabs (Today's Game…MUSEUM), "NO GAMES SCHEDULED". Dev-speak leaks: "Franchise Mode 2 v1 durable transaction surface" (Roster & Trades), "not franchise-scoped in internal v1" (Museum), "V1 schedule is user-supplied only" (Schedule). TEAM HUB tab lists SML teams under a dummy MLB franchise id. | **OLD-DIALECT** — army green rgb(86,122,80), PS2P (old FranchiseHome shell) | FOLD/REBUILD → Lens (R-IA6) | **FLIP → FranchiseLensHub live adapter** (highest-exposure flip in the app) | 0 | route-15 |
| 16 | `/game-tracker/:id` (`test-1`) | GameTracker | EMPTY-STATE guard: "GameTracker launch data required" panel listing missing rosters; blocks init correctly. | **NEW-CANON** — ash ground rgb(203,184,156) = #CBB89C (GameTracker is the canon reference; only the guard was reachable) | KEEP (reference, SET) | **KEEP** | **1** — intentional guard error: "[GameTracker] Missing launch roster state; blocking new game initialization." | route-16 |
| 17 | `/post-game/:id` (`test-1`) | PostGameSummary (in PostGameRouteBoundary) | EMPTY-STATE guard: "Game not found" + BACK TO MENU. | Ballpark-green ground rgb(43,58,46); guard too minimal for full class — no canon typography observable | unlisted | **KEEP** | 0 | route-17 |
| 18 | `/exhibition` | ExhibitionGame | "EXHIBITION GAME" league select (MLB/SML from seed) + CONTINUE + CLEAR EXHIBITION DATA. | **NEW-CANON (leaning)** — h1 "Moms Typewriter", ballpark green rgb(43,58,46) | unlisted | **KEEP** | 0 | route-18 |
| 19 | `/elimination/select` | EliminationSelector | "Select Elimination Bracket" empty list + New CTA. | **OLD-DIALECT** — black rgb(0,0,0), PS2P | unlisted | **KEEP + RESKIN** — or **HIDE-DEFER** if JK's playoffs-deferral ruling covers standalone Elimination (flag for ruling) | 0 | route-19 |
| 20 | `/elimination/setup` | EliminationSetup | "NEW ELIMINATION BRACKET" 5-step wizard; seeded leagues appear. | **OLD-DIALECT** — PS2P + bright green rgb(107,148,98) | unlisted | same as #19 | 0 | route-20 |
| 21 | `/elimination/:id` (`test-1`) | EliminationHome | EMPTY-STATE guard: "ELIMINATION BRACKET UNAVAILABLE — not found: test-1" + back CTA. | **OLD-DIALECT** — rgb(107,148,98), PS2P | unlisted | same as #19 | 0 | route-21 |
| 22 | `/builder` | Builder | Old Builder: TEAM/PLAYER BUILDER, PLAYER ANALYZER + duplicated LEAGUE BUILDER tab, localStorage pool "POOL: 0", SMB4 team list. **Orphaned from all primary nav** (home + hubs never link it — direct URL only). | **OLD-DIALECT** — PS2P, green rgb(45,61,47) | FOLD (R-IA1) | **FOLD/FLIP** → "Lab" card inside League Office; kill duplicate League Builder tab | 0 | route-22 |
| 23 | `/league-builder` | LeagueBuilder | League Office hub: SML/MLB import/reimport cards, ~~6 module cards (LEAGUES/TEAMS/PLAYERS/ROSTERS/Draft Setup/RULES)~~ **UPDATE (2026-07-08, WT-C `a2a66956`): now 5 module cards — LEAGUES/TEAMS/PLAYERS/ROSTERS/Draft Setup; the RULES card is gone (its route was deleted, see row 34)**, CURRENT LEAGUES list. Only ONE draft card (old dup DRAFT+MLB DRAFT cards not present). Imports worked (SML 506, MLB→1166 players); `window.confirm` still used on import path (auto-accept was required). | **OLD-DIALECT** — PS2P headers, ground rgb(36,48,40)=#243028 (retinted to ballpark green but pixel type) | RESKIN + tighten | **KEEP + RESKIN** | 0 | route-23 |
| 24 | `/league-builder/leagues` | LeagueBuilderLeagues | League list (MLB "Juiced/Taxed", SML) + CREATE NEW LEAGUE + per-league Draft button. | **OLD-DIALECT** (same family as #23) | KEEP/reskin | **KEEP + RESKIN** | 0 | route-24 |
| 25 | `/league-builder/teams` | LeagueBuilderTeams | 50-team grid with managers + CREATE NEW TEAM. | **OLD-DIALECT** (same family) | KEEP/reskin | **KEEP + RESKIN** | 0 | route-25 |
| 26 | `/league-builder/players` | LeagueBuilderPlayers | 1166-player database, league tabs, position/team filters, CREATE PLAYER. | **OLD-DIALECT** (same family) | KEEP/reskin | **KEEP + RESKIN** | 0 | route-26 |
| 27 | `/league-builder/rosters` | LeagueBuilderRosters | Team roster assignment; NOTE: all 30 MLB teams show "0 players" after the draft-setup pool pull consumed rosters into the pool — verify this is intended. | **OLD-DIALECT** (same family) | KEEP/reskin | **KEEP + RESKIN** (+ verify roster-vs-pool source of truth) | 0 | route-27 |
| 28 | `/league-builder/draft-setup` | LeagueBuilderDraftSetup | **"Draft Room — {league}"** — the R-IA2 MERGE appears SHIPPED: one screen with §1 THE ROOM (league + pool/design first), §2 WHO'S PLAYING, §3 THE CLUBS (per-club owner select + MLB/farm identity), TEAM IDENTITY picker (24 archetypes), §4 THE POOL (dual shuttle, THE MONEY cap, POOL BALANCE Grounded/Balanced/Juiced, POOL QUALITY stops 64-76, POOL SOURCE ×3, Cap Fit + Suggested Neutral Cap, Regenerate/Reroll/Reset, LOCK POOL + telemetry line), §5 THE FLOOR (shills, START THE DRAFT). Working `?` help layer (in-place annotations, +1.5k chars). **Bugs found:** (a) §5 floor status line is stale in-session — showed "pool open · lock a sufficient player pool first" while the pool was LOCKED; corrected only after full reload; (b) for a 30-club league the generator's own target (825) is below the floor's draft-slot requirement (856), so Regenerate alone can never unblock THE FLOOR — manual adds were required. | **OLD-DIALECT (Draft-Room register)** — ballpark ground #243024, chalk #E8E8D8, `--ballpark-*` CSS vars, but system-ui headers (typography not canon) | MERGE (R-IA2) — the merge looks done | **KEEP** (finish canon typography; fix the two floor bugs) | 0 | route-28 |
| 29 | `/league-builder/draft-config` | `<Navigate>` → draft-setup | Redirect verified: lands on `/league-builder/draft-setup` (Draft Room). | n/a (redirect) | route KILL once merged (component lives at real route) | **KEEP** as alias, or DELETE the route line — zero UI | 0 | (same as route-28) |
| 30 | `/league-builder/scout-hire` | ScoutHire | "SCOUT DRAFT — Hire Your Draft Scouts": human clubs pick from shared pool, CPU auto-fill note, per-scout cards, Continue to MLB Auction. Chained correctly from START THE DRAFT. | **OLD-DIALECT (Draft-Room register)** — #243024 ground, system-ui h1 | KEEP (tightest screen) | **KEEP** | 0 | route-30 |
| 31 | `/league-builder/auction-draft` | LeagueBuilderAuctionDraft (AuctionStage) | Live auction floor (resumed persisted session at Lot 4/1166): ON THE BLOCK jumbotron (lot name in PS2P = the ruled jumbotron exception), PUBLIC MARKET low/expected/stretch band, CONTESTED chip, HIGH BID, budgets, THE EIGHT/ROTATION/BULLPEN/BENCH construction rail, scout-fog "TAP FOR THE READ" → full whisper panel (YOUR NUMBER / MAX BID / VALUE / Fill Reserve / Room / reason chips / BID-vs-PASS ledger), Market-Shill turn previews, Help overlay. Pre-floor it still shows a Host-setup panel (MARKET SHILLS / BID STEP / BEGIN) — R-IA3 says this dies. **UPDATE (2026-07-08, WT-A `c7d4688e`):** the small per-lot "Scout report" cover button (distinct from the whisper panel referenced above) is now a real click/tap TOGGLE (`onClick` sets/persists `revealed`; label reads "TAP FOR THE SCOUT REPORT" / "COVER IT") — supersedes the prior press-and-hold (`onPointerDown`/`onPointerUp`) mechanism confirmed in the pre-fix code. This control is shared by the `AuctionStage` `Lot` component, so the same fix applies on the farm tier (row 32) wherever it renders through `AuctionStage`. | **NEW-CANON** — ballpark ground rgb(33,44,28), ballpark vars, PS2P confined to marquee signage (reference implementation) | KEEP — reference | **KEEP** (remove host-setup panel per R-IA3) | 0 | route-31 |
| 32 | `/league-builder/farm-auction-draft` | LeagueBuilderFarmAuctionDraft | "FARM AUCTION - scouted values" legacy layout: SEED / CPU COUNT / BID INCREMENT setup inputs (R-IA3 violations), HANDOFF host setup, no session. | **OLD-DIALECT** — PS2P everywhere, army green rgb(45,61,47) (the unmigrated half; NS calls this the most jarring regression) | FOLD onto AuctionStage (R-IA4) | **FLIP → AuctionStage farm tier** (stage already implements it — see row 48) | 0 | route-32 |
| 33 | `/league-builder/staff-hire` | EndOfDraftStaffing | "END OF DRAFT — Staff Your Clubs": manager archetype + beat reporter hire for human clubs, roll names; CPU auto-fill. | **OLD-DIALECT (Draft-Room register)** — #243024, system-ui h1 | KEEP | **KEEP** (fix CTA honesty + dead recap flag per NS) | 0 | route-33 |
| 34 | ~~`/league-builder/rules`~~ **ROUTE DELETED (2026-07-08, WT-C `a2a66956`)** | ~~LeagueBuilderRules~~ | ~~"RULES PRESETS": 3 presets (Full Simulation/Quick Play/Standard) + GAME/SEASON/PLAYOFFS tabs w/ editable rules.~~ **The page, its nav card, and its route are all deleted; the URL now falls through to NotFound.** The "leave alone" verdict below is superseded — see `V1_CANON_2026-07-07.md` §6 (2026-07-07 RULES-screen ruling) and the WT-C landing. | ~~OLD-DIALECT (league-builder family; JK ruled RULES = LEAVE ALONE)~~ | ~~KEEP/reskin~~ | ~~**KEEP** (JK ruling: leave alone)~~ **DELETED** (2026-07-08 — executed the 2026-07-07 supersession; wired custom Season-step controls replace it, see row 13) | 0 | route-34 |
| 35 | `/almanac` | AlmanacHome | ALMANAC hub: quick search + mode cards (EXHIBITION / REPORTER ARCHIVE / MANAGERS / ELIMINATION / FRANCHISE archive+player search). All targets in-list. | **OLD-DIALECT (cartridge-dialect leakage)** — black rgb(0,0,0), PS2P headers outside `/` | unlisted | **KEEP + RESKIN** (almanac = priority surface; pixel-on-black violates the two-zone ruling) | 0 | route-35 |
| 36 | `/almanac/narratives` | AlmanacNarratives | "REPORTER ARCHIVE" w/ type + mode filters; EMPTY-STATE (no tidbits). | **OLD-DIALECT** (black/PS2P almanac family) | unlisted | **KEEP + RESKIN** | 0 | route-36 |
| 37 | `/almanac/managers` | ManagerAlmanac | "MANAGER ALMANAC" games/mode/instance/team filters; EMPTY-STATE (no committed manager records). | **OLD-DIALECT** (almanac family) | unlisted | **KEEP + RESKIN** | 0 | route-37 |
| 38 | `/almanac/exhibition` | ExhibitionLeaders | "EXHIBITION ALL-TIME LEADERS" batting/pitching top-5 boards + qualified toggle; EMPTY-STATE. | **OLD-DIALECT** (almanac family) | unlisted | **KEEP + RESKIN** | 0 | route-38 |
| 39 | `/almanac/elimination` | GameBrowser | "ELIMINATION GAMES" browser w/ date/team/opponent/run filters; EMPTY-STATE. | **OLD-DIALECT** (almanac family) | unlisted | **KEEP + RESKIN** | 0 | route-39 |
| 40 | `/almanac/franchise` | GameBrowser | "FRANCHISE GAMES" browser; EMPTY-STATE. | **OLD-DIALECT** (almanac family) | unlisted | **KEEP + RESKIN** | 0 | route-40 |
| 41 | `/almanac/games` | GameBrowser | "EXHIBITION GAMES" browser (default mode); EMPTY-STATE. | **OLD-DIALECT** (almanac family) | unlisted | **KEEP + RESKIN** | 0 | route-41 |
| 42 | `/almanac/games/:id` (`test-1`) | GameDetail | EMPTY-STATE guard: "GAME NOT FOUND." + GAME BROWSER link. | **OLD-DIALECT** (almanac family) | unlisted | **KEEP** | 0 | route-42 |
| 43 | `/almanac/players` | PlayerDirectory | "PLAYER SEARCH" — EMPTY-STATE: "NO PLAYERS IN THE ALMANAC YET. PLAY A GAME TO GET STARTED." | **OLD-DIALECT** (almanac family) | unlisted | **KEEP + RESKIN** | 0 | route-43 |
| 44 | `/almanac/players/:canonicalId` (`test-1`) | PlayerDirectory | EMPTY-STATE: "PLAYER NOT FOUND." | **OLD-DIALECT** (almanac family) | unlisted | **KEEP** | 0 | route-44 |
| 45 | `/almanac/players/:cid/:iid` (`test-1/test-1`) | PlayerInstanceCard | EMPTY-STATE: "Player instance not found" + nav links. | **OLD-DIALECT** (almanac family) | unlisted | **KEEP** | 0 | route-45 |
| 46 | `/almanac/teams/:leagueId/:teamId` (**real ids** `mlb/angels`) | TeamPage | Real seeded team renders: "CALIFORNIA ANGELS · CAL · SWAGGER CENTER" + TEAM IMPACT / MANAGER TENURE / ROSTER sections (all empty — no games yet). | **OLD-DIALECT** (almanac family) | unlisted | **KEEP + RESKIN** | 0 | route-46 |
| 47 | `/__preview/fame-pip` | FamePipPreview | FamePip isolated render matrix (tiers × sizes). | **DEV** — Tox Typewriter h1 (canon typography), transparent ground | KEEP as dev fixture | **HIDE-DEFER** (DEV-gate) | 0 | route-47 |
| 48 | `/__preview/auction-stage` | AuctionStagePreview | AuctionStage showroom with **MLB stage / Farm stage tabs** — the farm tier + scout-fog reveal exist here (the R-IA4 target implementation), mock lot RAFA FENOMENO. | **DEV** (showroom of a NEW-CANON component) | KEEP as dev fixture | **HIDE-DEFER** (DEV-gate; source for row 32's FLIP) | 0 | route-48 |
| 49 | `/__preview/franchise-lens` | FranchiseLensPreview | FranchiseLensHub full mock: club picker chips, identity banner, beat-writer voice w/ mood, Clubhouse tabs, newspaper. | **DEV** (showroom of NEW-CANON: 57 `fen-*` nodes, Moms Typewriter headline) | KEEP — the destination | **HIDE-DEFER** (DEV-gate; the component itself is row 15's FLIP target) | 0 | route-49 |
| 50 | `/__preview/franchise-lens/:id` (`test-1`) | FranchiseLensLivePreview | Live lens adapter renders against real league-builder data: 50-club picker rail (77 `fen-*` nodes) — EMPTY-STATE franchise but the adapter runs. | **DEV** (NEW-CANON component, live adapter) | KEEP — promote toward `/franchise/:id` (C4-C) | **HIDE-DEFER** as preview; **promote adapter** to row 15 | 0 | route-50 |
| 51 | `/__preview/player-instance-card` | PlayerInstanceCardPreview | PlayerInstanceCard fixture gallery (fame tiers, ratings fallbacks). | **DEV** — Tox Typewriter | KEEP as dev fixture | **HIDE-DEFER** (DEV-gate) | 0 | route-51 |
| 52 | `/__preview/fame-leaderboard` | FameLeaderboardPreview | Fame leaderboard fixture gallery (top-3 per side). | **DEV** — Tox Typewriter | KEEP as dev fixture | **HIDE-DEFER** (DEV-gate) | 0 | route-52 |
| 53 | `/__preview/matchup-drama-bar` | MatchupDramaBarPreview | MatchupDramaBar fixture gallery (V1-slim proof route). | **DEV** — Tox Typewriter | KEEP as dev fixture | **HIDE-DEFER** (DEV-gate) | 0 | route-53 |
| 54 | `/__preview/commentary-feed` | CommentaryFeedPreview | CommentaryFeed proof route (fixture NewsBoard + typewriter line). | **DEV** — Moms Typewriter | KEEP as dev fixture | **HIDE-DEFER** (DEV-gate) | 0 | route-54 |
| 55 | `/__preview/commentary-feed-persistence` | CommentaryFeedPersistencePreview | IndexedDB round-trip harness (write/clear persisted commentary). | **DEV** — Moms Typewriter | KEEP as dev fixture | **HIDE-DEFER** (DEV-gate) | 0 | route-55 |
| 56 | `/__preview/between-inning-summary` | BetweenInningSummaryPreview | Mocked I1→I2 popup-to-feed flow (mocked Grok response through useCommentaryFeed). | **DEV** — Moms Typewriter | KEEP as dev fixture | **HIDE-DEFER** (DEV-gate) | 0 | route-56 |
| 57 | `/__preview/franchise-v1-visual-smoke` | FranchiseV1VisualSmokeSeed (DEV-gated) | **Route not registered in this production build** (`import.meta.env.DEV` gate works) → renders 404 NotFound. | **DEV** (correctly gated out) | dev-only (R-IA7) | **KEEP** (already gated — the R-IA7 model the other 16 previews should follow) | 0 | route-57 |
| 58 | `/__preview/franchise-lens-seed` | FranchiseLensSeed (DEV-gated) | Not registered in prod → 404 NotFound. | **DEV** (gated out) | dev-only | **KEEP** (gated) | 0 | route-58 |
| 59 | `/__preview/franchise-lens-seed-played` | FranchiseLensSeedPlayed (DEV-gated) | Not registered in prod → 404 NotFound. | **DEV** (gated out) | dev-only | **KEEP** (gated) | 0 | route-59 |
| 60 | `/__preview/franchise-v1-manual-smoke-setup` (FRANCHISE_MANUAL_SMOKE_SETUP_ROUTE) | FranchiseManualSmokeSetup (DEV-gated) | Not registered in prod → 404 NotFound. | **DEV** (gated out) | dev-only | **KEEP** (gated) | 0 | route-60 |
| 61 | `*` (probe: `/this-route-does-not-exist`) | NotFound | "404 — Page Not Found" + Go Home. | **OLD-DIALECT** — slate rgb(15,23,42) ground, PS2P h1 (generic) | unlisted | **KEEP** (light reskin candidate) | 0 | route-61 |
| 62 | *(supplementary wildcard probe: bare `/franchise`)* | NotFound via `*` | Confirms non-route segments under `/franchise` fall to the 404 (no partial-match surprises). | as row 61 | n/a | n/a (evidence row) | 0 | (route-61) |

---

## CLICK-CRAWL ADDENDUM (primary hubs)

All discovered nav targets resolve **inside** the inventoried route list; no hub leads to an uninventoried URL. Major in-page states (modals/sub-tabs) noted:

- **`/` home:** 5 anchors — Living Season→`/franchise/select`, Exhibition→`/exhibition`, Elimination→`/elimination/select`, League Builder→`/league-builder`, Almanac→`/almanac`. **No link to `/builder` anywhere in primary nav** → `/builder` is reachable only by direct URL (supports FOLD).
- **`/league-builder` hub:** 6 module cards → leagues/teams/players/rosters/draft-setup/rules (all in-list). Import buttons use `window.confirm` (native dialog — NS anti-pattern). No Lab/builder card; scout-hire/auction/staff-hire are reachable only through the draft chain (by design).
- **`/league-builder/draft-setup`:** "design your roster ›" is an in-page mode switch (stays on route; pairs with "Design first"); `?` toggle reveals in-place help annotations (+1.5k chars — the C4 help-layer pattern, working). START THE DRAFT → `/league-builder/scout-hire` → "Continue to MLB Auction" → `/league-builder/auction-draft` (chain verified live).
- **`/league-builder/auction-draft`:** Help overlay (+317 chars in-place); "Review CPU decision" header toggle (in-page mode); per-lot NEXT LOT flow; "Back to League Builder" button. Whisper read gated behind "🔒 TAP FOR THE READ" / "🔒 COVER IT" (scout-fog interaction works).
- **`/franchise/:id` (old hub):** 8 sub-tabs are in-page states (same URL): SCHEDULE (user-supplied games + Add Game), STANDINGS (full league), TEAM HUB (team select → FAN MORALE/ROSTER/DIRECTORY/STATS/STADIUM/MANAGER), LINEUPS ("No controlled team set"), LEAGUE LEADERS, AWARDS (projected watchlist), ROSTER & TRADES (dev-speak header), MUSEUM (global, "internal v1" notice).
- **`/franchise/:id/season-summary`:** 5 section tabs (Final Standings / League Leaders / Awards Status / Your Team / **Season Complete Manifest** ← dev trust-report, NS flags) + CTAs REVIEW PLAYOFF SEEDING, BACK TO FRANCHISE (in-page/back-nav).
- **`/almanac` hub:** cards → exhibition, narratives, managers, elimination, franchise archive, `players?mode=franchise` (query variant of in-list route), HOME→`/`.

## PART-A SMOKE FINDINGS (functional, from the seeded run)

1. **Ported draft-setup controls all render and work:** Pool Balance (Grounded/Balanced/Juiced), Pool Quality stops (64/66/68/70-baseline/72/74/76), Pool Source (Team roster priority / Full player pool / Import from branded teams), Cap Fit diagnostic + Suggested Neutral Cap, Regenerate. **Regenerate ×2 same settings → pool size stable at 825/825 target both times** (achieved quality 68.0 both runs; suggested cap wiggled $1,005,645→$1,005,452 as values rerolled; label stable **"Cap Rich"**).
2. **BUG — floor status staleness:** after LOCK POOL, §5 THE FLOOR kept showing "pool open" and START stayed blocked with the wrong reason ("lock a sufficient player pool first") until a full page reload re-derived it. Identity-set updates, by contrast, flowed live.
3. **BUG/DESIGN GAP — 30-club sufficiency:** floor requires 856 draft slots but the production-shaped generator targets 825 → Regenerate alone can never satisfy a 30-club room; had to hand-add 341 players (pool 1166, "surplus +310"). Either the target should read the room's slot requirement or the floor threshold is wrong.
4. **Auction smoke PASS:** setup→scout-hire→auction chain works; whisper panel complete (YOUR NUMBER $65,000 / MAX BID $65,000 / VALUE NEUTRAL / Fill Reserve $174,387 / Room $1,031,449 / reason chips: priority need · similar repl. · under ceiling · NEED +35% / BID-vs-PASS roster-completion ledger); 3 lots run, CPU bids sane (e.g. Cleveland $42,035 vs $37.0k/$47.2k/$55.8k band; shill passed an unattractive price with an explanation); session persists per pick (survived navigation, resumed at Lot 4). **Zero console errors across the entire Part-A flow.**
5. **Cosmetic:** CONTESTED chip says "40 teams are near the top of the room" — counts the 10 market shills as teams (30+10).
6. **Stale copy:** `/__preview/draft-archetypes` still says "15 historical team archetypes" (catalog is 24).
7. **Data observation:** after the pool pull, `/league-builder/rosters` shows all 30 MLB teams at "0 players" — rosters were consumed into the pool; verify intended.

## SUMMARY

**Counts by style class (61 routed surfaces):**
- CARTRIDGE: **1** (`/` — legitimate)
- NEW-CANON: **4** (GameTracker guard, auction-draft/AuctionStage, exhibition (leaning), + the FranchiseLens component pair seen via previews 49/50)
- OLD-DIALECT: **31** — three sub-dialects: army-green/pixel league-builder family (7), Draft-Room register (ballpark ground + system-ui: draft-setup, scout-hire, staff-hire), old-shell franchise/elimination/setup screens (8), black/pixel almanac family (12), NotFound (1)
- DEV: **20** (16 ungated `/__preview/*` that ship to players today + 4 correctly DEV-gated that 404 in prod)
- n/a: 1 redirect (draft-config), 1 minimal guard (post-game) folded into the counts above where classed.

**Counts by proposed verdict (61 rows):**
- KEEP (incl. keep+reskin): **36**
- FLIP: **3** — `/franchise/:id` → FranchiseLensHub live adapter; `/league-builder/farm-auction-draft` → AuctionStage farm tier; `/builder` → fold as Lab card into League Office
- HIDE-DEFER: **17** — the 16 ungated previews (DEV-gate per R-IA7) + elimination family flagged for the playoffs-deferral ruling (3 rows counted at KEEP pending ruling; if ruled deferred, HIDE-DEFER count rises to 20)
- DELETE: **1** — `/__preview/draft-archetypes` (after copy harvest)
- Evidence-only rows: 2 (redirect row 29 ≈ KEEP-alias; row 62 probe)

**Ten highest-impact FLIP/DELETE/fix rows, ranked by user exposure:**
1. **Row 15 — `/franchise/:id` FLIP → FranchiseLensHub live adapter** (the daily season home screen; old army-green shell w/ dev-speak; adapter proven working at row 50).
2. **Row 32 — farm-auction FLIP → AuctionStage farm tier** (every draft hits the mid-journey style cliff; the stage already implements the farm tier, row 48).
3. **Rows 2-11, 47-56 — DEV-gate the 16 ungated `/__preview/*` routes** (developer screens ship to players today; the gate mechanism already exists and works — rows 57-60 prove it).
4. **Row 28 — draft-setup floor fixes** (stale lock status + 825-vs-856 sufficiency dead-end: a 30-club room can currently soft-lock the flagship flow).
5. **Row 22 — `/builder` FOLD into League Office Lab** (orphaned from nav; duplicated League Builder tab confuses the IA).
6. **Row 12 — FranchiseSelector RESKIN** (first Living-Season touchpoint; only black/blue generic screen; "not implemented yet" disclaimer).
7. **Row 2 — DELETE `/__preview/draft-archetypes`** after harvesting its explainer copy (stale "15 archetypes").
8. **Row 31 — remove the auction Host-setup panel (R-IA3)** (setup questions on the draft floor; the room should inherit from Draft Setup).
9. **Row 15/14 — kill dev-speak copy on player-facing franchise surfaces** ("Mode 2 v1 durable transaction surface", "internal v1" museum notice, "Season Complete Manifest").
10. **Rows 35-46 — Almanac family RESKIN** (12 screens of pixel-on-black outside the cartridge; Almanac is the #2 priority surface).

**Routes that resisted classification:** row 17 (`/post-game/:id`) — only the "Game not found" guard was reachable without a completed game; ballpark-green ground but no typography surface to test. Row 18 (`/exhibition`) is transitional (canon type + green ground, no fen-* kit) — classed NEW-CANON (leaning).

---

## SCREENSHOTS INDEX

Directory: `/private/tmp/claude-501/-Users-johnkruse-Projects-kbl-tracker/416bdc73-7866-4496-903a-c381baf02bf0/scratchpad/truthmap-shots/`

| Ref | File |
|-----|------|
| route-00 | route-00-home-2026-07-07T18-48-32-239Z.png |
| route-02 | route-02-preview-draft-archetypes-2026-07-07T19-07-31-370Z.png |
| route-03 | route-03-preview-season-rules-2026-07-07T19-07-59-102Z.png |
| route-04 | route-04-preview-draft-guide-2026-07-07T19-08-20-038Z.png |
| route-05 | route-05-preview-scout-panel-2026-07-07T19-08-42-371Z.png |
| route-06 | route-06-preview-lineups-2026-07-07T19-09-09-499Z.png |
| route-07 | route-07-preview-ingame-advisor-2026-07-07T19-09-33-343Z.png |
| route-08 | route-08-preview-construction-rail-2026-07-07T19-10-21-334Z.png |
| route-09 | route-09-preview-staffing-2026-07-07T19-10-43-623Z.png |
| route-10 | route-10-preview-scout-hire-2026-07-07T19-11-08-551Z.png |
| route-11 | route-11-preview-my-teams-2026-07-07T19-11-29-768Z.png |
| route-12 | route-12-franchise-select-2026-07-07T19-11-56-855Z.png |
| route-13 | route-13-franchise-setup-2026-07-07T19-12-23-904Z.png |
| route-14 | route-14-season-summary-empty-2026-07-07T19-12-54-977Z.png |
| route-15 | route-15-franchise-home-empty-2026-07-07T19-13-18-103Z.png |
| route-16 | route-16-game-tracker-empty-2026-07-07T19-13-50-109Z.png |
| route-17 | route-17-post-game-empty-2026-07-07T19-14-17-663Z.png |
| route-18 | route-18-exhibition-2026-07-07T19-14-46-521Z.png |
| route-19 | route-19-elimination-select-2026-07-07T19-15-10-342Z.png |
| route-20 | route-20-elimination-setup-2026-07-07T19-15-31-923Z.png |
| route-21 | route-21-elimination-home-empty-2026-07-07T19-16-01-469Z.png |
| route-22 | route-22-builder-2026-07-07T19-16-28-867Z.png |
| route-23 | route-23-league-builder-hub-2026-07-07T19-16-52-721Z.png |
| route-24 | route-24-league-builder-leagues-2026-07-07T19-17-18-321Z.png |
| route-25 | route-25-league-builder-teams-2026-07-07T19-17-41-414Z.png |
| route-26 | route-26-league-builder-players-2026-07-07T19-18-08-176Z.png |
| route-27 | route-27-league-builder-rosters-2026-07-07T19-18-33-127Z.png |
| route-28 (+29) | route-28-draft-setup-2026-07-07T18-50-51-180Z.png |
| route-30 | route-30-scout-hire-2026-07-07T19-19-21-819Z.png |
| route-31 | route-31-auction-draft-live-2026-07-07T19-00-40-510Z.png |
| route-32 | route-32-farm-auction-draft-2026-07-07T19-20-09-465Z.png |
| route-33 | route-33-staff-hire-2026-07-07T19-20-34-157Z.png |
| route-34 | route-34-league-builder-rules-2026-07-07T19-20-59-840Z.png |
| route-35 | route-35-almanac-home-2026-07-07T19-21-24-007Z.png |
| route-36 | route-36-almanac-narratives-2026-07-07T19-21-47-841Z.png |
| route-37 | route-37-almanac-managers-2026-07-07T19-22-21-369Z.png |
| route-38 | route-38-almanac-exhibition-2026-07-07T19-22-47-098Z.png |
| route-39 | route-39-almanac-elimination-2026-07-07T19-23-15-537Z.png |
| route-40 | route-40-almanac-franchise-2026-07-07T19-23-38-368Z.png |
| route-41 | route-41-almanac-games-2026-07-07T19-24-01-547Z.png |
| route-42 | route-42-almanac-game-detail-empty-2026-07-07T19-24-25-583Z.png |
| route-43 | route-43-almanac-players-2026-07-07T19-24-53-806Z.png |
| route-44 | route-44-almanac-player-canonical-empty-2026-07-07T19-25-19-135Z.png |
| route-45 | route-45-almanac-player-instance-empty-2026-07-07T19-25-47-792Z.png |
| route-46 | route-46-almanac-team-page-2026-07-07T19-26-17-004Z.png |
| route-47 | route-47-preview-fame-pip-2026-07-07T19-26-48-334Z.png |
| route-48 | route-48-preview-auction-stage-2026-07-07T19-27-11-882Z.png |
| route-49 | route-49-preview-franchise-lens-2026-07-07T19-27-41-110Z.png |
| route-50 | route-50-preview-franchise-lens-live-empty-2026-07-07T19-28-08-134Z.png |
| route-51 | route-51-preview-player-instance-card-2026-07-07T19-28-32-480Z.png |
| route-52 | route-52-preview-fame-leaderboard-2026-07-07T19-28-59-523Z.png |
| route-53 | route-53-preview-matchup-drama-bar-2026-07-07T19-29-22-426Z.png |
| route-54 | route-54-preview-commentary-feed-2026-07-07T19-29-49-026Z.png |
| route-55 | route-55-preview-commentary-feed-persistence-2026-07-07T19-30-12-327Z.png |
| route-56 | route-56-preview-between-inning-summary-2026-07-07T19-30-34-232Z.png |
| route-57 | route-57-preview-v1-visual-smoke-gated-2026-07-07T19-30-53-783Z.png |
| route-58 | route-58-preview-lens-seed-gated-2026-07-07T19-31-18-059Z.png |
| route-59 | route-59-preview-lens-seed-played-gated-2026-07-07T19-31-35-892Z.png |
| route-60 | route-60-preview-manual-smoke-setup-gated-2026-07-07T19-31-54-499Z.png |
| route-61 (+62) | route-61-notfound-wildcard-2026-07-07T19-32-12-495Z.png |

*(Route numbering follows App.tsx order; there is no route-01 file because `/` was numbered route-00; row 29 is a verified redirect sharing route-28's landing shot; row 62 is a supplementary wildcard probe sharing route-61's shot. 60 PNG files cover all 62 rows.)*
