export const COMPANION_AUTH_UNREACHABLE_COPY = 'AUTH SERVICE UNREACHABLE — CHECK PROJECT CONNECTION.';

export function companionAuthErrorCopy(cause: unknown): string | null {
  const message = cause instanceof Error
    ? cause.message
    : typeof cause === 'string'
      ? cause
      : '';
  if (!message) return null;
  if (/load failed|failed to fetch|network(?:error| request failed)|fetch.*failed/i.test(message)) {
    return COMPANION_AUTH_UNREACHABLE_COPY;
  }
  return message;
}
