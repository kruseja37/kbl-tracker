---
name: almanac-interrogator
description: Deep-dive interview protocol to extract every UI/UX/data/logic decision for the KBL Tracker Almanac — the home-screen-level, cross-everything data explorer for all stats, records, moments, and milestones ever generated in the app. Asks one focused question at a time, writes every response to a persistent transcript file, and synthesizes into a buildable spec. Produces ALMANAC_UX_SPEC.md. Trigger on "interview me about the almanac", "almanac interrogation", "let's design the almanac", "almanac UX", or any request to interactively define the Almanac through Q&A.
---

# ALMANAC INTERROGATOR

## Purpose
Extract every UI/UX/data/interaction decision for the KBL Tracker Almanac through focused questioning. One question at a time. Write every answer to a file. Synthesize into a buildable spec from the file — never from context memory.

## When to Use
- Designing or redesigning the Almanac
- Defining what data the Almanac pulls and how users explore it
- Any time JK says "ask me questions about the almanac" or similar

---

## Core Principles

1. **One question per message.** Never bundle. Never ask two things at once.
2. **Questions must be non-obvious.** Don't ask things the spec already answers.
3. **Listen, then dig.** If JK's answer reveals a new data surface, follow that thread.
4. **Write to file after every answer.** The transcript is the ONLY truth. Context memory degrades.
5. **Challenge weak ideas. Clarify unclear ones.** The agent is a design partner, not a stenographer.
6. **Exhaust the topic.** Stay until there's nothing left to ask. Surface tensions between answers.
7. **Record what JK said, not what you think he meant.** Use JK's words. Trigger Clarity Protocol if ambiguous.
8. **Never infer. Always verify.** If JK's answer leaves room for interpretation, force a concrete answer.

---

## Foundation — Non-Negotiable Ground Truth

### Axiom 1 — The Almanac Is NOT the Museum
The Museum is a tab within franchise mode and possibly elimination mode — it shows curated franchise/bracket-specific history. The Almanac is a HOME-SCREEN-LEVEL feature accessible from the app's main menu regardless of mode. It is the source of EVERYTHING that's ever happened in the app: stats, records, moments, milestones, across ALL modes (exhibition, elimination, franchise). The museum reads from franchise-scoped data. The almanac reads from ALL data.

### Axiom 2 — Mode Filtering Is Foundational
Every piece of data in the Almanac is tagged with its source mode: exhibition, elimination, or franchise. The user can filter to any single mode or combine them. V1 starts with exhibition mode data only — but the architecture must support mode filtering from day one so elimination and franchise data can plug in without restructuring.

### Axiom 3 — The Almanac Is Read-Only
The Almanac never modifies data. It is a pure query/display layer over the data stores written by GameTracker, processCompletedGame, seasonAggregator, and other pipeline components. If data isn't being written by the pipeline, it won't appear in the Almanac — the Almanac exposes gaps rather than hiding them.

### Axiom 4 — V1 Scope: Exhibition-First
V1 of the Almanac pulls data ONLY from exhibition mode games. This is intentional — it lets us verify that GameTracker outputs everything we need without getting tangled in elimination/franchise routing complexity. Once exhibition data flows correctly through the Almanac, adding elimination and franchise sources is a filtering change, not a structural change.

### Axiom 5 — The Data Comes From Existing Stores
The Almanac does NOT require new data collection. GameTracker already writes AtBatEvents, game headers, player stats, pitcher stats, and completed game archives to IndexedDB. The Almanac reads from these existing stores. If a store is missing data that the Almanac needs to display, that's a GameTracker pipeline bug — not an Almanac architecture issue.

### Axiom 6 — Date-Based Filtering Uses Real-World Dates
Every completed game has a real-world timestamp (when the user actually played it). The Almanac filters by these real dates — not fictional in-game dates (which only exist in franchise mode). This means exhibition games, which have no fictional calendar, are fully queryable by "when did I play this."

### Axiom 7 — The Spec Already Exists As a Starting Point
`spec-docs/ALMANAC_SPEC.md` is the existing draft spec. The interrogation uses it as a STARTING POINT — not gospel. The spec was written for franchise-only context. The interrogation will adapt it for the exhibition-first, cross-mode architecture.

---

## Pre-Interview Setup

Before asking the first question, the agent MUST complete ALL of the following.

### Step 1 — Create the Transcript File

Create `spec-docs/ALMANAC_UX_TRANSCRIPT.md` with:

```markdown
# ALMANAC UX INTERROGATION — Transcript

**Started:** [timestamp]
**Status:** IN PROGRESS

---

## Entries

```

### Step 2 — Read Foundation Documents

Read in this order:
1. `spec-docs/ALMANAC_SPEC.md` — existing draft spec (starting point)
2. `spec-docs/MODE_2_V1_FINAL.md` — §8 (Stats Pipeline), §26 (Data Flow) — what data exists
3. `spec-docs/GAMETRACKER_SYSTEMS_TRUTH_MAP.md` — what GameTracker actually outputs vs should output
4. `spec-docs/GAMETRACKER_UX_SPEC.md` — the GameTracker spec (what creates the data the Almanac reads)

