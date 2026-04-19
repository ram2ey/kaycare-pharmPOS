import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser, LoginRequest } from '../types';
import { login as apiLogin } from '../api/auth';

interface AuthContextValue {
  user: AuthUser | null;
  login: (req: LoginRequest) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'pharmos_auth';

function loadUser(): AuthUser | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadUser);

  const login = useCallback(async (req: LoginRequest): Promise<AuthUser> => {
    const res = await apiLogin(req);
    const auth: AuthUser = { ...res, tenantCode: req.tenantCode };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    setUser(auth);
    return auth;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
