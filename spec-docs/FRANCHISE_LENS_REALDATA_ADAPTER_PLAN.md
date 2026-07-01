# Plan — Franchise Lens real-data adapter (Stream A)

> **Status: PLAN ONLY — no code written. Awaiting JK review/greenlight.** Written 2026-06-26 in the
> `codex/auction-draft-ux-rehaul` worktree. Pairs with `RESUME_FRANCHISE_FENWAY_REDESIGN.md`,
> `FRANCHISE_LENS_SURFACE_INVENTORY.md`, and `FRANCHISE_LENS_DATA_WIRING.md` (the file:line-verified
> read recipes). This plan covers ONLY the "swap mock → real data" step — the last thing left on Stream A.

---

## 0. Bottom line (plain)

The Fenway hub is finished as a clickable mock. The one remaining job is feeding it **real** franchise
data. The good news: the hub was built as a **pure display component** — it takes one bundle of view-data
and draws it; it doesn't know or care where that data comes from. So the adapter is a clean, contained
"translator": read the real engines, hand the hub the same bundle shape the mock already hands it. The view
never changes.

I recommend building this **behind a new, parallel preview address** (real data, but a separate page from
your live home screen). That's non-destructive — your live app stays exactly as it is — and it gives you a
real-data version you can actually browser-verify. Pointing your *live* home screen at the new design is a
**separate, later, explicitly-greenlit step**, because that's the part that rewrites locked tests and is
hard to undo.

**The one caveat you must know up front:** wiring real data is NOT the same as "the living season comes
alive." A large share of the richness (player morale movement, relationship swings, automatic events, the
mood matrix) is gated behind the Phase-2 "living season" switch, which is **off** in a normal save. With
real data wired but that switch off, you'll see real standings, roster, money, value, stadium, schedule,
and stat leaders — but morale will read a flat neutral with no history, and there'll be no auto-events or
relationship deltas. Turning the living season *on* is its own gate (§4).

---

## 1. The seam (verified — this is what makes it clean)

`FranchiseLensHub` is a **pure VIEW component** (its own header comment, `FranchiseLensHub.tsx:5`:
"Pure VIEW component: renders from a HubVM"). Its props (`FranchiseLensHub.tsx:363-369`, component
`:396`):

```ts
FranchiseLensHub({ teams: TeamPickerVM[], active: ActiveTeamVM, hub: HubVM, onSelectTeam })
```

The mock preview page assembles those three values and renders the component
(`FranchiseLensPreview.tsx:949`), and its own comment (`:31`) already names this as the adapter seam:
*"the live-data adapter; the FranchiseLensHub component is unchanged."*

**So the adapter's entire deliverable is: produce `{ teams, active, hub }` from real data.** Nothing in
the 1,728-line hub changes.

### `HubVM` is the master checklist (`FranchiseLensHub.tsx:347-361`)

```ts
interface HubVM {
  home?:       SeasonHomeVM;       // Clubhouse: lead story + impact cards + next game
  news?:       NewsVM;             // Tootwhistle: stories + recaps + The Wire + reporter desk
  pulse:       PulseVM;            // REQUIRED — club pulse (fan morale, clubhouse avg, payroll, standing)
  roster:      PlayerRowVM[];      // REQUIRED — the roster table (+ each row's drawer payload)
  rosterExtras?: RosterExtrasVM;   // farm (10) + analyzer advice + trade demands + cap note
  standings?:  StandingsRacesVM;   // standings + races + The Hardware + All-Star + Playoff Picture
  stadium?:    StadiumVM;          // spray chart + park factors + records + home-park rivalry
  schedule?:   ScheduleVM;         // upcoming + recent results
  almanac?:    AlmanacVM;          // league leaders + trophy case
  checkpoint?: CheckpointVM;       // the transcription takeover (pending overlays grouped by checkpoint)
  moments?:    MomentsVM;          // firing / rebrand / ceremony / random-event-confirm takeovers
  loading?:    boolean;
  emptyNote?:  string;
}
```

**Only `pulse` and `roster` are required.** Every other surface is optional — so a partial adapter is
valid: fill the spine first, leave the rest `undefined`, and those tabs render their empty state until we
wire them. This is what lets us ship the adapter **incrementally** (§6) instead of in one big risky drop.

---

## 2. Approach

