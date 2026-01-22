import { useState, useMemo } from 'react';
import type {
  FameEventType,
  FameEvent,
  HalfInning,
  Position
} from '../../types/game';
import {
  FAME_VALUES,
  FAME_EVENT_LABELS,
  createFameEvent
} from '../../types/game';

// ============================================
// FAME EVENT MODAL
// Per FAN_HAPPINESS_SPEC.md Section 5
// ============================================

interface Player {
  playerId: string;
  playerName: string;
  position: Position;
  teamId: string;
}

interface FameEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: FameEvent) => void;
  gameId: string;
  inning: number;
  halfInning: HalfInning;
  awayPlayers: Player[];
  homePlayers: Player[];
  awayTeamName: string;
  homeTeamName: string;
  // Pre-selected values (for context-specific events)
  preSelectedEventType?: FameEventType;
  preSelectedPlayerId?: string;
  preSelectedTeam?: 'away' | 'home';
}

// Group events by category for display
const BONUS_CATEGORIES = {
  'Walk-Offs': [
    'WALK_OFF', 'WALK_OFF_HR', 'WALK_OFF_GRAND_SLAM'
  ],
  'Defensive Highlights': [
    'WEB_GEM', 'ROBBERY', 'ROBBERY_GRAND_SLAM', 'TRIPLE_PLAY',
    'UNASSISTED_TRIPLE_PLAY', 'THROW_OUT_AT_HOME'
  ],
  'Home Runs': [
    'INSIDE_PARK_HR', 'LEADOFF_HR', 'PINCH_HIT_HR', 'GO_AHEAD_HR',
    'GRAND_SLAM', 'CLUTCH_GRAND_SLAM', 'BACK_TO_BACK_HR', 'BACK_TO_BACK_TO_BACK_HR'
  ],
  'Batting': [
    'CYCLE', 'NATURAL_CYCLE', 'MULTI_HR_2', 'MULTI_HR_3', 'MULTI_HR_4PLUS',
    'FIVE_HIT_GAME', 'FIRST_CAREER', 'CAREER_MILESTONE'
  ],
  'Pitching': [
    'NO_HITTER', 'PERFECT_GAME', 'MADDUX', 'COMPLETE_GAME', 'SHUTOUT',
    'IMMACULATE_INNING', 'NINE_PITCH_INNING', 'SHUTDOWN_INNING',
    'STRIKE_OUT_SIDE', 'TEN_K_GAME', 'FIFTEEN_K_GAME', 'ESCAPE_ARTIST'
  ],
  'SMB4 Special': [
    'NUT_SHOT_DELIVERED', 'NUT_SHOT_TOUGH_GUY', 'KILLED_PITCHER', 'STAYED_IN_AFTER_HIT'
  ],
  'Position Player Pitching': [
    'PP_CLEAN_INNING', 'PP_MULTIPLE_CLEAN', 'PP_GOT_K'
  ],
  'Team/Game': [
    'COMEBACK_WIN_3', 'COMEBACK_WIN_5', 'COMEBACK_WIN_7',
    'COMEBACK_HERO', 'RALLY_STARTER'
  ]
} as const;

const BONER_CATEGORIES = {
  'Strikeouts': [
    'HAT_TRICK', 'GOLDEN_SOMBRERO', 'PLATINUM_SOMBRERO', 'TITANIUM_SOMBRERO',
    'IBB_STRIKEOUT'
  ],
  'Batting Failures': [
    'HIT_INTO_TRIPLE_PLAY', 'MEATBALL_WHIFF', 'BASES_LOADED_FAILURE',
    'LOB_KING', 'MULTIPLE_GIDP', 'RALLY_KILLER'
  ],
  'Pitching Disasters': [
    'MELTDOWN', 'MELTDOWN_SEVERE', 'FIRST_INNING_DISASTER', 'WALKED_IN_RUN',
    'B2B2B_HR_ALLOWED', 'BLOWN_SAVE', 'BLOWN_SAVE_LOSS',
    'BLOWN_LEAD_3', 'BLOWN_LEAD_5', 'PP_GAVE_UP_RUNS'
  ],
  'Fielding Errors': [
    'NUT_SHOT_VICTIM', 'DROPPED_FLY', 'DROPPED_FLY_CLUTCH',
    'BOOTED_GROUNDER', 'WRONG_BASE_THROW', 'PASSED_BALL_RUN', 'PASSED_BALL_WINNING_RUN'
  ],
  'Baserunning': [
    'TOOTBLAN', 'TOOTBLAN_RALLY_KILLER', 'PICKED_OFF_END_GAME',
    'PICKED_OFF_END_INNING', 'BATTER_OUT_STRETCHING'
  ]
} as const;

// Events that need a secondary player
const EVENTS_WITH_SECONDARY: FameEventType[] = [
  'NUT_SHOT_DELIVERED', 'NUT_SHOT_VICTIM', 'NUT_SHOT_TOUGH_GUY',
  'KILLED_PITCHER', 'BACK_TO_BACK_HR', 'BACK_TO_BACK_TO_BACK_HR'
];

