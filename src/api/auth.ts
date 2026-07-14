import client from './client';

export type User = {
  id: number;
  name: string;
  username: string;
  email: string;
  secondary_email: string | null;
  secondary_email_verified_at: string | null;
  avatar: string | null;
  bio: string | null;
  plan: 'libre' | 'premium';
  is_premium: boolean;
  premium_expires_at: string | null;
  premium_source: 'paid' | 'trial' | null;
  xp: number;
  level: number;
  streak_days: number;
  ai_meal_plans_used_this_month: number;
  ai_plans_remaining: number | null;
  household_size: number | null;
  barangay: string | null;
  municipality: string | null;
  province: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  dietary_preferences: string[] | null;
  onboarding_completed: boolean;
};

export type LoginPayload = { login: string; password: string };
export type RegisterPayload = {
  name: string;
  username: string;
  email: string;
  password: string;
  password_confirmation: string;
};

export async function login(payload: LoginPayload) {
  const { data } = await client.post<{ token: string; user: User }>('/auth/login', {
    login: payload.login,
    password: payload.password,
  });
  return data;
}

export async function register(payload: RegisterPayload) {
  const { data } = await client.post<{ token: string; user: User }>('/auth/register', payload);
  return data;
}

export async function logout() {
  await client.post('/auth/logout');
}

export async function getMe() {
  const { data } = await client.get<User>('/user');
  return data;
}
