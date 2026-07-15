import client from '@/src/api/client';
import { Skeleton, SkeletonPostCard } from '@/src/components/Skeleton';
import { API_URL } from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { useLanguage } from '@/src/context/LanguageContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

// ─── Types ─────────────────────────────────────────────────────────────────────

type PublicUser = {
  id: number; name: string; username: string | null; bio: string | null;
  avatar: string | null; level: number; xp: number; plan: string;
  municipality: string | null;
  followers_count: number; following_count: number;
  is_following: boolean; is_me: boolean;
};

type PostUser = { id: number; name: string; username: string | null; avatar: string | null };

type Post = {
  id: number; user_id: number; user: PostUser;
  post_type: 'recipe_share' | 'price_tip' | 'budget_win' | 'general';
  body: string; images: string[] | null;
  puso_count: number; comments_count: number;
  has_reacted: boolean; created_at: string;
};

type UserStore = {
  id: number;
  name: string;
  type: string | null;
  barangay: string | null;
  municipality: string | null;
  photo: string | null;
  is_verified: boolean;
  item_count: number;
  last_updated: string | null;
};

type ProfileResponse = {
  user: PublicUser;
  stores?: UserStore[];
  posts: { data: Post[]; current_page: number; last_page: number };
  posts_count?: number;
  shared_recipes_count?: number;
};

const STORE_TYPE_EMOJI: Record<string, string> = {
  palengke: '\ud83c\udfea',
  wet_market: '\ud83c\udfea',
  supermarket: '\ud83c\udfec',
  grocery: '\ud83c\udfec',
  tindahan: '\ud83d\uded2',
};

// ─── Constants ─────────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { labelEn: string; labelTl: string; bg: string; text: string; emoji: string }> = {
  recipe_share: { labelEn: 'Recipe',     labelTl: 'Recipe',     bg: '#FDEFC9', text: '#9A6A12', emoji: '🍲' },
  price_tip:    { labelEn: 'Price Tip',  labelTl: 'Presyo',     bg: '#EFF4EC', text: '#386641', emoji: '💰' },
  budget_win:   { labelEn: 'Budget Win', labelTl: 'Budget Win', bg: '#EFF4EC', text: '#2C5234', emoji: '🏆' },
  general:      { labelEn: 'General',    labelTl: 'General',    bg: '#F9EDD3', text: '#000000', emoji: '💬' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
}

