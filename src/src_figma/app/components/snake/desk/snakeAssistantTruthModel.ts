import {
  CHEMISTRY_CODES,
  CHEMISTRY_CODE_TO_WORD,
  normalizeToChemistryCode,
  type ChemistryCode,
} from '../../../../../data/chemistryCanonical';
import { TRAIT_PRICING } from '../../../../../data/traitPricing';
import { derivedPotencyTier } from '../../../../../engines/derivedTraitPotency';
import type { SnakePlanBill } from '../../../../../engines/snakeEconomics';
import type { Player } from '../../../../../utils/leagueBuilderStorage';
import type { ChemistryStripRow, DraftMoneyLedger } from './draftTruthModel';

const DISPLAY_CHEMISTRY_ORDER: readonly ChemistryCode[] = ['CMP', 'SPI', 'CRA', 'SCH', 'DIS'];
const TRAIT_FAMILY = new Map<string, ChemistryCode>(
  TRAIT_PRICING.map((entry) => [entry.name, normalizeToChemistryCode(entry.chemistry)]),
);

/** Pure Assistant-worker ledger adapter. It deliberately has no browser persistence edge. */
export function buildAssistantPlanLedger(plan: SnakePlanBill): DraftMoneyLedger {
  return {
    rosterCount: plan.playerIds.length,
    salary: plan.planCost,
    tax: plan.planTax,
    allIn: plan.planCost + plan.planTax,
    moneyLeft: plan.planCushion,
  };
}

/**
 * Pure count/tier/trait summary for the Assistant worker. The richer candidate chemistry
 * advice remains on the main thread because it needs IV pricing; this strip does not.
 */
export function buildAssistantChemistryStrip(players: readonly Player[]): ChemistryStripRow[] {
  const playerCounts = new Map<ChemistryCode, number>(CHEMISTRY_CODES.map((family) => [family, 0]));
  const traitCounts = new Map<ChemistryCode, number>(CHEMISTRY_CODES.map((family) => [family, 0]));

  for (const player of players) {
    const family = normalizeToChemistryCode(player.chemistry);
    playerCounts.set(family, (playerCounts.get(family) ?? 0) + 1);
    for (const trait of [player.trait1, player.trait2]) {
      if (!trait) continue;
      const traitFamily = TRAIT_FAMILY.get(trait);
      if (!traitFamily) continue;
      traitCounts.set(traitFamily, (traitCounts.get(traitFamily) ?? 0) + 1);
    }
  }

  return DISPLAY_CHEMISTRY_ORDER.map((family) => {
    const count = playerCounts.get(family) ?? 0;
    return {
      family,
      word: CHEMISTRY_CODE_TO_WORD[family],
      count,
      traitCount: traitCounts.get(family) ?? 0,
      tier: derivedPotencyTier(count),
    };
  });
}
