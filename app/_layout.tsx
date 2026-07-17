import '../global.css';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { LanguageProvider, useLanguage } from '@/src/context/LanguageContext';
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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';
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

function RouteGuard() {
  const { user, isLoading } = useAuth();
  const { lang } = useLanguage();
  usePushNotifications();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuth        = segments[0] === '(auth)';
    const inOnboarding  = segments[0] === 'onboarding';

    if (!user && !inAuth) {
      router.replace('/(auth)/welcome');
    } else if (user && !user.onboarding_completed && !inOnboarding) {
      router.replace('/onboarding');
    } else if (user && user.onboarding_completed && (inAuth || inOnboarding)) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
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
        name="shopping-list"
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

  // The app is a single, always-light cream theme — don't let the phone's
  // system dark mode flip these to a light/white style that disappears
  // against it (they don't follow app screens' own dark photo heroes either).
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    NavigationBar.setButtonStyleAsync('dark').catch(() => {});
    NavigationBar.setBackgroundColorAsync('#FFFCF5').catch(() => {});
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
            </AuthProvider>
          </LanguageProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
