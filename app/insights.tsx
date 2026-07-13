import client from '@/src/api/client';
import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';
type Metric = 'posts_count' | 'posts_engagement' | 'recipes_count' | 'recipes_engagement' | 'store_popularity';

type Boost = {
  id: number;
  target: 'recipe' | 'tindahan';
  target_name: string | null;
  status: string;
  duration_days: number | null;
  starts_at: string | null;
  expires_at: string | null;
  views_before: number | null;
  views_during: number | null;
};

type Summary = {
  subscription: { plan_slug: string; plan_name: string; active: boolean; expires_at: string | null };
  boosts: Boost[];
  totals: { posts: number; recipes: number; stores: number; views_received: number };
};

const CHART_WIDTH = Dimensions.get('window').width - 80;

function PeriodToggle({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const { lang } = useLanguage();
  const options: { key: Period; label: string }[] = [
    { key: 'daily', label: lang === 'en' ? 'D' : 'A' },
    { key: 'weekly', label: lang === 'en' ? 'W' : 'L' },
    { key: 'monthly', label: lang === 'en' ? 'M' : 'B' },
    { key: 'yearly', label: lang === 'en' ? 'Y' : 'T' },
  ];
  return (
    <View className="flex-row bg-cream-100 rounded-lg p-0.5">
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            className={`w-7 h-7 items-center justify-center rounded-md ${active ? 'bg-brand-500' : ''}`}
          >
            <Text className={`text-[12px] font-bold ${active ? 'text-white' : 'text-ink-soft'}`}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function InsightGraph({ metric, title, color }: { metric: Metric; title: string; color: string }) {
  const [period, setPeriod] = useState<Period>('weekly');

  const { data, isLoading } = useQuery({
    queryKey: ['insights-graph', metric, period],
    queryFn: async () => (await client.get<{ labels: string[]; values: number[] }>('/insights/graph', {
      params: { metric, period },
    })).data,
  });

  const total = (data?.values ?? []).reduce((a, b) => a + b, 0);
  const chartData = (data?.values ?? []).map((v, i) => ({ value: v, label: data?.labels[i] ?? '' }));
  const allZero = total === 0;

  return (
    <View className="bg-white rounded-2xl border border-cream-200 p-4 mb-4">
      <View className="flex-row items-center justify-between mb-1">
        <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#292522' }}>{title}</Text>
        <PeriodToggle value={period} onChange={setPeriod} />
      </View>
      <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 20, color, marginBottom: 8 }}>{total}</Text>

      {isLoading ? (
        <View style={{ height: 120, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={color} />
        </View>
      ) : allZero ? (
        <View style={{ height: 120, alignItems: 'center', justifyContent: 'center' }}>
          <Text className="text-xs text-ink-soft">No activity in this period yet</Text>
        </View>
      ) : (
        <LineChart
          data={chartData}
          width={CHART_WIDTH}
          height={120}
          color={color}
          thickness={2.5}
          curved
          areaChart
          startFillColor={color}
          endFillColor={color}
          startOpacity={0.25}
          endOpacity={0.02}
          hideDataPoints
          hideRules
          xAxisColor="#F0DEBB"
          yAxisColor="transparent"
          yAxisTextStyle={{ color: '#6F655A', fontSize: 12 }}
          xAxisLabelTextStyle={{ color: '#6F655A', fontSize: 12 }}
          noOfSections={3}
          initialSpacing={8}
          endSpacing={8}
        />
      )}
    </View>
  );
}

function BoostRow({ boost }: { boost: Boost }) {
  const { lang } = useLanguage();
  const statusColors: Record<string, { bg: string; text: string }> = {
    active: { bg: '#EFF4EC', text: '#386641' },
    pending: { bg: '#FEF6E3', text: '#9A6A12' },
    expired: { bg: '#F5F5F4', text: '#6F655A' },
    rejected: { bg: '#FCEBEB', text: '#DC2626' },
  };
  const c = statusColors[boost.status] ?? statusColors.expired;

  return (
    <View className="flex-row items-center justify-between py-3 border-b border-cream-100">
      <View className="flex-1 mr-2">
        <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 12, color: '#292522' }} numberOfLines={1}>
          {boost.target === 'recipe' ? '🍽️' : '🏪'} {boost.target_name ?? '—'}
        </Text>
        {boost.views_before !== null && (
          <Text className="text-[12px] text-ink-soft mt-0.5">
            {lang === 'en' ? 'Views' : 'Views'}: {boost.views_before} → {boost.views_during}
            {boost.views_during! > boost.views_before! ? ' 📈' : ''}
          </Text>
        )}
      </View>
      <View style={{ backgroundColor: c.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: c.text, textTransform: 'capitalize' }}>{boost.status}</Text>
      </View>
    </View>
  );
}

export default function InsightsScreen() {
  const { lang } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['insights-summary'],
    queryFn: async () => (await client.get<Summary>('/insights/summary')).data,
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFCF5' }}>
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
            <Ionicons name="arrow-back" size={18} color="#292522" />
          </Pressable>
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#292522', flex: 1 }}>
            {lang === 'en' ? 'My Insights' : 'Aking Insights'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerClassName="px-4 pt-4 pb-12">
        {/* Subscription + totals */}
        {summaryLoading ? (
          <ActivityIndicator color="#E7653B" style={{ marginVertical: 24 }} />
        ) : summary ? (
          <>
            <Pressable
              onPress={() => router.push('/subscription' as any)}
              className="rounded-2xl bg-brand-500 p-4 mb-4 flex-row items-center justify-between active:opacity-90"
            >
              <View>
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, color: 'rgba(255,248,232,0.8)' }}>
                  {lang === 'en' ? 'Current plan' : 'Kasalukuyang plano'}
                </Text>
                <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#fff' }}>{summary.subscription.plan_name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </Pressable>

            <View className="flex-row gap-3 mb-4">
              {[
                { label: lang === 'en' ? 'Posts' : 'Posts', value: summary.totals.posts, color: '#386641' },
                { label: lang === 'en' ? 'Recipes' : 'Recipe', value: summary.totals.recipes, color: '#E7653B' },
                { label: lang === 'en' ? 'Stores' : 'Tindahan', value: summary.totals.stores, color: '#9A6A12' },
                { label: lang === 'en' ? 'Views' : 'Views', value: summary.totals.views_received, color: '#2C5234' },
              ].map((s) => (
                <View key={s.label} className="flex-1 rounded-2xl border border-cream-200 bg-white p-3 items-center">
                  <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: s.color }}>{s.value}</Text>
                  <Text className="text-[12px] text-ink-soft mt-0.5">{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Boosts */}
            {summary.boosts.length > 0 && (
              <View className="bg-white rounded-2xl border border-cream-200 p-4 mb-4">
                <Text className="text-xs font-semibold text-ink-soft uppercase mb-1">
                  {lang === 'en' ? 'Boosts' : 'Mga Boost'}
                </Text>
                {summary.boosts.map((b) => <BoostRow key={b.id} boost={b} />)}
              </View>
            )}
          </>
        ) : null}

        {/* Graphs */}
        <InsightGraph metric="posts_count" title={lang === 'en' ? 'Posts created' : 'Mga Post'} color="#386641" />
        <InsightGraph metric="posts_engagement" title={lang === 'en' ? 'Post views' : 'Views ng Post'} color="#4E7A47" />
        <InsightGraph metric="recipes_count" title={lang === 'en' ? 'Recipes created' : 'Mga Recipe'} color="#E7653B" />
        <InsightGraph metric="recipes_engagement" title={lang === 'en' ? 'Recipe views' : 'Views ng Recipe'} color="#EC8156" />
        <InsightGraph metric="store_popularity" title={lang === 'en' ? 'Store popularity (views)' : 'Popularidad ng Tindahan'} color="#9A6A12" />
      </ScrollView>
    </View>
  );
}
