import '../global.css';
import AndroidNavBarFiller from '@/src/components/AndroidNavBarFiller';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { LanguageProvider, useLanguage } from '@/src/context/LanguageContext';
import { useNotificationTapRouting } from '@/src/hooks/useNotificationTapRouting';
import { usePushNotifications } from '@/src/hooks/usePushNotifications';
import {
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
} from '@expo-google-fonts/baloo-2';
import { DancingScript_700Bold } from '@expo-google-fonts/dancing-script';
import { Lobster_400Regular } from '@expo-google-fonts/lobster';
import {
  NunitoSans_400Regular,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
} from '@expo-google-fonts/nunito-sans';
import { Pacifico_400Regular } from '@expo-google-fonts/pacifico';
import { Satisfy_400Regular } from '@expo-google-fonts/satisfy';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Alert, AppState, Platform, type AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync();

// Push notifications are not available in Expo Go (SDK 53+); skip setup there
if (Constants.appOwnership !== 'expo') {
  const Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge:  true,
    }),
  });
}

const queryClient = new QueryClient();

// React Query's focus-based refetch/pause is built for the DOM's
// visibilitychange event, which doesn't exist in React Native, so every
// refetchInterval query (unread-count polling, shared shopping-list polling)
// would otherwise keep firing indefinitely even while the app is backgrounded.
// Bridging AppState into focusManager is the standard fix for this.
AppState.addEventListener('change', (status: AppStateStatus) => {
  focusManager.setFocused(status === 'active');
});

function RouteGuard() {
  const { user, isLoading, bannedMessage, clearBannedMessage, sessionEndedMessage, clearSessionEndedMessage } = useAuth();
  const { lang } = useLanguage();
  usePushNotifications();
  useNotificationTapRouting(!isLoading && !!user && !!user.email_verified_at);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuth        = segments[0] === '(auth)';
    const inOnboarding  = segments[0] === 'onboarding';
    const inVerify      = segments[0] === 'verify-email';

    if (!user && !inAuth) {
      router.replace('/(auth)/welcome');
    } else if (user && !user.email_verified_at && !inVerify) {
      router.replace('/verify-email');
    } else if (user && user.email_verified_at && !user.onboarding_completed && !inOnboarding) {
      router.replace('/onboarding');
    } else if (user && user.email_verified_at && user.onboarding_completed && (inAuth || inOnboarding || inVerify)) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  // A ban clears `user` the same way an expired session does, so the redirect
  // above already sends the user back to the welcome screen -- this only
  // needs to surface the reason, exactly once, wherever it happened to fire.
  useEffect(() => {
    if (!bannedMessage) return;
    Alert.alert(
      lang === 'en' ? 'Account suspended' : 'Na-suspend ang account',
      bannedMessage,
      [{ text: 'OK', onPress: clearBannedMessage }]
    );
  }, [bannedMessage, lang, clearBannedMessage]);

  // Generic "your session ended" fallback for every other silent-logout
  // case, ban included -- a ban revokes every token instantly, so the
  // specific reason above almost never actually reaches the client; this is
  // what a banned user without a registered push token actually sees.
  useEffect(() => {
    if (!sessionEndedMessage || bannedMessage) return;
    Alert.alert(
      lang === 'en' ? 'Signed out' : 'Naka-sign out',
      sessionEndedMessage,
      [{ text: 'OK', onPress: clearSessionEndedMessage }]
    );
  }, [sessionEndedMessage, bannedMessage, lang, clearSessionEndedMessage]);

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="verify-email" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen
        name="budget-setup"
        options={{
          presentation: 'modal',
          headerTitle: lang === 'en' ? 'Set Budget' : 'I-set ang Budget',
          headerTitleStyle: HEADER_TITLE_STYLE,
          headerStyle: { backgroundColor: '#E7653B' },
          headerShadowVisible: false,
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="report-price"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create-post"
        options={{
          presentation: 'modal',
          headerTitle: 'New Post',
          headerTitleStyle: HEADER_TITLE_STYLE,
          headerStyle: { backgroundColor: '#E7653B' },
          headerShadowVisible: false,
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="create-recipe"
        options={{
          presentation: 'modal',
          headerTitle: 'Create Recipe',
          headerTitleStyle: HEADER_TITLE_STYLE,
          headerStyle: { backgroundColor: '#E7653B' },
          headerShadowVisible: false,
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="edit-recipe/[id]"
        options={{
          presentation: 'modal',
          headerTitle: 'Edit Recipe',
          headerTitleStyle: HEADER_TITLE_STYLE,
          headerStyle: { backgroundColor: '#E7653B' },
          headerShadowVisible: false,
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="recipe/[id]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="log-spending"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="weather-detail"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          headerTitle: lang === 'en' ? 'Notifications' : 'Mga Notipikasyon',
          headerTitleStyle: HEADER_TITLE_STYLE,
          headerStyle: { backgroundColor: '#E7653B' },
          headerShadowVisible: false,
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="user/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="connections"
        options={{
          headerTitle: lang === 'en' ? 'Connections' : 'Mga Koneksyon',
          headerTitleStyle: HEADER_TITLE_STYLE,
          headerStyle: { backgroundColor: '#E7653B' },
          headerShadowVisible: false,
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="upgrade"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="subscription"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="help"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ticket/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="post/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="price-history/[item]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="shopping-list/index"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="shopping-list/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="spending-history"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="search"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="recipe-book"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="market/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="stall/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="my-stores"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="settings"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="account"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="account-status"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="devices"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="location"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="language"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="about"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="insights"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="legal/[slug]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="market-map"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="my-reports"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="edit-store/[id]"
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="add-listing"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}

const HEADER_TITLE_STYLE = {
  fontFamily: 'Baloo2_600SemiBold',
  fontSize: 16,
  color: '#fff',
} as const;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
    NunitoSans_400Regular,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
    DancingScript_700Bold,
    Pacifico_400Regular,
    Satisfy_400Regular,
    Lobster_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  // Nav bar is pure black on Android now, so its buttons need to be light
  // (white) to stay visible — the setBackgroundColorAsync call is kept as a
  // harmless best-effort for any device where edge-to-edge isn't enforced;
  // AndroidNavBarFiller below is what actually makes it black under edge-to-edge.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    NavigationBar.setButtonStyleAsync('light').catch(() => {});
    NavigationBar.setBackgroundColorAsync('#000000').catch(() => {});
  }, []);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <AuthProvider>
              <StatusBar style="dark" />
              <RouteGuard />
              <AndroidNavBarFiller />
            </AuthProvider>
          </LanguageProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
