import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getMe, logout as apiLogout, User } from '../api/auth';

// How long a stale plan/XP/ban status can sit before a foreground refresh is
// willing to hit the network again — avoids re-fetching on every quick
// app-switcher tap while still catching admin-side changes (e.g. a manual
// Premium upgrade) reasonably soon after the user comes back to the app.
const FOREGROUND_REFRESH_MIN_INTERVAL_MS = 30_000;

type AuthState = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<User>;
};

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastRefreshedAt = useRef(0);
  // Read inside the AppState listener without re-subscribing it every time
  // the token changes (the listener is only ever set up once).
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync('auth_token');
      if (stored) {
        setToken(stored);
        try {
          const me = await getMe();
          setUser(me);
          lastRefreshedAt.current = Date.now();
        } catch {
          await SecureStore.deleteItemAsync('auth_token');
        }
      }
      setIsLoading(false);
    })();
  }, []);

  // Nothing pushes account changes to the client — if an admin grants
  // Premium (or changes anything else about the account) while the user is
  // already signed in, the in-memory `user` object just sits stale until
  // something explicitly refetches it. Catch the common case: the user
  // backgrounds the app (to check a message, switch apps, etc.) and comes
  // back — refresh then, so a stale "still Free" state doesn't linger for
  // the rest of the session.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !tokenRef.current) return;
      if (Date.now() - lastRefreshedAt.current < FOREGROUND_REFRESH_MIN_INTERVAL_MS) return;
      getMe()
        .then((me) => { setUser(me); lastRefreshedAt.current = Date.now(); })
        .catch(() => {});
    });
    return () => sub.remove();
  }, []);

  const signIn = async (newToken: string, newUser: User) => {
    await SecureStore.setItemAsync('auth_token', newToken);
    setToken(newToken);
    setUser(newUser);
    lastRefreshedAt.current = Date.now();
  };

  const signOut = async () => {
    try { await apiLogout(); } catch {}
    await SecureStore.deleteItemAsync('auth_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const me = await getMe();
    setUser(me);
    lastRefreshedAt.current = Date.now();
    return me;
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
