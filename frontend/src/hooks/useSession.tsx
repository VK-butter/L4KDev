import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import type { UserRole } from '@shared/index';
import { authApi } from '../services/authApi';

export interface SessionUser {
  id: string;
  username: string;
  role: UserRole;
  displayName?: string;
}

type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface SessionContextValue {
  status: SessionStatus;
  user: SessionUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(
  undefined
);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);
  const statusRef = useRef<SessionStatus>(status);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const refresh = useCallback(async () => {
    setStatus('loading');
    try {
      const { data } = await authApi.session();
      if (data?.authenticated && data.user) {
        setUser(data.user);
        setStatus('authenticated');
      } else {
        // Avoid clobbering an already-authenticated state due to a stale refresh response
        if (statusRef.current !== 'authenticated') {
          setUser(null);
          setStatus('unauthenticated');
        }
      }
    } catch (error) {
      console.warn('Failed to refresh session', error);
      if (statusRef.current !== 'authenticated') {
        setUser(null);
        setStatus('unauthenticated');
      }
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    setStatus('loading');
    try {
      const { data } = await authApi.login({ username, password });
      setUser(data.user);
      setStatus('authenticated');
    } catch (error) {
      setUser(null);
      setStatus('unauthenticated');
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const value = useMemo(
    () => ({
      status,
      user,
      login,
      logout,
      refresh
    }),
    [status, user, login, logout, refresh]
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
}
