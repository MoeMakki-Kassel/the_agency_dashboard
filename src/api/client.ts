import { ApiError } from './types';
import { sanitizeUserFacingMessage } from '../utils/userFacingError';
import { getValidAccessToken, refreshAccessToken } from '../auth/authSession';

const BASE_URL = import.meta.env.VITE_API_URL as string;

type ApiRequestInit = RequestInit & { _authRetry?: boolean };

export async function apiRequest<T>(
  path: string,
  options: ApiRequestInit = {},
  token?: string | null,
  timeoutMs = 120_000,
): Promise<T> {
  const { _authRetry, ...fetchOptions } = options;
  const authToken = token ?? (await getValidAccessToken());

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  // Don't set Content-Type for FormData — browser sets it with boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...fetchOptions,
      headers,
      signal: fetchOptions.signal ?? controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError('Request timed out. Try again or restart the API server.', 408);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    if (res.status === 401 && !_authRetry) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return apiRequest<T>(path, { ...fetchOptions, _authRetry: true }, newToken, timeoutMs);
      }
    }

    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      const raw = body.error || body.message || message;
      message = sanitizeUserFacingMessage(typeof raw === 'string' ? raw : message);
    } catch {
      // ignore JSON parse errors
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}
