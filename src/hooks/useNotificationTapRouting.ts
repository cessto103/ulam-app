import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

/**
 * Routes the app to a notification's action_url when the user taps a push,
 * both while running (foreground/background) and from a cold start. The
 * server puts action_url into every push's data payload
 * (NotificationService::send), and the in-app notifications screen already
 * navigates with the same field — this brings push taps to parity.
 *
 * Only meaningful once a user session exists; taps that land before login
 * finishes are dropped (the RouteGuard redirect would fight the push anyway).
 */
export function useNotificationTapRouting(enabled: boolean) {
  const router = useRouter();
  // Cold-start responses are also replayed by getLastNotificationResponseAsync,
  // so remember what was handled to avoid double navigation.
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    // Push notifications are unavailable in Expo Go (SDK 53+) — same guard
    // as the notification handler setup in app/_layout.tsx.
    if (Constants.appOwnership === 'expo' || !enabled) return;

    const Notifications = require('expo-notifications');

    const routeFrom = (response: any) => {
      const url = response?.notification?.request?.content?.data?.action_url;
      const responseId = response?.notification?.request?.identifier ?? url;
      if (!url || handledRef.current === responseId) return;
      handledRef.current = responseId;
      try {
        router.push(url);
      } catch {
        // A bad/outdated URL from an old notification shouldn't crash the app.
      }
    };

    const sub = Notifications.addNotificationResponseReceivedListener(routeFrom);
    Notifications.getLastNotificationResponseAsync().then((response: any) => {
      if (response) routeFrom(response);
    });

    return () => sub.remove();
  }, [enabled, router]);
}
