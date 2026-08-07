import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as authApi from "../api/auth";
import { tokenStorage } from "../api/client";
import type { RegisterPayload, User } from "../api/auth";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tokenStorage.getAccess()) {
      setIsLoading(false);
      return;
    }
    authApi
      .fetchMe()
      .then(setUser)
      .catch(() => tokenStorage.clear())
      .finally(() => setIsLoading(false));
  }, []);

  async function login(username: string, password: string) {
    await authApi.login(username, password);
    const me = await authApi.fetchMe();
    setUser(me);
    return me;
  }

  async function register(payload: RegisterPayload) {
    await authApi.register(payload);
    return login(payload.username, payload.password);
  }

  async function refreshUser() {
    setUser(await authApi.fetchMe());
  }

  function logout() {
    authApi.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
