import client from '@/src/api/client';
import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Strike = {
  level: number;
  level_label: 'warning' | 'restriction' | 'ban' | 'unknown';
  reason: string;
  created_at: string;
  expires_at: string | null;
};

type ModerationStatus = {
  restricted_until: string | null;
  banned_at: string | null;
  ban_reason: string | null;
  strikes: Strike[];
};

const LEVEL_META: Record<string, { icon: string; en: string; tl: string }> = {
  warning:     { icon: '⚠️', en: 'Warning',     tl: 'Babala' },
  restriction: { icon: '⏳', en: 'Restriction',  tl: 'Restriksyon' },
  ban:         { icon: '🚫', en: 'Ban',          tl: 'Ban' },
  unknown:     { icon: '•',  en: 'Notice',       tl: 'Abiso' },
};

function formatDate(iso: string, lang: 'en' | 'tl') {
  return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-PH' : 'fil-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AccountStatusScreen() {
  const { lang } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, isLoading } = useQuery({
    queryKey: ['moderation-status'],
    queryFn: async () => {
      const { data } = await client.get<ModerationStatus>('/user/moderation-status');
      return data;
    },
  });

  const isBanned = !!data?.banned_at;
  const isRestricted = !isBanned && !!data?.restricted_until && new Date(data.restricted_until) > new Date();
  const latestRestriction = data?.strikes.find((s) => s.level_label === 'restriction');

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
            {lang === 'en' ? 'Account Status' : 'Katayuan ng Account'}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#E7653B" />
        </View>
      ) : (
        <ScrollView contentContainerClassName="px-4 pt-4 pb-12">
          {/* Standing card */}
          {isBanned ? (
            <View className="rounded-2xl border border-red-200 bg-red-50 p-4 mb-4">
              <View className="flex-row items-center gap-2 mb-2">
                <Text style={{ fontSize: 18 }}>🚫</Text>
                <Text className="text-sm font-bold text-red-700">
                  {lang === 'en' ? 'Account suspended' : 'Na-suspend ang account'}
                </Text>
              </View>
              {data?.ban_reason && (
                <Text className="text-xs text-red-700 leading-5">{data.ban_reason}</Text>
              )}
              {data?.banned_at && (
                <Text className="text-[11px] text-red-600 mt-2">
                  {lang === 'en' ? 'Suspended on' : 'Na-suspend noong'} {formatDate(data.banned_at, lang)}
                </Text>
              )}
            </View>
          ) : isRestricted ? (
            <View className="rounded-2xl border border-gold-100 bg-gold-50 p-4 mb-4">
              <View className="flex-row items-center gap-2 mb-2">
                <Text style={{ fontSize: 18 }}>⏳</Text>
                <Text className="text-sm font-bold text-gold-700">
                  {lang === 'en' ? 'Temporarily restricted' : 'Pansamantalang restriksyon'}
                </Text>
              </View>
              <Text className="text-xs text-gold-700 leading-5">
                {lang === 'en'
                  ? `You can't post, comment, or report prices until ${formatDate(data!.restricted_until as string, lang)}.`
                  : `Hindi ka makakapag-post, magkomento, o mag-report ng presyo hanggang ${formatDate(data!.restricted_until as string, lang)}.`}
              </Text>
              {latestRestriction?.reason && (
                <Text className="text-xs text-gold-700 leading-5 mt-2">
                  {lang === 'en' ? 'Reason:' : 'Dahilan:'} {latestRestriction.reason}
                </Text>
              )}
            </View>
          ) : (
            <View className="rounded-2xl border border-leaf-200 bg-leaf-50 p-4 mb-4">
              <View className="flex-row items-center gap-2 mb-1">
                <Text style={{ fontSize: 18 }}>✅</Text>
                <Text className="text-sm font-bold text-leaf-700">
                  {lang === 'en' ? 'Good standing' : 'Maayos ang account'}
                </Text>
              </View>
              <Text className="text-xs text-leaf-700 leading-5">
                {lang === 'en'
                  ? "You're free to post, comment, and report prices."
                  : 'Malaya kang makapag-post, magkomento, at mag-report ng presyo.'}
              </Text>
            </View>
          )}

          {/* Strike history */}
          <Text className="text-xs font-semibold text-ink-soft uppercase mb-2">
            {lang === 'en' ? 'History' : 'Kasaysayan'}
          </Text>
          <View className="rounded-2xl border border-cream-200 bg-white overflow-hidden">
            {!data?.strikes.length ? (
              <View className="px-4 py-6 items-center">
                <Text className="text-xs text-ink-soft text-center">
                  {lang === 'en'
                    ? "No warnings or actions on your account. Keep it up!"
                    : 'Walang babala o aksyon sa iyong account. Ituloy mo lang!'}
                </Text>
              </View>
            ) : (
              data.strikes.map((strike, i) => {
                const meta = LEVEL_META[strike.level_label] ?? LEVEL_META.unknown;
                const expired = strike.expires_at ? new Date(strike.expires_at) < new Date() : false;
                return (
                  <View
                    key={i}
                    className={`px-4 py-3 ${i < data.strikes.length - 1 ? 'border-b border-cream-100' : ''}`}
                  >
                    <View className="flex-row items-center gap-2 mb-1">
                      <Text style={{ fontSize: 14 }}>{meta.icon}</Text>
                      <Text className="text-xs font-semibold text-ink">
                        {lang === 'en' ? meta.en : meta.tl}
                      </Text>
                      <Text className="text-[11px] text-ink-soft ml-auto">
                        {formatDate(strike.created_at, lang)}
                      </Text>
                    </View>
                    <Text className="text-xs text-ink-soft leading-5">{strike.reason}</Text>
                    {expired && (
                      <Text className="text-[11px] text-leaf-600 mt-1">
                        {lang === 'en' ? 'No longer active' : 'Hindi na aktibo'}
                      </Text>
                    )}
                  </View>
                );
              })
            )}
          </View>

          <Text className="text-[11px] text-ink-soft text-center mt-4 leading-5">
            {lang === 'en'
              ? "Reporter identities are always kept confidential. If you think an action was made in error, contact Help & Support."
              : 'Palaging pinapanatiling kumpidensyal ang pagkakakilanlan ng nag-report. Kung sa tingin mo ay may pagkakamali, makipag-ugnayan sa Tulong at Suporta.'}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}
