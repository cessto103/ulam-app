import client from '@/src/api/client';
import AddButton from '@/src/components/AddButton';
import ItemThumb from '@/src/components/ItemThumb';
import { Skeleton } from '@/src/components/Skeleton';
import { DECLINE_REASONS } from '@/src/constants/reportReasons';
import { useLanguage } from '@/src/context/LanguageContext';
import { isStoreOpenNow, StoreHoursValue } from '@/src/types/storeHours';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

type MyTindahan = {
  id: number;
  name: string;
  type: string | null;
  barangay: string | null;
  municipality: string | null;
  is_active: boolean;
  is_verified: boolean;
  store_hours: StoreHoursValue | null;
  market: { id: number; name: string; type: string } | null;
};

type PendingReport = {
  id: number;
  item_name: string;
  category: string | null;
  reported_price: string | number;
  unit: string;
  photo: string | null;
  created_at: string;
  user: { id: number; name: string; username: string | null; avatar: string | null };
  tindahan: { id: number; name: string };
};

const MARKET_TYPE_EMOJI: Record<string, string> = {
  palengke: '🏪',
  wet_market: '🏪',
  supermarket: '🏬',
  grocery: '🏬',
  tindahan: '🛒',
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MyStoresScreen() {
  const { lang } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const qc = useQueryClient();
  const [declining, setDeclining] = useState<PendingReport | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [tab, setTab] = useState<'stores' | 'reports'>('stores');

  const { data: stores = [], isLoading } = useQuery<MyTindahan[]>({
    queryKey: ['my-tindahan'],
    queryFn: async () => {
      const { data } = await client.get('/tindahan/mine');
      return data.tindahan ?? [];
    },
  });

  const { data: pendingReports = [] } = useQuery<PendingReport[]>({
    queryKey: ['tindahan-pending-reports'],
    queryFn: async () => {
      const { data } = await client.get('/tindahan-reports');
      return data.reports ?? [];
    },
  });

  const invalidateReports = () => {
    qc.invalidateQueries({ queryKey: ['tindahan-pending-reports'] });
    qc.invalidateQueries({ queryKey: ['my-price-reports'] });
  };

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['my-tindahan'] }),
      qc.invalidateQueries({ queryKey: ['tindahan-pending-reports'] }),
    ]);
    setRefreshing(false);
  };

  const acceptMutation = useMutation({
    mutationFn: async (id: number) => client.post(`/tindahan-reports/${id}/accept`),
    onSuccess: invalidateReports,
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Could not accept the report.'),
  });

  const declineMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) =>
      client.post(`/tindahan-reports/${id}/decline`, { reason }),
    onSuccess: () => {
      setDeclining(null);
      setReason(null);
      invalidateReports();
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Could not decline the report.'),
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFCF5' }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          paddingHorizontal: 16,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#F9EDD3',
        }}
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="w-8 h-8 rounded-full bg-cream-200 items-center justify-center active:opacity-70"
          >
            <Ionicons name="arrow-back" size={18} color="#292522" />
          </Pressable>
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#292522', flex: 1 }}>
            {lang === 'en' ? 'My Stores' : 'Aking mga Tindahan'}
          </Text>
          <AddButton label={lang === 'en' ? 'Add' : 'Idagdag'} onPress={() => router.push('/add-listing' as any)} />
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row bg-cream-200 rounded-xl mx-4 mt-3 p-1">
        {([
          { key: 'stores' as const, label: lang === 'en' ? 'My Stores' : 'Mga Tindahan' },
          { key: 'reports' as const, label: lang === 'en' ? 'Price reports to review' : 'Mga Report' },
        ]).map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-lg ${active ? 'bg-olive-400' : ''}`}
            >
              <Text style={{ fontFamily: active ? 'NunitoSans_700Bold' : 'NunitoSans_600SemiBold', fontSize: 12, color: active ? '#fff' : '#6F655A' }}>
                {t.label}
              </Text>
              {t.key === 'reports' && pendingReports.length > 0 && (
                <View className="rounded-full px-1.5 py-0.5" style={{ backgroundColor: active ? 'rgba(255,248,232,0.3)' : '#FDEFC9', minWidth: 18, alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 12, color: active ? '#fff' : '#9A6A12' }}>{pendingReports.length}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#386641" />}
      >
        {/* Community price reports awaiting review */}
        {tab === 'reports' && (
          <View className="mb-5">
            {pendingReports.length === 0 && (
              <View className="bg-white rounded-2xl border border-cream-200 p-8 items-center">
                <Text className="text-3xl mb-2">\ud83c\udff7\ufe0f</Text>
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', textAlign: 'center' }}>
                  {lang === 'en' ? 'No price reports to review.' : 'Walang price report na irereview.'}
                </Text>
              </View>
            )}
            {pendingReports.map((r) => (
              <View key={r.id} className="bg-white rounded-2xl border border-cream-200 p-4 mb-3">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <ItemThumb photo={r.photo} name={r.item_name} size={44} />
                  <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#292522' }}>
                  {r.item_name}
                </Text>
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, color: '#C4881C', marginTop: 1 }}>
                  {'\u20b1'}{Number(r.reported_price).toFixed(2)} / {r.unit}
                </Text>
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: '#6F655A', marginTop: 2 }}>
                  {r.tindahan.name} {'\u00b7'} {lang === 'en' ? 'reported by' : 'ni-report ni'} {r.user.name}
                </Text>
                  </View>
                </View>
                <View className="flex-row gap-2 mt-3">
                  <Pressable
                    onPress={() => acceptMutation.mutate(r.id)}
                    disabled={acceptMutation.isPending}
                    className="flex-1 rounded-xl bg-leaf-600 py-2.5 items-center active:opacity-80 disabled:opacity-60"
                  >
                    <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#fff' }}>
                      {'\u2713'} {lang === 'en' ? 'Accept' : 'Tanggapin'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => { setDeclining(r); setReason(null); }}
                    className="flex-1 rounded-xl border py-2.5 items-center active:opacity-70"
                    style={{ borderColor: '#E24B4A', backgroundColor: '#fff' }}
                  >
                    <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#E24B4A' }}>
                      {lang === 'en' ? 'Decline' : 'Tanggihan'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {tab === 'stores' && (isLoading ? (
          <>
            <Skeleton style={{ height: 84, borderRadius: 16, marginBottom: 10 }} />
            <Skeleton style={{ height: 84, borderRadius: 16, marginBottom: 10 }} />
          </>
        ) : stores.length === 0 ? (
          <View className="bg-white rounded-2xl border border-cream-200 p-8 items-center">
            <Text className="text-3xl mb-2">🏪</Text>
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', textAlign: 'center', marginBottom: 14 }}>
              {lang === 'en'
                ? "You haven't added a store yet."
                : 'Wala ka pang naidadagdag na tindahan.'}
            </Text>
            <Pressable
              onPress={() => router.push('/add-listing' as any)}
              className="rounded-xl bg-brand-600 px-5 py-2.5 active:opacity-80"
            >
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#fff' }}>
                {lang === 'en' ? 'Add my Store' : 'Idagdag ang Tindahan'}
              </Text>
            </Pressable>
          </View>
        ) : (
          stores.map((store) => {
            const openNow = isStoreOpenNow(store.store_hours);
            return (
              <Pressable
                key={store.id}
                onPress={() => router.push(`/stall/${store.id}` as any)}
                className="bg-white rounded-2xl border border-cream-200 p-4 mb-3 active:opacity-75"
              >
                <View className="flex-row items-center gap-3">
                  <View
                    style={{
                      width: 44, height: 44, borderRadius: 12,
                      backgroundColor: '#EFF4EC', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{MARKET_TYPE_EMOJI[store.type ?? ''] ?? '🛒'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 14, color: '#292522' }} numberOfLines={1}>
                      {store.name}
                    </Text>
                    <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: '#6F655A' }} numberOfLines={1}>
                      {store.market
                        ? `${lang === 'en' ? 'Inside' : 'Nasa loob ng'} ${store.market.name}`
                        : [store.barangay, store.municipality].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => router.push(`/edit-store/${store.id}` as any)}
                    hitSlop={8}
                    className="w-8 h-8 rounded-full bg-cream-200 items-center justify-center active:opacity-70"
                  >
                    <Ionicons name="pencil" size={14} color="#6F655A" />
                  </Pressable>
                  <Ionicons name="chevron-forward" size={16} color="#B0A18C" />
                </View>

                <View className="flex-row items-center gap-2 mt-3">
                  {openNow !== null && (
                    <View
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                        backgroundColor: openNow ? '#EFF4EC' : '#FCEBEB',
                        borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
                      }}
                    >
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: openNow ? '#4E7A47' : '#E24B4A' }} />
                      <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 12, color: openNow ? '#2C5234' : '#E24B4A' }}>
                        {openNow
                          ? (lang === 'en' ? 'Open now' : 'Bukas ngayon')
                          : (lang === 'en' ? 'Closed now' : 'Sarado ngayon')}
                      </Text>
                    </View>
                  )}
                  {store.is_verified && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#EFF4EC', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 12 }}>✅</Text>
                      <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 12, color: '#386641' }}>
                        {lang === 'en' ? 'Verified' : 'Beripikado'}
                      </Text>
                    </View>
                  )}
                  {!store.is_active && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F9EDD3', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 12, color: '#6F655A' }}>
                        {lang === 'en' ? 'Hidden' : 'Nakatago'}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })
        ))}
      </ScrollView>

      {/* Decline reason sheet */}
      <Modal visible={!!declining} transparent animationType="fade" onRequestClose={() => setDeclining(null)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(41,37,34,0.45)', justifyContent: 'flex-end' }}
          onPress={() => setDeclining(null)}
        >
          <Pressable
            onPress={() => {}}
            style={{ backgroundColor: '#FFFCF5', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 34 }}
          >
            <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#F0DEBB', marginBottom: 14 }} />
            <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 17, color: '#292522' }}>
              {lang === 'en' ? 'Why are you declining?' : 'Bakit mo tinatanggihan?'}
            </Text>
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: '#6F655A', marginBottom: 12 }}>
              {declining?.item_name} {'\u00b7'} {'\u20b1'}{Number(declining?.reported_price ?? 0).toFixed(2)} / {declining?.unit}
            </Text>

            {DECLINE_REASONS.map((opt) => {
              const selected = reason === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setReason(opt.key)}
                  className="flex-row items-center gap-3 py-2.5 active:opacity-70"
                >
                  <View
                    style={{
                      width: 20, height: 20, borderRadius: 10, borderWidth: 2,
                      borderColor: selected ? '#6E7B4A' : '#D3C5AB',
                      backgroundColor: selected ? '#6E7B4A' : 'transparent',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {selected && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFF8E8' }} />}
                  </View>
                  <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: '#292522' }}>
                    {opt[lang]}
                  </Text>
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => declining && reason && declineMutation.mutate({ id: declining.id, reason })}
              disabled={!reason || declineMutation.isPending}
              className="rounded-xl py-3.5 items-center mt-4 active:opacity-80"
              style={{ backgroundColor: '#C45E3A', opacity: !reason || declineMutation.isPending ? 0.5 : 1 }}
            >
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#fff' }}>
                {lang === 'en' ? 'Decline report' : 'Tanggihan ang report'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
