# SCOPE LOCK IMPLEMENTATION — Prompt Reference

See spec-docs/skills/ for the full prompts.
Download SCOPE_LOCK_IMPLEMENTATION_PROMPTS.md from Claude outputs for the 4-batch execution plan.

Batch A: Rulings #1, #2 — Recording API contract (eventId return + error base)
Batch B: Ruling #3 — BetweenPlayEvent persistence (5 categories)
Batch C: Rulings #4, #5, #7 — Targeted fixes (runner highlight, innings scaling, pitcher chooser)
Batch D: Rulings #6, #9, #10 — End-game pipeline (WAR, fan morale, park factors)

Route: Codex 5.3 | very high (Batches A, B, D) or high (Batch C)
Order: A → B → C → D (A changes the API surface that B and D consume)
Gate: npm run build + JK browser verification between each batch
