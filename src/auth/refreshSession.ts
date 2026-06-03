import { updateAccessToken } from './tokenStore';

export type AuthSessionPayload = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
};

const BASE_URL = import.meta.env.VITE_API_URL as string;

export async function refreshAuthSession(refreshToken: string): Promise<AuthSessionPayload> {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    const err = new Error('Session expired');
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }

  const body = (await res.json()) as { session: AuthSessionPayload };
  const session = body.session;
  updateAccessToken(session.access_token, session.expires_in ?? 3600);
  return session;
}
