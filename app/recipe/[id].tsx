import ReportContentSheet from '@/src/components/ReportContentSheet';
import AndroidNavBarFiller from '@/src/components/AndroidNavBarFiller';
import client, { API_URL } from '@/src/api/client';
import { BoostBadge, BoostButton } from '@/src/components/BoostButton';
import RecipeCoverPhoto from '@/src/components/recipe/RecipeCoverPhoto';
import RewardCelebration from '@/src/components/RewardCelebration';
import { useSectionColors } from '@/src/components/ThemedSection';
import { useXpReward } from '@/src/hooks/useXpReward';
import StarRating from '@/src/components/StarRating';
import { formatCount } from '@/src/utils/formatCount';
import { getRecipePhotos } from '@/src/utils/recipePhotos';
import { Skeleton } from '@/src/components/Skeleton';
import { usePopOnActivate } from '@/src/hooks/usePopOnActivate';
import { useAuth } from '@/src/context/AuthContext';
import { useLanguage } from '@/src/context/LanguageContext';
import * as Haptics from 'expo-haptics';
import { type CollageStyle, type FontKey, type GradientKey } from '@/src/types/recipe';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;

// ─── Full-screen gallery: swipe (1-finger) + pinch-zoom (2-finger) ───────────
// No ScrollView — single PanResponder owns all touch events so there is no
// parent view to conflict with on Android.

