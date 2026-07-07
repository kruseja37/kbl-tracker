/**
 * CHEM-POTENCY consumer adapters (JK ruling 4, 2026-07-02; design:
 * spec-docs/FABLE_CHEM_POTENCY_DESIGN_2026-07-02.md §4).
 *
 * One thin seam from the league-builder/franchise Player shape onto the shared chemistry
 * tipping-premium engine (chemistryTierValue). Consumers and their tickets:
 *  - AUCTION ADVICE (C4-B renders it): `chemistryAdviceForCandidate(lotPlayer, teamRosterPlayers)`
 *    — the "worth to YOU" premium beside the market read. Advice-only: the market-price
 *    prediction, CPU/shill bidding, and every economy number stay chemistry-free at L2.
 *  - IN-SEASON ANALYZER (wired after CODEX-ASSTGM-LEGALITY lands — same-file collision
 *    avoidance): `chemistryAdviceForCandidate` for call-ups, `chemistryRemovalAdvice` for
 *    send-downs (the call-up-replacement ripple the research spec flagged as unmodeled).
 *  - PRE-DRAFT / POOL PANELS: `chemistryProfileForPlayers` — family counts, tiers,
 *    distance-to-next-tier, trait supply.
 *
 * Privacy: these functions read chemistry + traits + ratings only — never personality and
 * never hiddenPersonalityModifiers, so the ruling-5 boundary holds by construction.
 */

import { buildSalaryIvInput } from '../engines/salaryCalculator';
import { toSalaryPlayer } from './leagueBuilderPoolRegistration';
import {
  chemistryRemovalImpact,
  chemistryTipPremium,
  rosterChemistryProfile,
  type ChemistryContextPlayer,
  type ChemistryRemovalBreakdown,
  type ChemistryTipBreakdown,
  type FamilyChemistryProfile,
} from '../engines/chemistryTierValue';
import type { Player } from './leagueBuilderStorage';

export function toChemistryContextPlayer(player: Player): ChemistryContextPlayer {
  return {
    chemistry: player.chemistry,
    traits: [player.trait1, player.trait2].filter(
      (trait): trait is string => typeof trait === 'string' && trait.length > 0,
    ),
    iv: buildSalaryIvInput(toSalaryPlayer(player)),
  };
}

/**
 * The tipping premium of adding `candidate` to a roster (dollars, IV currency).
 * `rosterPlayers` must EXCLUDE the candidate; pass the players the team actually holds
 * (auction: the team's won lots joined by playerId; analyzer: the MLB roster).
 */
export function chemistryAdviceForCandidate(
  candidate: Player,
  rosterPlayers: readonly Player[],
): ChemistryTipBreakdown {
  return chemistryTipPremium(
    toChemistryContextPlayer(candidate),
    rosterPlayers.map(toChemistryContextPlayer),
  );
}

/**
 * The team-side cost of removing `departing` (send-down / call-up replacement ripple).
 * `rosterPlayers` must INCLUDE the departing player.
 */
export function chemistryRemovalAdvice(
  departing: Player,
  rosterPlayers: readonly Player[],
): ChemistryRemovalBreakdown {
  const roster = rosterPlayers.map(toChemistryContextPlayer);
  const index = rosterPlayers.findIndex((player) => player.id === departing.id);
  const departingContext = index >= 0 ? roster[index] : toChemistryContextPlayer(departing);
  return chemistryRemovalImpact(departingContext, roster);
}

/** Per-family chemistry summary for a set of players (a roster or a whole pool). */
export function chemistryProfileForPlayers(
  players: readonly Player[],
): FamilyChemistryProfile[] {
  return rosterChemistryProfile(players.map(toChemistryContextPlayer));
}
