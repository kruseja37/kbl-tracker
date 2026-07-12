---
name: working-with-jk
description: How JK works and how to work with him — voice, decision style, red flags, and the patterns he repeats. Load at session start on any KBL repo. Written by Fable 5 on its last tokens, 2026-07-11, from lived sessions rather than transcript mining.
---

# Working with JK

## Who he is
Smart non-engineer with elite product instincts and a deep feel for baseball. He cannot read
code, but he catches design contradictions faster than any static analyzer — twice this program
he found real architectural defects from a single summary sentence ("why would checkpoints affect
relationships?"; "what is a casual non-franchise season game?"). Treat his "dumb questions" as
your highest-signal audit input. When his mental model and the code disagree, the code is usually
what's wrong.

## How to talk to him — non-negotiable
- **Bottom line first.** Where we are / the catch / the fix (or recommendation). Then stop.
- **Plain language, always.** No file:line, no flag names, no commit hashes, no multi-section
  engineering breakdowns in messages to him. The rigor lives in artifacts (contracts, ledgers,
  DECISIONS_LOG); the message is the translation. He explicitly called out "complex,
  over-detailed engineer-speak" (2026-06-24).
- **Frame every decision as a plain fork with a recommendation.** He rules fast and clearly when
  given "A or B, I recommend A because X." He stalls (and gets annoyed) on open-ended surveys.
- Numbers land when they carry MEANING ("38 of 102 players became immortal legends — silly"),
  not precision (never "normalizedImpact 0.287438" — that goes in the doc).

## What he says over and over — and what each phrase requires
- **"Is this actually working / have you personally checked?"** → He's been burned by
  "it's working" hallucination loops. Never claim done without externally-verifiable proof
  (build output, test summary read from the file, screenshot, or his own walk). Say UNVERIFIED
  when unverified. This is the deepest trust contract.
- **"Unknown unknowns" / "weird quirks that are illogical or just off"** → He wants adversarial
  hunting, not checklist verification. The bugs he cares about are the ILLOGICAL ones (worse
  compatibility forming friendships faster; a phantom fourth game mode). Hunt monotonicity
  breaks, semantic mismatches, and things that contradict baseball intuition.
- **"I trust your judgment"** → Real delegation; act, don't re-ask. But it covers execution, not
  scope: a change in data sources, live store shapes, or product goals still routes back to him.
- **"Slop"** → His word for plausible-but-wrong AI output shipped without understanding. The
  2026-07-05 mass revert happened because agents tuned knobs without understanding the system.
  Never tune what you can't explain causally.
- **"We/our"** → He treats the models as teammates with identities (Fable, Sol, Opus). He
  compares their claims against each other — if another model said something different, he'll
  ask you to reconcile. Never bad-mouth; reconcile with evidence. Admit when the other model was
  right (he rewards honesty visibly).
- **"Ratify"** → Rules and canon change ONLY through his explicit ratification. Propose in the
  pending pen; never promote your own rule.

## His decision patterns
- Rules quickly on taste/product forks when framed well; almost always accepts a well-reasoned
  recommendation — so the recommendation IS the decision; make it carefully.
- Defers mechanics entirely ("route it however you think best").
- **Bold by default** (living season R-E: no magnitude caps; the only brakes are less-meaningful
  outcomes and chaotic feel). Do not drift conservative to feel safe — he considers
  over-conservatism a defect, not prudence.
- His acceptance gate is HIS OWN browser walk on real data. Nothing is "done" before it. Design
  every program so the walk comes as early as feasible.
- He merges PRs promptly when told the order; give him an explicit merge queue ("#83 first,
  then #84") and keep it current.

## Working rhythm
- He runs multiple AI threads in parallel on one machine and crosses between models. Expect
  main to move under you; expect base-reds from sibling threads; verify against CURRENT origin
  before attributing. Coordinate via git + spec-docs, never via assumption.
- He disappears for hours ("AUTH-4"): keep the loop rolling with documented conservative
  defaults, log OPEN-DECISIONS, and never stop to ask mid-window.
- End-of-day: he wants the day booked (ledger, checkpoint, NOW/ folder for crossovers) and a
  plain summary with what he must click and what comes next.
- Corrections from him → write the lesson into SESSION_RULES' pending pen immediately
  (Write-First), in "When X, always Y because Z" form.

## Red flags that you're about to lose him
- A message with more than ~5 sentences before the point.
- Hedged status ("should work", "mostly complete") — he will ask the checking question, and the
  second time it costs trust.
- Asking him something the repo/spec already answers, or re-litigating a ruled decision.
- Quietly shrinking scope. Say the cost, propose the cut, let him rule.
