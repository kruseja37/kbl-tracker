# Beat Reporter Data Model Spec

**SUPERSEDED (2026-07-08): not a source of truth — effectively superseded in practice by REPORTER_CERTIFICATION.md's wiring findings (2026-06-16); live anchor is MODE_2_V1_FINAL.md §16 + SCOUTING_INTELLIGENCE_SPEC.md §10 per SOT_REGISTER_2026-07-08.md.**

**Companion to:** `BEAT_REPORTER_VOICE_SPEC.md`
**Status:** Draft — pre-implementation
**Last Updated:** 2026-04-14

### Contents
- §0  Purpose & Prime Directive
- §1  Data Model Additions
- §2  Fame System — Two Concepts
- §3  Dramatic Weight (Reporter-Only)
- §4  `buildReporterContext()` Seam
- §5  Almanac Compression Strategy
- §6  Exhibition vs Franchise/Elimination Behavior
- §7  UI Surfaces
- §8  Resolved Decisions
  - §8.1 Narrative Intensity Setting
  - §8.2 LLM Usage Ticker (League Builder)
- §9  Implementation Sequencing
- §10 Non-Goals (v1)

---

## 0. Purpose & Prime Directive

This spec defines the **data substrate** the beat reporter reads from — team/player backstories, relationships, team affinities, fame tiers, and the cached summaries that keep LLM prompts bounded.

### Prime Directive: The App Ingests Reality, It Does Not Simulate

KBL Tracker records what happens on screen in SMB4. **Nothing in this system influences on-field outcomes, error probabilities, or game mechanics.** Relationships, rivalries, and fame tiers exist to:

1. Drive beat reporter narrative generation
2. Weight commentary trigger scoring (which observed moments get covered)
3. Scale Fame point awards on *already-observed* events
4. Surface dramatic context in UI (matchup drama bar, lineup icons)

Franchise-mode in-season storylines may introduce narrative-driven roster/morale effects in later versions. **v1 has no simulation feedback loop.**

### LI Is Untouched

The canonical Leverage Index calculator (`src/engines/leverageCalculator.ts`) remains a pure function of base/out/inning/score. This spec introduces a *separate* `dramaticWeight` value used only by the reporter subsystem. LI → WAR → stats pipelines are unaffected.

---

## 1. Data Model Additions

### 1.1 Player (base, in League Builder)

```ts
interface Player {
  // ...existing fields
  backstory?: string;                // free-text, ~300 char soft cap
  nicknames?: string[];              // ["The Kid", "Silent Assassin"]
  archetype?: PlayerArchetype;       // enum — feeds Voice Spec Personality
  signatureMoment?: string;          // optional career-defining anchor
  baseFame: FameLevel;               // default 3 (Veteran)
  relationships: PlayerRelationship[];
  teamAffinities: TeamAffinity[];
}

type PlayerArchetype =
  | 'GRIZZLED_VET' | 'HOT_ROOKIE' | 'JOURNEYMAN' | 'ACE'
  | 'SLUGGER' | 'SPEEDSTER' | 'GLOVE_WIZARD' | 'CLUBHOUSE_LEADER'
  | 'HEAD_CASE' | 'QUIET_PRO' | 'SHOWBOAT' | 'UTILITY_GUY';

type FameLevel = 1 | 2 | 3 | 4 | 5;

const FAME_LABEL: Record<FameLevel, string> = {
  1: 'Unknown',
  2: 'Prospect',
  3: 'Veteran',
  4: 'Captain',
  5: 'Superstar',
};
```

### 1.2 PlayerRelationship

