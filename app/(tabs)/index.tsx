import client, { API_URL } from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { useLanguage } from '@/src/context/LanguageContext';
import BrandLogo from '@/src/components/BrandLogo';
import BudgetExplainerSheet from '@/src/components/BudgetExplainerSheet';
import DailyTaskRow from '@/src/components/DailyTaskRow';
import HeaderIconRow from '@/src/components/HeaderIconRow';
import { Ionicons } from '@expo/vector-icons';
import { Skeleton, SkeletonBudgetCard, SkeletonMealCard, SkeletonStatsRow, SkeletonStreakCard } from '@/src/components/Skeleton';
import RecipeCoverPhoto from '@/src/components/recipe/RecipeCoverPhoto';
import RecipePickerModal, { fetchRecipes, type RecipeOption } from '@/src/components/RecipePickerModal';
import ThemedSection from '@/src/components/ThemedSection';
import { getRecipePhotos } from '@/src/utils/recipePhotos';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

// ─── Helpers ──────────────────────────────────────────────────────────────────

import { useSafeAreaInsets } from 'react-native-safe-area-context';

function toDateStr(d: Date): string {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function buildDateStrip(count = 7): { date: Date; iso: string }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result: { date: Date; iso: string }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    result.push({ date: d, iso: toDateStr(d) });
  }
  return result;
}

// Day abbreviations (index = JS getDay(), 0=Sun)
const FIL_DAY = ['Lin', 'Lun', 'Mar', 'Miy', 'Huw', 'Biy', 'Sab'];
const EN_DAY  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Streak week initials: Monday-first (index 0 = Mon … 6 = Sun)
const FIL_WEEK = ['L','M','M','H','B','S','L'];
const EN_WEEK  = ['M','T','W','T','F','S','S'];

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchUnreadCount(): Promise<number> {
  try {
    const { data } = await client.get('/notifications/unread-count');
    return data.count ?? 0;
  } catch { return 0; }
}

type BudgetToday = {
  has_budget:       boolean;
  budget:           number;
  spent:            number;
  remaining:        number;
  monthly_savings:  number;
  has_logged_today: boolean;
  period: {
    total_days: number;
    end_date:   string;
  };
};

type BudgetHistory = {
  has_budget:         boolean;
  date:               string;
  budget:             number;
  spent:              number;
  remaining:          number;
  has_logged:         boolean;
  expense_breakdown:  Record<string, number> | null;
  notes:              string | null;
  period?: {
    total_days:        number;
    daily_food_budget: number;
    start_date:        string;
    end_date:          string;
  };
};

type MealItem = {
  id: number;
  recipe_id: number | null;
  meal_type: string;
  dish_name: string;
  estimated_cost: number;
  ingredients?: { name: string; amount: string; unit: string }[];
};

type MealPlanData = {
  id: number;
  plan_date: string;
  total_estimated_cost: number;
  items: MealItem[];
} | null;

async function fetchBudgetToday(): Promise<BudgetToday | null> {
  try {
    const { data } = await client.get('/budget/today');
    if (!data?.has_budget) return null;
    return data;
  } catch { return null; }
}

async function fetchBudgetForDate(date: string): Promise<BudgetHistory | null> {
  try {
    const { data } = await client.get(`/budget/for-date?date=${date}`);
    return data;
  } catch { return null; }
}

async function fetchMealPlanForDate(date: string): Promise<MealPlanData> {
  try {
    const { data } = await client.get(`/meal-plan/today?date=${date}`);
    return data.meal_plan ?? null;
  } catch { return null; }
}

type RecommendedStore = {
  id: number; name: string; type: string | null;
  barangay: string | null; municipality: string | null;
  photo: string | null; is_verified: boolean;
  item_count: number; last_updated: string | null;
  distance_km?: number;
};

type PaginatedResponse<T> = { data: T[]; current_page: number; last_page: number };

async function fetchRecommendedRecipes(page: number): Promise<PaginatedResponse<RecipeOption>> {
  try {
    const { data } = await client.get(`/recipes/recommended?page=${page}&per_page=4`);
    return data;
  } catch { return { data: [], current_page: 1, last_page: 1 }; }
}

async function fetchRecommendedStores(page: number, lat?: number | null, lng?: number | null): Promise<PaginatedResponse<RecommendedStore>> {
  try {
    const params = new URLSearchParams({ page: String(page), per_page: '4' });
    if (lat != null && lng != null) {
      params.set('lat', String(lat));
      params.set('lng', String(lng));
      params.set('radius_km', '5');
    }
    const { data } = await client.get(`/tindahan/recommended?${params}`);
    return data;
  } catch { return { data: [], current_page: 1, last_page: 1 }; }
}

// ─── Display helpers ──────────────────────────────────────────────────────────

function savingsLabel(totalDays: number, lang: 'en' | 'tl'): string {
  if (lang === 'en') {
    if (totalDays === 1)  return 'Saved today';
    if (totalDays === 7)  return 'Saved (7 days)';
    if (totalDays === 15) return 'Saved (15 days)';
    if (totalDays >= 28)  return 'Saved this month';
    return `Saved (${totalDays} days)`;
  }
  if (totalDays === 1)  return 'Natipid ngayon';
  if (totalDays === 7)  return 'Natipid (7 araw)';
  if (totalDays === 15) return 'Natipid (15 araw)';
  if (totalDays >= 28)  return 'Natipid buwan';
  return `Natipid (${totalDays} araw)`;
}

