import client from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { useLanguage } from '@/src/context/LanguageContext';
import { Lang } from '@/src/i18n/translations';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

type DurationType = 'today' | '7days' | '15days' | '30days' | 'custom';

const today = new Date();
const MONTH_NAME = today.toLocaleString('default', { month: 'long' });
const DAYS_IN_MONTH = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

const DURATIONS: { key: DurationType; labelEn: string; labelTl: string; days: number }[] = [
  { key: 'today',  labelEn: 'Today',   labelTl: 'Ngayon',  days: 1  },
  { key: '7days',  labelEn: '7 days',  labelTl: '7 araw',  days: 7  },
  { key: '15days', labelEn: '15 days', labelTl: '15 araw', days: 15 },
  { key: '30days', labelEn: '30 days', labelTl: '30 araw', days: DAYS_IN_MONTH },
  { key: 'custom', labelEn: 'Custom',  labelTl: 'Custom',  days: 0  },
];

function getDays(duration: DurationType, customDays: string): number {
  if (duration === 'custom') return parseInt(customDays) || 0;
  return DURATIONS.find((d) => d.key === duration)!.days;
}

function getBudgetMeta(
  duration: DurationType,
  customDays: string,
  lang: Lang,
): { label: string; hint: string; infoText: string } {
  const days = getDays(duration, customDays);
  const en = lang === 'en';
  switch (duration) {
    case 'today':
      return {
        label: en ? "Today's food budget (₱)" : 'Food budget ngayon (₱)',
        hint: en ? 'For just one day' : 'Para sa isang araw lang',
        infoText: en
          ? "Used directly as today's daily food budget."
          : 'Direktang gagamitin bilang daily food budget ngayon.',
      };
    case '7days':
      return {
        label: en ? 'Budget for 7 days (₱)' : 'Budget para sa 7 araw (₱)',
        hint: en ? 'For one week' : 'Para sa isang linggo',
        infoText: en
          ? 'Will be divided over 7 days to get your daily food budget.'
          : 'Hahatihin sa 7 araw para makuha ang daily food budget.',
      };
    case '15days':
      return {
        label: en ? 'Budget for 15 days (₱)' : 'Budget para sa 15 araw (₱)',
        hint: en ? 'For half a month' : 'Para sa kalahating buwan',
        infoText: en
          ? 'Will be divided over 15 days to get your daily food budget.'
          : 'Hahatihin sa 15 araw para makuha ang daily food budget.',
      };
    case '30days':
      return {
        label: en ? 'Monthly food budget (₱)' : 'Monthly food budget (₱)',
        hint: en ? `For all of ${MONTH_NAME}` : `Para sa buong ${MONTH_NAME}`,
        infoText: en
          ? `Will be divided over ${DAYS_IN_MONTH} days to get your daily food budget.`
          : `Hahatihin sa ${DAYS_IN_MONTH} araw para makuha ang daily food budget.`,
      };
    case 'custom':
      return {
        label: en ? 'Total budget (₱)' : 'Kabuuang budget (₱)',
        hint: days > 0
          ? (en ? `For ${days} days` : `Para sa ${days} araw`)
          : (en ? 'Enter the number of days' : 'I-enter ang bilang ng araw'),
        infoText: days > 0
          ? (en
              ? `Will be divided over ${days} days to get your daily food budget.`
              : `Hahatihin sa ${days} araw para makuha ang daily food budget.`)
          : (en ? 'Enter the number of days first.' : 'I-enter muna ang bilang ng araw.'),
      };
  }
}

function NumInput({
  label,
  value,
  onChange,
  hint,
  optional = false,
  keyboardType = 'numeric' as const,
  placeholder = '0',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  optional?: boolean;
  keyboardType?: 'numeric' | 'decimal-pad';
  placeholder?: string;
}) {
  const { lang } = useLanguage();
  return (
    <View className="mb-4">
      <View className="flex-row items-center mb-1.5">
        <Text className="text-xs font-semibold text-ink-soft flex-1">{label}</Text>
        {optional && <Text className="text-xs text-ink-soft">{lang === 'en' ? 'optional' : 'opsyonal'}</Text>}
      </View>
      <View className="flex-row items-center rounded-xl border border-cream-300 bg-cream-50 px-3">
        <Text className="text-sm text-ink-soft mr-1">₱</Text>
        <TextInput
          className="flex-1 py-3 text-sm text-ink"
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor="#B0A18C"
        />
      </View>
      {hint ? <Text className="mt-1 text-xs text-ink-soft">{hint}</Text> : null}
    </View>
  );
}

