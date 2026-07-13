import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from './client';

function filePart(uri: string, fallbackName: string) {
  const filename = uri.split('/').pop() ?? fallbackName;
  const ext = filename.split('.').pop()?.toLowerCase();
  const type = ext === 'png' ? 'image/png' : 'image/jpeg';
  return { uri, name: filename, type } as any;
}

/** Upload the store profile photo and/or header (cover) photo. */
export async function uploadStorePhotos(
  tindahanId: number,
  photos: { photoUri?: string | null; coverUri?: string | null },
) {
  if (!photos.photoUri && !photos.coverUri) return null;

  const token = await SecureStore.getItemAsync('auth_token');
  const formData = new FormData();
  if (photos.photoUri) formData.append('photo', filePart(photos.photoUri, 'store.jpg'));
  if (photos.coverUri) formData.append('cover', filePart(photos.coverUri, 'cover.jpg'));

  const { data } = await axios.post(`${API_URL}/api/tindahan/${tindahanId}/photos`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });

  return data.tindahan;
}
