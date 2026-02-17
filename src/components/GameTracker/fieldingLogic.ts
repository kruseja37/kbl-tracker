import type {
  AssistChainEntry,
  AssistType,
  Direction,
  PlayType,
  SpecialPlayType,
  Position,
  AtBatResult,
} from '../../types/game';

const POS_MAP: Record<string, Position> = {
  '1': 'P',
  '2': 'C',
  '3': '1B',
  '4': '2B',
  '5': '3B',
  '6': 'SS',
  '7': 'LF',
  '8': 'CF',
  '9': 'RF',
};

const assistTypeForPosition = (posNum: string): AssistType => {
  if (['7', '8', '9'].includes(posNum)) {
    return 'outfield';
  }
  return 'infield';
};

export const buildAssistChainFromDpType = (dpType: string | null): AssistChainEntry[] => {
  if (!dpType) return [];
  if (dpType === 'Other') return [];
  if (dpType.includes('DP')) return [];

  const parts = dpType.split('-');
  if (parts.length < 2) return [];

  return parts.slice(0, -1).map((num) => (POS_MAP[num] ? {
    position: POS_MAP[num],
    assistType: assistTypeForPosition(num),
  } : null)).filter((entry): entry is AssistChainEntry => Boolean(entry));
};

export const sanitizeAssistChain = (
  chain: AssistChainEntry[],
  primaryFielder: Position | null
): AssistChainEntry[] => {
  const seen = new Set<string>();
  return chain.filter(entry => {
    if (primaryFielder && entry.position === primaryFielder) return false;
    if (seen.has(entry.position)) return false;
    seen.add(entry.position);
    return true;
  });
};

export const getPutoutPositionFromDpType = (dpType: string | null): Position => {
  if (!dpType || dpType === 'Other' || dpType.includes('DP')) {
    return '1B';
  }

  const parts = dpType.split('-');
  const last = parts[parts.length - 1];
  return POS_MAP[last] ?? '1B';
};

export const getDefaultDpType = (direction: Direction | null): string | null => {
  if (!direction) return null;
  const DP_CHAINS: Partial<Record<Direction, string>> = {
    'Left': '5-4-3',
    'Left-Center': '6-4-3',
    'Center': '6-4-3',
    'Right-Center': '4-6-3',
    'Right': '3-6-3',
  };
  return DP_CHAINS[direction] ?? null;
};

export const mapPlayTypeToSpecialPlay = (
  playType: PlayType,
  result: AtBatResult
): SpecialPlayType => {
  if (result === 'HR') {
    if (playType === 'wall') return 'Robbery Attempt';
    return 'Over Fence';
  }

  if (['1B', '2B', '3B'].includes(result)) {
    switch (playType) {
      case 'diving':
        return 'Diving';
      case 'leaping':
        return 'Leaping';
      case 'wall':
      case 'over_shoulder':
        return 'Robbery Attempt';
      default:
        return 'Clean';
    }
  }

  switch (playType) {
    case 'routine':
      return 'Routine';
    case 'diving':
      return 'Diving';
    case 'leaping':
      return 'Leaping';
    case 'wall':
      return 'Wall Catch';
    case 'over_shoulder':
      return 'Robbery Attempt';
    case 'charging':
    case 'running':
    case 'sliding':
      return 'Running';
    default:
      return 'Routine';
  }
};
