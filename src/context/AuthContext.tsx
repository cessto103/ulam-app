import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getMe, logout as apiLogout, User } from '../api/auth';
import { setBannedHandler, setUnauthorizedHandler } from '../api/client';
import { useLanguage } from './LanguageContext';

// How long a stale plan/XP/ban status can sit before a foreground refresh is
// willing to hit the network again — avoids re-fetching on every quick
// app-switcher tap while still catching admin-side changes (e.g. a manual
// Premium upgrade) reasonably soon after the user comes back to the app.
const FOREGROUND_REFRESH_MIN_INTERVAL_MS = 30_000;

type AuthState = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  bannedMessage: string | null;
  clearBannedMessage: () => void;
  sessionEndedMessage: string | null;
  clearSessionEndedMessage: () => void;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<User>;
};

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bannedMessage, setBannedMessage] = useState<string | null>(null);
  const [sessionEndedMessage, setSessionEndedMessage] = useState<string | null>(null);
  const lastRefreshedAt = useRef(0);
  // Read inside the AppState listener without re-subscribing it every time
  // the token changes (the listener is only ever set up once).
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  // Any 401 from the API client (expired/revoked token) clears in-memory
  // auth state here; RouteGuard's existing !user redirect takes it from
  // there, same path as a normal sign-out. A ban revokes every token for the
  // user instantly (see UserModerationService::ban()), so in practice the
  // banned handler below almost never fires -- the user's very next request
  // already hits this plain 401 path with no way to tell why the token died.
  // Surfacing *that* generically is the only reliable in-app signal left;
  // only show it if there was actually a live session to lose, so a
  // stale/expired token found at cold start doesn't show a spurious message.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (tokenRef.current) {
        setSessionEndedMessage(
          lang === 'en' ? 'Your session ended. Please sign in again.' : 'Natapos ang iyong session. Mag-sign in muli.'
        );
      }
      setToken(null);
      setUser(null);
    });
    setBannedHandler((message) => {
      setToken(null);
      setUser(null);
      setBannedMessage(message);
    });
  }, [lang]);

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

  const clearBannedMessage = () => setBannedMessage(null);
  const clearSessionEndedMessage = () => setSessionEndedMessage(null);

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
    <AuthContext.Provider
      value={{
        user, token, isLoading,
        bannedMessage, clearBannedMessage,
        sessionEndedMessage, clearSessionEndedMessage,
        signIn, signOut, refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
