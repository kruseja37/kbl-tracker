/**
 * ActionSelector - Step 1 of the redesigned GameTracker flow
 *
 * Three primary buttons: HIT, OUT, OTHER
 * - HIT → prompts for hit location
 * - OUT → shows submenu: K (strikeout), KL (looking), Ball in Play (fielding sequence)
 * - OTHER → expands to show BB, IBB, HBP, D3K, SB, CS, PK, TBL, PB, WP, E
 *
 * Per GAMETRACKER_UI_DESIGN.md - positioned in left foul corner
 */

import { useState } from 'react';

// ============================================
// TYPES
// ============================================

export type PrimaryAction = 'HIT' | 'OUT' | 'OTHER';

export type StrikeoutType = 'K' | 'KL';

export type OtherAction =
  | 'BB'    // Walk
  | 'IBB'   // Intentional Walk
  | 'HBP'   // Hit By Pitch
  | 'D3K'   // Dropped Third Strike
  | 'SB'    // Stolen Base
  | 'CS'    // Caught Stealing
  | 'PK'    // Pickoff
  | 'TBL'   // TOOTBLAN
  | 'PB'    // Passed Ball
  | 'WP'    // Wild Pitch
  | 'E';    // Error

export interface ActionSelectorProps {
  /** Called when HIT is selected */
  onHit: () => void;
  /** Called when OUT (ball in play) is selected - proceeds to fielder drag */
  onOut: () => void;
  /** Called when a strikeout (K or KL) is selected - no fielder drag needed */
  onStrikeout: (type: StrikeoutType) => void;
  /** Called when an OTHER action is selected */
  onOtherAction: (action: OtherAction) => void;
  /** Whether buttons are disabled (e.g., during another flow) */
  disabled?: boolean;
  /** Currently active action (for highlighting) */
  activeAction?: PrimaryAction | null;
}

// ============================================
// BUTTON STYLES
// ============================================

const primaryBtnBase = `
  w-[110px] h-14 rounded-lg
  border-3 border-[#C4A853]
  text-base font-black uppercase tracking-wide
  hover:scale-105 active:scale-95 transition-all
  shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]
  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
`;

const otherBtnBase = `
  px-3 py-2 rounded-md
  border-2 border-[#C4A853]
  text-sm font-bold uppercase
  hover:scale-105 active:scale-95 transition-all
  shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]
  min-w-[48px]
`;

// ============================================
// OTHER ACTIONS CONFIG
// ============================================

interface OtherActionConfig {
  action: OtherAction;
  label: string;
  title: string;
  bgColor: string;
  textColor: string;
}

const OTHER_ACTIONS: OtherActionConfig[] = [
  { action: 'BB', label: 'BB', title: 'Walk (Base on Balls)', bgColor: 'bg-[#2E7D32]', textColor: 'text-[#E8F5E9]' },
  { action: 'IBB', label: 'IBB', title: 'Intentional Walk', bgColor: 'bg-[#1B5E20]', textColor: 'text-[#E8F5E9]' },
  { action: 'HBP', label: 'HBP', title: 'Hit By Pitch', bgColor: 'bg-[#E65100]', textColor: 'text-[#FFF3E0]' },
  { action: 'D3K', label: 'D3K', title: 'Dropped Third Strike', bgColor: 'bg-[#6A1B9A]', textColor: 'text-[#F3E5F5]' },
  { action: 'SB', label: 'SB', title: 'Stolen Base', bgColor: 'bg-[#0277BD]', textColor: 'text-[#E1F5FE]' },
  { action: 'CS', label: 'CS', title: 'Caught Stealing', bgColor: 'bg-[#C62828]', textColor: 'text-[#FFEBEE]' },
  { action: 'PK', label: 'PK', title: 'Pickoff', bgColor: 'bg-[#AD1457]', textColor: 'text-[#FCE4EC]' },
  { action: 'TBL', label: 'TBL', title: 'TOOTBLAN', bgColor: 'bg-[#880E4F]', textColor: 'text-[#FCE4EC]' },
  { action: 'PB', label: 'PB', title: 'Passed Ball', bgColor: 'bg-[#4527A0]', textColor: 'text-[#EDE7F6]' },
  { action: 'WP', label: 'WP', title: 'Wild Pitch', bgColor: 'bg-[#283593]', textColor: 'text-[#E8EAF6]' },
  { action: 'E', label: 'E', title: 'Error', bgColor: 'bg-[#BF360C]', textColor: 'text-[#FBE9E7]' },
];

// ============================================
// COMPONENT
// ============================================

