# AI Team Operating Model

**Created:** 2026-06-14
**Purpose:** Make JK, Claude Opus 4.8, and Codex work as one disciplined KBL Tracker build/audit team without losing the existing negative-feedback-loop culture.

This document supplements `CLAUDE.md` and `spec-docs/SESSION_RULES.md`. If there is a conflict, the stricter verification/documentation rule wins.

---

## Source Of Truth Stack

1. `CLAUDE.md` - canonical repo instructions for all agents.
2. `spec-docs/SESSION_RULES.md` - non-negotiable operating rules.
3. `spec-docs/CURRENT_STATE.md` - current product/build status and next task.
4. `spec-docs/SESSION_LOG.md` - historical handoff trail; read newest entries first when large.
5. `spec-docs/DECISIONS_LOG.md` - durable product and architecture decisions.
6. `spec-docs/PROMPT_CONTRACTS.md` - required location for builder and auditor contracts before handoff.
7. `AGENTS.md` - short Codex bridge into this stack.

Never let chat become the only record for a decision, contract, finding, or handoff.

---

## Roles

### JK - Product Owner / PM / Final Verifier

- Owns scope, taste, product rulings, and final acceptance.
- Performs or ratifies browser/manual verification when the app behavior matters.
- Decides when a protocol can be bent, deferred, or escalated.
- Names the next task when product sequencing is ambiguous.

### Claude Opus 4.8 - Captain / Spec Lead / Primary Auditor

- Reads the full source-of-truth stack at session start.
- Drafts and records prompt contracts before handoff.
- Runs architecture reasoning, scope reconciliation, and adversarial audit.
- Can fill the Fable-style audit role when Fable is unavailable, as long as it did not build the change.
- Must not audit its own implementation work.

### Codex - Builder / Repo Surgeon / Local Verifier

- Implements precise contracts quickly in the local repo.
- Runs focused verification, build checks, greps, and browser checks where appropriate.
- Can review or audit Claude-written plans/contracts/diffs when Codex did not write the change.
- Maintains docs when the task changes repo operating state.
- Must stop on ambiguity, unexpected file touch requirements, or scope expansion beyond the contract.

### The Triangle Rule

For any meaningful code or spec change:

1. One agent builds.
2. A different agent audits.
3. JK accepts or redirects.

The specific model can change. The separation cannot.

---

## Default Routing

Use this as the starting point; override only with a written reason.

| Work type | Builder | Auditor | JK role |
|---|---|---|---|
| Narrow code fix from an approved finding | Codex | Claude Opus 4.8 | Browser/product confirmation when visible |
| High-risk persistence, salary, WAR, IV, True Value, designation work | Codex with high/very high reasoning | Claude Opus 4.8 or Fable-style audit | Final ruling on edge cases |
| Spec/design session | Claude Opus 4.8 | Codex spot-checks evidence if needed | Answers rulings |
| Static codebase audit | Claude Opus 4.8 or Codex | Different agent if fixes follow | Confirms scope |
| Browser/user-flow verification | Codex pre-checks (Playwright) | Claude reviews report if high risk | **JK manual sign-off is the closing gate — required** |
| Contract drafting | Claude Opus 4.8 by default | Codex can sanity-check | Approves if policy/scope changes |

---

## Build Loop

1. Session opener reads the canonical session-start stack (SESSION_RULES →
   AUDIT_LOG → AUDIT_PLAN → SESSION_LOG → CURRENT_STATE live header), per
   SESSION_RULES.md and CLAUDE.md.
2. Confirm the current point: "Based on docs, we are at X. Next task is Y."
3. Draft the prompt contract in `spec-docs/PROMPT_CONTRACTS.md`.
4. Contract must include route, reasoning effort, exact allowed files, forbidden files, source of truth, verification, and stop conditions.
5. Builder implements only the contract.
6. Builder reports every changed path from `git status`, including test/mock/doc adjustments.
7. Builder runs focused verification and never declares complete without evidence.
8. Auditor reads the contract, diff, tests, and source of truth; then tries to disprove success.
9. Fixes run through a new or amended contract when the audit finds material issues.
10. Session closer updates `SESSION_LOG.md`, `CURRENT_STATE.md`, and any relevant findings/decision docs.

---

## Audit Loop

Audits are not vibe checks.

Every audit should answer:

