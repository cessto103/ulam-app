import client from '@/src/api/client';
import AndroidNavBarFiller from '@/src/components/AndroidNavBarFiller';
import ItemThumb from '@/src/components/ItemThumb';
import { Skeleton, SkeletonRow } from '@/src/components/Skeleton';
import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type StallMarket = { id: number; name: string; type: string };
type StallOwner = { id: number; name: string };

type StallDetail = {
  id: number;
  name: string;
  type: string | null;
  photo: string | null;
  is_verified: boolean;
  market: StallMarket | null;
  user: StallOwner | null;
};

type StallPrice = {
  id: number;
  item_name: string;
  price_per_unit: number;
  unit: string;
  photo: string | null;
  updated_at: string;
};

type StallDetailResponse = {
  tindahan: StallDetail;
  prices: StallPrice[];
};

const STALL_TYPE_EMOJI: Record<string, string> = {
  palengke: '🏪',
  wet_market: '🏪',
  supermarket: '🏬',
  grocery: '🏬',
  tindahan: '🛒',
};

function relativeTime(dateStr: string, lang: 'en' | 'tl'): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return lang === 'en' ? 'Just now' : 'Kanina';
  if (hours < 24) return lang === 'en' ? `${hours}h ago` : `${hours}h ang nakalipas`;
  const days = Math.floor(hours / 24);
  return lang === 'en' ? `${days}d ago` : `${days}d ang nakalipas`;
}

type Props = {
  tindahanId: number | null;
  visible: boolean;
  onClose: () => void;
  /** Search query that opened this sheet, e.g. "manok" — passed through to
   * Report a Price so it doesn't have to be retyped. */
  prefillItem?: string;
};

/** Sliding preview of a stall's items, opened from a Price Checker search
 * result without leaving the page. A trimmed preview of the full store page
 * (app/stall/[id].tsx) -- no ratings/comments/hours/edit here, just enough
 * to browse what's sold and jump into Report a Price already pointed at
 * this exact stall (and its market, if it has one). */
