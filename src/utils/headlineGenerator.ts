/**
 * Post-Game Headline Generator
 * Per Ralph Framework S-B018
 *
 * Generates contextual headlines based on game outcome:
 * - Blowout vs close game
 * - Walkoff
 * - Shutout
 * - Pitcher dominance
 * - Offensive explosion
 */

interface HeadlineContext {
  winningTeam: string;
  losingTeam: string;
  winningScore: number;
  losingScore: number;
  isWalkoff: boolean;
  isShutout: boolean;
  inningsPlayed: number;
  topPerformer?: {
    name: string;
    statLine: string;
    type: 'batter' | 'pitcher';
  };
  winningPitcher?: {
    name: string;
    strikeouts: number;
    ip: number;
  };
}

interface Headline {
  text: string;
  reporter: string;
  tone: 'exciting' | 'routine' | 'dominant' | 'dramatic';
}

// Reporter names for bylines
const REPORTERS = [
  'Max Sterling',
  'Dana Cruz',
  'Tony Malone',
  'Rachel Kim',
  'Chris Hawkins',
  'Jordan Blake',
  'Sam Novak',
  'Morgan Cole',
];

/**
 * Generate a contextual headline for the game
 */
export function generateHeadline(context: HeadlineContext): Headline {
  const margin = context.winningScore - context.losingScore;
  const totalRuns = context.winningScore + context.losingScore;

  // Pick reporter
  const reporter = REPORTERS[Math.floor(Math.random() * REPORTERS.length)];

  // Walkoff takes priority
  if (context.isWalkoff) {
    return {
      text: generateWalkoffHeadline(context),
      reporter,
      tone: 'dramatic',
    };
  }

  // Shutout
  if (context.isShutout) {
    return {
      text: generateShutoutHeadline(context),
      reporter,
      tone: 'dominant',
    };
  }

  // Extra innings
  if (context.inningsPlayed > 9) {
    return {
      text: generateExtraInningsHeadline(context),
      reporter,
      tone: 'dramatic',
    };
  }

  // Blowout (5+ run margin)
  if (margin >= 5) {
    return {
      text: generateBlowoutHeadline(context, margin),
      reporter,
      tone: 'dominant',
    };
  }

  // High-scoring game (10+ total runs)
  if (totalRuns >= 10) {
    return {
      text: generateSlugestHeadline(context),
      reporter,
      tone: 'exciting',
    };
  }

  // Close game (1-2 run margin)
  if (margin <= 2) {
    return {
      text: generateCloseGameHeadline(context),
      reporter,
      tone: 'exciting',
    };
  }

  // Default routine victory
  return {
    text: generateRoutineHeadline(context),
    reporter,
    tone: 'routine',
  };
}

