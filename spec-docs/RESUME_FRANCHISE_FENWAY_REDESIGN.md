# RESUME — Franchise + Auction "Aged Fenway" UX Redesign

> **Start-here note to continue this redesign in a fresh session.** Read the two canonical docs below
> first, then pick up at "What's next." Everything is committed; nothing is half-done.

---

## Where the work lives
- **Branch:** `codex/auction-draft-ux-rehaul` — an **isolated worktree** at
  `/Users/johnkruse/Projects/kbl-tracker--auction-ux` (APFS-cloned `node_modules`). Off `franchise-v1-next`
  HEAD. **Never merged** — JK's live app is untouched. Build-green, working tree clean.
- **Live preview (mock-fed):** route `/__preview/franchise-lens`. The franchise hub. (Auction preview at
  `/__preview/auction-stage`.)
- **Run it for JK:** from the worktree, `npm run dev -- --port 5180 --strictPort` (background); open
  `http://localhost:5180/__preview/franchise-lens`. Separate origin → can't touch JK's real :5173 data.

## Read FIRST (the contract)
1. `spec-docs/FRANCHISE_DESIGN_SYSTEM.md` — "The Living Season at the Old Ballpark." The five laws, the
   visual system, the IA (tabs), the surfacing engine. **This is what we build to.**
2. `spec-docs/LIVING_SEASON_DATA_SURFACE_MAP.md` — field-level: what each system produces, where it
   lives, room, and **live-now vs flag-dark.** The build order is in its §3.
3. `spec-docs/AUCTION_DRAFT_UX_REDESIGN.md` — the auction-draft redesign (design + the greenlight-gated
   production swap).

## Locked rules (JK-approved — do not drift)
- **Look:** aged "Green Monster" scoreboard. Palette = official KBL 8 (`color_palette.md`); dominant
  trio = Wrigley Green board + chalk-white + scoreboard-yellow; cream/navy/red/etc = accents only.
- **Two fonts, by voice:** **Creamy Chalk** (real chalk, BUNDLED webfont — JK ruling 2026-06-26) for EVERY
  board label, number, and clickable surface, so the board reads as hand-chalked, NOT typewritten;
  **Mom's Typewriter** ONLY for the reporter's words (the Season Home lead story + the Tootwhistle Times).
  Creamy Chalk is **caps-only** (lowercase maps to caps) → the whole board renders **all-caps**, which JK
  approved board-wide for the scoreboard feel (digits render cleanly). The board font is the single CSS var
  `--fen-chalk-font` (Creamy Chalk → Chalkduster → Tox Typewriter → Courier fallback). *(chalk.otf stays
  rejected — childish scrawl.)*
- **Team color = banner only.** The board stays white/yellow chalk: your club yellow (like the live
  half-inning), rival red, others white. No team-color washes on the board.
- **Money = option B:** small typewriter `$`/`k`/`M` + chalk digits.
- **Surface by impact, not inventory:** the Season Home shows the few things that matter, ranked; rest a
  tap away. **Help toggle** (bottom-right, faint): hides all exposition by default; reveals the teaching
  layer when on. Only show text that does real work.
- **Team lens:** pick a club → the whole hub reframes to it; banner shows team + archetype + GM +
  manager + scout + beat reporter (mood).

## What's DONE (real React, build-green, mock-fed, on the preview branch)
- **Auction draft:** design + clickable prototype + a real `AuctionStage` React component + token layer
  (`/__preview/auction-stage`). Production swap is greenlight-gated.
- **Franchise hub** (`FranchiseLensHub.tsx` + `fenway-theme.css`, page `FranchiseLensPreview.tsx`):
  team-lens shell + branding banner (archetype + crew), tab strip (new IA), **The Clubhouse** (Season
  Home: lead story + ranked impact cards + next-game cockpit), **Roster** (designations + WAR + Salary +
  **True Value + Net gap** + Morale ledger popover + payroll chip), **Tootwhistle Times** (newspaper),
  the bottom **Help** toggle, and the two-voice font split.
