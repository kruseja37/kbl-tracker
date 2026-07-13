import { CHEMISTRY_CODE_TO_WORD, type ChemistryCode } from '../../../../../data/chemistryCanonical';
import type { LuxuryCapRow } from '../../../../../data/tierParams';
import {
  computeAuctionTeamProjectedTaxWithCaps,
  normalizeAuctionLuxuryCapsForLeagueSize,
} from '../../../../../engines/auctionLuxuryTax';
import type { ConstructionPlayer, TeamCapIdentity } from '../../../../../engines/leagueConstruction';
import type { SnakePlanBill } from '../../../../../engines/snakeEconomics';
import { chemistryAdviceForCandidate, chemistryProfileForPlayers } from '../../../../../utils/chemistryIntelligence';
import type { Player } from '../../../../../utils/leagueBuilderStorage';

export interface DraftMoneyLedger {
  rosterCount: number;
  salary: number | null;
  tax: number | null;
  allIn: number | null;
  moneyLeft: number | null;
}

export interface ChemistryStripRow {
  family: ChemistryCode;
  word: (typeof CHEMISTRY_CODE_TO_WORD)[ChemistryCode];
  count: number | null;
  tier: 'L1' | 'L2' | 'L3' | null;
}

export interface SelectedChemistryDelta {
  family: ChemistryCode;
  word: (typeof CHEMISTRY_CODE_TO_WORD)[ChemistryCode];
  before: number;
  after: number;
  crossing: 'L1->L2' | 'L2->L3' | null;
  premium: number;
}

export type FitTone = 'green' | 'yellow' | 'red' | 'unknown';

const DISPLAY_CHEMISTRY_ORDER: readonly ChemistryCode[] = ['CMP', 'SPI', 'CRA', 'SCH', 'DIS'];

export function buildPlanLedger(plan: SnakePlanBill): DraftMoneyLedger {
  return {
    rosterCount: plan.playerIds.length,
    salary: plan.planCost,
    tax: plan.planTax,
    allIn: plan.planCost + plan.planTax,
    moneyLeft: plan.planCushion,
  };
}

export function buildDraftedRosterLedger(input: {
  picks: readonly { playerId: string; settledSalary?: number }[];
  playersById: ReadonlyMap<string, { construction: ConstructionPlayer; player: Player }>;
  frozenIvById: ReadonlyMap<string, number>;
  budget: number;
  baseCaps: readonly LuxuryCapRow[];
  realTeamCount: number;
  capIdentity?: TeamCapIdentity;
}): DraftMoneyLedger {
  const prices = input.picks.map((pick) => pick.settledSalary ?? input.frozenIvById.get(pick.playerId));
  const salary = prices.every((price): price is number => Number.isFinite(price))
    ? prices.reduce((sum, price) => sum + price, 0)
    : null;
  const roster = input.picks.map((pick) => input.playersById.get(pick.playerId)?.construction);
  const constructionKnown = roster.every((player): player is ConstructionPlayer => Boolean(player));
  const tax = constructionKnown
    ? computeAuctionTeamProjectedTaxWithCaps(
        roster,
        null,
        input.capIdentity,
        normalizeAuctionLuxuryCapsForLeagueSize([...input.baseCaps], input.realTeamCount),
      )
    : null;
  const allIn = salary !== null && tax !== null ? salary + tax : null;
  return {
    rosterCount: input.picks.length,
    salary,
    tax,
    allIn,
    moneyLeft: allIn === null ? null : input.budget - allIn,
  };
}

export function buildChemistryStrip(players: readonly Player[] | null): ChemistryStripRow[] {
  const byFamily = new Map((players ? chemistryProfileForPlayers(players) : []).map((row) => [row.family, row]));
  return DISPLAY_CHEMISTRY_ORDER.map((family) => {
    const row = byFamily.get(family);
    return {
      family,
      word: CHEMISTRY_CODE_TO_WORD[family],
      count: players ? row?.count ?? 0 : null,
      tier: players ? row?.tier ?? 'L1' : null,
    };
  });
}

export function buildSelectedChemistryDelta(candidate: Player, rosterPlayers: readonly Player[]): SelectedChemistryDelta {
  const advice = chemistryAdviceForCandidate(candidate, rosterPlayers);
  return {
    family: advice.family,
    word: CHEMISTRY_CODE_TO_WORD[advice.family],
    before: advice.countsBefore[advice.family] ?? 0,
    after: advice.countsAfter[advice.family] ?? 0,
    crossing: advice.crossing === 'L1->L2' || advice.crossing === 'L2->L3' ? advice.crossing : null,
    premium: advice.premium,
  };
}

export function fitToneForWord(fitWord: string): FitTone {
  if (fitWord === 'STRONG FIT') return 'green';
  if (fitWord === 'SOLID FIT') return 'yellow';
  if (fitWord === 'WEAK FIT') return 'red';
  return 'unknown';
}