**Build a hook `useFranchiseLensData(franchiseId, season)` → `{ teams, active, hub }`**, mirroring the
existing `useFranchiseData` async-load patterns (cancel-guarded `useEffect`s over IndexedDB; verified
patterns at `useFranchiseData.ts:313-362, 420-463`). Then a **new parallel route**
`/__preview/franchise-lens/:franchiseId` renders `<FranchiseLensHub>` fed by the hook instead of the mock.

- **Live app untouched.** The existing mock route `/__preview/franchise-lens` (no id) keeps working as the
  design reference; the new `:franchiseId` route is the real-data version; the *live*
  `/franchise/:franchiseId` (`App.tsx:298`, `FranchiseHome`) is not touched until the §7 swap.
- **No new providers needed** — the route inherits `BrowserRouter` + `AppProvider` from `main.tsx:12-16`
  (verified in the wiring artifact). Franchise identity comes from the URL param, read exactly as
  `FranchiseHome.tsx:274` does. There is no "active franchise" in context.
- **Reuse, don't reinvent, the read patterns.** The legacy hub (`FranchiseHome.tsx` /
  `TeamHubContent.tsx` / `useFranchiseData.ts`) already reads every one of these stores correctly; the
  adapter copies those patterns. Where sensible, the adapter can *call* `useFranchiseData(franchiseId,
  season)` directly for grouped standings + leaders + the lens/rival ids, then layer the per-team colors
  and the richer surfaces on top.

### The lens team + rival (already a stable seam)
`useFranchiseData` now exposes `lensTeamId` (= `controlledTeams[0]?.teamId`) and `rivalTeamId` (from the
home-park rivalry, `getHomeParkRival`). The hub already consumes these: `lensTeamId → active.id`,
`rivalTeamId → active.rivalId/rivalName` (drives the red rival highlight everywhere). v1 uses
`controlledTeams[0]`; a multi-team lens selector is a deferred decision (§9).

---

## 3. What the adapter produces

| HubVM field | Real source (verified ✔ / needs point-of-use re-verify ⚠) | Notes |
|---|---|---|
| `teams` (`TeamPickerVM[]`) | ✔ `getAllFranchiseTeams(franchiseId)` → `Team[]`; colors off `team.colors.primary/secondary` | NOT `getTeamColors` (hardcoded ~2 entries). Fallback to global `getAllTeams()` if `[]`. |
| `active` (`ActiveTeamVM`) | ✔ team join + `calculateStandings` record; `lensTeamId`/`rivalTeamId` from `useFranchiseData` | archetype/GM/manager/scout/reporter = draft-setup identity (Stream B data; mock until that wires) |
| `pulse` (req.) | ✔ `getFranchiseMoraleSnapshot(scope,'team-fan',teamId)` + payroll/standing from teams⨝standings | **DARK-aware:** fan morale reads neutral-50/no-history with Phase-2 off (§4) |
| `roster` (req.) | ✔ `getAllFranchisePlayers` ⨝ `useSeasonStats` (WAR) ⨝ `getFranchiseDesignationRows` ⨝ morale | full recipe in `FRANCHISE_LENS_DATA_WIRING.md` §1-2; True Value via snapshots (drawer six) |
| `rosterExtras` | ⚠ `rosterAnalyzerEngine`, farm via player roster-status, `tradeRequestGeneration` | trade demands 🟡 DARK (L10 flag) |
| `standings` | ✔/⚠ `calculateStandings` + `computeFranchiseAwardsPreview` (races) + `getFranchiseAllStarRoster` | the 4 all-star getters are stubbed today — wire them |
| `stadium` | ⚠ `buildFranchiseStadiumFoundationReport` + `ParkFactors` + records catalog + `getHomeParkRival` | spray rows from foundation report; V2 fame-bearing records ⚪ ABSENT (merge later) |
| `schedule` | ⚠ `scheduleStorage` (upcoming + results) | mostly 🟢 LIVE |
| `almanac` | ⚠ `seasonStorage` leaders + `museumStorage` trophy case | leaders 🟢; records explorer 🟡 partial |
| `news` | ⚠ `SeasonNewsItem` (sort by `dramaticWeight`) + `GameStory` recaps + reporter dossier | most adapters 🟡 DARK (L10-L13) |
| `checkpoint` | ⚠ pending ratings/trait overlays grouped by `sourceEventId="checkpoint-{n}"` | 🟡 DARK (Phase-2 ratings dev) |
| `moments` | ⚠ L11 firing / rebrand cascade / awards ceremony / L10 event-confirm | 🟡 mostly DARK; surface only when an event exists |