- **Standings & Races** tab (`StandingsRacesTab` in `FranchiseLensHub.tsx`): division standings (full
  `TeamStanding` row — W/L/PCT/GB/L10/streak/run-diff/home/away), the awards races as **gap bars** to the
  frontrunner (MVP/Cy/ROY), and the **All-Star board** (starters/reserves by position + snubs, snub ties
  back to the roster morale). All chalk; your club yellow, rival red, others white (id-keyed via
  `active.rivalId`). VMs field-aligned to the live engine types so the adapter is a clean map; mock-fed
  by a shared `LEAGUE` const in `FranchiseLensPreview.tsx`. Build-green, zero console errors.
- **Stadium** tab (`StadiumTab` in `FranchiseLensHub.tsx`): a **chalk-drawn ballpark spray chart** (SVG
  field — foul lines, wall arc, infield diamond; dots placed by `direction`×`depth`, colored by outcome:
  HR red / XBH yellow / 1B cream / out gray / error navy) with a **batting/pitching/fielding** role toggle
  + legend + summary stats; a **park-factors** box (overall/runs/HR, >100 yellow hitter-park, <100 red
  pitcher-park); and the **House of Horrors** record book (the 8-type catalog). VMs (`StadiumVM`,
  `SprayDotVM`, `SprayRoleVM`) field-aligned to `buildFranchiseStadiumFoundationReport` / `ParkFactors` /
  the records catalog. Per-club mock (`STADIUM_PC/BM/RR`); team-switch reframes everything. Build-green,
  zero console errors. (V2 fame-bearing records still ABSENT here — on `franchise-v1-next`, merge later.)

## What's NEXT (the build order, from the Data Surface Map §3)
1. **Player drawer** — the home for per-player depth (ratings base→current, traits + history, the morale
   reasons-log, ties/relationships, fame, the True-Value sparkline) so the roster table stays clean.
   Opens from a roster name; `StadiumTab`/`StandingsRacesTab` are the build pattern to follow.
2. **Tootwhistle live feed** — adapter: lead = top-`dramaticWeight` `SeasonNewsItem`, recaps stream.
3. **Dark surfaces** (morale/ties/designation-effects/development/checkpoint) — build the UI; lights up
   when the franchise team flips the Phase-2 flags. The **Checkpoint Confirmation worklist** (SMB4
   transcription) is its own moment-driven takeover.
4. **Then the real-data adapter** (swap mock → live): wiring map in `FRANCHISE_LENS_DATA_WIRING.md` (route
   needs `:franchiseId`; `getAllFranchiseTeams`, `calculateStandings`, morale via `franchiseMoraleState`).
   Stadium specifically: `buildFranchiseStadiumFoundationReport`→spray rows (group by role, place by
   zone/direction/depth), seed `ParkFactors`→the factor box, stadium-records catalog→House of Horrors.
   For Standings & Races specifically: `calculateStandings`→divisions, `computeFranchiseAwardsPreview`→
   races (`candidates[].marginToWinner`), `getFranchiseAllStarRoster`→board (wire the 4 stubbed getters).

## Greenlight-gated (need JK before doing)
- Swapping the **live** franchise hub / auction pages over to the new design (and rewriting their
  test-pinned strings). Until then everything is a **parallel** preview surface; live app untouched.

## Gotchas
- The preview is **mock-fed** (`FranchiseLensPreview.tsx`) — real data is a later adapter step.
- **Build/screenshot loop** (worktree): `npm run build` (gate) → `npx vite preview --port 4188` →
  node + playwright (1217) screenshot script (the MCP playwright wants browser build 1200; use the
  repo's own playwright via a script). Fonts (Tox/Moms) are @font-face'd app-wide in `index.css`.
- **Two hubs:** legacy `FranchiseHome.tsx`/`TeamHubContent.tsx` is the LIVE one (has working read
  patterns to copy); the new `FranchiseLensHub` is the redesign (preview only).
- **Flags gate runtime, not the data model** — plan/design needs no flag flip; only seeing real values
  flowing does.
