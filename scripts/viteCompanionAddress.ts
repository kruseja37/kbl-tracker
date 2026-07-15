import type { Connect, Plugin, PreviewServer, ResolvedServerUrls, ViteDevServer } from 'vite';

export const COMPANION_ADDRESS_ENDPOINT = '/__kbl/companion-address';

function isLoopbackHostname(hostname: string): boolean {
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '0.0.0.0'
    || hostname === '::'
    || hostname === '[::]'
    || hostname === '::1'
    || hostname === '[::1]';
}

function usableNetworkOrigin(candidate: string): string | null {
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)
      || url.username
      || url.password
      || isLoopbackHostname(url.hostname)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function resolveCompanionServerOrigin(resolvedUrls: ResolvedServerUrls | null): string | null {
  for (const candidate of resolvedUrls?.network ?? []) {
    const origin = usableNetworkOrigin(candidate);
    if (origin) return origin;
  }
  return null;
}

type CompanionAddressServer = Pick<ViteDevServer | PreviewServer, 'middlewares' | 'resolvedUrls'>;

function attachCompanionAddressEndpoint(server: CompanionAddressServer): void {
  const middleware: Connect.NextHandleFunction = (request, response, next) => {
    if (request.url?.split('?')[0] !== COMPANION_ADDRESS_ENDPOINT) {
      next();
      return;
    }
    const origin = resolveCompanionServerOrigin(server.resolvedUrls);
    response.statusCode = 200;
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ origin }));
  };
  server.middlewares.use(middleware);
}

export function companionAddressPlugin(): Plugin {
  return {
    name: 'kbl-companion-address',
    configureServer(server) {
      attachCompanionAddressEndpoint(server);
    },
    configurePreviewServer(server) {
      attachCompanionAddressEndpoint(server);
    },
  };
}