✔ = read recipe verified to file:line in `FRANCHISE_LENS_DATA_WIRING.md`.
⚠ = source file identified (surface inventory), but the **exact function signature / return shape must be
re-read from source at the point of use** before coding it (the FRANCHISE_API_MAP † rule — catalog-inferred
signatures are not trusted). This is normal build-time verification, not a gap in the plan.

---

## 4. LIVE vs DARK — the crux (set expectations before wiring)

The surface inventory grades every source 🟢 LIVE / 🟡 DARK / ⚪ ABSENT. With a **normal save (Phase-2 living
season OFF)**, the adapter will show:

**Real and meaningful today (🟢):**
- Teams, colors, abbreviations, the lens/rival identity
- Standings (W/L/PCT/GB/L10/streak/run-diff/home/away), division buckets, games-back
- Roster: names, positions, WAR, salary, grade
- Award races + the Hardware board + All-Star board (from completed-game stats)
- Stadium: spray chart, park factors, oddity records, best/worst-here
- Schedule (upcoming + results), Almanac stat leaders, trophy case
- Payroll/cap math

**Built but DARK until the Phase-2 switch flips (🟡) — reads neutral/empty:**
- **Player morale movement + history** (reads flat **50**, no history — `franchiseMoraleState` writes are
  gated by `isFranchisePhase2MoraleEnabled`; only draft-seed / confirmed-random-event / manual override
  populate it otherwise). Verified in `FRANCHISE_LENS_DATA_WIRING.md` §morale.
- **Relationship deltas, captain routing, mood ripples, fan↔player coupling, the full morale event catalog**
- **Automatic L10 random events**, trade demands, the matrix-driven news adapters (The Wire)
- **Checkpoint ratings/trait development** (no pending overlays accrue with dev gated)
- **True Value drift** depends on the snapshot writer cadence (verify whether it runs with flags off)

**Absent here (⚪) — do not build, flag for merge:**
- V2 fame-bearing stadium records (live on `franchise-v1-next`).

**Implication for JK:** the most honest first milestone is *"the spine lights up with real data"* (standings/
roster/economics/stadium/schedule/leaders), with the soul layer rendering its real-but-neutral state. Seeing
the *living* season requires flipping `franchisePhase2*` — a separate decision with its own browser-verify
pass. The hub was deliberately built so 🟡 surfaces "fill in" the moment the flag flips, no UI rework.

---

## 5. What's verified vs what needs point-of-use re-verification

**Verified to file:line already (safe to code against directly):**
- The route/provider/param mechanics (`App.tsx:298`, `main.tsx:12-16`, `FranchiseHome.tsx:274`).
- Teams + colors + records (`getAllFranchiseTeams`, `Team.colors`, `calculateStandings`/`TeamStanding`,
  the 0-0 fallback, division regrouping).
- Roster + designations join (`getAllFranchisePlayers`, `useSeasonStats` WAR, `getFranchiseDesignationRows`,
  the badge getters).
- Morale reads (`getFranchiseMoraleSnapshot`/`listFranchiseMoraleSnapshots`, the spec adapters, the DARK
  gating).

**Must re-read from source before coding (⚠ in §3):** `computeFranchiseAwardsPreview`,
`getFranchiseAllStarRoster` (+ the 4 stubbed getters), `buildFranchiseStadiumFoundationReport`, `ParkFactors`,
the stadium records catalog, the player-drawer six (`mergeRatingsOverlays`, `FranchiseTrueValueSnapshotRow`,
`FranchiseTraitOverlayRow`, morale history, `RelationshipEdgeRow`, `FranchiseFameRecordRow`), `scheduleStorage`,
`seasonStorage` leaders + `museumStorage`, `SeasonNewsItem`/`GameStory`, the checkpoint overlay grouping, and
each `moments` engine. Each gets a quick source read at its build step — that's the † re-verify discipline,
not optional.

---

## 6. Build sequence (incremental — each phase is a shippable slice of `HubVM`)

Each phase: build the slice → `npm run build` (gate) → vite preview on a unique port → playwright screenshot
from the auction-ux worktree (§8) → eyeball against the mock. Ship behind the `:franchiseId` preview route;
live app stays untouched throughout.

