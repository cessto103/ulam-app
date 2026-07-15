import client from '@/src/api/client';
import GradientPageHeader from '@/src/components/GradientPageHeader';
import ItemThumb from '@/src/components/ItemThumb';
import HeaderIconRow from '@/src/components/HeaderIconRow';
import { HeaderWave, ULamIcon, ULamLogoHorizontal } from '@/src/components/ULamLogo';
import { useAuth } from '@/src/context/AuthContext';
import { useLanguage } from '@/src/context/LanguageContext';
import { SkeletonMealCard, SkeletonRecipeCard } from '@/src/components/Skeleton';
import RecipeCoverPhoto from '@/src/components/recipe/RecipeCoverPhoto';
import { type CollageStyle, type FontKey, type GradientKey } from '@/src/types/recipe';
import { formatCount } from '@/src/utils/formatCount';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import { useCallback, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  Text,
  TextInput,
  View,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

type MealItem = {
  id: number;
  recipe_id: number | null;
  meal_type: string;
  dish_name: string;
  estimated_cost: number | string;
  recipe?: { id: number; image_url: string | null; image_urls: string[] | null } | null;
};
type MealPlan = { id: number; total_estimated_cost: number | string; created_at: string; items: MealItem[] };

type RecipeIngredient = { id: number; name: string; quantity: string; unit: string; estimated_price: number };
type Recipe = {
  id: number;
  user_id: number | null;
  user?: { id: number; name: string; username: string | null };
  title: string;
  description: string;
  source: 'official' | 'community';
  image_url: string | null;
  image_urls: string[] | null;
  collage_style: CollageStyle;
  gradient_key: GradientKey;
  font_key: FontKey;
  budget_tag: string;
  estimated_cost: number;
  servings: number;
  prep_time_minutes: number;
  cook_time_minutes: number;
  tags: string[];
  save_count: number;
  share_count: number;
  vote_up_count: number;
  vote_down_count: number;
  views_count: number;
  is_saved: boolean;
  is_mine: boolean;
  is_published: boolean;
  ingredients: RecipeIngredient[];
};

type RecipePage = { data: Recipe[]; current_page: number; last_page: number };
type Section = { key: string; title: string; data: Recipe[] };

// ─── Constants ─────────────────────────────────────────────────────────────────

const MEAL_META: Record<string, { labelEn: string; labelTl: string; time: string; bg: string; emoji: string }> = {
  almusal:    { labelEn: 'Breakfast', labelTl: 'Almusal',    time: '6:00 AM',  bg: '#FDEFC9', emoji: '🍳' },
  tanghalian: { labelEn: 'Lunch',     labelTl: 'Tanghalian', time: '12:00 PM', bg: '#EFF4EC', emoji: '☀️' },
  meryenda:   { labelEn: 'Snack',     labelTl: 'Meryenda',   time: '3:00 PM',  bg: '#EFF4EC', emoji: '🍌' },
  hapunan:    { labelEn: 'Dinner',    labelTl: 'Hapunan',    time: '6:00 PM',  bg: '#EFF4EC', emoji: '🌙' },
};
const MEAL_ORDER = ['almusal', 'tanghalian', 'meryenda', 'hapunan'];
const PLAN_CARD_STYLE: Record<string, { band: string; accent: string; light: string }> = {
  almusal: { band: '#E3A32A', accent: '#C4881C', light: '#FEF6E3' },
  tanghalian: { band: '#4E7A47', accent: '#386641', light: '#EFF4EC' },
  meryenda: { band: '#F97316', accent: '#EA580C', light: '#FFF7ED' },
  hapunan: { band: '#6366F1', accent: '#4F46E5', light: '#EEF2FF' },
};

const BUDGET_FILTERS = [
  { label: 'All',     value: null },
  { label: '₱100',   value: 'budget_100' },
  { label: '₱200',   value: 'budget_200' },
  { label: '₱400',   value: 'budget_400' },
  { label: '₱600',   value: 'budget_600' },
  { label: '₱800',   value: 'budget_800' },
  { label: '₱1,000', value: 'budget_1000' },
  { label: '₱1,000+',value: 'budget_1000plus' },
];

const BUDGET_LABEL: Record<string, string> = {
  budget_100:      '₱100',
  budget_200:      '₱200',
  budget_400:      '₱400',
  budget_600:      '₱600',
  budget_800:      '₱800',
  budget_1000:     '₱1,000',
  budget_1000plus: '₱1,000+',
};

// ─── API ───────────────────────────────────────────────────────────────────────

async function fetchTodayPlan(): Promise<MealPlan | null> {
  try {
    const { data } = await client.get('/meal-plans/today');
    return data.meal_plan;
  } catch { return null; }
}

async function generatePlan(): Promise<MealPlan> {
  const { data } = await client.post('/meal-plans/generate');
  return data.meal_plan;
}

async function fetchRecipes(budgetTag: string | null, search: string): Promise<RecipePage> {
  const params = new URLSearchParams({ per_page: '50' });
  if (budgetTag) params.set('budget_tag', budgetTag);
  if (search.trim()) params.set('search', search.trim());
  const { data } = await client.get(`/recipes?${params}`);
  return data;
}

// ─── Source badge ──────────────────────────────────────────────────────────────

function SourceBadge({ source, isMine }: { source: string; isMine: boolean }) {
  if (isMine) {
    return (
      <View style={{ backgroundColor: '#FDEFC9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 0.5, borderColor: '#E3A32A' }}>
        <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#9A6A12' }}>My Recipe</Text>
      </View>
    );
  }
  if (source === 'official') {
    return (
      <View style={{ backgroundColor: '#EFF4EC', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 0.5, borderColor: '#5DCAA5' }}>
        <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#2C5234' }}>Official</Text>
      </View>
    );
  }
  return (
    <View style={{ backgroundColor: '#EFF4EC', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 0.5, borderColor: '#85B7EB' }}>
      <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#0C447C' }}>Community</Text>
    </View>
  );
}

// ─── Share toggle ──────────────────────────────────────────────────────────────

function ShareToggle({ value, onPress, disabled }: { value: boolean; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        width: 38, height: 22, borderRadius: 11,
        backgroundColor: value ? '#6E7B4A' : '#D3C5AB',
        paddingHorizontal: 2,
        justifyContent: 'center',
        alignItems: value ? 'flex-end' : 'flex-start',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' }} />
    </Pressable>
  );
}

// ─── Plan View ────────────────────────────────────────────────────────────────

function PlanMealCard({
  label,
  time,
  dishName,
  price,
  photo,
  colors,
  onPress,
  onRemove,
}: {
  label: string;
  time: string;
  dishName: string;
  price: number;
  photo?: string | null;
  colors: { band: string; accent: string; light: string };
  onPress?: () => void;
  onRemove: () => void;
}) {
  return (
    <View
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 10,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View
        style={{
          backgroundColor: colors.band,
          paddingHorizontal: 12,
          paddingVertical: 7,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ fontFamily: 'NunitoSans_800ExtraBold', fontSize: 13, color: '#FFFFFF', letterSpacing: 0.8 }}>
          {label.toUpperCase()}
        </Text>
        <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: 'rgba(255,255,255,0.82)' }}>
          {time}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: colors.light,
          paddingLeft: 12,
          paddingRight: 8,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Pressable
          onPress={onPress}
          disabled={!onPress}
          style={{ flex: 1, paddingRight: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}
          className={onPress ? 'active:opacity-70' : ''}
        >
          <ItemThumb photo={photo} name={dishName} size={36} />
          <Text
            style={{
              flex: 1,
              fontFamily: 'NunitoSans_700Bold',
              fontSize: 14,
              lineHeight: 18,
              color: colors.accent,
            }}
          >
            {dishName}
          </Text>
        </Pressable>

        <Text
          style={{
            fontFamily: 'Baloo2_700Bold',
            fontSize: 24,
            lineHeight: 28,
            color: colors.accent,
            marginRight: 4,
          }}
        >
          ₱{price.toFixed(0)}
        </Text>

        <Pressable
          onPress={onRemove}
          hitSlop={8}
          className="active:opacity-60"
          style={{ padding: 4 }}
        >
          <Ionicons name="close-circle" size={18} color={colors.accent} />
        </Pressable>
      </View>
    </View>
  );
}

function PlanView({ user }: { user: any }) {
  const { lang } = useLanguage();
  const router = useRouter();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: plan, isLoading } = useQuery({
    queryKey: ['meal-plan-today'],
    queryFn: fetchTodayPlan,
  });

  const { data: budget } = useQuery({
    queryKey: ['budget-today'],
    queryFn: async () => {
      try {
        const { data } = await client.get('/budget/today');
        return data?.has_budget ? (data as { budget: number; has_budget: boolean }) : null;
      } catch { return null; }
    },
    staleTime: 60_000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['meal-plan-today'] });
    setRefreshing(false);
  }, [qc]);

  const [aiDisabled, setAiDisabled] = useState(false);

  const { mutate: generate, isPending } = useMutation({
    mutationFn: generatePlan,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-plan-today'] }),
    onError: (e: any) => {
      if (e?.response?.data?.ai_disabled) {
        setAiDisabled(true);
        Alert.alert(
          lang === 'en' ? 'Temporarily unavailable' : 'Pansamantalang hindi available',
          lang === 'en'
            ? 'AI meal plan generation is paused for now. Please check back soon!'
            : 'Naka-pause muna ang AI meal plan generation. Balik lang po kayo!',
        );
        return;
      }
      if (e?.response?.data?.quota_exceeded) {
        Alert.alert(
          lang === 'en' ? "You're out of free AI plans" : 'Naubos na ang libreng AI plans mo',
          e?.response?.data?.message ?? (lang === 'en' ? "You've used your 3 free AI meal plans this month." : 'Naubos na ang 3 libreng AI meal plans mo ngayong buwan.'),
          [
            { text: lang === 'en' ? 'Not now' : 'Huwag muna', style: 'cancel' },
            { text: lang === 'en' ? 'Upgrade →' : 'I-upgrade →', onPress: () => router.push('/upgrade' as any) },
          ],
        );
        return;
      }
      Alert.alert(
        lang === 'en' ? 'Error' : 'Error',
        e?.response?.data?.message ?? (lang === 'en' ? 'Could not generate a meal plan. Try again.' : 'Hindi nagawa ang meal plan. Subukan ulit.'),
      );
    },
  });

  const { mutate: removeItem } = useMutation({
    mutationFn: (itemId: number) => client.delete(`/meal-plan/items/${itemId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-plan-today'] }),
  });

  const remaining = user?.plan === 'premium'
    ? '∞'
    : `${Math.max(0, 3 - (user?.ai_meal_plans_used_this_month ?? 0))} left`;

  const grouped = plan
    ? MEAL_ORDER.reduce((acc, type) => {
        const items = plan.items.filter((i) => i.meal_type === type);
        if (items.length) acc[type] = items;
        return acc;
      }, {} as Record<string, MealItem[]>)
    : {};

  if (isLoading) return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      {[0,1,2,3].map(i => <SkeletonMealCard key={i} />)}
    </ScrollView>
  );

  if (plan) {
    const planCost = Number(plan.total_estimated_cost);
    const budgetDiff = budget ? budget.budget - planCost : null;
    const isOverBudget = (budgetDiff ?? 0) < 0;

    return (
      <>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-3 pb-8"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6E7B4A" />
        }
      >
        <View
          style={{
            backgroundColor: '#FEF6E3',
            borderWidth: 1,
            borderColor: '#F8D076',
            borderRadius: 18,
            paddingHorizontal: 14,
            paddingVertical: 12,
            marginBottom: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Text style={{ fontSize: 17, marginRight: 8 }}>💡</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'NunitoSans_800ExtraBold', fontSize: 13, color: '#9A6A12' }}>
                {lang === 'en' ? "Today's total cost" : 'Kabuuang gastos ngayon'}
              </Text>
              <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#9A6A12', marginTop: 2 }}>
                {lang === 'en'
                  ? 'Use the monggo soup broth to stretch it further: two meals from one cook!'
                  : 'Gamitin ang sabaw ng monggo para mag-extend: dalawang kain, isang luto!'}
              </Text>
            </View>
            <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 20, color: '#9A6A12' }}>
              ₱{planCost.toFixed(0)}
            </Text>
            <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#9A6A12', marginLeft: 4, marginTop: 5 }}>
              · {remaining}
            </Text>
          </View>
        </View>

        {budgetDiff !== null ? (
          <View
            style={{
              backgroundColor: isOverBudget ? '#FFF1EE' : '#EFF4EC',
              borderWidth: 1,
              borderColor: isOverBudget ? '#F2C1BE' : '#6EE7B7',
              borderRadius: 18,
              paddingHorizontal: 14,
              paddingVertical: 12,
              marginBottom: 12,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 17, marginRight: 8 }}>{isOverBudget ? '⚠️' : '✅'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'NunitoSans_800ExtraBold', fontSize: 13, color: isOverBudget ? '#E24B4A' : '#065F46' }}>
                {isOverBudget
                  ? (lang === 'en' ? `Over budget by ₱${Math.abs(budgetDiff).toFixed(0)}` : `Lagpas ng ₱${Math.abs(budgetDiff).toFixed(0)} sa budget`)
                  : (lang === 'en' ? `₱${budgetDiff.toFixed(0)} remaining after this plan` : `₱${budgetDiff.toFixed(0)} remaining after this plan`)}
              </Text>
              <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: isOverBudget ? '#E24B4A' : '#6F655A', marginTop: 2 }}>
                {lang === 'en'
                  ? `Daily: ₱${budget!.budget.toFixed(0)} · Plan cost: ₱${planCost.toFixed(0)}`
                  : `Daily: ₱${budget!.budget.toFixed(0)} · Plan cost: ₱${planCost.toFixed(0)}`}
              </Text>
            </View>
          </View>
        ) : null}

        {MEAL_ORDER.flatMap((type) => {
          const items = grouped[type] ?? [];
          const meta = MEAL_META[type];
          const colors = PLAN_CARD_STYLE[type] ?? PLAN_CARD_STYLE.almusal;
          return items.map((item) => (
            <PlanMealCard
              key={item.id}
              label={lang === 'en' ? meta.labelEn : meta.labelTl}
              time={meta.time}
              dishName={item.dish_name}
              price={Number(item.estimated_cost)}
              photo={item.recipe?.image_urls?.[0] ?? item.recipe?.image_url ?? null}
              colors={colors}
              onPress={item.recipe_id ? () => router.push(`/recipe/${item.recipe_id}` as any) : undefined}
              onRemove={() => removeItem(item.id)}
            />
          ));
        })}

        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 12,
            marginTop: 2,
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          {MEAL_ORDER.filter((type) => grouped[type]?.length).map((type) => {
            const meta = MEAL_META[type];
            const subtotal = (grouped[type] ?? []).reduce((sum, item) => sum + Number(item.estimated_cost), 0);
            const colors = PLAN_CARD_STYLE[type] ?? PLAN_CARD_STYLE.almusal;
            return (
              <View key={type} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: colors.band, marginRight: 8 }} />
                  <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A' }}>
                    {lang === 'en' ? meta.labelEn : meta.labelTl}
                  </Text>
                </View>
                <Text style={{ fontFamily: 'NunitoSans_800ExtraBold', fontSize: 13, color: '#000000' }}>
                  ₱{subtotal.toFixed(0)}
                </Text>
              </View>
            );
          })}
          <View style={{ marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F9EDD3', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: 'NunitoSans_800ExtraBold', fontSize: 14, color: '#000000' }}>
              {lang === 'en' ? 'Total' : 'Kabuuan'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 16 }}>🪙</Text>
              <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 24, color: '#5E693F' }}>
                ₱{planCost.toFixed(0)}
              </Text>
            </View>
          </View>
        </View>

        <Link href="/shopping-list" asChild>
          <Pressable className="mt-3 overflow-hidden rounded-2xl active:opacity-90">
            <LinearGradient colors={['#5E693F', '#6E7B4A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <View style={{ paddingVertical: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontSize: 14 }}>🧾</Text>
                <Text style={{ fontFamily: 'NunitoSans_800ExtraBold', fontSize: 14, color: '#FFFFFF' }}>
                  {lang === 'en' ? 'Open Shopping List' : 'Buksan ang Shopping List'}
                </Text>
              </View>
            </LinearGradient>
          </Pressable>
        </Link>

      </ScrollView>

      </>
    );
  }

  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text style={{ fontSize: 40, marginBottom: 16 }}>🍽️</Text>
      <Text className="text-base font-medium text-ink mb-2 text-center">
        {lang === 'en' ? 'No meal plan yet' : 'Walang meal plan pa'}
      </Text>
      <Text className="text-xs text-ink-soft mb-8 text-center leading-5">
        {lang === 'en'
          ? 'Generate an AI-powered meal plan that fits your budget today.'
          : 'Gumawa ng AI-powered meal plan na akmang-akma sa iyong budget ngayon.'}
      </Text>
      <Pressable
        onPress={() => generate()}
        disabled={isPending || aiDisabled}
        className={`rounded-xl px-8 py-3.5 items-center active:opacity-80 disabled:opacity-60 ${aiDisabled ? 'bg-cream-300' : 'bg-brand-600'}`}
      >
        {isPending ? (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator color="white" size="small" />
            <Text className="text-sm font-semibold text-white">
              {lang === 'en' ? 'Generating...' : 'Ginagawa...'}
            </Text>
          </View>
        ) : (
          <Text className={`text-sm font-semibold ${aiDisabled ? 'text-ink-soft' : 'text-white'}`}>
            {aiDisabled
              ? (lang === 'en' ? 'Temporarily Unavailable' : 'Hindi Muna Available')
              : (lang === 'en' ? 'Generate Meal Plan' : 'Gumawa ng Meal Plan')}
          </Text>
        )}
      </Pressable>
      {!aiDisabled && (
        user?.plan === 'premium' ? (
          <Text className="mt-3 text-xs text-ink-soft">
            {user?.premium_source === 'trial'
              ? (lang === 'en' ? '🎁 Free trial (unlimited AI plans)' : '🎁 Libreng trial (unlimited AI plans)')
              : (lang === 'en' ? '⭐ Premium (unlimited AI plans)' : '⭐ Premium (unlimited AI plans)')}
          </Text>
        ) : (
          <Pressable onPress={() => router.push('/upgrade' as any)} className="mt-3 flex-row items-center gap-1 active:opacity-70">
            <Text className="text-xs text-ink-soft">
              {remaining} {lang === 'en' ? 'generations left' : 'generations ang natitira'}
            </Text>
            <Text className="text-xs font-semibold text-brand-600">
              {lang === 'en' ? '· Go Premium →' : '· Mag-Premium →'}
            </Text>
          </Pressable>
        )
      )}
    </View>
  );
}

// ─── Recipe List View ──────────────────────────────────────────────────────────

type SourceFilter = 'all' | 'mine' | 'official' | 'community';

const SOURCE_FILTERS: { label: string; value: SourceFilter }[] = [
  { label: 'All',       value: 'all' },
  { label: 'Mine',      value: 'mine' },
  { label: 'Official',  value: 'official' },
  { label: 'Community', value: 'community' },
];

function RecipeListView({ initialFilter }: { initialFilter?: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [budgetFilter,  setBudgetFilter]  = useState<string | null>(null);
  const [sourceFilter,  setSourceFilter]  = useState<SourceFilter>(
    (['all', 'mine', 'official', 'community'].includes(initialFilter ?? '') ? initialFilter : 'all') as SourceFilter,
  );

  // Tab screens stay mounted — re-apply the deep-linked filter on later navigations
  useEffect(() => {
    if (initialFilter && ['all', 'mine', 'official', 'community'].includes(initialFilter)) {
      setSourceFilter(initialFilter as SourceFilter);
    }
  }, [initialFilter]);
  const [search, setSearch] = useState('');
  // Debounce: fetch only after the user pauses typing, so the list (and the
  // search box inside its header) doesn't churn on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['recipes'] });
    setRefreshing(false);
  }, [qc]);

  const { data, isLoading } = useQuery({
    queryKey: ['recipes', budgetFilter, debouncedSearch],
    queryFn: () => fetchRecipes(budgetFilter, debouncedSearch),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  // Optimistic toggle for share/unshare
  const shareMutation = useMutation({
    mutationFn: (id: number) => client.patch(`/recipes/${id}/share`).then(r => r.data),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['recipes', budgetFilter, debouncedSearch] });
      const prev = qc.getQueryData<RecipePage>(['recipes', budgetFilter, debouncedSearch]);
      qc.setQueryData<RecipePage>(['recipes', budgetFilter, debouncedSearch], (old) => {
        if (!old) return old;
        return { ...old, data: old.data.map(r => r.id === id ? { ...r, is_published: !r.is_published } : r) };
      });
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['recipes', budgetFilter, debouncedSearch], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  });

  const toggleSave = async (r: Recipe) => {
    try {
      await client.post(`/recipes/${r.id}/save`);
      qc.invalidateQueries({ queryKey: ['recipes'] });
    } catch {}
  };

  const allRecipes = data?.data ?? [];
  const official  = allRecipes.filter(r => !r.is_mine && r.source === 'official');
  const community = allRecipes.filter(r => !r.is_mine && r.source === 'community');
  const mine      = allRecipes.filter(r => r.is_mine);

  const sections: Section[] = sourceFilter === 'all'
    ? [
        ...(official.length  ? [{ key: 'official',  title: 'Official recipes',  data: official }]  : []),
        ...(community.length ? [{ key: 'community', title: 'Community recipes', data: community }] : []),
        ...(mine.length      ? [{ key: 'mine',      title: 'Your recipes',      data: mine }]      : []),
      ]
    : sourceFilter === 'mine'
      ? (mine.length      ? [{ key: 'mine',      title: 'Your recipes',      data: mine }]      : [])
      : sourceFilter === 'official'
        ? (official.length  ? [{ key: 'official',  title: 'Official recipes',  data: official }]  : [])
        : (community.length ? [{ key: 'community', title: 'Community recipes', data: community }] : []);

  const renderRecipe = ({ item: r }: { item: Recipe }) => {
    const isMine   = r.is_mine;
    const totalMin = (r.prep_time_minutes ?? 0) + (r.cook_time_minutes ?? 0);
    const photos   = r.image_urls ?? (r.image_url ? [r.image_url] : []);

    return (
      <Pressable
        onPress={() => router.push(`/recipe/${r.id}` as any)}
        style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          borderWidth: isMine ? 1.5 : 0.5,
          borderColor: isMine ? '#E3A32A' : '#F0DEBB',
          marginBottom: 12,
          marginHorizontal: 16,
          overflow: 'hidden',
        }}
        className="active:opacity-80"
      >
        {/* Cover photo */}
        <RecipeCoverPhoto
          photos={photos}
          collageStyle={r.collage_style ?? 'gradient'}
          gradientKey={r.gradient_key ?? 'grad_a'}
          fontKey={r.font_key ?? 'baloo'}
          title={r.title}
        />

        {/* Card body */}
        <View style={{ padding: 14 }}>
          {/* Source badge + action icons */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
            <SourceBadge source={r.source} isMine={isMine} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {isMine && (
                <Pressable
                  onPress={(e) => { e.stopPropagation(); router.push(`/edit-recipe/${r.id}` as any); }}
                  hitSlop={8}
                >
                  <Ionicons name="create-outline" size={18} color="#E3A32A" />
                </Pressable>
              )}
              <Pressable
                onPress={(e) => { e.stopPropagation(); toggleSave(r); }}
                hitSlop={8}
              >
                <Ionicons
                  name={r.is_saved ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={r.is_saved ? '#F4B942' : '#D3C5AB'}
                />
              </Pressable>
            </View>
          </View>

          {/* Author row (community only) */}
          {!isMine && r.source === 'community' && r.user && (
            <Pressable
              onPress={(e) => { e.stopPropagation(); router.push(`/user/${r.user!.id}` as any); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}
            >
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#EFF4EC', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 10, fontFamily: 'NunitoSans_700Bold', color: '#5E693F' }}>
                  {r.user.name.substring(0, 2).toUpperCase()}
                </Text>
              </View>
              <Text style={{ fontSize: 13, fontFamily: 'NunitoSans_400Regular', color: '#6F655A' }}>
                by <Text style={{ fontFamily: 'NunitoSans_700Bold', color: '#000000' }}>{r.user.name}</Text>
              </Text>
            </Pressable>
          )}

          {/* Title + description */}
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#000000', marginBottom: 3, lineHeight: 20 }} numberOfLines={2}>
            {r.title}
          </Text>
          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', lineHeight: 18, marginBottom: 8 }} numberOfLines={2}>
            {r.description}
          </Text>

          {/* Meta chips */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <View style={{ backgroundColor: '#FDEFC9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#9A6A12' }}>
                {BUDGET_LABEL[r.budget_tag] ?? r.budget_tag}
              </Text>
            </View>
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>{r.servings} servings</Text>
            {totalMin > 0 && <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>{totalMin} min</Text>}
          </View>

          {/* Reactions + share row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: '#F0DEBB' }}>
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>👍 {r.vote_up_count ?? 0}</Text>
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>👎 {r.vote_down_count ?? 0}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="bookmark-outline" size={12} color="#6F655A" />
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>{r.save_count}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="eye-outline" size={12} color="#6F655A" />
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>{formatCount(r.views_count ?? 0)}</Text>
            </View>
            {(r.share_count ?? 0) > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="paper-plane-outline" size={12} color="#6F655A" />
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>{r.share_count}</Text>
              </View>
            )}
            {isMine && (
              <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
                  {r.is_published ? 'Public' : 'Private'}
                </Text>
                <ShareToggle
                  value={r.is_published}
                  onPress={() => shareMutation.mutate(r.id)}
                  disabled={shareMutation.isPending && shareMutation.variables === r.id}
                />
              </View>
            )}
          </View>

          {/* Publish status chip */}
          {isMine && (
            <View style={{ marginTop: 6, alignItems: 'flex-end' }}>
              {r.is_published ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF4EC', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
                  <Ionicons name="checkmark" size={10} color="#5E693F" />
                  <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#5E693F' }}>Public – visible to community</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F9EDD3', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
                  <Ionicons name="lock-closed-outline" size={10} color="#6F655A" />
                  <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#6F655A' }}>Private – only you can see this</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  const ListHeader = (
    <>
      {/* Search + Create */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#F0DEBB', paddingHorizontal: 12, paddingVertical: 10 }}>
          <Ionicons name="search-outline" size={15} color="#B0A18C" style={{ marginRight: 6 }} />
          <TextInput
            style={{ flex: 1, fontSize: 14, color: '#000000', padding: 0 }}
            placeholder="Search recipes..."
            placeholderTextColor="#B0A18C"
            value={search}
            onChangeText={(v) => setSearch(v)}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Source filter tabs */}
      <View style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: '#F9EDD3', borderRadius: 12, padding: 3, gap: 2 }}>
        {SOURCE_FILTERS.map((f) => {
          const active = sourceFilter === f.value;
          return (
            <Pressable
              key={f.value}
              onPress={() => setSourceFilter(f.value)}
              style={{
                flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 10,
                backgroundColor: active ? '#fff' : 'transparent',
                ...(active ? { shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 3, elevation: 2 } : {}),
              }}
            >
              <Text style={{
                fontSize: 13,
                fontFamily: active ? 'NunitoSans_700Bold' : 'NunitoSans_400Regular',
                color: active ? '#5E693F' : '#B0A18C',
              }}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Budget filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, height: 46 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}
      >
        {BUDGET_FILTERS.map((f) => {
          const active = budgetFilter === f.value;
          return (
            <Pressable
              key={f.label}
              onPress={() => setBudgetFilter(f.value)}
              style={{
                paddingHorizontal: 14, paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: active ? '#6E7B4A' : '#fff',
                borderWidth: 1,
                borderColor: active ? '#6E7B4A' : '#F0DEBB',
              }}
            >
              <Text style={{ fontSize: 13, fontFamily: 'NunitoSans_600SemiBold', color: active ? '#fff' : '#6F655A' }}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1 }}>
        {ListHeader}
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {[0,1,2,3,4].map(i => <SkeletonRecipeCard key={i} />)}
        </ScrollView>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(r) => String(r.id)}
      renderItem={renderRecipe}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, color: '#6F655A' }}>
            {section.title}
          </Text>
        </View>
      )}
      ListHeaderComponent={ListHeader}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 36, marginBottom: 12 }}>🍽️</Text>
          <Text style={{ fontSize: 14, color: '#6F655A', textAlign: 'center' }}>
            {search
              ? 'No recipes found.'
              : sourceFilter === 'mine'
                ? 'You have no recipes yet.\nTap the (+) button below to add your first one!'
                : sourceFilter === 'official'
                  ? 'No official recipes yet.'
                  : sourceFilter === 'community'
                    ? 'No community recipes yet.'
                    : 'No recipes yet.\nTap the (+) button below to add your first one!'}
          </Text>
        </View>
      }
      ListFooterComponent={<View style={{ height: 32 }} />}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6E7B4A" />
      }
      contentContainerStyle={{ paddingTop: 4 }}
    />
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function MealPlanScreen() {
  const params = useLocalSearchParams<{ tab?: string; filter?: string }>();
  const { user }  = useAuth();
  const router    = useRouter();
  const [tab, setTab] = useState<'plan' | 'recipes'>(params.tab === 'recipes' ? 'recipes' : 'plan');

  useEffect(() => {
    if (params.tab === 'recipes') setTab('recipes');
  }, [params.tab, params.filter]);

  return (
    <View className="flex-1" style={{ backgroundColor: '#FFF8E8' }}>
      <GradientPageHeader
        rightSlot={<HeaderIconRow />}
        tabs={[
          { key: 'plan', label: 'Plan', active: tab === 'plan', onPress: () => setTab('plan') },
          { key: 'recipes', label: 'Recipes', active: tab === 'recipes', onPress: () => setTab('recipes') },
          { key: 'saved', label: 'Bookmark', active: false, onPress: () => router.push('/recipe-book' as any) },
        ]}
        photo
      />

      {false && <>
      <LinearGradient
        colors={['#4F5835', '#5E693F', '#6E7B4A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View className="px-4 pt-4 pb-1">
          <View className="flex-row items-center gap-2">
            <ULamIcon size={32} />
            <ULamLogoHorizontal width={118} height={34} light />
          </View>
        </View>

        <View className="px-4 pb-0 flex-row gap-1">
          {([
            { key: 'plan', label: '📆 Plan' },
            { key: 'recipes', label: '🍲 Recipes' },
          ] as const).map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              className="px-3 py-2 rounded-t-2xl"
              style={{ backgroundColor: tab === t.key ? '#FFF8E8' : 'transparent' }}
            >
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: tab === t.key ? '#5E693F' : 'rgba(255,255,255,0.6)' }}>
                {t.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => router.push('/recipe-book' as any)}
            className="px-3 py-2 rounded-t-2xl"
          >
            <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>
              🔖 Saved
            </Text>
          </Pressable>
        </View>
        <HeaderWave fill="#FFF8E8" />
      </LinearGradient>
      </>}

      {false && <>
      <View className="px-4 pt-4 pb-3">
        <View className="flex-row bg-cream-200 rounded-xl p-1 gap-1">
          {([
            { key: 'plan',    label: '🍳 Plan' },
            { key: 'recipes', label: '📚 Recipes' },
          ] as const).map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              className={`flex-1 rounded-lg py-2 items-center ${tab === t.key ? 'bg-white' : ''}`}
              style={tab === t.key ? { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 } : {}}
            >
              <Text style={{ fontFamily: tab === t.key ? 'NunitoSans_700Bold' : 'NunitoSans_400Regular', fontSize: 13, color: tab === t.key ? '#5E693F' : '#B0A18C' }}>
                {t.label}
              </Text>
            </Pressable>
          ))}
          {/* Recipe Book shortcut */}
          <Pressable
            onPress={() => router.push('/recipe-book' as any)}
            className="rounded-lg py-2 px-3 items-center"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="bookmark-outline" size={12} color="#B0A18C" />
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>Bookmark</Text>
            </View>
          </Pressable>
        </View>
      </View>
      </>}

      {tab === 'plan' ? <PlanView user={user} /> : <RecipeListView initialFilter={params.filter} />}
    </View>
  );
}
