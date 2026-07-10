# KBL TRACKER — SESSION RULES
# Created: 2026-02-17
# These rules are non-negotiable. They apply to every session, every AI, every change.

---

## SESSION START PROTOCOL (Every Single Session)

Before any work begins, Claude MUST read these files in order:
1. `spec-docs/SESSION_RULES.md` (this file)
2. `spec-docs/PATHWAY_TO_V1_2026-07-07.md` (the plan of record: phases, gates, agent roles, runbook)
3. `spec-docs/V1_BUILD_STATUS.md` (the status SOT — A-to-Z 13-stage build status; update THIS in place with every landing)
4. `spec-docs/UI_TRUTH_MAP.md` (UI truth: what actually renders per route — merged is not the same as routed)
5. `spec-docs/SESSION_LOG.md` (what happened last session)
6. `spec-docs/CURRENT_STATE.md` (overall app state; see `spec-docs/AUDIT_LOG.md` for fine-grained finding-level history if needed)

After reading, Claude MUST restate:
- Current audit phase and status
- What was last completed
- What the next action is

John confirms or corrects before any work starts.

---

## THE NEGATIVE FEEDBACK LOOP (NFL) — MANDATORY

After any code change, analysis, or task completion:

1. **Actively try to disprove success** — attempt to break, falsify, or find gaps
2. **Test edge cases** — boundary conditions, unusual inputs, failure modes
3. **Verify assumptions** — question every assumption made
4. **Document findings** — record what was tested and what passed/failed
5. **Iterate until unfalsifiable** — only stop when you cannot find a way to disprove correctness

Do NOT declare completion until the NFL is exhausted OR John explicitly permits moving on.

---

## EVIDENCE OVER ASSERTION

- Reading code and thinking it looks correct ≠ confirmed working
- A grep result, build output, test pass, or browser verification = confirmed
- "It should work" is not a verification method
- If something cannot be verified right now → status is UNVERIFIED, not CONFIRMED

---

## SCOPE DISCIPLINE

- Complete tasks to their full scope as requested
- Never silently reduce scope
- If a task is extensive, communicate the effort required BEFORE adjusting approach
- Always confirm before modifying task parameters
- If it's not in a file, it doesn't exist — write decisions to spec-docs before session ends

---

## CODE CHANGE RULES

Every Codex prompt must include:
1. Exact role assignment
2. Single clear goal
3. Exact files to touch
4. Exact files NOT to touch
5. Source of truth reference (spec doc or finding ID)
6. Expected output / verification command
7. Hard stop instructions for ambiguity

After every Codex change:
- [ ] `npm run build` passes
- [ ] Relevant tests pass
- [ ] Expected output matches actual output
- [ ] John confirms behavior in browser before ticket closes

If Codex output doesn't match expected → change is NOT applied. Start over with a more precise prompt.

---

## THE PROMPT CONTRACT TEMPLATE (Standard for All Codex Prompts)

```
You are [Specific Role].

GOAL:
[One sentence. What exactly needs to be done.]

SOURCE OF TRUTH:
[Exact spec doc, finding ID, or file that defines correct behavior]

CONSTRAINTS:
- Only edit these files: [list exact paths]
- Do NOT touch: [list exact paths]
- Quote the exact finding/spec ID for every change you make
- Work directly on main branch (no new worktrees)
- [Any other hard constraints]

EXPECTED OUTPUT:
[Exactly what the code should look like / do after this change]

VERIFICATION:
[Exact command to run to confirm the change worked, e.g., npm run build, specific grep, specific test]

FORMAT:
1. Files changed (list exact paths)
2. Changes made (describe each, reference finding/spec ID)
3. Verification result (paste exact output)
4. "[Task name] complete" OR "BLOCKED: [exact reason]"

FAILURE PROTOCOL:
- If anything is ambiguous → quote the exact section and ask for clarification
- If you cannot open a file → stop and report the filename
- If a change would require touching a file not listed above → stop and report
- Never summarize or batch changes
- Never assume intent — ask

Use high reasoning effort. Think step-by-step.
```

---

## SESSION END PROTOCOL (Every Single Session)

Before ending any session, Claude MUST:
- [ ] Log all findings from this session in AUDIT_LOG.md
- [ ] Update AUDIT_LOG.md phase status tracker
- [ ] Append to SESSION_LOG.md: what was done, decisions made, what's pending
- [ ] Update CURRENT_STATE.md if any status changed
- [ ] State clearly what the next session should start with

John must confirm docs are updated before closing the session.

---

## ACCOUNTABILITY ASSIGNMENTS