export default function BudgetSetupScreen() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const { lang } = useLanguage();

  const [duration, setDuration] = useState<DurationType>('15days');
  const [customDays, setCustomDays] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [householdSize, setHouseholdSize] = useState(String(user?.household_size ?? 4));
  const [dailyFare, setDailyFare] = useState('');
  const [dailyAllowance, setDailyAllowance] = useState('');
  const [loading, setLoading] = useState(false);

  const isToday = duration === 'today';
  const totalDays = getDays(duration, customDays);
  const budgetMeta = getBudgetMeta(duration, customDays, lang);

  const dailyFoodBudget = useMemo(() => {
    const total = parseFloat(totalAmount) || 0;
    const fare = isToday ? 0 : (parseFloat(dailyFare) || 0);
    const allowance = isToday ? 0 : (parseFloat(dailyAllowance) || 0);
    if (!total || totalDays <= 0) return null;
    return (total / totalDays) - fare - allowance;
  }, [totalAmount, dailyFare, dailyAllowance, totalDays, isToday]);

  const perPerson = dailyFoodBudget !== null && parseInt(householdSize) > 0
    ? dailyFoodBudget / (parseInt(householdSize) || 1)
    : null;

  const handleSave = async () => {
    const total = parseFloat(totalAmount);
    if (!total || total <= 0) {
      Alert.alert(
        lang === 'en' ? 'Missing info' : 'Kulang',
        lang === 'en' ? 'Enter your budget.' : 'I-enter ang iyong budget.',
      );
      return;
    }
    if (duration === 'custom' && totalDays <= 0) {
      Alert.alert(
        lang === 'en' ? 'Missing info' : 'Kulang',
        lang === 'en' ? 'Enter the number of days.' : 'I-enter ang bilang ng araw.',
      );
      return;
    }
    if (dailyFoodBudget !== null && dailyFoodBudget <= 0) {
      Alert.alert(
        lang === 'en' ? 'Invalid budget' : 'Mali ang budget',
        lang === 'en'
          ? 'Your daily fare and allowance are bigger than your budget. Reduce your other expenses.'
          : 'Ang daily fare at allowance ay mas malaki pa sa budget. Bawasan ang ibang gastos.',
      );
      return;
    }

    setLoading(true);
    try {
      await client.post('/budget/setup', {
        total_amount:    total,
        total_days:      totalDays,
        household_size:  parseInt(householdSize) || 4,
        daily_fare:      isToday ? 0 : (parseFloat(dailyFare) || 0),
        daily_allowance: isToday ? 0 : (parseFloat(dailyAllowance) || 0),
      });

      await refreshUser();
      qc.invalidateQueries({ queryKey: ['budget-today'] });

      Alert.alert(
        lang === 'en' ? 'All set!' : 'Nai-set na!',
        lang === 'en'
          ? `Your daily food budget is ₱${dailyFoodBudget?.toFixed(2)}.`
          : `Ang iyong daily food budget ay ₱${dailyFoodBudget?.toFixed(2)}.`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? (lang === 'en' ? 'Could not save the budget. Try again.' : 'Hindi ma-save ang budget. Subukan ulit.');
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'android' ? 30 : 0}
    >
      <ScrollView contentContainerClassName="px-5 py-6" keyboardShouldPersistTaps="handled">

        {/* 1. Info card */}
        <View className="bg-leaf-50 rounded-2xl p-4 mb-6">
          <Text className="text-sm font-medium text-ink mb-1">
            {lang === 'en' ? 'How does it work?' : 'Paano gumagana?'}
          </Text>
          <Text className="text-xs text-leaf-700 leading-5">{budgetMeta.infoText}</Text>
        </View>

        {/* 2. Duration selector */}
        <Text className="text-xs font-semibold text-ink-soft mb-2">
          {lang === 'en' ? 'What is this budget for?' : 'Para saan ang budget?'}
        </Text>
        <View className="flex-row gap-2 mb-5">
          {DURATIONS.map((d) => {
            const active = duration === d.key;
            return (
              <Pressable
                key={d.key}
                onPress={() => { setDuration(d.key); setCustomDays(''); }}
                className={`flex-1 items-center justify-center py-2.5 rounded-xl border ${
                  active ? 'bg-olive-400 border-olive-400' : 'bg-cream-50 border-cream-300'
                }`}
              >
                <Text
                  className={`font-semibold ${
                    active ? 'text-white' : 'text-ink-soft'
                  }`}
                  style={{ fontSize: 12 }}
                >
                  {lang === 'en' ? d.labelEn : d.labelTl}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Custom days input — only when Custom selected */}
        {duration === 'custom' && (
          <View className="mb-4">
            <Text className="text-xs font-semibold text-ink-soft mb-1.5">
              {lang === 'en' ? 'How many days?' : 'Ilang araw?'}
            </Text>
            <View className="flex-row items-center rounded-xl border border-cream-300 bg-cream-50 px-3">
              <TextInput
                className="flex-1 py-3 text-sm text-ink"
                value={customDays}
                onChangeText={(v) => setCustomDays(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder={lang === 'en' ? 'e.g. 20' : 'hal. 20'}
                placeholderTextColor="#B0A18C"
                maxLength={3}
              />
              <Text className="text-sm text-ink-soft">{lang === 'en' ? 'days' : 'araw'}</Text>
            </View>
          </View>
        )}

        {/* 3. Budget input */}
        <NumInput
          label={budgetMeta.label}
          value={totalAmount}
          onChange={setTotalAmount}
          hint={budgetMeta.hint}
        />

        {/* 4. Household size chips */}
        <View className="mb-4">
          <Text className="text-xs font-semibold text-ink-soft mb-1.5">Household size</Text>
          <View className="flex-row gap-2">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Pressable
                key={n}
                onPress={() => setHouseholdSize(String(n))}
                className={`w-10 h-10 rounded-xl items-center justify-center border ${
                  householdSize === String(n)
                    ? 'bg-olive-400 border-olive-400'
                    : 'bg-cream-50 border-cream-300'
                }`}
              >
                <Text className={`text-sm font-semibold ${householdSize === String(n) ? 'text-white' : 'text-ink'}`}>
                  {n}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setHouseholdSize('7')}
              className={`flex-1 h-10 rounded-xl items-center justify-center border ${
                parseInt(householdSize) >= 7
                  ? 'bg-olive-400 border-olive-400'
                  : 'bg-cream-50 border-cream-300'
              }`}
            >
              <Text className={`text-sm font-semibold ${parseInt(householdSize) >= 7 ? 'text-white' : 'text-ink'}`}>
                7+
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 5 & 6. Daily fare + allowance — hidden when Ngayon */}
        {!isToday && (
          <>
            <NumInput
              label={lang === 'en' ? 'Daily fare' : 'Daily pamasahe'}
              value={dailyFare}
              onChange={setDailyFare}
              hint={lang === 'en' ? 'Will be deducted from daily food budget' : 'Ibabawas sa daily food budget'}
              optional
            />
            <NumInput
              label={lang === 'en' ? 'Daily allowance (other)' : 'Daily allowance (iba)'}
              value={dailyAllowance}
              onChange={setDailyAllowance}
              hint={lang === 'en' ? 'Other regular expenses per day' : 'Ibang regular na gastos bawat araw'}
              optional
            />
          </>
        )}

        {/* 7. Live preview card */}
        {dailyFoodBudget !== null && (
          <View
            className="rounded-2xl p-4 mb-6"
            style={{
              backgroundColor: dailyFoodBudget > 0 ? '#EFF4EC' : '#FCEBEB',
              borderLeftWidth: 3,
              borderLeftColor: dailyFoodBudget > 0 ? '#4E7A47' : '#E24B4A',
            }}
          >
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-xs font-medium" style={{ color: dailyFoodBudget > 0 ? '#292522' : '#791F1F' }}>
                Daily food budget
              </Text>
              <Text className="text-xl font-semibold" style={{ color: dailyFoodBudget > 0 ? '#386641' : '#E24B4A' }}>
                ₱{Math.max(0, dailyFoodBudget).toFixed(2)}
              </Text>
            </View>
            {perPerson !== null && dailyFoodBudget > 0 && (
              <View className="flex-row justify-between items-center pt-2 border-t" style={{ borderTopColor: dailyFoodBudget > 0 ? '#B9D0AE' : '#F8BCBC' }}>
                <Text className="text-xs" style={{ color: dailyFoodBudget > 0 ? '#292522' : '#791F1F' }}>
                  {lang === 'en' ? 'Per person / day' : 'Bawat tao / araw'}
                </Text>
                <Text className="text-sm font-medium" style={{ color: dailyFoodBudget > 0 ? '#386641' : '#E24B4A' }}>
                  ₱{perPerson.toFixed(2)}
                </Text>
              </View>
            )}
            {dailyFoodBudget <= 0 && (
              <Text className="text-xs mt-1" style={{ color: '#E24B4A' }}>
                {lang === 'en'
                  ? 'Your fare/allowance is higher than your budget. Reduce your other expenses.'
                  : 'Ang fare/allowance ay mas mataas sa budget mo. Bawasan ang ibang gastos.'}
              </Text>
            )}
          </View>
        )}

        {/* 8. Save button */}
        <Pressable
          onPress={handleSave}
          disabled={loading || !totalAmount || (duration === 'custom' && !customDays)}
          className="w-full rounded-xl bg-brand-600 py-4 items-center active:opacity-80 disabled:opacity-50"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-sm font-semibold text-white">{lang === 'en' ? 'Save Budget' : 'I-save ang Budget'}</Text>
          )}
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