export function FameEventModal({
  isOpen,
  onClose,
  onSubmit,
  gameId,
  inning,
  halfInning,
  awayPlayers,
  homePlayers,
  awayTeamName,
  homeTeamName,
  preSelectedEventType,
  preSelectedPlayerId,
  preSelectedTeam
}: FameEventModalProps) {
  // State
  const [selectedTab, setSelectedTab] = useState<'bonus' | 'boner'>('bonus');
  const [selectedEventType, setSelectedEventType] = useState<FameEventType | null>(
    preSelectedEventType || null
  );
  const [selectedTeam, setSelectedTeam] = useState<'away' | 'home'>(
    preSelectedTeam || (halfInning === 'TOP' ? 'away' : 'home')
  );
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(
    preSelectedPlayerId || ''
  );
  const [secondaryPlayerId, setSecondaryPlayerId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Get current players based on selected team
  const currentPlayers = selectedTeam === 'away' ? awayPlayers : homePlayers;
  const currentTeamName = selectedTeam === 'away' ? awayTeamName : homeTeamName;
  const opposingPlayers = selectedTeam === 'away' ? homePlayers : awayPlayers;

  // Get selected player details
  const selectedPlayer = useMemo(() => {
    return currentPlayers.find(p => p.playerId === selectedPlayerId);
  }, [currentPlayers, selectedPlayerId]);

  // Check if secondary player is needed
  const needsSecondaryPlayer = selectedEventType && EVENTS_WITH_SECONDARY.includes(selectedEventType);

  // Get secondary player label
  const getSecondaryPlayerLabel = () => {
    if (!selectedEventType) return 'Secondary Player';
    switch (selectedEventType) {
      case 'NUT_SHOT_DELIVERED':
      case 'NUT_SHOT_TOUGH_GUY':
        return 'Fielder Hit (Victim)';
      case 'NUT_SHOT_VICTIM':
        return 'Batter Who Hit It';
      case 'KILLED_PITCHER':
        return 'Pitcher Hit';
      case 'BACK_TO_BACK_HR':
        return 'Other HR Batter';
      default:
        return 'Secondary Player';
    }
  };

  // Handle submit
  const handleSubmit = () => {
    if (!selectedEventType || !selectedPlayerId || !selectedPlayer) return;

    const secondaryPlayer = needsSecondaryPlayer
      ? [...awayPlayers, ...homePlayers].find(p => p.playerId === secondaryPlayerId)
      : undefined;

    const event = createFameEvent(
      gameId,
      inning,
      halfInning,
      selectedEventType,
      selectedPlayerId,
      selectedPlayer.playerName,
      selectedPlayer.teamId,
      false, // Not auto-detected (manual entry)
      notes || undefined,
      secondaryPlayer?.playerId,
      secondaryPlayer?.playerName
    );

    onSubmit(event);
    handleClose();
  };

  // Handle close/reset
  const handleClose = () => {
    setSelectedEventType(preSelectedEventType || null);
    setSelectedPlayerId(preSelectedPlayerId || '');
    setSecondaryPlayerId('');
    setNotes('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>{selectedTab === 'bonus' ? '⭐' : '💀'}</span>
              Add Fame Event
            </h2>
            <button
              onClick={handleClose}
              className="text-white hover:bg-white/20 rounded-full p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-purple-100 text-sm mt-1">
            Inning {inning} {halfInning === 'TOP' ? 'Top' : 'Bot'} |
            Fame is narrative only - tracks memorable moments
          </p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Tab Selection */}
          <div className="flex mb-4 border-b">
            <button
              className={`px-4 py-2 font-medium ${
                selectedTab === 'bonus'
                  ? 'border-b-2 border-green-500 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => {
                setSelectedTab('bonus');
                setSelectedEventType(null);
              }}
            >
              ⭐ Fame Bonus (+)
            </button>
            <button
              className={`px-4 py-2 font-medium ${
                selectedTab === 'boner'
                  ? 'border-b-2 border-red-500 text-red-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => {
                setSelectedTab('boner');
                setSelectedEventType(null);
              }}
            >
              💀 Fame Boner (-)
            </button>
          </div>

          {/* Event Type Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Type
            </label>
            <div className="space-y-3 max-h-48 overflow-y-auto border rounded-lg p-3 bg-gray-50">
              {Object.entries(selectedTab === 'bonus' ? BONUS_CATEGORIES : BONER_CATEGORIES).map(
                ([category, events]) => (
                  <div key={category}>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      {category}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(events as readonly FameEventType[]).map((eventType) => {
                        const value = FAME_VALUES[eventType];
                        const isSelected = selectedEventType === eventType;
                        return (
                          <button
                            key={eventType}
                            onClick={() => setSelectedEventType(eventType)}
                            className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                              isSelected
                                ? selectedTab === 'bonus'
                                  ? 'bg-green-500 text-white border-green-500'
                                  : 'bg-red-500 text-white border-red-500'
                                : 'bg-white border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            {FAME_EVENT_LABELS[eventType]} ({value > 0 ? '+' : ''}{value})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Team Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedTeam('away');
                  setSelectedPlayerId('');
                  setSecondaryPlayerId('');
                }}
                className={`flex-1 py-2 px-4 rounded-lg border ${
                  selectedTeam === 'away'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white border-gray-300 hover:border-gray-400'
                }`}
              >
                {awayTeamName} (Away)
              </button>
              <button
                onClick={() => {
                  setSelectedTeam('home');
                  setSelectedPlayerId('');
                  setSecondaryPlayerId('');
                }}
                className={`flex-1 py-2 px-4 rounded-lg border ${
                  selectedTeam === 'home'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white border-gray-300 hover:border-gray-400'
                }`}
              >
                {homeTeamName} (Home)
              </button>
            </div>
          </div>

          {/* Primary Player Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Player
            </label>
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Select player...</option>
              {currentPlayers.map((player) => (
                <option key={player.playerId} value={player.playerId}>
                  {player.playerName} ({player.position})
                </option>
              ))}
            </select>
          </div>

          {/* Secondary Player Selection (if needed) */}
          {needsSecondaryPlayer && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {getSecondaryPlayerLabel()}
              </label>
              <select
                value={secondaryPlayerId}
                onChange={(e) => setSecondaryPlayerId(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Select player...</option>
                {/* For nut shot delivered/killed pitcher, secondary is from opposing team */}
                {(selectedEventType === 'NUT_SHOT_DELIVERED' ||
                  selectedEventType === 'NUT_SHOT_TOUGH_GUY' ||
                  selectedEventType === 'KILLED_PITCHER')
                  ? opposingPlayers.map((player) => (
                      <option key={player.playerId} value={player.playerId}>
                        {player.playerName} ({player.position})
                      </option>
                    ))
                  : currentPlayers
                      .filter(p => p.playerId !== selectedPlayerId)
                      .map((player) => (
                        <option key={player.playerId} value={player.playerId}>
                          {player.playerName} ({player.position})
                        </option>
                      ))
                }
              </select>
            </div>
          )}

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional context..."
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          {/* Preview */}
          {selectedEventType && selectedPlayer && (
            <div className={`p-3 rounded-lg mb-4 ${
              selectedTab === 'bonus' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="font-medium">
                {selectedTab === 'bonus' ? '⭐' : '💀'} {FAME_EVENT_LABELS[selectedEventType]}
              </div>
              <div className="text-sm text-gray-600">
                {selectedPlayer.playerName} ({currentTeamName}) -
                {' '}{FAME_VALUES[selectedEventType] > 0 ? '+' : ''}{FAME_VALUES[selectedEventType]} Fame
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedEventType || !selectedPlayerId}
            className={`px-4 py-2 rounded-lg text-white ${
              selectedEventType && selectedPlayerId
                ? selectedTab === 'bonus'
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-red-500 hover:bg-red-600'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            Add Fame Event
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// QUICK FAME BUTTONS COMPONENT
// For common events (Nut Shot, TOOTBLAN, etc.)
// ============================================

interface QuickFameButtonsProps {
  onOpenModal: (eventType?: FameEventType) => void;
}

export function QuickFameButtons({ onOpenModal }: QuickFameButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2 p-2 bg-gray-100 rounded-lg">
      <span className="text-xs font-semibold text-gray-500 w-full mb-1">
        Quick Fame Events:
      </span>
      <button
        onClick={() => onOpenModal('NUT_SHOT_DELIVERED')}
        className="px-2 py-1 text-xs bg-yellow-100 hover:bg-yellow-200 rounded border border-yellow-300"
        title="Batter delivers nut shot to fielder"
      >
        🥜 Nut Shot
      </button>
      <button
        onClick={() => onOpenModal('KILLED_PITCHER')}
        className="px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 rounded border border-orange-300"
        title="Comebacker hits pitcher"
      >
        💥 Killed Pitcher
      </button>
      <button
        onClick={() => onOpenModal('TOOTBLAN')}
        className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 rounded border border-red-300"
        title="Thrown Out On The Bases Like A Nincompoop"
      >
        🤦 TOOTBLAN
      </button>
      <button
        onClick={() => onOpenModal('WEB_GEM')}
        className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 rounded border border-green-300"
        title="Spectacular defensive play"
      >
        ⭐ Web Gem
      </button>
      <button
        onClick={() => onOpenModal('ROBBERY')}
        className="px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 rounded border border-purple-300"
        title="HR-saving catch"
      >
        🎭 Robbery
      </button>
      <button
        onClick={() => onOpenModal()}
        className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded border border-gray-400"
        title="Other fame events"
      >
        📝 Other...
      </button>
    </div>
  );
}

export default FameEventModal;
