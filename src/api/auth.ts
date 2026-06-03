import { apiRequest } from './client';
import type { User } from './types';

interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export async function sendOtp(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: normalized, audience: 'dashboard' }),
  });
}

export async function verifyOtp(email: string, token: string): Promise<Session> {
  const normalized = email.trim().toLowerCase();
  const res = await apiRequest<{ message: string; session: Session }>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email: normalized, token, audience: 'dashboard' }),
  });
  return res.session;
}

export interface SignUpData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  age: number;
}

export async function signUp(data: SignUpData): Promise<void> {
  await apiRequest('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function checkEmail(email: string): Promise<boolean> {
  const res = await apiRequest<{ exists: boolean }>('/auth/check-email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  return res.exists;
}

export async function getMe(token: string): Promise<User> {
  return apiRequest<User>('/users/me', {}, token);
}

export async function logout(token: string): Promise<void> {
  await apiRequest('/auth/logout', { method: 'POST' }, token).catch(() => {});
}
