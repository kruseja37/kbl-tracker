# Draft Setup Source Pipeline Trace — 2026-07-20

## Product result

The active league is the draft-pool output. External leagues and system libraries are inputs. A
player can have both an external source assignment and an active target-pool assignment. Draft
Setup must read only the external assignment when it resolves source membership.

## Data path

1. **Entry:** League Builder loads every league and global player row.
2. **Source control:** `LeagueTemplate.sourceLeagueIds` stores external source league ids. An absent
   field selects every known external source. An explicit empty array selects none.
3. **Validation:** `resolveExternalDraftSourceLeagueIds` removes the active target id and ids that
   do not exist in the current source catalog.
4. **Membership:** `isPlayerInExternalDraftSourceUniverse` removes the active target assignment
   before it checks external assignments. The Unassigned Players switch is independent.
5. **Engine input:** Both Snake build modes receive the same target-aware `universePlayers` array.
6. **Output:** Build replaces active target-pool membership. `addPlayersToLeaguePool` writes target
   `FREE_AGENT` rows; `removePlayersFromLeaguePool` removes rows outside the accepted membership.
7. **Certificate:** The build fingerprint binds the exact source ids, source content, clubs,
   identities, mode, preset, membership, pins, and provenance. Lock accepts only that build.
8. **Reload:** Target-pool rows remain output. They do not change source counts or source selection.

## Removed failure loop

Before this correction, Draft Setup listed the active target as a source and counted every target
assignment as source membership. Build wrote target assignments. Reload then read those new output
rows as input. A target such as `test` could therefore report 835 source players, show all 835 in
the pool, and show zero available players even when the actual inputs were the three Legends
libraries.

## Authority boundaries

- External league/library assignment: source ownership.
- Active target assignment: draft-pool output.
- `sourceLeagueIds`: user source selection.
- Build fingerprint: accepted build truth.
- Registered pool: locked draft snapshot.

No import, player card, team roster, or Legends library record is rewritten by this correction.
