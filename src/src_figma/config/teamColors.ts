// Team color configuration for KBL Tracker
// This file stores all team branding colors for consistent application across the app

export interface TeamColors {
  id: string;
  name: string;
  abbreviation: string;
  primary: string;      // Main team color
  secondary: string;    // Secondary team color
  accent?: string;      // Optional accent color
  text: string;         // Text color for readability on primary background
  border: string;       // Border color for UI elements
  stadium?: string;     // Stadium name
}

export const teamColors: Record<string, TeamColors> = {
  tigers: {
    id: 'tigers',
    name: 'Tigers',
    abbreviation: 'TIG',
    primary: '#FF6600',      // Orange
    secondary: '#001489',    // Navy blue
    accent: '#FFFFFF',       // White
    text: '#FFFFFF',         // White text
    border: '#001489',       // Navy border
    stadium: 'COMERICA PARK',
  },
  
  sox: {
    id: 'sox',
    name: 'Sox',
    abbreviation: 'SOX',
    primary: '#DD0000',      // Red
    secondary: '#FFFFFF',    // White
    accent: '#000000',       // Black
    text: '#FFFFFF',         // White text
    border: '#000000',       // Black border
    stadium: 'FENWAY PARK',
  },

  // Easy to add more teams:
  // yankees: {
  //   id: 'yankees',
  //   name: 'Yankees',
  //   abbreviation: 'NYY',
  //   primary: '#003087',    // Navy
  //   secondary: '#FFFFFF',  // White
  //   text: '#FFFFFF',
  //   border: '#003087',
  // },
  
  // dodgers: {
  //   id: 'dodgers',
  //   name: 'Dodgers',
  //   abbreviation: 'LAD',
  //   primary: '#005A9C',    // Dodger blue
  //   secondary: '#FFFFFF',  // White
  //   accent: '#EF3E42',     // Red
  //   text: '#FFFFFF',
  //   border: '#005A9C',
  // },
};

// Helper function to get team colors by ID
export function getTeamColors(teamId: string): TeamColors {
  return teamColors[teamId] || teamColors.sox; // Default fallback
}

// Helper function to get alternating fielder border colors
export function getFielderBorderColors(teamId: string): [string, string] {
  const colors = getTeamColors(teamId);
  return [colors.primary, colors.secondary];
}