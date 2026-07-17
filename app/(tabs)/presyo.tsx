import client from '@/src/api/client';
import { useLanguage } from '@/src/context/LanguageContext';
import { SkeletonMarketCard, SkeletonPriceCard } from '@/src/components/Skeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

import AddButton from '@/src/components/AddButton';
import { Ionicons } from '@expo/vector-icons';
import GradientPageHeader from '@/src/components/GradientPageHeader';
import HeaderIconRow from '@/src/components/HeaderIconRow';

type Market = {
  id: number;
  kind?: 'market' | 'tindahan';
  name: string;
  type: string;
  barangay: string;
  municipality: string;
  stall_count: number | null;
  item_count: number;
  last_updated: string | null;
  distance_km?: number;
  source?: 'ulam' | 'osm';
  is_verified?: boolean;
};

type PriceEntry = {
  id: number;
  store_name: string;
  store_type: string;
  price: number;
  unit: string;
  updated_at: string;
};

type OfficialPrice = {
  id: number;
  source: 'da_bantay_presyo' | 'dti_srp';
  item_name: string;
  category: string | null;
  price_min: number;
  price_max: number;
  unit: string;
  region: string;
  bulletin_date: string | null;
  source_note: string | null;
};

type PriceResult = {
  item: string;
  entries: PriceEntry[];
  official: OfficialPrice[];
};

const OFFICIAL_SOURCE_LABEL: Record<string, { en: string; tl: string }> = {
  da_bantay_presyo: { en: 'DA Bantay Presyo', tl: 'DA Bantay Presyo' },
  dti_srp: { en: 'DTI Suggested Retail Price', tl: 'DTI Suggested Retail Price' },
};

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchMarkets(lat?: number, lng?: number, radiusKm?: number): Promise<Market[]> {
  try {
    const params = lat != null && lng != null
      ? `?lat=${lat}&lng=${lng}&radius_km=${radiusKm ?? 15}`
      : '';
    const { data } = await client.get(`/markets${params}`);
    return data.markets ?? [];
  } catch {
    return [];
  }
}

