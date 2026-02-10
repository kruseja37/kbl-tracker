/**
 * Headlines Generator (GAP-B10-009)
 * Per KBL_XHD_TRACKER_MASTER_SPEC_v3.md §26
 *
 * Pre-game, post-game, and season headline templates with priority ordering.
 */

// ============================================
// TYPES
// ============================================

export type HeadlineCategory = 'PREGAME' | 'POSTGAME' | 'SEASON';

export type PregameHeadlineType =
  | 'REVENGE_GAME' | 'COMEBACK_WATCH' | 'ROOKIE_DEBUT'
  | 'MILESTONE_CHASE' | 'RIVALRY_SHOWDOWN' | 'ACE_DUEL'
  | 'SLUMP_BUSTER' | 'HOT_STREAK';

export type PostgameHeadlineType =
  | 'PERFECT_GAME' | 'NO_HITTER' | 'WALK_OFF'
  | 'MILESTONE_ACHIEVED' | 'COMEBACK_WIN' | 'REVENGE_SUCCESS'
  | 'ROOKIE_SPLASH' | 'CLUTCH_MOMENT' | 'BLOWOUT' | 'COLLAPSE';

export type SeasonHeadlineType =
  | 'PLAYOFF_RACE' | 'RUNAWAY_DIVISION' | 'CINDERELLA'
  | 'DISAPPOINTMENT' | 'MVP_RACE' | 'TRADE_DEADLINE'
  | 'SEPTEMBER_SURGE';

export interface Headline {
  type: PregameHeadlineType | PostgameHeadlineType | SeasonHeadlineType;
  category: HeadlineCategory;
  priority: number;   // Lower = higher priority
  text: string;
  subtext?: string;
}

// ============================================
// HEADLINE TEMPLATES
// ============================================

export const PREGAME_TEMPLATES: Record<PregameHeadlineType, {
  template: string;
  priority: number;
}> = {
  REVENGE_GAME: { template: '{player} returns to face {formerTeam} for the first time', priority: 1 },
  COMEBACK_WATCH: { template: '{player} looks to bounce back after rough stretch', priority: 5 },
  ROOKIE_DEBUT: { template: '{player} makes franchise debut tonight', priority: 2 },
  MILESTONE_CHASE: { template: '{player} just {n} away from {milestone}', priority: 3 },
  RIVALRY_SHOWDOWN: { template: '{team1} vs {team2}: Rivalry renewed', priority: 4 },
  ACE_DUEL: { template: '{pitcher1} vs {pitcher2}: Aces on the mound', priority: 6 },
  SLUMP_BUSTER: { template: '{player} hitless in last {n} games', priority: 7 },
  HOT_STREAK: { template: '{player} riding {n}-game hitting streak', priority: 8 },
};

export const POSTGAME_TEMPLATES: Record<PostgameHeadlineType, {
  template: string;
  priority: number;
}> = {
  PERFECT_GAME: { template: '{pitcher} throws a PERFECT GAME!', priority: 1 },
  NO_HITTER: { template: '{pitcher} throws a NO-HITTER!', priority: 2 },
  WALK_OFF: { template: '{player} walks it off! {team} wins in dramatic fashion', priority: 3 },
  MILESTONE_ACHIEVED: { template: '{player} reaches {milestone}!', priority: 4 },
  COMEBACK_WIN: { template: '{team} overcomes {deficit}-run deficit for stunning comeback', priority: 5 },
  REVENGE_SUCCESS: { template: '{player} haunts former team with {performance}!', priority: 6 },
  ROOKIE_SPLASH: { template: '{player} makes a splash in debut performance', priority: 7 },
  CLUTCH_MOMENT: { template: '{player} delivers in the clutch for {team}', priority: 8 },
  BLOWOUT: { template: '{winner} cruises past {loser}, {score}', priority: 9 },
  COLLAPSE: { template: '{team} blows {lead}-run lead in devastating collapse', priority: 10 },
};