| Role | Responsibility |
|------|---------------|
| John (PM) | Manual browser verification, final approval on all changes, confirms docs are updated at session end |
| Claude (Captain) | Audit execution, Codex prompt writing, output verification, architectural decisions, session documentation |
| Codex | Implementation only — executes precise prompts, never makes architectural decisions |

---

## NON-NEGOTIABLE RULES (Cannot Be Overridden by Anyone)

1. No code changes without a finding or spec reference
2. No finding marked CONFIRMED without real verification
3. No session ends without spec-docs updated
4. No Codex prompt without expected output defined in advance
5. No "it looks right" — show the evidence
6. If the NFL finds a problem, the problem is logged before moving on — never buried

---

## Mandatory Documentation Cycle (Non-Negotiable)

Every diagnostic or audit cycle follows this exact order:
1. Run command batch → paste output
2. Claude produces AUDIT_LOG.md update with all new findings
3. JK commits updated AUDIT_LOG.md to main
4. Claude writes next command batch

Rules:
- Never write a second command batch before findings from the first are logged
- If JK pastes new CLI output without prior commit, Claude responds: "Log first" and produces the AUDIT_LOG update before anything else
- No finding exists until it is in AUDIT_LOG.md — chat is ephemeral, the log is permanent

---

## Documentation Routing Rules (Non-Negotiable)

### Finding Storage
- FINDING-001 through FINDING-055: full text in `spec-docs/AUDIT_LOG.md`
- FINDING-056 onwards: full text in `spec-docs/FINDINGS/FINDINGS_056_onwards.md`
- AUDIT_LOG.md contains one-line index entries only for FINDING-056+
- NEVER append full finding blocks to AUDIT_LOG.md again

### Index Entry Format (for AUDIT_LOG.md)
| FINDING-NNN | YYYY-MM-DD | STATUS | filename.ts | One-line summary |

### Full Finding Format (for FINDINGS_056_onwards.md)
```
### FINDING-NNN
**Date:** | **Phase:** | **Status:**
**File:**
**Evidence:**
**Impact:**
```

### SUBSYSTEM_MAP.md
- Update wiring status after every batch that changes a subsystem status
- Location: spec-docs/SUBSYSTEM_MAP.md
- Statuses: ✅ WIRED | ⚠️ PARTIAL | ❌ ORPHANED | 🔲 UNKNOWN | ❌ MISSING

### File Size Limits
- AUDIT_LOG.md: index only for 056+, should stay under 200 lines net new
- FINDINGS_056_onwards.md: when it exceeds 500 lines, create FINDINGS_072_onwards.md (or next batch number) and update this rule
- PHASE_SUMMARIES/: one file per phase, written at phase close

### Mandatory Cycle (repeated from above for emphasis)
Run commands → paste output → log findings to correct file → commit → next commands

---

## Session End Protocol (mandatory)
Before ending any session, rewrite CURRENT_STATE.md completely:
1. Append the OUTGOING live-header snapshot to CURRENT_STATE_HISTORY.md
   (append-only, newest at the bottom) — this preserves the arc trail.
2. Rewrite the CURRENT_STATE.md LIVE HEADER in place (do not append to it):
   - Update "RIGHT NOW" (phase / last completed / next action)
   - Update "SUITE BASELINE" if test count or characterized set changed
   - Update "BROWSER-VERIFY OUTSTANDING" and "OPEN PENDING-JK"
3. Commit with message: "docs: session end — update CURRENT_STATE.md"

CURRENT_STATE.md (the live header) is the single file that makes new threads
work. If it is stale, new threads will be disoriented. There are no exceptions.

---

## SMB4 Asset Protection Rule (Non-Negotiable)
The OOTP architecture is the structural reference. It is NOT the content
reference. SMB4-specific logic is never automatically replaced or modified
to match OOTP patterns.

**SMB4-specific systems that require JK approval before ANY change:**
- Mojo engine and mojo as performance multiplier
- Fitness engine and fitness decay model
- Chemistry types and trait system (SMB4 flavor)
- Fame tiers and fame calculation logic
- Clutch index and clutch moment detection
- Narrative flavor, headline templates, game recap voice
- Stadium analytics and park factor model
- Adaptive standards system
- Any player personality traits specific to SMB4

**Gate for every Phase 2 finding that proposes a code change:**
1. Claude produces: proposed change description in plain English
2. Claude states: what OOTP pattern it follows
3. Claude states: what SMB4 asset is affected and how it is preserved
4. JK reviews and explicitly approves or rejects
5. Only after explicit approval does a code prompt get written

"Follows OOTP pattern" alone is never sufficient justification for a change.
Required justification: "follows OOTP pattern AND preserves SMB4 asset intact."
If Claude cannot show how the SMB4 asset survives the change, the change
does not happen. Full stop.


---

## Contract Readiness Rule (Non-Negotiable — ratified by JK 2026-06-12)

