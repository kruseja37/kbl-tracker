import { useState, useMemo, useEffect } from 'react';
import type {
  FameEvent,
  PlayerGameFame
} from '../../types/game';
import {
  FAME_EVENT_LABELS,
  groupFameByPlayer,
  calculateNetFame
} from '../../types/game';

// ============================================
// FAME DISPLAY COMPONENTS
// Per FAN_HAPPINESS_SPEC.md Section 6
// ============================================

// ============================================
// FAME PANEL - Collapsible game Fame summary
// ============================================

interface FamePanelProps {
  fameEvents: FameEvent[];
  awayTeamName: string;
  homeTeamName: string;
  awayTeamId: string;
  homeTeamId: string;
}

export function FamePanel({
  fameEvents,
  awayTeamName,
  homeTeamName,
  awayTeamId,
  homeTeamId
}: FamePanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Split events by team
  const awayEvents = useMemo(
    () => fameEvents.filter(e => e.playerTeam === awayTeamId),
    [fameEvents, awayTeamId]
  );
  const homeEvents = useMemo(
    () => fameEvents.filter(e => e.playerTeam === homeTeamId),
    [fameEvents, homeTeamId]
  );

  const awayNetFame = calculateNetFame(awayEvents);
  const homeNetFame = calculateNetFame(homeEvents);

  // Group by player
  const awayPlayerFame = useMemo(
    () => Array.from(groupFameByPlayer(awayEvents).values()),
    [awayEvents]
  );
  const homePlayerFame = useMemo(
    () => Array.from(groupFameByPlayer(homeEvents).values()),
    [homeEvents]
  );

  if (fameEvents.length === 0) {
    return null; // Don't show if no Fame events
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 flex items-center justify-between hover:from-purple-100 hover:to-indigo-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">⭐</span>
          <span className="font-semibold text-gray-700">Game Fame</span>
          <span className="text-sm text-gray-500">
            ({fameEvents.length} event{fameEvents.length !== 1 ? 's' : ''})
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* Quick summary */}
          <div className="flex gap-3 text-sm">
            <span className={awayNetFame >= 0 ? 'text-green-600' : 'text-red-600'}>
              {awayTeamName}: {awayNetFame > 0 ? '+' : ''}{awayNetFame}
            </span>
            <span className={homeNetFame >= 0 ? 'text-green-600' : 'text-red-600'}>
              {homeTeamName}: {homeNetFame > 0 ? '+' : ''}{homeNetFame}
            </span>
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 py-3">
          <div className="grid grid-cols-2 gap-4">
            {/* Away Team */}
            <TeamFameSection
              teamName={awayTeamName}
              netFame={awayNetFame}
              playerFame={awayPlayerFame}
              isAway={true}
            />

            {/* Home Team */}
            <TeamFameSection
              teamName={homeTeamName}
              netFame={homeNetFame}
              playerFame={homePlayerFame}
              isAway={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// TEAM FAME SECTION
// ============================================

interface TeamFameSectionProps {
  teamName: string;
  netFame: number;
  playerFame: PlayerGameFame[];
  isAway: boolean;
}

function TeamFameSection({ teamName, netFame, playerFame, isAway }: TeamFameSectionProps) {
  // Sort by absolute net fame (most impactful first)
  const sortedPlayers = useMemo(
    () => [...playerFame].sort((a, b) => Math.abs(b.netFame) - Math.abs(a.netFame)),
    [playerFame]
  );

  if (playerFame.length === 0) {
    return (
      <div className={`${isAway ? 'border-r pr-4' : 'pl-4'}`}>
        <div className="text-sm font-medium text-gray-600 mb-2">
          {teamName}
          <span className="text-gray-400 ml-2">Net: 0</span>
        </div>
        <div className="text-xs text-gray-400 italic">No Fame events</div>
      </div>
    );
  }

  return (
    <div className={`${isAway ? 'border-r pr-4' : 'pl-4'}`}>
      <div className="text-sm font-medium text-gray-600 mb-2">
        {teamName}
        <span className={`ml-2 ${netFame >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          Net: {netFame > 0 ? '+' : ''}{netFame}
        </span>
      </div>
      <div className="space-y-1">
        {sortedPlayers.map((player) => (
          <PlayerFameRow key={player.playerId} player={player} />
        ))}
      </div>
    </div>
  );
}

// ============================================
// PLAYER FAME ROW
// ============================================

interface PlayerFameRowProps {
  player: PlayerGameFame;
}

function PlayerFameRow({ player }: PlayerFameRowProps) {
  const [showDetails, setShowDetails] = useState(false);
  const allEvents = [...player.bonuses, ...player.boners];

  return (
    <div>
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full text-left text-xs hover:bg-gray-50 rounded px-1 py-0.5"
      >
        <span className="font-medium">{player.playerName}:</span>
        <span className={`ml-1 ${player.netFame >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {player.netFame > 0 ? '+' : ''}{player.netFame}
        </span>
        {allEvents.length > 0 && (
          <span className="text-gray-400 ml-1">
            ({allEvents.map(e => e.fameType === 'bonus' ? '⭐' : '💀').join('')})
          </span>
        )}
      </button>

      {showDetails && allEvents.length > 0 && (
        <div className="ml-4 text-xs text-gray-500 space-y-0.5 pb-1">
          {allEvents.map((event) => (
            <div key={event.id} className="flex items-center gap-1">
              <span>{event.fameType === 'bonus' ? '⭐' : '💀'}</span>
              <span>{FAME_EVENT_LABELS[event.eventType]}</span>
              <span className={event.fameValue >= 0 ? 'text-green-600' : 'text-red-600'}>
                ({event.fameValue > 0 ? '+' : ''}{event.fameValue})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// FAME BADGE - For player cards/lineup display
// ============================================

interface FameBadgeProps {
  netFame: number;
  size?: 'sm' | 'md';
}

export function FameBadge({ netFame, size = 'sm' }: FameBadgeProps) {
  if (netFame === 0) return null;

  const sizeClasses = size === 'sm' ? 'text-xs px-1' : 'text-sm px-2 py-0.5';

  return (
    <span
      className={`${sizeClasses} rounded-full ${
        netFame > 0
          ? 'bg-green-100 text-green-700'
          : 'bg-red-100 text-red-700'
      }`}
    >
      {netFame > 0 ? '⭐' : '💀'}{netFame > 0 ? '+' : ''}{netFame}
    </span>
  );
}

// ============================================
// FAME TOAST - Auto-detection notifications
// ============================================

interface FameToastProps {
  event: FameEvent;
  onDismiss: () => void;
  onViewDetails?: () => void;
  autoHideMs?: number;
}

export function FameToast({
  event,
  onDismiss,
  onViewDetails,
  autoHideMs = 5000
}: FameToastProps) {
  // Auto-hide after specified time
  useEffect(() => {
    if (autoHideMs > 0) {
      const timer = setTimeout(onDismiss, autoHideMs);
      return () => clearTimeout(timer);
    }
  }, [autoHideMs, onDismiss]);

  const isBonus = event.fameType === 'bonus';

  return (
    <div
      className={`fixed bottom-4 right-4 max-w-sm bg-white rounded-lg shadow-lg border-l-4 ${
        isBonus ? 'border-green-500' : 'border-red-500'
      } animate-slide-in`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{isBonus ? '⭐' : '💀'}</span>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">
              {isBonus ? 'Fame Bonus!' : 'Fame Boner'}
            </div>
            <div className="text-sm text-gray-600">
              {event.playerName}: {FAME_EVENT_LABELS[event.eventType]}
            </div>
            <div className={`text-sm font-medium ${isBonus ? 'text-green-600' : 'text-red-600'}`}>
              {event.fameValue > 0 ? '+' : ''}{event.fameValue} Fame
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="mt-2 text-xs text-purple-600 hover:text-purple-800"
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// FAME TOAST CONTAINER - Manages multiple toasts
// ============================================

interface FameToastContainerProps {
  toasts: FameEvent[];
  onDismiss: (eventId: string) => void;
  onViewDetails?: (event: FameEvent) => void;
}

export function FameToastContainer({
  toasts,
  onDismiss,
  onViewDetails
}: FameToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {toasts.slice(0, 3).map((event, index) => (
        <div
          key={event.id}
          style={{ transform: `translateY(${-index * 10}px)` }}
        >
          <FameToast
            event={event}
            onDismiss={() => onDismiss(event.id)}
            onViewDetails={onViewDetails ? () => onViewDetails(event) : undefined}
            autoHideMs={5000 + index * 1000}
          />
        </div>
      ))}
    </div>
  );
}

// ============================================
// END GAME FAME SUMMARY
// ============================================

interface EndGameFameSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  fameEvents: FameEvent[];
  awayTeamName: string;
  homeTeamName: string;
  awayTeamId: string;
  homeTeamId: string;
  winner: 'away' | 'home' | null;
}

export function EndGameFameSummary({
  isOpen,
  onClose,
  fameEvents,
  awayTeamName,
  homeTeamName,
  awayTeamId,
  homeTeamId,
  winner
}: EndGameFameSummaryProps) {
  if (!isOpen) return null;

  // Split events by team
  const awayEvents = fameEvents.filter(e => e.playerTeam === awayTeamId);
  const homeEvents = fameEvents.filter(e => e.playerTeam === homeTeamId);

  const awayNetFame = calculateNetFame(awayEvents);
  const homeNetFame = calculateNetFame(homeEvents);

  const awayPlayerFame = Array.from(groupFameByPlayer(awayEvents).values())
    .sort((a, b) => b.netFame - a.netFame);
  const homePlayerFame = Array.from(groupFameByPlayer(homeEvents).values())
    .sort((a, b) => b.netFame - a.netFame);

  // Top events
  const topBonuses = fameEvents
    .filter(e => e.fameValue > 0)
    .sort((a, b) => b.fameValue - a.fameValue)
    .slice(0, 3);
  const topBoners = fameEvents
    .filter(e => e.fameValue < 0)
    .sort((a, b) => a.fameValue - b.fameValue)
    .slice(0, 3);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>⭐</span>
              Game Fame Summary
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
          {/* Team Totals */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className={`p-4 rounded-lg ${winner === 'away' ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
              <div className="font-semibold">{awayTeamName}</div>
              <div className={`text-2xl font-bold ${awayNetFame >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {awayNetFame > 0 ? '+' : ''}{awayNetFame} Fame
              </div>
              {awayPlayerFame.length > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  {awayPlayerFame.slice(0, 3).map(p => (
                    <div key={p.playerId}>
                      {p.playerName}: {p.netFame > 0 ? '+' : ''}{p.netFame}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className={`p-4 rounded-lg ${winner === 'home' ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
              <div className="font-semibold">{homeTeamName}</div>
              <div className={`text-2xl font-bold ${homeNetFame >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {homeNetFame > 0 ? '+' : ''}{homeNetFame} Fame
              </div>
              {homePlayerFame.length > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  {homePlayerFame.slice(0, 3).map(p => (
                    <div key={p.playerId}>
                      {p.playerName}: {p.netFame > 0 ? '+' : ''}{p.netFame}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Moments */}
          {topBonuses.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-semibold text-green-700 mb-2">
                ⭐ Top Fame Bonuses
              </div>
              <div className="space-y-1">
                {topBonuses.map(e => (
                  <div key={e.id} className="text-sm bg-green-50 rounded px-2 py-1">
                    <span className="font-medium">{e.playerName}</span>:{' '}
                    {FAME_EVENT_LABELS[e.eventType]} (+{e.fameValue})
                  </div>
                ))}
              </div>
            </div>
          )}

          {topBoners.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-semibold text-red-700 mb-2">
                💀 Fame Boners
              </div>
              <div className="space-y-1">
                {topBoners.map(e => (
                  <div key={e.id} className="text-sm bg-red-50 rounded px-2 py-1">
                    <span className="font-medium">{e.playerName}</span>:{' '}
                    {FAME_EVENT_LABELS[e.eventType]} ({e.fameValue})
                  </div>
                ))}
              </div>
            </div>
          )}

          {fameEvents.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No Fame events recorded this game
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default FamePanel;
