import client from '@/src/api/client';
import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SessionRow = {
  id: number;
  device_name: string | null;
  platform: string | null;
  app_version: string | null;
  ip_address: string | null;
  last_used_at: string | null;
  created_at: string;
  is_current: boolean;
};

function relativeTime(iso: string | null, lang: 'en' | 'tl'): string {
  if (!iso) return lang === 'en' ? 'Never used' : 'Hindi pa nagamit';
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return lang === 'en' ? 'Active now' : 'Aktibo ngayon';
  if (hours < 24) return lang === 'en' ? `${hours}h ago` : `${hours}h ang nakalipas`;
  const days = Math.floor(hours / 24);
  return lang === 'en' ? `${days}d ago` : `${days}d ang nakalipas`;
}

function platformIcon(platform: string | null): keyof typeof Ionicons.glyphMap {
  if (platform === 'ios') return 'phone-portrait-outline';
  if (platform === 'android') return 'phone-portrait-outline';
  return 'desktop-outline';
}

export default function DevicesScreen() {
  const { lang } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-sessions'],
    queryFn: async () => (await client.get<{ sessions: SessionRow[] }>('/auth/sessions')).data.sessions,
  });

  const { mutate: revoke, isPending: revoking } = useMutation({
    mutationFn: (id: number) => client.delete(`/auth/sessions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-sessions'] }),
    onError: () => {
      Alert.alert(
        lang === 'en' ? 'Error' : 'Error',
        lang === 'en' ? 'Could not sign out that device. Try again.' : 'Hindi ma-sign out ang device. Subukan ulit.'
      );
    },
  });

  const confirmRevoke = (session: SessionRow) => {
    Alert.alert(
      lang === 'en' ? 'Sign out this device?' : 'I-sign out ang device na ito?',
      session.device_name ?? (lang === 'en' ? 'Unknown device' : 'Hindi kilalang device'),
      [
        { text: lang === 'en' ? 'Cancel' : 'Kanselahin', style: 'cancel' },
        { text: lang === 'en' ? 'Sign out' : 'I-sign out', style: 'destructive', onPress: () => revoke(session.id) },
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
            {lang === 'en' ? 'My Devices' : 'Aking mga Device'}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#E7653B" />
        </View>
      ) : (
        <ScrollView contentContainerClassName="px-4 pt-4 pb-12">
          <Text className="text-xs font-semibold text-ink-soft uppercase mb-2">
            {lang === 'en' ? 'Signed in on' : 'Naka-sign in sa'}
          </Text>
          <View className="rounded-2xl border border-cream-200 bg-white overflow-hidden">
            {!data?.length ? (
              <View className="px-4 py-6 items-center">
                <Text className="text-xs text-ink-soft text-center">
                  {lang === 'en' ? 'No active devices found.' : 'Walang aktibong device na nahanap.'}
                </Text>
              </View>
            ) : (
              data.map((session, i) => (
                <View
                  key={session.id}
                  className={`px-4 py-3 flex-row items-center gap-3 ${i < data.length - 1 ? 'border-b border-cream-100' : ''}`}
                >
                  <View className="w-9 h-9 rounded-full bg-cream-200 items-center justify-center">
                    <Ionicons name={platformIcon(session.platform)} size={16} color="#6F655A" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-sm font-semibold text-ink" numberOfLines={1}>
                        {session.device_name ?? (lang === 'en' ? 'Unknown device' : 'Hindi kilalang device')}
                      </Text>
                      {session.is_current && (
                        <View className="rounded-full bg-leaf-50 px-2 py-0.5">
                          <Text className="text-[10px] font-semibold text-leaf-700">
                            {lang === 'en' ? 'This device' : 'Device na ito'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-[11px] text-ink-soft mt-0.5">
                      {relativeTime(session.last_used_at, lang)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => confirmRevoke(session)}
                    disabled={revoking}
                    hitSlop={8}
                    className="w-8 h-8 items-center justify-center active:opacity-60"
                  >
                    <Ionicons name="log-out-outline" size={18} color="#C45E3A" />
                  </Pressable>
                </View>
              ))
            )}
          </View>

          <Text className="text-[11px] text-ink-soft text-center mt-4 leading-5">
            {lang === 'en'
              ? "If you don't recognize a device, sign it out and change your password."
              : 'Kung hindi mo kilala ang isang device, i-sign out ito at palitan ang iyong password.'}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}
