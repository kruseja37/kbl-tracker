export type AuctionAdvisorMoment = 'pre-draft' | 'post-lot' | 'draft-recap';

export interface AuctionAdvisorFactPayload {
  moment: AuctionAdvisorMoment;
  cacheKey: string;
  draftId: string;
  seatTeamId: string;
  title: string;
  facts: readonly string[];
  allowedNames: readonly string[];
  knownEntityNames?: readonly string[];
  verdict?: string;
  fallback: string;
}

export interface AdvisorTargetFact {
  rank: number;
  playerId: string;
  playerName: string;
}

export interface PreDraftAdvisorFactsInput {
  draftId: string;
  seatTeamId: string;
  seatTeamName: string;
  identityName: string;
  poolPositionCounts: readonly { position: string; count: number }[];
  topTargets: readonly AdvisorTargetFact[];
  scarcePositions: readonly { position: string; available: number; required: number }[];
  knownEntityNames?: readonly string[];
}

export type PostLotSignificance = 'seat-won-top-five' | 'rival-won-top-five' | 'top-three-left';

export interface PostLotAdvisorFactsInput {
  draftId: string;
  lotId: string;
  seatTeamId: string;
  seatTeamName: string;
  target: AdvisorTargetFact;
  disposition: 'SOLD' | 'PASSED' | 'SET_ASIDE';
  winnerTeamId: string | null;
  winnerTeamName: string | null;
  salary: number | null;
  leftBoard: boolean;
  knownEntityNames?: readonly string[];
}

export interface DraftRecapAdvisorFactsInput {
  draftId: string;
  seatTeamId: string;
  seatTeamName: string;
  seatsFilled: number;
  seatTarget: number;
  spend: number;
  startingBudget: number;
  taxBill: number;
  landedTargets: readonly string[];
  lostTargets: readonly string[];
  knownEntityNames?: readonly string[];
}

export interface ValidatedAdvisorText {
  text: string;
  source: 'llm' | 'template';
  rejected: boolean;
}

function money(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function targetLine(targets: readonly AdvisorTargetFact[]): string {
  if (targets.length === 0) return 'No explicit board targets were saved.';
  return `Top board targets: ${targets.map((target) => `#${target.rank} ${target.playerName}`).join(', ')}.`;
}

export function buildPreDraftAdvisorFacts(input: PreDraftAdvisorFactsInput): AuctionAdvisorFactPayload {
  const counts = input.poolPositionCounts.length > 0
    ? `Pool counts: ${input.poolPositionCounts.map((row) => `${row.position} ${row.count}`).join(', ')}.`
    : 'Pool counts are unavailable.';
  const scarcity = input.scarcePositions.length > 0
    ? `Scarce positions: ${input.scarcePositions.map((row) => `${row.position} ${row.available} available for ${row.required} required`).join(', ')}.`
    : 'No position is sitting at its legal supply floor.';
  const targets = targetLine(input.topTargets);
  const facts = [
    `Club: ${input.seatTeamName}.`,
    `Identity: ${input.identityName}.`,
    counts,
    targets,
    scarcity,
  ];
  const watch = input.scarcePositions[0];
  const fallback = watch
    ? `${input.seatTeamName} brief: ${input.identityName}. ${watch.position} is thin at ${watch.available} for ${watch.required}; keep your top board targets in reach.`
    : `${input.seatTeamName} brief: ${input.identityName}. The pool clears its legal position floors; work from your saved board.`;

  return {
    moment: 'pre-draft',
    cacheKey: `${input.draftId}:${input.seatTeamId}:pre-draft`,
    draftId: input.draftId,
    seatTeamId: input.seatTeamId,
    title: 'PRE-DRAFT BRIEF',
    facts,
    allowedNames: unique([
      input.seatTeamName,
      input.identityName,
      ...input.topTargets.map((target) => target.playerName),
    ]),
    knownEntityNames: input.knownEntityNames,
    fallback,
  };
}

export function classifyPostLotSignificance(input: PostLotAdvisorFactsInput): PostLotSignificance | null {
  if (input.disposition === 'SOLD' && input.winnerTeamId === input.seatTeamId && input.target.rank <= 5) {
    return 'seat-won-top-five';
  }
  if (
    input.disposition === 'SOLD'
    && input.winnerTeamId !== null
    && input.winnerTeamId !== input.seatTeamId
    && input.target.rank <= 5
  ) {
    return 'rival-won-top-five';
  }
  if (input.leftBoard && input.target.rank <= 3) return 'top-three-left';
  return null;
}

export function buildPostLotAdvisorFacts(input: PostLotAdvisorFactsInput): AuctionAdvisorFactPayload | null {
  const significance = classifyPostLotSignificance(input);
  if (!significance) return null;

  const result = input.disposition === 'SOLD'
    ? `${input.target.playerName} sold to ${input.winnerTeamName ?? 'Unknown club'}${input.salary === null ? '' : ` for ${money(input.salary)}`}.`
    : `${input.target.playerName} left the board without a sale.`;
  const facts = [
    `Club: ${input.seatTeamName}.`,
    `Board target: #${input.target.rank} ${input.target.playerName}.`,
    `Result: ${result}`,
    `Significance: ${significance}.`,
  ];
  const fallback = significance === 'seat-won-top-five'
    ? `${input.seatTeamName}: We landed ${input.target.playerName}, your #${input.target.rank} target${input.salary === null ? '' : `, for ${money(input.salary)}`}.`
    : significance === 'rival-won-top-five'
      ? `${input.seatTeamName}: ${input.winnerTeamName ?? 'A rival'} landed ${input.target.playerName}, your #${input.target.rank} target${input.salary === null ? '' : `, for ${money(input.salary)}`}.`
      : `${input.seatTeamName}: ${input.target.playerName}, your #${input.target.rank} target, is off the board.`;

  return {
    moment: 'post-lot',
    cacheKey: `${input.draftId}:${input.seatTeamId}:post-lot:${input.lotId}`,
    draftId: input.draftId,
    seatTeamId: input.seatTeamId,
    title: 'POST-LOT REACTION',
    facts,
    allowedNames: unique([
      input.seatTeamName,
      input.target.playerName,
      input.winnerTeamName ?? '',
    ]),
    knownEntityNames: input.knownEntityNames,
    verdict: significance,
    fallback,
  };
}

export function gradeDraftRecap(input: Pick<DraftRecapAdvisorFactsInput, 'seatsFilled' | 'seatTarget' | 'landedTargets' | 'lostTargets'>): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (input.seatsFilled < input.seatTarget) return 'F';
  const targetCount = input.landedTargets.length + input.lostTargets.length;
  if (targetCount === 0) return 'C';
  const landedShare = input.landedTargets.length / targetCount;
  if (landedShare >= 0.8) return 'A';
  if (landedShare >= 0.6) return 'B';
  if (landedShare >= 0.4) return 'C';
  if (input.landedTargets.length > 0) return 'D';
  return 'F';
}

