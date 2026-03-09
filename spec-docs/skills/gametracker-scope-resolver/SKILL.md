---
name: gametracker-scope-resolver
description: Socratic Q&A protocol to reconcile what the GameTracker code does (from functional audit) with what V1 specs say it should do. Every question cites specific code and spec evidence. Covers ALL 25 sections of MODE_2_V1_FINAL.md — not just GameTracker UI sections, but also stats, WAR, mojo, narrative, and other systems that fire during game recording. Produces GAMETRACKER_SCOPE_LOCK.md. JK approves before any design work. ROUTE Claude.ai for Q&A, Claude Code CLI | opus for synthesis. Trigger on "resolve gametracker scope", "scope lock", "reconcile code and spec", or as Phase 2 after gametracker-functional-audit.
---

# GameTracker Scope Resolver

## Purpose

Interrogate JK until every ambiguity is resolved and V1 scope is bulletproof.

**CRITICAL PRINCIPLE: Preserve what works.** Default is KEEP. "It could be better" is NOT a reason to rebuild. "It's broken," "it contradicts the spec," or "JK wants it different" ARE reasons.

You do NOT decide scope. You surface facts, ask questions, and record rulings.

**Output:** `spec-docs/GAMETRACKER_SCOPE_LOCK.md`

## Prerequisites

Read IN ORDER:

1. `spec-docs/GAMETRACKER_FUNCTIONAL_TRUTH.md` — must have JK's "Truth doc reviewed" confirmation
2. `spec-docs/v1-simplification/MODE_2_V1_FINAL.md` — **ALL 25 sections.** Sections §8-§25 cover stats pipeline, pitcher tracking, fielding, WAR, leverage, clutch, mojo/fitness, modifiers, narrative, designations, milestones, fan morale, standings, schedule, adaptive standards, park factors, and data flow — ALL of which have engines/hooks that fire during or immediately after game recording.
3. `spec-docs/MODE_2_FRANCHISE_SEASON_UPDATED.md` — gospel context (skim for areas where V1 Final simplified)

If functional truth doesn't exist or hasn't been JK-reviewed, STOP.

## Important: Scope Includes In-Game Systems Beyond the UI

The GameTracker is not just the recording UI. It's the UI PLUS every engine/hook that fires during a game:
- Stats pipeline (§8) fires after every at-bat
- Pitcher stats (§9) update after every at-bat
- Fielding (§10) fires on enrichment
- WAR components (§11) fire on game completion
- Leverage index (§12) fires on every at-bat
- Clutch (§13) fires on high-leverage at-bats
- Mojo/fitness (§14) fire during and between games
- Narrative (§16) fires on significant events
- Milestones (§18) fire on stat thresholds
- Fan morale (§19) fires on game outcomes

The reconciliation matrix must cover ALL of these, not just the UI layer.

---

## Pre-Session: Build the Reconciliation Matrix

Cross-reference functional truth against V1 spec. Organize by layer:

```
RECONCILIATION MATRIX

=== UI LAYER (§3-§7: GameTracker, Enrichment, Between-Play, Rules, Substitutions) ===

MATCHES: [table with Feature | Code Files | Spec Ref | Status | Action]
DISCREPANCIES: [table]
SPEC-ONLY GAPS: [table]
CODE-ONLY EXTRAS: [table]

=== ENGINE LAYER (§8-§14: Stats, Pitcher, Fielding, WAR, Leverage, Clutch, Mojo) ===

MATCHES: [table]
DISCREPANCIES: [table]
SPEC-ONLY GAPS: [table]
CODE-ONLY EXTRAS: [table]

=== SYSTEMS LAYER (§15-§25: Modifiers, Narrative, Designations, Milestones, etc.) ===

MATCHES: [table]
DISCREPANCIES: [table]
SPEC-ONLY GAPS: [table]
CODE-ONLY EXTRAS: [table]
```

**NOTE on Code Files column:** Many spec features map to MULTIPLE code files. List all relevant files, not just one. Example: "Substitutions" maps to PitchingChangeModal.tsx, PinchHitterModal.tsx, PinchRunnerModal.tsx, DefensiveSubModal.tsx, DoubleSwitchModal.tsx, PositionSwitchModal.tsx.

Present summary to JK:
```
RECONCILIATION SUMMARY:
UI Layer: [N] matches | [N] need ruling
Engine Layer: [N] matches | [N] need ruling
Systems Layer: [N] matches | [N] need ruling
Total: [N] auto-PRESERVE | [N] need your ruling

Ready to begin? I'll start with items that need rulings.
```

JK may want to review the auto-PRESERVE list first.

---

## Question Protocol

### Grounding Rule

Every question MUST cite code AND spec evidence. No generic questions.

```
GOOD: "atBatLogic.ts:47 handles DP by setting outs+=2, but V1 §6.4 says
       force play rules apply. Code skips force validation. Is code correct
       for SMB4, or add force checking?"

BAD:  "How should double plays work?"
```

### Question Format

