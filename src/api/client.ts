import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const DEFAULT_API_URL = 'http://localhost/uLam/public';
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export const API_URL = configuredApiUrl || DEFAULT_API_URL;

if (!__DEV__ && !configuredApiUrl) {
  throw new Error('Standalone builds require EXPO_PUBLIC_API_URL to be set (in eas.json build profile env).');
}

// HTTPS is only a hard requirement for real production releases; preview/test
// APKs may point at a LAN WAMP server over http.
if (!__DEV__ && configuredApiUrl && !configuredApiUrl.startsWith('https://')) {
  console.warn(`EXPO_PUBLIC_API_URL is not HTTPS (${configuredApiUrl}) — acceptable for LAN test builds only.`);
}

if (!configuredApiUrl) {
  console.warn(
    `EXPO_PUBLIC_API_URL is not set. Falling back to ${DEFAULT_API_URL}. ` +
      'Set EXPO_PUBLIC_API_URL for emulator or device testing.'
  );
}

const client = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Sanctum tokens now expire (previously they didn't), so a 401 mid-session
// is a real, expected case, not just a login failure. This module has no
// access to AuthContext's state, so AuthProvider registers a handler here
// on mount; any 401 anywhere in the app clears the stored token and lets
// RouteGuard take it from there.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

// A ban revokes the current Sanctum token server-side on the triggering
// request only -- every request after that just gets a plain 401 (the token
// no longer exists), so the ban reason would otherwise be shown at most once,
// and only if the triggering request happened to be on a screen with its own
// error handling. Routing it through AuthProvider instead means it's shown
// reliably exactly once, regardless of which screen or background request
// happened to trigger the detecting call.
let onBanned: ((message: string) => void) | null = null;
export function setBannedHandler(handler: (message: string) => void) {
  onBanned = handler;
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 403 && error?.response?.data?.code === 'banned') {
      await SecureStore.deleteItemAsync('auth_token');
      onBanned?.(error.response.data.message ?? 'Your account has been suspended.');
      return Promise.reject(error);
    }
    if (error?.response?.status === 401) {
      await SecureStore.deleteItemAsync('auth_token');
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export default client;