Note: If any file doesn't exist, skip it and note the gap.

### Step 3 — Scan Existing Code

```bash
# Check what almanac/museum code exists
ls src/utils/museumStorage.ts src/utils/museumPipeline.ts src/src_figma/hooks/useMuseumData.ts 2>/dev/null
# Check completed game archive structure
grep -n "interface.*CompletedGame\|interface.*GameArchive\|interface.*ArchivedGame" src/utils/gameStorage.ts | head -5
# Check what data processCompletedGame writes
grep -n "archiveCompletedGame\|interface.*PersistedGameState" src/utils/processCompletedGame.ts | head -5
```

### Step 4 — Present Introduction

```
I've read the existing Almanac spec, the GameTracker systems truth map, and the current data pipeline. I'm ready to design the Almanac — the home-screen-level data explorer for everything that's ever happened in the app.

Starting with exhibition mode only (per v1 scope). The goal is a platform that lets you explore any combination of stats, records, and moments from exhibition games — and that's architecturally ready to absorb elimination and franchise data later.

Topics we'll cover:
1. Entry Point & Navigation
2. Data Architecture — What the Almanac Reads
3. Game Archive — Browsing Individual Games
4. Player Stats Explorer — Cross-Game Aggregation
5. Records & Leaderboards
6. Milestones & Moments
7. Filtering & Date Ranges
8. Team-Level Views
9. Advanced Stats & Deep Dives (LI, WPA, Clutch, WAR)
10. Visual Identity & Layout
11. Future Mode Integration (Elimination, Franchise)

One question at a time. Say "that's enough" or "synthesize" when done.

Ready for Question 1?
```

**WAIT for JK to confirm. Do NOT ask the first question in this same message.**

---

## Interview Map

### Layer 1 — Entry Point & Navigation
- Where does the Almanac button live on the home screen?
- What does the Almanac home page look like? Tabs? Sidebar? Search bar?
- How does the user navigate between almanac sections?
- Is there a "quick search" concept? Type a player name and see everything?

### Layer 2 — Data Architecture
- What data stores does the Almanac read from? (completed games, season stats, career stats, events)
- What's the minimum data unit? (individual game? individual at-bat? player aggregate?)
- How does mode tagging work? (exhibition vs elimination vs franchise on each record)
- What's the real-world date model? (stored on game completion? on each event?)

### Layer 3 — Game Archive
- Can the user browse a list of all completed games?
- What info shows per game in the list? (date, teams, score, mode, key moments?)
- Can the user tap into a game and see a full box score? Play-by-play?
- Is the archived game data the same as PostGameSummary or something different?

### Layer 4 — Player Stats Explorer
- Can the user look up any player and see their accumulated stats across exhibition games?
- What stat categories? (batting, pitching, fielding, advanced, WAR?)
- Split views? (vs LHP/RHP, home/away, by opponent, by stadium?)
- How does this differ from the player card in-game?

### Layer 5 — Records & Leaderboards
- What leaderboard categories? (batting avg, HR, ERA, WAR, etc.)
- All-time vs per-game vs per-session?
- Minimum qualifications? (min AB for batting avg, min IP for ERA?)
- Single-game records? (most HR in a game, most K, etc.)

### Layer 6 — Milestones & Moments
- Does the Almanac show a timeline of milestones achieved?
- Can the user browse "legendary moments" (grand slams, no-hitters, walk-offs)?
- How are these different from the fame system's events?
- Are these filterable by player, team, date?

### Layer 7 — Filtering & Date Ranges
- Mode filter: exhibition only for v1. How does the UI communicate this?
- Date filter: specific date, date range, "today", "this week", "all time"?
- Team filter: show only games involving a specific team?
- Player filter: show only data for a specific player?
- Can filters be combined? (e.g., "Player X, exhibition only, last 7 days")

### Layer 8 — Team-Level Views
- Team history page? W-L record across exhibition games?
- Head-to-head records between teams?
- Team batting/pitching aggregates?

### Layer 9 — Advanced Stats & Deep Dives
- LI distribution — can user see how often they played in high-leverage situations?
- WPA leaders — who contributed the most win probability?
- Clutch performer rankings?
- WAR breakdowns — if WAR is computed, can user see bWAR/pWAR/fWAR/rWAR/mWAR?
- Spray charts — aggregated across games?
- Park factor analysis?

### Layer 10 — Visual Identity & Layout
- Does the Almanac feel like the same app as GameTracker or is it visually distinct?
- Dark theme consistent? Different color accent?
- Data density preference — spreadsheet-like or card-based?
- Mobile / tablet responsive considerations?

### Layer 11 — Future Mode Integration
- When elimination data is added, how does it appear? Same views with a filter? Separate section?
- Franchise data — does it merge with exhibition or stay separate?
- Career stats across modes — merged or per-mode?
- What happens if the same player appears in exhibition AND franchise? Same person or different?

---

## Transcript Format

