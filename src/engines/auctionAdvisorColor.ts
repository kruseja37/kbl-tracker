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

function normalizedNumbers(text: string): string[] {
  return (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((value) => {
    const numeric = Number(value.replaceAll(',', ''));
    return Number.isFinite(numeric) ? String(numeric) : value.replaceAll(',', '');
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

function containsInventedTitleCaseName(text: string, payload: AuctionAdvisorFactPayload): boolean {
  const allowedText = payload.allowedNames.join('\n').toLocaleLowerCase();
  const candidates = text.match(/\b[A-Z][a-z]+(?:[ '-][A-Z][a-z]+)+\b/g) ?? [];
  return candidates.some((candidate) => !allowedText.includes(candidate.toLocaleLowerCase()));
}

export function validateAuctionAdvisorText(text: string, payload: AuctionAdvisorFactPayload): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const allowedNumbers = new Set(normalizedNumbers(payload.facts.join('\n')));
  if (normalizedNumbers(trimmed).some((number) => !allowedNumbers.has(number))) return false;
  if (containsUnknownKnownEntity(trimmed, payload)) return false;
  if (containsInventedTitleCaseName(trimmed, payload)) return false;

  if (payload.verdict) {
    const gradeMentions = trimmed.match(/\bGrade\s+[A-F][+-]?\b/gi) ?? [];
    if (gradeMentions.some((grade) => grade.toLocaleLowerCase() !== payload.verdict?.toLocaleLowerCase())) {
      return false;
    }
  }
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
