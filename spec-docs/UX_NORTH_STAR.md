# UX NORTH STAR — the KBL journey design bible (v1)

**Author:** Fable 5 (UI/UX design authority per JK mandate 2026-07-02) · **Date:** 2026-07-02
**Scope:** league setup → team/draft setup → draft → handoff-to-season → Fenway hub.
**Status:** BINDING for every UI build on those surfaces (C4-B, C4-C, quick wins). The
GameTracker is the read-only design reference — its UI is SET; no agent modifies it.
**Evidence basis:** full code-read audits of all journey screens + a design-language
extraction of GameTracker (2026-07-02, four parallel audit reads). File:line cites are from
those reads; executors re-verify at point of use. No browser pass has been run on these
findings yet — visual verification rides the build tickets (§7).

---

## §0. The north star in one paragraph

The player walks out of a SNES cartridge menu and into a **hundred-year-old ballpark**.
Everything inside the park — setup rooms, the draft floor, the clubhouse hub — is built from
the same materials the GameTracker is built from: chalk on aged green boards, brass plates,
typewriter print, hard shadows, team colors used as tints on the house green (never floods).
Machines talk in terse ALL-CAPS scoreboard labels; people (your scout, your assistant GM, your
beat reporter) talk in confident broadcast prose. Nothing on screen explains itself — help
lives behind a `?` toggle. Every element earns its place; anything that exists for the
developer (seeds, flags, gate status, "deferred in v1") is invisible to the player.

---

## §1. THE DESIGN RULING: one world, two voices

### 1.1 The finding that changes everything

The GameTracker — the one screen JK considers finished and premium — does **not** use the
pixel-arcade style (`Press Start 2P`, the Tailwind `retro.*` tokens). It overrides them
everywhere. Its actual language is a hand-built **"chalk-and-ash Fenway scoreboard"** idiom:

| Element | The real GameTracker language |
|---|---|
| Chrome/machine voice | `'Moms Typewriter', monospace` — scorebug, buttons, panels, numbers |
| Human/content voice | `'Tox Typewriter', monospace` — player names, commentary, bylines |
| Decorative glyphs | `'Chalk', monospace` (sparingly) |
| Page ground | Ash-wood tan `#CBB89C` |
| Panel surfaces | Field greens `#3d4a42`/`#3d5240` over recessed wells `#243028` framed by `#1a2420` |
| Text | Chalk cream `#E8E8D8` (never pure white) |
| THE accent | Brass gold `#C4A853` = "look here / active"; scoreboard yellow `#F2C041` = "live number" |
| Status colors | Sage `#88AA88` info · success `#34d399` · warn `#fbbf24` · signal red `#DC3545` · celebration `#FFD700` |
| Surfaces | Thick flat borders (3/4/5/6px = semantic weight), hard offset shadows `Npx_Npx_0px_0px`, square-to-`rounded-sm` corners, chalk PNG texture, `active:scale-95 active:shadow-none` press physics |
| Team colors | Tints and accents only (25% header washes, colored left-borders, outline shadows) — the ballpark green always wins the background |

Every other screen in the journey has been imitating the wrong reference (either the pixel
menu or an army-green approximation with default sans font). The FranchiseLens redesign
(`fenway-theme.css`, `fen-*` classes) is the only other surface that already speaks this
language.

### 1.2 The ruling

**Two zones, one journey:**

1. **The Cartridge (AppHome `/` only).** The SNES menu — black, `Press Start 2P`, primary
   colors, 8px borders — stays exactly as is. It is the boot screen, the strongest single
   screen in the app, and the joke that makes the ballpark feel real by contrast.
2. **The Ballpark (everything past the menu).** All journey screens converge on the
   chalk-and-ash Fenway language above, as implemented by GameTracker and fenway-theme. The
   army-green console dialect (league-builder family), the flat Draft-Room register, the
   black/blue FranchiseSelector, and the hardcoded-hex FranchiseSetup all migrate here.

