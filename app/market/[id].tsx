import client from '@/src/api/client';
import { useLanguage } from '@/src/context/LanguageContext';
import DirectionsButton from '@/src/components/DirectionsButton';
import ReportModal from '@/src/components/ReportModal';
import { Skeleton, SkeletonPriceCard, SkeletonRow } from '@/src/components/Skeleton';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

type MarketInfo = {
  id: number;
  name: string;
  type: string;
  barangay: string;
  municipality: string;
  latitude: number | null;
  longitude: number | null;
  source?: 'ulam' | 'osm';
};

type PriceItem = {
  id: number;
  item_name: string;
  price: number;
  unit: string;
  stall_name: string;
  stall_type: string;
  updated_at: string;
};

type MarketDetail = {
  market: MarketInfo;
  stalls: { id: number; name: string; type: string }[];
  by_category: Record<string, PriceItem[]>;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CAT_EMOJI: Record<string, string> = {
  isda:    '🐟',
  karne:   '🥩',
  gulay:   '🥦',
  bigas:   '🍚',
  prutas:  '🍎',
  sangkap: '🧴',
  itlog:   '🥚',
  manok:   '🍗',
  baboy:   '🥩',
  baka:    '🥩',
  'iba pa':'📦',
};

const CAT_LABEL_EN: Record<string, string> = {
  isda:    'Fish & Seafood',
  karne:   'Meat',
  gulay:   'Vegetables',
  bigas:   'Rice & Grains',
  prutas:  'Fruits',
  sangkap: 'Spices & Condiments',
  itlog:   'Eggs & Dairy',
  manok:   'Chicken',
  baboy:   'Pork',
  baka:    'Beef',
  'iba pa':'Others',
};

const CAT_LABEL_TL: Record<string, string> = {
  isda:    'Isda & Pagkain-dagat',
  karne:   'Karne',
  gulay:   'Gulay',
  bigas:   'Bigas & Butil',
  prutas:  'Prutas',
  sangkap: 'Pampalasa & Sangkap',
  itlog:   'Itlog & Gatas',
  manok:   'Manok',
  baboy:   'Baboy',
  baka:    'Baka',
  'iba pa':'Iba Pa',
};

function relativeTime(dateStr: string, lang: 'en' | 'tl'): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return lang === 'en' ? 'Just now' : 'Kanina';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MarketDetailScreen() {
  const { id }       = useLocalSearchParams<{ id: string }>();
  const { t, lang }  = useLanguage();
  const router       = useRouter();
  const qc           = useQueryClient();
  const insets       = useSafeAreaInsets();
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const onPullRefresh = async () => {
    setPullRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['market', id] });
    setPullRefreshing(false);
  };

  const { mutate: refresh, isPending: refreshing } = useMutation({
    mutationFn: () => client.post(`/markets/${id}/refresh`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market', id] }),
  });

  const { data, isLoading, error } = useQuery<MarketDetail>({
    queryKey: ['market', id],
    queryFn: async () => {
      const { data } = await client.get(`/markets/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const categories = data ? Object.keys(data.by_category) : [];
  const activeCat  = selectedCat ?? categories[0] ?? null;

  function catLabel(cat: string): string {
    const map = lang === 'en' ? CAT_LABEL_EN : CAT_LABEL_TL;
    return map[cat] ?? cat;
  }

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
            <Ionicons name="arrow-back" size={18} color="#3C3A2F" />
          </Pressable>
          <View className="flex-1">
            {isLoading ? (
              <View className="h-5 w-40 bg-cream-200 rounded" />
            ) : (
              <>
                <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#3C3A2F' }} numberOfLines={1}>
                  {data?.market.name ?? '—'}
                </Text>
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
                  {data?.market.barangay}, {data?.market.municipality}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 12 }}>
          {/* Tab strip skeleton */}
          <SkeletonRow gap={8}>
            {[0,1,2,3].map(i => <Skeleton key={i} style={{ height: 30, width: 80, borderRadius: 20 }} />)}
          </SkeletonRow>
          <View style={{ height: 12 }} />
          <SkeletonPriceCard />
        </ScrollView>
      ) : error || !data ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-3xl mb-2">😕</Text>
          <Text className="text-sm text-ink-soft text-center">
            {lang === 'en' ? 'Could not load market. Please try again.' : 'Hindi ma-load ang palengke. Subukan muli.'}
          </Text>
          <Pressable onPress={() => router.back()} className="mt-4 px-5 py-2 bg-brand-600 rounded-xl active:opacity-80">
            <Text className="text-sm font-semibold text-white">
              {lang === 'en' ? 'Go back' : 'Bumalik'}
            </Text>
          </Pressable>
        </View>
      ) : (
        /* ── Flex container so tab strip stays fixed and price list scrolls ── */
        <View style={{ flex: 1 }}>

          {/* Source + directions row */}
          {(data.market.source === 'osm' || (data.market.latitude != null && data.market.longitude != null)) && (
            <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
              {data.market.source === 'osm' && (
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A', marginBottom: 8 }}>
                  🌐 {lang === 'en' ? 'Location data from OpenStreetMap' : 'Lokasyon mula sa OpenStreetMap'}
                </Text>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {data.market.latitude != null && data.market.longitude != null && (
                  <View style={{ flex: 1 }}>
                    <DirectionsButton latitude={data.market.latitude} longitude={data.market.longitude} compact />
                  </View>
                )}
                <Pressable
                  onPress={() => refresh()}
                  disabled={refreshing}
                  accessibilityLabel={lang === 'en' ? 'Refresh prices' : 'I-refresh ang presyo'}
                  style={{
                    width: 44, height: 44, borderRadius: 12,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: refreshing ? '#F9EDD3' : '#EFF4EC',
                  }}
                >
                  {refreshing
                    ? <ActivityIndicator size="small" color="#6E7B4A" />
                    : <Ionicons name="refresh" size={20} color="#6E7B4A" />}
                </Pressable>
                {data && (
                  <Pressable
                    onPress={() => setReportOpen(true)}
                    accessibilityLabel={lang === 'en' ? 'Report this market' : 'I-report ang palengkeng ito'}
                    className="active:opacity-70"
                    style={{
                      width: 44, height: 44, borderRadius: 12,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: '#FCEBEB',
                    }}
                  >
                    <Ionicons name="flag-outline" size={19} color="#E24B4A" />
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {/* Category tab strip — fixed height, never shrinks */}
          {categories.length > 0 && (
            <View style={{
              height: 52,
              backgroundColor: '#fff',
              borderBottomWidth: 1,
              borderBottomColor: '#F9EDD3',
            }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}
              >
                {categories.map((cat) => {
                  const active = cat === activeCat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setSelectedCat(cat)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                        borderRadius: 20,
                        backgroundColor: active ? '#6E7B4A' : '#F9EDD3',
                      }}
                    >
                      <Text style={{
                        fontFamily: 'NunitoSans_600SemiBold',
                        fontSize: 13,
                        color: active ? '#fff' : '#3C3A2F',
                      }}>
                        {CAT_EMOJI[cat] ?? '📦'} {catLabel(cat)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Price list — takes all remaining space */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
            refreshControl={<RefreshControl refreshing={pullRefreshing} onRefresh={onPullRefresh} tintColor="#6E7B4A" />}
          >
            {categories.length === 0 ? (
              <View className="bg-white rounded-2xl border border-cream-200 p-8 items-center">
                <Text className="text-3xl mb-2">🏪</Text>
                <Text className="text-sm text-ink-soft text-center">{t('no_items_in_market')}</Text>
              </View>
            ) : activeCat ? (
              <>
                <View className="flex-row justify-between items-center mb-2 px-1">
                  <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    {CAT_EMOJI[activeCat] ?? '📦'} {catLabel(activeCat)}
                  </Text>
                  <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
                    {data.by_category[activeCat]?.length ?? 0} {t('items')}
                  </Text>
                </View>

                <View className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
                  {(data.by_category[activeCat] ?? []).map((item, idx, arr) => {
                    const cheapest = arr[0].price;
                    const isCheap  = item.price === cheapest;
                    return (
                      <View
                        key={item.id}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
                          borderBottomColor: '#FFFCF5',
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: '#3C3A2F' }}>
                            {item.item_name}
                          </Text>
                          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginTop: 1 }}>
                            {item.stall_name} · {relativeTime(item.updated_at, lang)}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 15, color: isCheap ? '#6E7B4A' : '#3C3A2F' }}>
                            ₱{Number(item.price).toFixed(2)}
                          </Text>
                          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
                            /{item.unit}
                          </Text>
                          {isCheap && arr.length > 1 && (
                            <View style={{ backgroundColor: '#EFF4EC', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1, marginTop: 2 }}>
                              <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6E7B4A' }}>
                                {t('cheapest')}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : null}

            {/* Report CTA */}
            <Pressable
              onPress={() => router.push('/report-price' as any)}
              className="mt-4 bg-leaf-50 rounded-2xl border border-cream-200 p-4 flex-row items-center gap-3 active:opacity-75"
            >
              <Text style={{ fontSize: 20 }}>📢</Text>
              <View className="flex-1">
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: '#6E7B4A' }}>
                  {t('report_price')}
                </Text>
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
                  {lang === 'en' ? 'Help the community · +15 XP' : 'Tumulong sa komunidad · +15 XP'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#6E7B4A" />
            </Pressable>
          </ScrollView>
        </View>
      )}

      {data && (
        <ReportModal
          visible={reportOpen}
          onClose={() => setReportOpen(false)}
          reportableType="market"
          reportableId={data.market.id}
        />
      )}
    </View>
  );
}