export function buildDraftRecapAdvisorFacts(input: DraftRecapAdvisorFactsInput): AuctionAdvisorFactPayload {
  const grade = gradeDraftRecap(input);
  const landed = input.landedTargets.length > 0 ? input.landedTargets.join(', ') : 'none';
  const lost = input.lostTargets.length > 0 ? input.lostTargets.join(', ') : 'none';
  const facts = [
    `Club: ${input.seatTeamName}.`,
    `Seats filled: ${input.seatsFilled} of ${input.seatTarget}.`,
    `Spend: ${money(input.spend)} of ${money(input.startingBudget)}.`,
    `Tax bill: ${money(input.taxBill)}.`,
    `Top targets landed: ${landed}.`,
    `Top targets lost: ${lost}.`,
    `Grade: ${grade}.`,
  ];

  return {
    moment: 'draft-recap',
    cacheKey: `${input.draftId}:${input.seatTeamId}:draft-recap`,
    draftId: input.draftId,
    seatTeamId: input.seatTeamId,
    title: 'DRAFT RECAP',
    facts,
    allowedNames: unique([
      input.seatTeamName,
      ...input.landedTargets,
      ...input.lostTargets,
    ]),
    knownEntityNames: input.knownEntityNames,
    verdict: `Grade ${grade}`,
    fallback: `${input.seatTeamName} recap — Grade ${grade}. Filled ${input.seatsFilled} of ${input.seatTarget}, spent ${money(input.spend)} of ${money(input.startingBudget)}, and owes ${money(input.taxBill)} tax. Targets landed: ${landed}. Targets lost: ${lost}.`,
  };
}

const CARDINAL_NUMBER_WORDS = new Set([
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
  'nineteen', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety',
  'hundred', 'thousand', 'million', 'billion', 'trillion', 'grand', 'dozen',
]);

const ORDINAL_NUMBER_WORDS = new Set([
  'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
  'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth',
  'eighteenth', 'nineteenth', 'twentieth', 'thirtieth', 'fortieth', 'fiftieth', 'sixtieth',
  'seventieth', 'eightieth', 'ninetieth', 'hundredth', 'thousandth', 'millionth',
  'billionth', 'trillionth',
]);

