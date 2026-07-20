import client from '@/src/api/client';
import FireXpBar from '@/src/components/FireXpBar';
import { Skeleton, SkeletonListItem } from '@/src/components/Skeleton';
import ThemedSection, { useSectionColors } from '@/src/components/ThemedSection';
import TierProgressCard, { type TierGroup } from '@/src/components/TierProgressCard';
import { uploadAvatar } from '@/src/api/user';
import { resizeForUpload } from '@/src/utils/uploadImage';
import { HeaderWave } from '@/src/components/ULamLogo';
import LanguageSwitcher from '@/src/components/LanguageSwitcher';
import { useAuth } from '@/src/context/AuthContext';
import { useLanguage } from '@/src/context/LanguageContext';
import { API_URL } from '@/src/api/client';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

// ─── Types ─────────────────────────────────────────────────────────────────────

import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SingleAchievement = {
  id: number; title: string; title_en: string | null;
  description: string; icon: string | null; xp_reward: number;
  is_earned: boolean; earned_at: string | null;
};

type RepeatingTask = {
  id: number; title: string; description: string | null;
  icon: string | null; xp_reward: number;
  frequency: 'daily' | 'weekly' | 'monthly'; is_completed: boolean;
};

type TasksResponse = {
  daily: RepeatingTask[];
  weekly: RepeatingTask[];
  monthly: RepeatingTask[];
  once: { single: SingleAchievement[]; tier_groups: TierGroup[] };
};

type EarnedRewardTier = {
  id: number; user_reward_tier_id: number; title: string; description: string | null;
  icon: string | null; reward_type: string; reward_value: number | null;
  earned_at: string; redeemed_at: string | null;
  boostable_target: 'recipe' | 'tindahan' | null;
};

type LockedRewardTier = {
  id: number; title: string; description: string | null; icon: string | null;
  reward_type: string; reward_value: number | null; xp_threshold: number | null;
  required_tasks: { id: number; title: string; icon: string | null; is_completed: boolean }[];
  tasks_completed: number; tasks_required: number;
};

type RewardTiersResponse = { earned: EarnedRewardTier[]; locked: LockedRewardTier[] };

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

// ─── Constants ─────────────────────────────────────────────────────────────────

const LEVEL_XP = [0, 100, 250, 500, 1000, 2000, 3500, 6000, 10000, 15000];

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

async function fetchTasks(): Promise<TasksResponse> {
  const { data } = await client.get('/user/tasks');
  return data;
}

async function fetchLeaderboard(): Promise<LeaderboardResponse> {
  const { data } = await client.get('/leaderboard/barangay');
  return data;
}

async function fetchStats(): Promise<UserStats> {
  const { data } = await client.get('/user/stats');
  return data.stats;
}

async function fetchRewardTiers(): Promise<RewardTiersResponse> {
  const { data } = await client.get('/user/reward-tiers');
  return data;
}

function rewardSummary(tier: { reward_type: string; reward_value: number | null }, lang: string): string {
  switch (tier.reward_type) {
    case 'premium_days': return lang === 'en' ? `${tier.reward_value} days Premium` : `${tier.reward_value} araw na Premium`;
    case 'booster_credit': return lang === 'en' ? `${tier.reward_value}-day recipe boost credit` : `${tier.reward_value}-araw na boost credit (recipe)`;
    case 'store_boost_credit': return lang === 'en' ? `${tier.reward_value}-day store boost credit` : `${tier.reward_value}-araw na boost credit (tindahan)`;
    default: return lang === 'en' ? 'Badge' : 'Badge';
  }
}

// ─── Sub-tabs ──────────────────────────────────────────────────────────────────

