import client from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { useLanguage } from '@/src/context/LanguageContext';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

// ─── Quick-pick data ──────────────────────────────────────────────────────────

const CITIES = [
  'Antipolo', 'Marikina', 'Quezon City', 'Pasig', 'Makati',
  'Parañaque', 'Las Piñas', 'Muntinlupa', 'Taguig', 'Mandaluyong',
  'Caloocan', 'Malabon', 'Navotas', 'Valenzuela', 'Pasay',
];

const BUDGET_PRESETS = [
  { label: '₱1,500', value: 1500, sub: '~₱50/araw' },
  { label: '₱3,000', value: 3000, sub: '~₱100/araw' },
  { label: '₱5,000', value: 5000, sub: '~₱167/araw' },
  { label: '₱8,000', value: 8000, sub: '~₱267/araw' },
];

const TOTAL_STEPS = 4;

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const { lang } = useLanguage();
  const firstName = user?.name?.split(' ')[0] ?? 'Ka-uLam';

  const [step, setStep] = useState(1);

  // Step 1
  const [municipality, setMunicipality] = useState(user?.municipality ?? '');
  const [barangay, setBarangay]         = useState('');
  const [showCities, setShowCities]     = useState(false);

  // Step 2
  const [householdSize, setHouseholdSize] = useState(user?.household_size ?? 4);

  // Step 3
  const [budgetAmount, setBudgetAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const goNext = () => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -20, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0,   duration: 120, useNativeDriver: true }),
    ]).start();
    setStep((s) => s + 1);
  };

  const goBack = () => setStep((s) => s - 1);

  const pickPreset = (value: number) => {
    setSelectedPreset(value);
    setBudgetAmount(String(value));
  };

  const skip = async () => {
    await finalizeOnboarding();
  };

  const finalizeOnboarding = async () => {
    setSaving(true);
    try {
      await client.patch('/user/profile', {
        municipality:         municipality.trim() || null,
        barangay:             barangay.trim() || null,
        household_size:       householdSize,
        onboarding_completed: true,
      });
      await refreshUser();
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Error', lang === 'en' ? 'Something went wrong. Try again.' : 'May problema. Subukan ulit.');
    } finally {
      setSaving(false);
    }
  };

  const submitBudget = async () => {
    const amount = parseFloat(budgetAmount);
    if (!amount || amount < 100) {
      Alert.alert(
        lang === 'en' ? 'Invalid amount' : 'Mali ang halaga',
        lang === 'en' ? 'Enter ₱100 or more.' : 'Mag-enter ng ₱100 pataas.',
      );
      return;
    }
    setSaving(true);
    try {
      await client.post('/budget/setup', {
        total_amount:   amount,
        total_days:     30,
        household_size: householdSize,
      });
      await client.patch('/user/profile', {
        municipality:         municipality.trim() || null,
        barangay:             barangay.trim() || null,
        household_size:       householdSize,
        onboarding_completed: true,
      });
      await refreshUser();
      setStep(4);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? (lang === 'en' ? 'An error occurred. Try again.' : 'May error. Subukan ulit.');
      Alert.alert(lang === 'en' ? 'Not saved' : 'Hindi na-save', msg);
    } finally {
      setSaving(false);
    }
  };

  const filteredCities = municipality.length >= 2
    ? CITIES.filter((c) => c.toLowerCase().startsWith(municipality.toLowerCase())).slice(0, 5)
    : [];

  // ── Progress dots ────────────────────────────────────────────────────────────

  const Dots = () => (
    <View className="flex-row gap-1.5 justify-center mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          className="rounded-full"
          style={{
            width:           i + 1 === step ? 20 : 6,
            height:          6,
            backgroundColor: i + 1 <= step ? '#386641' : '#D3C5AB',
          }}
        />
      ))}
    </View>
  );

  // ── Step 1 — Location ────────────────────────────────────────────────────────

  const Step1 = () => (
    <Animated.View style={{ transform: [{ translateX: slideAnim }] }} className="flex-1">
      <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>📍</Text>
      <Text className="text-xl font-semibold text-ink text-center mb-2">
        {lang === 'en' ? 'Where do you live?' : 'Saan kayo nakatira?'}
      </Text>
      <Text className="text-sm text-ink-soft text-center mb-8 leading-5">
        {lang === 'en'
          ? 'So you can see prices and communities near you.'
          : 'Para makita mo ang mga presyo at komunidad na malapit sa inyo.'}
      </Text>

      <Text className="text-xs font-medium text-ink-soft mb-1.5">
        {lang === 'en' ? 'City / Municipality' : 'Lungsod / Munisipyo'}
      </Text>
      <View className="relative mb-3">
        <TextInput
          className="bg-cream-50 rounded-xl px-4 py-3.5 text-sm text-ink border border-cream-200"
          placeholder="e.g. Antipolo, Marikina, Quezon City"
          placeholderTextColor="#B0A18C"
          value={municipality}
          onChangeText={(v) => { setMunicipality(v); setShowCities(true); }}
          onFocus={() => setShowCities(true)}
          autoCapitalize="words"
        />
        {showCities && filteredCities.length > 0 && (
          <View className="absolute top-full left-0 right-0 bg-white rounded-xl border border-cream-200 mt-1 z-20"
            style={{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 }}
          >
            {filteredCities.map((city) => (
              <Pressable
                key={city}
                onPress={() => { setMunicipality(city); setShowCities(false); }}
                className="px-4 py-3 border-b border-cream-200 last:border-b-0"
              >
                <Text className="text-sm text-ink">{city}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <Text className="text-xs font-medium text-ink-soft mb-1.5">
        {lang === 'en' ? 'Barangay (optional)' : 'Barangay (opsyonal)'}
      </Text>
      <TextInput
        className="bg-cream-50 rounded-xl px-4 py-3.5 text-sm text-ink border border-cream-200 mb-8"
        placeholder="Barangay"
        placeholderTextColor="#B0A18C"
        value={barangay}
        onChangeText={setBarangay}
        autoCapitalize="words"
        onFocus={() => setShowCities(false)}
      />

      <Pressable
        onPress={() => { setShowCities(false); goNext(); }}
        className="w-full rounded-xl bg-brand-600 py-4 items-center active:opacity-80 mb-3"
      >
        <Text className="text-sm font-semibold text-white">
          {municipality.trim()
            ? (lang === 'en' ? 'Next →' : 'Susunod →')
            : (lang === 'en' ? 'Skip →' : 'Laktawan →')}
        </Text>
      </Pressable>
    </Animated.View>
  );

  // ── Step 2 — Household size ──────────────────────────────────────────────────

  const Step2 = () => (
    <Animated.View style={{ transform: [{ translateX: slideAnim }] }} className="flex-1">
      <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>👨‍👩‍👧‍👦</Text>
      <Text className="text-xl font-semibold text-ink text-center mb-2">
        {lang === 'en' ? 'How many people live in your household?' : 'Ilang tao kayo sa bahay?'}
      </Text>
      <Text className="text-sm text-ink-soft text-center mb-12 leading-5">
        {lang === 'en'
          ? 'This will be used for meal planning and budget breakdown.'
          : 'Gagamitin ito para sa meal planning at budget breakdown.'}
      </Text>

      <View className="items-center mb-12">
        <View className="flex-row items-center gap-6">
          <Pressable
            onPress={() => setHouseholdSize((s) => Math.max(1, s - 1))}
            className="w-14 h-14 rounded-full bg-cream-200 items-center justify-center active:opacity-70"
          >
            <Text className="text-2xl text-ink">−</Text>
          </Pressable>
          <View className="items-center">
            <Text className="text-5xl font-bold text-brand-600">{householdSize}</Text>
            <Text className="text-xs text-ink-soft mt-1">
              {lang === 'en' ? 'people in the household' : 'tao sa pamilya'}
            </Text>
          </View>
          <Pressable
            onPress={() => setHouseholdSize((s) => Math.min(20, s + 1))}
            className="w-14 h-14 rounded-full bg-cream-200 items-center justify-center active:opacity-70"
          >
            <Text className="text-2xl text-ink">+</Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        onPress={goNext}
        className="w-full rounded-xl bg-brand-600 py-4 items-center active:opacity-80 mb-3"
      >
        <Text className="text-sm font-semibold text-white">{lang === 'en' ? 'Next →' : 'Susunod →'}</Text>
      </Pressable>
      <Pressable onPress={goBack} className="items-center py-2">
        <Text className="text-xs text-ink-soft">{lang === 'en' ? '← Back' : '← Bumalik'}</Text>
      </Pressable>
    </Animated.View>
  );

  // ── Step 3 — Budget ──────────────────────────────────────────────────────────

  const Step3 = () => {
    const perDay  = budgetAmount ? (parseFloat(budgetAmount) / 30).toFixed(0) : null;
    const perPerson = budgetAmount && householdSize
      ? (parseFloat(budgetAmount) / 30 / householdSize).toFixed(0)
      : null;

    return (
      <Animated.View style={{ transform: [{ translateX: slideAnim }] }} className="flex-1">
        <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>💰</Text>
        <Text className="text-xl font-semibold text-ink text-center mb-2">
          {lang === 'en' ? 'How much is your food budget?' : 'Magkano ang food budget?'}
        </Text>
        <Text className="text-sm text-ink-soft text-center mb-6 leading-5">
          {lang === 'en'
            ? `Monthly food budget for ${householdSize} people. You can change this anytime.`
            : `Monthly food budget para sa ${householdSize} tao. Mababago mo ito kahit kailan.`}
        </Text>

        {/* Preset chips */}
        <View className="flex-row flex-wrap gap-2 mb-4">
          {BUDGET_PRESETS.map((p) => {
            const active = selectedPreset === p.value;
            return (
              <Pressable
                key={p.value}
                onPress={() => pickPreset(p.value)}
                className={`flex-1 rounded-xl py-3 items-center border ${
                  active ? 'bg-olive-400 border-olive-400' : 'bg-white border-cream-300'
                }`}
              >
                <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-ink'}`}>
                  {p.label}
                </Text>
                <Text className={`text-xs mt-0.5 ${active ? 'text-white/80' : 'text-ink-soft'}`}>
                  {p.sub}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Custom amount */}
        <Text className="text-xs font-medium text-ink-soft mb-1.5">
          {lang === 'en' ? 'Or enter your own amount' : 'O mag-enter ng sariling halaga'}
        </Text>
        <View className="flex-row items-center bg-cream-50 rounded-xl border border-cream-200 mb-2 px-4">
          <Text className="text-base text-ink-soft mr-1">₱</Text>
          <TextInput
            className="flex-1 py-3.5 text-sm text-ink font-medium"
            placeholder="0"
            placeholderTextColor="#B0A18C"
            keyboardType="numeric"
            value={budgetAmount}
            onChangeText={(v) => {
              setBudgetAmount(v.replace(/[^0-9]/g, ''));
              setSelectedPreset(null);
            }}
          />
        </View>

        {perDay && (
          <Text className="text-xs text-brand-600 mb-6">
            {lang === 'en'
              ? `~₱${perDay}/day · ~₱${perPerson}/day per person`
              : `~₱${perDay}/araw · ~₱${perPerson}/araw bawat tao`}
          </Text>
        )}

        <Pressable
          onPress={submitBudget}
          disabled={saving || !budgetAmount}
          className="w-full rounded-xl bg-brand-600 py-4 items-center active:opacity-80 disabled:opacity-50 mb-3"
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-sm font-semibold text-white">
              {budgetAmount
                ? (lang === 'en'
                    ? `Set ₱${parseInt(budgetAmount).toLocaleString()} →`
                    : `I-set ang ₱${parseInt(budgetAmount).toLocaleString()} →`)
                : (lang === 'en' ? 'Set Budget →' : 'I-set ang Budget →')}
            </Text>
          )}
        </Pressable>
        <Pressable onPress={goBack} className="items-center py-2">
          <Text className="text-xs text-ink-soft">{lang === 'en' ? '← Back' : '← Bumalik'}</Text>
        </Pressable>
      </Animated.View>
    );
  };

  // ── Step 4 — Done ────────────────────────────────────────────────────────────

  const Step4 = () => (
    <Animated.View style={{ transform: [{ translateX: slideAnim }] }} className="flex-1 items-center justify-center">
      <Text style={{ fontSize: 56, marginBottom: 16 }}>🎉</Text>
      <Text className="text-2xl font-semibold text-ink text-center mb-2">
        {lang === 'en' ? `You're all set, ${firstName}!` : `Handa ka na, ${firstName}!`}
      </Text>
      <Text className="text-sm text-ink-soft text-center mb-8 leading-5">
        {lang === 'en' ? "Setup complete. Let's start saving!" : 'Setup tapos na. Simulan nating makatipid!'}
      </Text>

      {/* Summary */}
      <View className="w-full bg-leaf-50 rounded-2xl p-4 mb-8 gap-3">
        {municipality.trim() ? (
          <View className="flex-row items-center gap-3">
            <Text className="text-base">📍</Text>
            <View>
              <Text className="text-xs text-ink-soft">{lang === 'en' ? 'Location' : 'Lokasyon'}</Text>
              <Text className="text-sm font-medium text-ink">{municipality}</Text>
            </View>
          </View>
        ) : null}
        <View className="flex-row items-center gap-3">
          <Text className="text-base">👨‍👩‍👧‍👦</Text>
          <View>
            <Text className="text-xs text-ink-soft">{lang === 'en' ? 'Household' : 'Pamilya'}</Text>
            <Text className="text-sm font-medium text-ink">
              {lang === 'en' ? `${householdSize} people` : `${householdSize} tao`}
            </Text>
          </View>
        </View>
        {budgetAmount ? (
          <View className="flex-row items-center gap-3">
            <Text className="text-base">💰</Text>
            <View>
              <Text className="text-xs text-ink-soft">Monthly food budget</Text>
              <Text className="text-sm font-medium text-ink">
                {lang === 'en'
                  ? `₱${parseInt(budgetAmount).toLocaleString()}/month`
                  : `₱${parseInt(budgetAmount).toLocaleString()}/buwan`}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={() => router.replace('/(tabs)')}
        className="w-full rounded-xl bg-brand-600 py-4 items-center active:opacity-80"
      >
        <Text className="text-sm font-semibold text-white">
          {lang === 'en' ? 'Go to Dashboard →' : 'Puntahan ang Dashboard →'}
        </Text>
      </Pressable>
    </Animated.View>
  );

  // ── Layout ───────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Skip link — only on steps 1–3 */}
      {step < 4 && (
        <Pressable onPress={skip} className="absolute top-12 right-6 z-10 py-2">
          <Text className="text-xs text-ink-soft">{lang === 'en' ? 'Skip' : 'Laktawan'}</Text>
        </Pressable>
      )}

      <Dots />

      {step === 1 && <Step1 />}
      {step === 2 && <Step2 />}
      {step === 3 && <Step3 />}
      {step === 4 && <Step4 />}
    </ScrollView>
  );
}
