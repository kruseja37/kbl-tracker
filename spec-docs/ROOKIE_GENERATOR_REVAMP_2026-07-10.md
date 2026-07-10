# ROOKIE GENERATOR REVAMP — designed 2026-07-10, build DEFERRED (post-observer / Codex-solo lane)

**Origin:** JK directive 2026-07-10 — "rookies should be allowed to have two negative traits... we'll likely need to revamp the rookie generator algorithm to better suit our newfound wisdom, including ways of generating backstories and nicknames."
**Law inherited from the legends program:** /Users/johnkruse/Projects/kbl-historical-player-archetype-backlog spec-docs/HL_JK_CANON_2026-07-10.md (esp. §11.37 two-negatives, §12 narrative ledger, §13 nicknames, §10.40 nuance mandate) + HL_ADJUDICATION_CODEX REV A-C.

## 1. Immediate fix (can ride any tracker lane)
`prospectScoutingDraftEngine.ts:733` — `slot2Negative = !firstTraitNegative && ...` forbids two negatives on generated rookies. JK ruling: the game allows two; delete the `!firstTraitNegative` condition (keep opposite-pair legality). Same check at :1463's polarity chain — verify both roll sites treat polarity independently per slot.

## 2. The revamp (the real lane)
**Architecture: the generator writes STRUCTURED STORY SEEDS, never prose.** Seeds land in the same player-keyed narrative ledger the legends use (canon §12 — one store, Almanac reads it, living-season profile reads a slice, emergent events append). Beat reporters (the existing LLM seam) narrativize at read time; the 10% fibbing factor applies at read, never at write. Generation stays deterministic/seeded (crash-safe, no LLM dependency at gen time — the established reporter adapter/emission split).

Seed fields per generated player:
- **Origin**: hometown/region, path (HS / college / JUCO / international / indie-ball), signing story hook (one of a tagged set: late-bloomer, phenom, converted-position, family-legacy, workhorse-nobody-scouted…)
- **Nickname**: OCCASIONAL (scarcity is the flavor — most rookies ship without one; era/persona-consistent generation from a curated pool + rules, never per-player LLM at gen time)
- **Personality** (canonical 7) + hidden modifiers (existing system) — now narratively CONSISTENT with the origin/quirk tags (a Volatile phenom reads differently than a Volatile grinder)
- **Quirk/defining-tag**: 1-2 from a tagged vocabulary the reporters know how to expand
- **Relationship seeds**: optional (college teammates in the same class, a mentor edge to a veteran at the same position — feeds the rivalry/relationship engine's typed edges)
- **identity coherence rule**: traits + ratings + arsenal must tell ONE story (a soft-tosser rookie with Elite CH = a Moyer-shaped prospect, not a random stat bag) — reuse the legends Identity-Survival lens as a generation-time check, lightweight
- **Two-negative legality** per §1; trait assignment honors opposite-pairs and the archetype-shaped generation that exists today

## 3. Scope guards
- League-builder profile stays the editable surface (everything user-editable, canon Q2).
- Draft-room surfaces at most a one-line lore headline (canon §12.43); full story lives behind the Almanac.
- Legends personalities/modifiers/lore LOCK at draft (canon Q3 scramble guard) — generated rookies keep the randomize affordance.
- No changes to ratings/grade generation math in this lane — narrative + trait-polarity only.

## 4. Routing
Self-contained app-side lane; good Codex-solo build with sonnet audit, post-observer. Contract to be cut from this doc when scheduled.
