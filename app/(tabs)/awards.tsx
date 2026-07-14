import client from '@/src/api/client';
import FireXpBar from '@/src/components/FireXpBar';
import { Skeleton, SkeletonListItem } from '@/src/components/Skeleton';
import { uploadAvatar } from '@/src/api/user';
import { resizeForUpload } from '@/src/utils/uploadImage';
import { HeaderWave } from '@/src/components/ULamLogo';
import LanguageSwitcher from '@/src/components/LanguageSwitcher';
import { useAuth } from '@/src/context/AuthContext';
import { useLanguage } from '@/src/context/LanguageContext';
import { API_URL } from '@/src/api/client';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

// ─── Types ─────────────────────────────────────────────────────────────────────

import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AchievementItem = {
  id: number; slug: string; title: string; title_en: string | null;
  description: string; description_en: string | null;
  icon: string; xp_reward: number; category: string;
  is_earned: boolean; earned_at: string | null;
};

type LeaderboardEntry = {
  rank: number;
  user: { id: number; name: string; username: string | null; avatar: string | null; level: number };
  xp: number; is_me: boolean;
};

type LeaderboardResponse = {
  leaderboard: LeaderboardEntry[]; my_rank: number;
  scope: string; scope_value: string | null;
};

type UserStats = {
  total_saved: number; meal_plans_generated: number;
  posts_count: number; achievements_count: number;
};

type SavedEntry = {
  id: number; recipe_id: number;
  recipe: {
    id: number; title: string; budget_tag: string;
    estimated_cost: number; servings: number;
    prep_time_minutes: number; cook_time_minutes: number;
    tags: string[];
  };
};

type SavedPage = { data: SavedEntry[]; current_page: number; last_page: number };

// ─── Constants ─────────────────────────────────────────────────────────────────

const LEVEL_XP = [0, 100, 250, 500, 1000, 2000, 3500, 6000, 10000, 15000];

const BUDGET_LABEL: Record<string, string> = {
  budget_100: '₱100', budget_200: '₱200',
  budget_400: '₱400', budget_400plus: '₱400+',
};

const MEAL_TYPE_OPTIONS = [
  { key: 'almusal',    label: 'Breakfast', emoji: '🌅' },
  { key: 'tanghalian', label: 'Lunch',     emoji: '☀️' },
  { key: 'meryenda',   label: 'Snack',     emoji: '🍌' },
  { key: 'hapunan',    label: 'Dinner',    emoji: '🌙' },
  { key: 'iba pa',     label: 'Others',    emoji: '🍽️' },
];

