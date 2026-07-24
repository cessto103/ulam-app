import client from '@/src/api/client';
import SelectField from '@/src/components/SelectField';
import { useAuth } from '@/src/context/AuthContext';
import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
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

// Same single-purpose form as budget-setup.tsx's "today" flow (household
// size + custom expenses), but fixed to exactly one day -- the ?date= param
// -- and posting to POST /budget/setup-for-date instead of /budget/setup.
// No duration selector here on purpose: this screen only ever creates a
// standalone 1-day budget for a specific past date, never a multi-day
// period, and never touches the user's real active budget period.

type ExpenseCategory = 'travel' | 'load' | 'baon' | 'other';

type ExpenseRow = {
  key: string;
  category: ExpenseCategory | '';
  amount: string;
  label: string;
};

const EXPENSE_CATEGORIES: { value: ExpenseCategory; labelEn: string; labelTl: string }[] = [
  { value: 'travel', labelEn: 'Travel expense', labelTl: 'Pamasahe' },
  { value: 'load',   labelEn: 'Load/Data expense', labelTl: 'Load/Data' },
  { value: 'baon',   labelEn: 'Baon/Student allowance', labelTl: 'Baon/Allowance ng estudyante' },
  { value: 'other',  labelEn: 'Others', labelTl: 'Iba pa' },
];

function NumInput({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <View className="mb-4">
      <Text className="text-xs font-semibold text-ink-soft mb-1.5">{label}</Text>
      <View className="flex-row items-center rounded-xl border border-cream-300 bg-cream-50 px-3">
        <Text className="text-sm text-ink-soft mr-1">₱</Text>
        <TextInput
          className="flex-1 py-3 text-sm text-ink"
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor="#B0A18C"
        />
      </View>
      {hint ? <Text className="mt-1 text-xs text-ink-soft">{hint}</Text> : null}
    </View>
  );
}

function ExpenseRowCard({
  row,
  onChangeCategory,
  onChangeAmount,
  onChangeLabel,
  onRemove,
}: {
  row: ExpenseRow;
  onChangeCategory: (v: ExpenseCategory) => void;
  onChangeAmount: (v: string) => void;
  onChangeLabel: (v: string) => void;
  onRemove: () => void;
}) {
  const { lang } = useLanguage();
  return (
    <View className="mb-3 rounded-xl border border-cream-300 bg-cream-50 p-3">
      <View className="flex-row items-start gap-2">
        <View className="flex-1">
          <SelectField
            label={lang === 'en' ? 'Category' : 'Kategorya'}
            placeholder={lang === 'en' ? 'Select category' : 'Pumili ng kategorya'}
            value={row.category}
            options={EXPENSE_CATEGORIES.map((c) => ({ value: c.value, label: lang === 'en' ? c.labelEn : c.labelTl }))}
            onSelect={(v) => onChangeCategory(v as ExpenseCategory)}
          />
        </View>
        <Pressable onPress={onRemove} hitSlop={8} style={{ marginTop: 30 }} className="p-1">
          <Ionicons name="trash-outline" size={18} color="#B0473F" />
        </Pressable>
      </View>

      {row.category === 'other' && (
        <View className="mb-3 -mt-2">
          <Text className="text-xs font-semibold text-ink-soft mb-1.5">
            {lang === 'en' ? 'What is this for?' : 'Para saan ito?'}
          </Text>
          <TextInput
            className="rounded-xl border border-cream-300 bg-white px-3 py-3 text-sm text-ink"
            value={row.label}
            onChangeText={onChangeLabel}
            placeholder={lang === 'en' ? 'e.g. Parking, Ice' : 'hal. Parking, Yelo'}
            placeholderTextColor="#B0A18C"
          />
        </View>
      )}

      <View className="flex-row items-center rounded-xl border border-cream-300 bg-white px-3">
        <Text className="text-sm text-ink-soft mr-1">₱</Text>
        <TextInput
          className="flex-1 py-3 text-sm text-ink"
          value={row.amount}
          onChangeText={onChangeAmount}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor="#B0A18C"
        />
      </View>
    </View>
  );
}

