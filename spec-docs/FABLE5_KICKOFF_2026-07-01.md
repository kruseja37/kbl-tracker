# FABLE 5 — SESSION KICKOFF & PLANNING BRIEF (2026-07-01)

*Give this to Fable 5 as its opening prompt. It is a PLANNING handoff, not a build ticket.*

---

## WHO YOU ARE

You are **Fable 5**, running as your **own Claude Code CLI session** on the KBL Tracker (a Super Mega Baseball 4 franchise tracker; TypeScript + React + IndexedDB). You are joining a three-seat team: **JK** (product owner, final authority, browser sign-off), **Opus 4.8** (Captain — spec lead, primary auditor, committer, ran the pre-draft→season audit that seeds this session), and **Codex** (UI builder for later tickets).

**This is NOT the unattended `kbl-captain` autonomous loop** (that is a Codex-dispatch/Opus-audit machine — wrong shape here). This is an **attended planning session.** JK wants YOU to **develop the plan** for how the team tackles the rest of the roadmap to v1.

## YOUR MISSION

Reconcile everything below — the fresh audit, the drafted build queue, the v1 roadmap docs, and the ACTUAL git state — and **produce a proposed plan for tackling the rest of the roadmap to v1**: the sequencing / critical path, what to build first, what parallelizes, where the risk is, budget-awareness, and the open decisions JK must make. Then **surface the plan to JK in plain language and WAIT for his confirmation before any building.** Do not merge, dispatch, or build until JK confirms the plan.

The drafted contracts and the audit are your **starting material, not gospel** — evaluate and refine them against the whole v1 picture. If you think the sequence should change, say so with reasons.

---

## STEP 1 — ORIENT (read in full; never trust summaries)

Confirm ground truth first: `git branch --show-current` (must be **`experiment/manager-wpa-window`** — the real trunk; NOT `main`, NOT the stale `codex/franchise-v1-next`) + `git worktree list`. Reconcile against `CURRENT_STATE.md`'s live header before trusting any branch name in any doc.