function ZoomableGallery({
  photos,
  startIndex,
  onClose,
  onIndexChange,
}: {
  photos: string[];
  startIndex: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const idxRef   = useRef(startIndex);
  const [idx, setIdx] = useState(startIndex);

  // Strip translation (swipe between photos)
  const stripX  = useRef(new Animated.Value(-startIndex * SCREEN_W)).current;

  // Current-photo zoom + pan
  const scale   = useRef(new Animated.Value(1)).current;
  const imgTx   = useRef(new Animated.Value(0)).current;
  const imgTy   = useRef(new Animated.Value(0)).current;

  // Gesture tracking refs (never cause re-render)
  const isPinch    = useRef(false);
  const initDist   = useRef(0);
  const baseScale  = useRef(1);
  const baseTx     = useRef(0);
  const baseTy     = useRef(0);
  const isZoomed   = useRef(false);

  function pinchDist(touches: { pageX: number; pageY: number }[]) {
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function resetZoom(animated = true) {
    if (animated) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
        Animated.spring(imgTx,  { toValue: 0, useNativeDriver: true }),
        Animated.spring(imgTy,  { toValue: 0, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(1); imgTx.setValue(0); imgTy.setValue(0);
    }
    baseScale.current = 1; baseTx.current = 0; baseTy.current = 0;
    isZoomed.current  = false;
  }

  function goTo(newIdx: number) {
    if (newIdx < 0 || newIdx >= photos.length) return;
    idxRef.current = newIdx;
    setIdx(newIdx);
    onIndexChange(newIdx);
    Animated.timing(stripX, {
      toValue: -newIdx * SCREEN_W,
      duration: 220,
      useNativeDriver: true,
    }).start();
    resetZoom(false);
  }

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:        () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder:         () => true,
      onMoveShouldSetPanResponderCapture:  () => true,
      onPanResponderTerminationRequest:    () => false,

      onPanResponderGrant: (e) => {
        const t = Array.from(e.nativeEvent.touches);
        if (t.length >= 2) {
          isPinch.current   = true;
          initDist.current  = pinchDist(t);
          baseScale.current = (scale as any)._value as number;
          baseTx.current    = (imgTx as any)._value as number;
          baseTy.current    = (imgTy as any)._value as number;
        } else {
          isPinch.current = false;
        }
      },

      onPanResponderMove: (e, g) => {
        const t = Array.from(e.nativeEvent.touches);

        if (t.length >= 2) {
          // ── Pinch zoom ──────────────────────────────────────────
          if (!isPinch.current) {
            isPinch.current  = true;
            initDist.current = pinchDist(t);
            baseScale.current = (scale as any)._value as number;
          }
          if (initDist.current > 0) {
            const next = Math.max(1, Math.min(baseScale.current * (pinchDist(t) / initDist.current), 5));
            scale.setValue(next);
            isZoomed.current = next > 1.05;
          }
        } else {
          if (isPinch.current) return; // finger lifted from pinch — wait for release
          if (isZoomed.current) {
            // ── Pan while zoomed ──────────────────────────────────
            imgTx.setValue(baseTx.current + g.dx);
            imgTy.setValue(baseTy.current + g.dy);
          } else {
            // ── Swipe between photos ──────────────────────────────
            stripX.setValue(-idxRef.current * SCREEN_W + g.dx);
          }
        }
      },

      onPanResponderRelease: (_e, g) => {
        if (isPinch.current) {
          isPinch.current = false;
          const cur = (scale as any)._value as number;
          if (cur < 1.05) { resetZoom(true); }
          else {
            baseScale.current = cur;
            baseTx.current    = (imgTx as any)._value as number;
            baseTy.current    = (imgTy as any)._value as number;
          }
        } else if (isZoomed.current) {
          baseTx.current = (imgTx as any)._value as number;
          baseTy.current = (imgTy as any)._value as number;
        } else {
          // Swipe commit
          const threshold = SCREEN_W * 0.28;
          if (g.dx < -threshold && idxRef.current < photos.length - 1) {
            goTo(idxRef.current + 1);
          } else if (g.dx > threshold && idxRef.current > 0) {
            goTo(idxRef.current - 1);
          } else {
            Animated.spring(stripX, {
              toValue: -idxRef.current * SCREEN_W,
              useNativeDriver: true,
            }).start();
          }
        }
      },
    })
  ).current;

  const IMG_H = SCREEN_H * 0.78;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Photo strip */}
      <Animated.View
        {...responder.panHandlers}
        style={{
          position: 'absolute', top: 0, bottom: 0,
          width: SCREEN_W * photos.length,
          flexDirection: 'row',
          transform: [{ translateX: stripX }],
        }}
      >
        {photos.map((uri, i) => (
          <View key={i} style={{ width: SCREEN_W, height: SCREEN_H, alignItems: 'center', justifyContent: 'center' }}>
            {i === idx ? (
              <Animated.Image
                source={{ uri }}
                style={{ width: SCREEN_W, height: IMG_H, transform: [{ scale }, { translateX: imgTx }, { translateY: imgTy }] }}
                resizeMode="contain"
              />
            ) : (
              <Image source={{ uri }} style={{ width: SCREEN_W, height: IMG_H }} resizeMode="contain" />
            )}
          </View>
        ))}
      </Animated.View>

      {/* Close button */}
      <Pressable
        onPress={onClose}
        style={{ position: 'absolute', top: 48, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}
        hitSlop={12}
      >
        <Ionicons name="close" size={20} color="#fff" />
      </Pressable>

      {/* Dot indicators */}
      {photos.length > 1 && (
        <View style={{ position: 'absolute', bottom: 32, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          {photos.map((_, i) => (
            <View key={i} style={{ width: i === idx ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === idx ? '#fff' : 'rgba(255,255,255,0.35)' }} />
          ))}
        </View>
      )}

      {/* Hint */}
      <View style={{ position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center' }}>
        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>Pinch to zoom · Swipe to navigate</Text>
      </View>
    </View>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Ingredient = { id: number; name: string; quantity: string; unit: string; estimated_price: number };
type Recipe = {
  id: number;
  user_id: number | null;
  user?: { id: number; name: string; username: string | null };
  title: string;
  description: string;
  source: 'official' | 'community';
  difficulty?: string;
  budget_tag: string;
  estimated_cost: number;
  servings: number;
  prep_time_minutes: number;
  cook_time_minutes: number;
  tags: string[];
  steps: string[];
  tips: string[];
  save_count: number;
  share_count: number;
  vote_up_count: number;
  vote_down_count: number;
  average_rating: number;
  ratings_count: number;
  views_count: number;
  image_url: string | null;
  image_urls: string[] | null;
  collage_style: CollageStyle;
  gradient_key: GradientKey;
  font_key: FontKey;
  youtube_url: string | null;
  is_published: boolean;
  ingredients: Ingredient[];
  created_at: string;
  updated_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([^&\n?#]{11})/);
  return match ? match[1] : null;
}

function commentInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
}

function commentTimeAgo(iso: string, lang: 'en' | 'tl' = 'tl') {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1)  return lang === 'en' ? 'Just now' : 'Kakalagay';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d` : new Date(iso).toLocaleDateString('default', { month: 'short', day: 'numeric' });
}

function commentIsEditable(iso: string) {
  return (Date.now() - new Date(iso).getTime()) < 72 * 60 * 60 * 1000;
}

// ─── Components ───────────────────────────────────────────────────────────────

function VoteButton({ icon, iconOutline, active, activeColor, count, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; iconOutline: keyof typeof Ionicons.glyphMap;
  active: boolean; activeColor: string; count: number; onPress: () => void;
}) {
  const scale = usePopOnActivate(active);
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name={active ? icon : iconOutline} size={20} color={active ? activeColor : '#B0A18C'} />
      </Animated.View>
      <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: active ? activeColor : '#B0A18C' }}>
        {count}
      </Text>
    </Pressable>
  );
}

type RecipeCommentUser = { id: number; name: string; username: string | null; avatar: string | null };
type RecipeCommentItem = {
  id: number; user_id: number; body: string; created_at: string;
  user: RecipeCommentUser;
  replies: RecipeCommentItem[];
};

function CommentAvatar({ user, size = 36 }: { user: RecipeCommentUser; size?: number }) {
  const uri = user.avatar ? `${API_URL}${user.avatar}` : null;
  return uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#EFF4EC', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.35, fontFamily: 'NunitoSans_700Bold', color: '#386641' }}>
        {commentInitials(user.name)}
      </Text>
    </View>
  );
}

function RecipeCommentRow({
  comment, myId, lang, onDelete, onEdit, onReply,
}: {
  comment: RecipeCommentItem;
  myId: number;
  lang: 'en' | 'tl';
  onDelete: (id: number) => void;
  onEdit: (id: number, currentBody: string) => void;
  onReply: (user: RecipeCommentUser) => void;
}) {
  const router = useRouter();
  const renderComment = (c: RecipeCommentItem, isReply = false) => {
    const isMine  = c.user_id === myId;
    const canEdit = isMine && commentIsEditable(c.created_at);
    const goToAuthor = () => router.push(`/user/${c.user.id}` as any);

    return (
      <View key={c.id} style={{ flexDirection: 'row', gap: 10, marginLeft: isReply ? 40 : 0, marginTop: isReply ? 8 : 0 }}>
        <Pressable onPress={goToAuthor}>
          <CommentAvatar user={c.user} size={isReply ? 38 : 43} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={{ backgroundColor: '#FFFCF5', borderRadius: 16, borderTopLeftRadius: 2, paddingHorizontal: 12, paddingVertical: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <Pressable onPress={goToAuthor} className="active:opacity-60">
                <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#000000' }}>{c.user.name}</Text>
              </Pressable>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
                  {commentTimeAgo(c.created_at, lang)}
                </Text>
                {canEdit && (
                  <Pressable onPress={() => onEdit(c.id, c.body)} hitSlop={8} className="active:opacity-60">
                    <Ionicons name="create-outline" size={13} color="#6F655A" />
                  </Pressable>
                )}
                {isMine && (
                  <Pressable onPress={() => onDelete(c.id)} hitSlop={8} className="active:opacity-60">
                    <Ionicons name="close" size={14} color="#E24B4A" />
                  </Pressable>
                )}
              </View>
            </View>
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#000000', lineHeight: 20 }}>
              {c.body}
            </Text>
          </View>
          <Pressable onPress={() => onReply(c.user)} style={{ marginLeft: 8, marginTop: 4 }} className="active:opacity-60">
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A' }}>
              {lang === 'en' ? 'Reply' : 'Tumugon'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={{ paddingVertical: 10 }}>
      {renderComment(comment)}
      {comment.replies?.map((reply) => (
        <View key={reply.id} style={{ marginTop: 8 }}>{renderComment(reply, true)}</View>
      ))}
    </View>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BUDGET_LABEL: Record<string, string> = {
  budget_100:      '₱100',
  budget_200:      '₱200',
  budget_400:      '₱400',
  budget_400plus:  '₱400+', // legacy tag from an older tier scheme -- no longer assigned to new recipes, but old ones still carry it
  budget_600:      '₱600',
  budget_800:      '₱800',
  budget_1000:     '₱1,000',
  budget_1000plus: '₱1,000+',
};

const TAG_EMOJI: Record<string, string> = {
  isda: '🐟', manok: '🍗', baboy: '🥩', baka: '🥩', gulay: '🥦',
  sabaw: '🍲', prito: '🍳', espesyal: '⭐', klasiko: '📖', mabilis: '⚡',
  masustansya: '💪', halal: '🟢', itlog: '🥚', tradisyunal: '📜',
};

// ─── Fetch ────────────────────────────────────────────────────────────────────

type SharedByPost = { id: number; user_id: number; user: { id: number; name: string; username: string | null; avatar: string | null }; created_at: string };

async function fetchRecipe(id: string) {
  const { data } = await client.get(`/recipes/${id}`);
  return data as {
    recipe: Recipe;
    is_saved: boolean;
    is_mine: boolean;
    is_boosted: boolean;
    my_rating: number | null;
    my_reaction: 'up' | 'down' | null;
    shared_by: SharedByPost[];
  };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RecipeDetailScreen() {
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const qc      = useQueryClient();
  const insets  = useSafeAreaInsets();
  const { lang } = useLanguage();

  const budgetColors   = useSectionColors('awards_stat_saved',       ['#F4B942', '#58200F']);
  const costColors     = useSectionColors('awards_stat_meal_plans',  ['#386641', '#FFFFFF']);
  const servingsColors = useSectionColors('awards_stat_posts',       ['#E7653B', '#FFFFFF']);
  const timeColors     = useSectionColors('awards_stat_achievements', ['#5E693F', '#FFFFFF']);

  const [savePending,  setSavePending]  = useState(false);
  const { reward, setReward, handleXpResponse } = useXpReward();
  const [myReaction,   setMyReaction]   = useState<'up' | 'down' | null>(null);
  const [voteUp,       setVoteUp]       = useState<number | null>(null);
  const [voteDown,     setVoteDown]     = useState<number | null>(null);
  const [myRating,     setMyRating]     = useState<number | null>(null);
  const [galleryOpen,    setGalleryOpen]    = useState(false);
  const [galleryIndex,   setGalleryIndex]   = useState(0);
  const [sharersOpen,    setSharersOpen]    = useState(false);
  const [sharers,        setSharers]        = useState<SharedByPost[]>([]);
  const [sharersLoading, setSharersLoading] = useState(false);

  // Add-to-meal-plan modal
  const [mealModal,  setMealModal]  = useState(false);
  const [mealType,   setMealType]   = useState('almusal');

  const MEAL_TYPES = [
    { key: 'almusal',    label: 'Breakfast', emoji: '🌅' },
    { key: 'tanghalian', label: 'Lunch',     emoji: '☀️' },
    { key: 'meryenda',   label: 'Snack',     emoji: '🍌' },
    { key: 'hapunan',    label: 'Dinner',    emoji: '🌙' },
    { key: 'iba pa',     label: 'Others',    emoji: '🍽️' },
  ];

  const todayIso = new Date().toISOString().slice(0, 10);

  const { mutate: assignMeal, isPending: assigning } = useMutation({
    mutationFn: (payload: { date: string; meal_type: string; recipe_id: number; estimated_cost?: number }) =>
      client.post('/meal-plan/add-item', payload),
    onSuccess: () => {
      setMealModal(false);
      qc.invalidateQueries({ queryKey: ['meal-plan-date'] });
    },
    onError: (e: any) => {
      const isDuplicate = e?.response?.status === 422;
      if (isDuplicate) {
        const slotLabel = MEAL_TYPES.find(m => m.key === mealType)?.label ?? mealType;
        Alert.alert(
          'Already in meal plan',
          `This recipe is already in your ${slotLabel} meal plan.`,
        );
      } else {
        const msg: string = e?.response?.data?.message ?? 'Could not add to meal plan.';
        Alert.alert('Error', msg);
      }
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => fetchRecipe(id!),
    enabled: !!id,
  });

  const recipe    = data?.recipe;
  const isSaved   = data?.is_saved ?? false;
  const isMine    = data?.is_mine  ?? false;
  const isBoosted = data?.is_boosted ?? false;

  useEffect(() => {
    if (data?.my_rating != null)        setMyRating(data.my_rating);
    if (data?.my_reaction !== undefined) setMyReaction(data.my_reaction);
    if (data?.recipe?.vote_up_count   != null) setVoteUp(data.recipe.vote_up_count);
    if (data?.recipe?.vote_down_count != null) setVoteDown(data.recipe.vote_down_count);
  }, [data]);

  const { mutate: rateRecipe } = useMutation({
    mutationFn: (rating: number) => client.post(`/recipes/${recipe!.id}/rate`, { rating }).then(r => r.data),
    onSuccess: (res) => {
      setMyRating(res.my_rating);
      qc.invalidateQueries({ queryKey: ['recipe', id] });
    },
    onError: () => Alert.alert('Error', 'Could not submit rating. Please try again.'),
  });

  // ── Comments ──────────────────────────────────────────────────────────────
  const { user: me } = useAuth();
  const [commentBody,     setCommentBody]     = useState('');
  const [replyTo,         setReplyTo]         = useState<RecipeCommentUser | null>(null);
  const [editCommentId,   setEditCommentId]   = useState<number | null>(null);
  const [savingComment,   setSavingComment]   = useState(false);
  const commentInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  // The comment compose row lives at the very bottom of this one long
  // ScrollView. When the keyboard shows/hides, KeyboardAvoidingView resizes
  // the ScrollView's viewport, but the ScrollView's own scroll offset doesn't
  // recompute itself — leaving stale blank space (a well-known RN Android
  // gap). Snapping to the end on both transitions keeps it flush.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      scrollRef.current?.scrollToEnd({ animated: false });
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const { data: commentsData } = useQuery<{ data: RecipeCommentItem[] }>({
    queryKey: ['recipe-comments', id],
    queryFn: () => client.get(`/recipes/${id}/comments`).then((r) => r.data),
    enabled: !!id,
  });
  const comments = commentsData?.data ?? [];

  const { mutate: submitComment, isPending: sendingComment } = useMutation({
    mutationFn: (text: string) => client.post(`/recipes/${id}/comments`, { body: text }),
    onSuccess: () => {
      setCommentBody('');
      setReplyTo(null);
      qc.invalidateQueries({ queryKey: ['recipe-comments', id] });
    },
    onError: () => Alert.alert('Error', lang === 'en' ? 'Could not send comment. Please try again.' : 'Hindi ma-send ang komento. Subukan ulit.'),
  });

  const handleSendComment = () => {
    if (editCommentId !== null) {
      saveEditComment();
      return;
    }
    const text = replyTo ? `@${replyTo.name.split(' ')[0]} ${commentBody.trim()}` : commentBody.trim();
    if (text) submitComment(text);
  };

  // Editing reuses the same bottom compose field instead of a separate
  // inline box — same pattern as the existing "replying to" state below.
  const startEditComment = (commentId: number, currentBody: string) => {
    setReplyTo(null);
    setEditCommentId(commentId);
    setCommentBody(currentBody);
    commentInputRef.current?.focus();
  };

  const cancelEditComment = () => {
    setEditCommentId(null);
    setCommentBody('');
  };

  const saveEditComment = async () => {
    if (!commentBody.trim() || !editCommentId) return;
    setSavingComment(true);
    try {
      await client.patch(`/recipe-comments/${editCommentId}`, { body: commentBody.trim() });
      qc.invalidateQueries({ queryKey: ['recipe-comments', id] });
      setEditCommentId(null);
      setCommentBody('');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? (lang === 'en' ? 'Could not edit comment.' : 'Hindi ma-edit ang komento.'));
    } finally {
      setSavingComment(false);
    }
  };

  const { mutate: deleteComment } = useMutation({
    mutationFn: (commentId: number) => client.delete(`/recipe-comments/${commentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipe-comments', id] }),
  });

  const confirmDeleteComment = (commentId: number) => {
    Alert.alert(lang === 'en' ? 'Delete this comment?' : 'I-delete ang komento?', '', [
      { text: lang === 'en' ? 'Cancel' : 'Huwag', style: 'cancel' },
      { text: lang === 'en' ? 'Delete' : 'I-delete', style: 'destructive', onPress: () => deleteComment(commentId) },
    ]);
  };

  const { mutate: deleteRecipe, isPending: isDeletingRecipe } = useMutation({
    mutationFn: () => client.delete(`/recipes/${recipe!.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes'] });
      qc.invalidateQueries({ queryKey: ['meal-plan'] });
      router.back();
    },
    onError: () => Alert.alert('Error', lang === 'en' ? 'Could not delete recipe. Please try again.' : 'Hindi na-delete ang recipe. Subukang muli.'),
  });

  const confirmDeleteRecipe = () => {
    if (!recipe) return;
    Alert.alert(
      lang === 'en' ? 'Delete this recipe?' : 'I-delete ang recipe na ito?',
      recipe.title,
      [
        { text: lang === 'en' ? 'Cancel' : 'Huwag', style: 'cancel' },
        { text: lang === 'en' ? 'Delete' : 'I-delete', style: 'destructive', onPress: () => deleteRecipe() },
      ]
    );
  };

  const toggleSave = async () => {
    if (savePending || !recipe) return;
    setSavePending(true);
    try {
      const { data } = await client.post(`/recipes/${recipe.id}/save`);
      qc.invalidateQueries({ queryKey: ['recipe', id] });
      qc.invalidateQueries({ queryKey: ['recipes'] });
      // Only the save branch returns reward fields (no XP clawback on
      // unsave), so this is a no-op on the unsave path.
      if (data?.saved) handleXpResponse(data);
    } catch {
      Alert.alert('Error', 'Could not save recipe. Please try again.');
    } finally {
      setSavePending(false);
    }
  };

  const voteRecipe = async (type: 'up' | 'down') => {
    if (!recipe) return;
    const prevReaction = myReaction;
    const prevUp   = voteUp   ?? recipe.vote_up_count;
    const prevDown = voteDown ?? recipe.vote_down_count;
    if (myReaction === type) {
      setMyReaction(null);
      if (type === 'up') setVoteUp(prevUp - 1); else setVoteDown(prevDown - 1);
    } else {
      if (myReaction === 'up')   setVoteUp(prevUp - 1);
      if (myReaction === 'down') setVoteDown(prevDown - 1);
      setMyReaction(type);
      if (type === 'up') setVoteUp(prevUp + (myReaction !== null ? 0 : 0) + 1);
      else               setVoteDown(prevDown + 1);
    }
    try {
      const res = await client.post(`/recipes/${recipe.id}/react`, { type });
      setMyReaction(res.data.my_reaction);
      qc.invalidateQueries({ queryKey: ['recipe', id] });
    } catch {
      setMyReaction(prevReaction);
      setVoteUp(prevUp);
      setVoteDown(prevDown);
    }
  };

  // Share to any social app via the OS share sheet (FB, IG, TikTok, Messenger,
  // etc — whatever the device has installed). Text-only: the full recipe
  // (ingredients/steps/tips) travels with the share regardless of which app
  // picks it up, which an attached image can't guarantee (Android's share
  // intent drops caption text alongside an image).
  const shareToSocial = async () => {
    if (!recipe) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const category = recipe.tags?.[0] ?? 'Ulam';
    const tagify = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '');
    const hashtags = `#ulam${tagify(category)} #${tagify(recipe.title)} #moreDailyUlam #uLamPH${tagify(category)}`;

    const ingredientsList = recipe.ingredients
      .map((ing) => `• ${[ing.quantity, ing.unit, ing.name].filter(Boolean).join(' ')}`)
      .join('\n');
    const stepsList = recipe.steps.map((step, i) => `${i + 1}. ${step}`).join('\n');
    const tipsList = recipe.tips?.length ? recipe.tips.map((tip) => `• ${tip}`).join('\n') : '';

    const message = [
      `🍽️ ${recipe.title}`,
      `${lang === 'en' ? 'Ingredients' : 'Sangkap'}:\n${ingredientsList}`,
      `${lang === 'en' ? 'Instructions' : 'Paraan'}:\n${stepsList}`,
      tipsList ? `Tips:\n${tipsList}` : '',
      hashtags,
      lang === 'en'
        ? 'Install uLam App at Play Store for more uLam Tips.'
        : 'I-install ang uLam App sa Play Store para sa mas maraming uLam Tips.',
    ].filter(Boolean).join('\n\n');

    try {
      await Share.share({ title: recipe.title, message });
    } catch {
      // User cancelled the share sheet — nothing to do.
    }
  };

  if (isLoading) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#fff' }}>
        {/* Cover photo skeleton */}
        <Skeleton style={{ height: 280, borderRadius: 0 }} />
        {/* Body */}
        <View style={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <Skeleton style={{ height: 22, width: 60, borderRadius: 20 }} />
            <Skeleton style={{ height: 22, width: 50, borderRadius: 20 }} />
          </View>
          <Skeleton style={{ height: 26, width: '85%', marginBottom: 8 }} />
          <Skeleton style={{ height: 15, marginBottom: 4 }} />
          <Skeleton style={{ height: 15, width: '70%', marginBottom: 20 }} />
          <Skeleton style={{ height: 1, marginBottom: 20 }} />
          {/* Ingredients */}
          {[0,1,2,3,4].map(i => (
            <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 12, alignItems: 'center' }}>
              <Skeleton style={{ width: 28, height: 28, borderRadius: 6 }} />
              <Skeleton style={{ flex: 1, height: 14 }} />
              <Skeleton style={{ width: 50, height: 14 }} />
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  if (!recipe || error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 32, marginBottom: 12 }}>😕</Text>
        <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#6F655A', textAlign: 'center' }}>Recipe not found.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16, borderRadius: 12, backgroundColor: '#C45E3A', paddingHorizontal: 24, paddingVertical: 12 }}>
          <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#fff' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const photos    = getRecipePhotos(recipe);
  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);
  const videoId   = recipe.youtube_url ? extractYouTubeId(recipe.youtube_url) : null;

  const recipeSteps: string[] = Array.isArray(recipe.steps)
    ? recipe.steps.filter(Boolean)
    : (typeof recipe.steps === 'string' ? (JSON.parse(recipe.steps) as string[]) : []);

  const wasEdited = recipe.updated_at && recipe.created_at &&
    Math.abs(new Date(recipe.updated_at).getTime() - new Date(recipe.created_at).getTime()) > 60_000;

  function editedLabel(): string {
    if (!recipe?.updated_at) return '';
    const ms   = Date.now() - new Date(recipe.updated_at).getTime();
    const days = Math.floor(ms / 86_400_000);
    if (days < 1)  { const h = Math.floor(ms / 3_600_000); return h < 1 ? 'edited just now' : `edited ${h}h ago`; }
    if (days === 1) return 'edited yesterday';
    if (days < 30)  return `edited ${days} days ago`;
    const months = Math.floor(days / 30);
    return months === 1 ? 'edited 1 month ago' : `edited ${months} months ago`;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
    <ScrollView ref={scrollRef} style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ paddingBottom: 48 }}>
      {/* Cover photo is full-bleed behind the status bar — light icons stay
          visible against it; unmounting this screen reverts to the app-wide dark style. */}
      <StatusBar style="light" />

      {/* ── Cover photo with floating nav ── */}
      <View style={{ position: 'relative' }}>
        <RecipeCoverPhoto
          height={280}
          photos={photos}
          collageStyle={recipe.collage_style ?? 'gradient'}
          gradientKey={recipe.gradient_key ?? 'grad_a'}
          fontKey={recipe.font_key ?? 'baloo'}
          title={recipe.title}
        />
        {/* Floating buttons — pushed below status bar */}
        <View style={{ position: 'absolute', top: insets.top + 4, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 }}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="arrow-back" size={18} color="#fff" />
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={shareToSocial}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="share-social-outline" size={17} color="#fff" />
            </Pressable>
            {isMine ? (
              <>
                <Pressable
                  onPress={() => router.push(`/edit-recipe/${recipe.id}` as any)}
                  style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="create-outline" size={18} color="#fff" />
                </Pressable>
                <Pressable
                  onPress={confirmDeleteRecipe}
                  disabled={isDeletingRecipe}
                  style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', opacity: isDeletingRecipe ? 0.5 : 1 }}
                >
                  <Ionicons name="trash-outline" size={17} color="#fff" />
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={() => setReportSheetOpen(true)}
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="flag-outline" size={17} color="#fff" />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* ── Title + meta ── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
        {(isBoosted || isMine) && (
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            <BoostBadge visible={isBoosted} />
            <BoostButton
              target="recipe"
              boostableId={recipe.id}
              isOwner={isMine}
              isBoosted={isBoosted}
              refetchKey={['recipe', id]}
            />
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 2 }}>
          <Text style={{ flex: 1, fontFamily: 'Baloo2_700Bold', fontSize: 22, color: '#000000', lineHeight: 28 }}>
            {recipe.title}
          </Text>
          <Pressable onPress={toggleSave} disabled={savePending} hitSlop={8} style={{ paddingTop: 2 }}>
            {savePending ? (
              <ActivityIndicator color="#6E7B4A" size="small" />
            ) : (
              <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={24} color={isSaved ? '#F4B942' : '#C45E3A'} />
            )}
          </Pressable>
        </View>
        {recipe.description ? (
          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#6F655A', lineHeight: 20, marginBottom: 8 }}>
            {recipe.description}
          </Text>
        ) : null}

        {/* Tags (category) */}
        {recipe.tags?.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {recipe.tags.map((tag) => (
              <View key={tag} style={{ borderRadius: 999, backgroundColor: '#EFF4EC', paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#5E693F' }}>
                  {TAG_EMOJI[tag] ? `${TAG_EMOJI[tag]} ` : ''}{tag}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Author */}
        {!isMine && recipe.user && (
          <Pressable
            onPress={() => router.push(`/user/${recipe.user!.id}` as any)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}
          >
            <View style={{ width: 31, height: 31, borderRadius: 15.5, backgroundColor: '#EFF4EC', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 14, fontFamily: 'NunitoSans_700Bold', color: '#5E693F' }}>
                {recipe.user.name.substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
              by <Text style={{ fontFamily: 'NunitoSans_700Bold', color: '#000000' }}>{recipe.user.name}</Text>
            </Text>
          </Pressable>
        )}
      </View>

      {/* ── Stats + Vote/Share row ── */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F9EDD3', marginTop: 12, gap: 12 }}>
        {/* Row 1: saved / views / edited — centered */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Ionicons name="bookmark-outline" size={13} color="#B0A18C" />
          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginLeft: 4 }}>
            {recipe.save_count ?? 0} {lang === 'en' ? 'saved' : 'na-save'}
          </Text>
          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#D3C5AB', marginHorizontal: 8 }}>|</Text>
          <Ionicons name="eye-outline" size={13} color="#B0A18C" />
          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginLeft: 4 }}>
            {formatCount(recipe.views_count ?? 0)} {lang === 'en' ? 'views' : 'panonood'}
          </Text>
          {wasEdited && (
            <>
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#D3C5AB', marginHorizontal: 8 }}>|</Text>
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>{editedLabel()}</Text>
            </>
          )}
        </View>

        {/* Row 2: thumbs up/down on the left, Share to community on the right */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <VoteButton
              icon="thumbs-up"
              iconOutline="thumbs-up-outline"
              active={myReaction === 'up'}
              activeColor="#5E693F"
              count={voteUp ?? recipe.vote_up_count ?? 0}
              onPress={() => voteRecipe('up')}
            />
            <VoteButton
              icon="thumbs-down"
              iconOutline="thumbs-down-outline"
              active={myReaction === 'down'}
              activeColor="#E24B4A"
              count={voteDown ?? recipe.vote_down_count ?? 0}
              onPress={() => voteRecipe('down')}
            />
          </View>
          <Pressable
            onPress={() => router.push({
              pathname: '/create-post' as any,
              params: {
                recipe_id: String(recipe.id),
                recipe_title: recipe.title,
                recipe_budget: recipe.budget_tag,
              },
            })}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              borderWidth: 1, borderColor: '#E3CA9B', borderRadius: 999,
              paddingHorizontal: 12, paddingVertical: 7,
            }}
            className="active:opacity-70"
          >
            <Ionicons name="paper-plane-outline" size={16} color="#6F655A" />
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A' }}>
              {lang === 'en' ? 'Share to community' : 'Ibahagi sa komunidad'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── Star rating ── */}
      <StarRating
        myRating={myRating}
        avgRating={recipe.average_rating ?? 0}
        count={recipe.ratings_count ?? 0}
        onRate={rateRecipe}
      />

      {/* ── Photo gallery ── */}
      {photos.length > 1 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A', paddingHorizontal: 20, marginBottom: 8 }}>
            Photos
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
          >
            {photos.map((uri, i) => (
              <Pressable
                key={i}
                onPress={() => { setGalleryIndex(i); setGalleryOpen(true); }}
              >
                <Image
                  source={{ uri }}
                  style={{ width: 180, height: 130, borderRadius: 14 }}
                  resizeMode="cover"
                />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Fullscreen gallery modal (swipe + pinch zoom) ── */}
      <Modal
        visible={galleryOpen}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setGalleryOpen(false)}
      >
        {galleryOpen && (
          <ZoomableGallery
            photos={photos}
            startIndex={galleryIndex}
            onClose={() => setGalleryOpen(false)}
            onIndexChange={setGalleryIndex}
          />
        )}
      </Modal>

      {/* ── YouTube video ── */}
      {videoId && (
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A', marginBottom: 8 }}>
            Video
          </Text>
          <Pressable
            onPress={() => Linking.openURL(recipe.youtube_url!)}
            style={{ borderRadius: 14, overflow: 'hidden' }}
          >
            <View style={{ position: 'relative' }}>
              <Image
                source={{ uri: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` }}
                style={{ width: '100%', height: 190 }}
                resizeMode="cover"
              />
              {/* Dark overlay + play button */}
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.22)' }}>
                <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#E24B4A', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 }}>
                  <Ionicons name="play" size={26} color="#fff" style={{ marginLeft: 4 }} />
                </View>
              </View>
              {/* Label */}
              <View style={{ position: 'absolute', bottom: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#fff' }}>Watch on YouTube</Text>
              </View>
            </View>
          </Pressable>
        </View>
      )}

      {/* ── Info strip ── */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 16 }}>
        {[
          { label: 'Budget',   val: BUDGET_LABEL[recipe.budget_tag] ?? recipe.budget_tag, colors: budgetColors },
          { label: 'Cost',     val: `₱${Number(recipe.estimated_cost).toFixed(0)}`,        colors: costColors },
          { label: 'Servings', val: `${recipe.servings} pax`,                              colors: servingsColors },
          { label: 'Time',     val: `${totalTime} min`,                                    colors: timeColors },
        ].map((s) => (
          <View key={s.label} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, backgroundColor: s.colors[0] }}>
            <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: s.colors[1] }}>{s.val}</Text>
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: s.colors[1], opacity: 0.85, marginTop: 2 }}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>

        {/* ── Ingredients ── */}
        <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#000000', marginBottom: 10 }}>Ingredients</Text>
        <View style={{ backgroundColor: '#FFFCF5', borderRadius: 16, padding: 16, marginBottom: 20 }}>
          {recipe.ingredients?.map((ing, i) => (
            <View
              key={ing.id}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: i < recipe.ingredients.length - 1 ? 1 : 0, borderBottomColor: '#F9EDD3' }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: '#000000' }}>{ing.name}</Text>
                {ing.quantity && (
                  <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
                    {ing.quantity} {ing.unit}
                  </Text>
                )}
              </View>
              {ing.estimated_price > 0 && (
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: '#C45E3A', marginLeft: 12 }}>
                  ~₱{Number(ing.estimated_price).toFixed(0)}
                </Text>
              )}
            </View>
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, marginTop: 4, borderTopWidth: 1, borderTopColor: '#F0DEBB' }}>
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: '#6F655A' }}>Total cost</Text>
            <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#C4881C' }}>~₱{Number(recipe.estimated_cost).toFixed(0)}</Text>
          </View>
        </View>

        {/* ── Instructions ── */}
        {recipeSteps.length > 0 && (
          <>
            <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#000000', marginBottom: 10 }}>Instructions</Text>
            <View style={{ marginBottom: 20 }}>
              {recipeSteps.map((step, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#6E7B4A', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#fff' }}>{i + 1}</Text>
                  </View>
                  <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#000000', lineHeight: 22, flex: 1 }}>{step}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Tips ── */}
        {recipe.tips?.length > 0 && (
          <>
            <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#000000', marginBottom: 10 }}>{lang === 'en' ? '💡 Tips' : '💡 Mga Tip'}</Text>
            <View style={{ backgroundColor: '#FEF6E3', borderRadius: 16, padding: 16, marginBottom: 20 }}>
              {recipe.tips.map((tip, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: i < recipe.tips.length - 1 ? 8 : 0 }}>
                  <Text style={{ color: '#E3A32A', fontSize: 13, marginTop: 2 }}>•</Text>
                  <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#9A6A12', lineHeight: 20, flex: 1 }}>{tip}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Action buttons ── */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {/* Add to meal plan */}
          <Pressable
            onPress={() => { setMealType('almusal'); setMealModal(true); }}
            style={{ flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: '#C45E3A' }}
            className="active:opacity-80"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 14 }}>🍳</Text>
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#fff' }}>Add to Meal Plan</Text>
            </View>
          </Pressable>

          {/* Save / unsave */}
          <Pressable
            onPress={toggleSave}
            disabled={savePending}
            style={{
              flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
              backgroundColor: isSaved ? '#fff' : '#EFF4EC',
              borderWidth: 1.5, borderColor: isSaved ? '#F4B942' : '#C45E3A',
              opacity: savePending ? 0.6 : 1,
            }}
            className="active:opacity-80"
          >
            {savePending ? (
              <ActivityIndicator color="#6E7B4A" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={16} color={isSaved ? '#F4B942' : '#C45E3A'} />
                <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: isSaved ? '#F4B942' : '#C45E3A' }}>
                  {isSaved ? 'Saved' : 'Save'}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* ── Add-to-meal-plan modal ── */}
        <Modal visible={mealModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setMealModal(false)}>
          <View style={{ flex: 1, backgroundColor: '#FFFCF5' }}>
            <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 16, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F9EDD3', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#000000' }}>Add to Today's Meal Plan</Text>
                {recipe && (
                  <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginTop: 2 }} numberOfLines={1}>
                    {recipe.title}
                  </Text>
                )}
              </View>
              <Pressable onPress={() => setMealModal(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F9EDD3', alignItems: 'center', justifyContent: 'center' }} className="active:opacity-70">
                <Ionicons name="close" size={16} color="#6F655A" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }}>
              <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>
                Pick meal type
              </Text>
              {MEAL_TYPES.map((mt) => {
                const active = mt.key === mealType;
                return (
                  <Pressable
                    key={mt.key}
                    onPress={() => setMealType(mt.key)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: active ? '#6E7B4A' : '#F0DEBB', backgroundColor: active ? '#EFF4EC' : '#fff', marginBottom: 8 }}
                  >
                    <Text style={{ fontSize: 20 }}>{mt.emoji}</Text>
                    <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: active ? '#5E693F' : '#000000', flex: 1 }}>{mt.label}</Text>
                    {active && <Ionicons name="checkmark-circle" size={20} color="#6E7B4A" />}
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 16, borderTopWidth: 1, borderTopColor: '#F9EDD3', backgroundColor: '#fff' }}>
              <Pressable
                onPress={() => {
                  if (!recipe) return;
                  assignMeal({ date: todayIso, meal_type: mealType, recipe_id: recipe.id, estimated_cost: recipe.estimated_cost });
                }}
                disabled={assigning}
                style={{ backgroundColor: '#C45E3A', borderRadius: 14, paddingVertical: 14, alignItems: 'center', opacity: assigning ? 0.7 : 1 }}
              >
                {assigning
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 15, color: '#fff' }}>Add to Meal Plan</Text>}
              </Pressable>
            </View>
            <AndroidNavBarFiller />
          </View>
        </Modal>

        {/* ── Shared by ── */}
        {data?.shared_by && data.shared_by.length > 0 && (
          <>
            <View style={{ marginTop: 24, paddingBottom: 8 }}>
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#000000', marginBottom: 10 }}>
                Shared by{(recipe.share_count ?? 0) > 0 ? ` (${recipe.share_count})` : ''}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0 }}>
                {/* Overlapping avatar stack — each taps to user profile */}
                {data.shared_by.slice(0, 5).map((post, idx) => (
                  <Pressable
                    key={post.id}
                    onPress={() => router.push(`/user/${post.user?.id}`)}
                    style={{
                      width: 50, height: 50, borderRadius: 25,
                      backgroundColor: '#EFF4EC',
                      alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden',
                      borderWidth: 2, borderColor: '#fff',
                      marginLeft: idx === 0 ? 0 : -10,
                    }}
                  >
                    {post.user?.avatar ? (
                      <Image source={{ uri: post.user.avatar }} style={{ width: 50, height: 50 }} />
                    ) : (
                      <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#5E693F' }}>
                        {(post.user?.name ?? '??').substring(0, 2).toUpperCase()}
                      </Text>
                    )}
                  </Pressable>
                ))}
                {/* "and X more" — taps to open full sharers modal */}
                {(recipe.share_count ?? 0) > data.shared_by.length ? (
                  <Pressable
                    onPress={async () => {
                      setSharersOpen(true);
                      if (sharers.length === 0) {
                        setSharersLoading(true);
                        try {
                          const res = await client.get(`/recipes/${recipe.id}/sharers`);
                          setSharers(res.data.data ?? []);
                        } catch {} finally { setSharersLoading(false); }
                      }
                    }}
                    style={{ marginLeft: 8, flexDirection: 'row', alignItems: 'center', gap: 2 }}
                  >
                    <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#5E693F' }}>
                      and {(recipe.share_count ?? 0) - data.shared_by.length} more
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color="#5E693F" />
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={async () => {
                      setSharersOpen(true);
                      if (sharers.length === 0) {
                        setSharersLoading(true);
                        try {
                          const res = await client.get(`/recipes/${recipe.id}/sharers`);
                          setSharers(res.data.data ?? []);
                        } catch {} finally { setSharersLoading(false); }
                      }
                    }}
                    style={{ marginLeft: 8 }}
                  >
                    <Ionicons name="chevron-forward" size={16} color="#B0A18C" />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Sharers list modal */}
            <Modal
              visible={sharersOpen}
              animationType="slide"
              transparent
              onRequestClose={() => setSharersOpen(false)}
            >
              <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setSharersOpen(false)} />
              <View style={{
                backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
                maxHeight: SCREEN_H * 0.65, paddingTop: 12,
              }}>
                {/* Handle + header */}
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#F0DEBB', alignSelf: 'center', marginBottom: 12 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F9EDD3' }}>
                  <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 16, color: '#000000', flex: 1 }}>
                    Shared by {recipe.share_count ?? 0} {(recipe.share_count ?? 0) === 1 ? 'person' : 'people'}
                  </Text>
                  <Pressable onPress={() => setSharersOpen(false)} hitSlop={10}>
                    <Ionicons name="close" size={22} color="#B0A18C" />
                  </Pressable>
                </View>

                {sharersLoading ? (
                  <ActivityIndicator color="#6E7B4A" style={{ paddingVertical: 32 }} />
                ) : (
                  <FlatList
                    data={sharers}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 8, paddingBottom: insets.bottom + 20 }}
                    renderItem={({ item: post }) => (
                      <Pressable
                        onPress={() => { setSharersOpen(false); router.push(`/user/${post.user?.id}`); }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}
                      >
                        <View style={{
                          width: 58, height: 58, borderRadius: 29,
                          backgroundColor: '#EFF4EC', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                        }}>
                          {post.user?.avatar ? (
                            <Image source={{ uri: post.user.avatar }} style={{ width: 58, height: 58 }} />
                          ) : (
                            <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#5E693F' }}>
                              {(post.user?.name ?? '??').substring(0, 2).toUpperCase()}
                            </Text>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#000000' }}>
                            {post.user?.name ?? 'Unknown'}
                          </Text>
                          {post.user?.username ? (
                            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
                              @{post.user.username}
                            </Text>
                          ) : null}
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#D3C5AB" />
                      </Pressable>
                    )}
                    ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#FFFCF5' }} />}
                    ListEmptyComponent={
                      <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#6F655A', textAlign: 'center', paddingVertical: 24 }}>
                        No sharers yet.
                      </Text>
                    }
                  />
                )}
              </View>
            </Modal>
          </>
        )}

        {/* ── Comments ── */}
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#000000', marginBottom: 4 }}>
            {lang === 'en' ? 'Comments' : 'Mga Komento'} ({comments.length})
          </Text>

          {comments.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={{ fontSize: 26, marginBottom: 6 }}>💬</Text>
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#6F655A', textAlign: 'center' }}>
                {lang === 'en' ? 'No comments yet. Be the first!' : 'Wala pang komento. Maging una!'}
              </Text>
            </View>
          ) : (
            comments.map((c) => (
              <RecipeCommentRow
                key={c.id}
                comment={c}
                myId={me?.id ?? -1}
                lang={lang === 'en' ? 'en' : 'tl'}
                onDelete={confirmDeleteComment}
                onEdit={startEditComment}
                onReply={(user) => { setEditCommentId(null); setReplyTo(user); commentInputRef.current?.focus(); }}
              />
            ))
          )}

          {editCommentId !== null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDEFC9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginTop: 8 }}>
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#9A6A12', flex: 1 }}>
                ✏️ {lang === 'en' ? 'Editing your comment' : 'Ine-edit ang komento mo'}
              </Text>
              <Pressable onPress={cancelEditComment} hitSlop={8}>
                <Ionicons name="close" size={15} color="#9A6A12" />
              </Pressable>
            </View>
          ) : replyTo && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF4EC', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginTop: 8 }}>
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#386641', flex: 1 }}>
                ↩ {lang === 'en' ? 'Replying to' : 'Tumutugon kay'} <Text style={{ fontFamily: 'NunitoSans_700Bold' }}>{replyTo.name.split(' ')[0]}</Text>
              </Text>
              <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
                <Ionicons name="close" size={15} color="#6F655A" />
              </Pressable>
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 2, marginBottom: 10 }}>
            {me && (
              <CommentAvatar
                user={{ id: me.id, name: me.name, username: me.username ?? null, avatar: me.avatar ?? null }}
                size={43}
              />
            )}
            <TextInput
              ref={commentInputRef}
              style={{ flex: 1, backgroundColor: '#F9EDD3', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: 'NunitoSans_400Regular', color: '#000000', maxHeight: 100 }}
              placeholder={
                editCommentId !== null
                  ? (lang === 'en' ? 'Edit your comment...' : 'I-edit ang komento...')
                  : replyTo
                    ? (lang === 'en' ? `Reply to ${replyTo.name.split(' ')[0]}...` : `Tumugon kay ${replyTo.name.split(' ')[0]}...`)
                    : (lang === 'en' ? 'Write a comment...' : 'Sumulat ng komento...')
              }
              placeholderTextColor="#B0A18C"
              value={commentBody}
              onChangeText={setCommentBody}
              multiline
              returnKeyType="send"
              onSubmitEditing={handleSendComment}
            />
            <Pressable
              onPress={handleSendComment}
              disabled={!commentBody.trim() || sendingComment || savingComment}
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#C45E3A', alignItems: 'center', justifyContent: 'center', opacity: !commentBody.trim() || sendingComment || savingComment ? 0.4 : 1 }}
            >
              {(sendingComment || savingComment)
                ? <ActivityIndicator color="white" size="small" />
                : <Ionicons name={editCommentId !== null ? 'checkmark' : 'arrow-up'} size={17} color="#fff" />}
            </Pressable>
          </View>
        </View>

      </View>
    <ReportContentSheet visible={reportSheetOpen} onClose={() => setReportSheetOpen(false)} contentType="recipe" contentId={recipe.id} />
    </ScrollView>
    <RewardCelebration reward={reward} onDismiss={() => setReward(null)} />
    </KeyboardAvoidingView>
  );
}
