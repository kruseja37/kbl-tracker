import type { SnakeOpenTradeOffer } from './leagueBuilderStorage';
import type {
  SnakeLiveIntent,
  SnakeLiveJsonObject,
} from './snakeLiveRoomTypes';

export type SnakeLiveTradeIntentAction = 'POST' | 'NOD' | 'WITHDRAW' | 'DECLINE';

export interface SnakeLiveTradeProjection {
  /** Sanitized public negotiation state. It never contains an intent payload or a private board. */
  openOffers: SnakeOpenTradeOffer[];
  /** Execution remains a Hotseat action. This list only identifies offers with both nods. */
  executableOffers: SnakeOpenTradeOffer[];
  /** Current trade intents that failed structural or actor validation. */
  invalidIntentIds: string[];
}

interface ParsedTradeIntent {
  action: SnakeLiveTradeIntentAction;
  offerId: string;
  buyerTeamId: string;
  sellerTeamId: string;
  actorTeamId: string;
  offer?: SnakeOpenTradeOffer;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean.length > 0 ? clean : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function nonNegativeInteger(value: unknown): number | null {
  return Number.isInteger(value) && (value as number) >= 0 ? value as number : null;
}

function positiveInteger(value: unknown): number | null {
  return Number.isInteger(value) && (value as number) > 0 ? value as number : null;
}

function positiveIntegerArray(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (value.some((entry) => positiveInteger(entry) === null)) return null;
  const numbers = value as number[];
  return new Set(numbers).size === numbers.length ? [...numbers] : null;
}

function sanitizePostedOffer(
  value: unknown,
  envelope: Pick<ParsedTradeIntent, 'offerId' | 'buyerTeamId' | 'sellerTeamId' | 'actorTeamId'>,
): SnakeOpenTradeOffer | null {
  const candidate = record(value);
  if (!candidate) return null;

  const id = nonEmptyString(candidate.id);
  const buyerTeamId = nonEmptyString(candidate.buyerTeamId);
  const sellerTeamId = nonEmptyString(candidate.sellerTeamId);
  const targetPick = positiveInteger(candidate.targetPick);
  const offerPickNumbers = positiveIntegerArray(candidate.offerPickNumbers);
  const receivePickNumbers = positiveIntegerArray(candidate.receivePickNumbers);
  const offerValue = finiteNumber(candidate.offerValue);
  const receiveValue = finiteNumber(candidate.receiveValue);
  const postedSessionRevision = nonNegativeInteger(candidate.postedSessionRevision);
  const postedAt = nonEmptyString(candidate.postedAt);
  const sellerPremium = candidate.sellerPremium === undefined
    ? undefined
    : finiteNumber(candidate.sellerPremium);

  if (id !== envelope.offerId
    || candidate.phase !== 'MLB'
    || buyerTeamId !== envelope.buyerTeamId
    || sellerTeamId !== envelope.sellerTeamId
    || targetPick === null
    || !offerPickNumbers
    || !receivePickNumbers
    || offerValue === null
    || receiveValue === null
    || postedSessionRevision === null
    || !postedAt
    || sellerPremium === null) return null;

  return {
    id,
    phase: 'MLB',
    buyerTeamId,
    sellerTeamId,
    targetPick,
    offerPickNumbers,
    receivePickNumbers,
    offerValue,
    receiveValue,
    ...(sellerPremium === undefined ? {} : { sellerPremium }),
    postedSessionRevision,
    // The service authorizes the actor. Do not trust nod flags supplied in JSON.
    buyerNod: envelope.actorTeamId === buyerTeamId,
    sellerNod: envelope.actorTeamId === sellerTeamId,
    postedAt,
  };
}

function parseTradeIntent(intent: SnakeLiveIntent): ParsedTradeIntent | null {
  const payload = record(intent.payload);
  const action = payload?.action;
  const offerId = nonEmptyString(payload?.offerId);
  const buyerTeamId = nonEmptyString(payload?.buyerTeamId);
  const sellerTeamId = nonEmptyString(payload?.sellerTeamId);
  const actorTeamId = nonEmptyString(intent.teamId);
  if ((action !== 'POST' && action !== 'NOD' && action !== 'WITHDRAW' && action !== 'DECLINE')
    || !offerId
    || !buyerTeamId
    || !sellerTeamId
    || buyerTeamId === sellerTeamId
    || !actorTeamId
    || (actorTeamId !== buyerTeamId && actorTeamId !== sellerTeamId)) return null;

  const parsed: ParsedTradeIntent = {
    action,
    offerId,
    buyerTeamId,
    sellerTeamId,
    actorTeamId,
  };
  if (action !== 'POST') return parsed;
  const offer = sanitizePostedOffer(payload?.offer, parsed);
  return offer ? { ...parsed, offer } : null;
}

function intentOrder(left: SnakeLiveIntent, right: SnakeLiveIntent): number {
  return left.createdAt.localeCompare(right.createdAt)
    || left.id.localeCompare(right.id)
    || left.intentRevision - right.intentRevision;
}

function pairKey(offer: Pick<SnakeOpenTradeOffer, 'buyerTeamId' | 'sellerTeamId'>): string {
  return [offer.buyerTeamId, offer.sellerTeamId].sort().join('::');
}

/**
 * Rebuild the private trade negotiation from immutable live intent receipts.
 *
 * A public draft revision change expires every prior negotiation. Pending
 * intents are included because the server has already authenticated the actor;
 * accepting a trade offer remains a separate Hotseat-only engine operation.
 */
export function projectSnakeLiveTradeOffers(
  intents: readonly SnakeLiveIntent[],
  currentPublicRevision: number,
): SnakeLiveTradeProjection {
  const offers = new Map<string, SnakeOpenTradeOffer>();
  const offerIdByPair = new Map<string, string>();
  const seenIdempotencyKeys = new Set<string>();
  const invalidIntentIds: string[] = [];

  const current = intents
    .filter((intent) => intent.kind === 'trade'
      && intent.expectedRoomRevision === currentPublicRevision
      && (intent.status === 'pending' || intent.status === 'accepted'))
    .sort(intentOrder);

  for (const intent of current) {
    if (seenIdempotencyKeys.has(intent.idempotencyKey)) continue;
    seenIdempotencyKeys.add(intent.idempotencyKey);
    const parsed = parseTradeIntent(intent);
    if (!parsed) {
      invalidIntentIds.push(intent.id);
      continue;
    }

    if (parsed.action === 'POST') {
      const posted = parsed.offer!;
      const pair = pairKey(posted);
      const priorPairOfferId = offerIdByPair.get(pair);
      if (priorPairOfferId && priorPairOfferId !== posted.id) offers.delete(priorPairOfferId);
      const priorSameId = offers.get(posted.id);
      if (priorSameId) offerIdByPair.delete(pairKey(priorSameId));
      offers.delete(posted.id);
      offers.set(posted.id, posted);
      offerIdByPair.set(pair, posted.id);
      continue;
    }

    const offer = offers.get(parsed.offerId);
    if (!offer) continue;
    if (offer.buyerTeamId !== parsed.buyerTeamId || offer.sellerTeamId !== parsed.sellerTeamId) {
      invalidIntentIds.push(intent.id);
      continue;
    }
    if (parsed.action === 'NOD') {
      offers.set(offer.id, {
        ...offer,
        ...(parsed.actorTeamId === offer.buyerTeamId ? { buyerNod: true } : { sellerNod: true }),
      });
      continue;
    }
    offers.delete(offer.id);
    offerIdByPair.delete(pairKey(offer));
  }

  const openOffers = [...offers.values()];
  return {
    openOffers,
    executableOffers: openOffers.filter((offer) => offer.buyerNod && offer.sellerNod),
    invalidIntentIds,
  };
}

function jsonOffer(offer: SnakeOpenTradeOffer): SnakeLiveJsonObject {
  return {
    id: offer.id,
    phase: offer.phase,
    buyerTeamId: offer.buyerTeamId,
    sellerTeamId: offer.sellerTeamId,
    targetPick: offer.targetPick,
    offerPickNumbers: [...offer.offerPickNumbers],
    receivePickNumbers: [...offer.receivePickNumbers],
    offerValue: offer.offerValue,
    receiveValue: offer.receiveValue,
    ...(offer.sellerPremium === undefined ? {} : { sellerPremium: offer.sellerPremium }),
    postedSessionRevision: offer.postedSessionRevision,
    buyerNod: offer.buyerNod,
    sellerNod: offer.sellerNod,
    postedAt: offer.postedAt,
  };
}

/** Build the one accepted POST wire shape. Unknown offer data is not copied. */
export function buildSnakeLiveTradePostPayload(offer: SnakeOpenTradeOffer): SnakeLiveJsonObject {
  return {
    action: 'POST',
    offerId: offer.id,
    buyerTeamId: offer.buyerTeamId,
    sellerTeamId: offer.sellerTeamId,
    offer: jsonOffer(offer),
  };
}

/** Build the one accepted NOD/WITHDRAW/DECLINE wire shape. */
export function buildSnakeLiveTradeActionPayload(
  action: Exclude<SnakeLiveTradeIntentAction, 'POST'>,
  offer: Pick<SnakeOpenTradeOffer, 'id' | 'buyerTeamId' | 'sellerTeamId'>,
): SnakeLiveJsonObject {
  return {
    action,
    offerId: offer.id,
    buyerTeamId: offer.buyerTeamId,
    sellerTeamId: offer.sellerTeamId,
  };
}
