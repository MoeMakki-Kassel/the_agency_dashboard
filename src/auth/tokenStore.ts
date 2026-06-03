const ACCESS_KEY = 'auth_token';
const REFRESH_KEY = 'auth_refresh_token';
const EXPIRY_KEY = 'auth_token_expiry';

export type StoredTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAtMs: number;
};

function readRemembered(): StoredTokens | null {
  const accessToken = localStorage.getItem(ACCESS_KEY);
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  const expiryRaw = localStorage.getItem(EXPIRY_KEY);
  if (!accessToken || !refreshToken || !expiryRaw) return null;
  const expiresAtMs = Number(expiryRaw);
  if (!Number.isFinite(expiresAtMs)) return null;
  return { accessToken, refreshToken, expiresAtMs };
}

function readSession(): StoredTokens | null {
  const accessToken = sessionStorage.getItem(ACCESS_KEY);
  const refreshToken = sessionStorage.getItem(REFRESH_KEY);
  if (!accessToken || !refreshToken) return null;
  return {
    accessToken,
    refreshToken,
    expiresAtMs: Number.POSITIVE_INFINITY,
  };
}

export function loadStoredTokens(): StoredTokens | null {
  const remembered = readRemembered();
  if (remembered) {
    if (Date.now() < remembered.expiresAtMs) return remembered;
    clearStoredTokens();
    return null;
  }
  return readSession();
}

export function saveTokens(
  accessToken: string,
  refreshToken: string,
  rememberMe: boolean,
  expiresInSec = 3600,
): void {
  clearStoredTokens();
  if (rememberMe) {
    const expiresAtMs = Date.now() + 4 * 60 * 60 * 1000;
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(EXPIRY_KEY, String(expiresAtMs));
    return;
  }
  sessionStorage.setItem(ACCESS_KEY, accessToken);
  sessionStorage.setItem(REFRESH_KEY, refreshToken);
}

export function updateAccessToken(accessToken: string, expiresInSec = 3600): void {
  const remembered = readRemembered();
  if (remembered) {
    localStorage.setItem(ACCESS_KEY, accessToken);
    const expiresAtMs = Date.now() + expiresInSec * 1000;
    localStorage.setItem(EXPIRY_KEY, String(Math.min(expiresAtMs, remembered.expiresAtMs)));
    return;
  }
  if (sessionStorage.getItem(REFRESH_KEY)) {
    sessionStorage.setItem(ACCESS_KEY, accessToken);
  }
}

export function getRefreshToken(): string | null {
  return (
    localStorage.getItem(REFRESH_KEY)
    ?? sessionStorage.getItem(REFRESH_KEY)
  );
}

export function clearStoredTokens(): void {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(EXPIRY_KEY);
}