async function searchPrices(query: string): Promise<PriceResult | null> {
  if (!query.trim()) return null;
  try {
    const { data } = await client.get(`/prices/search?q=${encodeURIComponent(query)}`);
    return data;
  } catch {
    return null;
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORE_EMOJI: Record<string, string> = {
  isda: '🐟',
  karne: '🥩',
  gulay: '🥦',
  bigas: '🍚',
  sangkap: '🧴',
  wet_market: '🏪',
  palengke: '🏪',
  supermarket: '🏬',
  grocery: '🏬',
  tindahan: '🛒',
  Community: '👥',
};

const MARKET_TYPE_EMOJI: Record<string, string> = {
  palengke: '🏪',
  wet_market: '🏪',
  supermarket: '🏬',
  grocery: '🏬',
  tindahan: '🛒',
  convenience: '🏪',
};

const RADIUS_OPTIONS = [3, 5, 10, 15] as const;

function timeAgo(dateStr: string | null, lang: 'en' | 'tl'): string {
  if (!dateStr) return lang === 'en' ? 'No data yet' : 'Walang datos';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1)  return lang === 'en' ? 'Updated just now' : 'Kakalagay lang';
  if (hours < 24) return lang === 'en' ? `Updated ${hours}h ago` : `${hours}h nakaraang update`;
  const days = Math.floor(hours / 24);
  return lang === 'en' ? `Updated ${days}d ago` : `${days}d nakaraang update`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PresyoScreen() {
  const { t, lang } = useLanguage();
  const [search, setSearch]   = useState('');
  const [query, setQuery]     = useState('');
  const [votes, setVotes]     = useState<Record<number, 'up' | 'down' | null>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [gpsCoords, setGpsCoords]   = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating]     = useState(false);
  const [radiusKm, setRadiusKm]     = useState<number>(15);
  const router = useRouter();
  const qc     = useQueryClient();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['markets', gpsCoords?.lat, gpsCoords?.lng] }),
      query ? qc.invalidateQueries({ queryKey: ['prices', query] }) : Promise.resolve(),
    ]);
    setRefreshing(false);
  }, [qc, query, gpsCoords]);

  const castVote = useCallback(async (id: number, vote: 'up' | 'down') => {
    if (votes[id] === vote) return;
    setVotes((prev) => ({ ...prev, [id]: vote }));
    try {
      await client.post(`/prices/report/${id}/vote`, { vote });
    } catch {
      setVotes((prev) => ({ ...prev, [id]: null }));
    }
  }, [votes]);

  const findNearMe = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocating(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setGpsCoords(coords);
      qc.invalidateQueries({ queryKey: ['markets', coords.lat, coords.lng] });
    } finally {
      setLocating(false);
    }
  }, [qc]);

  const { data: markets = [], isLoading: marketsLoading } = useQuery({
    queryKey: ['markets', gpsCoords?.lat, gpsCoords?.lng, radiusKm],
    queryFn: () => fetchMarkets(gpsCoords?.lat, gpsCoords?.lng, radiusKm),
    staleTime: 5 * 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['prices', query],
    queryFn: () => searchPrices(query),
    enabled: !!query,
  });

  const entries = data?.entries ?? [];
  const cheapest = entries.length ? Math.min(...entries.map((e) => e.price)) : null;

  const doSearch = (q: string) => { setSearch(q); setQuery(q); };

  const goReport = (item?: string) => {
    const path = item ? `/report-price?item=${encodeURIComponent(item)}` : '/report-price';
    router.push(path as any);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: '#FFF8E8' }}>
      <GradientPageHeader
        title={lang === 'en' ? 'Prices' : 'Presyo'}
        subtitle={lang === 'en' ? 'Compare prices and help the community.' : 'Maghambing ng presyo at tumulong sa komunidad.'}
        rightSlot={<HeaderIconRow />}
        photo
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#386641" />
        }
      >
      <View className="px-4 pt-1">

      {/* ── Markets ── */}
      <View className="flex-row justify-between items-center mb-2">
        <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 14, color: '#000000' }}>
          {t('nearby_markets')}
        </Text>
        <View className="flex-row items-center gap-2">
          <AddButton label={lang === 'en' ? 'Add my Store' : 'Idagdag ang Tindahan'} onPress={() => router.push('/add-listing' as any)} />
          <Pressable
            onPress={findNearMe}
            disabled={locating}
            className="active:opacity-80"
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: gpsCoords ? '#5E693F' : '#6E7B4A',
              borderRadius: 999, paddingLeft: 4, paddingRight: 12, paddingVertical: 4,
              shadowColor: '#6E7B4A', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3,
              opacity: locating ? 0.7 : 1,
            }}
          >
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,248,232,0.28)', alignItems: 'center', justifyContent: 'center' }}>
              {locating
                ? <ActivityIndicator size="small" color="#fff" style={{ transform: [{ scale: 0.7 }] }} />
                : <Ionicons name="locate" size={13} color="#fff" />}
            </View>
            <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#fff' }}>
              {locating ? t('locating') : (gpsCoords ? t('near_gps') : t('near_you'))}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Radius selector — only meaningful for a GPS search */}
      {gpsCoords && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 4 }}
          style={{ marginBottom: 12 }}
        >
          <Ionicons name="navigate-circle-outline" size={16} color="#6F655A" />
          <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A' }}>
            {lang === 'en' ? 'Within' : 'Sa loob ng'}
          </Text>
          {RADIUS_OPTIONS.map((r) => {
            const active = radiusKm === r;
            return (
              <Pressable
                key={r}
                onPress={() => setRadiusKm(r)}
                className={`rounded-full px-3 py-1.5 ${active ? 'bg-leaf-600' : 'bg-white border border-cream-300'}`}
              >
                <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: active ? '#fff' : '#6F655A' }}>
                  {r} km
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => router.push(`/market-map?lat=${gpsCoords.lat}&lng=${gpsCoords.lng}` as any)}
            className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5 active:opacity-80"
            style={{ backgroundColor: '#E7653B', marginLeft: 4 }}
          >
            <Ionicons name="map-outline" size={13} color="#fff" />
            <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#fff' }}>
              {lang === 'en' ? 'Map' : 'Mapa'}
            </Text>
          </Pressable>
        </ScrollView>
      )}

      {marketsLoading ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }} style={{ marginBottom: 14 }}>
          {[0,1,2].map(i => <SkeletonMarketCard key={i} />)}
        </ScrollView>
      ) : markets.length === 0 ? (
        <View className="bg-white rounded-2xl border border-cream-200 p-5 mb-3 items-center">
          <Text className="text-2xl mb-1">🏪</Text>
          <Text className="text-xs text-ink-soft">{t('no_markets_found')}</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
          style={{ marginBottom: 14 }}
        >
          {markets.map((market) => {
            const isStore = market.kind === 'tindahan';
            return (
              <Pressable
                key={`${market.kind ?? 'market'}-${market.id}`}
                onPress={() => router.push((isStore ? `/stall/${market.id}` : `/market/${market.id}`) as any)}
                className="bg-white rounded-2xl border border-cream-200 active:opacity-75"
                style={{ width: 170, padding: 14 }}
              >
                <View className="flex-row items-start justify-between">
                  <Text style={{ fontSize: 24, marginBottom: 6 }}>
                    {MARKET_TYPE_EMOJI[market.type] ?? (isStore ? '🛒' : '🏪')}
                  </Text>
                  {market.distance_km != null && (
                    <View className="rounded-full bg-leaf-50 px-2 py-0.5">
                      <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 11, color: '#386641' }}>
                        {market.distance_km < 1 ? `${Math.round(market.distance_km * 1000)} m` : `${market.distance_km.toFixed(1)} km`}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={{ fontFamily: 'Baloo2_700Bold', fontSize: 14, color: '#000000', marginBottom: 2 }}
                  numberOfLines={2}
                >
                  {market.name}
                </Text>
                {market.source === 'osm' ? (
                  <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 11, color: '#6F655A', marginBottom: 1 }}>
                    🌐 {lang === 'en' ? 'From OpenStreetMap' : 'Mula sa OpenStreetMap'}
                  </Text>
                ) : market.is_verified ? (
                  <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 11, color: '#386641', marginBottom: 1 }}>
                    ✓ {lang === 'en' ? 'Verified on uLam' : 'Beripikado sa uLam'}
                  </Text>
                ) : null}
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }} numberOfLines={1}>
                  {market.barangay}
                </Text>
                {isStore && (
                  <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A', marginTop: 1 }}>
                    {lang === 'en' ? 'Independent store' : 'Sariling tindahan'}
                  </Text>
                )}
                <View className="flex-row items-center justify-between mt-2">
                  <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#4E7A47' }}>
                    {market.item_count} {t('items')}
                  </Text>
                  {!isStore && (
                    <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
                      {market.stall_count} {t('stalls')}
                    </Text>
                  )}
                </View>
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginTop: 3 }}>
                  {timeAgo(market.last_updated, lang)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* ── Price checker ── */}
      <View className="flex-row justify-between items-center mb-3">
        <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 14, color: '#000000' }}>{t('price_checker')}</Text>
      </View>

      {/* Search bar */}
      <View className="relative mb-4">
        <Text className="absolute left-3 top-3 text-sm z-10" style={{ lineHeight: 18 }}>🔍</Text>
        <TextInput
          className="w-full bg-white rounded-xl border border-cream-300 pl-9 pr-12 py-3 text-sm text-ink"
          placeholder={t('search_price')}
          placeholderTextColor="#B0A18C"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => setQuery(search)}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable
            onPress={() => { setSearch(''); setQuery(''); }}
            className="absolute right-3 top-0 bottom-0 justify-center px-1"
          >
            <Text className="text-xs text-ink-soft">✕</Text>
          </Pressable>
        )}
      </View>

      {isLoading && <SkeletonPriceCard />}

      {/* Official DA/DTI reference prices */}
      {data && data.official.length > 0 && (
        <View className="bg-leaf-50 rounded-2xl border border-cream-200 p-4 mb-3">
          <Text style={{ fontFamily: 'NunitoSans_800ExtraBold', fontSize: 13, color: '#386641', marginBottom: 8 }}>
            🏛️ {lang === 'en' ? 'Official Reference' : 'Opisyal na Sanggunian'}
          </Text>
          {data.official.map((ref) => (
            <View key={ref.id} className="flex-row items-center justify-between py-1.5">
              <View className="flex-1 pr-2">
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#000000' }}>
                  {OFFICIAL_SOURCE_LABEL[ref.source]?.[lang] ?? ref.source}
                </Text>
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
                  {ref.region}{ref.bulletin_date ? ` · ${ref.bulletin_date}` : ''}
                </Text>
              </View>
              <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 14, color: '#386641' }}>
                {ref.price_min === ref.price_max
                  ? `₱${ref.price_min}/${ref.unit}`
                  : `₱${ref.price_min}–₱${ref.price_max}/${ref.unit}`}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Search results */}
      {data && entries.length > 0 ? (
        <View className="bg-white rounded-2xl border border-cream-200 p-4 mb-3">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-sm font-medium text-ink capitalize">{data.item}</Text>
            <Text className="text-xs text-ink-soft">{entries.length} {lang === 'en' ? 'stores' : 'tindahan'}</Text>
          </View>

          {[...entries].sort((a, b) => a.price - b.price).map((entry) => {
            const isCommunity = entry.store_type === 'Community';
            const myVote = votes[entry.id];
            return (
              <View key={`${entry.id}-${entry.store_name}`} className="py-2.5 border-b border-cream-200 last:border-b-0">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2 flex-1">
                    <Text style={{ fontSize: 16 }}>{STORE_EMOJI[entry.store_type] ?? '🏪'}</Text>
                    <View className="flex-1">
                      <Text className="text-sm text-ink">{entry.store_name}</Text>
                      <Text className="text-xs text-ink-soft capitalize">{entry.store_type}</Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-sm font-semibold text-brand-600">₱{entry.price}/{entry.unit}</Text>
                    {entry.price === cheapest && (
                      <View className="rounded-full bg-leaf-50 px-2 py-0.5 mt-0.5">
                        <Text className="text-xs font-semibold text-ink">{t('cheapest')}</Text>
                      </View>
                    )}
                  </View>
                </View>
                {isCommunity && (
                  <View className="flex-row gap-2 mt-1.5 ml-7">
                    <Pressable
                      onPress={() => castVote(entry.id, 'up')}
                      className={`flex-row items-center gap-1 rounded-full px-2.5 py-0.5 ${myVote === 'up' ? 'bg-olive-400' : 'bg-cream-200'} active:opacity-70`}
                    >
                      <Text style={{ fontSize: 13, color: myVote === 'up' ? '#fff' : '#6F655A' }}>👍</Text>
                      <Text style={{ fontSize: 13, fontFamily: 'NunitoSans_600SemiBold', color: myVote === 'up' ? '#fff' : '#6F655A' }}>{lang === 'en' ? 'Correct' : 'Tama'}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => castVote(entry.id, 'down')}
                      className={`flex-row items-center gap-1 rounded-full px-2.5 py-0.5 ${myVote === 'down' ? 'bg-red-500' : 'bg-cream-200'} active:opacity-70`}
                    >
                      <Text style={{ fontSize: 13, color: myVote === 'down' ? '#fff' : '#6F655A' }}>👎</Text>
                      <Text style={{ fontSize: 13, fontFamily: 'NunitoSans_600SemiBold', color: myVote === 'down' ? '#fff' : '#6F655A' }}>{lang === 'en' ? 'Wrong' : 'Mali'}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}

          <View className="mt-3 pt-3 border-t border-cream-200 flex-row items-center justify-between gap-2">
            <Pressable
              onPress={() => router.push(`/price-history/${encodeURIComponent(data.item)}` as any)}
              className="flex-1 rounded-xl border border-cream-300 py-2 items-center active:opacity-70"
            >
              <Text className="text-xs font-medium text-ink-soft">📈 {lang === 'en' ? 'History' : 'Kasaysayan'}</Text>
            </Pressable>
            <Pressable
              onPress={() => goReport(data.item)}
              className="flex-1 rounded-xl bg-leaf-50 py-2 items-center active:opacity-70"
            >
              <Text className="text-xs font-medium text-leaf-700">📢 {lang === 'en' ? 'Report' : 'I-report'} +15 XP</Text>
            </Pressable>
          </View>
        </View>
      ) : query && !isLoading ? (
        <View className="bg-white rounded-2xl border border-cream-200 p-6 items-center mb-3">
          <Text className="text-3xl mb-2">🔎</Text>
          <Text className="text-sm text-ink-soft text-center mb-3">
            {lang === 'en' ? `No price found for "${query}"` : `Walang presyo na nahanap para sa "${query}"`}
          </Text>
          <Pressable onPress={() => goReport(query)} className="rounded-xl bg-brand-600 px-4 py-2.5">
            <Text className="text-xs font-semibold text-white">{lang === 'en' ? 'Be the first, report it (+15 XP)' : 'Ikaw ang una, mag-report (+15 XP)'}</Text>
          </Pressable>
        </View>
      ) : !query ? (
        <View className="bg-white rounded-2xl border border-cream-200 p-5 mb-3">
          <Text className="text-xs font-semibold text-ink-soft mb-3">{t('popular_searches')}</Text>
          {[
            { label: 'Galunggong',      emoji: '🐟' },
            { label: 'Tilapia',         emoji: '🐟' },
            { label: 'Kamatis',         emoji: '🍅' },
            { label: 'Sibuyas',         emoji: '🧅' },
            { label: 'Baboy Liempo',    emoji: '🥩' },
            { label: 'Manok (buo)',     emoji: '🍗' },
            { label: 'Bigas (regular)', emoji: '🍚' },
            { label: 'Itlog ng Manok',  emoji: '🥚' },
          ].map((item) => (
            <Pressable
              key={item.label}
              onPress={() => doSearch(item.label)}
              className="py-2.5 border-b border-cream-200 flex-row items-center gap-2 active:opacity-70 last:border-b-0"
            >
              <Text style={{ fontSize: 16 }}>{item.emoji}</Text>
              <Text className="text-sm text-ink flex-1">{item.label}</Text>
              <Pressable
                onPress={() => router.push(`/price-history/${encodeURIComponent(item.label)}` as any)}
                hitSlop={8}
                className="active:opacity-60"
              >
                <Text className="text-xs text-leaf-500">📈</Text>
              </Pressable>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Report price card */}
      <View className="bg-white rounded-2xl border border-cream-200 p-4">
        <View className="flex-row items-center gap-2 mb-1">
          <Text style={{ fontSize: 18 }}>📢</Text>
          <Text className="text-sm font-medium text-ink">{t('report_price')}</Text>
        </View>
        <Text className="text-xs text-ink-soft mb-3 ml-7">
          {lang === 'en'
            ? 'Help the community: everyone sees the right price. +15 XP per report.'
            : 'Tumulong sa komunidad: nakakakita ng tamang presyo ang lahat. +15 XP per report.'}
        </Text>
        <Pressable
          onPress={() => goReport(query || undefined)}
          className="w-full rounded-xl bg-brand-600 py-3 items-center active:opacity-80"
        >
          <Text className="text-sm font-semibold text-white">{t('report_price_btn')}</Text>
        </Pressable>
      </View>
      </View>
      </ScrollView>
    </View>
  );
}
