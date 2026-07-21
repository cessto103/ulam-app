import { API_URL } from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Alert, Image, Linking, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const PLAY_STORE_ID = 'com.ulam.app';
const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${PLAY_STORE_ID}`;

function SettingsRow({
  icon, label, value, onPress, destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: React.ReactNode;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 px-4 py-4 border-b border-cream-100 active:bg-cream-50"
    >
      <Ionicons name={icon} size={20} color={destructive ? '#DC2626' : '#6F655A'} />
      <Text
        className="flex-1 text-sm font-semibold"
        style={{ color: destructive ? '#DC2626' : '#000000' }}
      >
        {label}
      </Text>
      {value}
      {!destructive && <Text className="text-ink-soft text-base">›</Text>}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { lang } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const avatarUri = user?.avatar ? `${API_URL}${user.avatar}` : null;

  const rateUs = () => {
    Linking.openURL(`market://details?id=${PLAY_STORE_ID}`).catch(() => {
      Linking.openURL(PLAY_STORE_URL);
    });
  };

  const shareApp = () => {
    Share.share({
      message: lang === 'en'
        ? `uLam helps Filipino households plan meals and track prices on a budget. Download it here: ${PLAY_STORE_URL}`
        : `Tinutulungan ng uLam ang mga Pilipinong sambahayan na magplano ng pagkain at subaybayan ang presyo, kahit limitado ang budget. I-download dito: ${PLAY_STORE_URL}`,
    });
  };

  const handleLogout = async () => {
    Alert.alert(
      lang === 'en' ? 'Log Out' : 'Mag-log Out',
      lang === 'en' ? 'Are you sure you want to log out?' : 'Sigurado ka bang gusto mong mag-log out?',
      [
        { text: lang === 'en' ? 'Cancel' : 'Kanselahin', style: 'cancel' },
        {
          text: lang === 'en' ? 'Log Out' : 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFCF5' }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          paddingHorizontal: 16,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#F9EDD3',
        }}
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="w-8 h-8 rounded-full bg-cream-200 items-center justify-center active:opacity-70"
          >
            <Ionicons name="arrow-back" size={18} color="#000000" />
          </Pressable>
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#000000', flex: 1 }}>
            {lang === 'en' ? 'Settings' : 'Mga Setting'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerClassName="px-4 pt-4 pb-12">
        <View className="rounded-2xl border border-cream-200 bg-white overflow-hidden">
          <Pressable
            onPress={() => router.push('/account' as any)}
            className="flex-row items-center gap-3 px-4 py-4 border-b border-cream-100 active:bg-cream-50"
          >
            <Ionicons name="person-outline" size={20} color="#6F655A" />
            <Text className="flex-1 text-sm font-semibold text-black">
              {lang === 'en' ? 'My Account' : 'Aking Account'}
            </Text>
            <View className="flex-row items-center gap-2">
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={{ width: 32, height: 32, borderRadius: 16 }} />
              ) : (
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF4EC', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 12, fontFamily: 'NunitoSans_700Bold', color: '#5E693F' }}>
                    {(user?.name ?? '?').substring(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text className="text-sm text-ink-soft">{user?.name}</Text>
            </View>
            <Text className="text-ink-soft text-base">›</Text>
          </Pressable>

          <SettingsRow
            icon="shield-outline"
            label={lang === 'en' ? 'Account Status' : 'Katayuan ng Account'}
            onPress={() => router.push('/account-status' as any)}
          />
          <SettingsRow
            icon="phone-portrait-outline"
            label={lang === 'en' ? 'My Devices' : 'Aking mga Device'}
            onPress={() => router.push('/devices' as any)}
          />
          <SettingsRow
            icon="location-outline"
            label={lang === 'en' ? 'Location' : 'Lokasyon'}
            onPress={() => router.push('/location' as any)}
          />
          <SettingsRow
            icon="language-outline"
            label={lang === 'en' ? 'Languages' : 'Mga Wika'}
            onPress={() => router.push('/language' as any)}
          />
          <SettingsRow
            icon="help-buoy-outline"
            label={lang === 'en' ? 'Help & Support' : 'Tulong at Suporta'}
            onPress={() => router.push('/help' as any)}
          />
          <SettingsRow
            icon="star-outline"
            label={lang === 'en' ? 'Rate Us' : 'I-rate Kami'}
            onPress={rateUs}
          />
          <SettingsRow
            icon="share-social-outline"
            label={lang === 'en' ? 'Share' : 'Ibahagi'}
            onPress={shareApp}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            label={lang === 'en' ? 'Privacy Policy' : 'Patakaran sa Privacy'}
            onPress={() => router.push('/legal/privacy' as any)}
          />
          <SettingsRow
            icon="document-text-outline"
            label={lang === 'en' ? 'Terms of Service' : 'Mga Tuntunin ng Serbisyo'}
            onPress={() => router.push('/legal/terms' as any)}
          />
          <View className="border-b-0">
            <Pressable
              onPress={() => router.push('/about' as any)}
              className="flex-row items-center gap-3 px-4 py-4 active:bg-cream-50"
            >
              <Ionicons name="information-circle-outline" size={20} color="#6F655A" />
              <Text className="flex-1 text-sm font-semibold text-black">
                {lang === 'en' ? 'About the App' : 'Tungkol sa App'}
              </Text>
              <Text className="text-ink-soft text-base">›</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={handleLogout}
          className="flex-row items-center justify-center gap-2 rounded-2xl border border-cream-200 bg-white py-4 mt-4 active:bg-cream-50"
        >
          <Text className="text-sm font-semibold" style={{ color: '#DC2626' }}>
            {lang === 'en' ? 'Log Out' : 'Mag-log Out'}
          </Text>
        </Pressable>

        <Text className="text-xs text-ink-soft text-center mt-6">v{APP_VERSION}</Text>
      </ScrollView>
    </View>
  );
}
