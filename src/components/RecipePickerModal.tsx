import client from '@/src/api/client';
import AndroidNavBarFiller from '@/src/components/AndroidNavBarFiller';
import RecipeCoverPhoto from '@/src/components/recipe/RecipeCoverPhoto';
import { SkeletonMealCard } from '@/src/components/Skeleton';
import { useLanguage } from '@/src/context/LanguageContext';
import { getRecipePhotos } from '@/src/utils/recipePhotos';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type RecipeOption = {
  id: number;
  title: string;
  description?: string | null;
  estimated_cost: number | null;
  servings: number | null;
  difficulty?: string | null;
  budget_tag?: string | null;
  tags?: string[];
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  image_url?: string | null;
  image_urls?: string[] | null;
  collage_style?: string;
  gradient_key?: string;
  font_key?: string;
  user?: { id: number; name: string; username: string | null } | null;
  source?: string;
};

export async function fetchRecipes(search: string): Promise<RecipeOption[]> {
  try {
    const { data } = await client.get('/recipes', { params: { search, per_page: 30 } });
    return (data.data ?? data.recipes ?? []) as RecipeOption[];
  } catch { return []; }
}

async function addRecipeToMealPlan(payload: {
  date: string;
  meal_type: string;
  recipe_id: number;
  estimated_cost?: number;
}) {
  const { data } = await client.post('/meal-plan/add-item', payload);
  return data;
}

const MEAL_TYPES = [
  { key: 'almusal',    labelEn: 'Breakfast', labelTl: 'Almusal',    emoji: '🌅' },
  { key: 'tanghalian', labelEn: 'Lunch',     labelTl: 'Tanghalian', emoji: '☀️' },
  { key: 'meryenda',   labelEn: 'Snack',     labelTl: 'Meryenda',   emoji: '🍌' },
  { key: 'hapunan',    labelEn: 'Dinner',    labelTl: 'Hapunan',    emoji: '🌙' },
  { key: 'iba pa',     labelEn: 'Others',    labelTl: 'Iba Pa',     emoji: '🍽️' },
];

const BUDGET_LABEL: Record<string, string> = {
  budget_100: '₱100', budget_200: '₱200', budget_400: '₱400', budget_400plus: '₱400+',
  budget_600: '₱600', budget_800: '₱800', budget_1000: '₱1,000',
  budget_1000plus: '₱1,000+',
};

const DIFF_COLOR: Record<string, { bg: string; text: string }> = {
  easy:   { bg: '#EFF4EC', text: '#2C5234' },
  medium: { bg: '#FDEFC9', text: '#9A6A12' },
  hard:   { bg: '#FCEBEB', text: '#E24B4A' },
};

