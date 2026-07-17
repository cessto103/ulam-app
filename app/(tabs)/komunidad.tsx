import client, { API_URL } from '@/src/api/client';
import HeartReactButton from '@/src/components/HeartReactButton';
import { SkeletonPostCard } from '@/src/components/Skeleton';
import { useLanguage } from '@/src/context/LanguageContext';
import RecipeCoverPhoto from '@/src/components/recipe/RecipeCoverPhoto';
import { type CollageStyle, type FontKey, type GradientKey } from '@/src/types/recipe';
import { formatCount } from '@/src/utils/formatCount';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import GradientPageHeader from '@/src/components/GradientPageHeader';
import HeaderIconRow from '@/src/components/HeaderIconRow';

type PostUser = { id: number; name: string; username: string | null; avatar: string | null };

type EmbeddedRecipe = {
  id: number;
  title: string;
  image_url: string | null;
  image_urls: string[] | null;
  collage_style: CollageStyle | null;
  gradient_key: GradientKey | null;
  font_key: FontKey | null;
  budget_tag: string;
  estimated_cost: number;
};

type Post = {
  id: number;
  user_id: number;
  user: PostUser;
  post_type: 'recipe_share' | 'price_tip' | 'budget_win' | 'general';
  body: string;
  images: string[] | null;
  recipe_id: number | null;
  recipe: EmbeddedRecipe | null;
  puso_count: number;
  comments_count: number;
  views_count: number;
  has_reacted: boolean;
  has_saved: boolean;
  created_at: string;
};

type FeedResponse = { data: Post[]; current_page: number; last_page: number };

type FeedMode = 'all' | 'following';

const TYPE_FILTERS: { label: string; value: string | null }[] = [
  { label: 'All',          value: null },
  { label: 'Recipes',      value: 'recipe_share' },
  { label: 'Price Tips',   value: 'price_tip' },
  { label: 'Budget Win',   value: 'budget_win' },
  { label: 'General',      value: 'general' },
];

const BUDGET_LABEL: Record<string, string> = {
  budget_100: '₱100', budget_200: '₱200', budget_400: '₱400',
  budget_600: '₱600', budget_800: '₱800', budget_1000: '₱1,000', budget_1000plus: '₱1,000+',
};

const TYPE_META: Record<string, { label: string; bg: string; text: string; emoji: string }> = {
  recipe_share: { label: 'Recipe',     bg: '#EFF4EC', text: '#386641', emoji: '🍲' },
  price_tip:    { label: 'Price Tip',  bg: '#EFF4EC', text: '#386641', emoji: '💰' },
  budget_win:   { label: 'Budget Win', bg: '#EFF4EC', text: '#2C5234', emoji: '🏆' },
  general:      { label: 'General',    bg: '#F9EDD3', text: '#000000', emoji: '💬' },
};