After EVERY answer from JK, append to `spec-docs/ALMANAC_UX_TRANSCRIPT.md`:

```markdown
### Q[N]: [Layer] — [Topic]
**Question:** [exact question asked]
**Answer:** [JK's exact words — do not paraphrase]
**Confidence:** [FIRM / LEANING / OPEN]
**Decision:** [concrete, implementable takeaway]
**Spec section:** §[N] [section name]
[If PUSHBACK occurred:]
**Pushback:** [agent's concern]
**Resolution:** [JK's final call]
```

### Confidence Tags
- **FIRM:** JK is certain. This is a locked decision. Don't revisit.
- **LEANING:** JK has a preference but is open to being convinced otherwise. Note it but don't treat as gospel.
- **OPEN:** JK doesn't have a strong opinion. The agent should propose a well-reasoned default and confirm.

### OPEN items are first-class blockers
An OPEN item means the decision hasn't been made. It MUST be resolved before spec synthesis. Track all OPEN items and revisit them before declaring the interview complete.

---

## Clarity & Challenge Protocol

### Clarity Mode — "I can't build from this"

**Trigger:** JK's answer is ambiguous, vague, or could be interpreted multiple ways.

```
CLARITY CHECK: I can't build from "[JK's exact words]" yet.

That could mean:
(a) [concrete interpretation A]
(b) [concrete interpretation B]
(c) something else — tell me

Which is it?
```

### Challenge Mode — "I think this has a problem"

**Trigger:** JK's answer is clear but may cause a data architecture problem, contradicts a prior decision, or ignores how the data actually flows.

```
PUSHBACK: [1-2 sentence concern, grounded in data architecture specifics]

The risk is: [concrete consequence]

Alternative to consider:
→ [specific alternative with trade-off]

Your call — keep, take the alternative, or something else?
```

**Rules:**
- Challenge ONCE per answer. JK decides. Record and move on.
- Challenge with data evidence, not opinion. "The archiveCompletedGame function doesn't include WPA" is a challenge. "I think WPA should be included" is not.
- Always offer a concrete alternative.

---

## Anti-Patterns (The Agent Must Never Do These)

1. **Never ask about the event model.** The AtBatEvent, BetweenPlayEvent, and TransactionEvent structures are settled architecture. The Almanac reads them — it doesn't define them.
2. **Never propose new data collection during gameplay.** The Almanac reads what exists. If data is missing, that's a GameTracker pipeline bug — flag it, don't redesign collection.
3. **Never conflate Museum and Almanac.** Museum = franchise-scoped tab. Almanac = home-screen cross-everything explorer. If JK says "museum" he might mean Almanac — clarify.
4. **Never forget the real-world date model.** Exhibition games have no fictional calendar. The ONLY temporal axis is the real-world date the game was played.
5. **Never assume franchise features exist in exhibition.** No seasons, no standings, no schedule, no offseason. Exhibition games are standalone.
6. **Never design for franchise/elimination complexity in v1.** V1 is exhibition-only. The architecture supports future modes but the UI only needs to handle exhibition data.
7. **Never skip the data feasibility check.** Before recording a "the Almanac should show X" decision, verify X actually exists in the data pipeline per the Systems Truth Map. If it doesn't, flag it as a PREREQUISITE.
8. **Never ask about styling before data.** Get the data architecture and information hierarchy right first. Colors and fonts come in Layer 10.

---

## Spec Output Structure

When JK says "synthesize", produce `spec-docs/ALMANAC_UX_SPEC.md`:

```markdown
# ALMANAC UX SPEC — V1 (Exhibition Mode)

## 1. Overview & Purpose
## 2. Entry Point & Navigation
## 3. Data Sources & Mode Filtering
## 4. Game Archive
## 5. Player Stats Explorer
## 6. Records & Leaderboards
## 7. Milestones & Moments
## 8. Filtering System
## 9. Team Views
## 10. Advanced Stats Display
## 11. Visual Identity & Layout
## 12. Data Prerequisites (from Systems Truth Map)
## 13. Future Mode Integration Architecture
## 14. Open Questions (unresolved OPEN items)
```

Every section must reference transcript entry numbers. Every decision must be traceable to a specific Q&A exchange.

---

## Session Management

### Starting a New Session
1. Read the transcript file to find the last entry number
2. State: "Resuming at Q[N+1]. Last topic was [Layer X — topic]. [N] decisions recorded, [M] OPEN items remaining."
3. Continue from where you left off

### Ending a Session
1. Append all pending entries to the transcript
2. Count FIRM/LEANING/OPEN items
3. State what was covered and what remains
4. If OPEN items exist, list them explicitly

### Synthesis
When JK says "synthesize" or "that's enough":
1. Read the ENTIRE transcript file (not context memory)
2. Resolve any remaining OPEN items with JK
3. Produce `spec-docs/ALMANAC_UX_SPEC.md` from transcript entries only
4. Cross-reference against `GAMETRACKER_SYSTEMS_TRUTH_MAP.md` to flag data prerequisites
