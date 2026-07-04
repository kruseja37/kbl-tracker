# FABLE DESIGN SPEC — Extra-Innings "Runner on Second" (last v1 slim-rules item)

**Author:** Fable 5 (UI/UX design authority — design flows Fable → workers)
**Date:** 2026-07-03
**Status:** BINDING design spec — Codex executes, Opus audits. No design decisions left open.
**JK ruling:** v1 game rules are exactly three — season length, innings per game, and the
extra-innings ghost-runner-on-second rule with a user-picked 1|2 delay (rule kicks in the
1st or 2nd extra inning). Season length + innings already work. Only the runner-on-second
delay choice + the franchise launch wiring are new. The old RULES screen
(LeagueBuilderRules / RULES hub card) is explicitly OUT OF SCOPE — do not touch it.

---

## 0. Verified ground truth (all read from source 2026-07-03)

| Fact | Evidence |
|---|---|
| FranchiseSetup SEASON SETTINGS has GAMES PER TEAM buttons | `src/src_figma/app/pages/FranchiseSetup.tsx:633-657` |
| … INNINGS PER GAME buttons (6/7/9) | `FranchiseSetup.tsx:659-683` |
| … EXTRA INNINGS RULE radio row, options `["Standard", "Runner on 2nd", "Sudden Death"]`, writes `config.season.extraInningsRule` (string) | `FranchiseSetup.tsx:685-719` (options literal at `:690`, write at `:693-698`) |
| … static ℹ️ hint line under the radios | `FranchiseSetup.tsx:715-717` — `ℹ️ Standard: No runner placed, play until there's a winner` (NOT test-characterized; grep of `src/**/*.test.*` for "No runner placed" → 0 hits) |
| Default rule on a fresh setup is `"Standard"` | `FranchiseSetup.tsx:18` |
| GameTracker launch-state type ALREADY declares the fields | `src/src_figma/app/pages/GameTracker.tsx:1256-1257` — `extraInningRunner?: boolean; extraInningRunnerDelay?: 1 \| 2;` |
| GameTracker seeds refs from nav-state (incl. `useGhostRunner` fallback ← `extraInningRunner`) | `GameTracker.tsx:1640-1650` (fallback at `:1645-1647`) |
| GameTracker places the ghost runner at `regulationInnings + delay`, gated on the boolean | `GameTracker.tsx:1720-1802` (math at `:1721-1725`, boolean gate at `:1727`) |
| useGameState already carries both fields (refs + init config) | `src/src_figma/hooks/useGameState.ts:708-709` and `:766-767` |
| FranchiseHome franchise-game launch builds nav-state; passes `totalInnings` but NOT the runner fields | `src/src_figma/app/pages/FranchiseHome.tsx:3681-3721` (`totalInnings` at `:3714`) |
| FranchiseHome already hosts an exported pure config→nav resolver precedent | `FranchiseHome.tsx:261-263` `resolveFranchiseGameUseDH`, unit-tested at `src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx:846-847` |
| `FranchiseConfig.season` shape (has `extraInningsRule: string`) | `src/types/franchise.ts:158-167` (field at `:161`) |
| `StoredFranchiseConfig` **extends** `FranchiseConfig` — one field addition covers both types | `src/types/franchise.ts:204` |
| Stored config is built by spreading the form config — new season field flows to storage with zero pipeline change | `src/utils/franchiseInitializer.ts:752-753` (`...franchiseConfig`), persisted via `saveFranchiseConfig` `src/utils/franchiseManager.ts:336`, read via `getFranchiseConfig` `:355` |
| `useFranchiseData` hands FranchiseHome a `StoredFranchiseConfig \| null` | `src/src_figma/hooks/useFranchiseData.ts:88` |
| Exhibition already ships this exact 1\|2 sub-choice interaction (conditional reveal) | `src/src_figma/app/pages/ExhibitionGame.tsx:1176-1200` (its own defaults, incl. delay=2 at `:78`, are out of scope — leave Exhibition alone) |