function timeAgo(iso: string, lang: 'en' | 'tl' = 'tl'): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1)  return lang === 'en' ? 'Just now' : 'Kakapost';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d` : new Date(iso).toLocaleDateString('default', { month: 'short', day: 'numeric' });
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function UserProfileScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const { user: me } = useAuth();
  const { lang } = useLanguage();
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery<ProfileResponse>({
    queryKey: ['user-profile', id],
    queryFn:  () => client.get(`/users/${id}`).then((r) => r.data),
    staleTime: 60_000,
  });

  const { mutate: follow,   isPending: following }  = useMutation({
    mutationFn: () => client.post(`/users/${id}/follow`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['user-profile', id] }),
  });

  const { mutate: unfollow, isPending: unfollowing } = useMutation({
    mutationFn: () => client.delete(`/users/${id}/follow`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['user-profile', id] }),
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-cream-50">
        <View style={{ padding: 16, alignItems: 'center', paddingTop: 72 }}>
          <Skeleton style={{ width: 84, height: 84, marginBottom: 12 }} radius={42} />
          <Skeleton style={{ height: 16, width: 150, marginBottom: 8 }} />
          <Skeleton style={{ height: 11, width: 90, marginBottom: 18 }} />
          <Skeleton style={{ height: 58, width: '100%', marginBottom: 12 }} radius={14} />
          <Skeleton style={{ height: 40, width: '100%' }} radius={12} />
        </View>
        <View style={{ paddingHorizontal: 16 }}>
          <SkeletonPostCard />
        </View>
      </View>
    );
  }

  if (!data) return null;

  const { user, posts } = data;
  const stores = data.stores ?? [];
  const postsCount   = data.posts_count   ?? posts.data.length;
  const recipesCount = data.shared_recipes_count ?? 0;
  const avatarUri = user.avatar ? `${API_URL}${user.avatar}` : null;

  const renderPost = ({ item: post }: { item: Post }) => {
    const meta = TYPE_META[post.post_type] ?? TYPE_META.general;
    return (
      <View className="bg-white rounded-2xl border border-cream-200 p-4 mb-3 mx-4">
        <View className="flex-row items-center justify-between mb-2">
          <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: meta.bg }}>
            <Text className="text-xs font-semibold" style={{ color: meta.text }}>
              {meta.emoji} {lang === 'en' ? meta.labelEn : meta.labelTl}
            </Text>
          </View>
          <Text className="text-xs text-ink-soft">{timeAgo(post.created_at, lang)}</Text>
        </View>
        <Text className="text-sm text-ink leading-5 mb-2">{post.body}</Text>

        {Array.isArray(post.images) && post.images.length > 0 && (
          post.images.length === 1 ? (
            <Image
              source={{ uri: post.images[0] }}
              className="w-full rounded-xl mb-2"
              style={{ height: 180, resizeMode: 'cover' }}
            />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-2"
              style={{ marginHorizontal: -16 }}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            >
              {post.images.map((uri, i) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={{ width: 150, height: 130, borderRadius: 10, resizeMode: 'cover' }}
                />
              ))}
            </ScrollView>
          )
        )}

        <View className="flex-row gap-4 mt-1">
          <View className="flex-row items-center gap-1.5">
            <Text style={{ fontSize: 14 }}>❤️</Text>
            <Text className="text-xs text-ink-soft">{post.puso_count}</Text>
          </View>
          <Pressable
            onPress={() => router.push(`/post/${post.id}` as any)}
            className="flex-row items-center gap-1.5 active:opacity-70"
          >
            <Text style={{ fontSize: 14 }}>💬</Text>
            <Text className="text-xs text-ink-soft">{post.comments_count}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-cream-50">
      {/* Header */}
      <View
        className="px-4 pt-12 pb-4 bg-white border-b border-cream-200"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} className="active:opacity-60">
          <Text style={{ fontSize: 20 }}>←</Text>
        </Pressable>
        <Text className="text-base font-medium text-ink flex-1">
          {user.username ? `@${user.username}` : user.name}
        </Text>
      </View>

      <FlatList
        data={posts.data}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPost}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#386641" />}
        ListHeaderComponent={
          <View>
            {/* Profile card */}
            <View className="bg-white p-5 mb-3 border-b border-cream-200">
              <View className="flex-row gap-4 items-center mb-4">
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} className="w-[72px] h-[72px] rounded-full bg-cream-300" />
                ) : (
                  <View className="w-[72px] h-[72px] rounded-full bg-leaf-50 items-center justify-center">
                    <Text className="text-xl font-semibold text-ink">{initials(user.name)}</Text>
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-base font-medium text-ink">{user.name}</Text>
                  {user.username && <Text className="text-xs text-ink-soft">@{user.username}</Text>}
                  <View className="flex-row gap-2 mt-1.5">
                    <View className="rounded-full bg-leaf-50 px-2.5 py-0.5">
                      <Text className="text-xs font-semibold text-leaf-700">Lv.{user.level}</Text>
                    </View>
                    {user.plan === 'premium' && (
                      <View className="rounded-full bg-amber-50 px-2.5 py-0.5">
                        <Text className="text-xs font-semibold text-amber-700">⭐ Premium</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {user.bio ? (
                <Text className="text-sm text-ink-soft leading-5 mb-4">{user.bio}</Text>
              ) : null}

              {/* Stats */}
              <View className="flex-row gap-4 mb-4">
                <View className="items-center flex-1">
                  <Text className="text-base font-semibold text-ink">{user.followers_count}</Text>
                  <Text className="text-xs text-ink-soft">Followers</Text>
                </View>
                <View className="w-px bg-cream-200" />
                <View className="items-center flex-1">
                  <Text className="text-base font-semibold text-ink">{user.following_count}</Text>
                  <Text className="text-xs text-ink-soft">Following</Text>
                </View>
                <View className="w-px bg-cream-200" />
                <View className="items-center flex-1">
                  <Text className="text-base font-semibold text-ink">{postsCount}</Text>
                  <Text className="text-xs text-ink-soft">Posts</Text>
                </View>
                <View className="w-px bg-cream-200" />
                <View className="items-center flex-1">
                  <Text className="text-base font-semibold text-ink">{recipesCount}</Text>
                  <Text className="text-xs text-ink-soft">Recipes</Text>
                </View>
              </View>

              {/* Follow / Message button */}
              {user.is_me ? (
                <Pressable
                  onPress={() => router.push('/settings' as any)}
                  className="w-full rounded-xl border border-cream-300 py-2.5 items-center active:opacity-70"
                >
                  <Text className="text-xs font-medium text-ink-soft">✏️ Edit Profile</Text>
                </Pressable>
              ) : user.is_following ? (
                <Pressable
                  onPress={() => unfollow()}
                  disabled={unfollowing}
                  className="w-full rounded-xl border border-cream-300 py-2.5 items-center active:opacity-70"
                >
                  {unfollowing
                    ? <ActivityIndicator color="#386641" size="small" />
                    : <Text className="text-xs font-medium text-ink-soft">✓ Following</Text>
                  }
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => follow()}
                  disabled={following}
                  className="w-full rounded-xl bg-brand-600 py-2.5 items-center active:opacity-80"
                >
                  {following
                    ? <ActivityIndicator color="white" size="small" />
                    : <Text className="text-xs font-semibold text-white">+ Follow</Text>
                  }
                </Pressable>
              )}
            </View>

            {/* Stores owned by this user */}
            {stores.length > 0 && (
              <View className="mb-3">
                <Text className="text-xs font-medium text-ink-soft uppercase tracking-wider px-4 mb-2">
                  {lang === 'en' ? (stores.length > 1 ? 'Stores' : 'Store') : 'Tindahan'}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingBottom: 4 }}
                >
                  {stores.map((st) => (
                    <Pressable
                      key={st.id}
                      onPress={() => router.push(`/stall/${st.id}` as any)}
                      className="bg-white rounded-2xl border border-cream-200 active:opacity-75"
                      style={{ width: 170, padding: 14 }}
                    >
                      {st.photo ? (
                        <Image
                          source={{ uri: `${API_URL}${st.photo}` }}
                          style={{ width: 34, height: 34, borderRadius: 17, marginBottom: 6, backgroundColor: '#F9EDD3' }}
                        />
                      ) : (
                        <Text style={{ fontSize: 24, marginBottom: 6 }}>
                          {STORE_TYPE_EMOJI[st.type ?? ''] ?? '\ud83d\uded2'}
                        </Text>
                      )}
                      <Text
                        style={{ fontFamily: 'Baloo2_700Bold', fontSize: 14, color: '#000000', marginBottom: 2 }}
                        numberOfLines={2}
                      >
                        {st.name}{st.is_verified ? ' \u2705' : ''}
                      </Text>
                      <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }} numberOfLines={1}>
                        {[st.barangay, st.municipality].filter(Boolean).join(', ')}
                      </Text>
                      <View className="flex-row items-center justify-between mt-2">
                        <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#4E7A47' }}>
                          {st.item_count} {lang === 'en' ? 'items' : 'items'}
                        </Text>
                        {st.last_updated ? (
                          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
                            {timeAgo(st.last_updated, lang)}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text className="text-xs font-medium text-ink-soft uppercase tracking-wider px-4 mb-2">
              Posts
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center pt-12 px-8">
            <Text style={{ fontSize: 32, marginBottom: 12 }}>💬</Text>
            <Text className="text-sm text-ink-soft text-center">No posts yet.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 4 }}
      />
    </View>
  );
}