export function ActionSelector({
  onHit,
  onOut,
  onStrikeout,
  onOtherAction,
  disabled = false,
  activeAction = null,
}: ActionSelectorProps) {
  const [showOtherMenu, setShowOtherMenu] = useState(false);
  const [showOutMenu, setShowOutMenu] = useState(false);

  const handleOutClick = () => {
    setShowOtherMenu(false);
    setShowOutMenu(!showOutMenu);
  };

  const handleOtherClick = () => {
    setShowOutMenu(false);
    setShowOtherMenu(!showOtherMenu);
  };

  const handleOtherAction = (action: OtherAction) => {
    setShowOtherMenu(false);
    onOtherAction(action);
  };

  const handleHit = () => {
    setShowOtherMenu(false);
    setShowOutMenu(false);
    onHit();
  };

  const handleStrikeout = (type: StrikeoutType) => {
    setShowOutMenu(false);
    onStrikeout(type);
  };

  const handleBallInPlay = () => {
    setShowOutMenu(false);
    onOut();
  };

  return (
    <div className="relative">
      {/* Primary Action Buttons */}
      <div className="flex flex-col gap-2 p-2 bg-[#1a1a1a]/90 rounded-lg border-2 border-[#C4A853]/50">
        {/* HIT Button */}
        <button
          onClick={handleHit}
          disabled={disabled}
          className={`${primaryBtnBase} bg-gradient-to-b from-[#2E7D32] to-[#1B5E20] text-[#E8F5E9] ${
            activeAction === 'HIT' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a]' : ''
          }`}
          title="Record a hit - click field location"
        >
          HIT
        </button>

        {/* OUT Button */}
        <button
          onClick={handleOutClick}
          disabled={disabled}
          className={`${primaryBtnBase} bg-gradient-to-b from-[#C62828] to-[#8B0000] text-[#FFEBEE] ${
            showOutMenu || activeAction === 'OUT' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a]' : ''
          }`}
          title="Record an out (K, KL, or Ball in Play)"
        >
          OUT
          <span className="ml-1 text-xs">{showOutMenu ? '▲' : '▼'}</span>
        </button>

        {/* OTHER Button */}
        <button
          onClick={handleOtherClick}
          disabled={disabled}
          className={`${primaryBtnBase} bg-gradient-to-b from-[#1565C0] to-[#0D47A1] text-[#E3F2FD] ${
            showOtherMenu || activeAction === 'OTHER' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a]' : ''
          }`}
          title="Other events (BB, HBP, SB, etc.)"
        >
          OTHER
          <span className="ml-1 text-xs">{showOtherMenu ? '▲' : '▼'}</span>
        </button>
      </div>

      {/* OUT Expansion Menu (K, KL, Ball in Play) */}
      {showOutMenu && (
        <div className="absolute left-full top-0 ml-2 p-2 bg-[#1a1a1a]/95 rounded-lg border-2 border-[#C4A853]/50 z-50">
          <div className="text-[10px] text-[#888] uppercase tracking-wider mb-2 px-1">
            Out Type
          </div>
          <div className="flex flex-col gap-1.5">
            {/* Strikeout Swinging */}
            <button
              onClick={() => handleStrikeout('K')}
              className={`${otherBtnBase} bg-gradient-to-b from-[#7B1FA2] to-[#4A148C] text-[#F3E5F5] min-w-[100px]`}
              title="Strikeout Swinging"
            >
              K
            </button>
            {/* Strikeout Looking */}
            <button
              onClick={() => handleStrikeout('KL')}
              className={`${otherBtnBase} bg-gradient-to-b from-[#6A1B9A] to-[#38006B] text-[#F3E5F5] min-w-[100px]`}
              title="Strikeout Looking"
            >
              KL
            </button>
            {/* Ball in Play */}
            <button
              onClick={handleBallInPlay}
              className={`${otherBtnBase} bg-gradient-to-b from-[#C62828] to-[#8B0000] text-[#FFEBEE] min-w-[100px]`}
              title="Ball in Play - drag fielder to ball location"
            >
              Ball in Play
            </button>
            {/* Back button */}
            <button
              onClick={() => setShowOutMenu(false)}
              className={`${otherBtnBase} bg-[#424242] text-[#E0E0E0]`}
              title="Close menu"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* OTHER Expansion Menu */}
      {showOtherMenu && (
        <div className="absolute left-full top-0 ml-2 p-2 bg-[#1a1a1a]/95 rounded-lg border-2 border-[#C4A853]/50 z-50">
          <div className="text-[10px] text-[#888] uppercase tracking-wider mb-2 px-1">
            Other Events
          </div>

          {/* Row 1: Batter outcomes */}
          <div className="flex gap-1.5 mb-1.5">
            {OTHER_ACTIONS.slice(0, 4).map((cfg) => (
              <button
                key={cfg.action}
                onClick={() => handleOtherAction(cfg.action)}
                className={`${otherBtnBase} ${cfg.bgColor} ${cfg.textColor}`}
                title={cfg.title}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Row 2: Runner events */}
          <div className="flex gap-1.5 mb-1.5">
            {OTHER_ACTIONS.slice(4, 8).map((cfg) => (
              <button
                key={cfg.action}
                onClick={() => handleOtherAction(cfg.action)}
                className={`${otherBtnBase} ${cfg.bgColor} ${cfg.textColor}`}
                title={cfg.title}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Row 3: Miscellaneous */}
          <div className="flex gap-1.5">
            {OTHER_ACTIONS.slice(8).map((cfg) => (
              <button
                key={cfg.action}
                onClick={() => handleOtherAction(cfg.action)}
                className={`${otherBtnBase} ${cfg.bgColor} ${cfg.textColor}`}
                title={cfg.title}
              >
                {cfg.label}
              </button>
            ))}
            {/* Back button */}
            <button
              onClick={() => setShowOtherMenu(false)}
              className={`${otherBtnBase} bg-[#424242] text-[#E0E0E0]`}
              title="Close menu"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// EXPORTS
// ============================================

export default ActionSelector;