```ts
interface PlayerRelationship {
  id: string;
  targetPlayerId: string;
  kind: RelationshipKind;
  intensity: number;          // -100..+100 (neg = antagonistic)
  note?: string;              // "unrequited", "messy 2023 divorce"
  since?: string;             // free-text era flavor
  mutual: boolean;            // reciprocal entry exists on target
}

type RelationshipKind =
  // Family
  | 'FAMILY_PARENT' | 'FAMILY_CHILD' | 'FAMILY_SIBLING' | 'FAMILY_OTHER'
  // Romantic
  | 'ROMANTIC_SPOUSE' | 'ROMANTIC_PARTNER' | 'ROMANTIC_EX'
  | 'ROMANTIC_CRUSH' | 'ROMANTIC_TRIANGLE'
  // Friendship / mentorship
  | 'FRIEND_CLOSE' | 'MENTOR' | 'PROTEGE'
  | 'FRIEND_WITHIN_TEAM'
  // Antagonism
  | 'RIVAL' | 'ENEMY' | 'FEUD'
  | 'RIVAL_WITHIN_TEAM';
```

### 1.3 TeamAffinity

```ts
interface TeamAffinity {
  teamId: string;
  score: number;              // -100..+100
  reason?: string;            // "Traded away after 7 seasons"
  origin: TeamAffinityOrigin;
  seasonSet?: number;         // franchise mode: year originated
}

type TeamAffinityOrigin =
  | 'MANUAL' | 'DRAFT' | 'TRADE_FROM' | 'TRADE_TO'
  | 'FREE_AGENT_LEFT' | 'FREE_AGENT_ARRIVED' | 'RELEASED'
  | 'TITLE_WON' | 'PLAYOFF_BENCHED';
```

### 1.4 Team (base, in League Builder)

```ts
interface Team {
  // ...existing fields
  backstory?: string;                 // ~500 char soft cap
  era?: EraFlavor;                    // matches Voice Spec's 5 Era Flavors
  cityVibe?: string;                  // "Rust belt blue-collar"
  ballparkNickname?: string;
  heritageFacts?: string[];           // 2-5 short lines of authored team color
  rivalries?: TeamRivalry[];          // asymmetric authored rivalry declarations
}

interface TeamRivalry {
  opponentTeamId: string;
  intensity: number;                  // 0-10 scale
  origin?: string;                    // free-text ("1987 brawl")
}
```

### 1.5 Instance Overrides (Franchise / Elimination)

Mirrors the existing ratings-override pattern. Instance = a specific franchise or elimination save.

```ts
interface RosterPlayerInstance {
  playerId: string;
  // ...existing overrides (ratingsOverride, etc.)
  fameOverride?: FameLevel;                  // undefined = inherit baseFame
  relationshipsOverride?: PlayerRelationship[]; // undefined = inherit base
  teamAffinitiesOverride?: TeamAffinity[];
}
```

**Effective-value resolution** (single utility, used everywhere):

```ts
function getEffectiveFame(
  player: Player,
  instance?: RosterPlayerInstance
): FameLevel {
  return instance?.fameOverride ?? player.baseFame ?? 1;
}
```

Exhibition reads base values directly (no instance layer).

---

## 2. Fame System — Two Concepts, Clearly Separated

| Concept | Type | Who sets | Purpose |
|---|---|---|---|
| **Fame Tier** | `FameLevel` 1–5 | User (League Builder / instance override) | Reputation baseline; shapes reporter tone & commentary weight |
| **Fame Score** | numeric, accumulating | Earned in-game per `FAME_SYSTEM_TRACKING.md` | Achievement points; drives milestones & suggested tier promotions |

### Tier-driven reporter behavior

| Tier | Reporter framing |
|---|---|
| 1 Unknown | Minimal intro, "called up," generic descriptors; only name-checked on notable plays |
| 2 Prospect | "Promising rookie," ceiling talk, scouting-report framing |
| 3 Veteran | Assumes audience knows them; references career arc |
| 4 Captain | Leadership / clubhouse framing; carries extra narrative weight |
| 5 Superstar | Name-drops, era comparisons; every at-bat is *an event* |

### Commentary-trigger threshold scaling

```ts
// In shouldGenerateCommentary(event)
const fameThresholdScale = {
  1: 1.0,    // highest bar — needs notable WPA
  2: 0.9,
  3: 0.75,
  4: 0.65,
  5: 0.5,    // routine singles can get covered
};
```

### Fame Score → Tier promotion (Franchise only)