const SENTENCE_INITIAL_COMMON_WORDS = new Set([
  'a', 'an', 'the', 'this', 'that', 'these', 'those', 'we', 'you', 'your', 'our', 'it', 'there',
  'keep', 'stay', 'trust', 'let', 'watch', 'remember', 'expect', 'take', 'give', 'work', 'hold',
  'be', 'do', 'never',
]);

const BASEBALL_COMMON_NOUNS = new Set([
  'ace', 'baseball', 'board', 'bullpen', 'catcher', 'club', 'draft', 'infield', 'lineup',
  'outfield', 'pitcher', 'player', 'pool', 'roster', 'rotation', 'shortstop', 'slugger', 'target',
  'team',
]);

const EVALUATIVE_TERMS = [
  'steal-of-the-draft', 'all-time', 'best', 'worst', 'greatest', 'elite', 'steal', 'bargain',
  'robbery', 'fleeced', 'flawless', 'perfect', 'historic', 'legendary', 'generational',
  'dominant', 'exceptional', 'outstanding', 'phenomenal', 'incredible', 'amazing', 'terrible',
  'disastrous',
] as const;

function words(text: string): string[] {
  return text.toLocaleLowerCase().match(/[a-z]+/g) ?? [];
}

function containsForbiddenNumber(text: string, payload: AuctionAdvisorFactPayload): boolean {
  if (/\d/u.test(text) || /\p{Sc}/u.test(text)) return true;

  const factWords = new Set(words(payload.facts.join('\n')));
  return words(text).some((word) => {
    if (CARDINAL_NUMBER_WORDS.has(word)) return true;
    return ORDINAL_NUMBER_WORDS.has(word) && !factWords.has(word);
  });
}

function containsUnknownKnownEntity(text: string, payload: AuctionAdvisorFactPayload): boolean {
  const lower = text.toLocaleLowerCase();
  const allowed = new Set(payload.allowedNames.map((name) => name.toLocaleLowerCase()));
  return (payload.knownEntityNames ?? []).some((name) => {
    const normalized = name.trim().toLocaleLowerCase();
    return normalized && lower.includes(normalized) && !allowed.has(normalized);
  });
}

function containsInventedCapitalizedName(text: string, payload: AuctionAdvisorFactPayload): boolean {
  const factTokens = new Set(words(payload.facts.join('\n')));
  const candidatePattern = /\b[A-Z][A-Za-z'’-]*\b/g;

  for (const match of text.matchAll(candidatePattern)) {
    const candidate = match[0].toLocaleLowerCase();
    if (factTokens.has(candidate) || BASEBALL_COMMON_NOUNS.has(candidate)) continue;

    const index = match.index ?? 0;
    const sentenceInitial = index === 0 || /[.!?]\s*$/.test(text.slice(0, index));
    if (sentenceInitial && SENTENCE_INITIAL_COMMON_WORDS.has(candidate)) continue;
    return true;
  }
  return false;
}

function containsForbiddenVerdictLanguage(text: string, payload: AuctionAdvisorFactPayload): boolean {
  if (/\bgrade\s+[A-F](?:[+-])?\b/iu.test(text)) return true;
  if (/\b[A-F](?:[+-])?[-\s]?tier\b/iu.test(text)) return true;
  if (/\b(?:an?|the)\s+[A-F](?:[+-])?\b/iu.test(text)) return true;

  const lowerText = text.toLocaleLowerCase();
  const lowerFacts = payload.facts.join('\n').toLocaleLowerCase();
  return EVALUATIVE_TERMS.some((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, 'u');
    return pattern.test(lowerText) && !pattern.test(lowerFacts);
  });
}

export function validateAuctionAdvisorText(text: string, payload: AuctionAdvisorFactPayload): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  if (containsForbiddenNumber(trimmed, payload)) return false;
  if (containsUnknownKnownEntity(trimmed, payload)) return false;
  if (containsInventedCapitalizedName(trimmed, payload)) return false;
  if (containsForbiddenVerdictLanguage(trimmed, payload)) return false;
  return true;
}

export function renderValidatedAuctionAdvisorText(
  text: string,
  payload: AuctionAdvisorFactPayload,
): ValidatedAdvisorText {
  if (!validateAuctionAdvisorText(text, payload)) {
    return { text: payload.fallback, source: 'template', rejected: true };
  }
  return { text: text.trim(), source: 'llm', rejected: false };
}