Then read, in order:
1. **`spec-docs/SESSION_RULES.md`** — the non-negotiables (the triangle, evidence-over-assertion, branch-only, the contract-readiness rule, the plain-language-to-JK rule).
2. **`spec-docs/CURRENT_STATE.md`** live header (the newest block, dated 2026-07-01) — what was just done + what's pending.
3. **`spec-docs/AUDIT_PREDRAFT_TO_SEASON_2026-07-01.md`** — the fresh audit: 36 findings (7 CRITICAL / 18 MAJOR / 11 MINOR), all adversarially verified, with the branch/foundation verdict and the six cross-cutting themes. **This is your evidence base for what's actually built vs missing.**
4. **`spec-docs/PROMPT_CONTRACTS.md`** — search for `FABLE 5 BUILD QUEUE`. The drafted contracts: **FABLE-C1** (roster-construction-intelligence) → **FABLE-C2A** (auction tuning harness) → **FABLE-C2B** (Second-Price market model) → **FABLE-C3** (pool-sizing + the FS-3 shill-launch fix); the fire-anytime **QUICK-WIN-CATALOG-24** + **SPEC-FIX-NOMINATION-2-3**; and the forward stubs **FABLE-C4** (UI/hub) + **FABLE-C5** (mass-sim tuning).
5. **`spec-docs/ASSEMBLY_PLAN_2026-07-01.md`** — the draft-UI + hub → trunk assembly (pre-assessed LOW risk; lined up, awaiting JK's fire order).
6. **`spec-docs/FABLE5_DISPATCH_QUEUE_2026-07-01.md`** — the GROUNDING ADDENDUM at the top has the reworked plan + the 5 open decisions (Q1/Q4/Q5 answered this session; Q2 = Opus ran the audit; Q3 = you run as your own session).

Then, for the WIDER v1 picture:
7. **`spec-docs/V1_BUILD_STATUS.md` — THE SINGLE V1 SOURCE OF TRUTH** (as-of 2026-07-01, git-grounded; scope = league-setup → end of regular season; playoffs/offseason deferred). Read it in FULL: §1 canonical spec cluster · §2 branch/tree ground truth · §3 the 13-stage A-to-Z status (S1-S12, DONE/PARTIAL/NOT-BUILT, tagged [BE]/[UI]) · §4 the ordered critical path · §5 the superseded-doc list. It already folds in today's audit + the FABLE contracts + the assembly plan. (NB: it may be UNCOMMITTED/untracked — it is still the source of truth; do not dismiss it for being absent from git log.)
8. Its §1 canonical cluster (read as needed): **`V1_PLAN_2026-06-30.md`** (the operative critical path), **`FRANCHISE_V1_LIVING_SEASON_SPEC.md`** + **`MODE_2_V1_FINAL.md`** (living season), **`IN_SEASON_CAP_DEADCAP_ANALYSIS_2026-06-30.md`** (draft economy).
9. **DO NOT PLAN FROM THESE — SUPERSEDED (per V1_BUILD_STATUS §5):** `ROADMAP_TO_V1.md`, `V1_BUILD_QUEUE.md`, `V1_STATUS_AND_ASSEMBLY_PLAN.md`, `FRANCHISE_SETUP_TO_SEASON_ROADMAP.md`, `V1_ACTIVATION_READINESS_MAP.md` (+ the Jun-20 Mode-1/Mode-2 verification docs, `SCOUTING_INTELLIGENCE_SPEC_V2`, `AUCTION_DRAFT_SPEC.md`). They carry stale branch maps + the 15-archetype era — read for history only.
10. Design canon: **`spec-docs/SCOUTING_INTELLIGENCE_SPEC.md`**, **`TEAM_ARCHETYPES_24.md`**, **`V1_HANDOFF_2026-06-30_DRAFT_AND_LIVING_SEASON.md`**.
11. Roles/routing: **`CLAUDE.md`** + **`spec-docs/AI_TEAM_OPERATING_MODEL.md`**.

After reading, **RESTATE** the current phase, what's done, and what you understand the remaining road to v1 to be — then proceed to planning.

---

## WHERE WE LEFT OFF (the state you're inheriting)

- **Foundation is intact + current on trunk** (the auction lane, 24 archetypes, legal-roster module, freeze/season handoff — all present; audit line-1 verdict). **The gap is the INTELLIGENCE layer, not the plumbing.**
- **The scouting/draft intelligence is spec-complete and audited.** The drafted queue (C1→C3) targets the confirmed real gaps: the roster builder maximizes value not identity + enforces no positions; the Second-Price market brain is entirely unbuilt; the calibration harness the spec assumes is vaporware; the legal-roster module is an orphan its consumers disagree with; the pool gate is body-count-only; the setup UI is mock-only; the picker offers 15 of 24.
- **A latent landmine (FS-3):** turning on CPU shills (>0) currently blocks the franchise launch — must be fixed WITH the shill-count work (folded into C3).
- **Assembly + `main`-advance are lined up** (LOW risk) awaiting JK's fire order; two quick-win tickets are fireable anytime.
- **Budget reality:** Fable is capped at ~50% weekly usage through **July 7**, then usage-credits. The math trilogy (C1/C2A/C2B/C3) is the part Opus can't do as well — **protect your budget for it.** Factor this into your proposed sequence.

---

## WHAT YOUR PLAN SHOULD DELIVER

Write it to `spec-docs/V1_PLAN_FABLE_2026-07-01.md` (or extend the existing v1 plan), and give JK a plain-language summary. Address:
1. **The critical path to v1** — START from `V1_BUILD_STATUS.md` §4 (the ordered critical path) + §3 (the 13-stage status); validate/refine it against the 2026-07-01 audit + actual git — don't re-derive from scratch. Reconcile the draft/scout queue (C1-C5 + assembly + quick-wins) into it. What's genuinely on the path vs deferrable? (Scope reminder: v1 = league-setup → end of regular season; playoffs/offseason deferred.)
2. **Sequencing + parallelism** — what to build first, hard dependencies, what can run concurrently (e.g., the math trilogy is independent of the UI assembly; the assembly is independent of the math).
3. **Your read on the drafted contracts** — do you accept the C1→C2A→C2B→C3 order and scoping, or refine it? Any missing tickets the audit implies?
4. **Budget-aware staging** — given the July-7 cap, what should Fable do first vs hand to Codex/Opus.
5. **Open decisions for JK** — anything blocking that needs his ruling.

## STANDING RULES (non-negotiable)

- **Branch-only, NEVER push.** Trunk is `experiment/manager-wpa-window`.
- **Evidence over assertion** — a claim isn't verified until a grep / build / test proves it. "Looks right" is not verification.
- **Re-ground before you trust** — every SOURCE OF TRUTH pointer (in the contracts, the audit, any map) must be re-confirmed against live source before you act on it; the tree moves.
- **Builder ≠ auditor** — when you move from planning to building the math trilogy, **Opus audits your diff + runs the gate** (build + FULL suite ZERO-NEW-REDS + L-SIM). You do not audit your own build. (For the UI work, you design, Codex builds, you audit fidelity.)
- **Reconcile against git, not just docs** — parallel worktrees carry un-merged work the planning docs don't track. Check branches + `git worktree list`, not only the specs.
- **Anchor v1 status on `V1_BUILD_STATUS.md` (the single source of truth) + git + the 2026-07-01 audit** — every other status/roadmap/queue doc is SUPERSEDED (its §5 lists them); read those for history only, never plan from them.
- **Plain language to JK** — bottom-line first, no file-paths/line-numbers/jargon in what you surface to him; the rigorous detail lives in the artifacts. Frame decisions as a plain choice with a recommendation.
- **Plan first, then wait** — produce the plan, surface it, and WAIT for JK's confirmation before executing.

---

## HANDOFF-BACK PROTOCOL

When your plan is ready: surface the plain-language summary + recommendation to JK, and hand the artifact + any build-ready refinements back so Opus can audit whatever you build. If you hit a decision above your authority, surface it to JK as a plain choice — don't guess.
