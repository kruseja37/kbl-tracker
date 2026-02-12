/**
 * Player Name with Morale Superscript
 * Per BUG-010 and KBL_XHD_TRACKER_MASTER_SPEC_v3.md
 *
 * Displays player name with colored morale superscript.
 * Example: "Jock McGroin⁷⁸" where 78 is in green
 */

import React from 'react';
import { getMoraleDisplay, getPlaceholderMorale } from '../../utils/playerMorale';

interface PlayerNameWithMoraleProps {
  name: string;
  morale?: number; // If not provided, uses placeholder based on personality
  personality?: string; // Used for placeholder calculation
  showMorale?: boolean; // Toggle morale display on/off
  style?: React.CSSProperties;
  onClick?: () => void;
}

/**
 * Player name with colored morale superscript
 */
export function PlayerNameWithMorale({
  name,
  morale,
  personality,
  showMorale = true,
  style,
  onClick,
}: PlayerNameWithMoraleProps) {
  // Use provided morale or calculate placeholder
  const actualMorale = morale ?? getPlaceholderMorale(personality);
  const display = getMoraleDisplay(actualMorale);

  return (
    <span
      style={{
        cursor: onClick ? 'pointer' : 'inherit',
        ...style,
      }}
      onClick={onClick}
      title={showMorale ? `Morale: ${display.value} (${display.state})` : undefined}
    >
      {name}
      {showMorale && (
        <span
          style={{
            color: display.color,
            fontSize: '0.75em',
            verticalAlign: 'super',
            marginLeft: '1px',
            fontWeight: 600,
          }}
        >
          {display.superscript}
        </span>
      )}
    </span>
  );
}

export default PlayerNameWithMorale;
