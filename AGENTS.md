# AGENTS.md

This repository keeps its canonical agent instructions in [CLAUDE.md](./CLAUDE.md).
This file is the Codex bridge, not a second source of truth.

## Required startup

When operating in this repo:

1. Read and follow `CLAUDE.md` first.
2. Read `spec-docs/AI_TEAM_OPERATING_MODEL.md` before multi-agent build, audit, or handoff work.
3. Treat references to "Claude Code" as applying to Codex when Codex is the acting agent.
4. Follow the session-start and session-end documentation rules in `CLAUDE.md` and `spec-docs/SESSION_RULES.md`.
5. Do not duplicate long-lived instructions here. Update `CLAUDE.md` or the relevant `spec-docs/` file instead.

## Codex-specific repo setup

- Repo-scoped Codex skills live in `.agents/skills/`.
- Claude skills live in `.claude/skills/` and `spec-docs/skills/` (both
  canonical sources). `.agents/skills/` is a DERIVED copy-based mirror —
  never edit it by hand. Run `scripts/sync-codex-skills.sh` after any skill
  change made outside a Claude Code session (the auto-sync hook only fires
  inside Claude Code).
- Codex MCP config lives in `.codex/config.toml`.
- Claude MCP config lives in `.mcp.json`.
- `codex-ideation` skill: Claude may consult Codex as a back-and-forth peer
  reviewer (read-only) via `scripts/codex.py`. This is a thinking aid, not an
  audit of record — the builder/auditor triangle still governs who audits.
- Active app code is under `src/src_figma/`; do not treat `src/components/GameTracker/` as the live GameTracker unless fresh routing evidence proves otherwise.

## Review guidelines

- Preserve the builder/auditor triangle: the agent that wrote a change does not audit its own diff.
- Focus review findings on real correctness, data-integrity, UX-flow, persistence, and regression risk.
- Cite file paths and line numbers for every finding.
- For KBL Tracker, "looks right" is not evidence. Prefer build output, focused tests, greps, browser verification, or cited code/spec traces.
