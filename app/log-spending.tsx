import client from '@/src/api/client';
import RewardCelebration, { type Reward } from '@/src/components/RewardCelebration';
import { useLanguage } from '@/src/context/LanguageContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

type MealRow = { id: number; dish_name: string; meal_type: string; amount: string };

type BudgetToday = { has_budget: boolean; budget: number; spent: number; remaining: number };

// ─── Constants ─────────────────────────────────────────────────────────────────

const MEAL_META: Record<string, { emoji: string; labelEn: string; labelTl: string }> = {
  almusal:    { emoji: '🍳', labelEn: 'Breakfast', labelTl: 'Almusal' },
  tanghalian: { emoji: '☀️', labelEn: 'Lunch',     labelTl: 'Tanghalian' },
  meryenda:   { emoji: '🍌', labelEn: 'Snack',     labelTl: 'Meryenda' },
  hapunan:    { emoji: '🌙', labelEn: 'Dinner',    labelTl: 'Hapunan' },
  'iba pa':   { emoji: '🛒', labelEn: 'Others',    labelTl: 'Iba pa' },
};

// ─── API ───────────────────────────────────────────────────────────────────────

async function fetchTodayPlan() {
  try {
    const { data } = await client.get('/meal-plans/today');
    return data.meal_plan ?? null;
  } catch { return null; }
}