Franchise mode surfaces a suggestion card (not auto-applied):

> *Harry Backman has earned 45 Fame this season — promote to Captain?*

Thresholds (tunable):
- Prospect → Veteran: 30 career Fame
- Veteran → Captain: 80 career Fame
- Captain → Superstar: 150 career Fame

User can always override manually; suggestions never force changes.

---

## 3. Dramatic Weight (Reporter-Only, Not LI)

Used by the reporter subsystem to rank which moments deserve commentary and how prominently. **Never feeds LI, WAR, or stats calculations.**

```ts
function computeDramaticWeight(ctx: AtBatContext): number {
  let w = ctx.leverageIndex;   // starts from canonical LI (read-only)

  // Fame stack
  w += (ctx.batter.effectiveFame + ctx.pitcher.effectiveFame - 2) * 0.1;

  // Opposing-matchup relationships
  for (const rel of ctx.activeOpposingRelationships) {
    w += RELATIONSHIP_BOOST[rel.kind] * (rel.intensity / 100);
  }

  // Team affinity — facing ex-team
  if (ctx.batterAffinityTowardPitchingTeam < -30) w += 0.3;

  // Team-vs-team rivalry
  if (ctx.teamRivalryIntensity > 5) w += 0.25;

  return w;
}
```

### Relationship boost table (opposing matchups only)

| Kind | Boost (at intensity=100) |
|---|---|
| FAMILY_PARENT / FAMILY_CHILD | 0.75 |
| FAMILY_SIBLING | 0.5 |
| FAMILY_OTHER | 0.3 |
| ROMANTIC_SPOUSE | 0.5 |
| ROMANTIC_EX | 0.6 |
| ROMANTIC_TRIANGLE | 1.0 |
| ROMANTIC_CRUSH | 0.35 |
| RIVAL / ENEMY / FEUD | 0.4 |
| MENTOR / PROTEGE | 0.35 |
| FRIEND_CLOSE | 0.2 |

### Within-team relationships: narrative-only

`RIVAL_WITHIN_TEAM` and `FRIEND_WITHIN_TEAM` contribute **zero** dramatic weight during at-bats. They exist purely as reporter hooks:

- Surface in News Board when both players are in the same lineup
- Flavor post-game columns ("Backman and Oowanga still not speaking after the loss")
- Team-narrative hooks in legacy summaries

**Explicitly out of scope for v1:** any mechanical effect on fielding, lineup morale, or game outcomes. The app ingests SMB4 reality; it does not alter probabilities.

---

## 4. `buildReporterContext()` — The Critical Seam

Single entry point. Every commentary surface (in-game Grok, post-game Sonnet column, news board ticker) calls this. Changes to underlying data shape only require updating this function.

```ts
interface ReporterContext {
  // Static
  batter: PlayerSnapshot;                  // includes effectiveFame, archetype, baselineBackstory
  pitcher: PlayerSnapshot;
  battingTeam: TeamSnapshot;               // includes era, cityVibe, baselineBackstory
  pitchingTeam: TeamSnapshot;

  // Compressed history
  batterLegacySummary: string;             // Grok-compressed, cached
  pitcherLegacySummary: string;
  battingTeamLegacySummary: string;
  pitchingTeamLegacySummary: string;

  // Raw recent detail
  batterRecentAlmanac: AlmanacEntry[];     // last 3-5 entries
  pitcherRecentAlmanac: AlmanacEntry[];
  battingTeamRecentAlmanac: AlmanacEntry[];
  pitchingTeamRecentAlmanac: AlmanacEntry[];

  // Drama
  activeOpposingRelationships: PlayerRelationship[];  // filtered to on-field
  activeWithinTeamRelationships: PlayerRelationship[]; // surfaced but unweighted
  teamDnaFacts: string[];                  // home team heritageFacts, authored color
  homeTeamRivalries: TeamRivalry[];        // full raw home-team rivalry list
  awayTeamRivalries: TeamRivalry[];        // full raw away-team rivalry list
  teamRivalryIntensity: number;            // home-team POV on this matchup, 0-10
  dramaticWeight: number;

  // Current moment
  gameState: GameStateSnapshot;
  wpaMoment?: WpaEvent;
}

function buildReporterContext(
  gameId: string,
  atBatId: string
): ReporterContext;
```