function PickerRecipeCard({
  recipe,
  selected,
  onPress,
  lang,
}: {
  recipe: RecipeOption;
  selected: boolean;
  onPress: () => void;
  lang: 'en' | 'tl';
}) {
  const photos   = getRecipePhotos(recipe);
  const totalMin = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);
  const diff     = recipe.difficulty ? DIFF_COLOR[recipe.difficulty] : null;

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: selected ? 2 : 0.5,
        borderColor: selected ? '#6E7B4A' : '#F0DEBB',
        overflow: 'hidden',
        marginBottom: 12,
        marginHorizontal: 16,
      }}
      className="active:opacity-80"
    >
      <RecipeCoverPhoto
        photos={photos}
        collageStyle={(recipe.collage_style ?? 'gradient') as any}
        gradientKey={(recipe.gradient_key ?? 'grad_a') as any}
        fontKey={(recipe.font_key ?? 'baloo') as any}
        title={recipe.title}
      />

      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 }}>
            {recipe.budget_tag ? (
              <View style={{ backgroundColor: '#FDEFC9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
                <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#9A6A12' }}>
                  {BUDGET_LABEL[recipe.budget_tag] ?? recipe.budget_tag}
                </Text>
              </View>
            ) : null}
            {diff && recipe.difficulty ? (
              <View style={{ backgroundColor: diff.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
                <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: diff.text, textTransform: 'capitalize' }}>
                  {recipe.difficulty}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={{
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: selected ? '#6E7B4A' : '#F9EDD3',
            borderWidth: selected ? 0 : 1.5,
            borderColor: '#B0A18C',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {selected ? (
              <Text style={{ fontSize: 14, color: '#fff' }}>✓</Text>
            ) : null}
          </View>
        </View>

        <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#000000', marginBottom: 3, lineHeight: 20 }} numberOfLines={2}>
          {recipe.title}
        </Text>

        {recipe.user?.name ? (
          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginBottom: 4 }}>
            by {recipe.user.name}
          </Text>
        ) : null}

        {recipe.description ? (
          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', lineHeight: 18, marginBottom: 8 }} numberOfLines={2}>
            {recipe.description}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {recipe.estimated_cost ? (
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#C45E3A' }}>
              ₱{Number(recipe.estimated_cost).toFixed(0)}
            </Text>
          ) : null}
          {(recipe.servings ?? 0) > 0 ? (
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
              {recipe.servings} {lang === 'en' ? 'servings' : 'serving'}
            </Text>
          ) : null}
          {totalMin > 0 ? (
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
              {totalMin} min
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

type Props = {
  visible: boolean;
  /** Which day this recipe gets assigned to (today or a future Premium day). */
  date: string;
  onClose: () => void;
};

/**
 * "Set a recipe as a meal" picker — shared by the Home tab's history view and
 * the Meal Plan tab's day view. Manages its own search/selection state and
 * resets it every time it's opened, so callers only need to own the
 * `visible` boolean and the target `date`.
 */
export default function RecipePickerModal({ visible, date, onClose }: Props) {
  const { t, lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [mealType, setMealType] = useState('almusal');
  const [search, setSearch] = useState('');
  const [recipe, setRecipe] = useState<RecipeOption | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (visible) {
      setMealType('almusal');
      setSearch('');
      setRecipe(null);
    }
  }, [visible]);

  const { data: recipeOptions = [], isLoading: recipesLoading } = useQuery({
    queryKey: ['recipes-picker', debouncedSearch],
    queryFn: () => fetchRecipes(debouncedSearch),
    enabled: visible,
    staleTime: 60_000,
  });

  const { mutate: assignRecipe, isPending: assigning } = useMutation({
    mutationFn: addRecipeToMealPlan,
    onSuccess: () => {
      onClose();
      qc.invalidateQueries({ queryKey: ['meal-plan-date', date] });
      qc.invalidateQueries({ queryKey: ['meal-plan-dates'] });
      qc.invalidateQueries({ queryKey: ['meal-plan-today'] });
    },
    onError: (e: any) => {
      const slotLabel = MEAL_TYPES.find(m => m.key === mealType)?.[lang === 'en' ? 'labelEn' : 'labelTl'] ?? mealType;
      if (e?.response?.status === 403 && e?.response?.data?.premium_required) {
        Alert.alert(
          lang === 'en' ? 'Premium feature' : 'Premium feature',
          lang === 'en'
            ? '7-Day Meal Planning is a Premium feature.'
            : 'Premium feature ang 7-Day Meal Planning.',
        );
        return;
      }
      if (e?.response?.status === 422) {
        Alert.alert(
          lang === 'en' ? 'Already in meal plan' : 'Nasa plano na',
          lang === 'en'
            ? `${recipe?.title ?? 'This recipe'} is already in your ${slotLabel} meal plan.`
            : `Nasa ${slotLabel} meal plan na ang ${recipe?.title ?? 'recipe na ito'}.`,
        );
        return;
      }
      const msg: string | undefined = e?.response?.data?.message;
      Alert.alert('Error', msg ?? (lang === 'en' ? 'Could not add to meal plan.' : 'Hindi maidagdag sa plano.'));
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#FFFCF5' }}>
        <View style={{
          paddingHorizontal: 16, paddingTop: insets.top + 16, paddingBottom: 12,
          backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F9EDD3',
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#000000' }}>
            {t('set_recipe_as_meal')}
          </Text>
          <Pressable onPress={onClose} className="w-8 h-8 rounded-full bg-cream-200 items-center justify-center active:opacity-70">
            <Text style={{ fontSize: 14, color: '#6F655A' }}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('pick_meal_type')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {MEAL_TYPES.map((mt) => {
                const active = mt.key === mealType;
                return (
                  <Pressable
                    key={mt.key}
                    onPress={() => setMealType(mt.key)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                      backgroundColor: active ? '#6E7B4A' : '#F9EDD3',
                    }}
                  >
                    <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: active ? '#fff' : '#000000' }}>
                      {mt.emoji} {lang === 'en' ? mt.labelEn : mt.labelTl}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('pick_recipe')}
            </Text>
            <View style={{ position: 'relative' }}>
              <Text style={{ position: 'absolute', left: 12, top: 11, fontSize: 14, zIndex: 1 }}>🔍</Text>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={lang === 'en' ? 'Search recipes...' : 'Hanapin ang recipe...'}
                style={{
                  backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
                  borderColor: '#F0DEBB', paddingLeft: 36, paddingRight: 12,
                  paddingVertical: 10, fontSize: 14, color: '#000000',
                  fontFamily: 'NunitoSans_400Regular',
                }}
              />
            </View>
          </View>

          {recipesLoading ? (
            <View style={{ marginTop: 12 }}>
              {[0, 1, 2].map(i => <SkeletonMealCard key={i} />)}
            </View>
          ) : recipeOptions.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 24 }}>
              <Text style={{ fontSize: 28, marginBottom: 6 }}>🍽️</Text>
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#6F655A' }}>
                {lang === 'en' ? 'No recipes found' : 'Walang recipe na nahanap'}
              </Text>
            </View>
          ) : (
            <View style={{ paddingTop: 4 }}>
              {recipeOptions.map((r) => (
                <PickerRecipeCard
                  key={r.id}
                  recipe={r}
                  selected={recipe?.id === r.id}
                  onPress={() => setRecipe(recipe?.id === r.id ? null : r)}
                  lang={lang}
                />
              ))}
            </View>
          )}
        </ScrollView>

        <View style={{
          paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 16,
          borderTopWidth: 1, borderTopColor: '#F9EDD3', backgroundColor: '#fff',
        }}>
          <Pressable
            disabled={!recipe || assigning}
            onPress={() => {
              if (!recipe) return;
              assignRecipe({
                date,
                meal_type: mealType,
                recipe_id: recipe.id,
                estimated_cost: recipe.estimated_cost ?? undefined,
              });
            }}
            style={{
              backgroundColor: recipe ? '#C45E3A' : '#D3C5AB',
              borderRadius: 14, paddingVertical: 14, alignItems: 'center',
            }}
          >
            {assigning
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#fff' }}>
                  {t('add_to_meal_plan')}
                </Text>
            }
          </Pressable>
        </View>
        <AndroidNavBarFiller />
      </View>
    </Modal>
  );
}
