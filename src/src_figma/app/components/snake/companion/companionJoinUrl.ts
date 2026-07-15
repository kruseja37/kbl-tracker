export function isLoopbackCompanionHost(hostname: string): boolean {
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '0.0.0.0'
    || hostname === '::'
    || hostname === '[::]'
    || hostname === '::1'
    || hostname === '[::1]';
}

export const COMPANION_ADDRESS_ENDPOINT = '/__kbl/companion-address';

export function companionRoomCodeFromSearch(search: string): string {
  const roomCode = new URLSearchParams(search).get('room') ?? '';
  return /^\d{4}$/.test(roomCode) ? roomCode : '';
}

export function resolveCompanionJoinUrl(
  currentOrigin: string,
  shareableOrigin?: string | null,
  roomCode?: string | null,
): string | null {
  const candidate = shareableOrigin?.trim() || currentOrigin;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)
      || url.username
      || url.password
      || isLoopbackCompanionHost(url.hostname)) return null;
    const joinUrl = new URL('/snake-companion', url.origin);
    if (roomCode && /^\d{4}$/.test(roomCode)) joinUrl.searchParams.set('room', roomCode);
    return joinUrl.toString();
  } catch {
    return null;
  }
}

export async function discoverCompanionOrigin(
  fetcher: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const response = await fetcher(COMPANION_ADDRESS_ENDPOINT, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return null;
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== 'object' || !('origin' in payload)) return null;
    const origin = (payload as { origin?: unknown }).origin;
    if (typeof origin !== 'string') return null;
    const resolved = resolveCompanionJoinUrl(origin);
    return resolved ? new URL(resolved).origin : null;
  } catch {
    return null;
  }
}
