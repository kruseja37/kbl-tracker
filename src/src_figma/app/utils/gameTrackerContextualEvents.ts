import type { SpecialEventType } from './gameTrackerFieldTypes';

export interface PlayContext {
  playType: 'FO' | 'LO' | 'GO' | 'K' | '1B' | '2B' | '3B' | 'HR' | 'FC' | null;
  firstFielder: number | null;
  ballLocationY: number | null;
  throwSequence: number[];
  runnerOut: boolean;
  throwTarget: number | null;
  timestamp: number;
}

export const CONTEXTUAL_BUTTONS_TIMEOUT = 3000;

export function inferContextualButtons(ctx: PlayContext | null): SpecialEventType[] {
  const buttons: SpecialEventType[] = [];

  buttons.push('SEVEN_PLUS_PITCH_AB');

  if (!ctx) {
    console.log('[ContextualButtons] No context, returning only 7+ PITCH');
    return buttons;
  }

  console.log('[ContextualButtons] Inferring from context:', {
    playType: ctx.playType,
    firstFielder: ctx.firstFielder,
    ballLocationY: ctx.ballLocationY?.toFixed(2),
    throwSequence: ctx.throwSequence,
    runnerOut: ctx.runnerOut,
    throwTarget: ctx.throwTarget,
  });

  const isOutfielder = [7, 8, 9].includes(ctx.firstFielder ?? 0);
  const isDeepFly = ctx.ballLocationY !== null && ctx.ballLocationY > 0.7;
  const isWallCatch = ctx.ballLocationY !== null && ctx.ballLocationY > 0.9;

  if (['FO', 'LO'].includes(ctx.playType ?? '') && isOutfielder) {
    if (isWallCatch) {
      buttons.push('ROBBERY');
      buttons.push('WEB_GEM');
    } else if (isDeepFly) {
      buttons.push('WEB_GEM');
    }
  }

  if (isOutfielder && isDeepFly && !buttons.includes('WEB_GEM')) {
    buttons.push('WEB_GEM');
  }

  if (ctx.firstFielder === 1) {
    buttons.push('KILLED_PITCHER');
    buttons.push('NUT_SHOT');
  }

  if (['FO', 'LO', 'GO', 'FC'].includes(ctx.playType ?? '')) {
    buttons.push('TOOTBLAN');
  }

  if (ctx.runnerOut && !buttons.includes('TOOTBLAN')) {
    buttons.push('TOOTBLAN');
  }

  if (ctx.playType === '1B' && ctx.ballLocationY !== null && ctx.ballLocationY < 0.5) {
    buttons.push('BEAT_THROW');
    buttons.push('BUNT');
  }

  console.log('[ContextualButtons] Inferred buttons:', buttons);
  return buttons;
}

export function getEventEmoji(eventType: SpecialEventType): string {
  switch (eventType) {
    case 'ROBBERY': return '🎭';
    case 'WEB_GEM': return '⭐';
    case 'TOOTBLAN': return '🤦';
    case 'KILLED_PITCHER': return '💥';
    case 'NUT_SHOT': return '🥜';
    case 'BEAT_THROW': return '🏃';
    case 'BUNT': return '🏏';
    case 'STRIKEOUT': return 'K';
    case 'STRIKEOUT_LOOKING': return 'Ꝅ';
    case 'DROPPED_3RD_STRIKE': return 'D3K';
    case 'SEVEN_PLUS_PITCH_AB': return '7️⃣';
    default: return '❓';
  }
}

export function getEventLabel(eventType: SpecialEventType): string {
  switch (eventType) {
    case 'ROBBERY': return 'ROBBERY';
    case 'WEB_GEM': return 'WEB GEM';
    case 'TOOTBLAN': return 'TOOTBLAN';
    case 'KILLED_PITCHER': return 'KILLED';
    case 'NUT_SHOT': return 'NUTSHOT';
    case 'BEAT_THROW': return 'BEAT THROW';
    case 'BUNT': return 'BUNT';
    case 'STRIKEOUT': return 'K';
    case 'STRIKEOUT_LOOKING': return 'LOOKING';
    case 'DROPPED_3RD_STRIKE': return 'D3K';
    case 'SEVEN_PLUS_PITCH_AB': return '7+ PITCH';
    default: return eventType;
  }
}