A prompt contract — builder or auditor, Codex or Fable — is NOT ready to
hand off unless BOTH conditions hold:

1. **Reasoning effort is explicit twice:** in the ROUTE header
   (e.g., `Codex 5.5 | high`, `Fable 5 CLI | high reasoning effort`)
   AND in the closing directive (`Use high reasoning effort.`).
2. **The contract exists in spec-docs/PROMPT_CONTRACTS.md BEFORE the
   handoff.** Chat is ephemeral; a contract that has only been pasted
   into chat does not exist. If a contract is ever executed from chat
   first (protocol failure), it must be retro-logged verbatim with an
   explicit RETRO-LOGGED marker and an execution record.

Origin: reasoning-effort drift caught by JK in the W1 arc (2026-06-12);
chat-only handoff caught by Captain self-NFL in the F135-T1 arc
(2026-06-12). Both clauses are mechanical pre-handoff checks.

---

## AI Team Addendum (Non-Negotiable - added 2026-06-14)

The repo now supports a three-seat operating model: JK, Claude Opus 4.8, and
Codex. The purpose is faster execution with stronger audit separation, not
looser process.

Rules:
- `CLAUDE.md` remains the canonical instruction file.
- `AGENTS.md` is a short Codex bridge into `CLAUDE.md`; do not duplicate the
  canonical instructions there.
- `spec-docs/AI_TEAM_OPERATING_MODEL.md` defines routing, handoffs, and the
  builder/auditor triangle.
- Codex project skills are discovered from `.agents/skills/`; keep those as
  symlinks to source skills where possible.
- Codex MCP config lives in `.codex/config.toml`; Claude MCP config remains
  `.mcp.json`.
- The agent that builds a meaningful change cannot be the final auditor for
  that same change.
- Claude Opus 4.8 may fill the Fable-style audit role when Fable is
  unavailable, provided it did not build the diff.
- Codex may review contracts, plans, or diffs when it was not the builder.
- JK remains the final product and scope authority.


---

## CLI Verification Environment (Non-Negotiable — poisons the suite if skipped)

All vitest/CLI verification MUST prefix `NODE_ENV= ` (login shell exports
NODE_ENV=production, which poisons vitest with ~1,800 false failures). Node
lives at `~/.nvm/versions/node/v20.20.0/bin` on non-interactive shells.

