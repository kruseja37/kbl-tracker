# BEAT_REPORTER_VOICE_SPEC.md

**SUPERSEDED (2026-07-08): not a source of truth — effectively superseded in practice by REPORTER_CERTIFICATION.md's wiring findings (2026-06-16); live anchor is MODE_2_V1_FINAL.md §16 + SCOUTING_INTELLIGENCE_SPEC.md §10 per SOT_REGISTER_2026-07-08.md.**

Extension of NARRATIVE_SYSTEM_SPEC.md — Beat Reporter Voice & Personality System

**Status:** SPEC COMPLETE — Awaiting implementation
**Last Updated:** 2026-04-13
**Author:** JK + Claude

---

## 1. Purpose

This spec defines a rich, unpredictable beat-reporter voice engine that feels like a living 1930s-1980s radio booth brought into your vintage baseball gametracker. Every reporter is a unique combination of three dimensions that create hundreds of distinct personalities while staying perfectly on-brand with the old-timey scorecard aesthetic.

The beat reporter system serves as the narrative heart of KBL Tracker — providing in-game commentary, between-inning summaries, post-game newspaper columns, and long-term franchise storytelling that evolves organically over time.

---

## 2. The Three Dimensions

### 2.1 Personality Type (10 options — drives *what* they say)

Controls the reporter's editorial perspective, opinions, and emotional reactions.

| Personality | Description | Win Reaction | Loss Reaction |
|---|---|---|---|
| OPTIMIST | Always finds the silver lining | Celebrates joyfully | "They'll bounce back" |
| PESSIMIST | Sees trouble everywhere | "Don't get comfortable" | "Saw this coming" |
| BALANCED | Fair, measured, even-handed | Acknowledges both sides | Credits opponent |
| DRAMATIC | Everything is a big moment | "THIS changes everything!" | "A devastating blow" |
| ANALYTICAL | Stats-first, numbers-driven | Cites win probability shift | Breaks down what went wrong |
| HOMER | Unabashed home-team fan | Full-throated celebration | Blames umpires/luck |
| CONTRARIAN | Takes the unpopular angle | "But can they sustain this?" | "Actually, this loss helps" |
| INSIDER | Claims inside knowledge | "I talked to the skipper..." | "Sources say changes coming" |
| OLD_SCHOOL | Tradition-first, purist | "That's how the game should be played" | "Kids these days..." |
| HOT_TAKE | Provocative, attention-seeking | "Best team I've ever seen" | "Blow it up, start over" |

### 2.2 Voice Style (9 options — drives *how* they say it)

Controls the reporter's speech patterns, vocabulary, cadence, and delivery. **Voice style never drifts** — it is the reporter's permanent identity.

| Voice Style | Inspired By | Signature Traits & Catchphrases | Energy Level | Weight |
|---|---|---|---|---|
| THE POET | Vin Scully | Winding metaphors, calm reverence, poetic pauses, "friends, this is something special" | Low | 0.08 |
| THE REACTOR | Joe Buck | Understated then sudden explosion, "BACK AT THE WALL... WE ARE TIED" | Medium | 0.15 |
| THE HOLY COW | Harry Caray | Gravelly, loud, earthy, unfiltered, crowd sing-alongs, mispronounced names for fun, "Holy Cow!", "It might be... it could be... IT IS!" | High | 0.18 |
| THE PROFESSOR | Jon Miller | Rich vocabulary, historical references, dramatic pauses, dry wit | Medium | 0.12 |
| THE HYPE MAN | Matty V / Chris Berman | "BACK BACK BACK BACK", exclamation points, energy over substance | Very High | 0.14 |
| THE STORYTELLER | Bob Costas | Context-obsessed, ties every moment to the bigger picture | Medium | 0.10 |
| THE GRINDER | Jerry Remy / local radio | Blue-collar phrasing, casual, "that's just good baseball right there" | Medium | 0.23 |
| THE CALLER | Mel Allen | Classic excited "How about that!", big-band energy, golden-age enthusiasm | High | 0.10 |
| THE GENTLEMAN | Red Barber / Ernie Harwell | Southern/warm conversational, "Oh doctor!", pioneering radio polish, intimate delivery | Low | 0.10 |

