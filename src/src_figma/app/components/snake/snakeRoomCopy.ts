export function snakeRoomMissingLegCopy(input: {
  league: boolean;
  pool: boolean;
  session: boolean;
}): string {
  const missing = [
    !input.league ? 'LEAGUE' : null,
    !input.pool ? 'SAVED DRAFT POOL' : null,
    !input.session ? 'DRAFT SESSION' : null,
  ].filter((value): value is string => Boolean(value));
  const subject = missing.length > 1
    ? `${missing.slice(0, -1).join(', ')} AND ${missing.at(-1)}`
    : missing[0] ?? 'ROOM DATA';
  return `THE ${subject} ${missing.length === 1 ? 'IS' : 'ARE'} MISSING.`;
}
