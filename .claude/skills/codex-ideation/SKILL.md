---
name: codex-ideation
description: Use Codex CLI as a back-and-forth peer-review and ideation partner — a second model with different blind spots — not a one-shot formatter. Trigger when JK asks to "ideate with Codex", "get Codex's take", "peer-review this with Codex", "have Codex push back on this", or when a plan/spec/contract/diff would benefit from an adversarial second opinion before it goes to JK. Different model, different misses.
---

# codex-ideation

Use Codex CLI (GPT-5.5) as a peer reviewer that Claude argues *with*, iterating
until the disagreement is sharp or the direction is strong enough that both
agents would defend it against their own critique. JK arbitrates intent, taste,
and what actually ships.

## When to use this

- A plan, spec amendment, prompt contract, or design ruling is high-stakes
  enough to want a second model's adversarial read before JK sees it.
- Claude has a draft and its own reasoning, and wants it stress-tested by a
  model with different training and blind spots.
- JK explicitly asks for Codex's take or a peer-review loop.

## When NOT to use this

- Routine builds with a ratified contract — that's the normal Codex *builder*
  flow (a contract handed off per AI_TEAM_OPERATING_MODEL.md), not ideation.
- Anything where Codex would be the auditor of its own build — the triangle
  still holds. Peer ideation is a thinking aid, not an audit of record.
- Trivial questions a single model answers fine. Don't burn a loop on them.

## How to run it

The wrapper is `scripts/codex.py` (in this skill's `scripts/` dir; it resolves
the repo root itself).

**Open a session** — lead with full context, the goal, the draft/idea, and
Claude's own reasoning. Treat Codex as a peer who needs the same context a
smart colleague would:

```
python3 .claude/skills/codex-ideation/scripts/codex.py "CONTEXT: <what we're doing and why>. GOAL: <the decision to reach>. MY DRAFT: <the proposal>. MY REASONING: <why I lean this way>. Push back where you disagree."
```

For a long brief, write it to a file and pass `--read`:

```
python3 .claude/skills/codex-ideation/scripts/codex.py --read /tmp/brief.md
```

**Follow up conversationally** — respond to what Codex actually said; don't
restart with a new structured prompt each turn:

```
python3 .claude/skills/codex-ideation/scripts/codex.py --reply "On your point about X — I'd counter that <...>. But you're right about Y, so <...>."
```

**Reset** the session flag if a thread is stale or you want a clean start:

```
python3 .claude/skills/codex-ideation/scripts/codex.py --reset
```

## How to behave in the loop

- **Codex is a peer, not a tool.** Open with context, goal, ideas, reasoning —
  not a bare question.
- **Follow up conversationally**, reacting to Codex's actual points, not firing
  fresh structured prompts.
- **Iterate until** both agents would defend the result against their own
  critique, OR the disagreement is clear enough to hand JK a crisp either/or.
- **Surface the loop to JK.** When reporting back, summarize the exchange turn
  by turn: where Codex pushed, where Claude conceded or held, and the residual
  disagreement. JK arbitrates intent and taste.
- **Never let Codex's output silently become the answer.** A peer opinion
  informs Claude's recommendation; it does not replace JK's ruling, and it is
  not an audit of record under the triangle.

## Mechanics / gotchas

- Read-only sandbox (`-s read-only`): Codex can read the repo to ground its
  review but cannot modify files in this mode.
- stdin is closed (`input=""`) so Codex never hangs waiting for more input.
- The wrapper marks a live session via `Temp/.codex_active`; `--reply` resumes
  it. If resume fails (stale/expired), the wrapper starts a fresh session
  rather than erroring.
- Binary discovery: `$CODEX_BIN` → PATH → common install dirs → VS Code
  extension. If Codex isn't found, the wrapper fails with a clear message
  telling you to set `CODEX_BIN` — set it to the full path of your `codex`
  binary if it lives somewhere non-standard.