For alternating-inning prompts, the builder derives home/away reporter perspective from `gameState.halfInning` plus the distinct `battingTeamRecentAlmanac` and `pitchingTeamRecentAlmanac` arrays above. No extra fetch layer should be required at prompt-assembly time.

### Prompt size discipline

Filtering happens *inside* `buildReporterContext`, not at prompt-assembly time:
- Only relationships where *both* players are in the current game's lineup are included
- `recentAlmanac` capped at 5 entries per entity
- `legacySummary` capped at ~150 words per entity

Absolute worst case prompt size: ~2k tokens. Well within all model context windows.

---

## 5. Almanac Compression Strategy

### 5.1 Cache schema

```ts
interface PlayerAlmanacCache {
  playerId: string;
  instanceId?: string;              // franchise/elimination scope; undefined = base
  legacySummary: string;            // ~150 words
  summaryGeneratedAt: string;       // ISO
  summaryFromEventCount: number;    // events ingested at last regen
  recentEventIds: string[];         // last 3-5 raw entries (uncompressed)
}

interface TeamAlmanacCache {
  teamId: string;
  instanceId?: string;
  legacySummary: string;
  summaryGeneratedAt: string;
  summaryFromEventCount: number;
  recentEventIds: string[];
}
```

### 5.2 Regeneration trigger

```ts
function maybeRegenerateLegacy(entity: 'player'|'team', id: string) {
  const cache = loadCache(entity, id);
  const currentCount = countAlmanacEvents(entity, id);
  const delta = currentCount - cache.summaryFromEventCount;
  if (delta >= 5) queueSummaryJob(entity, id);
}
```

Only runs on **write path** (when a new almanac entry is saved), never on read. At-bat-time `buildReporterContext` calls are O(1) cache reads.

### 5.3 Summarizer

- **Model:** Grok (fast, cheap, bounded task)
- **Input:** existing `legacySummary` + last N raw entries since last regen
- **Output:** replacement `legacySummary` (~150 words), neutral tone, chronological
- **Prompt template:** stored in `src/src_figma/app/engines/reporter/summarizer.ts`
- Claude Sonnet is reserved for the post-game column voice work, not compression

### 5.4 Three-tier temporal context

| Tier | Source | When |
|---|---|---|
| Far past | `baselineBackstory` (static, League Builder) | Always |
| Mid past | `legacySummary` (Grok-compressed, cached) | Always |
| Recent | `recentAlmanac[]` (last 3-5 raw) | Always |
| Now | `gameState` + `wpaMoment` | Per at-bat |

Keeps prompts bounded regardless of franchise depth.

---

## 6. Exhibition vs Franchise/Elimination Behavior

### Exhibition (stateless reporter writeback)
- Reads `baseFame`, `relationships`, `teamAffinities` directly from League Builder
- Generates commentary in-game, post-game column at end
- **Almanac entries persist** (game artifacts) but do NOT write back to baseline backstory
- No legacy summary regeneration triggered — exhibition never mutates canonical player state

### Franchise / Elimination (stateful)
- Reads instance overrides → falls back to base
- New almanac entries during play trigger legacy summary regeneration (gated by 5-event delta)
- Roster moves (trade, release, FA) auto-mutate `teamAffinities` per table below
- Season-end rollup may suggest Fame tier promotions

### Franchise auto-updates to `teamAffinity`

| Event | Δ score | Reason autofill |
|---|---|---|
| Traded away | -15 to -40 (scales w/ years) | "Traded after N seasons" |
| Released | -50 | "Cut by team" |
| Free agent left | -10 | "Left in free agency" |
| Returned to team | +20 | "Homecoming" |
| Won title with team | +25 | "Title year YYYY" |
| Benched in playoffs | -30 | "Playoff bench YYYY" |

Relationships **never** auto-mutate — authorial intent only. Events in almanac may reference them but do not rewrite them.

