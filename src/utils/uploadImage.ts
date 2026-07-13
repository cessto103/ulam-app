import * as ImageManipulator from 'expo-image-manipulator';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_URL } from '@/src/api/client';

/**
 * Downscale + recompress a picked image before upload.
 * Defaults: max 1024px wide, JPEG q0.75 — a phone photo shrinks from ~2–4 MB
 * to ~60–150 KB with no visible loss at app sizes.
 */
export async function resizeForUpload(uri: string, maxWidth = 1024, quality = 0.75): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG },
    );
    return result.uri;
  } catch {
    return uri; // fall back to the original rather than blocking the upload
  }
}

export function imageFilePart(uri: string, fallbackName = 'photo.jpg') {
  const filename = uri.split('/').pop() ?? fallbackName;
  const ext = filename.split('.').pop()?.toLowerCase();
  const type = ext === 'png' ? 'image/png' : 'image/jpeg';
  return { uri, name: filename, type } as any;
}

/** POST multipart form data with the auth token (for endpoints that take files). */
export async function postMultipart(path: string, fields: Record<string, string | number>, files: Record<string, string | null | undefined>) {
  const token = await SecureStore.getItemAsync('auth_token');
  const formData = new FormData();
  Object.entries(fields).forEach(([k, v]) => formData.append(k, String(v)));
  Object.entries(files).forEach(([k, uri]) => {
    if (uri) formData.append(k, imageFilePart(uri));
  });
  const { data } = await axios.post(`${API_URL}/api${path}`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
}