function AwardsTab({
  tasksData, loadingTasks, leaderData, loadingLb, stats, rewardTiersData,
}: {
  tasksData: TasksResponse | undefined;
  loadingTasks: boolean;
  leaderData: LeaderboardResponse | undefined;
  loadingLb: boolean;
  stats: UserStats | undefined;
  rewardTiersData: RewardTiersResponse | undefined;
}) {
  const { lang } = useLanguage();
  const router = useRouter();
  const single = tasksData?.once.single ?? [];
  const tierGroups = tasksData?.once.tier_groups ?? [];
  // Each tier group counts as one achievement slot, complete once maxed
  // (diamond earned) -- an ambiguous call with no single correct answer,
  // easy to flip later if it reads oddly in practice.
  const earnedCount = single.filter((a) => a.is_earned).length
    + tierGroups.filter((g) => g.current_tier === 'diamond').length;
  const totalCount = single.length + tierGroups.length;

  const savedColors        = useSectionColors('awards_stat_saved', ['#F4B942', '#58200F']);
  const mealPlansColors    = useSectionColors('awards_stat_meal_plans', ['#386641', '#FFFFFF']);
  const postsColors        = useSectionColors('awards_stat_posts', ['#E7653B', '#FFFFFF']);
  const achievementsColors = useSectionColors('awards_stat_achievements', ['#5E693F', '#FFFFFF']);

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
              { label: lang === 'en' ? 'Saved' : 'Natipid',  val: `₱${Math.round(stats.total_saved).toLocaleString()}`, bg: savedColors[0], text: savedColors[1], icon: '💰' },
              { label: 'Meal Plans',                          val: String(stats.meal_plans_generated),                   bg: mealPlansColors[0], text: mealPlansColors[1], icon: '🍽️' },
              { label: lang === 'en' ? 'Posts' : 'Mga Post',  val: String(stats.posts_count),                            bg: postsColors[0], text: postsColors[1], icon: '💬' },
              { label: 'Achievements',                        val: `${earnedCount}/${totalCount}`,                       bg: achievementsColors[0], text: achievementsColors[1], icon: '🏆' },
            ].map((s) => (
              <View
                key={s.label}
                className="rounded-2xl p-4 flex-row items-center gap-3"
                style={{ backgroundColor: s.bg, width: '47.5%' }}
              >
                <Text style={{ fontSize: 34 }}>{s.icon}</Text>
                <View className="flex-1">
                  <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 20, color: s.text }} numberOfLines={1} adjustsFontSizeToFit>{s.val}</Text>
                  <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: s.text, opacity: 0.9 }}>{s.label}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Daily / Weekly / Monthly tasks — completion happens automatically
          when the matching action is performed elsewhere in the app; this
          is a read-only checklist, not a tap-to-complete list. */}
      {([
        { key: 'daily',   tasks: tasksData?.daily,   label: lang === 'en' ? "Today's Tasks" : 'Mga Gawain Ngayon' },
        { key: 'weekly',  tasks: tasksData?.weekly,  label: lang === 'en' ? 'This Week' : 'Ngayong Linggo' },
        { key: 'monthly', tasks: tasksData?.monthly, label: lang === 'en' ? 'This Month' : 'Ngayong Buwan' },
      ] as const).map(({ key, tasks, label }) => (
        (loadingTasks || (tasks && tasks.length > 0)) && (
          <View key={key}>
            <Text className="text-xs font-medium text-ink-soft uppercase tracking-wider mb-2">
              {label}
            </Text>
            <View className="bg-white rounded-2xl border border-cream-200 p-4 mb-4">
              {loadingTasks ? (
                <ActivityIndicator color="#386641" />
              ) : (tasks ?? []).map((task, i) => (
                <View
                  key={task.id}
                  className={`flex-row items-center gap-3 py-2.5 ${
                    i < (tasks?.length ?? 0) - 1 ? 'border-b border-cream-200' : ''
                  }`}
                  style={{ opacity: task.is_completed ? 1 : 0.7 }}
                >
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: task.is_completed ? '#EFF4EC' : '#F9EDD3' }}
                  >
                    <Text style={{ fontSize: 18 }}>{task.icon || '🎯'}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className={`text-sm font-medium ${task.is_completed ? 'text-ink' : 'text-ink-soft'}`}>
                      {task.title}
                    </Text>
                  </View>
                  {task.is_completed ? (
                    <View className="rounded-full bg-leaf-50 px-2 py-0.5">
                      <Text className="text-xs font-semibold text-leaf-700">✓</Text>
                    </View>
                  ) : (
                    <Text className="text-xs text-gold-500 font-medium">+{task.xp_reward} XP</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )
      ))}

      {/* Achievements — flat one-off entries, then lifetime tier groups
          (Recipe Collector, Presyo Patrol, Mr./Ms. Palengke, etc.) as a
          single progressive badge each. */}
      <Text className="text-xs font-medium text-ink-soft uppercase tracking-wider mb-2">
        {lang === 'en' ? 'Achievements' : 'Mga Achievement'} ({earnedCount}/{totalCount})
      </Text>
      <View className="bg-white rounded-2xl border border-cream-200 p-4 mb-4">
        {loadingTasks ? (
          <ActivityIndicator color="#386641" />
        ) : (
          <>
            {single.map((a, i) => (
              <View
                key={a.id}
                className={`flex-row items-center gap-3 py-2.5 ${
                  i < single.length - 1 || tierGroups.length > 0 ? 'border-b border-cream-200' : ''
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
                  <Text className="text-xs text-ink-soft">{a.description}</Text>
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
            {tierGroups.map((g, i) => (
              <View
                key={g.tier_group}
                className={i < tierGroups.length - 1 ? 'border-b border-cream-200' : ''}
              >
                <TierProgressCard group={g} />
              </View>
            ))}
          </>
        )}
      </View>

      {/* Rewards — Reward Tier unlocks (premium days, boost credits, badges).
          Only shown once at least one tier exists, earned or locked, so a
          fresh admin config with zero tiers doesn't leave an empty section. */}
      {((rewardTiersData?.earned.length ?? 0) + (rewardTiersData?.locked.length ?? 0) > 0) && (
        <>
          <Text className="text-xs font-medium text-ink-soft uppercase tracking-wider mb-2">
            {lang === 'en' ? 'Rewards' : 'Mga Reward'}
          </Text>
          <View className="bg-white rounded-2xl border border-cream-200 p-4 mb-4">
            {(rewardTiersData?.earned ?? []).map((tier, i, arr) => (
              <View
                key={`earned-${tier.id}`}
                className={`flex-row items-center gap-3 py-2.5 ${
                  i < arr.length - 1 || (rewardTiersData?.locked.length ?? 0) > 0 ? 'border-b border-cream-200' : ''
                }`}
              >
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: '#EFF4EC' }}>
                  <Text style={{ fontSize: 18 }}>{tier.icon || '🎁'}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-ink">{tier.title}</Text>
                  <Text className="text-xs text-ink-soft">{rewardSummary(tier, lang)}</Text>
                </View>
                {tier.redeemed_at ? (
                  <View className="rounded-full bg-leaf-50 px-2 py-0.5">
                    <Text className="text-xs font-semibold text-leaf-700">✓</Text>
                  </View>
                ) : tier.boostable_target === 'tindahan' ? (
                  <Pressable
                    onPress={() => router.push('/my-stores' as any)}
                    className="rounded-full bg-gold-100 px-3 py-1 active:opacity-70"
                  >
                    <Text className="text-xs font-semibold text-gold-700">{lang === 'en' ? 'Use' : 'Gamitin'}</Text>
                  </Pressable>
                ) : (
                  <Text className="text-xs text-ink-soft text-right" style={{ maxWidth: 90 }}>
                    {lang === 'en' ? 'Use on a recipe you own' : 'Gamitin sa sarili mong recipe'}
                  </Text>
                )}
              </View>
            ))}
            {(rewardTiersData?.locked ?? []).map((tier, i, arr) => (
              <View
                key={`locked-${tier.id}`}
                className={`flex-row items-center gap-3 py-2.5 ${i < arr.length - 1 ? 'border-b border-cream-200' : ''}`}
                style={{ opacity: 0.55 }}
              >
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: '#F9EDD3' }}>
                  <Text style={{ fontSize: 18 }}>{tier.icon || '🎁'}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-ink-soft">{tier.title}</Text>
                  <Text className="text-xs text-ink-soft">{rewardSummary(tier, lang)}</Text>
                </View>
                <Text className="text-xs text-gold-500 font-medium">
                  {tier.tasks_required > 0 ? `${tier.tasks_completed}/${tier.tasks_required}` : `${tier.xp_threshold} XP`}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

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
            <View className="w-[43px] h-[43px] rounded-full bg-leaf-50 items-center justify-center">
              {entry.user.avatar ? (
                <Image source={{ uri: `${API_URL}${entry.user.avatar}` }} className="w-[43px] h-[43px] rounded-full" />
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

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function AwardsScreen() {
  const { user, signOut, refreshUser } = useAuth();
  const { t, lang } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const qc = useQueryClient();

  const { data: tasksData, isLoading: loadingTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn:  fetchTasks,
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

  const { data: rewardTiersData } = useQuery({
    queryKey: ['reward-tiers'],
    queryFn:  fetchRewardTiers,
    staleTime: 60_000,
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
      qc.invalidateQueries({ queryKey: ['tasks'] }),
      qc.invalidateQueries({ queryKey: ['leaderboard'] }),
      qc.invalidateQueries({ queryKey: ['user-stats'] }),
      qc.invalidateQueries({ queryKey: ['reward-tiers'] }),
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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#386641" colors={['#386641']} />
      }
    >
      <ThemedSection
        sectionKey="header_hero"
        compiledImage={require('@/assets/profile-header-food.jpg')}
        compiledOverlayColors={['rgba(231,101,59,0.96)', 'rgba(231,101,59,0.78)', 'rgba(231,101,59,0.55)']}
      >
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
                <Image source={{ uri: avatarUri }} style={{ width: 101, height: 101, borderRadius: 9999, backgroundColor: '#F0DEBB' }} />
              ) : (
                <View style={{ width: 101, height: 101, borderRadius: 9999, backgroundColor: '#EC8156', alignItems: 'center', justifyContent: 'center' }}>
                  <Text className="text-2xl font-semibold text-white">{initials(user?.name ?? 'U')}</Text>
                </View>
              )}
            </View>
            <View className="absolute -bottom-1 -right-1 rounded-full px-2 py-0.5 border-2" style={{ backgroundColor: '#386641', borderColor: '#FFFCF5' }}>
              {uploading
                ? <ActivityIndicator color="white" size="small" />
                : <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 13, color: '#fff' }}>Lv.{myLevel}</Text>
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
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: sellerPlanActive ? '#fff' : '#000000' }}>{planPillLabel}</Text>
            </View>
            <View className="rounded-full px-3.5 py-1.5" style={{ backgroundColor: '#FFFCF5' }}>
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#000000' }}>🔥 {user?.streak_days ?? 0}d</Text>
            </View>
            <View className="rounded-full px-3.5 py-1.5" style={{ backgroundColor: '#FFFCF5' }}>
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#000000' }}>⚡ Lv.{myLevel}</Text>
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
      </ThemedSection>

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
            <Text className="text-xs font-semibold text-gold-600">🏅 {stats?.achievements_count ?? 0}</Text>
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

      {/* Saved recipes moved to Profile > Saved Recipes — this screen is
          Awards-only now, so there's no more tab switcher here. */}
      <AwardsTab
        tasksData={tasksData}
        loadingTasks={loadingTasks}
        leaderData={leaderData}
        loadingLb={loadingLb}
        stats={stats}
        rewardTiersData={rewardTiersData}
      />

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
