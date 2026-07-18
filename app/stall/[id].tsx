import client, { API_URL } from '@/src/api/client';
import AddButton from '@/src/components/AddButton';
import { BoostBadge, BoostButton } from '@/src/components/BoostButton';
import DirectionsButton from '@/src/components/DirectionsButton';
import ItemThumb from '@/src/components/ItemThumb';
import ReportContentSheet from '@/src/components/ReportContentSheet';
import AddItemModal from '@/src/components/AddItemModal';
import ReportModal from '@/src/components/ReportModal';
import { Skeleton, SkeletonPriceCard, SkeletonRow } from '@/src/components/Skeleton';
import { useAuth } from '@/src/context/AuthContext';
import { useLanguage } from '@/src/context/LanguageContext';
import {
  DAY_LABELS,
  DAY_ORDER,
  formatTime12h,
  isStoreOpenNow,
  StoreHoursValue,
} from '@/src/types/storeHours';
import StarRating from '@/src/components/StarRating';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Linking, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

type TindahanMarket = {
  id: number;
  name: string;
  type: string;
};

type TindahanUser = {
  id: number;
  name: string;
};

type TindahanDetail = {
  id: number;
  user_id: number;
  market_id: number | null;
  name: string;
  description: string | null;
  type: string | null;
  barangay: string | null;
  municipality: string | null;
  province: string | null;
  region: string | null;
  latitude: number;
  longitude: number;
  contact_number: string | null;
  store_hours: StoreHoursValue | null;
  is_active: boolean;
  is_verified: boolean;
  average_rating: number;
  ratings_count: number;
  comments_count: number;
  photo: string | null;
  cover_photo: string | null;
  market: TindahanMarket | null;
  user: TindahanUser;
};

type TindahanCommentItem = {
  id: number;
  user_id: number;
  body: string;
  created_at: string;
  user: { id: number; name: string; username: string | null; avatar: string | null };
};

type StallPrice = {
  id: number;
  item_name: string;
  category: string;
  price_per_unit: number;
  unit: string;
  photo: string | null;
  updated_at: string;
};

type StallDetailResponse = {
  tindahan: TindahanDetail;
  prices: StallPrice[];
  is_boosted: boolean;
  my_rating: number | null;
};

const MARKET_TYPE_EMOJI: Record<string, string> = {
  palengke: '🏪',
  wet_market: '🏪',
  supermarket: '🏬',
  grocery: '🏬',
  tindahan: '🛒',
};

const HEADER_GRADIENT = ['#CC5027', '#E7653B', '#EC8156'] as const;

function relativeTime(dateStr: string, lang: 'en' | 'tl'): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return lang === 'en' ? 'Just now' : 'Kanina';
  if (hours < 24) return lang === 'en' ? `${hours}h ago` : `${hours}h ang nakalipas`;
  const days = Math.floor(hours / 24);
  return lang === 'en' ? `${days}d ago` : `${days}d ang nakalipas`;
}

