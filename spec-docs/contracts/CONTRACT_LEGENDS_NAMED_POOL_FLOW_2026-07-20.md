# CONTRACT: LEGENDS NAMED POOL FLOW

**Date:** 2026-07-20
**Thread:** SNAKE_DRAFT
**Finding:** FINDING-253

## Product defect

The three Legends libraries contain 835 cards for 345 people. Draft Setup treated each card as a
separate person while it shaped a named pool. It also required the complete 835-card source shelf to
pass the identity certificate before it shaped Tight, Competitive, or Loose. A rich source shelf can
fail that source-relative proof even when its 132-person child is a legal, balanced four-team pool.
The page then widened to Full Sources, stayed unresolved, and could not Lock.

## Frozen law

1. Career, Draft, and Peak remain separate selectable source libraries. Full Sources contains every
   selected card after hand edits and hard keeps.
2. One person supplies one unit of draft capacity. Career, Draft, and Peak cards with the same
   version-group id count once in named pool size, role supply, and curve selection.
3. A normal named build selects one card for each selected person. A GM can still keep more than one
   version by a direct hand edit. The live draft continues to retire all sibling versions when one
   version is drafted.
4. Build order is: shape the requested named pool, prove that exact finished membership, then try
   wider named presets only if required. Full Sources is the final fallback, and it is accepted only
   if its own exact proof passes.
5. Full Sources proof is not a prerequisite for a named pool. The source shelf is input, not the
   roster that clubs must draft.
6. The independent simultaneous proof remains the only SUCCESS authority. It checks legal roster
   shape, identity, value, salary, tax, and one-person capacity against the exact final pool.
7. Lock remains fail-closed. It requires the accepted current source content, clubs, identities,
   mode, preset, pool membership, hand edits, seed, and generation choice. A session-only label for
   engine-generated rows is not a product input and cannot make an unchanged receipt stale.
8. Four-team and eight-team rooms use the same rule. No league, room, club, Legend, or identity gets
   a special case.
9. Method text stays behind the ratified Help control. JK's browser walk remains the product gate.

## Required proof

- Exact Legends source: 835 cards and 345 people.
- Four clubs: Loose is 132 cards for 132 people, meets the balanced distribution limits, and passes
  the independent final validator.
- Eight clubs: Loose is 264 cards for 264 people, meets the balanced distribution limits, and passes
  the independent final validator.
- All 24 selectable identities pass in three eight-club Legends-only rooms.
- Alternate-card unit tests prove one-person sizing and protected sibling behavior.
- Protected sibling cards count once in position floors, curve quotas, curve caps, and diagnostics.
- Draft Setup tests prove shape-first certification, named auto-widen, honest unresolved state,
  exact receipt acceptance, stale-build rejection, cancellation, and no forced Full Sources load.
- The generic exact-versus-bounded scheduler certifies all 24 identities in the safe four-club,
  440-person workload while larger workloads remain bounded and independently validated.
- TypeScript, changed-file ESLint, production build, diff integrity, and a separate non-builder audit.

No merge or production promotion is authorized by this contract.
