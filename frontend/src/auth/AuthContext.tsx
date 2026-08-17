import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as authApi from "../api/auth";
import { tokenStorage } from "../api/client";
import type { CompleteOAuthRegistrationPayload, RegisterPayload, SignedOutDevice, User } from "../api/auth";

/** A password login also reports whether another device was signed out to make
 *  room for this one (the backend evicts the oldest at the device cap). */
export interface PasswordLoginResult {
  user: User;
  signedOutDevice: SignedOutDevice | null;
}

type OAuthLoginResult =
  | { status: "logged_in"; user: User }
  | { status: "needs_registration"; ticket: string; email: string; first_name: string; last_name: string };

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<PasswordLoginResult>;
  register: (payload: RegisterPayload) => Promise<User>;
  loginWithGoogle: (idToken: string) => Promise<OAuthLoginResult>;
  loginWithApple: (idToken: string, firstName: string, lastName: string) => Promise<OAuthLoginResult>;
  completeOAuthRegistration: (payload: CompleteOAuthRegistrationPayload) => Promise<User>;
  logout: () => Promise<void>;
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

  async function login(username: string, password: string): Promise<PasswordLoginResult> {
    const signedOutDevice = await authApi.login(username, password);
    const me = await authApi.fetchMe();
    setUser(me);
    return { user: me, signedOutDevice };
  }

  async function register(payload: RegisterPayload) {
    await authApi.register(payload);
    const { user: me } = await login(payload.username, payload.password);
    return me;
  }

  async function loginWithGoogle(idToken: string): Promise<OAuthLoginResult> {
    const newUser = await authApi.googleAuth(idToken);
    if (newUser) {
      return { status: "needs_registration", ...newUser };
    }
    const me = await authApi.fetchMe();
    setUser(me);
    return { status: "logged_in", user: me };
  }

  async function loginWithApple(idToken: string, firstName: string, lastName: string): Promise<OAuthLoginResult> {
    const newUser = await authApi.appleAuth(idToken, firstName, lastName);
    if (newUser) {
      return { status: "needs_registration", ...newUser };
    }
    const me = await authApi.fetchMe();
    setUser(me);
    return { status: "logged_in", user: me };
  }

  async function completeOAuthRegistration(payload: CompleteOAuthRegistrationPayload) {
    await authApi.completeOAuthRegistration(payload);
    const me = await authApi.fetchMe();
    setUser(me);
    return me;
  }

  async function refreshUser() {
    setUser(await authApi.fetchMe());
  }

  async function logout() {
    await authApi.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user, isLoading, login, register,
        loginWithGoogle, loginWithApple, completeOAuthRegistration,
        logout, refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