**The jumbotron exception:** the AuctionStage's `Press Start 2P` lot names and high-bid
amounts are ruled IN — inside the ballpark, pixel type may appear only as **marquee display
signage** (a jumbotron/stadium-sign accent for a hero number or name), never for body text,
labels, buttons, or prose. AuctionStage as shipped is compliant and is the draft-floor
reference implementation.

**Migration rule for builders:** do not restyle by hand per screen. Extract the GameTracker/
fenway idiom into a small shared kit first (one `BallparkShell` header/back-plate, one panel-
with-header-strip, one chunky modal, one left-accent feed card, press-physics button styles,
the token names above as CSS vars), then reskin screens by adoption. The audit found every
league-builder page hand-rolls the identical header — that duplication is the opportunity.

### 1.3 Anti-patterns (extracted from what GameTracker deliberately avoids)

No pure black/white surfaces · no blur/elevation shadows · no rounded-pill inflation · no
saturated alarm colors on routine data (use the muted ramp) · no modal-for-everything (inline
panel replacement + banners first) · no page scroll (zones self-scroll) · no empty chrome
(zero-value stats render nothing, not gray) · no idle looping animation (one-shot ≤360ms tied
to real state changes; pulse/bounce reserved for fame/manager-moment ceilings) · no team-color
flooding · no native `window.confirm` (use the chunky modal kit; inline check/✗ for row
deletes).

---

## §2. JOURNEY IA — the corrected map

**The intended spine (auction path), one screen per job:**

```
/  (Cartridge menu)
└─ LEAGUE OFFICE  /league-builder            ← home links HERE (today it links to /builder)
   ├─ Leagues · Teams · Players · Rosters · Rules   (CRUD modules, reskinned)
   ├─ The Lab (/builder tools, demoted)              (generator/analyzer sandbox)
   └─ DRAFT SETUP  (ONE screen: pool shuttle + Draft Room merged)
      └─ Scout hire → AUCTION FLOOR (AuctionStage) → FARM AUCTION (AuctionStage, farm tier)
         └─ Staff hire (manager + reporter) → /franchise/setup → FENWAY HUB (FranchiseLens)
```

IA rulings:

- **R-IA1. Home links to the League Office.** AppHome's "BUILDER" button retargets to
  `/league-builder`. `Builder.tsx`'s duplicated "League Builder" tab dies; its three real
  tools (Team Builder / Player Builder / Player Analyzer) become a "Lab" card inside the
  League Office. Its localStorage pool is labeled a scratchpad until a promote-to-database
  bridge exists.
- **R-IA2. One Draft Setup.** `LeagueBuilderDraftSetup` (pool shuttle) and
  `DraftSetupHubPreview` (seats/ownership/archetypes/shills — live at `/draft-config` despite
  the name) merge into one screen in the Draft-Room register, exactly as the hub's own
  docstring intended. Pool status appears once. File renamed — nothing routed live may be
  named "Preview".
