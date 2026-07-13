import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from './client';
import client from './client';

export async function uploadAvatar(uri: string): Promise<string> {
  const token = await SecureStore.getItemAsync('auth_token');
  const filename = uri.split('/').pop() ?? 'avatar.jpg';
  const ext = filename.split('.').pop()?.toLowerCase();
  const type = ext === 'png' ? 'image/png' : 'image/jpeg';

  const formData = new FormData();
  formData.append('avatar', { uri, name: filename, type } as any);

  const { data } = await axios.post(`${API_URL}/api/user/avatar`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });

  return data.avatar as string;
}

export async function updateProfile(payload: Record<string, any>) {
  const { data } = await client.patch('/user/profile', payload);
  return data.user;
}
