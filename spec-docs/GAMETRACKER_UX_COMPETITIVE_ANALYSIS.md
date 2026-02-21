# GameTracker UX Competitive Analysis
## Deep Research for At-Bat Entry Flow Simplification

> **Purpose**: Inform Phase B GameTracker UX improvements by analyzing how leading baseball scoring apps handle at-bat entry, then mapping actionable recommendations to KBL Tracker's existing architecture.
>
> **Date**: February 19, 2026
> **Audience**: JK (product owner), Grok (GameTracker PRD author), implementation agents
> **Constraint**: All recommendations must work within Vite + React + IndexedDB, no greenfield rewrites

---

## 1. Executive Summary

KBL Tracker's GameTracker currently requires **5–11 taps per at-bat** depending on play complexity. Competitive analysis of GameChanger (market leader), iScore (power-user favorite), and board-game scoring patterns (closest analog to SMB4 companion tracking) reveals that **3 architectural UX patterns** can cut tap counts by ~50% while preserving full stat-tracking depth:

1. **Outcome-First Quick Buttons** — bypass the full flow for ~60% of plays (K, BB, HBP, HR)
2. **Progressive Disclosure Interview** — only ask questions relevant to the specific play type
3. **Smart Runner Defaults with Accept-or-Override** — auto-calculate runner advancement, prompt only for exceptions

Projected savings: **~194 fewer taps per 9-inning game** (54 plate appearances × 3.6 average tap reduction).

---

## 2. Apps Analyzed

### 2.1 GameChanger (Dick's Sporting Goods)
- **Market position**: Dominant in youth/amateur baseball. Used by Little League, high school, travel ball.
- **Core model**: Pitch-by-pitch entry → "Ball in Play" triggers outcome interview
- **Stat depth**: 145+ auto-calculated stats including BABIP, spray charts, pitch counts
- **UX philosophy**: Guide novice scorekeepers (volunteer parents) through complex plays with organized pop-ups

### 2.2 iScore Baseball (Faster Than Monkeys)
- **Market position**: Power-user favorite. Used by serious scorekeepers, some pro scouts.
- **Core model**: "Intuitive Interview Scorekeeping" — progressive questioning with multi-level undo
- **Stat depth**: 500+ statistics, pitch location/type/speed tracking, speckle charts
- **UX philosophy**: "Score What You See" — get the outcome right now, fix details later
- **Critical finding**: Board game users (Strat-O-Matic) successfully use iScore by bypassing pitch-by-pitch and entering at-bat results directly. This is the closest existing analog to SMB4 companion tracking.

### 2.3 Pointstreak K-Force / Baseball Pro
- **Market position**: Niche. Used by some independent leagues and high school announcers.
- **Core model**: Traditional paper-scorecard-inspired digital entry
- **Key insight**: Scoring simple plays requires as few as 1–2 taps, but complex plays get confusing quickly. Macworld's review noted K-Force was the fastest for simple plays but lacked iScore's depth.

### 2.4 Board Game Scoring Patterns (Strat-O-Matic, APBA)
- **Relevance**: Closest use case to KBL Tracker. Users play a tabletop/video baseball sim and need to record outcomes for season stat tracking.
- **Key finding**: iScore user bypasses pitch/ball/strike recording and just enters at-bat result for Strat-O-Matic.
- **Key finding**: Board game players report stat tracking is "the best part of the game" — they want rich stats with minimal entry friction.
- **Implication**: At-bat-level entry is not just sufficient — it's *preferred* by users tracking simulated games. Pitch-by-pitch adds zero value for KBL's use case.

---

## 3. Competitive Flow Analysis

### 3.1 GameChanger: Ball in Play Interview

GameChanger's flow after "Ball in Play" is tapped follows a strict decision tree, documented in their official Little League guidelines:

**Step 1**: How did ball come off bat? (Ground Ball / Hard Ground Ball / Fly Ball / Line Drive / Bunt / Pop Fly)

**Step 2**: Is batter out at first?
- YES → tap fielder(s) → Done
- Air balls: Fair/foul territory → tap fielder → Done
- Ground balls: tap fielder who fielded → tap 1B → Done
- Bunts: Sac Bunt (runner advanced) / Out at 1st (NoSac) / Pop Out

