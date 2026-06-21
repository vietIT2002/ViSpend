import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { api, setUnauthorizedHandler } from "./api";
import type { User } from "../types";

interface LoginResponse {
  access_token: string;
  user: User;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginWithGoogle: (accessToken: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const SESSION_CHECK_TIMEOUT_MS = 12_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem("vispend_token"));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(token));

  const loadMe = useCallback(async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      setUser(await api.get<User>("/auth/me", { timeoutMs: SESSION_CHECK_TIMEOUT_MS }));
    } catch {
      localStorage.removeItem("vispend_token");
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const login = useCallback(async (username: string, password: string) => {
    const form = new FormData();
    form.set("username", username);
    form.set("password", password);
    const data = await api.post<LoginResponse>("/auth/login", form);
    localStorage.setItem("vispend_token", data.access_token);
    setUser(data.user);
    setToken(data.access_token);
  }, []);

  const loginWithGoogle = useCallback(async (accessToken: string) => {
    const data = await api.post<LoginResponse>("/auth/google", {
      access_token: accessToken,
    });
    localStorage.setItem("vispend_token", data.access_token);
    setUser(data.user);
    setToken(data.access_token);
  }, []);

  const register = useCallback(
    async (username: string, password: string) => {
      await api.post<User>("/auth/register", { username, password });
      await login(username, password);
    },
    [login],
  );

  const refreshUser = useCallback(async () => {
    try {
      setUser(await api.get<User>("/auth/me"));
    } catch {
      // ignore; a 401 is handled globally by the API client
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("vispend_token");
    setToken(null);
    setUser(null);
  }, []);

  // Any 401 on an authenticated request logs the user out (expired session).
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const value = useMemo(
    () => ({ user, token, loading, login, loginWithGoogle, register, refreshUser, logout }),
    [loading, login, loginWithGoogle, logout, refreshUser, register, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
