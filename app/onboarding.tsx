import client from '@/src/api/client';
import SelectField from '@/src/components/SelectField';
import { useAuth } from '@/src/context/AuthContext';
import { useLanguage } from '@/src/context/LanguageContext';
import { getPhBarangaysForCity, getPhCitiesForRegion, getPhRegions, type PhCity } from '@/src/utils/phLocations';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
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

const BUDGET_PRESETS = [
  { label: '₱1,500', value: 1500, sub: '~₱50/araw' },
  { label: '₱3,000', value: 3000, sub: '~₱100/araw' },
  { label: '₱5,000', value: 5000, sub: '~₱167/araw' },
  { label: '₱8,000', value: 8000, sub: '~₱267/araw' },
];

const TOTAL_STEPS = 4;

type Lang = 'en' | 'tl';

// ── Progress dots ──────────────────────────────────────────────────────────────

function Dots({ step }: { step: number }) {
  return (
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
}

// ── Step 1 — Location ────────────────────────────────────────────────────────

function Step1({
  lang, slideAnim, region, setRegion, municipality, setMunicipality, cityOptions,
  barangay, setBarangay, barangayOptions, onNext,
}: {
  lang: Lang;
  slideAnim: Animated.Value;
  region: string;
  setRegion: (v: string) => void;
  municipality: string;
  setMunicipality: (v: string) => void;
  cityOptions: string[];
  barangay: string;
  setBarangay: (v: string) => void;
  barangayOptions: string[];
  onNext: () => void;
}) {
  return (
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

      <SelectField
        label={lang === 'en' ? 'Region' : 'Rehiyon'}
        placeholder={lang === 'en' ? 'Select region' : 'Pumili ng rehiyon'}
        value={region}
        options={getPhRegions()}
        onSelect={setRegion}
      />

      <SelectField
        label={lang === 'en' ? 'City / Municipality' : 'Lungsod / Munisipyo'}
        placeholder={lang === 'en' ? 'Select city / municipality' : 'Pumili ng lungsod / munisipyo'}
        value={municipality}
        options={cityOptions}
        onSelect={setMunicipality}
        disabled={!region}
        disabledHint={lang === 'en' ? 'Select a region first' : 'Pumili muna ng rehiyon'}
      />

      <SelectField
        label={lang === 'en' ? 'Barangay (optional)' : 'Barangay (opsyonal)'}
        placeholder={lang === 'en' ? 'Select barangay' : 'Pumili ng barangay'}
        value={barangay}
        options={barangayOptions}
        onSelect={setBarangay}
        disabled={!municipality}
        disabledHint={lang === 'en' ? 'Select a city first' : 'Pumili muna ng lungsod'}
      />

      <Pressable
        onPress={onNext}
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
}

// ── Step 2 — Household size ──────────────────────────────────────────────────

function Step2({
  lang, slideAnim, householdSize, setHouseholdSize, onNext, onBack,
}: {
  lang: Lang;
  slideAnim: Animated.Value;
  householdSize: number;
  setHouseholdSize: (fn: (s: number) => number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
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
        onPress={onNext}
        className="w-full rounded-xl bg-brand-600 py-4 items-center active:opacity-80 mb-3"
      >
        <Text className="text-sm font-semibold text-white">{lang === 'en' ? 'Next →' : 'Susunod →'}</Text>
      </Pressable>
      <Pressable onPress={onBack} className="items-center py-2">
        <Text className="text-xs text-ink-soft">{lang === 'en' ? '← Back' : '← Bumalik'}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ── Step 3 — Budget ──────────────────────────────────────────────────────────

function Step3({
  lang, slideAnim, householdSize, budgetAmount, setBudgetAmount, selectedPreset, pickPreset,
  saving, onSubmit, onBack,
}: {
  lang: Lang;
  slideAnim: Animated.Value;
  householdSize: number;
  budgetAmount: string;
  setBudgetAmount: (v: string) => void;
  selectedPreset: number | null;
  pickPreset: (value: number) => void;
  saving: boolean;
  onSubmit: () => void;
  onBack: () => void;
}) {
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
          onChangeText={(v) => setBudgetAmount(v.replace(/[^0-9]/g, ''))}
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
        onPress={onSubmit}
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
      <Pressable onPress={onBack} className="items-center py-2">
        <Text className="text-xs text-ink-soft">{lang === 'en' ? '← Back' : '← Bumalik'}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ── Step 4 — Done ────────────────────────────────────────────────────────────

function Step4({
  lang, slideAnim, firstName, municipality, householdSize, budgetAmount, onDone,
}: {
  lang: Lang;
  slideAnim: Animated.Value;
  firstName: string;
  municipality: string;
  householdSize: number;
  budgetAmount: string;
  onDone: () => void;
}) {
  return (
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
        onPress={onDone}
        className="w-full rounded-xl bg-brand-600 py-4 items-center active:opacity-80"
      >
        <Text className="text-sm font-semibold text-white">
          {lang === 'en' ? 'Go to Dashboard →' : 'Puntahan ang Dashboard →'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const { lang } = useLanguage();
  const firstName = user?.name?.split(' ')[0] ?? 'Ka-uLam';

  const [step, setStep] = useState(1);

  // Step 1
  const [region, setRegionRaw]           = useState(user?.region ?? '');
  const [municipality, setMunicipalityRaw] = useState(user?.municipality ?? '');
  const [province, setProvince]          = useState(user?.province ?? '');
  const [cityCode, setCityCode]          = useState('');
  const [barangay, setBarangay]          = useState('');

  const cityOptions = useMemo(() => (region ? getPhCitiesForRegion(region) : []), [region]);
  const barangayOptions = useMemo(() => (cityCode ? getPhBarangaysForCity(cityCode) : []), [cityCode]);

  // Picking a new region invalidates whatever city/barangay were picked
  // under the old one; picking a new city invalidates the barangay.
  const setRegion = (v: string) => {
    setRegionRaw(v);
    setMunicipalityRaw('');
    setProvince('');
    setCityCode('');
    setBarangay('');
  };

  const setMunicipality = (cityName: string) => {
    setMunicipalityRaw(cityName);
    setBarangay('');
    const match = cityOptions.find((c: PhCity) => c.name === cityName);
    setCityCode(match?.code ?? '');
    setProvince(match?.province ?? '');
  };

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
        region:               region || null,
        province:             province || null,
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
        region:               region || null,
        province:             province || null,
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

      <Dots step={step} />

      {step === 1 && (
        <Step1
          lang={lang}
          slideAnim={slideAnim}
          region={region}
          setRegion={setRegion}
          municipality={municipality}
          setMunicipality={setMunicipality}
          cityOptions={cityOptions.map((c) => c.name)}
          barangay={barangay}
          setBarangay={setBarangay}
          barangayOptions={barangayOptions}
          onNext={goNext}
        />
      )}
      {step === 2 && (
        <Step2
          lang={lang}
          slideAnim={slideAnim}
          householdSize={householdSize}
          setHouseholdSize={setHouseholdSize}
          onNext={goNext}
          onBack={goBack}
        />
      )}
      {step === 3 && (
        <Step3
          lang={lang}
          slideAnim={slideAnim}
          householdSize={householdSize}
          budgetAmount={budgetAmount}
          setBudgetAmount={(v) => { setBudgetAmount(v); setSelectedPreset(null); }}
          selectedPreset={selectedPreset}
          pickPreset={pickPreset}
          saving={saving}
          onSubmit={submitBudget}
          onBack={goBack}
        />
      )}
      {step === 4 && (
        <Step4
          lang={lang}
          slideAnim={slideAnim}
          firstName={firstName}
          municipality={municipality}
          householdSize={householdSize}
          budgetAmount={budgetAmount}
          onDone={() => router.replace('/(tabs)')}
        />
      )}
    </ScrollView>
  );
}
