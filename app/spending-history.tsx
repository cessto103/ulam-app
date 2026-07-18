import client from '@/src/api/client';
import { Skeleton, SkeletonListItem } from '@/src/components/Skeleton';
import { useLanguage } from '@/src/context/LanguageContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HEADER_GRADIENT = ['#CC5027', '#E7653B', '#EC8156'] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type BreakdownItem = { category: string; amount: number };

type DayLog = {
  date: string;
  budgeted: number;
  spent: number;
  saved: number;
  expense_breakdown: BreakdownItem[] | null;
  notes: string | null;
};

type HistoryData = {
  has_budget: boolean;
  period: {
    start_date: string;
    end_date: string;
    total_days: number;
    daily_food_budget: number;
    total_amount: number;
  };
  logs: DayLog[];
};

// ─── Constants ─────────────────────────────────────────────────────────────────

const MEAL_LABEL_EN: Record<string, string> = {
  almusal: 'Breakfast', tanghalian: 'Lunch', meryenda: 'Snack',
  hapunan: 'Dinner', iba_pa: 'Others',
};
const MEAL_LABEL_TL: Record<string, string> = {
  almusal: 'Almusal', tanghalian: 'Tanghalian', meryenda: 'Meryenda',
  hapunan: 'Hapunan', iba_pa: 'Iba pa',
};
const MEAL_EMOJI: Record<string, string> = {
  almusal: '🍳', tanghalian: '☀️', meryenda: '🍌', hapunan: '🌙', iba_pa: '💸',
};

// ─── Bar chart ────────────────────────────────────────────────────────────────

function Bar({ log, maxVal, lang }: { log: DayLog; maxVal: number; lang: 'en' | 'tl' }) {
  const BAR_H = 72;
  const ratio  = maxVal > 0 ? Math.min(1, log.spent / maxVal) : 0;
  const over   = log.spent > log.budgeted;
  const dayStr = new Date(log.date + 'T00:00:00').toLocaleDateString(lang === 'en' ? 'en-PH' : 'fil-PH', { weekday: 'narrow' });
  const color  = over ? '#E7653B' : '#386641';

  return (
    <View className="items-center" style={{ minWidth: 32 }}>
      {log.spent > 0 && (
        <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color, marginBottom: 3 }}>
          {Math.round(log.spent)}
        </Text>
      )}
      <View style={{ width: 20, height: BAR_H, backgroundColor: '#EFF4EC', borderRadius: 10, justifyContent: 'flex-end', overflow: 'hidden' }}>
        <View style={{ width: '100%', height: Math.max(4, ratio * BAR_H), backgroundColor: color, borderRadius: 10 }} />
      </View>
      <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginTop: 3 }}>{dayStr}</Text>
    </View>
  );
}

// ─── API ───────────────────────────────────────────────────────────────────────