**Weight note:** THE GRINDER has the highest weight (0.23) as the "default local radio guy." THE HOLY COW is second (0.18) as the most fun/memorable for casual fans and the best fit for the vintage aesthetic.

### 2.3 Era Flavor (3 options — adds historical texture)

Controls the period-specific language patterns, references, and delivery conventions.

| Era | Period | Characteristics |
|---|---|---|
| GOLDEN_AGE | 1930s-1950s | Telegraph-style phrasing, sponsor plugs ("This at-bat brought to you by..."), formal-yet-colorful radio delivery, "ladies and gentlemen" |
| CLASSIC_TV | 1960s-1980s | Smoother delivery, dramatic pauses, big-league polish, early color commentary style |
| MODERN_LOCAL | 1990s-present | Casual, self-aware, occasional pop-culture nods (still vintage-sounding within the app's aesthetic) |

### 2.4 Dimension Cross-Product

10 Personality × 9 Voice × 3 Era = **270 unique reporter combinations**

All combinations are valid. No exclusions. Strange combos (e.g., MODERN_LOCAL + THE GENTLEMAN) are intentionally allowed — they create memorable, funny characters.

**Example — Same HR, Different Reporters:**

| Reporter Combo | Commentary |
|---|---|
| DRAMATIC + THE POET + GOLDEN_AGE | "Ladies and gentlemen, in all the years of baseball at this park, few have left a mark quite like that one. Backman, in the twilight of this game, found daylight." |
| HOMER + THE HOLY COW + CLASSIC_TV | "It might be... it could be... IT IS! HOLY COW! Backman just CRUSHED that thing! That's our boy! That's what we came to see, folks!" |
| ANALYTICAL + THE GRINDER + MODERN_LOCAL | "Backman sat dead red on that 1-1 fastball. Exit velo had to be 105+. That's a no-doubter the second it left the bat. Brings his OPS to 1.142 on the night." |

---

## 3. Reporter Identity & Lifecycle

### 3.1 Reporter Object

```typescript
interface BeatReporter {
  id: string;                          // UUID
  teamId: string;                      // Linked to team
  name: string;                        // Era-appropriate, user-editable
  personality: PersonalityType;        // 1 of 10
  voiceStyle: VoiceStyle;             // 1 of 9
  eraFlavor: EraFlavor;               // 1 of 3
  
  // Visual identity
  avatarEra: 'fedora' | 'headset' | 'cap';  // Derived from eraFlavor
  avatarColors: {                      // Derived from team colors
    primary: string;
    secondary: string;
  };
  
  // Mood system
  currentMood: PersonalityType;        // Starts = personality, drifts during game
  moodMomentum: number;               // -5 to +5, decays toward 0
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 Assignment & Persistence

- **Where:** Assigned in League Builder under team management
- **When:** At team creation or via dedicated "Beat Reporters" section
- **Generation:** Auto-generated with weighted random rolls on all 3 dimensions + era-appropriate name
- **User control:** Show generated result → option to re-roll any dimension or edit name → confirm
- **Batch mode:** "Generate All Reporters" for entire league, then drill into individual teams to re-roll/edit
- **Persistence:** Reporter persists across ALL game modes (Exhibition, Elimination, Franchise) for that team
- **Replacement:** Re-roll available anytime in League Builder (generates fresh reporter)

### 3.3 Era-Appropriate Name Generation

| Era | Name Style | Examples |
|---|---|---|
| GOLDEN_AGE | Nicknames, formal surnames | "Dutch" Calloway, Whitey Perkins, Bud McAllister |
| CLASSIC_TV | Professional broadcast names | Howard Kessler, Jack Brennan, Don Castellano |
| MODERN_LOCAL | Contemporary, diverse | Mike Torres, Ashley Chen, Marcus Webb, Sam Delgado |

### 3.4 Visual Avatar

**GameTracker (NewsBoard):** Team-colored silhouette based on era:
- GOLDEN_AGE: Fedora + press pass silhouette
- CLASSIC_TV: Headset + blazer silhouette
- MODERN_LOCAL: Baseball cap + microphone silhouette

Silhouette filled with team's primary color, accent/border in team's secondary color.

**Newspaper Column View:** 8-bit pixel-art reporter portrait, also colored with team colors.

---

## 4. Mood Drift System

### 4.1 Core Principle

Mood drift replaces the static `offBrandRate` from the original NARRATIVE_SYSTEM_SPEC. Instead of a fixed probability of going off-brand, the reporter's mood responds dynamically to game state — but stays true to form **80% of the time**.

**Critical rules:**
- **Voice style NEVER drifts.** A HOLY COW reporter always sounds like Harry Caray regardless of mood.
- **Only personality/mood shifts.** An OPTIMIST might become temporarily pessimistic, but they still deliver it in their voice.
- **80/20 probability.** When a drift trigger fires, there is an 80% chance the reporter stays true to their base personality and a 20% chance they drift. This keeps the reporter predictable and recognizable with occasional human-feeling breaks.

### 4.2 Drift Triggers

| Game State Trigger | Drift Direction | Example |
|---|---|---|
| 3+ consecutive Ks by home pitcher | → DRAMATIC / OPTIMIST | Even the PESSIMIST might get excited |
| Home team down 6+ runs | → PESSIMIST / CONTRARIAN | Even the OPTIMIST might question things |
| Walk-off situation (9th+, tying/go-ahead run on base) | → DRAMATIC | Everyone gets tense in these spots |
| Blowout (8+ run lead) | → BALANCED / ANALYTICAL | The drama drains out |
| Rival game + close score | → HOMER / CONTRARIAN (cranked) | Rivalry intensity modifier |
| Home team rallies (3+ consecutive hits) | → OPTIMIST / DRAMATIC | Momentum shift |
| Error by home team in crucial spot | → PESSIMIST / HOT_TAKE | Frustration |

### 4.3 Momentum System

The reporter has a `moodMomentum` value (-5 to +5) that rises with positive home-team events and falls with negative ones. It decays toward 0 over subsequent at-bats (1 point per at-bat).

- Momentum > +3: Energy level increases regardless of personality
- Momentum < -3: Energy level decreases, commentary becomes more subdued
- Decay rate: |1| per at-bat toward neutral (0)

This means after a big rally (+5 momentum), it takes ~5 quiet at-bats for the reporter to settle back to baseline — just like real announcers.

### 4.4 Implementation: Mood Engine

The mood engine is **deterministic code** that reads game state and outputs a mood modifier. The LLM receives the modifier as part of its prompt — the LLM handles expression, the code handles detection.

```typescript
interface MoodState {
  baseMood: PersonalityType;       // Reporter's personality (permanent)
  currentMood: PersonalityType;    // May differ if drift triggered
  momentum: number;                // -5 to +5
  energyModifier: 'subdued' | 'normal' | 'elevated' | 'electric';
  driftActive: boolean;            // Is the reporter currently off-brand?
  driftExpiresAfterAtBats: number; // How many ABs until mood resets
}
```

---

## 5. In-Game Commentary System

### 5.1 Alternating-Inning Reporter Rotation (v1 revised)

v1 revised no longer uses a single reporter voice for every beat of the live game.

- **Pregame preamble:** Home reporter only. Fires once, before the first pitch, as a whole-game scene-setter.
- **Inning summaries:** Generated only after a **full inning** completes. Odd innings route to the home reporter; even innings route to the away reporter.
- **Post-game columns:** Both reporters still write separate final columns.

**Why this revision:**
- Inning boundaries provide fuller ground-truth than per-play calls.
- Alternating booths makes the feed feel richer without doubling every LLM call.
- The model gets a complete inning's event list plus updated narrative context before speaking.

### 5.2 DEPRECATED — Per-Play Commentary Removed (v1 revised)

Per-play live commentary has been removed from the live GameTracker flow in v1 revised.

**Reason for removal:**
- Too much temptation for the model to over-elaborate or hallucinate sparse play data.
- More latency and more API volume during active scoring.
- Inning summaries produce better grounded output because the model sees the whole inning at once.

The underlying engine method is intentionally retained in code for possible future **walk-off / ultra-high-notability** reuse, but it is no longer wired into the live feed in this revision.

### 5.3 Lull Tidbits

**DEFERRED TO v2.**

When **3+ consecutive plays** fall below the notability threshold, the reporter fills the silence with a tidbit instead of play commentary. This mirrors real broadcasters filling air time with color.

**Tidbit sources (fully LLM-generated via Grok):**
1. Team DNA / heritage facts from backstory
2. Current game stats ("Backman is 0-for-3 with 2 Ks tonight")
3. Historical matchup data ("The Blowfish are 3-1 against the Freebooters in exhibition play")
4. Random baseball wisdom appropriate to voice/era ("As my old man used to say, you can't sit on a lead in this ballpark")
5. Player personality hints from hidden modifier system
6. Real-world baseball history references appropriate to the reporter's era

### 5.4 Game Preamble

Triggered when user clicks **"Start Game"**. The reporter introduces themselves and sets the scene.

**Example (DRAMATIC + THE HOLY COW + CLASSIC_TV):**
> "Good evening everybody! This is Dutch McAllister, and HOLY COW, do we have a game for you tonight! The Freebooters are in town and let me tell you, folks, these two teams do NOT like each other. Let's play ball!"

### 5.5 Inning Summaries (Full-Inning, Alternating)

Generated after a **full inning** completes, not after each half-inning. The trigger happens when the user ends the bottom half through the normal GameTracker flow (yellow End Half-Inning button / confirmation modal path).

Routing:
- Odd innings (1, 3, 5, 7, 9, 11...) → home reporter
- Even innings (2, 4, 6, 8, 10...) → away reporter

Each summary call receives the complete inning event list, enriched play details when available, current dramatic context, and the rolling `gameNarrativeSoFar`.

The engine returns:
- `popup`: 2-3 sentence in-game summary copy
- `narrative`: 2-3 sentence replacement for `gameNarrativeSoFar`

`gameNarrativeSoFar` is **replaced, not appended**, after each inning summary so later prompts inherit the current story arc without dragging full play-by-play history.

### 5.6 Pre-Game Toggle

A toggle in the pre-game menu allows the user to **disable the beat reporter feed** for that game. When disabled:
- No LLM calls are made during the game
- The NewsBoard feed area shows "Beat Reporter: OFF" or similar placeholder
- No post-game columns are generated
- All other tracker functionality works normally

This is a simple boolean flag (`beatReporterEnabled`) checked before any LLM call.

---

## 6. Feed Display & UX

### 6.1 NewsBoard Layout

The beat reporter feed lives in **Column 1 of the GameTracker** (NewsBoard component):

```
┌─────────────────────┐
│ MATCHUP (pinned)    │  ← Always visible: batter/pitcher stats, historical matchup
│ AT BAT: H. BACKMAN  │
│ 0-for-3, 2 K       │
│ PITCHING: W. NOELLE │
│ 6 IP, 3 H, 1 ER    │
│ vs Noelle: 1-for-8  │
├─────────────────────┤
│ [Reporter Avatar]   │  ← Silhouette + name, tap to toggle sound
│ ─── B4 ───────────  │  ← Half-inning label
│ Latest commentary   │  ← Reverse chronological (newest at top)
│ ...                 │
│ ─── T4 ───────────  │
│ Inning summary      │  ← Visually distinct (different color/italic)
│ ...                 │
│ Earlier commentary  │
│ ...                 │
│ ─── Pregame ──────  │
│ Preamble            │  ← Reporter introduction
└─────────────────────┘
```

### 6.2 Visual Differentiation

| Entry Type | Visual Treatment |
|---|---|
| Regular play commentary | Normal text, standard color |
| Between-inning summary | Italic, different background color, divider lines above/below |
| Milestone alert | Special badge icon + accent color |
| Tidbit / lull filler | Slightly muted text, no badge |
| Preamble | Bold, full-width |
| Half-inning label | Centered divider: "── T4 ──" |

### 6.3 Typewriter Effect

All commentary types out **word by word** with a retro typewriter sound effect.

- **Speed:** ~100-150ms per word (~2-3 seconds for a 20-word sentence)
- **Sound:** Burst of 2-3 key sounds per word (simulating keystrokes for that word)
- **Sound control:** Tapping the reporter avatar or feed area toggles sound on/off. Visual typewriter effect always plays regardless of sound setting.
- **Between-inning summaries:** Same word-by-word effect (longer but acceptable since it's between innings)
- **Queue behavior:** If a new notable play occurs while text is typing, the current line speeds up to finish quickly, then the new commentary begins

### 6.4 Sound Control

- Existing `beatReporterSoundsOn` toggle in ScoreBug top-right controls the typewriter audio
- Additional tap target in the feed area itself for more intuitive access
- Sound off = silent typewriter; text still types out visually
- Feed is always on (unless disabled via pre-game toggle per §5.6)

---

## 7. Post-Game Newspaper Columns

### 7.1 Dual Column Generation

After every game, **both teams' beat reporters** write separate post-game columns about the same game. This creates contrasting narratives from two different reporter personalities covering identical events.

- Generated via **Claude Sonnet API** (server-side, Supabase Edge Functions)
- Each column: headline + 2-3 paragraph recap in the reporter's full voice (personality + voice style + era flavor)
- Prompt includes: full game play-by-play data, reporter identity, team DNA, active storylines, rivalry context

### 7.2 Newspaper Display

**Split-page view** — home team's column on the left, away team's on the right.

```
┌──────────────────────┬──────────────────────┐
│  [8-bit portrait]    │    [8-bit portrait]  │
│  DUTCH McALLISTER    │    MIKE TORRES       │
│  Blowfish Beat       │    Freebooters Beat  │
├──────────────────────┼──────────────────────┤
│  BACKMAN'S BLAST     │  NOELLE FALTERS IN   │
│  SINKS FREEBOOTERS   │  COSTLY LATE COLLAPSE│
│                      │                      │
│  In the cathedral of │  For five innings,   │
│  Blowfish Stadium,   │  Winnie Noelle was   │
│  Harry Backman did   │  untouchable. Then   │
│  what Harry Backman  │  the sixth happened.  │
│  does best...        │  ...                 │
└──────────────────────┴──────────────────────┘
```

### 7.3 Storage & Archival

All post-game columns stored in Supabase `game_stories` table:
- Tagged by: teams, players mentioned, game mode, date, reporter ID
- Headline stored separately for list views
- Full text stored for detail view
- Queryable all-time with filters (by team, player, mode, date range)

### 7.4 Cost Estimate

~$0.004 per column × 2 columns per game = **~$0.008 per game** (Claude Sonnet pricing).

---

## 8. Almanac & Story Archive

### 8.1 Vision

Post-game columns accumulate into a living narrative history for every franchise. Over time, the almanac tells the story of each team and each player through the eyes of their beat reporters.

### 8.2 Team Pages

Each team's almanac page shows:
- Timeline of all post-game columns (newest first)
- Filterable by date range, opponent, game mode
- Notable storylines highlighted (streaks, milestones, rivalry games)

### 8.3 Player Baseball Cards

Player cards already display stats. The beat reporter system adds an **AI-generated summary section**:

> **Harry Backman — C**
> *"Backman authored the signature moment of the Blowfish's exhibition season, launching a walk-off three-run homer against the Freebooters on Apr 13. Dutch McAllister called it 'the loudest crack of the bat this side of the Mississippi.'"*

Generated from the most notable moments in the story archive for that player. Regenerated periodically (end of season, or on demand).

### 8.4 Season Summaries

At season end (or on demand), Claude generates a season recap from accumulated game stories:
- Season narrative arc
- Key moments and turning points
- Player highlights
- Reporter's "awards" (MVP, Cy Young equivalent, etc.)
- Generated via Claude Sonnet (long context)

### 8.5 Context Isolation

**Critical:** Each game mode pulls ONLY its own history to avoid nonsensical cross-references.

| Game Mode | Reporter Pulls Context From |
|---|---|
| Exhibition | Exhibition game history only |
| Elimination | Elimination tournament history only |
| Franchise | Franchise season/career history only |

All modes share the same reporter identity and team DNA, but narrative context (storylines, records, matchup history) is scoped to the active mode.

---

## 9. Cross-Game Narrative System

### 9.1 Narrative Context Object

A compact (~500 token) context block passed to each LLM call:

```typescript
interface NarrativeContext {
  activeStorylines: string[];          // Max 5, most relevant
  recentMomentum: 'HOT' | 'COLD' | 'NEUTRAL';
  currentMood: PersonalityType;
  rivalryIntensity: number;            // 0-10
  teamDnaFacts: string[];              // 2-3 heritage facts
  gameNarrativeSoFar: string;          // 2-3 sentence rolling summary, cached at each half-inning
  matchupHistory: string;              // "Blowfish are 5-2 vs Freebooters in exhibition"
}
```

### 9.2 Storyline Detection (Dual System)

**Auto-detected from database (deterministic):**
- Hit streaks (query last N games for batter)
- Pitcher dominance streaks
- Head-to-head matchup records
- Milestone proximity (approaching career HR record, etc.)
- Win/loss streaks for teams

**LLM-identified from post-game analysis (creative):**
- Emerging revenge arcs
- Breakout player narratives
- Team identity shifts ("The Blowfish are becoming a pitching-first team")
- Callback opportunities to past memorable moments

Both feed into the `narrative_context` table for future games.

### 9.3 `gameNarrativeSoFar` Management

- Written by the LLM at the end of each half-inning (as part of the between-inning summary call)
- Cached in memory during the game
- Passed as context to all subsequent LLM calls that game
- Replaced (not appended) each half-inning to stay compact
- Example: "Noelle dominant through 4 with 6 Ks. Blowfish managed just 2 hits but Backman's solo shot in the 3rd has it tied 1-1."

---

## 10. Rivalry System

### 10.1 Structure

Rivalries are **asymmetric** — Team A may consider Team B their arch-rival, but Team B may consider Team C their real rival.

```typescript
interface Rivalry {
  teamId: string;           // The team that holds the rivalry
  rivalTeamId: string;      // The team they rival
  intensity: number;        // 0-10 scale
  origin: string;           // "Division rivals since league founding"
  createdAt: Date;
  lastUpdated: Date;
}
```

### 10.2 Setup & Management

- Defined in **League Builder** during team setup
- User can set initial rivalries and intensity per team
- Editable anytime in League Builder team management

### 10.3 Game-by-Game Evolution

Rivalry intensity evolves automatically based on game results:

| Event | Intensity Change |
|---|---|
| Close game (decided by 1-2 runs) | +0.5 |
| Walk-off win/loss | +1.0 |
| Blowout (8+ run differential) | -0.5 (rivalry feels one-sided) |
| Controversial play (error in crucial spot) | +0.5 |
| Sweep (3+ consecutive wins by one side) | +1.0 for losing team, -0.5 for winning team |
| Long gap between matchups (10+ games) | Decay -0.5 |

Intensity clamped to 0-10 range.

### 10.4 Effect on Reporter

When covering a rival game:
- HOMER personality weight increases proportional to rivalry intensity
- CONTRARIAN personality weight increases proportional to rivalry intensity
- Mood drift probability increases slightly (90/10 → 85/15 at intensity 5, → 80/20 at intensity 8+)
- Tidbits more likely to reference rivalry history

---

## 11. LLM Engine Architecture

### 11.1 Engine Split

| Use Case | Engine | Location | Est. Cost/Call |
|---|---|---|---|
| In-game commentary | Grok API (xAI) | Client-side | ~$0.002 |
| Tidbits / lull filler | Grok API (xAI) | Client-side | ~$0.002 |
| Between-inning summaries | Grok API (xAI) | Client-side | ~$0.002 |
| Game preamble | Grok API (xAI) | Client-side | ~$0.002 |
| Post-game columns (x2) | Claude Sonnet | Server-side (Supabase Edge) | ~$0.004 each |
| Season/career summaries | Claude Sonnet | Server-side (Supabase Edge) | ~$0.01 |
| Player card summaries | Claude Sonnet | Server-side (Supabase Edge) | ~$0.005 |

**Why Grok for in-game:** Fast, cheap, naturally fun/snarky tone that matches the SMB4 experience. Excellent for real-world baseball history references and tidbits. Good at maintaining voice consistency for short-form commentary.

**Why Claude for post-game:** Superior long-context reasoning, better at weaving coherent multi-paragraph narratives, excellent at maintaining voice across longer pieces. Claude Sonnet balances quality and cost.

### 11.2 Estimated Cost Per Game

- In-game calls (~25 × $0.002): ~$0.05
- Post-game columns (2 × $0.004): ~$0.008
- **Total: ~$0.058 per game**

### 11.3 System Prompt Structure

Each LLM call includes:

```
SYSTEM PROMPT:
- Reporter identity (name, personality, voice style, era flavor)
- Voice style guide (signature phrases, energy level, delivery patterns)
- Era flavor guide (period-appropriate language patterns)
- Current mood state (base personality or drifted mood + momentum level)

USER PROMPT:
- What just happened (play result, WPA, game situation)
- Narrative context (active storylines, momentum, rivalry intensity)
- Game narrative so far (cached summary)
- Team DNA facts
- Specific instruction: "Write 1-2 sentences of commentary" / "Write between-inning summary" / etc.
```

### 11.4 Local LLM Option (Future)

A local 8B model (Ollama) could handle routine commentary and tidbits at zero cost. This is a future optimization, not part of initial implementation. The architecture should be designed with a pluggable engine interface so local LLM can be swapped in later.

```typescript
interface CommentaryEngine {
  generateCommentary(prompt: CommentaryPrompt): Promise<string>;
  generateSummary(prompt: SummaryPrompt): Promise<string>;
}

// Implementations:
// - GrokEngine (in-game)
// - ClaudeEngine (post-game)
// - OllamaEngine (future local option)
```

---

## 12. Supabase Data Model

### 12.1 Tables

```sql
-- Beat reporters (one per team)
CREATE TABLE reporters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  name TEXT NOT NULL,
  personality TEXT NOT NULL,        -- PersonalityType enum
  voice_style TEXT NOT NULL,        -- VoiceStyle enum
  era_flavor TEXT NOT NULL,         -- EraFlavor enum
  avatar_era TEXT NOT NULL,         -- 'fedora' | 'headset' | 'cap'
  avatar_primary_color TEXT,
  avatar_secondary_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post-game newspaper columns
CREATE TABLE game_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL,
  reporter_id UUID REFERENCES reporters(id),
  team_id UUID REFERENCES teams(id),
  game_mode TEXT NOT NULL,          -- 'exhibition' | 'elimination' | 'franchise'
  headline TEXT NOT NULL,
  body TEXT NOT NULL,
  players_mentioned TEXT[],         -- Array of player names for search
  game_date DATE NOT NULL,
  opponent_team_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Narrative context (active storylines per team per mode)
CREATE TABLE narrative_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  game_mode TEXT NOT NULL,
  active_storylines JSONB DEFAULT '[]',
  last_game_summary TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, game_mode)
);

