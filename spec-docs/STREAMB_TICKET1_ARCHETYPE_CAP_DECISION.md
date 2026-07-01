# Stream-B Ticket #1 — Archetype→capIdentity converter: design decision + source grounding

> Authored 2026-06-27 by Claude Opus 4.8 (Lane B Captain), from a source-verified 6-agent grounding
> workflow + direct re-read. This is the authoritative grounding for the converter build.

## What this ticket is
Turn a chosen historical team archetype (e.g. *Murderers' Row* = +POW/+CON, −SPD) into the cap-shift the
auction/snake/tax engines actually spend against (`Team.capIdentity` / `Team.farmCapIdentity`), plus add
`mlbArchetypeKey`/`farmArchetypeKey` provenance to `Team`. Foundational unblocker for the archetype
picker, the setup write spine, and the Draft Setup hub.

## The make-or-break finding (verified from source)

### A. The plan's `PEN_ACC→PVEL` is a TYPO — correct is `PEN_ACC→PACC`
Two-hop bridge: `ARCHETYPE_STAT_LUX_KEY` (historicalArchetypes.ts:28-32) maps each `ArchetypeStat` to a
`group/stat` lux key; `MOD_STAT_TO_LUX` (leagueConstruction.ts:85-97) maps each `ModStat` to the same key.
`PEN_ACC`→`bullpen/ACC`→`PACC`. `PVEL` is `bullpen/VEL` = image of `PEN_VEL`. (Prefix `ROT_→R*`, `PEN_→P*`;
suffix VEL/JNK/ACC 1:1.) Verified full 11-stat table:
`POW→POW, CON→CON, SPD→SPD, FLD→FLD, ARM→ARM, ROT_VEL→RVEL, ROT_JNK→RJNK, ROT_ACC→RACC,
PEN_VEL→PVEL, PEN_JNK→PJNK, PEN_ACC→PACC`.

### B. The naive "mod-name" bridge is BROKEN for 8/15 archetypes (2 mathematically impossible)
`capIdentity.increase[]/decrease[]` hold **mod NAMES** validated against `CAP_MODIFICATION_FRACTIONS`
(tierParams.ts). The ONLY pure single-stat mod names are the 5 hitter stats. The pitching mod names
`'VEL'/'JNK'/'ACC'` each shift **BOTH rotation AND bullpen** (e.g. `'ACC'` sets RACC:0.307692 AND
PACC:0.424242). So mod names cannot separate rotation from bullpen. `hdh-royals` (+PEN_ACC, −ROT_ACC) and
`the-opener` (+bullpen, −rotation) need OPPOSITE directions on the same `'ACC'`/shared key → **impossible**
to express via increase/decrease. A naive build silently mis-tunes 8 archetypes and breaks the
**sim-balance guarantee** (the `archetypeBalanceSimulator` proves 15/15 in-band using a different path).

### C. The faithful fix (Design A — CHOSEN, conservative default)
The per-lux-key cap shift the balance sim trusts already exists: `archetypeCapShift(arch)` (hist:129-135)
→ `Record<"group/stat", fraction>`. Carry it as an OPTIONAL `rawShift?: Record<ModStat, number>` on the
identity; have `identityCapShift` **return it directly when present** (bypassing the lossy mod-name layer).
- ADDITIVE + OPTIONAL → no IndexedDB version bump (kbl-league-builder records are schemaless;
  `saveTeam` does `store.put(fullTeam)`).
- BEHAVIOR-PRESERVING: `rawShift` absent → `identityCapShift` runs exactly as before. Every existing
  band-priority / mod-name identity is untouched.
- `shiftLuxuryCaps` needs NO change — it consumes `identityCapShift`'s `Record<ModStat,number>`, so it
  inherits the faithful shift automatically. The pitching separation is restored because `shiftLuxuryCaps`
  already keys rotation vs bullpen lux rows to distinct ModStats (RVEL vs PVEL etc.).
- BUILD-DARK: nothing in the live flow calls the converter yet (the archetype picker is ticket #13), so
  blast radius on the running app is zero until that wiring lands.

Design B (force through mod names) was rejected: it cannot represent 2 archetypes at all and breaks balance.

## OPEN-DECISION for JK (logged; built on the conservative default, reversible)
Design A extends a LIVE, persisted type (`IdentityComposition`/`TeamCapIdentity` += optional `rawShift`)
and adds a short-circuit to a core function (`identityCapShift`). Per the button-up heuristic this is a
JK-fork-class change, but: (1) Design B is mathematically broken, so A is the only correct default; (2) the
change is additive + behavior-preserving + build-dark. **Built on the conservative default; the MATH is
correct regardless of JK's preference.** If JK later prefers a different carrier (e.g. a dedicated
archetype-caps field instead of `rawShift` on the identity), the converter's output shape changes but the
computed caps do not. Surface in plain language at the seam.

Secondary open item (does NOT block #1): `composeIdentity` (lC:167-185) is the band-priority sibling that
also targets `capIdentity` via mod names. Whether the archetype picker REPLACES or coexists with the
band-priority UI is a ticket-#13 wiring decision, not a converter decision.

## Build shape (what the contract specifies)
- `Team` (leagueBuilderStorage.ts:120-164) += `mlbArchetypeKey?: string` + `farmArchetypeKey?: string`
  (provenance; consumers still read `capIdentity`).
- `IdentityComposition` + `TeamCapIdentity` (leagueConstruction.ts:21-22) += `rawShift?: Record<ModStat, number>`.
- `identityCapShift` (lC:207-226): top guard `if (identity.rawShift) return { ...zeroAllModStats, ...identity.rawShift }`.
- export `luxKeyToModStat(luxKey: string): ModStat | undefined` from leagueConstruction (wraps private LUX_TO_MOD_STAT).
- NEW `src/engines/archetypeIdentity.ts`: `archetypeToCapIdentity(arch)` (pure) + `selectTeamArchetype(team, mlbKey, farmKey?)` (writes via saveTeam). Imports historicalArchetypes + leagueConstruction + leagueBuilderStorage — no cycle (leagueConstruction does NOT import historicalArchetypes).
- NEW `src/engines/__tests__/archetypeIdentity.test.ts` — see contract for the 6 mandatory assertions.

## Build outcome (2026-06-27) — SHIPPED to `claude/v1-draft-ui`
Built by Codex against contract `STREAMB-1A-ARCHETYPE-CAP`; audited by Captain (the real diff, not the
paste). One contract-spec bug caught + fixed: the mandatory "untouched ModStat ≈ 0" assertion originally
derived its touched-set from `boosts∪nerfs`, but the AUTHORITATIVE source is `arch.spec` keys — some
archetypes carry a minor spec entry not in the headline boosts (`big-red-machine` `POW: 0.5` → rawShift
`POW=0.025`). Codex correctly STOPPED on the contradiction (STOP-IF protocol) rather than guess; an
independent grounding agent confirmed the same `big-red-machine:POW` finding. The assertion is now
spec-driven (strictly stronger: every off-spec ModStat must be 0 AND every spec entry must match its
sign). Gate: build ✓; 8-file consumer suite 87/87 ✓ (incl. `historicalArchetypes` 15/15 in-band, no
regression); the-opener/hdh-royals opposite-direction fidelity ✓.

## Non-orphan proof (capIdentity is live-consumed)
`useAuctionDraft.ts:120`, `LeagueBuilderSnakeDraft.tsx:128-129,333-334`, `auctionLuxuryTax.ts:16-66`,
`LeagueBuilderTeams.tsx:539-720`. All call `shiftLuxuryCaps(caps, team.capIdentity)` → inherit the fix.