export const SEASON_TEMPLATES: Record<SeasonHeadlineType, {
  template: string;
  priority: number;
}> = {
  PLAYOFF_RACE: { template: '{n} teams within {games} games in {division}', priority: 1 },
  RUNAWAY_DIVISION: { template: '{team} running away with {division} title', priority: 4 },
  CINDERELLA: { template: '{team} exceeding all expectations this season', priority: 2 },
  DISAPPOINTMENT: { template: '{team} falling short of preseason expectations', priority: 5 },
  MVP_RACE: { template: 'MVP Watch: {player1} vs {player2}', priority: 3 },
  TRADE_DEADLINE: { template: 'Trade Deadline looms as contenders look to buy', priority: 6 },
  SEPTEMBER_SURGE: { template: '{team} making late-season push for playoffs', priority: 7 },
};

// ============================================
// HEADLINE GENERATORS
// ============================================

/**
 * Generate pre-game headlines from game context.
 */
export function generatePregameHeadlines(context: {
  revengePlayer?: { name: string; formerTeam: string };
  rookieDebut?: { name: string };
  milestoneChase?: { name: string; n: number; milestone: string };
  rivalry?: { team1: string; team2: string };
  aceDuel?: { pitcher1: string; pitcher2: string };
  slumpPlayer?: { name: string; games: number };
  hotStreak?: { name: string; games: number };
}): Headline[] {
  const headlines: Headline[] = [];

  if (context.revengePlayer) {
    headlines.push({
      type: 'REVENGE_GAME',
      category: 'PREGAME',
      priority: PREGAME_TEMPLATES.REVENGE_GAME.priority,
      text: PREGAME_TEMPLATES.REVENGE_GAME.template
        .replace('{player}', context.revengePlayer.name)
        .replace('{formerTeam}', context.revengePlayer.formerTeam),
    });
  }

  if (context.rookieDebut) {
    headlines.push({
      type: 'ROOKIE_DEBUT',
      category: 'PREGAME',
      priority: PREGAME_TEMPLATES.ROOKIE_DEBUT.priority,
      text: PREGAME_TEMPLATES.ROOKIE_DEBUT.template
        .replace('{player}', context.rookieDebut.name),
    });
  }

  if (context.milestoneChase) {
    headlines.push({
      type: 'MILESTONE_CHASE',
      category: 'PREGAME',
      priority: PREGAME_TEMPLATES.MILESTONE_CHASE.priority,
      text: PREGAME_TEMPLATES.MILESTONE_CHASE.template
        .replace('{player}', context.milestoneChase.name)
        .replace('{n}', String(context.milestoneChase.n))
        .replace('{milestone}', context.milestoneChase.milestone),
    });
  }

  if (context.rivalry) {
    headlines.push({
      type: 'RIVALRY_SHOWDOWN',
      category: 'PREGAME',
      priority: PREGAME_TEMPLATES.RIVALRY_SHOWDOWN.priority,
      text: PREGAME_TEMPLATES.RIVALRY_SHOWDOWN.template
        .replace('{team1}', context.rivalry.team1)
        .replace('{team2}', context.rivalry.team2),
    });
  }

  if (context.aceDuel) {
    headlines.push({
      type: 'ACE_DUEL',
      category: 'PREGAME',
      priority: PREGAME_TEMPLATES.ACE_DUEL.priority,
      text: PREGAME_TEMPLATES.ACE_DUEL.template
        .replace('{pitcher1}', context.aceDuel.pitcher1)
        .replace('{pitcher2}', context.aceDuel.pitcher2),
    });
  }

  if (context.slumpPlayer && context.slumpPlayer.games >= 5) {
    headlines.push({
      type: 'SLUMP_BUSTER',
      category: 'PREGAME',
      priority: PREGAME_TEMPLATES.SLUMP_BUSTER.priority,
      text: PREGAME_TEMPLATES.SLUMP_BUSTER.template
        .replace('{player}', context.slumpPlayer.name)
        .replace('{n}', String(context.slumpPlayer.games)),
    });
  }

  if (context.hotStreak && context.hotStreak.games >= 10) {
    headlines.push({
      type: 'HOT_STREAK',
      category: 'PREGAME',
      priority: PREGAME_TEMPLATES.HOT_STREAK.priority,
      text: PREGAME_TEMPLATES.HOT_STREAK.template
        .replace('{player}', context.hotStreak.name)
        .replace('{n}', String(context.hotStreak.games)),
    });
  }

  return headlines.sort((a, b) => a.priority - b.priority);
}