const TAG_EMOJI: Record<string, string> = {
  isda: '🐟', manok: '🍗', baboy: '🥩', gulay: '🥦',
  sabaw: '🍲', prito: '🍳', espesyal: '⭐', itlog: '🥚',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function xpProgress(xp: number, level: number) {
  const current = LEVEL_XP[level - 1] ?? 0;
  const next    = LEVEL_XP[level]     ?? LEVEL_XP[LEVEL_XP.length - 1];
  const progress = next > current ? (xp - current) / (next - current) : 1;
  return { current, next, progress: Math.min(1, Math.max(0, progress)) };
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
}

// ─── API ───────────────────────────────────────────────────────────────────────

async function fetchAchievements(): Promise<AchievementItem[]> {
  const { data } = await client.get('/user/achievements');
  return data.achievements;
}

async function fetchLeaderboard(): Promise<LeaderboardResponse> {
  const { data } = await client.get('/leaderboard/barangay');
  return data;
}

async function fetchStats(): Promise<UserStats> {
  const { data } = await client.get('/user/stats');
  return data.stats;
}

async function fetchRecipeBook(page: number): Promise<SavedPage> {
  const { data } = await client.get(`/recipe-book?page=${page}`);
  return data;
}

// ─── Sub-tabs ──────────────────────────────────────────────────────────────────

function AwardsTab({
  achievements, loadingAch, leaderData, loadingLb, stats,
}: {
  achievements: AchievementItem[] | undefined;
  loadingAch: boolean;
  leaderData: LeaderboardResponse | undefined;
  loadingLb: boolean;
  stats: UserStats | undefined;
}) {
  const { lang } = useLanguage();
  const earnedCount = achievements?.filter((a) => a.is_earned).length ?? 0;
  const totalCount  = achievements?.length ?? 0;

  return (
    <>
      {/* Stats — four distinct boxes */}
      {stats && (
        <View className="mb-4">
          <Text className="text-xs font-medium text-ink-soft uppercase tracking-wider mb-3">
            {lang === 'en' ? 'Your stats' : 'Iyong mga istatistika'}
          </Text>
          <View className="flex-row flex-wrap gap-2.5">
            {[
              { label: lang === 'en' ? 'Saved' : 'Natipid',  val: `₱${Math.round(stats.total_saved).toLocaleString()}`, bg: '#F4B942', text: '#58200F', icon: '💰' },
              { label: 'Meal Plans',                          val: String(stats.meal_plans_generated),                   bg: '#386641', text: '#FFFFFF', icon: '🍽️' },
              { label: lang === 'en' ? 'Posts' : 'Mga Post',  val: String(stats.posts_count),                            bg: '#E7653B', text: '#FFFFFF', icon: '💬' },
              { label: 'Achievements',                        val: `${earnedCount}/${totalCount}`,                       bg: '#5E693F', text: '#FFFFFF', icon: '🏆' },
            ].map((s) => (
              <View
                key={s.label}
                className="rounded-2xl p-4 flex-row items-center gap-3"
                style={{ backgroundColor: s.bg, width: '47.5%' }}
              >
                <Text style={{ fontSize: 34 }}>{s.icon}</Text>
                <View className="flex-1">
                  <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 20, color: s.text }} numberOfLines={1} adjustsFontSizeToFit>{s.val}</Text>
                  <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 12, color: s.text, opacity: 0.9 }}>{s.label}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Achievements */}
      <Text className="text-xs font-medium text-ink-soft uppercase tracking-wider mb-2">
        {lang === 'en' ? 'Achievements' : 'Mga Achievement'} ({earnedCount}/{totalCount})
      </Text>
      <View className="bg-white rounded-2xl border border-cream-200 p-4 mb-4">
        {loadingAch ? (
          <ActivityIndicator color="#386641" />
        ) : (achievements ?? []).map((a, i) => (
          <View
            key={a.id}
            className={`flex-row items-center gap-3 py-2.5 ${
              i < (achievements?.length ?? 0) - 1 ? 'border-b border-cream-200' : ''
            }`}
            style={{ opacity: a.is_earned ? 1 : 0.45 }}
          >
            <View
              className="w-10 h-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: a.is_earned ? '#EFF4EC' : '#F9EDD3' }}
            >
              <Text style={{ fontSize: 18 }}>{a.icon}</Text>
            </View>
            <View className="flex-1">
              <Text className={`text-sm font-medium ${a.is_earned ? 'text-ink' : 'text-ink-soft'}`}>
                {lang === 'en' ? (a.title_en || a.title) : a.title}
              </Text>
              <Text className="text-xs text-ink-soft">
                {lang === 'en' ? (a.description_en || a.description) : a.description}
              </Text>
            </View>
            {a.is_earned ? (
              <View className="rounded-full bg-leaf-50 px-2 py-0.5">
                <Text className="text-xs font-semibold text-leaf-700">✓</Text>
              </View>
            ) : (
              <Text className="text-xs text-gold-500 font-medium">+{a.xp_reward} XP</Text>
            )}
          </View>
        ))}
      </View>

      {/* Leaderboard */}
      <Text className="text-xs font-medium text-ink-soft uppercase tracking-wider mb-2">
        {lang === 'en' ? 'Top in' : 'Top sa'} {leaderData?.scope_value ?? (lang === 'en' ? 'Community' : 'Komunidad')}
        {leaderData?.my_rank ? ` · ${lang === 'en' ? 'You' : 'Ikaw'}: #${leaderData.my_rank}` : ''}
      </Text>
      <View className="bg-white rounded-2xl border border-cream-200 p-4 mb-4">
        {loadingLb ? (
          <ActivityIndicator color="#386641" />
        ) : (leaderData?.leaderboard ?? []).length === 0 ? (
          <Text className="text-xs text-ink-soft text-center py-3">
            {lang === 'en' ? 'No data yet. Earn XP to appear here!' : 'Walang datos pa. Mag-earn ng XP para lumabas dito!'}
          </Text>
        ) : (leaderData?.leaderboard ?? []).map((entry, i) => (
          <View
            key={entry.user.id}
            className={`flex-row items-center gap-3 py-2 ${
              i < (leaderData?.leaderboard.length ?? 0) - 1 ? 'border-b border-cream-200' : ''
            } ${entry.is_me ? 'bg-leaf-50 -mx-1 px-1 rounded-xl' : ''}`}
          >
            <Text className="text-sm font-semibold text-ink-soft w-5 text-center">
              {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
            </Text>
            <View className="w-8 h-8 rounded-full bg-leaf-50 items-center justify-center">
              {entry.user.avatar ? (
                <Image source={{ uri: `${API_URL}${entry.user.avatar}` }} className="w-8 h-8 rounded-full" />
              ) : (
                <Text className="text-xs font-semibold text-ink">{initials(entry.user.name)}</Text>
              )}
            </View>
            <View className="flex-1">
              <Text className={`text-sm ${entry.is_me ? 'font-semibold text-ink' : 'text-ink'}`}>
                {entry.user.name}{entry.is_me ? ` (${lang === 'en' ? 'You' : 'Ikaw'})` : ''}
              </Text>
              <Text className="text-xs text-ink-soft">Lv.{entry.user.level}</Text>
            </View>
            <Text className="text-xs font-semibold text-brand-600">{entry.xp.toLocaleString()} XP</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function RecipeBookTab() {
  const router = useRouter();
  const qc     = useQueryClient();
  const { lang } = useLanguage();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['recipe-book', page],
    queryFn:  () => fetchRecipeBook(page),
    staleTime: 60_000,
  });

  const { mutate: unsave } = useMutation({
    mutationFn: (recipeId: number) => client.post(`/recipes/${recipeId}/save`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['recipe-book'] }),
  });

  // Add-to-meal-plan modal — same flow as the recipe detail screen.
  const [addingRecipe, setAddingRecipe] = useState<SavedEntry['recipe'] | null>(null);
  const [mealType, setMealType] = useState('almusal');
  const todayIso = new Date().toISOString().slice(0, 10);

  const { mutate: assignMeal, isPending: assigning } = useMutation({
    mutationFn: (payload: { date: string; meal_type: string; recipe_id: number; estimated_cost?: number }) =>
      client.post('/meal-plan/add-item', payload),
    onSuccess: () => {
      setAddingRecipe(null);
      qc.invalidateQueries({ queryKey: ['meal-plan-today'] });
      qc.invalidateQueries({ queryKey: ['meal-plan-date'] });
    },
    onError: (e: any) => {
      const slotLabel = MEAL_TYPE_OPTIONS.find(m => m.key === mealType)?.label ?? mealType;
      const msg = e?.response?.status === 422
        ? (lang === 'en' ? `This recipe is already in your ${slotLabel} meal plan.` : `Nasa ${slotLabel} na ang recipe na ito sa meal plan mo.`)
        : (e?.response?.data?.message ?? (lang === 'en' ? 'Could not add to meal plan.' : 'Hindi maidagdag sa meal plan.'));
      Alert.alert(lang === 'en' ? 'Error' : 'Error', msg);
    },
  });

  const entries = data?.data ?? [];

  if (isLoading) {
    return (
      <View style={{ paddingTop: 8 }}>
        <Skeleton style={{ height: 110, marginBottom: 16 }} radius={16} />
        {[0, 1, 2, 3].map((i) => <SkeletonListItem key={i} />)}
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View className="items-center pt-12 px-8">
        <Text style={{ fontSize: 40, marginBottom: 12 }}>📖</Text>
        <Text className="text-sm font-medium text-ink mb-2 text-center">{lang === 'en' ? 'No saved recipes yet' : 'Walang na-save pang recipe'}</Text>
        <Text className="text-xs text-ink-soft text-center leading-5">
          {lang === 'en' ? 'Tap 🏷️ on any recipe to save it here.' : 'Mag-tap ng 🏷️ sa kahit anong recipe para i-save dito.'}
        </Text>
      </View>
    );
  }

  return (
    <>
      {entries.map((entry) => {
        const r         = entry.recipe;
        const firstTag  = r.tags?.[0];
        const emoji     = firstTag ? (TAG_EMOJI[firstTag] ?? '🍽️') : '🍽️';
        const totalTime = (r.prep_time_minutes ?? 0) + (r.cook_time_minutes ?? 0);

        return (
          <Pressable
            key={entry.id}
            onPress={() => router.push(`/recipe/${r.id}` as any)}
            className="bg-white rounded-2xl border border-cream-200 p-4 mb-3 active:opacity-80"
          >
            <View className="flex-row items-start gap-3">
              <View className="w-11 h-11 rounded-xl bg-leaf-50 items-center justify-center shrink-0">
                <Text style={{ fontSize: 20 }}>{emoji}</Text>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2 mb-0.5">
                  <View className="rounded-full bg-gold-50 px-2 py-0.5">
                    <Text className="text-xs font-semibold text-gold-700">
                      {BUDGET_LABEL[r.budget_tag] ?? r.budget_tag}
                    </Text>
                  </View>
                </View>
                <Text className="text-sm font-medium text-ink mb-1">{r.title}</Text>
                <View className="flex-row gap-3">
                  <Text className="text-xs text-brand-600 font-semibold">
                    ₱{Number(r.estimated_cost).toFixed(0)}
                  </Text>
                  <Text className="text-xs text-ink-soft">{r.servings} {lang === 'en' ? 'servings' : 'tao'}</Text>
                  {totalTime > 0 && (
                    <Text className="text-xs text-ink-soft">{totalTime} min</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Labeled actions — icon-only buttons confused users */}
            <View className="flex-row gap-2 mt-3 pt-3 border-t border-cream-200">
              <Pressable
                onPress={(e) => { e.stopPropagation(); setMealType('almusal'); setAddingRecipe(r); }}
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 active:opacity-80"
                style={{ backgroundColor: '#386641' }}
              >
                <Ionicons name="add-circle-outline" size={16} color="#fff" />
                <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 12, color: '#fff' }}>
                  {lang === 'en' ? 'Add to Meal Plan' : 'Idagdag sa Plan'}
                </Text>
              </Pressable>
              <Pressable
                onPress={(e) => { e.stopPropagation(); unsave(r.id); }}
                className="flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 px-4 border active:opacity-70"
                style={{ borderColor: '#F0DEBB', backgroundColor: '#FFFCF5' }}
              >
                <Ionicons name="trash-outline" size={14} color="#C45E3A" />
                <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 12, color: '#6F655A' }}>
                  {lang === 'en' ? 'Remove' : 'Alisin'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        );
      })}

      {data && data.current_page < data.last_page && (
        <Pressable
          onPress={() => setPage((p) => p + 1)}
          className="rounded-xl border border-cream-300 py-3 items-center mb-4"
        >
          <Text className="text-xs text-ink-soft">{lang === 'en' ? 'View more' : 'Tignan ang higit pa'}</Text>
        </Pressable>
      )}

      {/* ── Add-to-meal-plan modal ── */}
      <Modal visible={!!addingRecipe} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAddingRecipe(null)}>
        <View style={{ flex: 1, backgroundColor: '#FFF8E8' }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F9EDD3', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#292522' }}>
                {lang === 'en' ? "Add to Today's Meal Plan" : "Idagdag sa Meal Plan Ngayon"}
              </Text>
              {addingRecipe && (
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: '#6F655A', marginTop: 2 }} numberOfLines={1}>
                  {addingRecipe.title}
                </Text>
              )}
            </View>
            <Pressable onPress={() => setAddingRecipe(null)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F9EDD3', alignItems: 'center', justifyContent: 'center' }} className="active:opacity-70">
              <Ionicons name="close" size={16} color="#6F655A" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 8 }}>
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, color: '#6F655A', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>
              {lang === 'en' ? 'Pick meal type' : 'Pumili ng meal type'}
            </Text>
            {MEAL_TYPE_OPTIONS.map((mt) => {
              const active = mt.key === mealType;
              return (
                <Pressable
                  key={mt.key}
                  onPress={() => setMealType(mt.key)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: active ? '#6E7B4A' : '#F0DEBB', backgroundColor: active ? '#EFF4EC' : '#fff', marginBottom: 8 }}
                >
                  <Text style={{ fontSize: 20 }}>{mt.emoji}</Text>
                  <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: active ? '#5E693F' : '#292522', flex: 1 }}>{mt.label}</Text>
                  {active && <Ionicons name="checkmark-circle" size={20} color="#6E7B4A" />}
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#F9EDD3', backgroundColor: '#fff' }}>
            <Pressable
              onPress={() => {
                if (!addingRecipe) return;
                assignMeal({ date: todayIso, meal_type: mealType, recipe_id: addingRecipe.id, estimated_cost: addingRecipe.estimated_cost });
              }}
              disabled={assigning}
              style={{ backgroundColor: '#C45E3A', borderRadius: 14, paddingVertical: 14, alignItems: 'center', opacity: assigning ? 0.7 : 1 }}
            >
              {assigning
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 15, color: '#fff' }}>{lang === 'en' ? 'Add to Meal Plan' : 'Idagdag sa Meal Plan'}</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function AwardsScreen() {
  const { user, signOut, refreshUser } = useAuth();
  const { t, lang } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab]         = useState<'awards' | 'book'>('awards');
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const qc = useQueryClient();

  const { data: achievements, isLoading: loadingAch } = useQuery({
    queryKey: ['achievements'],
    queryFn:  fetchAchievements,
    staleTime: 60_000,
  });

  const { data: leaderData, isLoading: loadingLb } = useQuery({
    queryKey: ['leaderboard'],
    queryFn:  fetchLeaderboard,
    staleTime: 120_000,
  });

  const { data: stats } = useQuery({
    queryKey: ['user-stats'],
    queryFn:  fetchStats,
    staleTime: 120_000,
  });

  // Seller plan takes priority in the header badge over the consumer
  // Free/Premium plan — it's the bigger paid commitment for a store owner,
  // and showing "Free" right under the name reads as broken once someone
  // has actually subscribed. Consumer premium is still reachable in the
  // Account section below either way.
  const { data: billing } = useQuery({
    queryKey: ['billing-status'],
    queryFn: async () => (await client.get('/billing/status')).data,
    staleTime: 30_000,
  });
  const sellerPlanName = billing?.subscription?.plan_name ?? null;
  const sellerPlanActive = billing?.subscription && billing.subscription.status !== 'free';
  const planPillLabel = sellerPlanActive
    ? `🏪 ${sellerPlanName}`
    : (user?.plan === 'premium' ? '⭐ Premium' : (lang === 'en' ? 'Free' : 'Libre'));

  const avatarUri = user?.avatar ? `${API_URL}${user.avatar}` : null;
  const myXp      = user?.xp    ?? 0;
  const myLevel   = user?.level  ?? 1;
  const { next, progress } = xpProgress(myXp, myLevel);
  const earnedCount = achievements?.filter((a) => a.is_earned).length ?? 0;

  const showPhotoOptions = () => {
    Alert.alert('Profile Photo', lang === 'en' ? 'Choose an option' : 'Pumili ng opsyon', [
      { text: lang === 'en' ? 'Take a Photo' : 'Kumuha ng Larawan',       onPress: handleCamera },
      { text: lang === 'en' ? 'Choose from Gallery' : 'Piliin mula sa Gallery',  onPress: handleGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert(lang === 'en' ? 'Permission needed' : 'Kailangan ng permiso', lang === 'en' ? 'Please allow access to your photos.' : 'Payagan ang access sa iyong mga larawan.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) await doUpload(result.assets[0].uri);
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert(lang === 'en' ? 'Permission needed' : 'Kailangan ng permiso', lang === 'en' ? 'Please allow access to your camera.' : 'Payagan ang access sa camera.'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) await doUpload(result.assets[0].uri);
  };

  const doUpload = async (uri: string) => {
    setUploading(true);
    try { await uploadAvatar(uri); await refreshUser(); }
    catch { Alert.alert(lang === 'en' ? 'Upload failed' : 'Hindi na-upload', lang === 'en' ? 'Please try again.' : 'Subukan ulit.'); }
    finally { setUploading(false); }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['achievements'] }),
      qc.invalidateQueries({ queryKey: ['leaderboard'] }),
      qc.invalidateQueries({ queryKey: ['user-stats'] }),
      refreshUser(),
    ]);
    setRefreshing(false);
  }, [qc, refreshUser]);

  const handleLogout = () => {
    Alert.alert(t('logout_title'), t('logout_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('logout'), style: 'destructive', onPress: async () => { await signOut(); router.replace('/(auth)/welcome'); } },
    ]);
  };

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: '#FFF8E8' }}
      contentContainerClassName="pb-8"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#386641" />
      }
    >
      <ImageBackground
        source={require('@/assets/profile-header-food.jpg')}
        resizeMode="cover"
        className="relative overflow-hidden"
      >
        {/* Terracotta gradient over the photo — same treatment as the Profile header */}
        <LinearGradient
          colors={['rgba(231,101,59,0.96)', 'rgba(231,101,59,0.78)', 'rgba(231,101,59,0.55)']}
          locations={[0, 0.55, 1]}
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {/* Back to profile (awards is no longer a tab) */}
        <Pressable
          onPress={() => router.back()}
          className="absolute z-10 w-9 h-9 rounded-full items-center justify-center active:opacity-70"
          style={{ top: insets.top + 8, left: 16, backgroundColor: 'rgba(255,255,255,0.15)' }}
        >
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </Pressable>

        <View className="px-5 pb-1 items-center" style={{ paddingTop: insets.top + 12 }}>
          <Pressable onPress={showPhotoOptions} className="relative mb-3">
            <View style={{ padding: 3, borderRadius: 999, backgroundColor: '#FFFCF5' }}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={{ width: 72, height: 72, borderRadius: 9999, backgroundColor: '#F0DEBB' }} />
              ) : (
                <View style={{ width: 72, height: 72, borderRadius: 9999, backgroundColor: '#292522', alignItems: 'center', justifyContent: 'center' }}>
                  <Text className="text-2xl font-semibold text-white">{initials(user?.name ?? 'U')}</Text>
                </View>
              )}
            </View>
            <View className="absolute -bottom-1 -right-1 rounded-full px-2 py-0.5 border-2" style={{ backgroundColor: '#386641', borderColor: '#FFFCF5' }}>
              {uploading
                ? <ActivityIndicator color="white" size="small" />
                : <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 12, color: '#fff' }}>Lv.{myLevel}</Text>
              }
            </View>
          </Pressable>

          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 27, color: '#fff', textShadowColor: 'rgba(88,32,15,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5 }}>{user?.name}</Text>
          <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#FFF8E8', marginBottom: 12, textShadowColor: 'rgba(88,32,15,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
            @{user?.username}
          </Text>

          <View className="flex-row gap-2 mb-3">
            <View
              className="rounded-full px-3.5 py-1.5"
              style={{ backgroundColor: sellerPlanActive ? '#386641' : '#FFFCF5' }}
            >
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: sellerPlanActive ? '#fff' : '#292522' }}>{planPillLabel}</Text>
            </View>
            <View className="rounded-full px-3.5 py-1.5" style={{ backgroundColor: '#FFFCF5' }}>
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#292522' }}>🔥 {user?.streak_days ?? 0}d</Text>
            </View>
            <View className="rounded-full px-3.5 py-1.5" style={{ backgroundColor: '#FFFCF5' }}>
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#292522' }}>⚡ Lv.{myLevel}</Text>
            </View>
          </View>

          <View className="w-full mb-3">
            <View className="flex-row justify-between mb-1.5">
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#fff', textShadowColor: 'rgba(88,32,15,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>Level {myLevel}</Text>
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#fff', textShadowColor: 'rgba(88,32,15,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
                {myLevel < 10 ? `${myXp.toLocaleString()} / ${next.toLocaleString()} XP` : 'Max Level'}
              </Text>
            </View>
            <FireXpBar progress={progress} />
          </View>

        </View>
        <HeaderWave fill="#FFF8E8" />
      </ImageBackground>

      <View className="px-4 pt-2">
      {false && <>
      <View className="bg-white rounded-2xl border border-cream-200 p-5 mb-4 items-center">
        <Pressable onPress={showPhotoOptions} className="relative mb-3">
          {avatarUri ? (
            <Image source={{ uri: avatarUri ?? undefined }} className="w-20 h-20 rounded-full bg-cream-300" />
          ) : (
            <View className="w-20 h-20 rounded-full bg-leaf-50 items-center justify-center">
              <Text className="text-2xl font-semibold text-ink">{initials(user?.name ?? 'U')}</Text>
            </View>
          )}
          <View className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-brand-600 items-center justify-center border-2 border-white">
            {uploading
              ? <ActivityIndicator color="white" size="small" />
              : <Text className="text-white text-xs">✏️</Text>
            }
          </View>
        </Pressable>

        <Text className="text-base font-medium text-ink">{user?.name}</Text>
        <Text className="text-xs text-ink-soft mb-2">@{user?.username}</Text>

        <View className="flex-row gap-2 mb-4">
          <View className="rounded-full bg-leaf-50 px-3 py-1">
            <Text className="text-xs font-semibold text-ink">Lv.{myLevel}</Text>
          </View>
          <View className="rounded-full bg-gold-50 px-3 py-1">
            <Text className="text-xs font-semibold text-gold-700">
              {user?.plan === 'premium' ? '⭐ Premium' : 'Free'}
            </Text>
          </View>
          <View className="rounded-full bg-brand-50 px-3 py-1">
            <Text className="text-xs font-semibold text-brand-600">🔥 {user?.streak_days ?? 0}d</Text>
          </View>
          <View className="rounded-full bg-gold-50 px-3 py-1">
            <Text className="text-xs font-semibold text-gold-600">🏅 {earnedCount}</Text>
          </View>
        </View>

        {/* XP bar */}
        <View className="w-full">
          <View className="flex-row justify-between mb-1">
            <Text className="text-xs text-ink-soft">Level {myLevel}</Text>
            <Text className="text-xs text-ink-soft">
              {myLevel < 10 ? `${myXp.toLocaleString()} / ${next.toLocaleString()} XP` : 'Max Level'}
            </Text>
          </View>
          <View className="w-full h-2 bg-cream-200 rounded-full overflow-hidden">
            <View
              className="h-2 bg-leaf-500 rounded-full"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </View>
        </View>

        <View className="flex-row gap-2 mt-4">
          <Pressable
            onPress={() => router.push('/edit-profile' as any)}
            className="flex-1 rounded-xl border border-cream-300 py-2.5 items-center active:opacity-70"
          >
            <Text className="text-xs font-medium text-ink-soft">✏️ I-edit</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/connections' as any)}
            className="flex-1 rounded-xl border border-cream-300 py-2.5 items-center active:opacity-70"
          >
            <Text className="text-xs font-medium text-ink-soft">👥 Koneksyon</Text>
          </Pressable>
        </View>
      </View>

      </>}

      {/* ── Tab switcher ─────────────────────────────────────────────── */}
      <View className="flex-row bg-cream-200 rounded-xl p-1 mb-4">
        {([
          { key: 'awards', label: `🏆 ${lang === 'en' ? 'Awards' : 'Gantimpala'}` },
          { key: 'book',   label: `📖 ${lang === 'en' ? 'Saved' : 'Naka-save'}` },
        ] as const).map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            className={`flex-1 rounded-lg py-2 items-center ${tab === t.key ? 'bg-white' : ''}`}
            style={tab === t.key
              ? { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }
              : {}}
          >
            <Text className={`text-xs font-semibold ${tab === t.key ? 'text-leaf-700' : 'text-ink-soft'}`}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── Tab content ──────────────────────────────────────────────── */}
      {tab === 'awards' ? (
        <AwardsTab
          achievements={achievements}
          loadingAch={loadingAch}
          leaderData={leaderData}
          loadingLb={loadingLb}
          stats={stats}
        />
      ) : (
        <RecipeBookTab />
      )}

      {/* ── Account section ──────────────────────────────────────────── */}
      <Text className="text-xs font-medium text-ink-soft uppercase tracking-wider mb-2 mt-2">
        {t('account')}
      </Text>
      <View className="bg-white rounded-2xl border border-cream-200 p-4 mb-3">
        <View className="flex-row justify-between py-2.5 border-b border-cream-200">
          <Text className="text-xs text-ink-soft">{t('email')}</Text>
          <Text className="text-xs font-medium text-ink">{user?.email}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/upgrade' as any)}
          className="flex-row justify-between py-2.5 border-b border-cream-200 active:opacity-70"
        >
          <Text className="text-xs text-ink-soft">{t('plan_label')}</Text>
          <Text className="text-xs font-medium text-brand-600">
            {user?.plan === 'premium' ? '⭐ Premium' : (lang === 'en' ? 'Upgrade →' : 'I-upgrade →')}
          </Text>
        </Pressable>
        <View className="flex-row justify-between py-2.5 border-b border-cream-200">
          <Text className="text-xs text-ink-soft">{t('household')}</Text>
          <Text className="text-xs font-medium text-ink">
            {user?.household_size ? `${user.household_size} ${t('members')}` : t('not_set')}
          </Text>
        </View>
        <View className="flex-row justify-between items-center py-2.5">
          <Text className="text-xs text-ink-soft">{t('language')}</Text>
          <LanguageSwitcher />
        </View>
      </View>

      <Pressable
        onPress={handleLogout}
        className="w-full rounded-xl border border-cream-300 py-3 items-center active:opacity-70"
      >
        <Text className="text-sm font-medium" style={{ color: '#E24B4A' }}>{t('logout')}</Text>
      </Pressable>
      </View>
    </ScrollView>
  );
}