export default function StallDetailSheet({ tindahanId, visible, onClose, prefillItem }: Props) {
  const { lang } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, isLoading, error } = useQuery<StallDetailResponse>({
    queryKey: ['stall-sheet', tindahanId],
    queryFn: async () => (await client.get(`/tindahan/${tindahanId}`)).data,
    enabled: visible && tindahanId != null,
  });

  const stall = data?.tindahan;
  const prices = data?.prices ?? [];

  const goReportHere = () => {
    if (!stall) return;
    onClose();
    router.push({
      pathname: '/report-price',
      params: {
        ...(prefillItem ? { item: prefillItem } : {}),
        tindahan_id: String(stall.id),
        tindahan_name: stall.name,
        tindahan_type: stall.type ?? '',
        ...(stall.market
          ? {
              market_id: String(stall.market.id),
              market_name: stall.market.name,
              market_type: stall.market.type ?? '',
            }
          : {}),
      },
    } as any);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: insets.bottom }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: '#F9EDD3' }}>
            {stall && <ItemThumb photo={stall.photo} name={stall.name} size={48} />}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#000000' }} numberOfLines={1}>
                  {stall?.name ?? (lang === 'en' ? 'Store' : 'Tindahan')}
                </Text>
                {stall?.is_verified && <Ionicons name="checkmark-circle" size={15} color="#386641" />}
              </View>
              {stall?.type && (
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', textTransform: 'capitalize' }}>
                  {STALL_TYPE_EMOJI[stall.type] ?? '🛒'} {stall.type.replace(/_/g, ' ')}
                </Text>
              )}
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color="#6F655A" />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={{ padding: 16 }}>
              <Skeleton style={{ height: 44, borderRadius: 14, marginBottom: 10 }} />
              <SkeletonRow gap={8}>
                <Skeleton style={{ height: 56, flex: 1, borderRadius: 14 }} />
                <Skeleton style={{ height: 56, flex: 1, borderRadius: 14 }} />
              </SkeletonRow>
            </View>
          ) : error || !stall ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>😕</Text>
              <Text className="text-sm text-ink-soft text-center mb-4">
                {lang === 'en' ? 'Could not load this store. Please try again.' : 'Hindi ma-load ang tindahang ito. Subukan muli.'}
              </Text>
              <Pressable onPress={onClose} className="px-5 py-2 bg-brand-600 rounded-xl active:opacity-80">
                <Text className="text-sm font-semibold text-white">{lang === 'en' ? 'Close' : 'Isara'}</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ padding: 16 }}>
              {/* Located inside */}
              {stall.market && (
                <Pressable
                  onPress={() => { onClose(); router.push(`/market/${stall.market!.id}` as any); }}
                  className="bg-leaf-50 rounded-2xl border border-cream-200 p-4 mb-3 flex-row items-center gap-3 active:opacity-75"
                >
                  <Text style={{ fontSize: 20 }}>{STALL_TYPE_EMOJI[stall.market.type] ?? '🏪'}</Text>
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

              {/* Listed by -- omitted entirely for admin/seed-created stalls with no owner */}
              {stall.user && (
                <Pressable
                  onPress={() => { onClose(); router.push(`/user/${stall.user!.id}` as any); }}
                  hitSlop={6}
                  style={{ alignSelf: 'flex-start', marginBottom: 14 }}
                  className="active:opacity-60"
                >
                  <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
                    {lang === 'en' ? 'Listed by ' : 'Inilista ni '}
                    <Text style={{ fontFamily: 'NunitoSans_700Bold', color: '#6E7B4A' }}>{stall.user.name}</Text>
                  </Text>
                </Pressable>
              )}

              {/* Items */}
              <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
                {lang === 'en' ? 'Items at this store' : 'Mga sangkap dito'}
              </Text>

              {prices.length === 0 ? (
                <View className="bg-cream-50 rounded-2xl border border-cream-200 p-6 items-center mb-3">
                  <Text style={{ fontSize: 24, marginBottom: 6 }}>🏷️</Text>
                  <Text className="text-xs text-ink-soft text-center">
                    {lang === 'en' ? 'No prices listed yet.' : 'Wala pang nakalistang presyo.'}
                  </Text>
                </View>
              ) : (
                <View className="bg-white rounded-2xl border border-cream-200 overflow-hidden mb-3">
                  {prices.map((item, idx) => (
                    <View
                      key={item.id}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderBottomWidth: idx < prices.length - 1 ? 1 : 0,
                        borderBottomColor: '#FFFCF5',
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <View style={{ marginRight: 10 }}>
                        <ItemThumb photo={item.photo} name={item.item_name} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: '#3C3A2F' }}>
                          {item.item_name}
                        </Text>
                        <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: '#6F655A', marginTop: 1 }}>
                          {relativeTime(item.updated_at, lang)}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 14, color: '#3C3A2F' }}>
                          ₱{Number(item.price_per_unit).toFixed(2)}
                        </Text>
                        <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: '#6F655A' }}>
                          /{item.unit}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <Pressable
                onPress={goReportHere}
                className="w-full rounded-xl bg-leaf-50 py-3 items-center active:opacity-70 mb-3"
              >
                <Text className="text-sm font-semibold text-leaf-700">
                  📢 {lang === 'en' ? 'Report a price here' : 'Mag-report ng presyo dito'} +15 XP
                </Text>
              </Pressable>

              <Pressable
                onPress={() => { onClose(); router.push(`/stall/${stall.id}` as any); }}
                className="items-center py-1"
              >
                <Text className="text-xs text-brand-600 font-medium">
                  {lang === 'en' ? 'View full store page' : 'Tingnan ang buong pahina'} →
                </Text>
              </Pressable>
            </ScrollView>
          )}

          <AndroidNavBarFiller />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