- **Phase 0 — scaffold.** New route `/__preview/franchise-lens/:franchiseId`; `useFranchiseLensData` hook
  shell with the cancel-guarded loaders; `loading`/`emptyNote` wired; render the hub with `roster: []` +
  a neutral `pulse`. Proves the seam end-to-end with real franchise identity.
- **Phase 1 — the spine (mostly 🟢, all verified recipes).** `teams` + `active` (colors, record, lens/rival)
  + `roster` (names/pos/WAR/salary/designation) + `pulse` (payroll/standing/fan-morale-neutral-aware) +
  `standings` (standings + races + Hardware + All-Star + Playoff Picture). **This is the high-value,
  low-risk milestone** — JK can browser-verify a real-data hub.
- **Phase 2 — stadium + schedule + almanac (mostly 🟢).** Spray chart + park factors + records + home-park
  rivalry callout; schedule upcoming/results; almanac leaders + trophy case.
- **Phase 3 — the player drawer depth.** The "drawer six" → `PlayerDetailVM` (True Value sparkline, ratings
  base→current, per-player spray, traits, morale, ties, fame, career, milestones). Highest field-count slice;
  several inputs are 🟡 DARK (renders real-but-sparse with flags off).
- **Phase 4 — the soul + moments + news (🟡 DARK-dominant).** `news` (The Wire + recaps + reporter desk),
  `rosterExtras` (farm/advice/trade-demands), `checkpoint`, `moments`. Wire them so they light up when
  Phase-2 flips; expect mostly-empty renders on a flags-off save (correct behavior, not a bug).

Rationale for the order: front-load the 🟢 LIVE, file:line-verified surfaces (immediate real-data payoff,
lowest risk); push the 🟡 DARK-dominant surfaces last (they can't be fully browser-verified until the
living-season flag flips anyway).

---

## 7. The greenlight-gated LIVE swap (separate, destructive — NOT in this plan's build)

Only after JK is satisfied with the real-data preview:
- Repoint the live `/franchise/:franchiseId` route (`App.tsx:298`) from `FranchiseHome` to the new hub.
- Rewrite/retire the **test-pinned strings** on the legacy hub (`FranchiseHome`/`TeamHubContent` have
  characterized tests; D11-locked copy — see the memory note on franchise-hub copy being test-characterized).
- Decide the fate of the legacy hub (keep as fallback vs remove).

This is the "hard to reverse" part (frozen-test rewrite + live route change). It is intentionally a distinct,
separately-greenlit step. The incremental adapter (§6) delivers all the value with none of this risk.

## 8. Verification gate (per phase)

Per the working gotcha — screenshot MCP tools were unreliable last session, so use the proven pattern:
1. `npm run build` from the worktree (exit 0 gate).
2. `npx vite preview --port <unique> --strictPort` from the worktree.
3. A node + playwright `.cjs` script run **from `/Users/johnkruse/Projects/kbl-tracker--auction-ux`** (the
   only worktree with `playwright` in node_modules; chromium-1217 in the global cache) targeting the preview
   port. **Do NOT use `preview_start`** — it serves the MAIN tree, not the worktree.
4. Real-data load needs a real franchise id in the URL — use an existing save's `franchiseId` (or seed one).
5. JK manual browser sign-off remains the sole real-world acceptance gate (batchable per the gate rule).

## 9. Open decisions for JK
1. **Confirm the parallel-route approach** (build real data behind `/__preview/franchise-lens/:franchiseId`,
   live home screen untouched) vs going straight to the live swap. *Recommendation: parallel route first.*
2. **Phase-2 living-season flags:** keep OFF for the first real-data pass (spine-only, honest), or flip ON in
   a test save so the 🟡 soul surfaces show real movement during verification? *Recommendation: OFF first,
   then a dedicated flags-ON verify pass.*
3. **Multi-controlled-team lens selector** — v1 pins `controlledTeams[0]`. Add a switcher now or defer? *Defer.*
4. **Which franchise id** to verify against (existing save vs a seeded demo franchise).

## 10. Effort & risk
- **Risk: LOW** for Phases 0-2 (pure-additive, parallel route, verified recipes, live app untouched).
  **MEDIUM** for Phases 3-4 (more inputs, several DARK, signatures need point-of-use re-verification).
  **HIGH** only for §7 (the live swap + frozen-test rewrite) — gated and deferred.
- The pure-view architecture means **zero hub changes** — the adapter is purely additive code plus one new
  route. Nothing existing is modified until §7.