**Characterized suite baseline** is maintained in CURRENT_STATE.md and updated
on change. Current baseline (certified 2026-07-09, post-PR #45 FIXTUREFIX):
**9,451 passed / 0 failed / 11 skipped.** Known conditional-solo order-flakes:
`AwardsWatchlist`, `franchiseManualSmokeFixture`, `GameTrackerLaunchState`
(each passes when run solo — see `CONTINUITY_CHECKPOINT.md` §6 for the
standing flake list). The old `LeagueBuilderDraftSetup.test.tsx` mega-file
flake (previously listed here) was ELIMINATED, not just characterized, by PR
#40 FLAKEFIX (2026-07-09, `4e6cfd33`) — the 93-test file was split into five
per-zone suites sharing one helper module. A new RED that is NOT in the
characterized set is a real regression — never silently relabel it as
baseline.

**2026-07-09-evening observations (auction walkthrough wave closing
certification, post-PR #53 ADVISORCOLOR, HEAD `68fa54dc`):** two more
conditional-solo order-flakes joined the list above — `RosterDesigner.test.tsx`
("D1: TWO-WAY toggle only renders where a two-way player is eligible") and
`LeagueBuilderDraftSetup.money.test.tsx` ("M3 resets THE MONEY to tier par").
Both surfaced only under full-suite batch pressure (two consecutive closing
runs each failed, but on 2 DIFFERENT tests — the classic batch-pressure flake
signature, not a deterministic regression) and both passed clean solo, twice
(22/22 and 15/15 respectively). Same solo-rerun protocol applies: if either is
red in a full-suite run, rerun it solo before flagging a regression. Full
detail: `CONTINUITY_CHECKPOINT.md` §6.

---

## Builder Reporting Completeness (Non-Negotiable — MINOR #3, 4 instances TV2→EP1)

Every changed file MUST appear in the builder report — including
mechanically-forced test/mock/doc adjustments the builder considers trivial.
The report enumerates every `git status` path AND states the total changed-path
count and the passing-test count. Underreporting a "trivial" mock edit is the
exact failure this rule closes.

---

## Browser Verification Gate (Non-Negotiable — JK ruling 2026-06-14)

Codex MAY run Playwright browser/user-flow pre-checks and MUST report results.
A browser pre-check by any agent NEVER closes a ticket on its own. JK's manual
browser sign-off on real franchise data remains the SOLE real-world acceptance
gate. An agent's browser pass is a fourth screen before JK's eyes, not a
replacement for them.

---

## WAITING-ON-JK PROTOCOL (Non-Negotiable)

When you hit a decision you cannot make under your current AUTH level and genuinely need JK:

1. Append one line per question to `./WAITING_ON_JK.md` at the repo root (create the file if absent). Format each line **exactly**:
   ```
   [<ISO8601 timestamp>] [thread:<short-thread-name>] [ticket:<id-or-none>] <the question, phrased so a yes/no or one-line answer unblocks you>
   ```
2. Do NOT add any `[NOTIFIED ...]` marker yourself — the watcher appends that.
3. After writing the line, continue any other queued work you CAN do without the answer. Only go fully idle if nothing else is workable.
4. When JK's answer is relayed into this thread, act on it, then append ` [RESOLVED <ISO timestamp>]` to the resolved line.

---

## CONTEXT-HANDOFF PROTOCOL (Non-Negotiable)

When your context is approaching its limit (compaction near or imminent):

1. Run the existing Session End Protocol in full (log to AUDIT_LOG.md + SESSION_LOG.md, update CURRENT_STATE.md and the phase tracker).
2. Then write a file named `HANDOFF_NEEDED` at the repo root containing **exactly**:
   ```
   next_ticket: <id or short description of what the next session should start on>
   branch: <active branch, e.g. codex/franchise-v1-next>
   resume_note: <one line the fresh session must know that isn't already in CURRENT_STATE.md>
   ```
3. Do not start new work after writing `HANDOFF_NEEDED`; a fresh session is launched automatically to continue.

---

## Lessons Learned (pending JK ratification)

- When spawning ANY subagent or workflow agent, always pass an explicit model (sonnet mechanical / opus audits) because agents without a model override silently inherit the captain's session model and burn its budget (2026-07-08 incident: SOT-sweep verifiers + design agents inherited Fable; JK flagged the burn twice).
- When monitoring long background dispatches, always use a token-free bash sentinel that wakes the captain only on stall/completion, never a timed captain heartbeat, because each timed wake-up costs a full expensive-context turn with usually nothing to do.
- When a lane changes extraction/engine behavior that page-level test fixtures consume, always include the consuming pages' test suites in the lane's contract gates because POOLFLOOR was green by its own engine gates yet invalidated 26 tests across 4 page suites that only the closing full-suite run caught.
- When SESSION_RULES prescribes rewrite-in-place for CURRENT_STATE.md's LIVE HEADER but practice is append-only banner stacking, always resolve the contradiction by JK ruling (pick one convention) because a 1,899-line append-only "live header" defeats its 30-second-answer purpose.
- When a performance outcome is structurally gated by its opportunity state, always match the player's comparison baseline to plate appearances where that outcome was actually available because an all-event baseline can manufacture residual distinctiveness from impossible opportunities rather than player performance (TRAIT-REALITY-1 REJECT audit: bases-empty PAs structurally inflated RBI Hero and suppressed RBI Zero).

Auto-capture pen for the Self-Improvement Loop (see CLAUDE.md). Rules here are
PROPOSALS, written the moment a JK correction happens (Write-First), in the form
"When [situation], always [action] because [reason]." They are NOT yet in force.

- **Derive semantic data from mechanics, never from intuition (JK correction
  2026-07-02, taxonomy session):** When designing any new canonical data table
  whose values ascribe MEANING to existing game entities (personality valence,
  archetype viability, trait polarity groupings…), always derive the values from
  how those entities actually FUNCTION in the live engines (morale, relationships,
  development, trait adaptation) and cite the file:line evidence in the design —
  never propose the table from domain intuition, because the engines already
  encode the ground truth and an intuited table silently forks it (the
  personality-valence proposal was built from baseball vibes while the morale
  matrix, relationship formation, and development engines held the real answer).
  Corollary from the same session: before extending ANY enum-like set, verify the
  canonical membership against the generation pools + game reference — persisted
  unions can carry legacy pollution (the Personality/Chemistry crossover).

Promotion: JK says "ratify [item]" → the rule moves up into the non-negotiable
rules above and is struck from this pen. No agent promotes its own rule, and no
agent edits the ratified rules without JK. (JK ruling 2026-06-14.)

- **Batched browser verification (JK directive 2026-06-14 — refines the
  non-negotiable Browser Verification Gate above):** When a verified-complete
  ticket has a user-visible surface, BATCH its JK browser sign-off into a later
  dedicated browser-test session rather than blocking the build plan inline,
  PROVIDED: (a) the per-ticket ENGINEERING audit (independent rerun: build/tsc/
  suite, seam/correctness checks, golden byte-unchanged, falsification) still runs
  and PASSES — that gate is never deferred; (b) the browser scenario is logged in
  CURRENT_STATE "BROWSER-VERIFY OUTSTANDING" (the batch backlog); (c) no downstream
  ticket has a hard correctness/build dependency on the deferred result — the
  Captain HALTS and flags to JK the moment one arises; (d) PERSISTENCE / saved-
  data-shape tickets are PRIORITIZED in the batch (a deferred data-corruption
  discovery is costlier than a visual one); (e) the batch CLEARS before the
  D0 / flag-flip / iPad-playtest gate (F-141). Tickets stay "verified-complete,
  browser-pending" — NOT "closed." Browser sign-off remains the SOLE real-world
  acceptance gate: batched, never waived. Rationale: separates the per-ticket
  engineering gate (non-deferrable) from the human experience gate (batchable) so
  JK's time is spent efficiently without weakening either.

- **Two-worktree contract grounding (self-caught WAVE 73, RB-9a fix1):** When
  contracting a Codex build for the **`codex/mode1-v1` worktree** (`/Users/johnkruse/Projects/kbl-mode1`),
  always EMBED the operative spec text INLINE in the contract and scope any
  "STOP-IF anchor mismatch" rule to **`src/…` CODE anchors only**, because the
  ratified docs (`AUCTION_DRAFT_SPEC_V2.md`, `AUCTION_REBUILD_PLAN.md`, the
  ledger) live on the **docs branch `codex/franchise-v1-next`** and are ABSENT
  from the mode1 worktree — a contract that tells Codex to verify a docs-branch
  spec file:line will (correctly) trip Codex's anchor-mismatch STOP-IF and burn a
  dispatch with zero file changes. The Captain grounds the spec; Codex verifies
  only the code it edits. (RB-9a dispatch #1 BLOCKED on exactly this; fix1 embedded
  §3.5 inline + scoped the STOP-IF → re-dispatch.)

- **Reconcile against git, not just the docs, for "how much is left" (JK correction
  2026-06-26):** When JK asks how much work remains or how close to a milestone (e.g.
  v1), always reconcile the spec/queue docs against the ACTUAL GIT STATE — all
  branches, recent commits, AND `git worktree list` — before answering, because
  parallel sessions/worktrees produce un-merged or superseding work the planning docs
  do NOT track. JK said "check all branches and recent commits"; the doc-only count
  had missed 3 un-merged streams (Lane-C ratings + the `draft-pipeline-fix` and
  `auction-draft-ux-rehaul` redesigns) that `V1_BUILD_QUEUE.md` didn't reflect, two of
  which SUPERSEDE queue items. Corollary: before declaring two lanes "safe concurrent,"
  PROVE the file-surface partition from the real diffs ([[kbl-two-lane-concurrent-build]]).

- **Full-cadence scoping for narrative systems (JK correction 2026-06-16):** When asked to
  "settle the cadence" of the reporter / any narrative system, always certify and settle the
  FULL cadence surface — per-game recap, per-EVENT takes (trade / call-up / send-down /
  morale-flashpoint / designation-flip / firing / random-event / relationship-flare),
  per-CHECKPOINT (ratings shift + race standings, every 20% of games), PRE-ACTION intel
  (§24.5 pre-move heads-up, §24.7 charged matchup), and the season-ARC summary — NOT just the
  in-game beats, because the season-long narrative is the soul anchor and the in-game cadence
  is the small part; scoping "cadence" to in-game beats silently drops the most important half.
  (Origin: the REP-1 ruling settled only the in-game/post-game cadence; JK flagged that the
  season-long narrative cadence — how the reporter tells the morale / relationship / race story
  between games — was never addressed.)

- **AUTH-4 / unattended-overnight mode (JK directive 2026-06-16):** For an UNATTENDED / OVERNIGHT
  run, the operative authorization lives in `AUTONOMOUS_RUN_PROTOCOL.md` (AUTH-4) and the live
  CURRENT_STATE header. In that mode the Captain KEEPS ROLLING and makes EVERY call — engineering
  AND spec-bounded DESIGN, incl. the SMB4-asset soul-layer engines and value-design forks — by
  building to the ratified spec + rulings, taking a DOCUMENTED conservative default where the spec
  is silent, and CONTINUING. This deliberately SUPERSEDES, for the overnight run only, the
  per-change SMB4 Asset Protection gate above AND the per-ticket design-greenlight; JK reviews
  everything in the morning via `AUTONOMOUS_RUN_LOG.md`. The run NEVER stops for JK — the only pause
  is SET-ASIDE-AND-CONTINUE on a genuine SAFETY wall (golden/oracle byte-change or frozen-value-
  oracle touch · data-corruption/migration/saved-shape risk · a regression 2 fix-iterations can't
  clear · a runaway loop), after which the loop moves to the next independent ticket. (When JK is
  PRESENT/attended, the normal SMB4-asset gate + surface-the-fork rules apply; AUTH-4 is the
  unattended exception JK switches on.) **Start-of-session waiver:** under AUTH-4 the session-start
  "John confirms or corrects before any work starts" gate is PRE-SATISFIED (AUTH-4 is the standing
  go) — a fresh overnight thread does the required reads, RESTATES the state, then PROCEEDS
  immediately without waiting for confirmation.

- **Soul-layer measurement comes from spec verbatim, never inference (JK correction 2026-06-18):** When
  specifying HOW a soul-layer metric is MEASURED — the reality signal/proxy AND the personality modifier for
  a trait, the formula for a morale/fame/clutch input, etc. — always extract the exact measurement from the
  authoritative spec verbatim, and if it is not fully/consistently specified there, SURFACE the gap for a JK
  ruling; never infer, approximate, or back-fill the measurement from the engine's current behavior or first
  principles. Because JK's design intent for the soul layer is more specific than the code's current behavior
  or any plausible inference, and a plausible-but-wrong measurement silently corrupts how the asset is earned
  (you don't find out until playtest). (Origin: in the L9b trait rebuild the Captain proposed inferred
  outcome-proxies + a personality-primary model for the count-family traits twice; JK caught both —
  "are we sure these are fully specced? i remember personality modifiers" / "this isn't fully reflective of
  the revised spec; we need to be 100% certain of how we are measuring these." The per-trait measurement was
  in fact scattered across 4 sources and underspecified — FINDING-150 follow-up.)

- **Ratified-section-wins + purge-on-supersede (JK correction 2026-06-18, R-E kickoff):** When the
  authoritative spec is internally inconsistent — a newer RATIFIED decisions layer (e.g. §0) sitting over
  older un-updated tables (e.g. §B/§C/§D) — always treat the ratified/latest ruling as authoritative AND
  immediately flag and purge the superseded text; never read the stale table and present its framing as
  the measurement. AND: when JK ratifies a decision that supersedes existing spec text, DELETE/rewrite the
  superseded text IN THE SAME PASS (fold the ruling into the per-trait/per-item rows) — do not leave a thin
  decisions layer over contradictory tables. Because an un-purged superseded layer is the exact mechanism by
  which a ratified decision gets lost on the next fresh read. (Origin: at R-E kickoff the Captain re-surfaced
  "personality-primary (no data proxy)" for Big/Little Hack + the count-family from the stale
  `TRAIT_MEASUREMENT_SPEC.md` §C/§D rows, losing JK's ratified §0.2 HR-AVG/walks-allowed data proxies — the
  3rd recurrence of the soul-layer inference pattern, this time from reading the stale HALF of a
  self-contradictory spec rather than from raw inference.)

- **No personality-only soul-layer metrics (JK ruling 2026-06-18 — product canon, also a build guard):**
  No earnable trait (and by extension no soul-layer metric that must be COMPARED to peers) may be driven by
  personality ALONE in v1. Every one must have a documented performance/data/ratings proxy, with personality
  as influence on top; a metric with no proxy is left dormant/out, never personality-only. Because a
  proxy-less metric cannot be put on the same comparison currency (P / percentile) as the performance-based,
  personality-influenced ones — so it can never be ranked or displaced fairly. (Origin: JK at R-E kickoff,
  correcting a personality-primary-only framing the Captain proposed for the count-family/Big-Little-Hack.)

- **Codex is the default builder; hand off via the contract on stdin, never a subagent-by-default or a duplicate prompt
  file (JK correction 2026-06-18):** When a meaningful KBL build is ready to hand off, always route it to **Codex** (the
  `AI_TEAM_OPERATING_MODEL.md` Default-Routing builder) — dispatched by pointing `codex exec` at the contract section in
  `spec-docs/PROMPT_CONTRACTS.md` via **stdin** (heredoc/pipe, NEVER a shell-arg) — and never duplicate the contract into
  a temp prompt file. Because (a) Codex-built + Opus-audited preserves cross-MODEL decorrelation — a Claude subagent
  builder shares the Opus auditor's blind spots, so the triangle's SEPARATION still holds but its DIVERSITY (the whole
  point of the second pair of eyes) is lost; (b) stdin sidesteps the backtick/`$` shell-arg corruption that was the ONLY
  real reason the L10-4 → PRE-ACT-TRAITS-1 stretch (12 consecutive tickets, all 2026-06-18) retreated to in-session
  subagents — a fixable plumbing bug, not a Codex limitation; (c) a duplicate full-prompt file is a second source of
  truth, forbidden by the operating model's "What To Avoid." The in-session subagent is the fallback ONLY when Codex is
  genuinely unavailable. (Origin: the Captain auto-defaulted this L10-Q5Q8 build to a subagent, then to a /tmp prompt
  duplicate; JK caught both and pointed at `AI_TEAM_OPERATING_MODEL.md`.)

- **Surface ambiguous measurement phrasings, don't pick a reading (JK correction 2026-06-19, extends the soul-layer
  no-inference rule to award/value metrics):** When a spec measurement/formula is phrased ambiguously — e.g.
  `max(currentTV − own running season-low)` can mean EITHER "the current gap from the season trough" OR "the max rise above
  the running minimum at any checkpoint" — always SURFACE the interpretation fork for a JK ruling BEFORE baking it into a
  build contract, for ANY earnable/award/value metric (not only the soul-layer traits). Because the spec phrasing can be
  misread and a plausible-but-wrong measurement silently corrupts how the asset/award is earned, and it is only caught if
  JK happens to be watching the dispatch. (Origin: the Captain read the Comeback-Player score as max-rise-over-checkpoints
  and was about to dispatch the L12-2 build; JK caught it pre-dispatch — the award must measure the CURRENT gap so a player
  who peaks mid-season then falls apart does NOT win. DECISIONS_LOG 2026-06-19 "L12-Q7 Comeback measurement CLARIFIED".)

- **Wiring-refactor audits must grep the FULL retired-API surface, not just the headline renames (Captain self-NFL
  2026-06-22, RB-2b-2):** When auditing a refactor that RETIRES an old API in favor of a new one (and especially a
  build-then-wire split where the new functions exist alongside the old), the "no consumer still calls the old API"
  verification grep must enumerate EVERY function on the retired path — including same-shape siblings that are easy to
  overlook because they were not renamed in the obvious way. Because a consumer left on one un-grepped old function
  silently keeps the OLD behavior live while build+tests stay green (the old code is valid), so the new behavior is
  DEAD and the gate passes anyway. (Origin: RB-2b-2 wired the auction NOMINATION path to `surfaceNextPlayer` but left
  both hooks' RESOLVE path on `evaluateResolve`/`passLoneSurvivor`; the audit grep covered only
  `nominatePlayer|rotateNomination|getCurrentNominator|resolveCpuNomination` and missed the resolve pair, so the
  one-chance permanent-out + the forced-filler were dead behind a green gate — caught on a disprove-the-claim re-check
  before the next ticket. Build the grep from the full delete-list, and prefer enumerating retired functions in the
  contract's STOP-IF.)

- **v1 status reads = current code vs `ROADMAP_TO_V1.md` + recent breadcrumbs ONLY; never feed pre-June-10 docs (JK correction 2026-06-22):** When assessing "what's done / what's left to v1," always anchor on `spec-docs/ROADMAP_TO_V1.md` (the evidence-backed, commit/file:line-grounded roadmap) compared against CURRENT code, then follow breadcrumbs to features added in the last few days (recent commits + the live ledgers `PARALLEL_LANE_LOG.md` / `AUTONOMOUS_RUN_LOG.md` + recently-touched specs). Do NOT pull pre-~June-10 docs (gap-analyses, audit syntheses, completion-roadmap predecessors, UX-redesign gap docs) into a v1 status read — they describe SUPERSEDED or ABANDONED targets and inject large amounts of noise (e.g. measuring code against an un-adopted GameTracker redesign spec → a phantom "83% gaps"). Because the freshest evidence-backed roadmap already folds the durable history, and stale docs cause false blockers + waste JK's review time. (Origin: a v1 breakdown that went back to 2026-03-15 / 05-27 / 06-09 docs and reported GameTracker as the "weakest pillar, ~83% gaps" — when Elimination Mode + the GameTracker UI are in fact fully built; the gap doc was code-vs-a-proposed-redesign, never adopted.)

- **Never report a background Codex dispatch as "working normally" without checking elapsed time; bound the wait (JK correction 2026-06-25 — "you're hallucinating"):** When a `codex exec` build is dispatched `run_in_background` and the plan is to wait for the harness completion notification, ALWAYS (a) attach a shell-native self-kill watchdog so the job CANNOT run unbounded (macOS has no `timeout`), and (b) before stating any status to JK, check the process's actual `etime` (`ps -o etime -p <pid>`) AND whether output/files have advanced — never assert "it's still thinking, this is normal" from nothing. Because a HUNG Codex produces no completion event and therefore no notification, so passive waiting can silently burn hours; the Captain told JK a dispatch was "the normal thinking-before-typing phase" when it had in fact been hung for 2h7m with zero output and zero files written — an unverified assertion (the exact anti-hallucination failure). A correct status read = real `etime` + real output-delta, and a re-dispatch must be watchdog-bounded so the next hang is caught in minutes, not hours. (Extends the existing [codex-dispatch-watchdog] mechanism memory from "have a watchdog" to "actually bound + actively verify, never passively assume.")

## Lessons 2026-07-07 (the lineage-reunification episode — ratified, not pending)

On 2026-07-07 the repo was discovered to have forked into two incompatible "trunks": the real v1 work
(soul layer, freeze, L-SIM, ~1,194 commits of history) lived only on local branches nobody had pushed,
while GitHub `main` sat frozen at 2026-05-21 and a second agent, working from GitHub only, built a new
parallel line on top of that stale base and presented it as the established arc. JK ruled the old trunk
the product, published it as `main`, archived the GitHub-only line at
`archive/draft-economy-2026-07-07`, and ported the GitHub line's genuinely new economy work onto the
real `main`. These four lessons are the process fix, effective immediately:

- **Merged ≠ routed — verify what RENDERS, not what exists in the tree:** When assessing whether a UI
  surface is live or canonical, never trust that a branch merge or a component's presence in the tree
  means it's what users see — always walk the live router in a real browser and record what actually
  renders. Because a component can be fully merged onto trunk and still be dead: the polished
  FranchiseLens hub was merged into trunk, but `/franchise/:id` kept routing to the old `FranchiseHome`
  while the new hub sat unrouted at `/__preview/franchise-lens` — every "[UI] DONE" status in
  `V1_BUILD_STATUS.md` §3 meant "exists in tree," not "is what renders," until the `UI_TRUTH_MAP.md`
  browser walk proved it route by route.

- **A handoff's story about repo state is unverified until git/browser-proven:** When a session handoff
  or a fresh agent's summary asserts what branch is canonical, what's merged, or what a feature does,
  never adopt that story at face value — reconcile it against actual git commands (`git log`,
  `git merge-base --is-ancestor`, `gh pr list`) and, for UI claims, a real browser walk, before building
  on it. Because a GitHub-only agent inherited a handoff that presented a parallel, six-week-stale line
  as "the established arc," complete with rules that contradicted JK's standing rulings (no luxury tax,
  no reserve prices) — and a second agent compounded it by treating that handoff's account as ground
  truth without re-verifying against the real trunk.

- **Sim measurement gates economics changes, browser gates UI changes:** When proposing or landing a
  change to draft/auction economics (pool sizing, reserve prices, curve-quota pulls, cap math), the
  acceptance gate is the sim harness's measured numbers (histogram + budget curves), never a
  plausibility argument — and when proposing or landing a change to what a user sees or clicks, the
  acceptance gate is a same-session real browser walk, never a code read. Do not substitute one gate for
  the other: an economics change that "looks right" in code is unproven until the sim harness measures
  it; a UI change that builds clean is unproven until it's seen rendering.

- **Two sources of truth = the root cause of the July fork — one published main, always:** Never let a
  second, undeclared "true" trunk or status doc coexist with the published one — every session works
  from ONE pushed, protected `main` and ONE in-place-updated status SOT (`V1_BUILD_STATUS.md`), and any
  doc that would compete with it gets a superseded banner immediately, not eventually. Because the
  entire July fork happened exactly this way: v1 work lived on local branches nobody pushed, the SOT
  went stale the day after an assembly landed, and a GitHub-only agent rebuilt "the truth" from a
  six-week-old snapshot — producing two incompatible universes that took a full remediation day to
  reconcile.

### Pending cleanup (not a rule — a tracked repo action)
- **spec-assembler duplicate:** two divergent copies exist —
  `.claude/skills/spec-assembler/SKILL.md` (511 lines, CANONICAL per JK
  2026-06-14) and `spec-docs/skills/spec-assembler/SKILL.md` (176 lines, stale).
  The Codex mirror correctly uses the canonical copy. ACTION: delete or rename
  the 176-line spec-docs copy to end the name collision, then grep the four
  docs that reference `spec-docs/skills/spec-assembler` (GAMETRACKER_REDESIGN_
  PIPELINE, PHASE2_HANDOFF, SCOPE_LOCK_IMPLEMENTATION_REFERENCE,
  GAMETRACKER_SCOPE_LOCK_WORKING) and repoint if needed. JK does the deletion.
  (`spec-simplifier` also dupes across both sources but is byte-identical —
  harmless, optional dedup.)

- When a lane changes any seeded draw, grep ALL test directories for golden fixtures/pinned hashes derived from that engine's outputs (src/**/tests AND src/**/__tests__), not just the engine's own suite — a stale second pin in src/utils/tests/ survived WT-B's focused gates and only the full merged-tree suite caught it (2026-07-08).