- **R-IA3. The draft floor never asks setup questions.** Seed / CPU count / bid increment /
  shill inputs disappear from all four draft-room screens; the rooms inherit everything from
  Draft Setup. (Dev needs a seed? It moves behind the help/dev layer, not the player's form.)
- **R-IA4. Farm auction folds onto AuctionStage.** The stage already implements the farm tier
  and scout-fog reveal (AuctionStage.tsx:332-405); `LeagueBuilderFarmAuctionDraft`'s legacy
  layout is the unmigrated half and is replaced, not restyled. Mid-draft style regression is
  the single most jarring moment in the journey today.
- **R-IA5. No dead ends.** Snake MLB draft and startup snake farm draft get completion CTAs
  chaining to staff-hire (today both stop at a badge). CTA copy must say where it goes:
  farm-auction's "Continue to Franchise Setup" actually goes to staff-hire — reword or reroute.
- **R-IA6. FranchiseLens is the hub.** `FranchiseLensHub` (aged-Fenway, help-gated, companion-
  voiced) is the destination for `/franchise/:franchiseId`; the old FranchiseHome shell is
  retired after the lens adapter reaches parity on the kept plumbing (schedule→GameTracker→
  standings/playoffs pipeline, seeding review, pre-game readiness). This aligns with C4-C.
- **R-IA7. Preview routes are dev-only.** All `/__preview/*` routes gate behind
  `import.meta.env.DEV` (today only three are gated — ~17 developer screens ship to players).
  Previews that exist only as showrooms for already-live components keep their files as design
  fixtures; `DraftSetupArchetypePreview` dies after its explainer copy is harvested into the
  archetype picker's help layer (§4).

---

## §3. SCREEN DISPOSITION TABLE

**Legend:** KEEP (as-is or light polish) · RESKIN (right screen, wrong dialect) · MERGE/FOLD ·
KILL. "Register" = target language per §1 (all non-menu screens → Ballpark).

### League setup leg

| Screen | Disposition | Notes |
|---|---|---|
| AppHome `/` | **KEEP** | Fix "Exhibition" casing; retarget BUILDER → `/league-builder`; clean fractional-pixel Figma classes + dead imports. |
| LeagueBuilder hub | **RESKIN + tighten** | Merge the two draft cards (DRAFT + MLB DRAFT) into one league-aware entry; drop the duplicate create-league footer or the LEAGUES card; fix `leagues[0]` hardcoding; kill `window.confirm` imports dialog. |
| LeagueBuilderLeagues | **KEEP/reskin** | Kill duplicate View button (same handler as Edit); unify reds + label casing. |
| LeagueBuilderTeams | **KEEP/reskin** | "Stadium source / MODE 2 COPY" panel → help layer; heavy collapsibles default closed; single error zone. |
| LeagueBuilderPlayers | **KEEP/reskin** | Override-tab system is genuinely good — preserve it. Fame-tier mechanics prose → help; resolve /builder overlap per R-IA1; show "100 of N" when the table truncates. |
| LeagueBuilderRosters | **KEEP/reskin** | Add unsaved-changes exit guard + destructive confirms (today: none); analyzer panel collapsible; label the COMPARE/APPLY/RECALC/SET micro-buttons. |
| LeagueBuilderRules | **KEEP/reskin** | Merge duplicated view/edit tab structures; steppers instead of the comma-string series field; fix hover-only (touch-invisible) actions. |
| Builder `/builder` | **FOLD** | Per R-IA1: tools demoted to a Lab inside the League Office; League Builder tab killed; raw enum labels ("exactlyOne") humanized. |

### Draft leg

| Screen | Disposition | Notes |
|---|---|---|
| LeagueBuilderDraftSetup | **MERGE** (per R-IA2) | The pool shuttle survives as a section of the merged Draft Setup; dedupe the sufficiency readout (shown twice today). |
| DraftSetupHubPreview | **MERGE + RENAME** (R-IA2) | The Draft Room register/copy is the keeper voice. **Seat/GM names must persist** — today they're component state only (ownership + archetypes do persist). Depends on the C4-A spine's identity work — coordinate, don't duplicate. |
| ScoutHire | **KEEP** | Tightest screen in the leg. Move the "scouting gate" internals sentence behind help. |
| LeagueBuilderAuctionDraft + AuctionStage | **KEEP — reference implementation** | Rationalize three overlapping advisors into ONE scout voice (§4); pre-session setup panel dies per R-IA3; unify "Market Shill" vs "Pure shills" terminology. |
| LeagueBuilderFarmAuctionDraft | **FOLD onto AuctionStage** (R-IA4) | Highest-leverage single fix in the journey. |
| LeagueBuilderSnakeDraft | **KEEP (lower priority)** | Fix the dead end (R-IA5); translate engine-speak solvency messages to plain lines; setup inputs per R-IA3. |
| LeagueBuilderDraft (startup snake) | **NEEDS-POLISH (lower priority)** | Reads as an internal harness (seed input, blocker prose). Dead end per R-IA5. Long-press scout fog is on-philosophy — keep it. |
| DraftSetupArchetypePreview | **KILL after harvest** | Its MLB-vs-farm-identity explainer paragraph is the best onboarding copy in the flow — move into the archetype picker's help layer, then remove route. (Stale "15 archetypes" comment; catalog is 24.) |
| EndOfDraftStaffing | **KEEP** | Kill the dead "Draft recap flag" toggle (read by nothing, never persisted); CTA says "Review Freeze" but goes straight to `/franchise/setup` — make copy honest. |

### Handoff + hub leg

| Screen | Disposition | Notes |
|---|---|---|
| FranchiseSelector | **RESKIN** | Only black/blue generic screen in the app; kill the "Import… not implemented yet" inline disclaimer. |
| FranchiseSetup wizard | **KEEP/reskin** | Tokenize hardcoded hexes; all ℹ️ explainers → help; deferred features (All-Star, Pool Play, Fantasy Draft card, static ASCII bracket) collapse to fine print or vanish — a disabled monument to a missing feature is leftover UI. Step-5 "League Builder validates and copies prepared State" architecture-speak must not reach players. |
| FranchiseHome (old hub) | **FOLD/REBUILD → Lens** (R-IA6) | Keep the plumbing; the shell is superseded. Kill-list in §5 applies in the interim only if C4-C is far off — otherwise effort goes to the lens adapter, not the corpse. |
| SeasonSummary | **KEEP core** | Standings/leaders/your-team/CTA stay; the "Season Complete Manifest" trust-report is developer UI — help-gate or remove. |
| FranchiseLensHub (+Live adapter) | **KEEP — the destination** | Fix the one redundancy it has: picker chip + identity banner both state the club name. Promote the live adapter toward `/franchise/:franchiseId` (C4-C). |

### `/__preview/*` routes (R-IA7)

DEV-gate the entire family. Beyond that: `draft-archetypes` KILL (after copy harvest);
`draft-setup` route KILL once R-IA2 merges (the component lives on at the real route);
component showrooms (fame-pip, auction-stage, franchise-lens, matchup-drama-bar, commentary-*,
between-inning-summary, player-instance-card, fame-leaderboard, scout-panel, lineups,
ingame-advisor, construction-rail, staffing, scout-hire, my-teams, season-rules, draft-guide)
KEEP as dev fixtures behind the gate — they are the design system's showroom.

---

## §4. THE COMPANION PATTERN

The through-line personalities are **your scout** (draft), **your assistant GM** (roster &
season intelligence), and **your beat reporter** (news & narrative). Rules:

- **C1. One voiced advisor per screen.** A screen may show many data panels, but at most one
  speaks as a person. Today's auction floor has three overlapping voices (coach banner, Scout
  Insight, CPU-decision explainer) — they consolidate under the scout: the scout owns
  bid/pass/cap advice; CPU-decision explanations stay as unattributed table talk; the generic
  "coach" is retired as a voice and its procedural lines move to the help layer.
