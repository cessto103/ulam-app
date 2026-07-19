import client, { API_URL } from '@/src/api/client';
import { SkeletonListItem } from '@/src/components/Skeleton';
import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type ListSummary = {
  id: number;
  type: 'daily' | 'event';
  title: string;
  list_date: string | null;
  status: 'active' | 'completed';
  total_spent: number | null;
  items_count: number;
  checked_count: number;
  all_total: number;
  bought_total: number;
  owner?: { id: number; name: string; username: string | null; avatar: string | null };
};

type ListsResponse = {
  daily_today: ListSummary | null;
  events: ListSummary[];
  shared_with_me: ListSummary[];
};

function ProgressLine({ list, lang }: { list: ListSummary; lang: 'en' | 'tl' }) {
  return (
    <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
      {list.status === 'completed'
        ? (lang === 'en' ? `Completed · ₱${Number(list.total_spent ?? 0).toFixed(0)} spent` : `Tapos na · ₱${Number(list.total_spent ?? 0).toFixed(0)} nagastos`)
        : `${list.checked_count}/${list.items_count} ${lang === 'en' ? 'bought' : 'nabili'} · ₱${list.all_total.toFixed(0)} ${lang === 'en' ? 'total' : 'kabuuan'}`}
    </Text>
  );
}

