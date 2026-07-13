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

export default client;