- **C2. Voices are named and consistent.** The scout hired at ScoutHire is *the* scout who
  speaks on the draft floor (already partially true — keep). The reporter chosen at staffing
  is *the* byline on the hub's paper (today the old hub hardcodes "Beat Reporter"; the lens
  does this right with name/avatar/mood — that's the standard). The assistant GM becomes the
  named voice of roster advice when ticket #3/#8 land its surface.
- **C3. Register split (from the GameTracker):** machines/chrome = terse ALL-CAPS tracked
  labels, typewriter voice; companions = broadcast prose, active voice, concrete baseball
  language, confident ("Marquee pressure. This at-bat is already wearing tomorrow's
  headline."). Companions never say "deferred", "flag", "store", "validate", or any system
  noun.
- **C4. The help layer.** `FranchiseLensHub`'s `? Help` toggle + `fen-help` annotations
  (FranchiseLensHub.tsx:595) is the app-wide pattern: one unobtrusive `?` per screen; toggling
  reveals in-place annotations; tutorial/limitation/mechanics prose lives ONLY there. The §5/§6
  sweeps move every inline explainer behind it. One newspaper brand, one masthead (resolve
  "THE TOOTWHISTLE TIMES" vs "YOUR DAILY SQUINCH" — reporter surfaces pick one; the loser can
  survive as a rival paper joke inside the fiction, not as an inconsistency).

---

## §5. THE KILL-LIST (redundancies, dead UI, flow bugs — verified file:line)

**Fenway hub redundancies (JK-flagged, confirmed):**
- Club name stated 2-3× above the tabs: lens picker chip + identity banner
  (FranchiseLensHub.tsx:532-543 vs :641-648); old hub: team-select highlight + "Currently
  viewing" banner + per-sub-tab headers (TeamHubContent.tsx:2384-2413, :2477, :2760). Rule:
  the identity banner states the name once; everything else references it implicitly.
- Standings/records on ≥6 surfaces (FranchiseHome.tsx:3135-3215 tab; :4064/:4074 + :4156/:4180
  Today's Game ×2; :1912-1936 bracket; :2356-2410 playoff records; TeamHubContent.tsx:2399;
  SeasonSummary.tsx:587-648). Rule: full standings live in exactly one league surface (lens
  "Standings & Races"); other screens may show *your* record inline, once, and link.
- `getTeamRecord` implemented 3× (FranchiseHome.tsx:893, :3281; TeamHubContent.tsx:1010) —
  single-math cleanup rides whichever build touches these files first.
- Two Home buttons in the old hub header (FranchiseHome.tsx:1248 vs :1268).

**Dead/placeholder UI (kill on sight):**
- All-Star tab fed by stub helpers returning `undefined`/`[]` (FranchiseHome.tsx:609-613,
  :1490-1730) — ~240 flag-hidden lines. Delete or leave to the lens migration; never re-expose.
- Fake Eastern/Western leaders toggle — both buttons render the same object
  (FranchiseHome.tsx:4408-4411). Hardcoded "SEASON 1" masthead (:4434) and "Season 4" copy
  (:2861).
- Permanently-empty team-stat accordions behind live-looking buttons (:4161-4191);
  "ADVANCE COMING SOON" (:3048-3050); dev status banner (:4582-4590).
- EndOfDraftStaffing "Draft recap flag" toggle (state read by nothing).
- FranchiseSetup's disabled FANTASY DRAFT card (:1286-1303) + static ASCII bracket that
  ignores team count (:958-988).
- Mode-2 gate/status panels exposed to players (TeamHubContent.tsx:4964-5049, :5226-5240;
  SeasonSummary.tsx:874-927 manifest).

**Flow bugs:** snake dead-ends (×2, R-IA5); farm-auction CTA label vs destination; staffing
"Review Freeze" label vs direct navigate; `leagues[0]` draft-entry hardcoding on the hub.

**League-builder-leg inconsistencies:** three destructive-action patterns (native confirm /
inline check-✗ / nothing) → standardize on chunky-modal for big deletes, inline check-✗ for
rows, and ALWAYS a guard on dirty-state navigation (Rosters has none today). Color drift
(#DD0000 vs Tailwind stock reds; #C4A853 vs #D4A020 golds) resolves to the §1 token kit.

---

## §6. COPY REGISTER RULES

1. Chrome speaks scoreboard: short, ALL-CAPS, tracked, no punctuation ornament.
2. Companions speak broadcast (C3). Everything else is data, not prose.
3. **Banned in player-facing copy:** "deferred", "v1", "flag", "gate", "store", "validate",
   "canonical", "RegisteredPool", "IV" (unlabeled), "prepared State", "Mode 2/3", "evidence",
   "read-only handoff package", seed values, and any sentence describing what the software
   does not do. The audits found ≥15 such leaks (§3/§5 cites); each is either deleted,
   translated ("Blocked: $412,000 short after reserving…" → "Can't afford him and still fill
   the roster — $412K short"), or moved behind help.
4. Empty states are in-fiction and warm ("The clubhouse is quiet — no season underway yet."),
   never apologetic feature disclaimers ("Import/upload is not implemented yet…").
5. One name per concept journey-wide: "shills" (pick one of Market Shill / Pure shill),
   one newspaper masthead, "DRAFT SETUP" appears on exactly one screen.

---

## §7. VERIFICATION ITEMS (ride the build tickets; JK browser sign-off is the closing gate)

- **V1. CSV schedule → Play Ball (JK-flagged, unverified):** upload a schedule CSV in the hub
  Schedule surface, confirm rows land, next-game card points at the right matchup, and
  GameTracker launches it. Owner: first C4-C build that touches the hub; Codex Playwright
  pre-check + JK manual pass.
- **V2. Seat/GM identity persistence** (R-IA2 dependency): after the C4-A spine lands, verify
  a GM name entered at Draft Setup survives to the hub crew line and roster-move attribution.
- **V3. Every reskin ships with before/after screenshots** against the §1 kit and the §9
  checklist filled — no "it looks right" claims.
- **V4. Preview-route gate:** production build serves 404 (or NotFound) for `/__preview/*`.
- **V5. Farm-auction fold (R-IA4):** a full MLB→farm auction run with zero register change
  mid-journey; farm fog (tap/click reveal — changed 2026-07-08 from press-and-hold) works on
  the stage.

---

## §8. SEQUENCING (who executes what)

- **Quick wins (fire anytime, Codex, small diffs):** AppHome retarget + casing; preview-route
  DEV gate; kill dead toggle/fake toggle/duplicate Home button/duplicate View button; CTA
  copy honesty (farm-auction, staffing); harvest archetype explainer into picker help.
- **The shared kit (before any reskin):** BallparkShell + panel/modal/button/card primitives +
  token vars (§1.2 migration rule). Small dedicated ticket; Codex builds, I review conformance.
- **C4-B (auction experience):** R-IA2 merge, R-IA3 setup removal, R-IA4 farm fold, C1 voice
  consolidation, §6 translation of solvency/market lines. Executes against this doc + the
  chem-potency ticket's outputs (market advice content).
- **C4-C (living season):** R-IA6 lens promotion, §5 hub kill-list (via migration, not patching
  the corpse), C2/C4 companion + help layer, V1/V2 verification.
- **League-builder-leg reskins:** after the kit exists; can interleave with C4-B/C as capacity
  allows. Lower product priority than draft/hub (JK priority ruling).

---

## §9. UI-CONFORMANCE CHECKLIST (the review skill — final section by design)

Every PR/diff touching a journey surface gets this checklist in its report. I review
conformance on C4-B/C builds; Codex self-reports first. (This section is written to be lifted
verbatim into `.claude/skills/ui-conformance/SKILL.md` once ratified — per the deferred-item
ruling it lives here first.)

```
UI CONFORMANCE — [screen/diff]
ZONE:        □ Cartridge (AppHome only) or Ballpark? If Ballpark:
TOKENS:      □ Colors from the §1 kit (no new hexes, no Tailwind stock reds/grays)
             □ Fonts: Moms (chrome) / Tox (human voice) / pixel ONLY as jumbotron marquee
SURFACES:    □ Thick flat borders + hard offset shadows; no blur elevation, no pill radii
             □ Team colors as tints/accents only; house green owns the background
BEHAVIOR:    □ Press physics on buttons (active:scale-95 + shadow-none)
             □ No page scroll introduced; zones self-scroll
             □ Destructive: chunky modal or inline ✓/✗; dirty-state nav guarded
             □ No native window.confirm/alert
COPY:        □ Chrome ALL-CAPS terse; companion prose in-voice; §6 banned-word grep clean
             □ No inline tutorial/mechanics text — help layer (`?` toggle) only
             □ Empty states in-fiction; no feature-absence disclaimers
STRUCTURE:   □ Every element earns its place (no dead toggles, stub panels, duplicate controls)
             □ Nothing renamed/removed that a characterized test pins (grep D11 copy tests first)
             □ Standings/name/record appear at most once per screen
COMPANIONS:  □ ≤1 voiced advisor on screen; voice is a named character, not "coach"/"system"
EVIDENCE:    □ Screenshot(s) attached · □ GameTracker untouched (git diff confirms)
VERDICT:     CONFORMS / DEVIATIONS LISTED (each with a reason or a fix)
```

**Standing rule for reviewers:** the GameTracker and `FranchiseLensHub` are the two canonical
implementations. When this doc is ambiguous, match them; when they disagree with this doc,
this doc wins only after I've been asked.