function timeAgo(iso: string, lang: 'en' | 'tl'): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1)  return lang === 'en' ? 'Just now' : 'Kakapost';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d`;
  return new Date(iso).toLocaleDateString('default', { month: 'short', day: 'numeric' });
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
}

async function fetchFeed(type: string | null, mode: FeedMode, page = 1): Promise<FeedResponse> {
  const params = new URLSearchParams({ page: String(page) });
  if (type) params.set('type', type);
  if (mode === 'following') params.set('following', '1');
  const { data } = await client.get(`/community/feed?${params}`);
  return data;
}

// Extracted + memoized so an unrelated re-render of KomunidadScreen (a
// puso tap on ANY post, a filter/tab change, the header collapse ticking)
// doesn't force every visible post card to tear down and rebuild — only
// the specific card whose own data actually changed re-renders. Depends
// on the callback props staying referentially stable (useCallback in the
// parent) for the memo comparison to actually pay off.
const PostCard = memo(function PostCard({
  post,
  lang,
  reacted,
  pusoCount,
  onPress,
  onUserPress,
  onRecipePress,
  onTogglePuso,
}: {
  post: Post;
  lang: 'en' | 'tl';
  reacted: boolean;
  pusoCount: number;
  onPress: (id: number) => void;
  onUserPress: (userId: number) => void;
  onRecipePress: (recipeId: number) => void;
  onTogglePuso: (id: number) => void;
}) {
  const meta = TYPE_META[post.post_type] ?? TYPE_META.general;
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  return (
    <Pressable
      onPress={() => onPress(post.id)}
      className="bg-white rounded-2xl border border-cream-200 p-4 mb-3 mx-4 active:opacity-95"
    >
      <View className="flex-row items-center gap-3 mb-3">
        <Pressable
          onPress={() => onUserPress(post.user.id)}
          className="w-12 h-12 rounded-full bg-cream-200 items-center justify-center overflow-hidden active:opacity-70"
        >
          {post.user.avatar ? (
            <Image source={{ uri: `${API_URL}${post.user.avatar}` }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <Text className="text-xs font-semibold text-ink">
              {initials(post.user.name)}
            </Text>
          )}
        </Pressable>
        <Pressable
          className="flex-1 active:opacity-70"
          onPress={() => onUserPress(post.user.id)}
        >
          <Text className="text-sm font-medium text-ink">{post.user.name}</Text>
          <Text className="text-xs text-ink-soft">{timeAgo(post.created_at, lang)}</Text>
        </Pressable>
        <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: meta.bg }}>
          <Text className="text-xs font-semibold" style={{ color: meta.text }}>
            {meta.emoji} {meta.label}
          </Text>
        </View>
      </View>

      {post.body.trim() && post.body.trim() !== ' ' && (
        <Text className="text-sm text-ink leading-5 mb-3" numberOfLines={6}>{post.body.trim()}</Text>
      )}

      {/* Embedded recipe card — uses RecipeCoverPhoto header style */}
      {post.recipe && (
        <Pressable
          onPress={(e) => { e.stopPropagation(); onRecipePress(post.recipe!.id); }}
          style={{ borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#F0DEBB', marginBottom: 12 }}
        >
          {/* Cover — clipped to 150px so it matches the card width */}
          <View style={{ height: 150, overflow: 'hidden' }}>
            <RecipeCoverPhoto
              photos={post.recipe.image_urls ?? (post.recipe.image_url ? [post.recipe.image_url] : [])}
              collageStyle={post.recipe.collage_style ?? 'gradient'}
              gradientKey={post.recipe.gradient_key ?? 'grad_a'}
              fontKey={post.recipe.font_key ?? 'baloo'}
              title={post.recipe.title}
            />
          </View>
          {/* Footer bar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' }}>
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: '#000000', flex: 1 }} numberOfLines={1}>
              {post.recipe.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 }}>
              <View style={{ borderRadius: 999, backgroundColor: '#EFF4EC', paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#386641' }}>
                  {BUDGET_LABEL[post.recipe.budget_tag] ?? post.recipe.budget_tag}
                </Text>
              </View>
              <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#386641' }}>View →</Text>
            </View>
          </View>
        </Pressable>
      )}

      {/* Post images — tap to view enlarged */}
      {Array.isArray(post.images) && post.images.length > 0 && (
        post.images.length === 1 ? (
          <Pressable onPress={(e) => { e.stopPropagation(); setLightboxUri(post.images![0]); }}>
            <Image
              source={{ uri: post.images[0] }}
              className="w-full rounded-xl mb-3"
              style={{ height: 200, resizeMode: 'cover' }}
            />
          </Pressable>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-3"
            style={{ marginHorizontal: -16 }}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {post.images.map((uri, i) => (
              <Pressable key={i} onPress={(e) => { e.stopPropagation(); setLightboxUri(uri); }}>
                <Image
                  source={{ uri }}
                  style={{ width: 160, height: 140, borderRadius: 10, resizeMode: 'cover' }}
                />
              </Pressable>
            ))}
          </ScrollView>
        )
      )}

      <View className="flex-row gap-5 pt-1">
        <HeartReactButton
          reacted={reacted}
          count={pusoCount}
          onPress={(e) => { e.stopPropagation(); onTogglePuso(post.id); }}
        />
        <View className="flex-row items-center gap-1.5">
          <Text style={{ fontSize: 16 }}>💬</Text>
          <Text className="text-xs text-ink-soft">{post.comments_count ?? 0}</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="eye-outline" size={14} color="#B0A18C" />
          <Text className="text-xs text-ink-soft">{formatCount(post.views_count ?? 0)}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Text style={{ fontSize: 13, color: '#6F655A', alignSelf: 'center' }}>Read more →</Text>
      </View>

      <Modal visible={!!lightboxUri} transparent animationType="fade" onRequestClose={() => setLightboxUri(null)}>
        <Pressable
          onPress={() => setLightboxUri(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' }}
        >
          {lightboxUri && (
            <Image
              source={{ uri: lightboxUri }}
              style={{ width: Dimensions.get('window').width, height: Dimensions.get('window').height * 0.75, resizeMode: 'contain' }}
            />
          )}
          <Pressable
            onPress={() => setLightboxUri(null)}
            hitSlop={12}
            style={{ position: 'absolute', top: 50, right: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>
    </Pressable>
  );
});

export default function KomunidadScreen() {
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const { lang }      = useLanguage();

  const [feedMode, setFeedMode]         = useState<FeedMode>('all');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [page, setPage]                 = useState(1);
  const [allPosts, setAllPosts]         = useState<Post[]>([]);
  const [lastPage, setLastPage]         = useState(1);

  const [reactedIds, setReactedIds]  = useState<Set<number>>(new Set());
  const [pusoCounts, setPusoCounts]  = useState<Record<number, number>>({});
  const pendingReact                 = useRef<Set<number>>(new Set());

  // Collapsing header: the title/subtitle portion shrinks away on scroll-down,
  // letting the All/Following tabs and filter chips ride up to sit right below
  // the pinned logo/avatar row, then everything slides back down at the top.
  // Both the header and the tabs/filters block are absolutely positioned
  // overlays on top of the FlatList — never layout siblings of it — so
  // animating them never resizes the FlatList's own box while it's being
  // actively scrolled (that was causing the scroll jitter).
  //
  // Unlike Prices (a plain ScrollView), this list virtualizes/recycles cells
  // as you scroll, which keeps the JS thread busy enough that a continuous
  // scroll-position-driven interpolation (height/top can't run on the native
  // thread) visibly lags and jumps. Snapping between two states past a
  // threshold — a single short Animated.timing per crossing, not one update
  // per scroll frame — sidesteps that instead of fighting it.
  const COLLAPSE_THRESHOLD = 40;
  const [headerHeight, setHeaderHeight]         = useState<number | null>(null);
  const [pinnedHeight, setPinnedHeight]         = useState<number | null>(null);
  const [tabsFilterHeight, setTabsFilterHeight] = useState(0);
  const collapseProgress = useRef(new Animated.Value(0)).current;
  const isCollapsedRef   = useRef(false);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const shouldCollapse = e.nativeEvent.contentOffset.y > COLLAPSE_THRESHOLD;
    if (shouldCollapse !== isCollapsedRef.current) {
      isCollapsedRef.current = shouldCollapse;
      Animated.timing(collapseProgress, {
        toValue: shouldCollapse ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }).start();
    }
  }, [collapseProgress]);

  // The header's own height stays `undefined` (auto-size) until measured —
  // constraining it to 0 pre-measurement stops its child from ever reporting
  // a natural size via onLayout, so headerHeight would never leave null.
  const animatedHeaderHeight = (headerHeight != null && pinnedHeight != null)
    ? collapseProgress.interpolate({ inputRange: [0, 1], outputRange: [headerHeight, pinnedHeight] })
    : undefined;
  // The tabs/filters row's `top`, unlike the header's own height, always
  // needs a concrete number (it's a position, not a self-measured box).
  const tabsOverlayTop = animatedHeaderHeight ?? (headerHeight ?? 0);
  const contentTopPadding = (headerHeight ?? 0) + tabsFilterHeight;

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['community-feed', feedMode, activeFilter, page],
    queryFn: () => fetchFeed(activeFilter, feedMode, page),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!data) return;
    if (page === 1) {
      setAllPosts(data.data);
      setReactedIds(new Set(data.data.filter((p) => p.has_reacted).map((p) => p.id)));
      setPusoCounts(Object.fromEntries(data.data.map((p) => [p.id, p.puso_count])));
    } else {
      setAllPosts((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        const newPosts = data.data.filter((p) => !ids.has(p.id));
        setPusoCounts((c) => ({
          ...c,
          ...Object.fromEntries(newPosts.map((p) => [p.id, p.puso_count])),
        }));
        return [...prev, ...newPosts];
      });
    }
    setLastPage(data.last_page);
  }, [data, page]);

  const changeFilter = (val: string | null) => {
    setActiveFilter(val);
    setPage(1);
    setAllPosts([]);
  };

  const changeFeedMode = (mode: FeedMode) => {
    setFeedMode(mode);
    setActiveFilter(null);
    setPage(1);
    setAllPosts([]);
  };

  const onRefresh = useCallback(() => {
    setPage(1);
    setAllPosts([]);
    queryClient.removeQueries({ queryKey: ['community-feed', feedMode, activeFilter] });
    refetch();
  }, [feedMode, activeFilter, queryClient, refetch]);

  // Stable identity (no closure over reactedIds — read via the setter's
  // updater instead) so it can be passed straight into PostCard's memo().
  const togglePuso = useCallback(async (postId: number) => {
    if (pendingReact.current.has(postId)) return;
    pendingReact.current.add(postId);

    let wasReacted = false;
    setReactedIds((prev) => {
      wasReacted = prev.has(postId);
      const next = new Set(prev);
      wasReacted ? next.delete(postId) : next.add(postId);
      return next;
    });
    setPusoCounts((prev) => ({
      ...prev,
      [postId]: Math.max(0, (prev[postId] ?? 0) + (wasReacted ? -1 : 1)),
    }));

    try {
      await client.post(`/community/post/${postId}/react`);
    } catch {
      setReactedIds((prev) => {
        const next = new Set(prev);
        wasReacted ? next.add(postId) : next.delete(postId);
        return next;
      });
      setPusoCounts((prev) => ({
        ...prev,
        [postId]: Math.max(0, (prev[postId] ?? 0) + (wasReacted ? 1 : -1)),
      }));
    } finally {
      pendingReact.current.delete(postId);
    }
  }, []);

  // Stable callback identities — required for PostCard's memo() to
  // actually skip re-rendering unaffected cards.
  const navigateToPost   = useCallback((id: number) => router.push(`/post/${id}` as any), [router]);
  const navigateToUser   = useCallback((userId: number) => router.push(`/user/${userId}` as any), [router]);
  const navigateToRecipe = useCallback((recipeId: number) => router.push(`/recipe/${recipeId}` as any), [router]);

  const renderPost = useCallback(({ item: post }: { item: Post }) => (
    <PostCard
      post={post}
      lang={lang}
      reacted={reactedIds.has(post.id)}
      pusoCount={pusoCounts[post.id] ?? post.puso_count}
      onPress={navigateToPost}
      onUserPress={navigateToUser}
      onRecipePress={navigateToRecipe}
      onTogglePuso={togglePuso}
    />
  ), [lang, reactedIds, pusoCounts, navigateToPost, navigateToUser, navigateToRecipe, togglePuso]);

  return (
    <View className="flex-1" style={{ backgroundColor: '#FFF8E8' }}>
      <FlatList
        data={allPosts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPost}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && page === 1}
            onRefresh={onRefresh}
            tintColor="#386641"
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
              {[0, 1, 2].map((i) => <SkeletonPostCard key={i} />)}
            </View>
          ) : feedMode === 'following' ? (
            <View style={{ alignItems: 'center', paddingTop: 64, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>👥</Text>
              <Text className="text-sm text-ink-soft text-center">
                You're not following anyone yet.{'\n'}Tap a user's name in the All tab to follow them.
              </Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingTop: 64, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>💬</Text>
              <Text className="text-sm text-ink-soft text-center">
                No posts yet. Be the first to share a price tip!
              </Text>
              <Pressable
                onPress={() => router.push('/create-post' as any)}
                className="mt-4 rounded-xl bg-brand-600 px-5 py-3"
              >
                <Text className="text-sm font-semibold text-white">Post now</Text>
              </Pressable>
            </View>
          )
        }
        ListFooterComponent={
          allPosts.length > 0 && page < lastPage ? (
            <Pressable
              onPress={() => setPage((p) => p + 1)}
              disabled={isFetching}
              className="mx-4 mb-8 rounded-xl border border-cream-300 py-3 items-center active:opacity-70"
            >
              {isFetching ? (
                <ActivityIndicator color="#386641" size="small" />
              ) : (
                <Text className="text-xs font-medium text-ink-soft">Load more</Text>
              )}
            </Pressable>
          ) : (
            <View style={{ height: 32 }} />
          )
        }
        contentContainerStyle={{ paddingTop: contentTopPadding + 4, paddingBottom: 12 }}
        onScroll={handleScroll}
        scrollEventThrottle={100}
      />

      {/* Collapsing header — absolute overlay, never a layout sibling of the
          FlatList, so animating it can't disturb the list's own scroll gesture. */}
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: animatedHeaderHeight, overflow: 'hidden', zIndex: 2 }}>
        <View onLayout={(e) => { if (headerHeight == null) setHeaderHeight(e.nativeEvent.layout.height); }}>
          <GradientPageHeader
            title={lang === 'en' ? 'Community' : 'Komunidad'}
            subtitle={lang === 'en' ? 'Tips, prices, and favorite recipes from your neighbors.' : 'Mga tip, presyo, at paboritong recipe ng kapitbahay.'}
            rightSlot={<HeaderIconRow />}
            photo
            onTopRowLayout={(h) => { if (pinnedHeight == null) setPinnedHeight(h); }}
          />
        </View>
      </Animated.View>

      {/* Tabs + filters — also an absolute overlay, fixed height, riding up via
          `top` tracking the header's current bottom edge until it settles. */}
      <Animated.View style={{ position: 'absolute', top: tabsOverlayTop, left: 0, right: 0, zIndex: 1, backgroundColor: '#FFF8E8' }}>
        <View onLayout={(e) => setTabsFilterHeight(e.nativeEvent.layout.height)}>
          {/* Feed mode tabs (Lahat | Sinusundan) */}
          <View className="flex-row bg-cream-200 rounded-xl mx-4 p-1 mb-3 mt-1">
            {([
              { key: 'all',       icon: 'earth' as const,  label: lang === 'en' ? 'All' : 'Lahat' },
              { key: 'following', icon: 'people' as const, label: lang === 'en' ? 'Following' : 'Sinusundan' },
            ] as const).map((m) => {
              const active = feedMode === m.key;
              return (
                <Pressable
                  key={m.key}
                  onPress={() => changeFeedMode(m.key)}
                  className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2 ${active ? 'bg-olive-400' : ''}`}
                >
                  <Ionicons
                    name={active ? m.icon : (`${m.icon}-outline` as any)}
                    size={13}
                    color={active ? '#fff' : '#B0A18C'}
                  />
                  <Text style={{ fontFamily: active ? 'NunitoSans_700Bold' : 'NunitoSans_600SemiBold', fontSize: 13, color: active ? '#fff' : '#6F655A' }}>
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Type filter chips — only in "Lahat" mode */}
          {feedMode === 'all' && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}
            >
              {TYPE_FILTERS.map((f) => {
                const active = activeFilter === f.value;
                return (
                  <Pressable
                    key={f.label}
                    onPress={() => changeFilter(f.value)}
                    className={`rounded-full px-3 py-1.5 ${
                      active ? 'bg-olive-400' : 'bg-white border border-cream-300'
                    }`}
                  >
                    <Text className={`text-xs font-medium ${active ? 'text-white' : 'text-ink-soft'}`}>
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Animated.View>
    </View>
  );
}
