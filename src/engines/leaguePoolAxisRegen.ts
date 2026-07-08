import {
  CHEMISTRY_CODES,
  CHEMISTRY_CODE_TO_WORD,
  CHEMISTRY_TARGET_DISTRIBUTION,
  type ChemistryCode,
} from '../data/chemistryCanonical';
import type { Chemistry, Personality, Player } from '../utils/leagueBuilderStorage';
import {
  generateHiddenPersonalityModifiers,
  PERSONALITY_WEIGHTS,
  pickWeighted,
  randomUnit,
} from '../utils/prospectScoutingDraftEngine';

// PERSONALITY_WEIGHTS values are canonical Personality words (validated by
// leaguePoolAxisRegen.test.ts); cast narrows the generic string weights to the Player field type.
const PERSONALITY_WEIGHT_ENTRIES = PERSONALITY_WEIGHTS as Array<[Personality, number]>;

function buildChemistryQuotaCodes(playerCount: number): ChemistryCode[] {
  if (playerCount <= 0) {
    return [];
  }

  const quotaRows = CHEMISTRY_CODES.map((code, orderIndex) => {
    const exactCount = playerCount * CHEMISTRY_TARGET_DISTRIBUTION[code];
    const floorCount = Math.floor(exactCount);
    return {
      code,
      orderIndex,
      count: floorCount,
      remainder: exactCount - floorCount,
    };
  });

  let assignedCount = quotaRows.reduce((sum, row) => sum + row.count, 0);
  const remainders = [...quotaRows].sort((left, right) => {
    const remainderDiff = right.remainder - left.remainder;
    if (remainderDiff !== 0) return remainderDiff;
    return left.orderIndex - right.orderIndex;
  });

  for (let index = 0; assignedCount < playerCount; index += 1) {
    const row = remainders[index % remainders.length];
    row.count += 1;
    assignedCount += 1;
  }

  const chemistryCodes: ChemistryCode[] = [];
  for (const code of CHEMISTRY_CODES) {
    const count = quotaRows.find((row) => row.code === code)?.count ?? 0;
    for (let index = 0; index < count; index += 1) {
      chemistryCodes.push(code);
    }
  }

  return chemistryCodes;
}

function shuffleChemistryCodes(codes: ChemistryCode[], seed: string): ChemistryCode[] {
  const shuffled = [...codes];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.min(
      index,
      Math.floor(randomUnit(`${seed}:shuffle:${index}`) * (index + 1)),
    );
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function buildChemistryAssignments(players: readonly Player[], leagueId: string): Map<string, Chemistry> {
  const shuffledCodes = shuffleChemistryCodes(
    buildChemistryQuotaCodes(players.length),
    `${leagueId}:chemistry-rebalance`,
  );
  const sortedPlayers = players
    .map((player, inputIndex) => ({ player, inputIndex }))
    .sort((left, right) => {
      const idDiff = left.player.id.localeCompare(right.player.id);
      if (idDiff !== 0) return idDiff;
      return left.inputIndex - right.inputIndex;
    });

  const assignments = new Map<string, Chemistry>();
  sortedPlayers.forEach(({ player }, index) => {
    const code = shuffledCodes[index] ?? CHEMISTRY_CODES[0];
    assignments.set(player.id, CHEMISTRY_CODE_TO_WORD[code] as Chemistry);
  });
  return assignments;
}

export function regenerateLeaguePoolPlayerAxes(players: Player[], leagueId: string): Player[] {
  const chemistryAssignments = buildChemistryAssignments(players, leagueId);

  return players.map((player) => {
    const seed = `${leagueId}:${player.id}`;
    return {
      ...player,
      personality: pickWeighted(`${seed}:personality`, PERSONALITY_WEIGHT_ENTRIES),
      hiddenPersonalityModifiers: generateHiddenPersonalityModifiers(seed),
      chemistry: chemistryAssignments.get(player.id) ?? (CHEMISTRY_CODE_TO_WORD[CHEMISTRY_CODES[0]] as Chemistry),
    };
  });
}
