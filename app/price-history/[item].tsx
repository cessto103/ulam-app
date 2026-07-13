import client from '@/src/api/client';
import { Skeleton, SkeletonListItem } from '@/src/components/Skeleton';
import { useLanguage } from '@/src/context/LanguageContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

// ─── Types ─────────────────────────────────────────────────────────────────────

type DayEntry = {
  date: string;
  avg: number;
  min: number;
  max: number;
  report_count: number;
};

type Report = {
  id: number;
  item_name: string;
  reported_price: number;
  unit: string;
  barangay: string | null;
  municipality: string | null;
  created_at: string;
  upvotes: number;
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

type HistoryResponse = {
  item: string;
  days: number;
  chart: DayEntry[];
  recent: Report[];
  official: OfficialPrice[];
};

const OFFICIAL_SOURCE_LABEL: Record<string, { en: string; tl: string }> = {
  da_bantay_presyo: { en: 'DA Bantay Presyo', tl: 'DA Bantay Presyo' },
  dti_srp: { en: 'DTI Suggested Retail Price', tl: 'DTI Suggested Retail Price' },
};

// ─── Bar chart ─────────────────────────────────────────────────────────────────

function BarChart({ data }: { data: DayEntry[] }) {
  if (data.length === 0) return null;

  const prices  = data.map((d) => d.avg);
  const maxP    = Math.max(...prices);
  const minP    = Math.min(...prices);
  const range   = maxP - minP || 1;
  const MIN_BAR = 0.08; // minimum bar height ratio so zero-value bars are still visible

  return (
    <View>
      {/* Y-axis labels + bars */}
      <View className="flex-row items-stretch" style={{ height: 130 }}>
        {/* Y labels */}
        <View className="justify-between pb-4 pr-1" style={{ width: 44 }}>
          <Text className="text-xs text-ink-soft text-right">₱{Math.ceil(maxP)}</Text>
          <Text className="text-xs text-ink-soft text-right">₱{Math.round((maxP + minP) / 2)}</Text>
          <Text className="text-xs text-ink-soft text-right">₱{Math.floor(minP)}</Text>
        </View>

        {/* Bars */}
        <View className="flex-1 flex-row items-end gap-0.5 pb-4">
          {data.map((d, i) => {
            const ratio    = MIN_BAR + (1 - MIN_BAR) * ((d.avg - minP) / range);
            const isLatest = i === data.length - 1;
            return (
              <View key={d.date} className="flex-1 items-center justify-end">
                <View
                  style={{
                    width: '72%',
                    height: `${Math.round(ratio * 100)}%`,
                    backgroundColor: isLatest ? '#386641' : '#4E7A47',
                    borderRadius: 3,
                    opacity: isLatest ? 1 : 0.7,
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>

      {/* X-axis date labels */}
      <View className="flex-row pl-11 gap-0.5">
        {data.map((d, i) => {
          const day = new Date(d.date).getDate();
          // Only show every other label to avoid crowding
          const show = data.length <= 10 || i % 2 === 0;
          return (
            <View key={d.date} className="flex-1 items-center">
              {show && (
                <Text className="text-ink-soft" style={{ fontSize: 12 }}>{day}</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

function timeAgo(iso: string, lang: 'en' | 'tl') {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1)  return lang === 'en' ? 'Just now' : 'Kanina';
  if (h < 24) return lang === 'en' ? `${h}h ago` : `${h}h ang nakakaraan`;
  const d = Math.floor(h / 24);
  return lang === 'en' ? `${d}d ago` : `${d}d ang nakakaraan`;
}

export default function PriceHistoryScreen() {
  const { item } = useLocalSearchParams<{ item: string }>();
  const router   = useRouter();
  const { lang } = useLanguage();
  const qc = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['price-history', item] });
    setRefreshing(false);
  };

  const { data, isLoading } = useQuery<HistoryResponse>({
    queryKey: ['price-history', item],
    queryFn:  () => client.get(`/prices/history/${encodeURIComponent(item)}`).then((r) => r.data),
    staleTime: 300_000,
  });

  const chart  = data?.chart  ?? [];
  const recent = data?.recent ?? [];

  const latestAvg = chart.length ? chart[chart.length - 1].avg : null;
  const allAvgs   = chart.map((d) => d.avg);
  const overallMin = allAvgs.length ? Math.min(...allAvgs) : null;
  const overallMax = allAvgs.length ? Math.max(...allAvgs) : null;
  const totalReports = chart.reduce((s, d) => s + d.report_count, 0);

  const trend =
    chart.length >= 2
      ? chart[chart.length - 1].avg - chart[chart.length - 2].avg
      : 0;

  return (
    <View className="flex-1 bg-cream-50">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 pt-12 pb-3 bg-white border-b border-cream-200">
        <Pressable onPress={() => router.back()} hitSlop={12} className="active:opacity-60">
          <Text style={{ fontSize: 20 }}>←</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-base font-medium text-ink">{data?.item ?? item}</Text>
          <Text className="text-xs text-ink-soft">{lang === 'en' ? 'Price history — 30 days' : 'Kasaysayan ng presyo — 30 araw'}</Text>
        </View>
        {trend !== 0 && latestAvg !== null && (
          <View className={`rounded-full px-2.5 py-1 ${trend > 0 ? 'bg-red-50' : 'bg-leaf-50'}`}>
            <Text className={`text-xs font-semibold ${trend > 0 ? 'text-red-600' : 'text-leaf-700'}`}>
              {trend > 0 ? '↑' : '↓'} ₱{Math.abs(trend).toFixed(0)}
            </Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={{ padding: 16 }}>
          <Skeleton style={{ height: 90, marginBottom: 14 }} radius={16} />
          <Skeleton style={{ height: 180, marginBottom: 14 }} radius={16} />
          {[0, 1, 2].map((i) => <SkeletonListItem key={i} />)}
        </View>
      ) : (
        <ScrollView
          contentContainerClassName="px-4 pt-4 pb-8"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#386641" />}
        >

          {/* Summary stats */}
          {latestAvg !== null && (
            <View className="bg-white rounded-2xl border border-cream-200 p-4 mb-4">
              <Text className="text-xs text-ink-soft mb-3">{lang === 'en' ? 'Current summary' : 'Buod ngayon'}</Text>
              <View className="flex-row gap-3">
                {[
                  { label: lang === 'en' ? 'Current' : 'Kasalukuyan',        val: `₱${latestAvg.toFixed(2)}`,    color: 'text-brand-600' },
                  { label: lang === 'en' ? 'Cheapest' : 'Pinaka-mura',       val: `₱${overallMin!.toFixed(2)}`,   color: 'text-leaf-600' },
                  { label: lang === 'en' ? 'Most expensive' : 'Pinaka-mahal', val: `₱${overallMax!.toFixed(2)}`,   color: 'text-red-500' },
                  { label: lang === 'en' ? 'Reports' : 'Mga ulat',           val: String(totalReports),            color: 'text-ink' },
                ].map((s) => (
                  <View key={s.label} className="flex-1 items-center">
                    <Text className={`text-base font-semibold ${s.color}`}>{s.val}</Text>
                    <Text className="text-xs text-ink-soft text-center" style={{ fontSize: 12 }}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Official DA/DTI reference prices */}
          {(data?.official?.length ?? 0) > 0 && (
            <View className="bg-leaf-50 rounded-2xl border border-cream-200 p-4 mb-4">
              <Text style={{ fontFamily: 'NunitoSans_800ExtraBold', fontSize: 12, color: '#386641', marginBottom: 8 }}>
                🏛️ {lang === 'en' ? 'Official Reference' : 'Opisyal na Sanggunian'}
              </Text>
              {data!.official.map((ref) => (
                <View key={ref.id} className="flex-row items-center justify-between py-1.5">
                  <View className="flex-1 pr-2">
                    <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, color: '#292522' }}>
                      {OFFICIAL_SOURCE_LABEL[ref.source]?.[lang] ?? ref.source}
                    </Text>
                    <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: '#6F655A' }}>
                      {ref.region}{ref.bulletin_date ? ` · ${ref.bulletin_date}` : ''}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 13, color: '#386641' }}>
                    {ref.price_min === ref.price_max
                      ? `₱${ref.price_min}/${ref.unit}`
                      : `₱${ref.price_min}–₱${ref.price_max}/${ref.unit}`}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Chart */}
          {chart.length > 0 ? (
            <View className="bg-white rounded-2xl border border-cream-200 p-4 mb-4">
              <Text className="text-xs font-medium text-ink-soft mb-3">
                {lang === 'en' ? 'Daily price (average, community)' : 'Presyo bawat araw (average, komunidad)'}
              </Text>
              <BarChart data={chart} />
            </View>
          ) : (
            <View className="bg-white rounded-2xl border border-cream-200 p-6 mb-4 items-center">
              <Text style={{ fontSize: 32, marginBottom: 8 }}>📊</Text>
              <Text className="text-sm text-ink-soft text-center">
                {lang === 'en'
                  ? <>No data yet for your area.{'\n'}Report a price to be the first!</>
                  : <>Walang datos pa para sa lugar mo.{'\n'}Mag-report ng presyo para maging una!</>}
              </Text>
            </View>
          )}

          {/* Recent reports list */}
          {recent.length > 0 && (
            <>
              <Text className="text-xs font-medium text-ink-soft uppercase tracking-wider mb-2">
                {lang === 'en' ? 'Latest Reports' : 'Mga Pinakabagong Ulat'}
              </Text>
              <View className="bg-white rounded-2xl border border-cream-200 overflow-hidden mb-4">
                {recent.map((r, i) => (
                  <View
                    key={r.id}
                    className={`flex-row justify-between items-center px-4 py-3 ${
                      i < recent.length - 1 ? 'border-b border-cream-200' : ''
                    }`}
                  >
                    <View className="flex-1">
                      <Text className="text-sm text-ink font-medium">
                        ₱{Number(r.reported_price).toFixed(2)}/{r.unit}
                      </Text>
                      <Text className="text-xs text-ink-soft">
                        {r.barangay ?? r.municipality ?? 'Local'} · {timeAgo(r.created_at, lang)}
                      </Text>
                    </View>
                    {r.upvotes > 0 && (
                      <View className="rounded-full bg-leaf-50 px-2 py-0.5">
                        <Text className="text-xs font-semibold text-leaf-700">👍 {r.upvotes}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </>
          )}

        </ScrollView>
      )}
    </View>
  );
}