async function fetchBudgetToday(): Promise<BudgetToday | null> {
  try {
    const { data } = await client.get('/budget/today');
    return data;
  } catch { return null; }
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function LogSpendingScreen() {
  const router  = useRouter();
  const qc      = useQueryClient();
  const { lang } = useLanguage();
  const insets  = useSafeAreaInsets();

  const [mealRows, setMealRows]   = useState<MealRow[]>([]);
  const [otherAmt, setOtherAmt]   = useState('');
  const [note, setNote]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]     = useState(false);
  const [xpEarned, setXpEarned]   = useState(0);
  const [savedAmt, setSavedAmt]   = useState(0);
  const [reward, setReward]       = useState<Reward | null>(null);
  const [initialized, setInitialized] = useState(false);

  const otherRef = useRef<TextInput>(null);

  const { data: plan }   = useQuery({ queryKey: ['meal-plan-today'], queryFn: fetchTodayPlan,   staleTime: 300_000 });
  const { data: budget } = useQuery({ queryKey: ['budget-today'],    queryFn: fetchBudgetToday, staleTime: 60_000 });

  // Populate meal rows from plan once on load
  useEffect(() => {
    if (initialized || !plan) return;
    const rows: MealRow[] = (plan.items ?? []).map((item: any) => ({
      id:        item.id,
      dish_name: item.dish_name ?? '',
      meal_type: item.meal_type ?? '',
      amount:    Number(item.estimated_cost ?? 0) > 0 ? Number(item.estimated_cost).toFixed(0) : '',
    }));
    setMealRows(rows);
    setInitialized(true);
  }, [plan, initialized]);

  // ── Derived ──────────────────────────────────────────────────────────────────

  const mealTotal  = mealRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const other      = parseFloat(otherAmt) || 0;
  const total      = mealTotal + other;
  const dailyBudget = budget?.has_budget ? (budget.budget ?? 0) : 0;
  const diff       = dailyBudget > 0 ? dailyBudget - total : null;
  const over       = diff !== null && diff < 0;

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function updateRowAmount(id: number, val: string) {
    setMealRows(prev => prev.map(r => r.id === id ? { ...r, amount: val.replace(/[^0-9.]/g, '') } : r));
  }

  function removeRow(id: number) {
    setMealRows(prev => prev.filter(r => r.id !== id));
  }

  // ── Submit ────────────────────────────────────────────────────────────────────

  const submit = async () => {
    if (total === 0) {
      Alert.alert(
        lang === 'en' ? 'No amount entered' : 'Walang halaga',
        lang === 'en' ? 'Please enter at least one expense.' : 'Mag-enter ng kahit isang gastos.',
      );
      return;
    }
    setSubmitting(true);
    try {
      // Build breakdown from meal rows
      const byType: Record<string, number> = {};
      for (const r of mealRows) {
        const amt = parseFloat(r.amount) || 0;
        if (amt > 0) byType[r.meal_type] = (byType[r.meal_type] ?? 0) + amt;
      }
      if (other > 0) byType['iba pa'] = (byType['iba pa'] ?? 0) + other;

      const breakdown = Object.entries(byType).map(([category, amount]) => ({ category, amount }));

      const { data } = await client.post('/budget/log', {
        actual_spent:      total,
        expense_breakdown: breakdown,
        notes:             note.trim() || null,
      });

      qc.invalidateQueries({ queryKey: ['budget-today'] });
      setXpEarned(data.xp_earned ?? 0);
      setSavedAmt(data.saved ?? 0);
      setSuccess(true);
      if (data.xp_earned > 0) {
        setReward({
          xpEarned: data.xp_earned,
          leveledUp: data.leveled_up,
          newLevel: data.new_level,
          newAchievements: data.new_achievements,
        });
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? (lang === 'en' ? 'Something went wrong. Try again.' : 'May error. Subukan ulit.');
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────────

  if (success) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', paddingHorizontal: 32 }}>
        <RewardCelebration reward={reward} onDismiss={() => setReward(null)} />
        <Text style={{ fontSize: 48, marginBottom: 16 }}>✅</Text>
        <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 20, color: '#292522', marginBottom: 8, textAlign: 'center' }}>
          {lang === 'en' ? 'Logged!' : 'Nai-log na!'}
        </Text>
        <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', textAlign: 'center', marginBottom: 6, lineHeight: 20 }}>
          {lang === 'en' ? `You spent today: ₱${total.toFixed(0)}` : `Nagastos mo ngayon: ₱${total.toFixed(0)}`}
        </Text>
        {savedAmt > 0 && (
          <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#C4881C', textAlign: 'center', marginBottom: 16 }}>
            {lang === 'en' ? `🎉 You saved ₱${savedAmt.toFixed(0)} today!` : `🎉 Natipid mo ang ₱${savedAmt.toFixed(0)} ngayon!`}
          </Text>
        )}
        {xpEarned > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF6E3', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 24 }}>
            <Text>⭐</Text>
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, color: '#9A6A12' }}>+{xpEarned} XP earned</Text>
          </View>
        )}
        <Pressable
          onPress={() => router.back()}
          style={{ width: '100%', borderRadius: 12, backgroundColor: '#C45E3A', paddingVertical: 16, alignItems: 'center' }}
          className="active:opacity-80"
        >
          <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#fff' }}>
            {lang === 'en' ? 'Done' : 'Tapos na'}
          </Text>
        </Pressable>
      </View>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FFFCF5' }}
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 32) }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F9EDD3' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={8} className="active:opacity-60">
            <Text style={{ fontSize: 20 }}>←</Text>
          </Pressable>
          <View>
            <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 18, color: '#292522' }}>
              {lang === 'en' ? 'Log Spending' : 'I-log ang Gastos'}
            </Text>
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: '#6F655A' }}>
              {lang === 'en' ? "Tap any amount to edit it" : "I-tap ang halaga para baguhin"}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ padding: 16 }}>

        {/* Meal plan section */}
        {mealRows.length > 0 ? (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, color: '#6F655A', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
              {lang === 'en' ? "Today's Meal Plan" : 'Meal plan ngayon'}
            </Text>
            <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 0.5, borderColor: '#F0DEBB', overflow: 'hidden' }}>
              {mealRows.map((row, idx) => {
                const meta = MEAL_META[row.meal_type] ?? { emoji: '🍽️', labelEn: row.meal_type, labelTl: row.meal_type };
                return (
                  <View
                    key={row.id}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingHorizontal: 14, paddingVertical: 12,
                      borderBottomWidth: idx < mealRows.length - 1 ? 1 : 0,
                      borderBottomColor: '#F9EDD3',
                    }}
                  >
                    {/* Emoji + name */}
                    <Text style={{ fontSize: 16, marginRight: 10 }}>{meta.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#292522' }} numberOfLines={1}>
                        {row.dish_name}
                      </Text>
                      <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: '#6F655A' }}>
                        {lang === 'en' ? meta.labelEn : meta.labelTl}
                      </Text>
                    </View>

                    {/* Editable amount */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
                      <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginRight: 2 }}>₱</Text>
                      <TextInput
                        style={{
                          fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#292522',
                          textAlign: 'right', minWidth: 56, paddingHorizontal: 6, paddingVertical: 4,
                          borderRadius: 8, borderWidth: 1, borderColor: '#F0DEBB',
                          backgroundColor: '#FFFCF5',
                        }}
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                        placeholder="0"
                        placeholderTextColor="#D3C5AB"
                        value={row.amount}
                        onChangeText={v => updateRowAmount(row.id, v)}
                        selectTextOnFocus
                      />
                    </View>

                    {/* Delete */}
                    <Pressable onPress={() => removeRow(row.id)} hitSlop={8} className="active:opacity-50">
                      <Text style={{ fontSize: 18, color: '#E24B4A', lineHeight: 22 }}>×</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          !initialized && (
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: '#6F655A' }}>
                {lang === 'en' ? 'No meal plan for today yet' : 'Wala pang meal plan ngayon'}
              </Text>
            </View>
          )
        )}

        {/* Others / extra expenses */}
        <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, color: '#6F655A', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
          {lang === 'en' ? 'Other expenses' : 'Iba pang gastos'}
        </Text>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 0.5, borderColor: '#F0DEBB', overflow: 'hidden', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 }}>
            <Text style={{ fontSize: 16, marginRight: 10 }}>🛒</Text>
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#292522', flex: 1 }}>
              {lang === 'en' ? 'Others (snacks, transport, etc.)' : 'Iba pa (meryenda, pasahe, atbp.)'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginRight: 2 }}>₱</Text>
              <TextInput
                ref={otherRef}
                style={{
                  fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#292522',
                  textAlign: 'right', minWidth: 56, paddingHorizontal: 6, paddingVertical: 4,
                  borderRadius: 8, borderWidth: 1, borderColor: '#F0DEBB',
                  backgroundColor: '#FFFCF5',
                }}
                keyboardType="decimal-pad"
                returnKeyType="done"
                placeholder="0"
                placeholderTextColor="#D3C5AB"
                value={otherAmt}
                onChangeText={v => setOtherAmt(v.replace(/[^0-9.]/g, ''))}
                selectTextOnFocus
              />
            </View>
          </View>
        </View>

        {/* Budget vs total note */}
        {diff !== null && total > 0 && (
          <View style={{
            borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
            backgroundColor: over ? '#FCEBEB' : '#EFF4EC',
            borderWidth: 1, borderColor: over ? '#F2C1BE' : '#B9D0AE',
            flexDirection: 'row', alignItems: 'center', gap: 10,
          }}>
            <Text style={{ fontSize: 18 }}>{over ? '⚠️' : '✅'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: over ? '#E24B4A' : '#386641' }}>
                {over
                  ? (lang === 'en' ? `Over budget by ₱${Math.abs(diff).toFixed(0)}` : `Lumampas sa budget ng ₱${Math.abs(diff).toFixed(0)}`)
                  : (lang === 'en' ? `₱${diff.toFixed(0)} remaining in budget` : `₱${diff.toFixed(0)} pa ang natitira sa budget`)}
              </Text>
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: over ? '#E24B4A' : '#6F655A', marginTop: 2 }}>
                {lang === 'en'
                  ? `Daily budget: ₱${dailyBudget.toFixed(0)} · Total logged: ₱${total.toFixed(0)}`
                  : `Daily budget: ₱${dailyBudget.toFixed(0)} · Kabuuan: ₱${total.toFixed(0)}`}
              </Text>
            </View>
          </View>
        )}

        {/* Total card */}
        <View style={{ backgroundColor: '#3C3A2F', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: 'rgba(255,248,232,0.78)' }}>
            {lang === 'en' ? 'Total spent' : 'Kabuuang nagastos'}
          </Text>
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 24, color: '#fff' }}>
            ₱{total.toFixed(0)}
          </Text>
        </View>

        {/* Note input */}
        <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 0.5, borderColor: '#F0DEBB', paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 }}>
          <TextInput
            style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#292522', minHeight: 52, textAlignVertical: 'top' }}
            placeholder={lang === 'en' ? 'Add a note (optional)... e.g. sale at the market' : 'Dagdag na tala (opsyonal)... e.g. nag-sale ang palengke'}
            placeholderTextColor="#B0A18C"
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={300}
          />
        </View>

        {/* Submit */}
        <Pressable
          onPress={submit}
          disabled={submitting || total === 0}
          style={{ borderRadius: 12, backgroundColor: '#C45E3A', paddingVertical: 16, alignItems: 'center', opacity: submitting || total === 0 ? 0.5 : 1 }}
          className="active:opacity-80"
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#fff' }}>
              {total > 0
                ? (lang === 'en' ? `Log ₱${total.toFixed(0)}` : `I-log ang ₱${total.toFixed(0)}`)
                : (lang === 'en' ? 'Log Spending' : 'I-log ang Gastos')}
            </Text>
          )}
        </Pressable>

        <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: '#6F655A', textAlign: 'center', marginTop: 10 }}>
          {lang === 'en' ? '+10 XP for your first log today' : '+10 XP sa unang log ngayon'}
        </Text>

      </View>
    </ScrollView>
  );
}
