import type { SnakeGuidePackage } from './snakeGuideTrade';
import {
  FARM_SNAKE_SESSION_NUMBER,
  type LeagueBuilderMlbDraftSession,
  type SnakeOpenTradeOffer,
  type SnakeRoomLogRecord,
} from '../utils/leagueBuilderStorage';

function pairKey(left: string, right: string): string {
  return [left, right].sort().join('::');
}

function nextRevision(session: LeagueBuilderMlbDraftSession): number {
  return (session.revision ?? 0) + 1;
}

function assertMlbTradeOfferSession(
  session: LeagueBuilderMlbDraftSession,
  offer?: Pick<SnakeOpenTradeOffer, 'phase'>,
): void {
  if (
    session.seasonNumber === FARM_SNAKE_SESSION_NUMBER
    || session.draftPhase === 'FARM'
    || session.draftManifest?.phase === 'FARM'
    || offer?.phase === 'FARM'
  ) throw new Error('FARM snake sessions do not allow pick trades.');
}

export function postSnakeTradeOffer(input: {
  session: LeagueBuilderMlbDraftSession;
  phase: 'MLB';
  proposal: SnakeGuidePackage;
  postedAt: string;
}): LeagueBuilderMlbDraftSession {
  assertMlbTradeOfferSession(input.session, { phase: input.phase });
  if (!Number.isFinite(input.proposal.sellerPremium)) {
    throw new Error('THIS PACKAGE NO LONGER MATCHES THE POSTED GUIDE.');
  }
  const offer: SnakeOpenTradeOffer = {
    id: `snake-offer-${input.phase.toLowerCase()}-${input.session.id}-${nextRevision(input.session)}`,
    phase: input.phase,
    buyerTeamId: input.proposal.buyerTeamId,
    sellerTeamId: input.proposal.sellerTeamId,
    targetPick: input.proposal.targetPick,
    offerPickNumbers: [...input.proposal.offerPickNumbers],
    receivePickNumbers: [...input.proposal.receivePickNumbers],
    offerValue: input.proposal.offerValue,
    receiveValue: input.proposal.receiveValue,
    sellerPremium: input.proposal.sellerPremium,
    postedSessionRevision: input.session.revision ?? 0,
    buyerNod: false,
    sellerNod: false,
    postedAt: input.postedAt,
  };
  const key = pairKey(offer.buyerTeamId, offer.sellerTeamId);
  return {
    ...input.session,
    openTradeOffers: [
      ...(input.session.openTradeOffers ?? []).filter((row) => pairKey(row.buyerTeamId, row.sellerTeamId) !== key),
      offer,
    ],
    revision: nextRevision(input.session),
  };
}

export function nodSnakeTradeOffer(
  session: LeagueBuilderMlbDraftSession,
  offerId: string,
  teamId: string,
): LeagueBuilderMlbDraftSession {
  const offer = session.openTradeOffers?.find((row) => row.id === offerId);
  if (!offer) throw new Error('THAT OFFER IS NO LONGER OPEN.');
  assertMlbTradeOfferSession(session, offer);
  if (teamId !== offer.buyerTeamId && teamId !== offer.sellerTeamId) {
    throw new Error('ONLY THE TWO CLUBS IN THIS OFFER CAN NOD.');
  }
  return {
    ...session,
    openTradeOffers: session.openTradeOffers?.map((row) => row.id !== offerId ? row : {
      ...row,
      ...(teamId === row.buyerTeamId ? { buyerNod: true } : { sellerNod: true }),
    }),
    revision: nextRevision(session),
  };
}

export function closeSnakeTradeOffer(
  session: LeagueBuilderMlbDraftSession,
  offerId: string,
): LeagueBuilderMlbDraftSession {
  const offers = session.openTradeOffers;
  const offer = offers?.find((row) => row.id === offerId);
  if (!offer) {
    throw new Error('THAT OFFER IS NO LONGER OPEN.');
  }
  assertMlbTradeOfferSession(session, offer);
  return {
    ...session,
    openTradeOffers: offers!.filter((row) => row.id !== offerId),
    revision: nextRevision(session),
  };
}

export function proposalFromOpenSnakeOffer(
  session: LeagueBuilderMlbDraftSession,
  offer: SnakeOpenTradeOffer,
): SnakeGuidePackage {
  assertMlbTradeOfferSession(session, offer);
  if (!offer.buyerNod || !offer.sellerNod) throw new Error('BOTH CLUBS MUST NOD BEFORE THE COMMISSIONER CAN EXECUTE.');
  if (!Number.isFinite(offer.sellerPremium)) throw new Error('THIS OFFER HAS NO AUTHORITATIVE SELLER PREMIUM.');
  return {
    buyerTeamId: offer.buyerTeamId,
    sellerTeamId: offer.sellerTeamId,
    targetPick: offer.targetPick,
    offerPickNumbers: [...offer.offerPickNumbers],
    receivePickNumbers: [...offer.receivePickNumbers],
    offerValue: offer.offerValue,
    receiveValue: offer.receiveValue,
    sellerPremium: offer.sellerPremium!,
    sessionRevision: session.revision ?? 0,
  };
}

export function appendSnakeRoomLog(input: {
  session: LeagueBuilderMlbDraftSession;
  teamId: string;
  entry: SnakeRoomLogRecord;
}): LeagueBuilderMlbDraftSession {
  const prior = input.session.roomLogByTeamId?.[input.teamId] ?? [];
  if (prior.some((row) => row.id === input.entry.id)) return input.session;
  return {
    ...input.session,
    roomLogByTeamId: {
      ...input.session.roomLogByTeamId,
      [input.teamId]: [...prior, input.entry].slice(-100),
    },
  };
}
