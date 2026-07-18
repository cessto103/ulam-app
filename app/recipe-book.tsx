import client from '@/src/api/client';
import RecipeCoverPhoto from '@/src/components/recipe/RecipeCoverPhoto';
import { SkeletonRecipeCard } from '@/src/components/Skeleton';
import { useLanguage } from '@/src/context/LanguageContext';
import { type CollageStyle, type FontKey, type GradientKey } from '@/src/types/recipe';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

type Recipe = {
  id: number;
  title: string;
  description: string;
  budget_tag: string;
  estimated_cost: number;
  servings: number;
  prep_time_minutes: number;
  cook_time_minutes: number;
  difficulty: string | null;
  tags: string[];
  collage_style: CollageStyle;
  gradient_key: GradientKey;
  font_key: FontKey;
  image_urls: string[] | null;
  save_count: number;
  source: string;
  is_mine: boolean;
  user?: { id: number; name: string; username: string | null } | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const BUDGET_LABEL: Record<string, string> = {
  budget_100: '₱100', budget_200: '₱200', budget_400: '₱400',
  budget_600: '₱600', budget_800: '₱800', budget_1000: '₱1,000',
  budget_1000plus: '₱1,000+',
};

const DIFF_COLOR: Record<string, { bg: string; text: string }> = {
  easy:   { bg: '#EFF4EC', text: '#2C5234' },
  medium: { bg: '#FDEFC9', text: '#9A6A12' },
  hard:   { bg: '#FCEBEB', text: '#E24B4A' },
};

const MEAL_TYPES = [
  { key: 'almusal',    labelEn: 'Breakfast', labelTl: 'Almusal',    emoji: '🌅' },
  { key: 'tanghalian', labelEn: 'Lunch',     labelTl: 'Tanghalian', emoji: '☀️' },
  { key: 'meryenda',   labelEn: 'Snack',     labelTl: 'Meryenda',   emoji: '🍌' },
  { key: 'hapunan',    labelEn: 'Dinner',    labelTl: 'Hapunan',    emoji: '🌙' },
  { key: 'iba pa',     labelEn: 'Others',    labelTl: 'Iba Pa',     emoji: '🍽️' },
];

const BUDGET_FILTERS = ['budget_100','budget_200','budget_400','budget_600','budget_800','budget_1000','budget_1000plus'];
const DIFF_FILTERS   = ['easy','medium','hard'];
const HEADER_GRADIENT = ['#CC5027', '#E7653B', '#EC8156'] as const;

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchBook(): Promise<Recipe[]> {
  const { data } = await client.get('/recipe-book');
  const items: any[] = data.data ?? data ?? [];
  return items.map((item) => item.recipe ?? item).filter(Boolean);
}

async function addToMealPlan(payload: { date: string; meal_type: string; recipe_id: number; estimated_cost?: number }) {
  const { data } = await client.post('/meal-plan/add-item', payload);
  return data;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RecipeCard({
  recipe,
  onPress,
  onUnsave,
  onAddMeal,
  lang,
}: {
  recipe: Recipe;
  onPress: () => void;
  onUnsave: () => void;
  onAddMeal: () => void;
  lang: 'en' | 'tl';
}) {
  const router   = useRouter();
  const photos   = recipe.image_urls ?? [];
  const totalMin = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);
  const diff     = recipe.difficulty ? DIFF_COLOR[recipe.difficulty] : null;

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 0.5,
        borderColor: '#F0DEBB',
        overflow: 'hidden',
        marginBottom: 12,
        marginHorizontal: 16,
      }}
      className="active:opacity-80"
    >
      {/* Cover photo */}
      <RecipeCoverPhoto
        photos={photos}
        collageStyle={recipe.collage_style ?? 'gradient'}
        gradientKey={recipe.gradient_key ?? 'grad_a'}
        fontKey={recipe.font_key ?? 'baloo'}
        title={recipe.title}
      />

      {/* Card body */}
      <View style={{ padding: 14 }}>
        {/* Top row: chips + actions */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 }}>
            <View style={{ backgroundColor: '#FDEFC9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#9A6A12' }}>
                {BUDGET_LABEL[recipe.budget_tag] ?? recipe.budget_tag}
              </Text>
            </View>
            {diff && recipe.difficulty && (
              <View style={{ backgroundColor: diff.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
                <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: diff.text, textTransform: 'capitalize' }}>
                  {recipe.difficulty}
                </Text>
              </View>
            )}
          </View>
          {/* Unsave bookmark */}
          <Pressable
            onPress={(e) => { e.stopPropagation(); onUnsave(); }}
            hitSlop={10}
            className="active:opacity-70"
          >
            <Ionicons name="bookmark" size={20} color="#F4B942" />
          </Pressable>
        </View>

        {/* Author row (community only) */}
        {!recipe.is_mine && recipe.source === 'community' && recipe.user && (
          <Pressable
            onPress={(e) => { e.stopPropagation(); router.push(`/user/${recipe.user!.id}` as any); }}
            style={{ marginBottom: 5 }}
          >
            <Text style={{ fontSize: 13, fontFamily: 'NunitoSans_400Regular', color: '#6F655A' }}>
              by <Text style={{ fontFamily: 'NunitoSans_700Bold', color: '#000000' }}>{recipe.user.name}</Text>
            </Text>
          </Pressable>
        )}

        {/* Title */}
        <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#000000', marginBottom: 3, lineHeight: 20 }} numberOfLines={2}>
          {recipe.title}
        </Text>

        {/* Description */}
        {!!recipe.description && (
          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', lineHeight: 18, marginBottom: 8 }} numberOfLines={2}>
            {recipe.description}
          </Text>
        )}

        {/* Meta chips */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#5E693F' }}>
            ₱{Number(recipe.estimated_cost).toFixed(0)}
          </Text>
          {recipe.servings > 0 && (
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
              {recipe.servings} {lang === 'en' ? 'servings' : 'serving'}
            </Text>
          )}
          {totalMin > 0 && (
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
              {totalMin} min
            </Text>
          )}
        </View>

        {/* Add to plan button */}
        <Pressable
          onPress={(e) => { e.stopPropagation(); onAddMeal(); }}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 6, backgroundColor: '#EFF4EC', borderRadius: 12, paddingVertical: 10,
          }}
          className="active:opacity-70"
        >
          <Text style={{ fontSize: 14 }}>🍳</Text>
          <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#C4881C' }}>
            {lang === 'en' ? 'Add to Meal Plan' : 'Idagdag sa Plano'}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RecipeBookScreen() {
  const router         = useRouter();
  const qc             = useQueryClient();
  const { lang }       = useLanguage();
  const insets         = useSafeAreaInsets();

  const [search,       setSearch]       = useState('');
  const [budgetFilter, setBudgetFilter] = useState<string | null>(null);
  const [diffFilter,   setDiffFilter]   = useState<string | null>(null);

  // Add-to-meal-plan modal state
  const [mealModal,    setMealModal]    = useState(false);
  const [mealRecipe,   setMealRecipe]   = useState<Recipe | null>(null);
  const [mealType,     setMealType]     = useState('almusal');

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ['recipe-book'],
    queryFn: fetchBook,
    staleTime: 60_000,
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['recipe-book'] });
    setRefreshing(false);
  };

  const { mutate: toggleSave } = useMutation({
    mutationFn: (id: number) => client.post(`/recipes/${id}/save`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipe-book'] });
      qc.invalidateQueries({ queryKey: ['recipes'] });
    },
  });

  const { mutate: assignMeal, isPending: assigning } = useMutation({
    mutationFn: addToMealPlan,
    onSuccess: () => {
      setMealModal(false);
      setMealRecipe(null);
      qc.invalidateQueries({ queryKey: ['meal-plan-date'] });
    },
    onError: (e: any) => {
      const slotLabel = MEAL_TYPES.find(m => m.key === mealType)?.[lang === 'en' ? 'labelEn' : 'labelTl'] ?? mealType;
      const backendMsg: string | undefined = e?.response?.data?.message;
      const isDuplicate = e?.response?.status === 422;
      if (isDuplicate) {
        Alert.alert(
          lang === 'en' ? 'Already in meal plan' : 'Nasa plano na',
          lang === 'en'
            ? `${mealRecipe?.title ?? 'This recipe'} is already in your ${slotLabel} meal plan.`
            : `Nasa ${slotLabel} meal plan na ang ${mealRecipe?.title ?? 'recipe na ito'}.`,
        );
      } else {
        Alert.alert('Error', backendMsg ?? (lang === 'en' ? 'Could not add to meal plan.' : 'Hindi maidagdag sa plano.'));
      }
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return recipes.filter((r) => {
      if (q && !r.title.toLowerCase().includes(q) && !(r.description ?? '').toLowerCase().includes(q)) return false;
      if (budgetFilter && r.budget_tag !== budgetFilter) return false;
      if (diffFilter && r.difficulty !== diffFilter) return false;
      return true;
    });
  }, [recipes, search, budgetFilter, diffFilter]);

  const todayIso = new Date().toISOString().slice(0, 10);

  function openMealModal(recipe: Recipe) {
    setMealRecipe(recipe);
    setMealType('almusal');
    setMealModal(true);
  }

  const hasFilters = !!budgetFilter || !!diffFilter;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFCF5' }} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={HEADER_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14,
        }}
      >
        <Pressable onPress={() => router.back()} className="active:opacity-70">
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 18, color: '#fff' }}>
            {lang === 'en' ? 'My Recipe Book' : 'Aking Recipe Book'}
          </Text>
          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
            {filtered.length} {lang === 'en' ? `of ${recipes.length} saved` : `sa ${recipes.length} na naka-save`}
          </Text>
        </View>
        <Ionicons name="bookmark" size={20} color="#F4B942" />
      </LinearGradient>

      {/* Search bar */}
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 10, paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9EDD3', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
          <Ionicons name="search" size={15} color="#B0A18C" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={lang === 'en' ? 'Search saved recipes...' : 'Hanapin ang recipe...'}
            placeholderTextColor="#B0A18C"
            style={{ flex: 1, fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#000000', padding: 0 }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="#B0A18C" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter chips — fixed height so it never shrinks */}
      <View style={{ height: 48, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F9EDD3' }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 6, alignItems: 'center' }}
      >
        {/* Clear */}
        {hasFilters && (
          <Pressable
            onPress={() => { setBudgetFilter(null); setDiffFilter(null); }}
            style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#FCEBEB' }}
          >
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#E24B4A' }}>✕ Clear</Text>
          </Pressable>
        )}

        {/* Difficulty filters */}
        {DIFF_FILTERS.map((d) => {
          const active = diffFilter === d;
          const c      = DIFF_COLOR[d];
          return (
            <Pressable
              key={d}
              onPress={() => setDiffFilter(active ? null : d)}
              style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: active ? c.bg : '#F9EDD3', borderWidth: active ? 1.5 : 0, borderColor: c.text }}
            >
              <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: active ? c.text : '#000000', textTransform: 'capitalize' }}>
                {d}
              </Text>
            </Pressable>
          );
        })}

        {/* Budget filters */}
        {BUDGET_FILTERS.map((b) => {
          const active = budgetFilter === b;
          return (
            <Pressable
              key={b}
              onPress={() => setBudgetFilter(active ? null : b)}
              style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: active ? '#6E7B4A' : '#F9EDD3' }}
            >
              <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: active ? '#fff' : '#000000' }}>
                {BUDGET_LABEL[b]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      </View>

      {/* Content */}
      {isLoading ? (
        <ScrollView contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}>
          {[0,1,2,3].map(i => <SkeletonRecipeCard key={i} />)}
        </ScrollView>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#386641" colors={['#386641']} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
              <Ionicons name="bookmark-outline" size={52} color="#D3C5AB" style={{ marginBottom: 14 }} />
              <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#000000', marginBottom: 6, textAlign: 'center' }}>
                {search || hasFilters
                  ? (lang === 'en' ? 'No matches found' : 'Walang nahanap')
                  : (lang === 'en' ? 'No saved recipes yet' : 'Wala pang naka-save')}
              </Text>
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#6F655A', textAlign: 'center', lineHeight: 20 }}>
                {search || hasFilters
                  ? (lang === 'en' ? 'Try adjusting your filters.' : 'Subukan ng ibang filter.')
                  : (lang === 'en' ? 'Tap the bookmark icon on any recipe to save it here.' : 'I-tap ang bookmark sa anumang recipe para i-save dito.')}
              </Text>
            </View>
          }
          renderItem={({ item: r }) => (
            <RecipeCard
              recipe={r}
              lang={lang}
              onPress={() => router.push(`/recipe/${r.id}` as any)}
              onUnsave={() => toggleSave(r.id)}
              onAddMeal={() => openMealModal(r)}
            />
          )}
        />
      )}

      {/* Add-to-meal-plan Modal */}
      <Modal
        visible={mealModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setMealModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#FFFCF5' }}>
          {/* Modal header */}
          <View style={{
            paddingHorizontal: 16, paddingTop: 20, paddingBottom: 14,
            backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F9EDD3',
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#000000' }}>
                {lang === 'en' ? 'Add to Today\'s Meal Plan' : 'Idagdag sa Meal Plan Ngayon'}
              </Text>
              {mealRecipe && (
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginTop: 2 }} numberOfLines={1}>
                  {mealRecipe.title}
                </Text>
              )}
            </View>
            <Pressable
              onPress={() => setMealModal(false)}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F9EDD3', alignItems: 'center', justifyContent: 'center' }}
              className="active:opacity-70"
            >
              <Ionicons name="close" size={16} color="#6F655A" />
            </Pressable>
          </View>

          {/* Cover preview */}
          {mealRecipe && (
            <View style={{ height: 160, overflow: 'hidden' }}>
              <RecipeCoverPhoto
                photos={mealRecipe.image_urls ?? []}
                collageStyle={mealRecipe.collage_style ?? 'gradient'}
                gradientKey={mealRecipe.gradient_key ?? 'grad_a'}
                fontKey={mealRecipe.font_key ?? 'baloo'}
                title={mealRecipe.title}
              />
            </View>
          )}

          <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
            <View>
              <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
                {lang === 'en' ? 'Pick meal type' : 'Pumili ng meal type'}
              </Text>
              <View style={{ gap: 8 }}>
                {MEAL_TYPES.map((mt) => {
                  const active = mt.key === mealType;
                  return (
                    <Pressable
                      key={mt.key}
                      onPress={() => setMealType(mt.key)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        padding: 14, borderRadius: 14, borderWidth: 1.5,
                        borderColor: active ? '#6E7B4A' : '#F0DEBB',
                        backgroundColor: active ? '#EFF4EC' : '#fff',
                      }}
                    >
                      <Text style={{ fontSize: 20 }}>{mt.emoji}</Text>
                      <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: active ? '#5E693F' : '#000000', flex: 1 }}>
                        {lang === 'en' ? mt.labelEn : mt.labelTl}
                      </Text>
                      {active && <Ionicons name="checkmark-circle" size={20} color="#6E7B4A" />}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Confirm */}
          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#F9EDD3', backgroundColor: '#fff' }}>
            <Pressable
              onPress={() => {
                if (!mealRecipe) return;
                assignMeal({
                  date: todayIso,
                  meal_type: mealType,
                  recipe_id: mealRecipe.id,
                  estimated_cost: mealRecipe.estimated_cost,
                });
              }}
              disabled={assigning}
              style={{ backgroundColor: '#C45E3A', borderRadius: 14, paddingVertical: 14, alignItems: 'center', opacity: assigning ? 0.7 : 1 }}
            >
              {assigning
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 15, color: '#fff' }}>
                    {lang === 'en' ? 'Add to Meal Plan' : 'Idagdag sa Meal Plan'}
                  </Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
