import { createContext, useContext, useEffect, useState } from "react";
import {
  loginUser,
  registerUser,
  type AuthResponse,
  type AuthTokens,
  type AuthUser,
  type LoginRequest,
  type RegisterRequest,
} from "@/lib/safeher-api";

type AuthSession = {
  user: AuthUser;
  tokens: AuthTokens;
};

type AuthContextValue = {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  ready: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => void;
};

const STORAGE_KEY = "safeher-auth-session";

const AuthContext = createContext<AuthContextValue | null>(null);

function saveSession(session: AuthSession | null) {
  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function readSession() {
  const rawSession = window.localStorage.getItem(STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as AuthSession;
  } catch {
    return null;
  }
}

async function handleAuthRequest(request: Promise<AuthResponse>) {
  const response = await request;

  return {
    user: response.user,
    tokens: response.tokens,
  } satisfies AuthSession;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(readSession());
    setReady(true);
  }, []);

  const persistSession = (nextSession: AuthSession | null) => {
    setSession(nextSession);
    saveSession(nextSession);
  };

  const value: AuthContextValue = {
    user: session?.user ?? null,
    tokens: session?.tokens ?? null,
    isAuthenticated: Boolean(session?.tokens?.access),
    ready,
    login: async (payload) => {
      persistSession(await handleAuthRequest(loginUser(payload)));
    },
    register: async (payload) => {
      persistSession(await handleAuthRequest(registerUser(payload)));
    },
    logout: () => persistSession(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}