- Did the change follow the contract?
- Did it touch any file outside the approved surface?
- Is the behavior actually wired into the live path?
- Are tests mutation-honest or merely compile-honest?
- Did the builder accidentally change fixtures, mocks, or UI copy that shifts behavior?
- Does the diff preserve SMB4-specific assets and KBL-specific design?
- Would a staff engineer approve the evidence?

Audit verdict format:

```md
VERDICT: VERIFIED | NOT VERIFIED | BLOCKED
Major findings: [count]
Minor findings: [count]
Verification run: [commands/results]
Mutation/adversarial checks: [what was falsified]
Residual risk: [what remains unproven]
```

---

## Parallel Work

Parallel work is allowed only when files and responsibilities are disjoint.

Rules:

- Closure commit or clean working-tree agreement before starting parallel builders.
- Each builder gets a narrow contract and focused verification.
- One captain/auditor runs the combined build/suite gate.
- Builders do not run the combined final gate for their own sibling work.
- If two tasks touch the same state, storage, engine, or UI surface, serialize them.

---

## Skills And Tooling

### Claude skills

Claude project skills live in `.claude/skills/`.

### Codex skills

Codex repo skills live in `.agents/skills/`. They should mirror high-value Claude skills by symlink where possible so the workflow stays single-source.

Important Codex/Claude shared triggers:

- `spec-ui-alignment` - spec/code/UI compliance audits.
- `franchise-engine-discovery` - franchise engine mapping before broad testing.
- `franchise-button-audit` - non-GameTracker UI action wiring.
- `data-pipeline-tracer` - data entry-to-display traces.
- `season-simulator` - accumulated season-state verification.
- `gametracker-logic-tester` - baseball state and outcome verification.
- `gametracker-systems-audit` - advanced GameTracker system wiring.
- `ui-flow-crawler` and `user-journey-verifier` - browser/user-flow checks.
- `batch-fix-protocol` and `gametracker-bug-repro` - disciplined fix execution.

### MCPs

- Claude MCP config: `.mcp.json`.
- Codex MCP config: `.codex/config.toml`.
- Playwright/browser verification should use the configured MCP/browser tooling when a visible flow changes.

---

## Current KBL Guardrails

As of 2026-06-14:

- Branch: `codex/franchise-v1-next`.
- Product next task remains `T6` after EP1 closure, unless JK redirects.
- Active GameTracker path: `src/src_figma/app/pages/GameTracker.tsx`.
- Active state hook: `src/src_figma/hooks/useGameState.ts`.
- Legacy GameTracker path `src/components/GameTracker/` is not live unless routing evidence changes.
- CLI verification must clear poisoned production env where noted: prefix Vitest-style runs with `NODE_ENV= ` when required by the current state docs.
- Characterized baseline failures/order-flakes are documented in `CURRENT_STATE.md`; do not silently relabel new failures as baseline.

---

## Handoff Templates

### Claude/JK to Codex builder

```md
ROUTE: Codex | [medium/high/very high]

GOAL:
[One clear build objective.]

SOURCE OF TRUTH:
[Finding/spec/ruling/contract refs.]

ALLOWED FILES:
[Exact paths.]

DO NOT TOUCH:
[Exact paths or surfaces.]

VERIFICATION:
[Focused tests, build, greps, browser checks.]

STOP IF:
[Ambiguity, unexpected file, source mismatch, failing precondition.]

REPORT:
1. Files changed, including every git-status path
2. What changed and why, with source refs
3. Exact verification output
4. BLOCKED or COMPLETE

Use high reasoning effort.
```

### Codex to Claude Opus 4.8 auditor

```md
ROUTE: Claude Opus 4.8 | Max / high reasoning

AUDIT TARGET:
[Commit/diff/working tree plus contract refs.]

AUDIT GOAL:
Try to disprove that the build satisfied the contract.

CHECKS:
- Contract compliance
- Live-path wiring
- Regression risk
- Persistence/data integrity
- Tests and mutation/adversarial probes
- Documentation completeness

OUTPUT:
VERIFIED, NOT VERIFIED, or BLOCKED, with major/minor findings and evidence.

Use high reasoning effort.
```

---

## What To Avoid

- Do not let both agents edit the same files simultaneously.
- Do not accept a build because it compiles.
- Do not let a builder audit itself.
- Do not create a second source of truth outside `CLAUDE.md` and `spec-docs/`.
- Do not route live GameTracker work to dead legacy paths.
- Do not end a session with undocumented findings, decisions, or next steps.
