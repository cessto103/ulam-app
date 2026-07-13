import client from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import Constants from 'expo-constants';
import { useEffect } from 'react';

const isExpoGo = Constants.appOwnership === 'expo';

export function usePushNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (isExpoGo) return; // Push notifications require a development build
    if (!user) return;
    registerForPush().catch(() => {});
  }, [user?.id]);
}

async function registerForPush(): Promise<void> {
  // Dynamic require keeps expo-notifications side effects out of Expo Go
  const Device        = require('expo-device');
  const Notifications = require('expo-notifications');

  if (!Device.isDevice) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  await client.post('/user/push-token', { push_token: token });
}