async function fetchHistory(): Promise<HistoryData> {
  const { data } = await client.get('/budget/history');
  return data;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SpendingHistoryScreen() {
  const router = useRouter();
  const { lang } = useLanguage();
  const qc = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['budget-history'] });
    setRefreshing(false);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['budget-history'],
    queryFn: fetchHistory,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-cream-50">
        <View style={{ padding: 16, paddingTop: 24 }}>
          <Skeleton style={{ height: 100, marginBottom: 14 }} radius={16} />
          <Skeleton style={{ height: 160, marginBottom: 14 }} radius={16} />
          {[0, 1, 2].map((i) => <SkeletonListItem key={i} />)}
        </View>
      </SafeAreaView>
    );
  }

  if (!data?.has_budget) {
    return (
      <SafeAreaView className="flex-1 bg-cream-50">
        <LinearGradient
          colors={HEADER_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="flex-row items-center px-4 pt-4 pb-4 gap-3"
        >
          <Pressable onPress={() => router.back()} className="p-2 active:opacity-70">
            <Text style={{ fontSize: 20, color: '#fff' }}>←</Text>
          </Pressable>
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 18, color: '#fff' }}>
            {lang === 'en' ? 'Spending History' : 'Kasaysayan ng Gastos'}
          </Text>
        </LinearGradient>
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ fontSize: 48, marginBottom: 16 }}>📊</Text>
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#000000', marginBottom: 8, textAlign: 'center' }}>
            {lang === 'en' ? 'No budget yet' : 'Walang budget pa'}
          </Text>
          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#6F655A', textAlign: 'center', lineHeight: 20 }}>
            {lang === 'en'
              ? 'Set up a budget first to see your spending history.'
              : 'I-setup muna ang budget para makita ang kasaysayan ng iyong gastos.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const logs          = data.logs;
  const totalSpent    = logs.reduce((s, l) => s + l.spent, 0);
  const totalBudgeted = logs.reduce((s, l) => s + l.budgeted, 0);
  const totalSaved    = Math.max(0, totalBudgeted - totalSpent);
  const maxVal        = Math.max(...logs.map(l => Math.max(l.spent, l.budgeted)), 1);
  const daysLogged    = logs.filter(l => l.spent > 0).length;

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      {/* Header */}
      <LinearGradient
        colors={HEADER_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="flex-row items-center px-4 pt-4 pb-4 gap-3"
      >
        <Pressable onPress={() => router.back()} className="p-2 active:opacity-70">
          <Text style={{ fontSize: 20, color: '#fff' }}>←</Text>
        </Pressable>
        <View className="flex-1">
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 18, color: '#fff' }}>
            {lang === 'en' ? 'Spending History' : 'Kasaysayan ng Gastos'}
          </Text>
          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
            {lang === 'en'
              ? `${data.period.total_days}-day period · ${daysLogged} logged`
              : `${data.period.total_days} araw na period · ${daysLogged} na-log`}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#386641" colors={['#386641']} />}
      >
        {/* Summary row */}
        <View className="flex-row gap-3 px-4 pt-4">
          {[
            { label: 'Budget',                                      val: `₱${totalBudgeted.toFixed(0)}`, color: '#000000',  bg: 'white' },
            { label: lang === 'en' ? 'Spent' : 'Ginastos',           val: `₱${totalSpent.toFixed(0)}`,    color: '#E7653B',  bg: '#FFF5F0' },
            { label: lang === 'en' ? 'Saved' : 'Natipid',            val: `₱${totalSaved.toFixed(0)}`,    color: '#386641',  bg: '#EFF4EC' },
          ].map(card => (
            <View key={card.label} className="flex-1 rounded-2xl border border-cream-200 p-3" style={{ backgroundColor: card.bg }}>
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginBottom: 2 }}>{card.label}</Text>
              <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 15, color: card.color }}>{card.val}</Text>
            </View>
          ))}
        </View>

        {/* Bar chart */}
        {logs.length > 0 && (
          <View className="bg-white rounded-2xl border border-cream-200 mx-4 mt-4 p-4">
            <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 14, color: '#000000', marginBottom: 12 }}>
              {lang === 'en' ? 'Daily spending' : 'Gastos bawat araw'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2 items-end pb-1">
                {logs.map(log => <Bar key={log.date} log={log} maxVal={maxVal} lang={lang} />)}
              </View>
            </ScrollView>
            <View className="flex-row gap-4 mt-3 justify-center">
              <View className="flex-row items-center gap-1.5">
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#386641' }} />
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>{lang === 'en' ? 'Spent' : 'Gastos'}</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#E7653B' }} />
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>{lang === 'en' ? 'Over budget' : 'Sobra sa budget'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Per-day list */}
        <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 14, color: '#000000', marginLeft: 16, marginTop: 20, marginBottom: 8 }}>
          {lang === 'en' ? 'By Day' : 'Bawat araw'}
        </Text>

        {logs.length === 0 ? (
          <View className="bg-white rounded-2xl border border-cream-200 mx-4 p-8 items-center">
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#6F655A' }}>
              {lang === 'en' ? 'No spending logged yet.' : 'Wala pang na-log na gastos.'}
            </Text>
          </View>
        ) : (
          [...logs].reverse().map(log => {
            const over   = log.spent > log.budgeted;
            const pct    = log.budgeted > 0 ? Math.min(100, Math.round((log.spent / log.budgeted) * 100)) : 0;
            const noData = log.spent === 0;
            const date   = new Date(log.date + 'T00:00:00').toLocaleDateString(lang === 'en' ? 'en-PH' : 'fil-PH', {
              month: 'short', day: 'numeric', weekday: 'short',
            });

            return (
              <View key={log.date} className="bg-white rounded-2xl border border-cream-200 mx-4 mb-2 overflow-hidden">
                <View className="px-4 pt-3 pb-2">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#000000' }}>{date}</Text>
                    {noData ? (
                      <View className="rounded-full px-2 py-0.5 bg-cream-50">
                        <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>{lang === 'en' ? 'No log' : 'Walang log'}</Text>
                      </View>
                    ) : (
                      <View className={`rounded-full px-2 py-0.5 ${over ? 'bg-red-50' : 'bg-leaf-50'}`}>
                        <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: over ? '#E7653B' : '#386641' }}>
                          {over
                            ? (lang === 'en' ? `▲ Over ₱${(log.spent - log.budgeted).toFixed(0)}` : `▲ Sobra ₱${(log.spent - log.budgeted).toFixed(0)}`)
                            : (lang === 'en' ? `₱${log.saved.toFixed(0)} saved` : `₱${log.saved.toFixed(0)} natipid`)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {!noData && (
                    <>
                      <View className="flex-row justify-between mb-2">
                        <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>{lang === 'en' ? 'Spent' : 'Ginastos'}</Text>
                        <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: over ? '#E7653B' : '#000000' }}>
                          ₱{log.spent.toFixed(0)} / ₱{log.budgeted.toFixed(0)}
                        </Text>
                      </View>
                      <View style={{ height: 6, backgroundColor: '#F9EDD3', borderRadius: 3, overflow: 'hidden' }}>
                        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: over ? '#E7653B' : '#386641', borderRadius: 3 }} />
                      </View>
                    </>
                  )}
                </View>

                {log.expense_breakdown && log.expense_breakdown.length > 0 && (
                  <View className="px-4 pb-3 pt-2 border-t border-cream-200 flex-row flex-wrap gap-1.5">
                    {log.expense_breakdown.map((item) => (
                      <View key={item.category} className="flex-row items-center gap-1 rounded-full bg-cream-50 px-2 py-0.5">
                        <Text style={{ fontSize: 13 }}>{MEAL_EMOJI[item.category] ?? '💸'}</Text>
                        <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
                          {(lang === 'en' ? MEAL_LABEL_EN[item.category] : MEAL_LABEL_TL[item.category]) ?? item.category}: ₱{item.amount.toFixed(0)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {log.notes ? (
                  <View className="px-4 pb-3">
                    <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', fontStyle: 'italic' }}>
                      "{log.notes}"
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