/**
 * Generate the top post-game headline from game result.
 */
export function generatePostgameHeadline(context: {
  perfectGame?: { pitcher: string };
  noHitter?: { pitcher: string };
  walkOff?: { player: string; team: string };
  milestone?: { player: string; milestone: string };
  comebackWin?: { team: string; deficit: number };
  revengeSuccess?: { player: string; performance: string };
  rookieSplash?: { player: string };
  blowout?: { winner: string; loser: string; score: string };
  collapse?: { team: string; lead: number };
  winner: string;
  loser: string;
  score: string;
}): Headline {
  // Check in priority order
  if (context.perfectGame) {
    return {
      type: 'PERFECT_GAME', category: 'POSTGAME',
      priority: 1,
      text: POSTGAME_TEMPLATES.PERFECT_GAME.template
        .replace('{pitcher}', context.perfectGame.pitcher),
    };
  }

  if (context.noHitter) {
    return {
      type: 'NO_HITTER', category: 'POSTGAME',
      priority: 2,
      text: POSTGAME_TEMPLATES.NO_HITTER.template
        .replace('{pitcher}', context.noHitter.pitcher),
    };
  }

  if (context.walkOff) {
    return {
      type: 'WALK_OFF', category: 'POSTGAME',
      priority: 3,
      text: POSTGAME_TEMPLATES.WALK_OFF.template
        .replace('{player}', context.walkOff.player)
        .replace('{team}', context.walkOff.team),
    };
  }

  if (context.milestone) {
    return {
      type: 'MILESTONE_ACHIEVED', category: 'POSTGAME',
      priority: 4,
      text: POSTGAME_TEMPLATES.MILESTONE_ACHIEVED.template
        .replace('{player}', context.milestone.player)
        .replace('{milestone}', context.milestone.milestone),
    };
  }

  if (context.comebackWin && context.comebackWin.deficit >= 5) {
    return {
      type: 'COMEBACK_WIN', category: 'POSTGAME',
      priority: 5,
      text: POSTGAME_TEMPLATES.COMEBACK_WIN.template
        .replace('{team}', context.comebackWin.team)
        .replace('{deficit}', String(context.comebackWin.deficit)),
    };
  }

  if (context.revengeSuccess) {
    return {
      type: 'REVENGE_SUCCESS', category: 'POSTGAME',
      priority: 6,
      text: POSTGAME_TEMPLATES.REVENGE_SUCCESS.template
        .replace('{player}', context.revengeSuccess.player)
        .replace('{performance}', context.revengeSuccess.performance),
    };
  }

  if (context.collapse && context.collapse.lead >= 5) {
    return {
      type: 'COLLAPSE', category: 'POSTGAME',
      priority: 10,
      text: POSTGAME_TEMPLATES.COLLAPSE.template
        .replace('{team}', context.collapse.team)
        .replace('{lead}', String(context.collapse.lead)),
    };
  }

  // Default: blowout or generic
  const scoreDiff = parseInt(context.score.split('-')[0]) - parseInt(context.score.split('-')[1]);
  if (Math.abs(scoreDiff) >= 7) {
    return {
      type: 'BLOWOUT', category: 'POSTGAME',
      priority: 9,
      text: POSTGAME_TEMPLATES.BLOWOUT.template
        .replace('{winner}', context.winner)
        .replace('{loser}', context.loser)
        .replace('{score}', context.score),
    };
  }

  // Clutch moment fallback
  return {
    type: 'CLUTCH_MOMENT', category: 'POSTGAME',
    priority: 8,
    text: `${context.winner} defeats ${context.loser}, ${context.score}`,
  };
}
