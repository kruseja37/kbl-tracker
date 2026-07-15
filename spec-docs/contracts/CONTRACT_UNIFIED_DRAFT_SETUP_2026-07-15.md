# CONTRACT — Unified Auction / Snake draft setup (2026-07-15)

## Authority and scope

Draft method is a room rule, not a second source of player or club truth. Auction
and Snake must consume the same League Builder choices for source leagues,
Career/Peak/Draft player versions, hand-added or removed players, and each club's
MLB/farm archetypes. Snake-only seat, order, seed, simultaneous-seating proof,
and one-version lock remain Snake controls.

The Help-button law remains canon: instructions stay behind Help; live state,
choices, blockers, and consequences stay visible. JK's browser walk is the only
acceptance gate, and builder and auditor remain different agents.

## Required outcomes

1. Draft Setup exposes AUCTION/SNAKE as a saved draft-method choice. A user does
   not leave Draft Setup for League Settings merely to change the room method.
2. Switching method preserves the league's pool membership, source leagues,
   player cards, values, team identities, and boards. It changes routing and
   method-only controls, not shared inputs.
3. Snake Setup exposes the same source-league chooser and manual pool shuttle as
   Auction Setup before pool lock.
4. Snake Setup exposes the same `ArchetypePicker` authority for every club's MLB
   and farm identities. The chosen MLB identity is the one frozen into that
   club's private Snake seat and tax/fit math.
5. Career, Peak, and Draft cards from any selected source league remain grouped
   by stable historical identity; exactly one version enters the locked Snake
   pool. Unlock restores only the versions retired by that current lock. A card
   the GM explicitly removes after unlock cannot return on a later cycle.
6. Existing saved or completed drafts continue to freeze draft-method, identity,
   and pool mutations.

## Verification

- Component tests prove method persistence and mutation lock.
- Snake setup tests prove source leagues, manual pool controls, club identity
  controls, and grouped version choice coexist on the unified route.
- Focused Draft Setup, Snake adapter, typecheck, and production build gates.
- Independent auditor review and live UI crawl before JK's browser walk.

## Final evidence

The shared setup route, method freeze, source/player/archetype controls, and
two-cycle version ledger regression are green inside the 23-file / 370-test
builder gate. Independent frozen-tree audit: APPROVE with zero findings. JK's
browser walk remains the sole product-acceptance gate.