/** Fuller wording for the section header: "1 day ago", "7 weeks ago", "3 months ago". */
function updatedAgoLabel(dateStr: string, lang: 'en' | 'tl'): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return lang === 'en' ? 'just now' : 'kanina lang';
  if (hours < 24) return lang === 'en' ? `${hours} hour${hours === 1 ? '' : 's'} ago` : `${hours} oras ang nakalipas`;
  const days = Math.floor(hours / 24);
  if (days < 7) return lang === 'en' ? `${days} day${days === 1 ? '' : 's'} ago` : `${days} araw ang nakalipas`;
  const weeks = Math.floor(days / 7);
  if (days < 60) return lang === 'en' ? `${weeks} week${weeks === 1 ? '' : 's'} ago` : `${weeks} linggo ang nakalipas`;
  const months = Math.floor(days / 30);
  return lang === 'en' ? `${months} month${months === 1 ? '' : 's'} ago` : `${months} buwan ang nakalipas`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StallDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [reportOpen, setReportOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StallPrice | null>(null);

  const { data, isLoading, error } = useQuery<StallDetailResponse>({
    queryKey: ['stall', id],
    queryFn: async () => {
      const { data } = await client.get(`/tindahan/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['stall', id] });
    setRefreshing(false);
  };

  const stall = data?.tindahan;
  const prices = data?.prices ?? [];
  const isOwner = !!stall && !!user && stall.user_id === user.id;
  const isBoosted = data?.is_boosted ?? false;
  const myRating = data?.my_rating ?? null;

  const { mutate: rateStore } = useMutation({
    mutationFn: async (rating: number) => client.post(`/tindahan/${id}/rate`, { rating }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stall', id] }),
    onError: (e: any) => Alert.alert(lang === 'en' ? 'Error' : 'Error', e?.response?.data?.message ?? 'Could not save your rating.'),
  });

  const { data: commentsData } = useQuery({
    queryKey: ['stall-comments', id],
    queryFn: async () => (await client.get(`/tindahan/${id}/comments`)).data as { data: TindahanCommentItem[] },
    enabled: !!id,
  });
  const comments = commentsData?.data ?? [];

  const [commentText, setCommentText] = useState('');
  const { mutate: postComment, isPending: postingComment } = useMutation({
    mutationFn: async () => client.post(`/tindahan/${id}/comments`, { body: commentText.trim() }),
    onSuccess: () => {
      setCommentText('');
      qc.invalidateQueries({ queryKey: ['stall-comments', id] });
      qc.invalidateQueries({ queryKey: ['stall', id] });
    },
    onError: (e: any) => Alert.alert(lang === 'en' ? 'Error' : 'Error', e?.response?.data?.message ?? 'Could not post your comment.'),
  });

  const { mutate: deleteComment } = useMutation({
    mutationFn: async (commentId: number) => client.delete(`/tindahan/comments/${commentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stall-comments', id] });
      qc.invalidateQueries({ queryKey: ['stall', id] });
    },
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFCF5' }}>
      {/* Header */}
      <LinearGradient
        colors={HEADER_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 14,
          paddingHorizontal: 16,
        }}
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="w-8 h-8 rounded-full items-center justify-center active:opacity-70"
            style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
          >
            <Ionicons name="arrow-back" size={18} color="#fff" />
          </Pressable>
          <View className="flex-1">
            {isLoading ? (
              <View className="h-5 w-40 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
            ) : (
              <>
                <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#fff' }} numberOfLines={1}>
                  {stall?.name ?? '-'}
                </Text>
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.85)' }} numberOfLines={1}>
                  {[stall?.barangay, stall?.municipality].filter(Boolean).join(', ')}
                </Text>
              </>
            )}
          </View>
          {/* Edit (owner) / Report (others) button */}
          {!isLoading && stall && (
            isOwner ? (
              <Pressable
                onPress={() => router.push(`/edit-store/${stall.id}` as any)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  backgroundColor: 'rgba(255,255,255,0.22)',
                  borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
                }}
                className="active:opacity-70"
              >
                <Ionicons name="create-outline" size={15} color="#fff" />
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#fff' }}>
                  {lang === 'en' ? 'Edit store' : 'I-edit'}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setReportOpen(true)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  backgroundColor: 'rgba(255,255,255,0.22)',
                  borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
                }}
                className="active:opacity-70"
              >
                <Ionicons name="flag-outline" size={14} color="#fff" />
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#fff' }}>
                  {lang === 'en' ? 'Report' : 'I-report'}
                </Text>
              </Pressable>
            )
          )}
        </View>
      </LinearGradient>

      {isLoading ? (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Skeleton style={{ height: 20, width: '50%', marginBottom: 10 }} />
          <Skeleton style={{ height: 14, width: '80%', marginBottom: 6 }} />
          <Skeleton style={{ height: 14, width: '60%', marginBottom: 18 }} />
          <SkeletonRow gap={8}>
            <Skeleton style={{ height: 60, flex: 1, borderRadius: 14 }} />
            <Skeleton style={{ height: 60, flex: 1, borderRadius: 14 }} />
          </SkeletonRow>
          <View style={{ height: 16 }} />
          <SkeletonPriceCard />
        </ScrollView>
      ) : error || !stall ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-3xl mb-2">😕</Text>
          <Text className="text-sm text-ink-soft text-center">
            {lang === 'en' ? 'Could not load this store. Please try again.' : 'Hindi ma-load ang tindahang ito. Subukan muli.'}
          </Text>
          <Pressable onPress={() => router.back()} className="mt-4 px-5 py-2 bg-brand-600 rounded-xl active:opacity-80">
            <Text className="text-sm font-semibold text-white">{lang === 'en' ? 'Go back' : 'Bumalik'}</Text>
          </Pressable>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6E7B4A" />}
        >
          {/* Cover photo header */}
          <View style={{ marginHorizontal: -16, marginTop: -16, height: 200, backgroundColor: '#5E693F', overflow: 'hidden' }}>
            {stall.cover_photo ? (
              <Image source={{ uri: `${API_URL}${stall.cover_photo}` }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 46, opacity: 0.45 }}>{MARKET_TYPE_EMOJI[stall.type ?? ''] ?? '\ud83c\udfea'}</Text>
              </View>
            )}
            <Pressable
              onPress={() => router.back()}
              style={{ position: 'absolute', top: insets.top + 8, left: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFCF5', alignItems: 'center', justifyContent: 'center' }}
              className="active:opacity-80"
            >
              <Ionicons name="arrow-back" size={19} color="#3C3A2F" />
            </Pressable>
            {!isOwner && (
              <Pressable
                onPress={() => setReportOpen(true)}
                style={{ position: 'absolute', top: insets.top + 8, right: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(41,37,34,0.35)', alignItems: 'center', justifyContent: 'center' }}
                className="active:opacity-80"
              >
                <Ionicons name="flag-outline" size={17} color="#FFF8E8" />
              </Pressable>
            )}
          </View>

          {/* Store photo + name + action */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <View style={{ marginTop: -42, width: 92, height: 92, borderRadius: 46, borderWidth: 3, borderColor: '#FFFCF5', backgroundColor: '#F9EDD3', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
              {stall.photo ? (
                <Image source={{ uri: `${API_URL}${stall.photo}` }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <Text style={{ fontSize: 36 }}>{MARKET_TYPE_EMOJI[stall.type ?? ''] ?? '\ud83c\udfea'}</Text>
              )}
            </View>
            <View style={{ flex: 1, paddingTop: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 20, color: '#3C3A2F', flexShrink: 1 }} numberOfLines={2}>
                  {stall.name}
                </Text>
                {stall.is_verified && <Ionicons name="shield-checkmark" size={16} color="#6E7B4A" />}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="location-outline" size={12} color="#B0A18C" />
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', flexShrink: 1 }} numberOfLines={1}>
                  {[stall.barangay, stall.municipality].filter(Boolean).join(', ')}
                </Text>
              </View>
              {(isBoosted || isOwner) && (
                <View style={{ flexDirection: 'row', marginTop: 6 }}>
                  <BoostBadge visible={isBoosted} />
                  <BoostButton
                    target="tindahan"
                    boostableId={stall.id}
                    isOwner={isOwner}
                    isBoosted={isBoosted}
                    refetchKey={['stall', id]}
                  />
                </View>
              )}
            </View>
          </View>

          {/* Type badge */}
          {stall.type && (
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: '#EFF4EC',
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 5,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6E7B4A' }}>
                {MARKET_TYPE_EMOJI[stall.type] ?? '🏪'} {stall.type}
              </Text>
            </View>
          )}

          {/* Description */}
          {stall.description && (
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#3C3A2F', lineHeight: 20, marginBottom: 16 }}>
              {stall.description}
            </Text>
          )}

          {/* Directions */}
          {stall.latitude != null && stall.longitude != null && (
            <View style={{ marginBottom: 12 }}>
              <DirectionsButton latitude={stall.latitude} longitude={stall.longitude} />
            </View>
          )}

          {/* Info card: hours + contact */}
          {(stall.store_hours || stall.contact_number) && (
            <View className="bg-white rounded-2xl border border-cream-200 p-4 mb-3">
              {stall.store_hours && (() => {
                const openNow = isStoreOpenNow(stall.store_hours);
                return (
                  <View style={{ marginBottom: 10 }}>
                    {openNow !== null && (
                      <View
                        style={{
                          alignSelf: 'flex-start',
                          flexDirection: 'row', alignItems: 'center', gap: 5,
                          backgroundColor: openNow ? '#EFF4EC' : '#FCEBEB',
                          borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
                          marginBottom: 8,
                        }}
                      >
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: openNow ? '#4E7A47' : '#E24B4A' }} />
                        <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: openNow ? '#065F46' : '#E24B4A' }}>
                          {openNow
                            ? (lang === 'en' ? 'Open now' : 'Bukas ngayon')
                            : (lang === 'en' ? 'Closed now' : 'Sarado ngayon')}
                        </Text>
                      </View>
                    )}
                    {DAY_ORDER.map((day) => {
                      const hours = stall.store_hours?.[day];
                      if (!hours) return null;
                      return (
                        <View key={day} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
                            {lang === 'en' ? DAY_LABELS[day].en : DAY_LABELS[day].tl}
                          </Text>
                          <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#3C3A2F' }}>
                            {hours.closed
                              ? (lang === 'en' ? 'Closed' : 'Sarado')
                              : `${formatTime12h(hours.open)} – ${formatTime12h(hours.close)}`}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })()}
              {stall.contact_number && (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${stall.contact_number}`)}
                  className="flex-row items-center gap-2 active:opacity-70"
                >
                  <Text style={{ fontSize: 14 }}>📞</Text>
                  <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6E7B4A' }}>
                    {stall.contact_number}
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Parent market */}
          {stall.market && (
            <Pressable
              onPress={() => router.push(`/market/${stall.market!.id}` as any)}
              className="bg-leaf-50 rounded-2xl border border-cream-200 p-4 mb-3 flex-row items-center gap-3 active:opacity-75"
            >
              <Text style={{ fontSize: 20 }}>{MARKET_TYPE_EMOJI[stall.market.type] ?? '🏪'}</Text>
              <View className="flex-1">
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
                  {lang === 'en' ? 'Located inside' : 'Nasa loob ng'}
                </Text>
                <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#6E7B4A' }} numberOfLines={1}>
                  {stall.market.name}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#6E7B4A" />
            </Pressable>
          )}

          {/* Listed by */}
          <Pressable
            onPress={() => router.push(`/user/${stall.user.id}` as any)}
            hitSlop={6}
            style={{ alignSelf: 'flex-start', marginBottom: 20 }}
            className="active:opacity-60"
          >
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
              {lang === 'en' ? 'Listed by ' : 'Inilista ni '}
              <Text style={{ fontFamily: 'NunitoSans_700Bold', color: '#6E7B4A' }}>{stall.user.name}</Text>
            </Text>
          </Pressable>

          {/* Prices */}
          <View className="flex-row justify-between items-center mb-2 px-1">
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A', textTransform: 'uppercase', letterSpacing: 0.6 }}>
              {lang === 'en' ? 'Prices at this store' : 'Presyo sa tindahang ito'}
            </Text>
            <View className="flex-row items-center gap-2">
              {prices.length > 0 && (
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
                  {prices.length} {lang === 'en' ? 'items' : 'sangkap'}
                </Text>
              )}
              {isOwner && (
                <AddButton label={lang === 'en' ? 'Add item' : 'Magdagdag'} onPress={() => setAddItemOpen(true)} />
              )}
            </View>
          </View>

          {/* Freshness of this store's prices */}
          {prices.length > 0 && (() => {
            const latest = prices.reduce((m, p) => (p.updated_at > m ? p.updated_at : m), prices[0].updated_at);
            return (
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginBottom: 8, paddingHorizontal: 4 }}>
                {lang === 'en'
                  ? `Prices updated ${updatedAgoLabel(latest, lang)}`
                  : `Na-update ang presyo ${updatedAgoLabel(latest, lang)}`}
              </Text>
            );
          })()}

          {prices.length === 0 ? (
            <View className="bg-white rounded-2xl border border-cream-200 p-8 items-center">
              <Text className="text-3xl mb-2">🏷️</Text>
              <Text className="text-sm text-ink-soft text-center">
                {lang === 'en' ? 'No prices listed yet.' : 'Wala pang nakalistang presyo.'}
              </Text>
            </View>
          ) : (
            <View className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
              {prices.map((item, idx) => (
                <View
                  key={item.id}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: idx < prices.length - 1 ? 1 : 0,
                    borderBottomColor: '#FFFCF5',
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ marginRight: 12 }}>
                    <ItemThumb photo={item.photo} name={item.item_name} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: '#3C3A2F' }}>
                      {item.item_name}
                    </Text>
                    <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginTop: 1 }}>
                      {relativeTime(item.updated_at, lang)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 15, color: '#3C3A2F' }}>
                      ₱{Number(item.price_per_unit).toFixed(2)}
                    </Text>
                    <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
                      /{item.unit}
                    </Text>
                  </View>
                  {isOwner && (
                    <Pressable
                      onPress={() => setEditingItem(item)}
                      hitSlop={8}
                      style={{ marginLeft: 12 }}
                      className="active:opacity-60"
                    >
                      <Ionicons name="pencil" size={16} color="#B0A18C" />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Rating */}
          <View className="bg-white rounded-2xl border border-cream-200 mt-4 mb-3">
            <StarRating
              myRating={myRating}
              avgRating={stall.average_rating ?? 0}
              count={stall.ratings_count ?? 0}
              onRate={(r) => rateStore(r)}
              noRatingsLabel={lang === 'en' ? 'No ratings yet' : 'Wala pang rating'}
            />
          </View>

          {/* Comments */}
          <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, paddingHorizontal: 1 }}>
            {lang === 'en' ? 'Comments' : 'Mga Komento'} {comments.length > 0 ? `(${comments.length})` : ''}
          </Text>

          <View className="flex-row items-end gap-2 mb-4">
            <TextInput
              className="flex-1 bg-white rounded-xl px-4 py-3 text-sm text-ink border border-cream-200"
              placeholder={lang === 'en' ? 'Write a comment...' : 'Sumulat ng komento...'}
              placeholderTextColor="#B0A18C"
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <Pressable
              onPress={() => postComment()}
              disabled={postingComment || !commentText.trim()}
              className="rounded-xl bg-brand-600 px-4 py-3 items-center justify-center active:opacity-80 disabled:opacity-50"
            >
              {postingComment ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="send" size={16} color="white" />}
            </Pressable>
          </View>

          {comments.length === 0 ? (
            <View className="bg-white rounded-2xl border border-cream-200 p-6 items-center mb-4">
              <Text className="text-sm text-ink-soft text-center">
                {lang === 'en' ? 'Be the first to comment.' : 'Ikaw na ang unang magkomento.'}
              </Text>
            </View>
          ) : (
            <View className="bg-white rounded-2xl border border-cream-200 overflow-hidden mb-4">
              {comments.map((c, idx) => (
                <View
                  key={c.id}
                  style={{
                    padding: 14,
                    borderBottomWidth: idx < comments.length - 1 ? 1 : 0,
                    borderBottomColor: '#FFFCF5',
                  }}
                >
                  <View className="flex-row items-center justify-between mb-1">
                    <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#3C3A2F' }}>{c.user.name}</Text>
                    {user?.id === c.user_id && (
                      <Pressable onPress={() => deleteComment(c.id)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={14} color="#B0A18C" />
                      </Pressable>
                    )}
                  </View>
                  <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#3C3A2F', lineHeight: 19 }}>{c.body}</Text>
                  <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginTop: 4 }}>
                    {relativeTime(c.created_at, lang)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
        </KeyboardAvoidingView>
      )}

      {stall && (
        <ReportContentSheet visible={reportOpen} onClose={() => setReportOpen(false)} contentType="tindahan" contentId={stall.id} />
      )}

      {stall && isOwner && (
        <AddItemModal
          visible={addItemOpen || editingItem !== null}
          onClose={() => { setAddItemOpen(false); setEditingItem(null); }}
          tindahanId={stall.id}
          editItem={editingItem}
        />
      )}
    </View>
  );
}