**Test fixture note:** existing fixtures use lowercase `'standard'`
(`franchiseSetupLaunch.integration.test.ts:224,317`; `FranchiseHomeLaunch.test.tsx:297`).
The UI only ever writes the three title-case literals from `FranchiseSetup.tsx:690`.
The mapping in §3 treats anything that is not exactly `"Runner on 2nd"` as "no runner" —
so legacy/lowercase values fail safe.

---

## 1. THE CONTROL — delay sub-choice inside the existing EXTRA INNINGS RULE box

**Where:** `FranchiseSetup.tsx`, inside the existing bordered box (`bg-[#4A6A42] border-4
border-[#E8E8D8] p-4`, `:688`), between the radio row (`:689-714`) and the ℹ️ hint line
(`:715-717`). No new box, no new section, no layout change to anything above or below.

**Reveal rule:** rendered ONLY while `config.season.extraInningsRule === "Runner on 2nd"`.
`"Standard"` and `"Sudden Death"` do not render it (conditional render, no reserved space —
same pattern Exhibition uses at `ExhibitionGame.tsx:1176`). The box simply grows one row.

**Anatomy (top → bottom inside the box):**
1. Existing 3-option radio row — UNCHANGED.
2. **NEW sub-choice row** (only when Runner on 2nd):
   - A thin divider above it: top border `2px` in chalk at low opacity
     (`border-t-2 border-[#E8E8D8]/20`), spacing `mt-3 pt-3`.
   - Micro-label, chalk-dim caps, matching the in-box label precedent at `:609`
     (`text-[10px] text-[#E8E8D8]/70`, same 1px text-shadow):
     **`GHOST RUNNER ARRIVES`**
   - Below it, a `flex gap-4` row of TWO radio-dot buttons that are pixel-identical in
     construction to the parent options (`:691-712`): plain `<button>`, `flex items-center
     gap-2 text-xs text-[#E8E8D8]`, the `w-4 h-4 rounded-full border-2` dot, selected =
     brass fill `border-[#C4A853] bg-[#C4A853]` with the inner `bg-[#4A6A42] scale-50`
     pip, unselected = chalk ring `border-[#E8E8D8]`. Same text-shadow. No new visual
     language, no aria attributes the parent row doesn't have.
   - Option labels (title case, matching the parent options' register):
     - **`1st extra inning`** → writes `extraInningsRunnerDelay: 1`
     - **`2nd extra inning`** → writes `extraInningsRunnerDelay: 2`
   - Selected state renders from `config.season.extraInningsRunnerDelay ?? 1`
     (so a fresh reveal shows **1st extra inning** selected — matches the launch default in §3).
3. Existing ℹ️ hint line (`:715-717`) becomes **context-sensitive** — same element, same
   classes (`text-[10px] text-[#C4A853]` + shadow), exactly one line, copy switches on the
   selected rule (and delay):
   - `Standard` → keep the existing string byte-for-byte:
     `ℹ️ Standard: No runner placed, play until there's a winner`
   - `Runner on 2nd` → `ℹ️ Ghost runner takes second starting the {N} inning` where
     `{N}` = ordinal of `config.season.inningsPerGame + extraInningsRunnerDelay ?? 1`
     (mirrors the GameTracker math at `GameTracker.tsx:1725`; domain is only
     {7th, 8th, 10th, 11th} given innings ∈ {6,7,9} and delay ∈ {1,2} — a tiny inline
     ordinal is fine, no new util module). Live-updates when INNINGS PER GAME changes.
   - `Sudden Death` → `ℹ️ Sudden Death: not tracked in v1 — plays as Standard`
     (honest; sudden death is a future seam, see §3).

**Help affordance:** this screen's established explainer affordance is the one-line ℹ️
chalk hint (three precedents on the page: `:716`, `:870`, `:952`) — the copy above stays
within it. No inline paragraph, no tooltip, no new (?) button. Nothing else is added;
every element above earns its place (label names the rule's one parameter, two dots pick
it, the hint converts the abstract 1|2 into the concrete inning number the tracker will use).

**Behavior on rule switch:**
- Clicking **Runner on 2nd** also seeds `extraInningsRunnerDelay: (previous value ?? 1)`
  in the same `setConfig` call, so a saved franchise always persists an explicit delay.
- Switching away to Standard / Sudden Death **retains** the field (the choice is
  remembered if the user toggles back). The launch mapping (§3) gates on the rule string,
  so a retained delay on a Standard franchise is inert by construction.

---

## 2. THE CONFIG SHAPE — one optional field, migration-free

**Type change (the only one):** in `src/types/franchise.ts`, add to
`FranchiseConfig.season` (`:158-167`), directly under `extraInningsRule` (`:161`):

- `extraInningsRunnerDelay?: 1 | 2` — optional, additive.

That is the entire type diff:
- `StoredFranchiseConfig extends FranchiseConfig` (`franchise.ts:204`) → the stored type
  inherits the field automatically. Do NOT add a duplicate field there.
- `extraInningsRule` keeps its existing name and `string` type. NOT renamed, NOT narrowed
  to a union (fixtures already hold lowercase `'standard'`; narrowing would be a breaking
  change for zero benefit).

**Persistence path (zero new code):** FranchiseSetup writes the field into `config.season`
(§1) → `franchiseInitializer.ts:752-753` spreads `...franchiseConfig` into the stored
config → `saveFranchiseConfig` (`franchiseManager.ts:336`) → `getFranchiseConfig`
(`:355`) → `useFranchiseData.franchiseConfig` (`useFranchiseData.ts:88`).

**Default + migration:** existing franchises simply lack the field. Absent field →
`undefined` → the §3 mapping applies `?? 1`. **v1 default = 1 (runner from the first
extra inning)** — the classic ghost-runner behavior and JK's stated default. No migration
script, no DB version bump, no store change (`trackerDb` version pin and the
franchiseSeasonLedgerStorage test pin are untouched — verify nothing bumps them).

---

## 3. THE MAPPING — franchise config → GameTracker nav-state (the whole point)

**Pattern:** replicate the existing co-located pure resolver — `resolveFranchiseGameUseDH`
(`FranchiseHome.tsx:261-263`). Add ONE exported pure function in `FranchiseHome.tsx`
right beside it (this is a co-located resolver on the launch site, not a new mapper
module — see §5):

- **Name:** `resolveFranchiseExtraInnings`
- **Input:** `UseFranchiseDataReturn["franchiseConfig"]` (i.e. `StoredFranchiseConfig | null`)
- **Output:** `{ extraInningRunner: boolean; extraInningRunnerDelay: 1 | 2 }`
- **Logic (exhaustive, no other branches):**

| `config?.season?.extraInningsRule` | → `extraInningRunner` | → `extraInningRunnerDelay` |
|---|---|---|
| exactly `"Runner on 2nd"` (the literal written by `FranchiseSetup.tsx:690`) | `true` | `config.season.extraInningsRunnerDelay ?? 1` |
| `"Standard"` | `false` | `1` (inert — see gate note) |
| `"Sudden Death"` | `false` | `1` (inert) — **future seam, v1 no-op**; mark with a one-line comment so v2 sudden-death wiring lands here and nowhere else. Do NOT wire sudden-death behavior. |
| anything else (legacy lowercase `'standard'`, missing config, null) | `false` | `1` (inert) |

**Apply site:** the franchise-game launch nav-state at `FranchiseHome.tsx:3681-3721` —
spread the resolver's two fields into the first-argument object of
`withPregameManagerNavigationState`, adjacent to `totalInnings` (`:3714`). Always pass
both fields (deterministic nav-state); GameTracker gates every placement on the boolean
(`GameTracker.tsx:1727`), so the delay is inert whenever the boolean is `false`.

**Do NOT pass `useGhostRunner`:** GameTracker's own seeding mirrors `extraInningRunner`
into the ghost-runner ref when `useGhostRunner` is absent (`GameTracker.tsx:1645-1647`).
Passing only the two fields keeps the surface minimal and exercises the documented fallback.

**GameTracker and useGameState are consumed AS-IS.** The nav-state fields already exist
(`GameTracker.tsx:1256-1257`), the placement math already exists (`:1720-1802`), the hook
plumbing already exists (`useGameState.ts:708-709`, `:766-767`). Zero edits in either file.

---

## 4. ACCEPTANCE TESTS (builder must add ALL of these; RED-first where feasible)

**A. Resolver unit tests** — extend `src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx`
(follow the `resolveFranchiseGameUseDH` precedent at `:846-847`):
1. rule `"Runner on 2nd"`, delay `2` → `{ true, 2 }`
2. rule `"Runner on 2nd"`, delay absent (legacy franchise) → `{ true, 1 }` ← **the migration test**
3. rule `"Standard"` → `{ false, … }` (boolean false is the assertion that matters)
4. rule `"Sudden Death"` → `{ false, … }` (v1 no-op proof)
5. legacy lowercase `'standard'` (existing fixture value) and `null` config → `{ false, … }`

**B. Launch nav-state integration** — same file (it already exercises the launch path):
for each of the three rule values, assert the navigate state passed to
`/game-tracker/franchise-g…` contains the correct `extraInningRunner` /
`extraInningRunnerDelay` pair per the §3 table, alongside the existing `totalInnings`
assertion surface.

**C. Config persistence round-trip incl. delay** — extend
`src/src_figma/__tests__/franchiseMode/franchiseSetupLaunch.integration.test.ts`
(fixtures at `:223-224`, `:316-317`): initialize a franchise whose season carries
`extraInningsRule: "Runner on 2nd"` + `extraInningsRunnerDelay: 2`; read back via
`getFranchiseConfig` and assert both fields survive the `franchiseInitializer.ts:752`
spread. Also assert a config WITHOUT the delay field round-trips with the field absent
(not defaulted-at-rest — defaulting happens only at launch, in the resolver).

**D. FranchiseSetup show/hide UI** — new file
`src/src_figma/__tests__/franchiseMode/FranchiseSetupExtraInnings.test.tsx` (none exists
for this surface today): render the SEASON SETTINGS step and assert
1. sub-choice absent under `"Standard"` (default, `FranchiseSetup.tsx:18`);
2. clicking `Runner on 2nd` reveals it with **1st extra inning** selected;
3. clicking **2nd extra inning** updates the config write (delay 2) and the ℹ️ line shows
   the correct concrete inning (e.g. 9-inning game → "11th");
4. switching to `"Sudden Death"` hides the sub-choice and shows the Sudden Death ℹ️ line;
5. `"Standard"` ℹ️ line is byte-identical to the current string (`:716`).

**E. Frozen-file proof** — the diff for this ticket must show ZERO changes to
`GameTracker.tsx`, `useGameState.ts`, and `LeagueBuilderRules` (audit checks `git diff --stat`).

Gates: `npm run build` exit 0 + the four named test files green + full suite per
CURRENT_STATE.md baseline. Note the known flake: `historicalArchetypes.test` in big
batches — verify solo if it reds.

---

## 5. GUARDRAILS (restated, binding)

1. **GameTracker + useGameState are FROZEN.** Consume-only via nav-state; every needed
   field and behavior already exists (§0 table). Any edit there = audit FAIL.
2. **RULES screen untouched.** No change to LeagueBuilderRules or the RULES hub card —
   JK ruling. Exhibition (`ExhibitionGame.tsx`) also untouched, including its delay=2
   default (`:78`) — different surface.
3. **Additive, migration-safe types.** One optional field on `FranchiseConfig.season`;
   `StoredFranchiseConfig` inherits it; `extraInningsRule` stays a `string` with its
   existing name; no DB bump, no new store, no registry/manifest edits.
4. **No new mapper module.** The mapping is one exported pure resolver co-located in
   `FranchiseHome.tsx` beside `resolveFranchiseGameUseDH` — no new adapter file, and no
   hand-built engine input anywhere (the C4 lesson: adapters that hand-assemble inputs
   bred three bugs the build missed).
5. **Sudden Death is a labeled future seam, not a feature.** It maps to
   `extraInningRunner: false`, carries the honest ℹ️ line (§1), and gets exactly one
   seam comment in the resolver. Nothing else.
6. **Every element earns its place.** The entire UI delta is: one divider, one micro-label,
   two radio dots, one context-sensitive hint line — all inside the existing box, all in
   the existing chalk/brass language. Nothing new anywhere else on the screen.
