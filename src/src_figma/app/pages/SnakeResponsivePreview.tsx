import { useState, type ReactNode } from 'react';

import type { SnakeGuidePackage } from '../../../engines/snakeGuideTrade';
import type { Player, SnakeOpenTradeOffer } from '../../../utils/leagueBuilderStorage';
import { SnakeDraftRoomView } from '../components/snake/SnakeDraftRoomView';
import { CompanionCoveredScreen, SnakeCompanionFrame } from '../components/snake/companion/SnakeCompanionFrame';
import { DraftTruthStrip } from '../components/snake/desk/DraftTruthStrip';
import { PrivateDesk } from '../components/snake/desk/PrivateDesk';
import { SelectedPlayerCard } from '../components/snake/desk/SelectedPlayerCard';
import type { ChemistryStripRow } from '../components/snake/desk/draftTruthModel';
import type { DeskCandidate } from '../components/snake/desk/deskModel';
import type { SelectedPlayerConsequence } from '../components/snake/desk/snakeDeskIntelligenceModel';
import { SnakeCommissionerTrade } from '../components/snake/trade/SnakeCommissionerTrade';
import { SnakeTradeGuide } from '../components/snake/trade/SnakeTradeGuide';
import type { AskedPickGuideResult } from '../components/snake/trade/tradeGuideModel';

const teams = [
  { id: 'bew', name: 'Beewolves', abbreviation: 'BEW', colors: { primary: '#1f6b45', secondary: '#f4d35e', accent: '#16281f' } },
  { id: 'buz', name: 'Buzzards', abbreviation: 'BUZ', colors: { primary: '#7a341e', secondary: '#f2c14e', accent: '#28160f' } },
] as const;

const player = {
  id: 'jovita', firstName: 'Jovita', lastName: 'Pulo', gender: 'F', age: 26, bats: 'R', throws: 'R',
  primaryPosition: 'SP', secondaryPosition: 'SP/RP', power: 0, contact: 14, speed: 21, fielding: 62, arm: 71,
  velocity: 91, junk: 84, accuracy: 79, arsenal: ['4F', 'SL', 'CH'], overallGrade: 'A-',
  personality: 'Competitive', chemistry: 'Scholarly', trait1: 'Big Hack', trait2: 'Tough Out', morale: 50,
  mojo: 'Normal', fame: 0, salary: 90_000, leagueAssignments: [], createdDate: '2026-01-01',
  lastModified: '2026-01-01', isCustom: true,
} as Player;

const candidate: DeskCandidate = {
  id: 'jovita', name: 'JOVITA PULO', position: 'SP', eligiblePositions: ['SP', 'SP/RP'],
  identityChips: ['A- STARTER', 'SCHOLARLY'], advisorWorth: 100_000, iv: 90_000,
  marginalTax: 12_500, trueCost: 102_500, archetypeChip: 'BALANCED', fitWord: 'STRONG FIT',
  risk: 'AT_RISK', legalFinishLine: 'AFTER THIS PICK AND A LEGAL FINISH: $90,000 LEFT.',
  construction: {
    id: 'jovita', isPitcher: true, role: 'SP',
    bat: { POW: 0, CON: 14, SPD: 21, FLD: 62, ARM: 71 },
    pit: { VEL: 91, JNK: 84, ACC: 79 },
  },
};

const alternatives: DeskCandidate[] = [
  candidate,
  {
    ...candidate, id: 'slugger', name: 'SAM SLUGGER', position: '1B', eligiblePositions: ['1B'],
    identityChips: ['A BAT', 'COMPETITIVE'], iv: 75_000, marginalTax: 5_000, trueCost: 80_000,
    fitWord: 'NEUTRAL FIT', risk: 'SAFE_TO_WAIT',
    construction: { id: 'slugger', isPitcher: false, bat: { POW: 88, CON: 74, SPD: 42, FLD: 64, ARM: 69 }, pit: { VEL: 0, JNK: 0, ACC: 0 } },
  },
  {
    ...candidate, id: 'catcher', name: 'MAX BACKSTOP', position: 'C', eligiblePositions: ['C'],
    identityChips: ['B+ CATCHER', 'CRAFTY'], iv: 62_000, marginalTax: 0, trueCost: 62_000,
    fitWord: 'WEAK FIT', risk: 'LIKELY_GONE',
    construction: { id: 'catcher', isPitcher: false, bat: { POW: 63, CON: 76, SPD: 31, FLD: 86, ARM: 91 }, pit: { VEL: 0, JNK: 0, ACC: 0 } },
  },
];

const chemistry: ChemistryStripRow[] = [
  { family: 'CMP', word: 'Competitive', count: 4, tier: 'L2' },
  { family: 'SPI', word: 'Spirited', count: 3, tier: 'L1' },
  { family: 'CRA', word: 'Crafty', count: 5, tier: 'L2' },
  { family: 'SCH', word: 'Scholarly', count: 6, tier: 'L2' },
  { family: 'DIS', word: 'Disciplined', count: 4, tier: 'L2' },
];