---

## 7. UI Surfaces

### 7.1 League Builder — Player edit card

New **Identity** section under existing header:
- Backstory textarea (300 char soft cap, live counter)
- Nicknames: tag-input array
- Archetype: dropdown
- Signature moment: single-line text
- Fame tier: 5-pip selector (see §7.4)

New **Relationships** tab:
- Table: kind, target player, intensity slider (-100..+100), note, since
- "Add Relationship" button opens modal w/ player search
- "Add Mirror on [target]" toggle (default ON) creates reciprocal entry
- Validation: warn on conflicts (SPOUSE + EX to same player)

New **Team Affinities** tab:
- Table: team, score, reason, origin badge
- Manual add/remove; franchise mode shows auto-generated entries with origin badges

### 7.2 League Builder — Team edit card

New **Identity** section:
- Backstory textarea (500 char soft cap)
- Era dropdown
- City vibe single-line
- Ballpark nickname

New **Rivalries** tab:
- Table: opponent, intensity, origin

### 7.3 Fame Board — new Team-level tab

Route: League Builder → Team → *Fame Board*

Two-column list (batters | pitchers). Each row:
- Player name
- 5-pip selector (inline edit)
- Base fame shown faded if different from effective
- "Reset to base" per row
- "INSTANCE" badge when viewing from franchise/elimination (edits write to override)

Header bulk actions:
- *Set all Unknowns to Prospect*
- *Reset all overrides*
- *Promote suggestions* (franchise only — lists players whose Fame Score crossed threshold)

### 7.4 Fame Pip Component

One SVG component, three sizes (sm/md/lg), reused everywhere.

| Tier | Visual |
|---|---|
| 1 Unknown | `○` hollow circle, Road Gray (`#B0B7BC`) stroke, no fill |
| 2 Prospect | `★` outlined star, Dark Cream (`#CBB89C`) |
| 3 Veteran | `★` filled star, Hist. Yellow (`#F2C041`) |
| 4 Captain | `★` filled star, Hist. Yellow w/ Marquee Red (`#CC3433`) inner border |
| 5 Superstar | `★` gold fill, red baseball-stitch dashed border ring, chalk-smudge backing, subtle glow |

File: `src/src_figma/app/components/FamePip.tsx`
Props: `{ tier: FameLevel; size?: 'sm'|'md'|'lg'; count?: number /* shows "3/5" numeric alongside */ }`

### 7.5 Matchup Drama Bar

Position: above the beat reporter feed in GameTracker.

```
[Pitcher ★★★★☆]  vs  [Batter ★★★☆☆]
 👨‍👦 father/son  •  💔 ex-spouses  •  🔥 feud (2024 HBP)  •  🏚️ ex-team
```

| Relationship | Icon | Trigger |
|---|---|---|
| Family (any) | 👨‍👦 | FAMILY_* |
| Romantic partners | ❤️ | SPOUSE/PARTNER |
| Ex / triangle | 💔 | EX, TRIANGLE |
| Crush | 💘 | CRUSH |
| Feud / rival | 🔥 | RIVAL/ENEMY/FEUD, intensity>40 |
| Mentor/protege | 🎓 | MENTOR/PROTEGE |
| Facing ex-team | 🏚️ | teamAffinity < -30 toward opposing team |
| Friends | 🤝 | FRIEND_CLOSE |

**Population rules:**
- Only active pairings where *both* players are on the field
- Tap icon → tooltip with relationship note
- Bar dims when no dramatic context active

**Within-team relationships do NOT appear here.** They surface in the News Board / team header instead.

File: `src/src_figma/app/components/MatchupDramaBar.tsx`

### 7.6 Lineup small-icon indicators

Small icon badges (12px) next to player names in opposing-lineup display when that player has an active relationship with anyone in your lineup. Same icon set as Drama Bar. Tap surfaces the relationship note.

Gives the user dramatic-tension awareness *before* the at-bat unfolds.

---

## 8. Resolved Decisions