export default function BudgetSetupForDateScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const { lang } = useLanguage();
  const { date } = useLocalSearchParams<{ date: string }>();

  const dayLabel = useMemo(
    () => new Date(date + 'T00:00:00').toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' }),
    [date],
  );

  const [totalAmount, setTotalAmount]     = useState('');
  const [householdSize, setHouseholdSize] = useState(String(user?.household_size ?? 4));
  const [expenses, setExpenses]           = useState<ExpenseRow[]>([]);
  const [loading, setLoading]             = useState(false);
  const nextExpenseKey = useRef(0);

  const addExpense = () => {
    nextExpenseKey.current += 1;
    setExpenses((prev) => [...prev, { key: `e${nextExpenseKey.current}`, category: '', amount: '', label: '' }]);
  };
  const updateExpense = (key: string, patch: Partial<ExpenseRow>) => {
    setExpenses((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };
  const removeExpense = (key: string) => {
    setExpenses((prev) => prev.filter((r) => r.key !== key));
  };

  const expensesTotal = useMemo(
    () => expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0),
    [expenses],
  );

  const dailyFoodBudget = useMemo(() => {
    const total = parseFloat(totalAmount) || 0;
    if (!total) return null;
    return total - expensesTotal;
  }, [totalAmount, expensesTotal]);

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
    if (dailyFoodBudget !== null && dailyFoodBudget <= 0) {
      Alert.alert(
        lang === 'en' ? 'Invalid budget' : 'Mali ang budget',
        lang === 'en'
          ? 'Your custom expenses are bigger than your budget. Reduce them.'
          : 'Ang custom expenses ay mas malaki pa sa budget. Bawasan ang mga ito.',
      );
      return;
    }

    const customExpenses = expenses
      .filter((e) => e.category && (parseFloat(e.amount) || 0) > 0)
      .map((e) => ({
        category: e.category,
        amount: parseFloat(e.amount) || 0,
        ...(e.category === 'other' ? { label: e.label.trim() || null } : {}),
      }));

    setLoading(true);
    try {
      await client.post('/budget/setup-for-date', {
        date,
        total_amount:    total,
        household_size:  parseInt(householdSize) || 4,
        custom_expenses: customExpenses,
      });

      qc.invalidateQueries({ queryKey: ['budget-date', date] });
      qc.invalidateQueries({ queryKey: ['meal-plan-date', date] });

      Alert.alert(
        lang === 'en' ? 'All set!' : 'Nai-set na!',
        lang === 'en'
          ? `Budget for ${dayLabel} is ₱${dailyFoodBudget?.toFixed(2)}.`
          : `Ang budget para sa ${dayLabel} ay ₱${dailyFoodBudget?.toFixed(2)}.`,
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

        <Pressable onPress={() => router.back()} hitSlop={12} className="mb-4 active:opacity-60">
          <Text style={{ fontSize: 20 }}>←</Text>
        </Pressable>

        <Text className="text-lg font-semibold text-ink mb-1">
          {lang === 'en' ? 'Set Budget for This Day' : 'Mag-set ng Budget'}
        </Text>
        <Text className="text-xs text-ink-soft mb-6">
          {lang === 'en' ? `For ${dayLabel} only` : `Para sa ${dayLabel} lang`}
        </Text>

        {/* Info card */}
        <View className="bg-leaf-50 rounded-2xl p-4 mb-6">
          <Text className="text-sm font-medium text-ink mb-1">
            {lang === 'en' ? 'How does it work?' : 'Paano gumagana?'}
          </Text>
          <Text className="text-xs text-leaf-700 leading-5">
            {lang === 'en'
              ? 'This only sets a budget for this one day — your current, ongoing budget period is not affected. Your custom expenses (if any) will be deducted from this to get the day\'s food budget.'
              : 'Ito lang para sa isang araw na ito — hindi maaapektuhan ang kasalukuyan mong budget period. Ibabawas dito ang iyong custom expenses (kung meron) para makuha ang food budget ng araw na ito.'}
          </Text>
        </View>

        {/* Budget input */}
        <NumInput
          label={lang === 'en' ? `Food budget for ${dayLabel} (₱)` : `Food budget (₱)`}
          value={totalAmount}
          onChange={setTotalAmount}
          hint={lang === 'en' ? 'For just this one day' : 'Para sa isang araw na ito lang'}
        />

        {/* Household size chips */}
        <View className="mb-4">
          <Text className="text-xs font-semibold text-ink-soft mb-1.5">
            {lang === 'en' ? 'Household size' : 'Bilang ng miyembro ng pamilya'}
          </Text>
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

        {/* Custom expense(s) */}
        <View className="mb-4">
          <View className="flex-row items-center mb-1.5">
            <Text className="text-xs font-semibold text-ink-soft flex-1">
              {lang === 'en' ? 'Custom expense(s)' : 'Custom na gastos'}
            </Text>
            <Text className="text-xs text-ink-soft">{lang === 'en' ? 'optional' : 'opsyonal'}</Text>
          </View>
          <Text className="text-xs text-ink-soft mb-2">
            {lang === 'en' ? "Will be deducted from this day's food budget" : 'Ibabawas sa food budget ng araw na ito'}
          </Text>

          {expenses.map((row) => (
            <ExpenseRowCard
              key={row.key}
              row={row}
              onChangeCategory={(v) => updateExpense(row.key, { category: v })}
              onChangeAmount={(v) => updateExpense(row.key, { amount: v })}
              onChangeLabel={(v) => updateExpense(row.key, { label: v })}
              onRemove={() => removeExpense(row.key)}
            />
          ))}

          <Pressable
            onPress={addExpense}
            className="flex-row items-center justify-center gap-1.5 rounded-xl border border-dashed border-olive-400 py-3 active:opacity-70"
          >
            <Ionicons name="add" size={16} color="#4E7A47" />
            <Text className="text-xs font-semibold" style={{ color: '#386641' }}>
              {lang === 'en' ? 'Add expense' : 'Magdagdag ng gastos'}
            </Text>
          </Pressable>
        </View>

        {/* Live preview card */}
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
              <Text className="text-xs font-medium" style={{ color: dailyFoodBudget > 0 ? '#000000' : '#791F1F' }}>
                {lang === 'en' ? "Day's food budget" : 'Food budget ng araw'}
              </Text>
              <Text className="text-xl font-semibold" style={{ color: dailyFoodBudget > 0 ? '#386641' : '#E24B4A' }}>
                ₱{Math.max(0, dailyFoodBudget).toFixed(2)}
              </Text>
            </View>
            {perPerson !== null && dailyFoodBudget > 0 && (
              <View className="flex-row justify-between items-center pt-2 border-t" style={{ borderTopColor: dailyFoodBudget > 0 ? '#B9D0AE' : '#F8BCBC' }}>
                <Text className="text-xs" style={{ color: dailyFoodBudget > 0 ? '#000000' : '#791F1F' }}>
                  {lang === 'en' ? 'Per person' : 'Bawat tao'}
                </Text>
                <Text className="text-sm font-medium" style={{ color: dailyFoodBudget > 0 ? '#386641' : '#E24B4A' }}>
                  ₱{perPerson.toFixed(2)}
                </Text>
              </View>
            )}
            {dailyFoodBudget <= 0 && (
              <Text className="text-xs mt-1" style={{ color: '#E24B4A' }}>
                {lang === 'en'
                  ? 'Your custom expenses are higher than your budget. Reduce them.'
                  : 'Ang custom expenses ay mas mataas sa budget mo. Bawasan ang mga ito.'}
              </Text>
            )}
          </View>
        )}

        {/* Save button */}
        <Pressable
          onPress={handleSave}
          disabled={loading || !totalAmount}
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