const proposal: SnakeGuidePackage = {
  buyerTeamId: 'bew', sellerTeamId: 'buz', targetPick: 19,
  offerPickNumbers: [24, 36], receivePickNumbers: [19, 41],
  offerValue: 190, receiveValue: 180, sellerPremium: 10, sessionRevision: 7,
};

const guideAnswer: AskedPickGuideResult & { proposal: SnakeGuidePackage } = {
  message: 'OFFER 24+36; RECEIVE 19+41 — GUIDE-MATCHED AND LEGAL NOW.',
  proposal,
  nextPickMoves: [
    { teamId: 'bew', before: 24, after: 19 },
    { teamId: 'buz', before: 19, after: 24 },
  ],
};

const openOffer: SnakeOpenTradeOffer = {
  id: 'responsive-offer', phase: 'MLB', buyerTeamId: 'bew', sellerTeamId: 'buz', targetPick: 19,
  offerPickNumbers: [24, 36], receivePickNumbers: [19, 41], offerValue: 190, receiveValue: 180,
  sellerPremium: 10, postedSessionRevision: 7, buyerNod: true, sellerNod: false,
  postedAt: '2026-07-13T12:00:00.000Z',
};

const selectedConsequence: SelectedPlayerConsequence = {
  status: 'ready',
  identity: {
    sessionId: 'responsive-session', sessionRevision: 7, teamId: 'bew', seatId: 'bew',
    deviceId: 'responsive-device', privateEpoch: 1, boardRevision: 4,
  },
  selectedPlayerId: 'jovita', displacedPlayerId: 'incumbent', displacedPlayerName: 'Old Starter',
  displacedSlotId: 'SP1', reassignedSlotIds: ['SP1'],
  board: { slots: {} as never, rankings: {}, revision: 5 },
  before: {
    ledger: { rosterCount: 22, salary: 800_000, tax: 20_000, allIn: 820_000, moneyLeft: 180_000 },
    chemistry, legalFinish: { feasible: true, moneyLeft: 75_000 }, fitWord: 'WEAK FIT',
  },
  after: {
    ledger: { rosterCount: 22, salary: 790_000, tax: 5_000, allIn: 795_000, moneyLeft: 205_000 },
    chemistry, legalFinish: { feasible: true, moneyLeft: 90_000 }, fitWord: 'STRONG FIT',
  },
};

function TradeGuide(props: { commissioner?: boolean; fixedBuyer?: boolean; showHelp?: boolean }) {
  if (props.commissioner) return <SnakeCommissionerTrade
    teams={teams}
    ownedPicksByTeamId={{ bew: [24, 36], buz: [19, 41] }}
    sessionRevision={7}
    openOffers={[openOffer]}
    showHelp={props.showHelp}
    onAsk={() => guideAnswer}
    onPost={() => undefined}
    onNod={() => undefined}
    onClose={() => undefined}
    onExecute={() => ({ valid: false, message: 'PREVIEW ONLY', session: null, livePickMoved: false, receipts: [] })}
  />;
  return <SnakeTradeGuide
    teams={teams}
    fixedBuyerTeamId={props.fixedBuyer ? 'bew' : undefined}
    pickValueChart={[{ pick: 19, value: 180 }, { pick: 24, value: 120 }, { pick: 36, value: 70 }, { pick: 41, value: 60 }]}
    sessionRevision={7}
    showHelp={props.showHelp}
    prefill={{ key: 'responsive-prefill', result: guideAnswer }}
    openOffers={[openOffer]}
    onAsk={() => guideAnswer}
    onPost={() => undefined}
    onNod={() => undefined}
    onClose={() => undefined}
  />;
}

function DraftDesk(props: { showHelp?: boolean; tradeGuide?: ReactNode }) {
  return <PrivateDesk
    candidates={alternatives}
    rankings={{ SP: ['jovita'], 'SP/RP': ['jovita'], '1B': ['slugger'], C: ['catcher'] }}
    overallRankings={['jovita', 'slugger', 'catcher']}
    boardSlots={{ SP1: 'jovita', '1B': 'slugger', C: 'catcher' }}
    brokenSlots={[]}
    planBill={{ planCost: 790_000, planTax: 5_000, planCushion: 205_000, playerIds: ['jovita', 'slugger', 'catcher'] }}
    planChemistry={chemistry}
    draftedChemistry={chemistry}
    advisorLog={[{ key: 'trade', text: 'PICK 19 IS AVAILABLE.', actionable: true }]}
    taxCoreRows={[{ key: 'top', label: 'TOP SALARY', playerNames: ['JOVITA PULO'] }]}
    slotDepth={{ SP1: 2, '1B': 3, C: 1 }}
    assistantBoard={{ status: 'idle', board: null, infeasibleReason: null }}
    tradeGuide={props.tradeGuide}
    showHelp={props.showHelp}
    selectedCandidateId="jovita"
    onSelectCandidate={() => undefined}
    onReorder={() => undefined}
    onReorderOverall={() => undefined}
  />;
}