```
═══════════════════════════════════════
[DISCREPANCY | GAP | EXTRA | UNKNOWN] #[N]
Layer: UI | ENGINE | SYSTEMS
Domain: [specific domain]
═══════════════════════════════════════

CODE: [what code does — cite file(s):line(s)]
SPEC: [what spec says — cite §X.Y]
TRUTH STATUS: [✅/⚠️/❌]

QUESTION: [specific]

OPTIONS:
(a) PRESERVE code as-is — [implication]
(b) MODIFY code to match spec — [effort S/M/L, implication]
(c) MODIFY spec to match code — [implication]
(d) DEFER to V2 — [what V1 loses]
(e) DISCUSS
```

### Batch Ruling Support

For groups of similar items where the answer is likely the same:

```
═══════════════════════════════════════
BATCH: [category] — [N] items
═══════════════════════════════════════

These [N] items share the same pattern:
[describe the pattern]

Items:
1. [item] — Code: [ref] | Spec: [ref]
2. [item] — Code: [ref] | Spec: [ref]
...

QUESTION: [batch question]
OPTIONS:
(a) PRESERVE all [N] as-is
(b) [alternative for all]
(c) Rule individually — I'll present each separately
```

This prevents JK from sitting through 15 "just keep it" decisions one at a time.

### Preservation Bias

- Code ✅ + matches spec → auto-PRESERVE, don't ask
- Code ✅ + differs from spec → PRESERVE first, explain difference
- Code ⚠️ → ask JK if tested before proposing changes
- Code ❌ → present evidence, confirm it's broken before proposing fixes
- Code 🪦 → present for CUT, ask if JK knows why it exists
- Never present REBUILD unless ❌ BROKEN and unfixable

### Ruling Format — Write Immediately

After each answer:

```
RULING #[N]:
Type: DISCREPANCY | GAP | EXTRA | UNKNOWN | BATCH
Layer: UI | ENGINE | SYSTEMS
Code ref: [file(s):line(s)]
Spec ref: [§X.Y]
JK's answer: [verbatim]
Decision: PRESERVE | MODIFY-CODE | MODIFY-SPEC | BUILD-NEW | DEFER | CUT
Effort: S | M | L
Design constraint: [if any]
```

**Write mechanism:**
- **In Claude.ai:** Rulings accumulate in the conversation. At session end or after every 10 rulings, use Desktop Commander or Filesystem tools to append to `spec-docs/GAMETRACKER_SCOPE_LOCK_WORKING.md`
- **In Claude Code CLI:** Write directly to file after each ruling

---

## Session Management

### Session Start
```
SCOPE RESOLVER — SESSION [N]
Documents loaded: ✅
Matrix: [N] auto-PRESERVE | [N] need ruling (UI: [N], Engine: [N], Systems: [N])
[If resuming:] Previous: [N] rulings done | Resume: [layer], item #[N]
Ready?
```

### During Session
- Max 3 questions (or 1 batch) before: "Continue, or take a break?"
- Short clear answer → record, move on
- Ambiguous → ONE follow-up with citation
- "Just keep it" → PRESERVE, move on
- "Cut it" → CUT, flag dependencies, move on
- Max 2 follow-ups per item, then NEEDS-REVISIT

### Session End
```
SESSION [N] COMPLETE
Rulings: [N] this session | [N] total / [N] needed
Written to: GAMETRACKER_SCOPE_LOCK_WORKING.md
Remaining: [N] | Est. sessions left: [N]
Resume: [layer], item #[N]
Open: [NEEDS-REVISIT items]
```

---

## Output: GAMETRACKER_SCOPE_LOCK.md

```markdown
# GameTracker V1 Scope Lock
Generated: [date] | Sessions: [N] | Rulings: [N]
Status: ⏳ PENDING JK APPROVAL

## Purpose Statement
[One sentence from JK's own words]

## Preservation Summary
[N] of [total] existing items PRESERVED unchanged = [X]% of codebase.

## Component Disposition
| Component | File(s) | Decision | Effort | Ruling # |
|-----------|---------|----------|--------|----------|

## Scope by Layer

### UI Layer (§3-§7)
PRESERVE: [list] | MODIFY: [list w/ ruling refs] | BUILD: [list] | DEFER: [list]

### Engine Layer (§8-§14)
[same format]

### Systems Layer (§15-§25)
[same format]

## Index.tsx Disposition
[Explicit ruling on whether the 100KB monolith is PRESERVED / REFACTORED / DECOMPOSED]

## All Rulings (chronological)
[complete log]

## Design Constraints (for Phase 3)
[from rulings]

## Effort Summary
| Category | Count | Est. Effort |
|----------|-------|-------------|
```

## Approval Gate

JK responds: "Scope locked" → 🔒 LOCKED → Phase 3 begins.

**Phase 3 CANNOT start until 🔒 LOCKED.** Update `spec-docs/CURRENT_STATE.md` when locked.

## Routing

**Q&A:** Claude.ai | **Synthesis:** Claude Code CLI | opus
**Duration:** 2-4 sessions × 30-45 min | **JK time:** ~2-3 hours

## Anti-Hallucination Rules

- Don't ask questions answerable from the documents
- Don't present options without code:file AND spec:§ citations
- Don't assume JK's answer — wait
- Don't rephrase JK's meaning
- Don't propose design solutions — scope only
- Don't default to REBUILD when MODIFY works
- Don't skip the reconciliation matrix
- Surface contradictions with both ruling numbers
- Don't limit scope to §1-§7 — cover ALL sections that affect in-game behavior