-- Rivalry scores (asymmetric)
CREATE TABLE rivalry_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  rival_team_id UUID REFERENCES teams(id),
  intensity NUMERIC(3,1) DEFAULT 0 CHECK (intensity >= 0 AND intensity <= 10),
  origin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, rival_team_id)
);
```

### 12.2 Indexes

```sql
CREATE INDEX idx_game_stories_team ON game_stories(team_id, game_mode, game_date DESC);
CREATE INDEX idx_game_stories_game ON game_stories(game_id);
CREATE INDEX idx_game_stories_players ON game_stories USING GIN(players_mentioned);
CREATE INDEX idx_rivalry_scores_team ON rivalry_scores(team_id);
```

---

## 13. Team DNA & Backstory

### 13.1 Structure

Each team has 2-3 heritage facts stored as part of the team record. These are referenced organically by the reporter during tidbits and post-game narratives.

```typescript
interface TeamDNA {
  teamId: string;
  heritageFacts: string[];           // 2-3 facts, e.g., "Known for late-inning comebacks"
  identity: string;                   // 1-sentence team identity
  backstory: string;                  // 2-3 sentence origin story
}
```

### 13.2 Backstory Session

Non-MLB fictional teams require a dedicated backstory session where the user provides:
- Team identity and personality
- Heritage facts (traditions, tendencies, quirks)
- Rivalries (which teams, why, intensity)
- Any historical moments worth establishing as lore

These are documented separately and loaded into the team DNA at franchise creation.

### 13.3 History Accumulation

Over time, real game data builds on the initial backstory:
- Exhibition games accumulate exhibition matchup history
- Elimination tournaments build tournament legacy
- Franchise seasons create season-over-season narrative arcs
- The reporter naturally references this accumulated history alongside the original DNA

---

## 14. Implementation Phases

### Phase 1: Foundation
- Reporter data model in Supabase
- League Builder UI for reporter generation/editing
- Reporter avatar assets (3 silhouettes + 3 pixel portraits)
- Pluggable `CommentaryEngine` interface
- Pre-game toggle (reporter on/off)
- Mood drift engine (deterministic triggers)

### Phase 2: In-Game Commentary
- Grok API integration (client-side)
- WPA-based notability scoring
- Game preamble on "Start Game"
- Word-by-word typewriter effect + sound
- Feed display in NewsBoard (reverse chrono, half-inning labels)
- Lull tidbit system (3+ quiet plays trigger)
- Narrative context object construction

### Phase 3: Between-Inning Summaries
- Between-inning summary generation (Grok)
- `gameNarrativeSoFar` caching
- Popup overlay → collapse into feed
- Visual differentiation (italic/color)

### Phase 4: Post-Game Columns
- Claude Sonnet integration (Supabase Edge Functions)
- Dual column generation (home + away reporters)
- Newspaper split-page view
- Storage in `game_stories` table
- Almanac list view with headline + date

### Phase 5: Narrative Evolution
- Cross-game storyline detection (auto + LLM)
- Rivalry evolution engine
- Narrative context persistence
- Player baseball card AI summaries
- Season summary generation

### Phase 6: Polish
- 8-bit reporter portraits
- Sound design refinement
- Performance optimization (caching, batching)
- Local LLM option (Ollama) if desired

---

## 15. Open Items for Future Sessions

- [ ] Backstory session: Define DNA, identity, and rivalries for each fictional franchise
- [ ] Sound design: Source/create retro typewriter sound effects
- [ ] Reporter name bank: Build era-appropriate name lists
- [ ] Prompt engineering: Develop and test system prompts for each voice style
- [ ] Grok API: Set up account, test voice quality, evaluate cost
- [ ] Migration plan: Full Supabase migration for game data (separate workstream)