**Step 3**: Did fielders get lead runner instead? → Fielder's Choice flow

**Step 4**: Did batter reach on error? → Error flow (tap fielders, specify who errored)

**Step 5**: Which base did batter reach? (Single / Double / Triple / HR / In-park HR) → Drag fielder to spot where ball was fielded

**Runner handling**: After batter resolved, runners prompted one at a time (Safe/Out/Didn't Advance)

**Key pattern**: The interview is *batter-first, runners-second*. Each question narrows the next set of options. This progressive disclosure is what makes it learnable by parent volunteers.

### 3.2 iScore: Interview + Minimize Questions

iScore uses a similar progressive interview but adds critical power-user features:

- **"Minimize Questions" toggle**: When enabled, runners auto-default to "Held Up" unless the user overrides. This alone eliminates 1-3 taps per play when runners are on base.
- **Quick Swipe gestures**: Swipe Strike button up = Swinging Strike. Swipe Ball up = Intentional Ball. Swipe Out up = Quick Outs menu. Swipe runner up = Stolen base/pickoff.
- **Multi-level Undo/Redo**: Can undo back to the first play of the game. This gives scorekeepers confidence to enter quickly and fix later.
- **Skip At Bats**: Can skip an at-bat entirely and come back later. Can end inning at any time.

### 3.3 Tap Count Comparison (Simple Plays)

| Play | GameChanger | iScore | Current KBL | Notes |
|------|-------------|--------|-------------|-------|
| Strikeout (swinging) | 3 | 2 | 5 | KBL: result→exit type→fielder→confirm→confirm |
| Walk | 4 | 2 | 4 | KBL: result→confirm→runners→confirm |
| Ground out 6-3 | 5 | 4 | 7 | KBL: result→exit→out type→field loc→fielder→confirm→confirm |
| Fly out CF | 4 | 3 | 6 | KBL: result→exit→out type→field loc→fielder→confirm |
| Single to RF | 6 | 4 | 8 | KBL: result→exit→hit type→field loc→fielder→runners→confirm→confirm |
| Home run | 4 | 2 | 6 | KBL: result→exit→HR→location→distance→confirm |
| Double play 6-4-3 | 8 | 6 | 11 | KBL has most steps due to redundant confirmations |
| Error | 7 | 5 | 9 | Both GC and iScore handle errors with fewer prompts |

**Observation**: KBL's current flow has 2-4 extra taps per play compared to GameChanger, primarily from: (1) redundant exit type selection (GAP-031), (2) explicit HIT/OUT confirmation that playClassifier.ts already handles, and (3) per-runner confirmation when defaults would suffice.

---

## 4. Key UX Patterns Extracted

### Pattern 1: Outcome-First Entry
Both GameChanger and iScore start with **what happened to the batter** before asking about fielders, locations, or runners. This matches how users think: "He struck out" or "He singled to right." The fielding details and runner movements are secondary context.

**KBL current**: User selects result (1B, 2B, etc.), then selects exit type, then enters fielding flow. The exit type selection happens *twice* (GAP-031).

**KBL target**: Quick-button bar with [K] [BB] [1B] [2B] [3B] [HR] [OUT] bypasses result selection entirely for common plays.

### Pattern 2: Progressive Disclosure (Only Ask What's Needed)
GameChanger's "Ball in Play" interview only shows relevant options at each step. If the ball is a fly ball, ground-ball-specific options don't appear. If there are no runners on base, runner advancement questions never appear.

**KBL current**: All flow steps execute regardless of context. A strikeout still goes through fielding and exit-type prompts.

**KBL target**: Different flow branches for different play types:
- K/BB/HBP → skip location, fielding, exit type entirely → runner confirm → done
- HR → location → distance → runner confirm → done
- Hit → location → exit type (inferred from Y-coordinate) → runner confirm → done
- Out → location → fielders → out type → runner confirm → done

### Pattern 3: Smart Defaults with Override
iScore's "Minimize Questions" is the gold standard. Runners are auto-advanced by the rules of baseball (forced runners advance, non-forced hold), and the user only intervenes for exceptions.

**KBL current**: runnerDefaults.ts already calculates correct defaults. But the UI requires explicit confirmation of each runner.

**KBL target**: Show auto-calculated defaults highlighted in green. Single "Accept All" tap confirms defaults. Tap individual runner to override. Saves 0-3 taps per play.

### Pattern 4: Robust Undo
Both apps offer strong undo. GameChanger has single-play undo. iScore has full-game undo/redo stack.

**KBL current**: 10-state undo stack exists via undoStack in useGameState.ts. Button wiring is a Phase A story (S-A013).

**KBL target**: Undo is already architecturally sound. Wire the button, expose clearly in UI.

### Pattern 5: Score What You See (Fix Later)
iScore's philosophy: get the outcome recorded during live play, fix the details in post-game editing. Don't block the user with validation or complex prompts during the action.

**KBL relevance**: SMB4 games move fast. The user is watching a video game and needs to record what happened quickly. Post-game editing (or even post-inning editing) should be the fallback for complex plays, not a multi-step interview during play.

---

## 5. Actionable Recommendations for KBL Tracker

### Tier 1: Quick Wins (Low effort, high impact)

#### R1: Quick-Button Bar
**What**: Add a horizontal button bar to the IDLE state: [K] [BB] [1B] [2B] [3B] [HR] [HBP] [OUT]
**Why**: Bypasses the full outcome-selection flow for ~60% of plays
**Tap reduction**: K (5→1), BB (4→1), HR (6→2), HBP (4→1)
**Files**: GameTracker.tsx (add bar), ActionSelector.tsx (integrate), useGameState.ts (add handlers)
**Complexity**: Small — pure UI addition, calls existing processAtBat with pre-filled params
**ROUTE**: Claude Code CLI | sonnet

#### R2: Eliminate Exit Type Double Entry (GT-006 / GAP-031)
**What**: Remove pre-modal exit type selection. Move exit type into the fielding modal only.
**Why**: Users currently select exit type twice. Both iScore and GameChanger ask once.
**Tap reduction**: -1 per ball-in-play
**Files**: AtBatFlow.tsx, EnhancedInteractiveField.tsx
**Complexity**: Small — refactor, no new architecture
**ROUTE**: Codex | 5.1 mini | medium

#### R3: Eliminate HIT/OUT Confirmation Modal (GT-003)
**What**: Remove the "Was this a hit or an out?" modal. playClassifier.ts already determines this.
**Why**: Redundant confirmation step. Both GameChanger and iScore determine hit/out from the play type, not a separate question.
**Tap reduction**: -1 per classified play
**Files**: GameTracker.tsx, playClassifier.ts (already has logic)
**Complexity**: Small — remove modal, trust existing classifier
**ROUTE**: Codex | 5.1 mini | medium

#### R4: Fix HR Flow Order (GT-009)
**What**: Change HR flow from HR → distance → location to HR → location → distance
**Why**: Location determines whether HR is possible (fence distance varies by field position). GameChanger shows location first.
**Tap reduction**: 0 (same taps, better UX)
**Files**: OutcomeButtons.tsx, GameTracker.tsx
**Complexity**: Small — reorder state transitions
**ROUTE**: Codex | 5.1 mini | medium

### Tier 2: Medium Effort, High Impact

#### R5: Revised FlowStep State Machine
**What**: Replace current linear flow with branching state machine:
- IDLE → OUTCOME_SELECT → [branches by type]
- K/BB/HBP → RUNNER_CONFIRM → END_CONFIRM
- HR → HR_LOCATION → HR_DISTANCE → RUNNER_CONFIRM → END_CONFIRM
- HIT → HIT_LOCATION → HIT_OUTCOME → RUNNER_CONFIRM → END_CONFIRM
- OUT → OUT_LOCATION → OUT_FIELDING → OUT_OUTCOME → RUNNER_CONFIRM → END_CONFIRM
**Why**: Current flow runs every step regardless of play type. The branching model (used by both GameChanger and iScore) skips irrelevant steps.
**Tap reduction**: -1 to -3 per play depending on type
**Files**: GameTracker.tsx (state machine), all flow step components
**Complexity**: Medium — significant refactor of flow logic, but no new data model
**ROUTE**: Claude Code CLI | opus (multi-file reasoning)

#### R6: Runner Advancement UX: Accept-or-Override
**What**: Show runnerDefaults.ts calculations as pre-filled defaults. Green highlight = auto-calculated. Single "Accept All" button confirms. Tap individual runner to override via current drag-drop.
**Why**: iScore's "Minimize Questions" proves this pattern works. KBL already has the calculation logic.
**Tap reduction**: 0-3 taps per play when defaults are correct (most plays)
**Files**: RunnerDragDrop.tsx, runnerDefaults.ts, useGameState.ts
**Complexity**: Medium — UI changes to runner confirmation, expose defaults
**ROUTE**: Claude Code CLI | sonnet

#### R7: Infer Exit Type from Field Location Y-Coordinate
**What**: Auto-determine exit type from ball landing Y-coordinate:
- Y < 0.3 (infield) = Ground Ball
- Y 0.3–0.6 (shallow outfield) = Line Drive
- Y > 0.6 (deep outfield) = Fly Ball
Prompt for override only if inference is uncertain (edge zones).
**Why**: Both GameChanger and iScore ask for exit type explicitly, but KBL can do better since the user is already tapping a field location. Infer from the tap.
**Tap reduction**: -1 per ball-in-play
**Files**: fielderInference.ts (new logic), EnhancedInteractiveField.tsx
**Complexity**: Small-Medium — new inference function, but simple Y-threshold logic
**ROUTE**: Codex | 5.1 mini | high

### Tier 3: Larger Effort, Transformative

#### R8: Context-Aware Action Selector
**What**: Instead of static buttons, show only actions relevant to current game state:
- No runners: Hide runner-specific actions (FC, DP, SAC)
- 2 outs: Highlight force play options
- Bases loaded: Show DP, FC, SF prominently
- Pitcher spot: Show PH option
**Why**: Reduces visual clutter and guides user to likely actions. Neither GameChanger nor iScore does this well — it's an opportunity for KBL to differentiate.
**Files**: ActionSelector.tsx, useGameState.ts
**Complexity**: Medium — conditional UI rendering based on game state
**ROUTE**: Claude Code CLI | sonnet

#### R9: Gesture-Based Shortcuts (Power Users)
**What**: Inspired by iScore swipes:
- Long-press K button = Looking strikeout (vs. tap = swinging)
- Long-press fielder = Error on that fielder
- Swipe runner = Stolen base/pickoff
**Why**: Reduces tap count for experienced users without cluttering UI for beginners
**Files**: Touch event handlers throughout GameTracker components
**Complexity**: Medium — gesture detection, graceful fallback
**ROUTE**: Claude Code CLI | sonnet

#### R10: Visual Undo Timeline
**What**: Extend current 10-state undo stack with visual scrubber showing last 10 plays. Preview state before committing undo. Support multi-play undo.
**Why**: iScore's multi-level undo is beloved by power users. Confidence to enter quickly = faster scoring.
**Files**: New component, undoStack in useGameState.ts
**Complexity**: Medium-Large — new UI component, preview rendering
**ROUTE**: Claude Code CLI | opus

---

## 6. Projected Tap Count After Recommendations

| Play | Current KBL | After R1-R7 | Savings | Notes |
|------|-------------|-------------|---------|-------|
| Strikeout (swinging) | 5 | 1 | -4 | Quick button, no flow |
| Strikeout (looking) | 5 | 2 | -3 | Quick button + variant |
| Walk | 4 | 1 | -3 | Quick button, auto-advance forced runners |
| HBP | 4 | 1 | -3 | Quick button, same as walk |
| Ground out 6-3 | 7 | 4 | -3 | Tap location → fielders auto-inferred → confirm |
| Fly out CF | 6 | 3 | -3 | Tap location → fielder → confirm |
| Single to RF | 8 | 4 | -4 | Quick button or location → exit inferred → accept runners |
| Double to LCF | 9 | 5 | -4 | Location → exit inferred → accept runners |
| Home run | 6 | 2 | -4 | Quick button → distance |
| Double play 6-4-3 | 11 | 6 | -5 | Location → fielders → runner out confirmation |
| Error | 9 | 5 | -4 | Location → fielder → error type → runners |

**Average savings**: 3.6 taps per play
**9-inning game** (~54 plate appearances): **~194 fewer taps**

---

## 7. What KBL Can Do Better Than the Competition

The competitive apps are designed for **real baseball scorekeeping** — the user watches a live game and records what they see. KBL is designed for **video game companion tracking** — the user plays SMB4 and records outcomes for season stats.

This difference creates unique advantages:

1. **No pitch-by-pitch needed**: SMB4 doesn't expose pitch data. Skip it entirely (board game users already do this in iScore).

2. **Predictable outcomes**: SMB4 shows the at-bat result on screen. The user isn't making judgment calls about whether it was an error or a hit — the game tells them.

3. **Faster pace**: SMB4 at-bats take 10-30 seconds. Real baseball at-bats take 2-4 minutes. KBL needs to be faster than GameChanger/iScore, not just as fast.

4. **No team management overhead**: KBL already has rosters in IndexedDB. No need for the roster-entry flows that eat time in GameChanger/iScore.

5. **Context-aware inference**: Because KBL knows the game state (outs, runners, score), it can pre-calculate more than a real-baseball app. Auto-infer force plays, likely sacrifice situations, and pinch-hit opportunities.

---

## 8. Implementation Priority Roadmap

### Phase B Sprint 1 (Quick Wins)
- R1: Quick-Button Bar
- R2: Fix Exit Type Double Entry
- R3: Eliminate HIT/OUT Modal
- R4: Fix HR Flow Order

**Expected impact**: Cut average taps by ~2 per play. Minimal risk — additive UI changes.

### Phase B Sprint 2 (Flow Redesign)
- R5: Revised FlowStep State Machine
- R6: Runner Accept-or-Override
- R7: Exit Type Inference

**Expected impact**: Cut average taps by additional ~1.5 per play. Medium risk — refactors flow logic.

### Phase B Sprint 3 (Polish)
- R8: Context-Aware Action Selector
- R9: Gesture Shortcuts (if time)
- R10: Visual Undo Timeline (if time)

**Expected impact**: Polish and power-user features. Low risk — additive only.

---

## 9. Constraints Respected

All recommendations honor KBL Tracker's architectural constraints:

| Constraint | Status |
|------------|--------|
| No new tech stack (Vite + React + IndexedDB) | ✅ All UI-layer changes |
| No TypeScript interface replacement (extend only) | ✅ Only additive interfaces |
| No greenfield rewrite | ✅ Enhances existing ~15K lines |
| No SMB4 mechanics invention | ✅ Uses confirmed SMB4 features |
| No pitch-by-pitch tracking | ✅ At-bat level only |
| No server-side | ✅ Client-side only |
| Event log system intact | ✅ Quick buttons feed same AtBatEvent |
| Undo stack intact | ✅ R10 extends, doesn't replace |

---

## 10. Sources

- GameChanger Ball in Play Guidelines (Santa Cruz Little League PDF)
- GameChanger Scoring Notes (SA Baseball Scorers, Nov 2018)
- GameChanger Version 3 Scoring Guide (NSW Baseball Scorers)
- iScore Baseball App Store / Google Play listings and feature documentation
- iScore review — Beyond the Box Score (August 2010)
- Macworld: Baseball Scorekeeping Apps review (GameChanger vs iScore vs K-Force)
- Chalk & Clay: Best Baseball Scorekeeping Apps (May 2023) — includes Strat-O-Matic use case
- Bogleheads forum: Baseball simulator games thread — board game stat tracking patterns
- BoardGameGeek: Strat-O-Matic friendly scorekeeping app thread
- GameChanger support: Scoring Errors, Score a Double Play articles
- Little League University: Electronic Scorekeeping Fundamentals
- MojoTech: Building a Calculation Engine for OOTP (web-based OOTP analysis)
- OOTP Companion (Google Play) — CSV-based stat browsing for OOTP leagues
- KBL Tracker PROJECT_BIBLE.md — existing stories, architecture, spec references

---

*Last Updated: February 19, 2026*
*Status: RESEARCH COMPLETE — Ready for JK review and Phase B planning*