function generateWalkoffHeadline(ctx: HeadlineContext): string {
  const templates = [
    `${ctx.winningTeam} Walk Off With Dramatic ${ctx.winningScore}-${ctx.losingScore} Victory`,
    `Walkoff Magic: ${ctx.winningTeam} Stun ${ctx.losingTeam} ${ctx.winningScore}-${ctx.losingScore}`,
    `${ctx.winningTeam} Cap Thrilling Finish With Walkoff Win`,
    `Last-Second Heroics: ${ctx.winningTeam} Edge ${ctx.losingTeam}`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function generateShutoutHeadline(ctx: HeadlineContext): string {
  const templates = [
    `${ctx.winningTeam} Blank ${ctx.losingTeam} ${ctx.winningScore}-0`,
    `Pitching Dominance: ${ctx.winningTeam} Shut Out ${ctx.losingTeam}`,
    `${ctx.losingTeam} Silenced in ${ctx.winningScore}-0 Loss`,
    `Masterful Performance: ${ctx.winningTeam} Record Shutout Victory`,
  ];

  // If we have pitcher info, personalize
  if (ctx.winningPitcher && ctx.winningPitcher.strikeouts >= 8) {
    return `${ctx.winningPitcher.name} Dominates With ${ctx.winningPitcher.strikeouts} Strikeouts in Shutout`;
  }

  return templates[Math.floor(Math.random() * templates.length)];
}

function generateExtraInningsHeadline(ctx: HeadlineContext): string {
  const templates = [
    `${ctx.winningTeam} Outlast ${ctx.losingTeam} in ${ctx.inningsPlayed}-Inning Marathon`,
    `${ctx.inningsPlayed} Innings Later: ${ctx.winningTeam} Edge ${ctx.losingTeam} ${ctx.winningScore}-${ctx.losingScore}`,
    `Extra-Innings Drama: ${ctx.winningTeam} Prevail ${ctx.winningScore}-${ctx.losingScore}`,
    `${ctx.winningTeam} Win Epic ${ctx.inningsPlayed}-Inning Battle`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function generateBlowoutHeadline(ctx: HeadlineContext, margin: number): string {
  const templates = [
    `${ctx.winningTeam} Crush ${ctx.losingTeam} ${ctx.winningScore}-${ctx.losingScore}`,
    `${ctx.winningTeam} Dominate in ${margin}-Run Rout`,
    `${ctx.losingTeam} Overwhelmed: ${ctx.winningTeam} Win ${ctx.winningScore}-${ctx.losingScore}`,
    `Offensive Explosion Propels ${ctx.winningTeam} Past ${ctx.losingTeam}`,
  ];

  // Personalize with top performer if available
  if (ctx.topPerformer && ctx.topPerformer.type === 'batter') {
    return `${ctx.topPerformer.name} Leads ${ctx.winningTeam} to ${ctx.winningScore}-${ctx.losingScore} Victory`;
  }

  return templates[Math.floor(Math.random() * templates.length)];
}

function generateSlugestHeadline(ctx: HeadlineContext): string {
  const templates = [
    `${ctx.winningTeam} Outslug ${ctx.losingTeam} ${ctx.winningScore}-${ctx.losingScore}`,
    `Bats Boom as ${ctx.winningTeam} Top ${ctx.losingTeam} in High-Scoring Affair`,
    `Offensive Fireworks: ${ctx.winningTeam} Edge ${ctx.losingTeam} ${ctx.winningScore}-${ctx.losingScore}`,
    `${ctx.winningTeam}, ${ctx.losingTeam} Trade Blows; ${ctx.winningTeam} Prevail`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function generateCloseGameHeadline(ctx: HeadlineContext): string {
  const templates = [
    `${ctx.winningTeam} Edge ${ctx.losingTeam} ${ctx.winningScore}-${ctx.losingScore}`,
    `${ctx.winningTeam} Squeeze Past ${ctx.losingTeam} in Tight Contest`,
    `Nail-Biter: ${ctx.winningTeam} Hold Off ${ctx.losingTeam} ${ctx.winningScore}-${ctx.losingScore}`,
    `${ctx.winningTeam} Survive Scare, Beat ${ctx.losingTeam}`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function generateRoutineHeadline(ctx: HeadlineContext): string {
  const templates = [
    `${ctx.winningTeam} Defeat ${ctx.losingTeam} ${ctx.winningScore}-${ctx.losingScore}`,
    `${ctx.winningTeam} Top ${ctx.losingTeam} ${ctx.winningScore}-${ctx.losingScore}`,
    `${ctx.winningTeam} Handle ${ctx.losingTeam} ${ctx.winningScore}-${ctx.losingScore}`,
    `Solid Victory: ${ctx.winningTeam} Beat ${ctx.losingTeam}`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Get headline tone color for styling
 */
export function getHeadlineToneColor(tone: Headline['tone']): string {
  const colors: Record<string, string> = {
    exciting: '#f59e0b',
    routine: '#64748b',
    dominant: '#22c55e',
    dramatic: '#ef4444',
  };
  return colors[tone] || colors.routine;
}

/**
 * Generate subheadline / summary
 */
export function generateSubheadline(context: HeadlineContext): string {
  if (context.topPerformer) {
    return `${context.topPerformer.name}: ${context.topPerformer.statLine}`;
  }

  if (context.winningPitcher) {
    return `WP: ${context.winningPitcher.name} (${context.winningPitcher.ip} IP, ${context.winningPitcher.strikeouts} K)`;
  }

  return `Final: ${context.winningTeam} ${context.winningScore}, ${context.losingTeam} ${context.losingScore}`;
}