function Selected(props: { draftAction?: ReactNode }) {
  return <SelectedPlayerCard
    player={player}
    candidate={candidate}
    consequence={selectedConsequence}
    teamName="Beewolves"
    onOptimizeAround={() => undefined}
    onKeep={() => undefined}
    onRevert={() => undefined}
    decision={{ kind: 'TRADE_TO_PICK', playerId: 'jovita', targetPick: 19, proposal }}
    onTradeDecision={() => undefined}
    actionConsequence="AFTER THIS PICK AND A LEGAL FINISH: $90,000 LEFT."
    draftAction={props.draftAction}
  />;
}

function MainPreview() {
  return <div data-testid="snake-responsive-preview" data-surface="main">
    <SnakeDraftRoomView
      teams={teams}
      order={[
        { pick: 19, teamId: 'buz' }, { pick: 20, teamId: 'bew' }, { pick: 21, teamId: 'bew', endpoint: true },
        { pick: 22, teamId: 'buz' }, { pick: 23, teamId: 'buz', endpoint: true }, { pick: 24, teamId: 'bew' },
      ]}
      currentPickIndex={0}
      ticker={[{ id: 't1', teamId: 'buz', text: 'BUZZARDS SELECTED MAX BACKSTOP' }]}
      rostersByTeamId={{ bew: [{ id: 'slugger', name: 'Sam Slugger', position: '1B' }], buz: [{ id: 'catcher', name: 'Max Backstop', position: 'C' }] }}
      ownedPicksByTeamId={{ bew: [20, 21, 24, 36], buz: [19, 22, 23, 41] }}
      activeSeatId="bew"
      candidate={{ id: 'jovita', name: 'JOVITA PULO', position: 'SP', consequence: candidate.legalFinishLine, privateNote: 'YOUR TOP STARTER.' }}
      candidateProfile={player}
      selectedPlayerCard={(draftAction) => <Selected draftAction={draftAction} />}
      selectedFitLabel="FIT · STRONG FIT"
      draftActionLabel="DRAFT PLAYER"
      paused={false}
      soundsEnabled
      correctionAvailable
      consolidatedMlb
      privateDesk={(showHelp) => <DraftDesk showHelp={showHelp} tradeGuide={<TradeGuide fixedBuyer showHelp={showHelp} />} />}
      commissionerTrade={(showHelp) => <TradeGuide commissioner showHelp={showHelp} />}
      companionApproval={<div className="border-4 border-[var(--ballpark-panel-border)] p-3 font-black">NO PENDING COMPANION CLAIMS.</div>}
      publicTruthByTeamId={{
        bew: { ledger: { rosterCount: 1, salary: 75_000, tax: 0, allIn: 75_000, moneyLeft: 925_000 }, chemistry },
        buz: { ledger: { rosterCount: 1, salary: 62_000, tax: 0, allIn: 62_000, moneyLeft: 938_000 }, chemistry },
      }}
      onPauseChange={() => undefined}
      onRecordPick={() => undefined}
      onCorrectLatest={() => undefined}
      onSoundsEnabledChange={() => undefined}
      onActiveSeatChange={() => undefined}
    />
  </div>;
}

function CompanionPreview() {
  const [covered, setCovered] = useState(false);
  return <div data-testid="snake-responsive-preview" data-surface="companion">
    {covered ? <CompanionCoveredScreen
      onReturn={() => setCovered(false)}
      onForgetRoom={() => undefined}
      onSignOut={() => undefined}
    /> : <SnakeCompanionFrame
      team={teams[0]}
      currentPick={19}
      order={[{ pick: 19, teamName: 'Buzzards' }, { pick: 20, teamName: 'Beewolves' }, { pick: 21, teamName: 'Beewolves' }]}
      ticker={['BUZZARDS SELECTED MAX BACKSTOP']}
      selectedPlayer={<Selected />}
      draftedTruth={<DraftTruthStrip
        title="DRAFTED ROSTER"
        ledger={{ rosterCount: 1, salary: 75_000, tax: 0, allIn: 75_000, moneyLeft: 925_000 }}
        chemistry={chemistry}
      />}
      privateDesk={(showHelp) => <DraftDesk showHelp={showHelp} tradeGuide={<TradeGuide fixedBuyer showHelp={showHelp} />} />}
      helpNotes={['TRADE PICKS OPENS ONLY THIS CLUB\'S PRIVATE GUIDE.']}
      onCover={() => setCovered(true)}
    />}
  </div>;
}

export function SnakeResponsivePreview() {
  const surface = new URLSearchParams(window.location.search).get('surface');
  return surface === 'companion' ? <CompanionPreview /> : <MainPreview />;
}