export default function ShoppingListsIndexScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const [newListOpen, setNewListOpen] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['shopping-lists'],
    queryFn: () => client.get('/shopping-lists').then((r) => r.data as ListsResponse),
    staleTime: 30_000,
  });

  const { mutate: openDaily, isPending: openingDaily } = useMutation({
    mutationFn: () => client.post('/shopping-lists/daily'),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['shopping-lists'] });
      router.push(`/shopping-list/${res.data.list.id}` as any);
    },
    onError: (e: any) => {
      if (e?.response?.data?.no_meal_plan) {
        Alert.alert(
          lang === 'en' ? 'No meal plan yet' : 'Walang meal plan pa',
          lang === 'en'
            ? 'Generate a meal plan on the Meal Plan tab first, then come back for your shopping list.'
            : 'Gumawa muna ng meal plan sa Meal Plan tab, tapos balikan ang shopping list.',
        );
      } else {
        Alert.alert('Error', e?.response?.data?.message ?? (lang === 'en' ? 'Could not open the list.' : 'Hindi mabuksan ang listahan.'));
      }
    },
  });

  const { mutate: createEvent, isPending: creatingEvent } = useMutation({
    mutationFn: () => client.post('/shopping-lists', { title: newListTitle.trim() }),
    onSuccess: (res) => {
      setNewListOpen(false);
      setNewListTitle('');
      qc.invalidateQueries({ queryKey: ['shopping-lists'] });
      router.push(`/shopping-list/${res.data.list.id}` as any);
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Could not create the list.'),
  });

  const daily = data?.daily_today ?? null;
  const events = data?.events ?? [];
  const shared = data?.shared_with_me ?? [];

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      {/* Header */}
      <View className="flex-row items-center px-4 pt-4 pb-3 gap-3 bg-white border-b border-cream-200">
        <Pressable onPress={() => router.back()} className="p-2 active:opacity-60">
          <Text style={{ fontSize: 20 }}>←</Text>
        </Pressable>
        <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 18, color: '#000000', flex: 1 }}>
          {lang === 'en' ? 'Shopping Lists' : 'Mga Shopping List'}
        </Text>
      </View>

      {isLoading ? (
        <View style={{ backgroundColor: '#fff', flex: 1, paddingTop: 8 }}>
          {[0, 1, 2, 3].map((i) => <SkeletonListItem key={i} />)}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#386641" colors={['#386641']} />}
        >
          {/* Today's daily list */}
          <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
            {lang === 'en' ? "Today's list" : 'Listahan ngayon'}
          </Text>
          {daily ? (
            <Pressable
              onPress={() => router.push(`/shopping-list/${daily.id}` as any)}
              className="bg-white rounded-2xl border border-cream-200 p-4 mb-6 active:opacity-75"
            >
              <View className="flex-row items-center gap-3">
                <Text style={{ fontSize: 24 }}>🛒</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 15, color: '#000000' }}>{daily.title}</Text>
                  <ProgressLine list={daily} lang={lang === 'en' ? 'en' : 'tl'} />
                </View>
                <Ionicons name="chevron-forward" size={16} color="#B0A18C" />
              </View>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => openDaily()}
              disabled={openingDaily}
              className="bg-white rounded-2xl border border-cream-200 p-4 mb-6 items-center active:opacity-75"
            >
              {openingDaily ? (
                <ActivityIndicator color="#386641" />
              ) : (
                <>
                  <Text style={{ fontSize: 28, marginBottom: 6 }}>🛒</Text>
                  <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#386641' }}>
                    {lang === 'en' ? "Start today's list" : 'Simulan ang listahan ngayon'}
                  </Text>
                  <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginTop: 2, textAlign: 'center' }}>
                    {lang === 'en' ? "Built from today's meal plan." : 'Galing sa meal plan mo ngayong araw.'}
                  </Text>
                </>
              )}
            </Pressable>
          )}

          {/* Event lists */}
          <View className="flex-row items-center justify-between mb-2">
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A', textTransform: 'uppercase', letterSpacing: 0.6 }}>
              {lang === 'en' ? 'Event lists' : 'Mga event list'}
            </Text>
            <Pressable
              onPress={() => setNewListOpen(true)}
              className="flex-row items-center gap-1 rounded-full bg-brand-600 px-3 py-1.5 active:opacity-80"
            >
              <Ionicons name="add" size={14} color="#fff" />
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#fff' }}>
                {lang === 'en' ? 'New' : 'Bago'}
              </Text>
            </Pressable>
          </View>
          {events.length === 0 ? (
            <View className="bg-white rounded-2xl border border-cream-200 p-5 mb-6">
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', textAlign: 'center', lineHeight: 19 }}>
                {lang === 'en'
                  ? 'For team building, fiesta, handaan: a standalone list not tied to your daily budget.'
                  : 'Para sa team building, fiesta, o handaan: hiwalay na listahan na hindi kasama sa daily budget mo.'}
              </Text>
            </View>
          ) : (
            <View className="bg-white rounded-2xl border border-cream-200 overflow-hidden mb-6">
              {events.map((l, idx) => (
                <Pressable
                  key={l.id}
                  onPress={() => router.push(`/shopping-list/${l.id}` as any)}
                  className="flex-row items-center gap-3 px-4 py-3 active:bg-cream-50"
                  style={{ borderBottomWidth: idx < events.length - 1 ? 1 : 0, borderBottomColor: '#F9EDD3' }}
                >
                  <Text style={{ fontSize: 18 }}>🎉</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#000000' }} numberOfLines={1}>{l.title}</Text>
                    <ProgressLine list={l} lang={lang === 'en' ? 'en' : 'tl'} />
                  </View>
                  {l.status === 'completed' && (
                    <View className="rounded-full bg-leaf-50 px-2 py-0.5">
                      <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 11, color: '#386641' }}>✓</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color="#B0A18C" />
                </Pressable>
              ))}
            </View>
          )}

          {/* Shared with me */}
          {shared.length > 0 && (
            <>
              <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
                {lang === 'en' ? 'Shared with me' : 'Ibinahagi sa akin'}
              </Text>
              <View className="bg-white rounded-2xl border border-cream-200 overflow-hidden mb-6">
                {shared.map((l, idx) => (
                  <Pressable
                    key={l.id}
                    onPress={() => router.push(`/shopping-list/${l.id}` as any)}
                    className="flex-row items-center gap-3 px-4 py-3 active:bg-cream-50"
                    style={{ borderBottomWidth: idx < shared.length - 1 ? 1 : 0, borderBottomColor: '#F9EDD3' }}
                  >
                    {l.owner?.avatar ? (
                      <Image source={{ uri: `${API_URL}${l.owner.avatar}` }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F9EDD3' }} />
                    ) : (
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF4EC', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 15 }}>🛒</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#000000' }} numberOfLines={1}>{l.title}</Text>
                      <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }} numberOfLines={1}>
                        {lang === 'en' ? 'From' : 'Mula kay'} {l.owner?.name ?? '...'} · {l.checked_count}/{l.items_count} {lang === 'en' ? 'bought' : 'nabili'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#B0A18C" />
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* New event list modal */}
      <Modal visible={newListOpen} animationType="slide" transparent onRequestClose={() => setNewListOpen(false)}>
        <Pressable
          onPress={() => setNewListOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: insets.bottom + 16 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 15, color: '#000000' }}>
                {lang === 'en' ? 'New event list' : 'Bagong event list'}
              </Text>
              <Pressable onPress={() => setNewListOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={18} color="#6F655A" />
              </Pressable>
            </View>
            <TextInput
              className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 text-sm text-ink mb-3"
              placeholder={lang === 'en' ? 'e.g. Team Building Rekados' : 'hal. Rekados para sa Team Building'}
              placeholderTextColor="#B0A18C"
              value={newListTitle}
              onChangeText={setNewListTitle}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => newListTitle.trim() && createEvent()}
            />
            <Pressable
              onPress={() => createEvent()}
              disabled={!newListTitle.trim() || creatingEvent}
              className="w-full rounded-xl bg-brand-600 py-3.5 items-center active:opacity-80 disabled:opacity-50"
            >
              {creatingEvent
                ? <ActivityIndicator color="white" size="small" />
                : <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#fff' }}>{lang === 'en' ? 'Create' : 'Gumawa'}</Text>}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