function periodLabel(totalDays: number, endDate: string, lang: 'en' | 'tl'): string {
  const end = new Date(endDate + 'T00:00:00');
  if (lang === 'en') {
    if (totalDays === 1) return 'Today only (1 day)';
    if (totalDays >= 28) {
      const month = end.toLocaleString('default', { month: 'long' });
      return `All of ${month} (${totalDays} days)`;
    }
    const endStr = end.toLocaleDateString('default', { month: 'short', day: 'numeric' });
    return `${totalDays} days (until ${endStr})`;
  }
  if (totalDays === 1) return 'Para ngayon lang (1 araw)';
  if (totalDays >= 28) {
    const month = end.toLocaleString('default', { month: 'long' });
    return `Para sa buong ${month} (${totalDays} araw)`;
  }
  const endStr = end.toLocaleDateString('default', { month: 'short', day: 'numeric' });
  return `Para sa ${totalDays} araw (hanggang ${endStr})`;
}

function mealTypeLabel(type: string, lang: 'en' | 'tl'): string {
  const MAP: Record<string, { en: string; tl: string }> = {
    almusal:    { en: '🌅 Breakfast', tl: '🌅 Almusal' },
    tanghalian: { en: '☀️ Lunch',     tl: '☀️ Tanghalian' },
    meryenda:   { en: '🍌 Snack',     tl: '🍌 Meryenda' },
    hapunan:    { en: '🌙 Dinner',    tl: '🌙 Hapunan' },
    'iba pa':   { en: '🍽️ Others',   tl: '🍽️ Iba Pa' },
  };
  return MAP[type]?.[lang] ?? type;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const router   = useRouter();
  const qc       = useQueryClient();
  const insets   = useSafeAreaInsets();
  const firstName = user?.name?.split(' ')[0] ?? (lang === 'en' ? 'Friend' : 'Kababayan');
  const [refreshing, setRefreshing] = useState(false);

  const todayIso   = useMemo(() => toDateStr(new Date()), []);
  const dateStrip  = useMemo(() => buildDateStrip(7), []);
  const stripStart = useMemo(() => dateStrip[0].iso, [dateStrip]);
  const stripEnd   = useMemo(() => dateStrip[dateStrip.length - 1].iso, [dateStrip]);
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const isToday = selectedDate === todayIso;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['budget-today'] }),
      qc.invalidateQueries({ queryKey: ['notif-count'] }),
      qc.invalidateQueries({ queryKey: ['budget-date', selectedDate] }),
      qc.invalidateQueries({ queryKey: ['meal-plan-date', selectedDate] }),
      qc.invalidateQueries({ queryKey: ['meal-plan-dates'] }),
      qc.invalidateQueries({ queryKey: ['popular-recipes'] }),
      qc.invalidateQueries({ queryKey: ['recommended-recipes'] }),
      qc.invalidateQueries({ queryKey: ['recommended-stores'] }),
    ]);
    setRefreshing(false);
  }, [qc, selectedDate]);

  const { data: budget, isLoading: budgetLoading } = useQuery({
    queryKey: ['budget-today'],
    queryFn: fetchBudgetToday,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notif-count'],
    queryFn:  fetchUnreadCount,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: historyBudget, isLoading: histBudgetLoading } = useQuery({
    queryKey: ['budget-date', selectedDate],
    queryFn:  () => fetchBudgetForDate(selectedDate),
    enabled:  !isToday,
  });

  const { data: historyMealPlan, isLoading: histMealLoading } = useQuery({
    queryKey: ['meal-plan-date', selectedDate],
    queryFn:  () => fetchMealPlanForDate(selectedDate),
    enabled:  !isToday,
  });

  const { data: planDates = [] } = useQuery<string[]>({
    queryKey: ['meal-plan-dates', stripStart, stripEnd],
    queryFn:  async () => {
      try {
        const { data } = await client.get('/meal-plans/dates', { params: { start: stripStart, end: stripEnd } });
        return data.dates ?? [];
      } catch { return []; }
    },
    staleTime: 60_000,
  });

  // ── Budget explainer — always available via the (!) badge on the budget card ──
  const [explainerOpen, setExplainerOpen] = useState(false);

  const proceedFromExplainer = () => {
    setExplainerOpen(false);
    router.push('/budget-setup' as any);
  };

  // ── Recipe picker ─────────────────────────────────────────────────────────────
  const [pickerOpen, setPickerOpen] = useState(false);

  const streak    = user?.streak_days ?? 0;
  const todayDow  = new Date().getDay();
  const todayIdx  = todayDow === 0 ? 6 : todayDow - 1;

  // Popular This Week — purely organic: /recipes orders by views in the
  // last 7 days, then all-time saves as a tiebreaker (RecipeController::index).
  // Boosted recipes have their own dedicated "Recommended for you" section
  // instead, so this stays an honest "what's actually trending" signal.
  const { data: popularRecipes = [] } = useQuery({
    queryKey: ['popular-recipes'],
    queryFn: () => fetchRecipes(''),
    staleTime: 5 * 60_000,
  });

  // fetchRecipes already pulls up to 30 in one request, so "Load more" here
  // just reveals more of what's already fetched -- no extra network call.
  const [popularVisibleCount, setPopularVisibleCount] = useState(4);

  // ── Recommended for You — boosted recipes only, the dedicated placement a
  // boost buys (see RecipeController::recommended). 2x2 grid, "Load more"
  // appends the next page rather than replacing it.
  const [recRecipePage, setRecRecipePage]         = useState(1);
  const [recRecipeItems, setRecRecipeItems]       = useState<RecipeOption[]>([]);
  const [recRecipeLastPage, setRecRecipeLastPage] = useState(1);

  const { data: recRecipeData, isFetching: recRecipeFetching } = useQuery({
    queryKey: ['recommended-recipes', recRecipePage],
    queryFn: () => fetchRecommendedRecipes(recRecipePage),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!recRecipeData) return;
    if (recRecipePage === 1) {
      setRecRecipeItems(recRecipeData.data);
    } else {
      setRecRecipeItems((prev) => {
        const ids = new Set(prev.map((r) => r.id));
        return [...prev, ...recRecipeData.data.filter((r) => !ids.has(r.id))];
      });
    }
    setRecRecipeLastPage(recRecipeData.last_page);
  }, [recRecipeData]);

  // ── Recommended Stores Near You — boosted stores within 5km of the user's
  // saved profile location (see TindahanController::recommended). Same grid
  // + Load More pattern as recipes above. Hidden entirely if the user has
  // never set a location, same as the weather feature's requirement.
  const [recStorePage, setRecStorePage]         = useState(1);
  const [recStoreItems, setRecStoreItems]       = useState<RecommendedStore[]>([]);
  const [recStoreLastPage, setRecStoreLastPage] = useState(1);

  const { data: recStoreData, isFetching: recStoreFetching } = useQuery({
    queryKey: ['recommended-stores', recStorePage, user?.latitude, user?.longitude],
    queryFn: () => fetchRecommendedStores(recStorePage, user?.latitude, user?.longitude),
    enabled: user?.latitude != null && user?.longitude != null,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!recStoreData) return;
    if (recStorePage === 1) {
      setRecStoreItems(recStoreData.data);
    } else {
      setRecStoreItems((prev) => {
        const ids = new Set(prev.map((s) => s.id));
        return [...prev, ...recStoreData.data.filter((s) => !ids.has(s.id))];
      });
    }
    setRecStoreLastPage(recStoreData.last_page);
  }, [recStoreData]);

  // Remove a mistakenly-added meal from a past day's plan (same endpoint the
  // Meal Plan tab's own remove button uses -- date-agnostic on the backend).
  const { mutate: removeMealItem } = useMutation({
    mutationFn: (itemId: number) => client.delete(`/meal-plan/items/${itemId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meal-plan-date', selectedDate] });
      qc.invalidateQueries({ queryKey: ['meal-plan-dates'] });
    },
    onError: () => Alert.alert('Error', lang === 'en' ? 'Could not remove that meal. Try again.' : 'Hindi natanggal ang pagkain. Subukan ulit.'),
  });

  const confirmRemoveMealItem = (itemId: number, dishName: string) => {
    Alert.alert(
      lang === 'en' ? 'Remove this meal?' : 'Tanggalin ang pagkaing ito?',
      lang === 'en' ? `"${dishName}" will be removed from this day's plan.` : `Aalisin ang "${dishName}" sa plano ng araw na ito.`,
      [
        { text: lang === 'en' ? 'Cancel' : 'Kanselahin', style: 'cancel' },
        { text: lang === 'en' ? 'Remove' : 'Tanggalin', style: 'destructive', onPress: () => removeMealItem(itemId) },
      ],
    );
  };

  // Set a budget for a single past day -- opens app/budget-setup-for-date.tsx,
  // a dedicated screen (household size + custom expenses, same as "today"'s
  // budget-setup), never the multi-day /budget-setup wizard, which always
  // anchors to today and would deactivate the user's real current budget
  // period if pointed at a past date.

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? t('good_morning') :
    greetingHour < 18 ? t('good_afternoon') :
    t('good_evening');

  const WEEK_DAYS = lang === 'en' ? EN_WEEK : FIL_WEEK;

  const budgetPct = budget
    ? Math.min(100, Math.round((budget.spent / (budget.budget || 1)) * 100))
    : 0;
  const budgetStatus =
    !budget || budget.remaining > 0
      ? null
      : { label: lang === 'en' ? 'Over!' : 'Sobra!', color: 'bg-red-50 text-red-700' };

  const totalDays       = budget?.period?.total_days ?? 30;
  const endDate         = budget?.period?.end_date ?? '';
  const hasLoggedToday  = budget?.has_logged_today ?? false;
  const hasBudget       = !!budget;

  const dailyTasks = [
    {
      label:  t('task_set_budget'),
      done:   hasBudget,
      xp:     10,
      action: () => router.push('/budget-setup' as any),
    },
    {
      label:  lang === 'en' ? '💰 Log today\'s spending' : '💰 I-log ang gastos ngayon',
      done:   hasLoggedToday,
      xp:     10,
      action: () => router.push('/log-spending' as any),
    },
    {
      label:  t('task_report_price'),
      done:   false,
      xp:     15,
      action: () => router.push('/(tabs)/presyo' as any),
    },
  ];

  // Group history meal plan items by meal type
  const histMealGroups = useMemo(() => {
    if (!historyMealPlan?.items) return {} as Record<string, MealItem[]>;
    const groups: Record<string, MealItem[]> = {};
    for (const item of historyMealPlan.items) {
      if (!groups[item.meal_type]) groups[item.meal_type] = [];
      groups[item.meal_type].push(item);
    }
    return groups;
  }, [historyMealPlan]);

  const selectedDayLabel = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    return d.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' });
  }, [selectedDate]);

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: '#FFF8E8' }}
      contentContainerClassName="pb-24"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#386641" colors={['#386641']} />
      }
    >
      {/* Cream header — logo, icons, greeting, search (app-redesign mockup) */}
      <View className="px-4 pb-3" style={{ paddingTop: insets.top + 10 }}>
        <View className="flex-row justify-between items-center mb-3">
          <BrandLogo size={24} />
          <HeaderIconRow tone="cream" />
        </View>

        <View className="flex-row items-center gap-2 mb-0.5">
          <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A' }}>
            {greeting}, {firstName}!
          </Text>
          {user?.plan === 'premium' && (
            <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: '#FDEFC9' }}>
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#C4881C' }}>Premium</Text>
            </View>
          )}
        </View>
        <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 20, color: '#000000', marginBottom: 12 }}>
          {lang === 'en' ? 'What will you cook today?' : 'Anong lulutuin mo ngayon?'}
        </Text>

        <Pressable
          onPress={() => router.push('/search' as any)}
          className="flex-row items-center gap-2 rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3 active:opacity-70"
        >
          <Ionicons name="search" size={16} color="#B0A18C" />
          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#6F655A' }}>
            {lang === 'en' ? 'Search recipes, ingredients, users…' : 'Maghanap ng recipes, sangkap, users…'}
          </Text>
        </Pressable>
      </View>

      {/* Date strip — all 7 days share the screen width evenly, no scrolling */}
      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingBottom: 6 }}>
        {dateStrip.map(({ date, iso }) => {
          const selected  = iso === selectedDate;
          const today     = iso === todayIso;
          const hasPlan   = planDates.includes(iso);
          return (
            <Pressable
              key={iso}
              onPress={() => setSelectedDate(iso)}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 8,
                borderRadius: 14,
                backgroundColor: selected ? '#6E7B4A' : '#FFFCF5',
                borderWidth: selected ? 0 : 1,
                borderColor: '#F0DEBB',
              }}
            >
              <Text style={{
                fontFamily: 'NunitoSans_700Bold',
                fontSize: 13,
                color: selected ? 'rgba(255,255,255,0.85)' : '#B0A18C',
                marginBottom: 2,
              }}>
                {(lang === 'en' ? EN_DAY : FIL_DAY)[date.getDay()]}
              </Text>
              <Text style={{
                fontFamily: 'Baloo2_700Bold',
                fontSize: 16,
                color: selected ? '#FFFFFF' : '#000000',
                lineHeight: 18,
              }}>
                {date.getDate()}
              </Text>
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  marginTop: 4,
                  backgroundColor: selected
                    ? '#FFF8E8'
                    : today
                      ? '#E3A32A'
                      : hasPlan
                        ? '#4E7A47'
                        : '#E24B4A',
                }}
              />
            </Pressable>
          );
        })}
      </View>

      <View className="px-4 pt-1">

      {/* ── Budget Meal Plan hero — food photo under a dark-olive→terracotta wash ── */}
      <Pressable
        onPress={() => router.push('/(tabs)/meal-plan' as any)}
        className="mb-3 active:opacity-90"
      >
        <ThemedSection
          sectionKey="dashboard_meal_plan"
          compiledImage={require('@/assets/profile-header-food.jpg')}
          compiledOverlayColors={['rgba(44,52,30,0.88)', 'rgba(199,80,39,0.82)', 'rgba(231,101,59,0.78)']}
          borderRadius={18}
        >
          <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 18, color: '#fff', textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
                Budget Meal Plan
              </Text>
              <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13.5, color: 'rgba(255,255,255,0.95)', marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
                {lang === 'en' ? 'Good meals for less' : 'Masarap na pagkain, mas mura'}
              </Text>
              <View className="self-start rounded-full px-3.5 py-2" style={{ backgroundColor: '#40482B' }}>
                <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#fff' }}>
                  {lang === 'en' ? 'View Meal Plans' : 'Tingnan ang Meal Plans'}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 46, marginLeft: 8 }}>🍲</Text>
          </View>
        </ThemedSection>
      </Pressable>

      {/* ── Quick nav — photo tiles with color washes, white icons, bold labels ── */}
      <View className="flex-row gap-2.5 mb-4">
        {([
          { icon: 'restaurant-outline' as const, label: lang === 'en' ? 'My Recipes' : 'Aking Recipes', route: '/(tabs)/meal-plan?tab=recipes&filter=mine', img: require('@/assets/tiles/tile-1.jpg'), wash: 'rgba(196,94,58,0.78)', sectionKey: 'dashboard_my_recipes' },
          { icon: 'bar-chart-outline' as const, label: lang === 'en' ? 'Spending History' : 'Gastos History', route: '/spending-history', img: require('@/assets/tiles/tile-2.jpg'), wash: 'rgba(227,163,42,0.72)', sectionKey: 'dashboard_spending_history' },
          { icon: 'trophy-outline' as const, label: lang === 'en' ? 'My Awards & Achievements' : 'Mga Award ko', route: '/(tabs)/awards', img: require('@/assets/tiles/tile-3.jpg'), wash: 'rgba(56,102,65,0.78)', sectionKey: 'dashboard_awards' },
          // Recipe Book stays reachable via Profile > Saved Recipes and the
          // meal-plan tab's Bookmark tab; this home tile now opens the new
          // shopping lists. The theme sectionKey is intentionally unchanged so
          // admin-uploaded backgrounds and saved presets keep applying to this
          // tile position.
          { icon: 'cart-outline' as const, label: lang === 'en' ? 'My Shopping List' : 'Aking Shopping List', route: '/shopping-list', img: require('@/assets/tiles/tile-4.jpg'), wash: 'rgba(60,58,47,0.78)', sectionKey: 'dashboard_recipe_book' },
        ]).map((item) => (
          <Pressable
            key={item.label}
            onPress={() => router.push(item.route as any)}
            className="flex-1 active:opacity-80"
          >
            <ThemedSection
              sectionKey={item.sectionKey}
              compiledImage={item.img}
              compiledOverlayColors={[item.wash]}
              borderRadius={16}
              style={{ aspectRatio: 1, marginBottom: 6 }}
            >
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons
                  name={item.icon}
                  size={26}
                  color="#fff"
                  style={{ textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}
                />
              </View>
            </ThemedSection>
            <Text
              style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#000000', textAlign: 'center' }}
              numberOfLines={2}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {false && <>
      <View className="flex-row justify-between items-center mb-4">
        <View>
          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>{greeting}</Text>
          <View className="flex-row items-center gap-2">
            <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 18, color: '#000000' }}>{firstName}</Text>
            {user?.plan === 'premium' && (
              <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#386641' }}>⭐ Premium</Text>
            )}
          </View>
        </View>
        <View className="flex-row gap-2 items-center">
          <Pressable
            onPress={() => router.push('/search' as any)}
            className="w-9 h-9 rounded-full bg-cream-200 items-center justify-center active:opacity-70"
          >
            <Text style={{ fontSize: 15 }}>🔍</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/notifications' as any)}
            className="w-9 h-9 rounded-full bg-cream-200 items-center justify-center active:opacity-70"
          >
            <Text style={{ fontSize: 16 }}>🔔</Text>
            {unreadCount > 0 && (
              <View className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 items-center justify-center">
                <Text className="text-white text-[12px] font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => router.push('/(tabs)/profile' as any)}
            className="w-9 h-9 rounded-full bg-brand-50 items-center justify-center active:opacity-70"
          >
            <Text className="text-xs font-semibold text-ink">
              {(user?.name ?? 'U').split(' ').map((w) => w[0]).slice(0, 2).join('')}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── Date strip ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, paddingBottom: 2 }}
        style={{ marginBottom: 12 }}
      >
        {dateStrip.map(({ date, iso }) => {
          const selected  = iso === selectedDate;
          const today     = iso === todayIso;
          const hasPlan   = planDates.includes(iso);
          return (
            <Pressable
              key={iso}
              onPress={() => setSelectedDate(iso)}
              style={{
                alignItems: 'center',
                paddingVertical: 8,
                paddingHorizontal: 10,
                borderRadius: 14,
                minWidth: 44,
                backgroundColor: today ? '#FEF9EC' : selected ? '#386641' : '#fff',
                borderWidth: today ? 2 : selected ? 0 : 1,
                borderColor: today ? '#F4B942' : '#F0DEBB',
              }}
            >
              <Text style={{
                fontFamily: 'NunitoSans_400Regular',
                fontSize: 13,
                color: today ? '#9A6A12' : selected ? 'rgba(255,255,255,0.7)' : '#B0A18C',
                marginBottom: 2,
              }}>
                {(lang === 'en' ? EN_DAY : FIL_DAY)[date.getDay()]}
              </Text>
              <Text style={{
                fontFamily: 'Baloo2_700Bold',
                fontSize: 15,
                color: today ? '#9A6A12' : selected ? '#fff' : '#000000',
                lineHeight: 18,
              }}>
                {date.getDate()}
              </Text>
              {/* Status dot — always visible on every date */}
              <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 4,
                backgroundColor: today
                  ? '#F4B942'                          // orange = today (always, even when selected)
                  : selected
                    ? 'rgba(255,255,255,0.85)'         // white on green bg
                    : hasPlan
                      ? '#4E7A47'                      // green = has meal plan
                      : '#E24B4A',                     // red = no meal plan
              }} />
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Past-date history view ── */}
      </>}

      {!isToday ? (
        <>
          <View className="flex-row items-center gap-2 mb-3">
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
              📅 {selectedDayLabel}
            </Text>
          </View>

          {/* Budget history card */}
          {histBudgetLoading ? (
            <SkeletonBudgetCard />
          ) : historyBudget?.has_budget ? (
            <View
              className="rounded-2xl bg-white border border-cream-200 p-4 mb-3"
              style={{ borderLeftWidth: 3, borderLeftColor: '#4E7A47' }}
            >
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginBottom: 6 }}>
                {t('history_budget')}
              </Text>
              <View className="flex-row justify-between items-end mb-3">
                <View>
                  <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 26, color: '#386641', lineHeight: 30 }}>
                    ₱{Number(historyBudget.spent ?? 0).toLocaleString()}
                  </Text>
                  <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
                    {t('history_spent')}
                  </Text>
                </View>
                <View className="items-end gap-1">
                  <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#000000' }}>
                    Budget: ₱{Number(historyBudget.budget ?? 0).toLocaleString()}
                  </Text>
                  {historyBudget.has_logged ? (
                    <View className="rounded-full bg-leaf-50 px-2.5 py-0.5">
                      <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#386641' }}>{t('logged')}</Text>
                    </View>
                  ) : (
                    <View className="rounded-full bg-cream-200 px-2.5 py-0.5">
                      <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>{t('not_logged')}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Progress bar */}
              <View className="bg-cream-200 rounded-full h-1.5 mb-2">
                <View
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round((Number(historyBudget.spent ?? 0) / (Number(historyBudget.budget ?? 0) || 1)) * 100))}%`,
                    backgroundColor: Number(historyBudget.spent ?? 0) > Number(historyBudget.budget ?? 0) ? '#E24B4A' : '#4E7A47',
                  }}
                />
              </View>

              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
                {Number(historyBudget.spent ?? 0) > Number(historyBudget.budget ?? 0)
                  ? `${t('overspent')} ₱${(Number(historyBudget.spent ?? 0) - Number(historyBudget.budget ?? 0)).toLocaleString()}`
                  : `${t('saved')} ₱${(Number(historyBudget.budget ?? 0) - Number(historyBudget.spent ?? 0)).toLocaleString()}`}
              </Text>

              {historyBudget.notes ? (
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginTop: 6, fontStyle: 'italic' }}>
                  "{historyBudget.notes}"
                </Text>
              ) : null}

              {!historyBudget.has_logged && (
                <Pressable
                  onPress={() => router.push(`/log-spending?date=${selectedDate}` as any)}
                  className="mt-3 rounded-xl border border-cream-300 bg-brand-50 py-2.5 items-center active:opacity-75"
                >
                  <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#C45E3A' }}>
                    {lang === 'en' ? "✓ Log this day's spending" : '✓ I-log ang gastos ng araw na ito'}
                  </Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View className="bg-white rounded-2xl border border-cream-200 p-4 mb-3 items-center">
              <Text className="text-2xl mb-1">💸</Text>
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginBottom: 10 }}>
                {t('history_no_budget')}
              </Text>
              <Pressable
                onPress={() => router.push(`/budget-setup-for-date?date=${selectedDate}` as any)}
                className="rounded-xl border border-cream-300 bg-brand-50 py-2 px-5 active:opacity-75"
              >
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#C45E3A' }}>
                  {lang === 'en' ? 'Set Budget for This Day' : 'Mag-set ng Budget sa Araw na Ito'}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Meal plan history card */}
          {histMealLoading ? (
            <View className="bg-white rounded-2xl border border-cream-200 overflow-hidden mb-3">
              {[0,1,2].map(i => <SkeletonMealCard key={i} />)}
            </View>
          ) : historyMealPlan ? (
            <View className="bg-white rounded-2xl border border-cream-200 p-4 mb-3">
              <View className="flex-row justify-between items-center mb-3">
                <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 14, color: '#000000' }}>
                  {t('tab_meal_plan')}
                </Text>
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
                  ₱{Number(historyMealPlan.total_estimated_cost).toLocaleString()}
                </Text>
              </View>
              {Object.entries(histMealGroups).map(([mealType, items]) => (
                <View key={mealType} className="mb-3 last:mb-0">
                  <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A', marginBottom: 4 }}>
                    {mealTypeLabel(mealType, lang)}
                  </Text>
                  {items.map((item) => (
                    <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#FFFCF5' }}>
                      {item.recipe_id ? (
                        <Pressable
                          onPress={() => router.push(`/recipe/${item.recipe_id}` as any)}
                          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                          className="active:opacity-60"
                        >
                          <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: '#386641', flex: 1 }}>
                            {item.dish_name}
                          </Text>
                          <Text style={{ fontSize: 13, color: '#B9D0AE' }}>›</Text>
                        </Pressable>
                      ) : (
                        <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#000000', flex: 1 }}>
                          {item.dish_name}
                        </Text>
                      )}
                      <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#4E7A47', marginLeft: 8 }}>
                        ₱{Number(item.estimated_cost).toFixed(0)}
                      </Text>
                      <Pressable
                        onPress={() => confirmRemoveMealItem(item.id, item.dish_name)}
                        hitSlop={8}
                        style={{ marginLeft: 10 }}
                        className="active:opacity-50"
                      >
                        <Ionicons name="trash-outline" size={15} color="#E24B4A" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ))}
              {historyBudget?.has_budget ? (
                <Pressable
                  onPress={() => setPickerOpen(true)}
                  className="mt-2 rounded-xl border border-cream-300 bg-brand-50 py-2.5 items-center active:opacity-75"
                >
                  <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#C45E3A' }}>
                    {t('set_recipe_as_meal')}
                  </Text>
                </Pressable>
              ) : (
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginTop: 8, textAlign: 'center' }}>
                  {lang === 'en' ? 'Set a budget for this day first to add more meals.' : 'Mag-set muna ng budget para makapagdagdag pa ng pagkain.'}
                </Text>
              )}
            </View>
          ) : (
            <View className="bg-white rounded-2xl border border-cream-200 p-4 mb-3 items-center">
              <Text className="text-2xl mb-1">🍽️</Text>
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
                {t('history_no_meal')}
              </Text>
              {historyBudget?.has_budget ? (
                <Pressable
                  onPress={() => setPickerOpen(true)}
                  className="mt-3 rounded-xl border border-cream-300 bg-brand-50 py-2 px-5 active:opacity-75"
                >
                  <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#C45E3A' }}>
                    {t('set_recipe_as_meal')}
                  </Text>
                </Pressable>
              ) : (
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginTop: 6, textAlign: 'center' }}>
                  {lang === 'en' ? 'No budget set for this day yet — set one first to plan a meal here.' : 'Wala pang budget sa araw na ito — mag-set muna para makapagplano ng pagkain.'}
                </Text>
              )}
            </View>
          )}
        </>
      ) : (
        /* ── Today view ── */
        <>
          {/* Budget card */}
          <Pressable
            onPress={() => budget ? router.push('/spending-history' as any) : router.push('/budget-setup' as any)}
            className="rounded-2xl bg-white border border-cream-200 p-4 mb-3 active:opacity-95"
            style={{ borderLeftWidth: 3, borderLeftColor: '#4E7A47' }}
          >
            {budgetLoading ? (
              <>
                <Skeleton style={{ height: 10, width: 100, marginBottom: 8 }} />
                <Skeleton style={{ height: 34, width: 140, marginBottom: 4 }} />
                <Skeleton style={{ height: 10, width: 70, marginBottom: 16 }} />
                <Skeleton style={{ height: 6, borderRadius: 3, marginBottom: 10 }} />
                <Skeleton style={{ height: 10, width: 120 }} />
              </>
            ) : budget ? (
              <>
                <View className="flex-row justify-between items-start mb-2">
                  <View>
                    <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginBottom: 2 }}>{t('food_budget_today')}</Text>
                    <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 28, color: '#386641', lineHeight: 34 }}>
                      ₱{Number(budget.remaining ?? 0).toLocaleString()}
                    </Text>
                    <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>{t('remaining')}</Text>
                    {endDate ? (
                      <Text className="text-xs text-ink-soft mt-0.5">
                        {periodLabel(totalDays, endDate, lang)}
                      </Text>
                    ) : null}
                  </View>
                  <View className="items-end gap-1.5">
                    {budgetStatus && (
                      <View className={`rounded-full px-2.5 py-0.5 ${budgetStatus.color}`}>
                        <Text className="text-xs font-semibold">{budgetStatus.label}</Text>
                      </View>
                    )}
                    <Pressable
                      onPress={() => router.push('/budget-setup' as any)}
                      className="flex-row items-center gap-1 active:opacity-60"
                    >
                      <Ionicons name="create-outline" size={13} color="#B0A18C" />
                      <Text className="text-xs text-ink-soft">{lang === 'en' ? 'Edit Budget' : 'I-edit ang Budget'}</Text>
                    </Pressable>
                  </View>
                </View>

                <View className="bg-cream-200 rounded-full h-1.5 mb-2">
                  <View className="h-1.5 rounded-full bg-leaf-400" style={{ width: `${budgetPct}%` }} />
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-ink-soft" style={{ flexShrink: 1, marginRight: 8 }} numberOfLines={1}>
                    ₱{Number(budget.spent ?? 0).toLocaleString()} {lang === 'en' ? 'spent' : 'nagastos'}
                    {hasLoggedToday ? (lang === 'en' ? ' · logged ✓' : ' · na-log ✓') : ''}
                  </Text>
                  <Pressable
                    onPress={() => router.push('/log-spending' as any)}
                    className="flex-row items-center gap-1 bg-brand-50 rounded-full px-3 py-1 active:opacity-70"
                    style={{ flexShrink: 0 }}
                  >
                    <Ionicons name={hasLoggedToday ? 'create-outline' : 'add-circle-outline'} size={13} color="#C45E3A" />
                    <Text className="text-xs font-semibold text-brand-600">
                      {hasLoggedToday
                        ? (lang === 'en' ? 'Update' : 'I-update')
                        : (lang === 'en' ? "Log today's spending" : 'I-log ang gastos ngayon')}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <View>
                {/* (!) — opens the "what is a budget?" explainer anytime */}
                <Pressable
                  onPress={() => setExplainerOpen(true)}
                  hitSlop={10}
                  style={{ position: 'absolute', top: -4, right: -4, zIndex: 2 }}
                  className="active:opacity-60"
                >
                  <Ionicons name="information-circle" size={24} color="#E3A32A" />
                </Pressable>
                <Pressable onPress={() => router.push('/budget-setup' as any)} className="items-center py-2">
                  <Text className="text-xs text-ink-soft mb-1">{t('no_budget')}</Text>
                  <Text className="text-xs font-semibold text-brand-600">{t('setup_budget_cta')}</Text>
                </Pressable>
              </View>
            )}
          </Pressable>

          {/* Stats row */}
          {budgetLoading ? (
            <View style={{ marginBottom: 12 }}><SkeletonStatsRow /></View>
          ) : (
            <View className="flex-row gap-3 mb-3">
              <View className="flex-1 bg-white rounded-xl p-3 border border-cream-200">
                <Text className="text-xs text-ink-soft mb-1">Streak</Text>
                <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 18, color: '#F4B942' }}>🔥 {streak}d</Text>
              </View>
              <View className="flex-1 bg-white rounded-xl p-3 border border-cream-200">
                <Text className="text-xs text-ink-soft mb-1">{savingsLabel(totalDays, lang)}</Text>
                <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#386641' }}>
                  ₱{budget?.monthly_savings?.toLocaleString() ?? '-'}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push('/(tabs)/awards' as any)}
                className="flex-1 bg-white rounded-xl p-3 border border-cream-200 active:opacity-70"
              >
                <Text className="text-xs text-ink-soft mb-1">Level</Text>
                <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#386641' }}>Lv.{user?.level ?? 1}</Text>
              </Pressable>
            </View>
          )}

          {/* Weekly streak */}
          <Text className="text-xs font-medium text-ink-soft uppercase tracking-wider mb-2">
            {t('streak_this_week')}
          </Text>
          {budgetLoading ? (
            <View style={{ marginBottom: 12 }}><SkeletonStreakCard /></View>
          ) : (
          <View className="bg-white rounded-2xl border border-cream-200 p-3 mb-3">
            <View className="flex-row gap-1.5">
              {WEEK_DAYS.map((day, i) => {
                const done    = i < streak && i <= todayIdx;
                const isT = i === todayIdx;
                return (
                  <View
                    key={i}
                    className="flex-1 rounded-md items-center justify-center py-1.5"
                    style={{
                      backgroundColor: done ? '#6E7B4A' : isT ? '#FDEFC9' : '#F9EDD3',
                      borderWidth:  isT ? 1.5 : 0,
                      borderColor:  isT ? '#F4B942' : 'transparent',
                    }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: done ? '#fff' : isT ? '#9A6A12' : '#B0A18C' }}
                    >
                      {day}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
          )}

          {/* Daily tasks */}
          <Text className="text-xs font-medium text-ink-soft uppercase tracking-wider mb-2">
            {t('daily_tasks')}
          </Text>
          <View className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
            {dailyTasks.map((task, i) => (
              <DailyTaskRow
                key={task.label}
                label={task.label}
                done={task.done}
                xp={task.xp}
                onPress={task.action}
                isLast={i === dailyTasks.length - 1}
              />
            ))}
          </View>
        </>
      )}

      {/* ── Recommended for You — boosted recipes, 2x2 grid + Load More ── */}
      {recRecipeItems.length > 0 && (
        <>
          <View className="flex-row justify-between items-center mt-5 mb-2">
            <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#000000' }}>
              {lang === 'en' ? 'Recommended for You' : 'Inirekomenda Para Sa\'yo'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {recRecipeItems.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => router.push(`/recipe/${r.id}` as any)}
                className="active:opacity-80 rounded-2xl overflow-hidden border border-cream-200 bg-white"
                style={{ width: '48%', marginBottom: 10 }}
              >
                <RecipeCoverPhoto
                  photos={getRecipePhotos(r)}
                  collageStyle={(r.collage_style ?? 'gradient') as any}
                  gradientKey={(r.gradient_key ?? 'grad_a') as any}
                  fontKey={(r.font_key ?? 'baloo') as any}
                  title={r.title}
                  height={140}
                />
                <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                  <Text
                    style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#000000' }}
                    numberOfLines={1}
                  >
                    {r.title}
                  </Text>
                  <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#C4881C' }}>
                    {r.estimated_cost != null ? `₱${Number(r.estimated_cost).toLocaleString()}` : '-'}
                    {r.servings ? ` / ${r.servings} servings` : ''}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
          {recRecipePage < recRecipeLastPage && (
            <Pressable
              onPress={() => setRecRecipePage((p) => p + 1)}
              disabled={recRecipeFetching}
              className="mt-3 rounded-xl border border-cream-300 py-2.5 items-center active:opacity-70"
            >
              <Text className="text-xs font-medium text-ink-soft">
                {recRecipeFetching ? '…' : (lang === 'en' ? 'Load more' : 'Marami pa')}
              </Text>
            </Pressable>
          )}
        </>
      )}

      {/* ── Popular This Week — organic (no boost priority), same 2-column grid style as Recommended for You ── */}
      {popularRecipes.length > 0 && (
        <>
          <View className="flex-row justify-between items-center mt-5 mb-2">
            <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#000000' }}>
              {lang === 'en' ? 'Popular This Week' : 'Sikat Ngayong Linggo'}
            </Text>
            <Pressable onPress={() => router.push('/(tabs)/meal-plan?tab=recipes&filter=all' as any)} hitSlop={8}>
              <Text className="text-xs font-semibold text-brand-600">
                {lang === 'en' ? 'See all' : 'Lahat'}
              </Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {popularRecipes.slice(0, popularVisibleCount).map((r) => (
              <Pressable
                key={r.id}
                onPress={() => router.push(`/recipe/${r.id}` as any)}
                className="active:opacity-80 rounded-2xl overflow-hidden border border-cream-200 bg-white"
                style={{ width: '48%', marginBottom: 10 }}
              >
                <RecipeCoverPhoto
                  photos={getRecipePhotos(r)}
                  collageStyle={(r.collage_style ?? 'gradient') as any}
                  gradientKey={(r.gradient_key ?? 'grad_a') as any}
                  fontKey={(r.font_key ?? 'baloo') as any}
                  title={r.title}
                  height={140}
                />
                <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                  <Text
                    style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#000000' }}
                    numberOfLines={1}
                  >
                    {r.title}
                  </Text>
                  <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#C4881C' }}>
                    {r.estimated_cost != null ? `₱${Number(r.estimated_cost).toLocaleString()}` : '-'}
                    {r.servings ? ` / ${r.servings} servings` : ''}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
          {popularVisibleCount < popularRecipes.length && (
            <Pressable
              onPress={() => setPopularVisibleCount((c) => c + 4)}
              className="mt-3 rounded-xl border border-cream-300 py-2.5 items-center active:opacity-70"
            >
              <Text className="text-xs font-medium text-ink-soft">
                {lang === 'en' ? 'Load more' : 'Marami pa'}
              </Text>
            </Pressable>
          )}
        </>
      )}

      {/* ── Recommended Stores Near You — boosted stores within 5km, 2x2 grid + Load More ── */}
      {recStoreItems.length > 0 && (
        <>
          <View className="flex-row justify-between items-center mt-5 mb-2">
            <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#000000' }}>
              {lang === 'en' ? 'Recommended Stores Near You' : 'Mga Tindahang Malapit Sa\'yo'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {recStoreItems.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => router.push(`/stall/${s.id}` as any)}
                className="bg-white rounded-2xl border border-cream-200 active:opacity-75"
                style={{ width: '48%', marginBottom: 10, padding: 12 }}
              >
                {s.photo ? (
                  <Image source={{ uri: `${API_URL}${s.photo}` }} style={{ width: 34, height: 34, borderRadius: 17, marginBottom: 6, backgroundColor: '#F9EDD3' }} />
                ) : (
                  <Text style={{ fontSize: 22, marginBottom: 6 }}>🛒</Text>
                )}
                <Text
                  style={{ fontFamily: 'Baloo2_700Bold', fontSize: 13, color: '#000000', marginBottom: 2 }}
                  numberOfLines={2}
                >
                  {s.name}{s.is_verified ? ' ✅' : ''}
                </Text>
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }} numberOfLines={1}>
                  {s.distance_km != null
                    ? (s.distance_km < 1 ? `${Math.round(s.distance_km * 1000)} m away` : `${s.distance_km.toFixed(1)} km away`)
                    : [s.barangay, s.municipality].filter(Boolean).join(', ')}
                </Text>
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#4E7A47', marginTop: 4 }}>
                  {s.item_count} {lang === 'en' ? 'items' : 'items'}
                </Text>
              </Pressable>
            ))}
          </View>
          {recStorePage < recStoreLastPage && (
            <Pressable
              onPress={() => setRecStorePage((p) => p + 1)}
              disabled={recStoreFetching}
              className="mt-3 rounded-xl border border-cream-300 py-2.5 items-center active:opacity-70"
            >
              <Text className="text-xs font-medium text-ink-soft">
                {recStoreFetching ? '…' : (lang === 'en' ? 'Load more' : 'Marami pa')}
              </Text>
            </Pressable>
          )}
        </>
      )}

      <RecipePickerModal
        visible={pickerOpen}
        date={selectedDate}
        onClose={() => setPickerOpen(false)}
      />

      {/* Budget explainer — opened by the (!) badge on the empty budget card */}
      <BudgetExplainerSheet
        visible={explainerOpen}
        onClose={() => setExplainerOpen(false)}
        onProceed={proceedFromExplainer}
      />

      </View>
    </ScrollView>
  );
}
