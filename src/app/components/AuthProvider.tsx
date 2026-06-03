import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as auth from '../../api/auth';
import type { SignUpData } from '../../api/auth';
import type { User } from '../../api/types';
import { ApiError } from '../../api/types';
import { isDashboardTeamRole } from '../../utils/dashboardRole';
import {
  loadStoredTokens,
  saveTokens,
  clearStoredTokens,
  getRefreshToken,
} from '../../auth/tokenStore';
import { refreshAuthSession } from '../../auth/refreshSession';
import { registerAuthSessionHandlers } from '../../auth/authSession';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, code: string, rememberMe?: boolean) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  sendOtp: async () => {},
  verifyOtp: async () => {},
  signUp: async () => {},
  signOut: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(() => {
    const currentToken = token ?? loadStoredTokens()?.accessToken ?? null;
    if (currentToken) auth.logout(currentToken);
    clearStoredTokens();
    setUser(null);
    setToken(null);
  }, [token]);

  useEffect(() => {
    return registerAuthSessionHandlers({
      onRefreshed: (accessToken) => setToken(accessToken),
      onExpired: () => {
        clearStoredTokens();
        setUser(null);
        setToken(null);
      },
    });
  }, []);

  useEffect(() => {
    const stored = loadStoredTokens();
    if (!stored) {
      setLoading(false);
      return;
    }

    const bootstrap = async () => {
      let accessToken = stored.accessToken;
      const refreshToken = getRefreshToken();
      const expiresSoon =
        Number.isFinite(stored.expiresAtMs)
        && stored.expiresAtMs - Date.now() < 5 * 60 * 1000;

      if (refreshToken && expiresSoon) {
        try {
          const session = await refreshAuthSession(refreshToken);
          accessToken = session.access_token;
        } catch {
          clearStoredTokens();
          setLoading(false);
          return;
        }
      }

      try {
        const userData = await auth.getMe(accessToken);
        if (!isDashboardTeamRole(userData.role)) {
          clearStoredTokens();
          setToken(null);
          setUser(null);
          return;
        }
        setUser(userData);
        setToken(accessToken);
      } catch {
        clearStoredTokens();
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, []);

  const sendOtp = async (email: string): Promise<void> => {
    await auth.sendOtp(email);
  };

  const verifyOtp = async (email: string, code: string, rememberMe = false): Promise<void> => {
    const session = await auth.verifyOtp(email, code);
    saveTokens(session.access_token, session.refresh_token, rememberMe, session.expires_in);
    const userData = await auth.getMe(session.access_token);
    if (!isDashboardTeamRole(userData.role)) {
      clearStoredTokens();
      setUser(null);
      setToken(null);
      throw new ApiError('This account cannot access the team dashboard.', 403);
    }
    setUser(userData);
    setToken(session.access_token);
  };

  const signUp = async (data: SignUpData): Promise<void> => {
    await auth.signUp(data);
    await sendOtp(data.email);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, sendOtp, verifyOtp, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
