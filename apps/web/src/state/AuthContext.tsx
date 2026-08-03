import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AuthUser, LoginInput, RegisterInput } from "@study-abroad/shared";
import { apiRequest } from "../api/client";
import type { AuthResponse } from "../types";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const tokenKey = "study-abroad-token";
const userKey = "study-abroad-user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(tokenKey));
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(tokenKey) && !readStoredUser()));

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }

      if (user) {
        setLoading(false);
      }

      try {
        const response = await apiRequest<{ user: AuthUser }>("/auth/me", {
          token,
          cacheTtlMs: 60_000
        });

        if (!cancelled) {
          setUser(response.user);
          localStorage.setItem(userKey, JSON.stringify(response.user));
        }
      } catch {
        localStorage.removeItem(tokenKey);
        localStorage.removeItem(userKey);
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const persistSession = useCallback((response: AuthResponse) => {
    localStorage.setItem(tokenKey, response.token);
    localStorage.setItem(userKey, JSON.stringify(response.user));
    setToken(response.token);
    setUser(response.user);
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const response = await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input)
    });
    persistSession(response);
  }, [persistSession]);

  const register = useCallback(async (input: RegisterInput) => {
    const response = await apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input)
    });
    persistSession(response);
  }, [persistSession]);

  const logout = useCallback(() => {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    token,
    loading,
    login,
    register,
    logout
  }), [loading, login, logout, register, token, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

function readStoredUser() {
  const rawUser = localStorage.getItem(userKey);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    localStorage.removeItem(userKey);
    return null;
  }
}
