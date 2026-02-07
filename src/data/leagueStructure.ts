/**
 * League Structure Definitions
 *
 * Defines the organizational hierarchy for leagues available in KBL Tracker.
 * Each league can be selected when creating a new season.
 */

// ============================================
// TYPES
// ============================================

export interface Division {
  id: string;
  name: string;
  teamIds: string[];
}

export interface Conference {
  id: string;
  name: string;
  useDH: boolean;  // Whether this conference uses the Designated Hitter
  divisions: Division[];
}

export interface League {
  id: string;
  name: string;
  abbreviation: string;
  conferences: Conference[];
  freeAgentPoolId?: string;  // ID reference for free agents associated with this league
}

// ============================================
// SUPER MEGA LEAGUE (SMB4 Default)
// ============================================

export const SUPER_MEGA_LEAGUE: League = {
  id: 'sml',
  name: 'Super Mega League',
  abbreviation: 'SML',
  freeAgentPoolId: 'sml-fa',
  conferences: [
    {
      id: 'sml-super',
      name: 'Super Conference',
      useDH: true,
      divisions: [
        {
          id: 'sml-beast',
          name: 'Beast Division',
          teamIds: ['moose', 'herbisaurs', 'wild-pigs', 'freebooters', 'hot-corners']
        },
        {
          id: 'sml-boss',
          name: 'Boss Division',
          teamIds: ['sirloins', 'moonstars', 'blowfish', 'sawteeth', 'sand-cats']
        }
      ]
    },
    {
      id: 'sml-mega',
      name: 'Mega Conference',
      useDH: false,
      divisions: [
        {
          id: 'sml-epic',
          name: 'Epic Division',
          teamIds: ['wideloads', 'platypi', 'beewolves', 'grapplers', 'heaters']
        },
        {
          id: 'sml-monster',
          name: 'Monster Division',
          teamIds: ['overdogs', 'buzzards', 'crocodons', 'nemesis', 'jacks']
        }
      ]
    }
  ]
};

// ============================================
// MAJOR LEAGUE BASEBALL
// ============================================

export const MAJOR_LEAGUE_BASEBALL: League = {
  id: 'mlb',
  name: 'Major League Baseball',
  abbreviation: 'MLB',
  freeAgentPoolId: 'mlb-fa',
  conferences: [
    {
      id: 'mlb-al',
      name: 'American League',
      useDH: true,  // AL uses DH
      divisions: [
        {
          id: 'mlb-al-east',
          name: 'AL East',
          teamIds: ['blue-jays', 'yankees', 'orioles', 'rays', 'red-sox']
        },
        {
          id: 'mlb-al-central',
          name: 'AL Central',
          teamIds: ['white-sox', 'twins', 'indians', 'royals', 'tigers']
        },
        {
          id: 'mlb-al-west',
          name: 'AL West',
          teamIds: ['mariners', 'astros', 'angels', 'rangers', 'athletics']
        }
      ]
    },
    {
      id: 'mlb-nl',
      name: 'National League',
      useDH: false,  // NL traditionally no DH (though this changed in 2022)
      divisions: [
        {
          id: 'mlb-nl-east',
          name: 'NL East',
          teamIds: ['marlins', 'expos', 'phillies', 'mets', 'braves']
        },
        {
          id: 'mlb-nl-central',
          name: 'NL Central',
          teamIds: ['cardinals', 'reds', 'brewers', 'pirates', 'cubs']
        },
        {
          id: 'mlb-nl-west',
          name: 'NL West',
          teamIds: ['padres', 'dodgers', 'diamondbacks', 'rockies', 'giants']
        }
      ]
    }
  ]
};

// ============================================
// ALL AVAILABLE LEAGUES
// ============================================

export const LEAGUES: Record<string, League> = {
  'sml': SUPER_MEGA_LEAGUE,
  'mlb': MAJOR_LEAGUE_BASEBALL
};

// Helper to get all team IDs for a league
export function getLeagueTeamIds(leagueId: string): string[] {
  const league = LEAGUES[leagueId];
  if (!league) return [];

  const teamIds: string[] = [];
  for (const conference of league.conferences) {
    for (const division of conference.divisions) {
      teamIds.push(...division.teamIds);
    }
  }
  return teamIds;
}

// Helper to get conference for a team
export function getTeamConference(leagueId: string, teamId: string): Conference | null {
  const league = LEAGUES[leagueId];
  if (!league) return null;

  for (const conference of league.conferences) {
    for (const division of conference.divisions) {
      if (division.teamIds.includes(teamId)) {
        return conference;
      }
    }
  }
  return null;
}

// Helper to check if team uses DH
export function teamUsesDH(leagueId: string, teamId: string): boolean {
  const conference = getTeamConference(leagueId, teamId);
  return conference?.useDH ?? false;
}

// Helper to get division for a team
export function getTeamDivision(leagueId: string, teamId: string): Division | null {
  const league = LEAGUES[leagueId];
  if (!league) return null;

  for (const conference of league.conferences) {
    for (const division of conference.divisions) {
      if (division.teamIds.includes(teamId)) {
        return division;
      }
    }
  }
  return null;
}

// Check if two teams are rivals (same division)
export function areRivals(leagueId: string, teamA: string, teamB: string): boolean {
  if (!teamA || !teamB || teamA === teamB) return false;
  const divA = getTeamDivision(leagueId, teamA);
  const divB = getTeamDivision(leagueId, teamB);
  if (!divA || !divB) return false;
  return divA.id === divB.id;
}
