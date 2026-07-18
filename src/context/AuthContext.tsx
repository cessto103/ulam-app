import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState } from 'react';
import { getMe, logout as apiLogout, User } from '../api/auth';

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

  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync('auth_token');
      if (stored) {
        setToken(stored);
        try {
          const me = await getMe();
          setUser(me);
        } catch {
          await SecureStore.deleteItemAsync('auth_token');
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const signIn = async (newToken: string, newUser: User) => {
    await SecureStore.setItemAsync('auth_token', newToken);
    setToken(newToken);
    setUser(newUser);
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
    return me;
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
