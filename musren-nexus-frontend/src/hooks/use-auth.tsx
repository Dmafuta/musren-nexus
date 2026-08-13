import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken, clearToken } from "@/lib/api-client";

export type AppRole =
  | "admin"
  | "superadmin"
  | "staff"
  | "user"
  | "developer"
  | "affiliate"
  | "customer"
  | "merchant";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  roles: AppRole[];
  loading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

function decodeJwt(token: string): { sub: string; email: string; name?: string; roles: string[]; exp: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

function isTokenValid(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload) return false;
  return payload.exp * 1000 > Date.now();
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const hydrateFromToken = (token: string): boolean => {
    const payload = decodeJwt(token);
    if (!payload) return false;
    setUser({ id: payload.sub, email: payload.email, name: payload.name ?? null });
    setRoles((payload.roles ?? []) as AppRole[]);
    return true;
  };

  const refreshRoles = async () => {
    try {
      const data = await api.get<{ id: string; email: string; name: string | null; roles: string[] }>("/api/auth/me");
      setUser({ id: data.id, email: data.email, name: data.name });
      setRoles((data.roles ?? []) as AppRole[]);
    } catch {
      clearToken();
      setUser(null);
      setRoles([]);
    }
  };

  useEffect(() => {
    const token = getToken();
    if (token && isTokenValid(token)) {
      if (!hydrateFromToken(token)) {
        clearToken();
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.post<{ token: string }>("/api/auth/login", { email, password });
    setToken(data.token);
    hydrateFromToken(data.token);
  };

  const register = async (email: string, password: string, name?: string) => {
    const data = await api.post<{ token: string }>("/api/auth/register", { email, password, name });
    setToken(data.token);
    hydrateFromToken(data.token);
  };

  const signOut = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // ignore
    }
    clearToken();
    setUser(null);
    setRoles([]);
  };

  const value: AuthContextValue = {
    user,
    roles,
    loading,
    isAuthenticated: !!user,
    hasRole: (r) => roles.includes(r),
    hasAnyRole: (rs) => rs.some((r) => roles.includes(r)),
    login,
    register,
    signOut,
    refreshRoles,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