1. **Default Fame tier = 3 (Veteran).** Applies to all new players unless user overrides. Replaces the earlier "default to Unknown" proposal — rationale: treating every unedited player as Unknown produces a league of ciphers; Veteran is a neutral mid-point users can dial up or down.
2. **Relationship edits in franchise instances write to instance override**, consistent with existing ratings-override pattern. Baseline (League Builder) remains untouched unless explicitly edited there.
3. **Grok usage governed by a user-facing Narrative Intensity setting** (Low / Medium / High). Replaces the earlier 100/day hard cap — that was both too conservative for active play and the wrong abstraction to expose. The setting governs all reporter subsystem appetite (commentary trigger rates, summary regen cadence, column length, opposing reporter generation). See §8.1 below.
4. **Within-team rival/friend surfacing: narrative blurbs only in v1.** No persistent icon in News Board. Revisit in v2.

### 8.1 Narrative Intensity Setting

User-facing setting in app preferences. Governs all reporter subsystem behavior that consumes LLM budget.

| Level | Commentary trigger threshold | Summary regen delta | Post-game column length | Opposing reporter column | Expected Grok calls / game |
|---|---|---|---|---|---|
| **Low** | High — only marquee moments (WPA ≥ 0.15, dramaticWeight ≥ 4.0) | Every 10 almanac entries | ~150 words, single paragraph | ❌ Off | ~3–5 |
| **Medium** (default) | Moderate (WPA ≥ 0.08, dramaticWeight ≥ 2.5) | Every 5 almanac entries | ~300 words, 2 paragraphs | ✅ On, abbreviated | ~10–15 |
| **High** | Low — most at-bats with any drama get a line (WPA ≥ 0.04 or dramaticWeight ≥ 1.5) | Every 3 almanac entries | ~500 words, full column | ✅ On, full length | ~25–40 |

**Safety rail:** regardless of setting, a hard **per-day ceiling of 500 Grok calls** protects runaway usage (e.g., rapid franchise sim, stuck-loop bugs). When hit, subsystem degrades to Low behavior until the day rolls over. User is notified with a non-blocking banner.

**Per-game telemetry:** GameTracker surfaces a small indicator in the reporter feed header showing today's Grok call count (e.g., `⚡ 47/500 today`) so power users can self-monitor.

**Per-entity regen priority:** when budget is tight, regen prioritizes players involved in high-WPA moments this game. A player who hit a walk-off gets summary regen queued ahead of a player who went 0-for-3 with no standout moments.

**Setting stored in:** user preferences IndexedDB store; default Medium on first launch; no prompt — user discovers via Settings.

### 8.2 LLM Usage Ticker (League Builder)

Surfaces all LLM cost/usage data so users can make informed Narrative Intensity choices. Lives in League Builder as a persistent header-adjacent widget and an expandable detail panel.

#### Compact ticker (always visible in League Builder header)

```
⚡ This month: $2.14  •  Avg/game: $0.08  •  Intensity: Medium
```

- Tap to expand the detail panel
- Turns amber if month-to-date > user-set soft budget
- Turns red if projected month exceeds 2× soft budget

#### Detail panel sections

**1. This month**
- Total spend $X.XX
- Grok calls / Claude Sonnet calls (split)
- Token consumption (input / output tokens, both models)
- Days remaining in billing window

**2. Per-game averages (rolling 30-day window)**
| Mode | Games | Avg cost | Avg Grok calls | Avg Sonnet calls | Avg duration covered |
|---|---|---|---|---|---|
| Exhibition | 12 | $0.07 | 14 | 1 | 9 innings |
| Elimination | 5 | $0.09 | 18 | 1 | 9 innings |
| Franchise (when shipped) | — | — | — | — | — |

**3. Per-intensity comparison** (most decision-supporting view)

Shows user's own historical averages at each setting they've tried. If they haven't tried one, shows a synthetic estimate based on trigger thresholds.

| Intensity | Your avg/game | Your games at this setting | Est. monthly at 20 games/mo |
|---|---|---|---|
| Low | $0.03 | 4 games | $0.60 |
| Medium | $0.08 | 12 games | $1.60 |
| High | $0.18 | 1 game | $3.60 |

