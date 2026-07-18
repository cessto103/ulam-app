import client from '@/src/api/client';
import ItemThumb from '@/src/components/ItemThumb';
import { Skeleton } from '@/src/components/Skeleton';
import { declineReasonLabel } from '@/src/constants/reportReasons';
import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

type MyReport = {
  id: number;
  item_name: string;
  category: string | null;
  reported_price: string | number;
  unit: string;
  photo: string | null;
  status: 'pending' | 'accepted' | 'declined';
  declined_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  tindahan: { id: number; name: string } | null;
  market: { id: number; name: string } | null;
};

const STATUS_META: Record<MyReport['status'], { bg: string; text: string; en: string; tl: string }> = {
  pending:  { bg: '#FDEFC9', text: '#9A6A12', en: 'Pending review', tl: 'Hinihintay ang review' },
  accepted: { bg: '#EFF4EC', text: '#386641', en: 'Accepted',       tl: 'Tinanggap' },
  declined: { bg: '#FCEBEB', text: '#E24B4A', en: 'Declined',       tl: 'Tinanggihan' },
};

function timeAgo(dateStr: string, lang: 'en' | 'tl'): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return lang === 'en' ? 'Just now' : 'Kanina lang';
  if (hours < 24) return lang === 'en' ? `${hours}h ago` : `${hours}h ang nakalipas`;
  const days = Math.floor(hours / 24);
  if (days < 7) return lang === 'en' ? `${days}d ago` : `${days}d ang nakalipas`;
  const weeks = Math.floor(days / 7);
  return lang === 'en' ? `${weeks}w ago` : `${weeks}w ang nakalipas`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MyReportsScreen() {
  const { lang } = useLanguage();
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['my-price-reports'] });
    setRefreshing(false);
  };

  const { data: reports = [], isLoading } = useQuery<MyReport[]>({
    queryKey: ['my-price-reports'],
    queryFn: async () => {
      const { data } = await client.get('/prices/my-reports');
      return data.reports ?? [];
    },
  });

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
          <View className="flex-1">
            <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#000000' }}>
              {lang === 'en' ? 'My Price Reports' : 'Aking mga Price Report'}
            </Text>
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
              {lang === 'en'
                ? 'Store-targeted reports need the owner’s approval'
                : 'Kailangan ng approval ng may-ari ang mga report sa tindahan'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#386641" colors={['#386641']} />}
      >
        {isLoading ? (
          <>
            <Skeleton style={{ height: 88, borderRadius: 16, marginBottom: 10 }} />
            <Skeleton style={{ height: 88, borderRadius: 16, marginBottom: 10 }} />
            <Skeleton style={{ height: 88, borderRadius: 16 }} />
          </>
        ) : reports.length === 0 ? (
          <View className="bg-white rounded-2xl border border-cream-200 p-8 items-center">
            <Text className="text-3xl mb-2">🏷️</Text>
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#6F655A', textAlign: 'center' }}>
              {lang === 'en'
                ? "You haven't reported any prices yet."
                : 'Wala ka pang nai-report na presyo.'}
            </Text>
          </View>
        ) : (
          reports.map((r) => {
            const meta = STATUS_META[r.status];
            const place = r.tindahan?.name ?? r.market?.name ?? null;
            return (
              <View key={r.id} className="bg-white rounded-2xl border border-cream-200 p-4 mb-3">
                <View className="flex-row items-start justify-between gap-2">
                  <ItemThumb photo={r.photo} name={r.item_name} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#000000' }}>
                      {r.item_name}
                    </Text>
                    <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#C4881C', marginTop: 1 }}>
                      ₱{Number(r.reported_price).toFixed(2)} / {r.unit}
                    </Text>
                    <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginTop: 2 }}>
                      {place ? `${place} · ` : ''}{timeAgo(r.created_at, lang)}
                    </Text>
                  </View>
                  <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: meta.bg }}>
                    <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: meta.text }}>
                      {lang === 'en' ? meta.en : meta.tl}
                    </Text>
                  </View>
                </View>

                {r.status === 'declined' && r.declined_reason ? (
                  <View className="mt-2 rounded-xl px-3 py-2" style={{ backgroundColor: '#FCEBEB' }}>
                    <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#E24B4A' }}>
                      {lang === 'en' ? 'Reason: ' : 'Dahilan: '}
                      {declineReasonLabel(r.declined_reason, lang)}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
