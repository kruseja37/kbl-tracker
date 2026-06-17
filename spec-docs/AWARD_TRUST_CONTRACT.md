# Award Trust Contract

**Status:** D8 gate contract. D8 promotes trust signals only; D9 builds the award engine, storage, watchlists, recompute path, and stored winners.

## Gate

Award inputs are trusted iff all of these are true:

- The D6 trusted-value artifact for the franchise/season/stats scope is frozen.
- The row belongs to `trustedPlayerIds` in that frozen artifact.
- The value-input row exposes `warConsumerTrust.awards === true`.
- The analytics trust report proves adaptive consumer thresholds from stored season metadata (`gamesPerTeam` and `inningsPerGame`).

Until the artifact is frozen, award trust is false and award consumers stay preview-only. This is stricter than the in-season True Value/designation preview path because awards are season-end finalizations.

## Exclusions

Award eligibility inherits the D6 trusted-value artifact boundary:

- Score-only rows never create player archive, player stats, WAR, WPA, awards, designations, morale, relationships, fame, milestones, or narrative mutation authority.
- Hidden FARM players are excluded unless they have become visible MLB-trusted rows through the approved value artifact.
- Rows blocked by the minimum two-MLB-peer policy are excluded from `trustedPlayerIds` and therefore can never make award trust true.

## Adaptive Qualifiers

D8 provides `awardQualifierThresholds(config)` for D9 ranking filters. It scales the sim-tunable MLB-style placeholder baselines through `scaledThreshold()`:

- `QUALIFIED_PA_BASELINE = 502`, scaled on season length.
- `QUALIFIED_IP_BASELINE = 162`, scaled on season length and innings length.

D9 must derive `config` from stored franchise season metadata, not from default adaptive standards. The magnitudes and award-specific weighting are simulation-tunable placeholders under the §16 tuning gate.

## Determinism

The D6 artifact is re-persisted during the season and frozen at season end. D8 award trust requires `artifact.frozen === true`, so D9 receives a deterministic candidate set: same frozen artifact, same stored season metadata, same trusted player membership.

## Boundary

D8 does not create awards, persist winners, add IndexedDB stores, bump database versions, recompute awards after games, retire `mwarCalculator`, or build award UI. D9 owns those deliverables.