Tagline under table: *"You've been playing on Medium. Based on your pace, High would cost ~$2 more per month."*

**4. Recent games log**
Last 20 games with per-game breakdown (mode, intensity, duration, cost, call count). Tap a row to see per-event cost breakdown (which at-bats triggered which reporter calls).

**5. Soft budget control**
- Monthly soft budget $ slider (default $5)
- Exceeding triggers the amber/red ticker states above
- Optional "auto-downshift to Low when soft budget hit" toggle (default off — power users want notification, not silent throttling)

#### Data sources

- **Cost tracking:** each LLM call logs `{ timestamp, model, inputTokens, outputTokens, gameId, mode, intensity, purpose }` to new IndexedDB store `llmUsageLog`
- **Pricing:** hardcoded per-model $/1k-token rates in `src/src_figma/app/engines/reporter/pricing.ts`; updateable without schema migration
- **Projection math:** rolling 30-day average × (days remaining / days elapsed)

#### Privacy / transparency

All data is local (IndexedDB). No telemetry sent anywhere. The ticker is a **self-service cost-awareness tool**, not a phone-home metric. This matters because users are paying their own API keys.

#### Implementation scope

| Item | v1 | Notes |
|---|---|---|
| `llmUsageLog` IndexedDB store + write path on every LLM call | ✅ | Foundation |
| Compact ticker in League Builder header | ✅ | |
| Detail panel with sections 1-4 | ✅ | |
| Soft budget control | ✅ | |
| Auto-downshift toggle | ⏸️ | Ship later if users ask |
| Per-event cost drilldown | ⏸️ | v1 shows per-game only; drilldown in v2 |

---

## 9. Implementation Sequencing

1. **Schema** — types, IndexedDB migrations, base getters/setters
2. **League Builder UI** — Identity section, Relationships tab, Team Affinities tab, Team Identity fields
3. **Fame Pip component** — visual primitive, reused downstream
4. **Fame Board tab** — team-level mass edit
5. **Effective-value utilities** — `getEffectiveFame`, `getEffectiveRelationships`, etc.
6. **Instance override plumbing** — franchise/elimination read paths
7. **`buildReporterContext()` skeleton** — returns data, no LLM calls yet
8. **Matchup Drama Bar** — wires to `buildReporterContext`
9. **Lineup icon indicators** — same data, lineup surface
10. **Almanac cache tables** — schema, write-path regen trigger (no summarizer yet)
11. **LLM usage logging substrate** — `llmUsageLog` IndexedDB store + shared `logLlmCall()` wrapper that every reporter LLM call must route through (per §8.2). Must land BEFORE Step 12 so the first real LLM call is already instrumented.
12. **Narrative Intensity setting + Usage Ticker** — user preferences store, Settings UI, compact ticker in League Builder header, detail panel (per §8.1 & §8.2)
13. **Grok summarizer integration** — first LLM call, routed through `logLlmCall()`
14. **Franchise auto-affinity mutation** — on trade/release/FA events
15. **Fame-score→tier promotion suggestions** — season-end rollup

Steps 1–10 are pure data + UI, no LLM dependencies. Step 11 lays cost-tracking rails before any LLM work. Step 12 ships the intensity setting + ticker visible immediately — initially showing empty/zero state, then populating as Step 13+ calls accumulate. Reporter voice work (Grok/Sonnet calls per Voice Spec) layers on top once substrate ships.

---

## 10. Non-Goals (v1)

- Narrative-driven simulation feedback (relationships do NOT affect on-field probability)
- Auto-generated backstories from ratings (user authors all baseline text)
- Cross-instance relationship sync (instance overrides are independent)
- Multi-language reporter voice
- Voice audio generation
- Auto-downshift when soft budget exceeded (notification only in v1 — see §8.2)
- Per-event LLM cost drilldown in usage ticker (per-game granularity only in v1)
- Cloud-synced usage telemetry (all usage data stays local per §8.2 privacy stance)
