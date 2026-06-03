import { loadStoredTokens, getRefreshToken, clearStoredTokens } from './tokenStore';
import { refreshAuthSession } from './refreshSession';

type SessionHandlers = {
  onRefreshed: (accessToken: string) => void;
  onExpired: () => void;
};

let handlers: SessionHandlers | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function registerAuthSessionHandlers(next: SessionHandlers): () => void {
  handlers = next;
  return () => {
    if (handlers === next) handlers = null;
  };
}

export function getStoredAccessToken(): string | null {
  return loadStoredTokens()?.accessToken ?? null;
}

export async function getValidAccessToken(): Promise<string | null> {
  const stored = loadStoredTokens();
  if (!stored) return null;

  const refreshToken = getRefreshToken();
  if (!refreshToken) return stored.accessToken;

  const expiresSoon =
    Number.isFinite(stored.expiresAtMs)
    && stored.expiresAtMs - Date.now() < 5 * 60 * 1000;

  if (!expiresSoon) return stored.accessToken;

  return refreshAccessToken();
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      handlers?.onExpired();
      return null;
    }
    try {
      const session = await refreshAuthSession(refreshToken);
      handlers?.onRefreshed(session.access_token);
      return session.access_token;
    } catch {
      clearStoredTokens();
      handlers?.onExpired();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}
