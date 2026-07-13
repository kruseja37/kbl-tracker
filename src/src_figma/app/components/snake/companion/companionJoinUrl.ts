export function isLoopbackCompanionHost(hostname: string): boolean {
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '0.0.0.0'
    || hostname === '::'
    || hostname === '[::]'
    || hostname === '::1'
    || hostname === '[::1]';
}

export function resolveCompanionJoinUrl(currentOrigin: string, shareableOrigin?: string | null): string | null {
  const candidate = shareableOrigin?.trim() || currentOrigin;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)
      || url.username
      || url.password
      || isLoopbackCompanionHost(url.hostname)) return null;
    return `${url.origin}/snake-companion`;
  } catch {
    return null;
  }
}
