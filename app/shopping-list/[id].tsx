import client, { API_URL } from '@/src/api/client';
import { useLanguage } from '@/src/context/LanguageContext';
import RewardCelebration from '@/src/components/RewardCelebration';
import { Skeleton, SkeletonListItem } from '@/src/components/Skeleton';
import { useXpReward } from '@/src/hooks/useXpReward';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Alert, ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

/** Red delete action revealed by swiping a row left (owner only). */
function SwipeDelete({ onDelete }: { onDelete: () => void }) {
  return (
    <Pressable
      onPress={onDelete}
      style={{ width: 72, backgroundColor: '#E24B4A', alignItems: 'center', justifyContent: 'center' }}
      className="active:opacity-80"
    >
      <Ionicons name="trash-outline" size={20} color="#fff" />
    </Pressable>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type MiniUser = { id: number; name: string; username?: string | null; avatar?: string | null };

type ListItem = {
  id: number;
  name: string;
  quantity: string | null;
  unit: string | null;
  needed_note: string | null;
  meal_type: string | null;
  dish_name: string | null;
  est_price: number;
  actual_price: number | null;
  is_checked: boolean;
  // Laravel serializes the addedBy/checkedBy relations over the FK columns,
  // so these arrive as user objects (or null), not ids.
  added_by: MiniUser | null;
  checked_by: MiniUser | null;
};

type ListDetail = {
  id: number;
  owner_id: number;
  type: 'daily' | 'event';
  title: string;
  list_date: string | null;
  status: 'active' | 'completed';
  completed_at: string | null;
  total_spent: number | null;
  items: ListItem[];
  shares: { id: number; user_id: number; user: MiniUser | null }[];
  owner: MiniUser;
  my_role: 'owner' | 'recipient';
  all_total: number;
  bought_total: number;
};

type AcceptedConnection = {
  id: number;
  user: MiniUser;
  my_label: string | null;
};

// ─── Category rules (same regexes the old single-list screen used) ────────────

const CATEGORIES: { labelEn: string; labelTl: string; emoji: string; pattern: RegExp }[] = [
  { labelEn: 'Vegetables',      labelTl: 'Gulay',           emoji: '🥦', pattern: /gulay|kangkong|sitaw|repolyo|patola|ampalaya|talong|carrots?|broccoli|pechay|kamote|sibuyas|bawang|luya|kamatis|sili|spinach/i },
  { labelEn: 'Meat & Seafood',  labelTl: 'Karne at Isda',   emoji: '🍖', pattern: /baboy|manok|baka|isda|bangus|tilapia|hipon|pusit|galunggong|sardinas|atay|beef|pork|chicken|fish|shrimp|crab/i },
  { labelEn: 'Rice & Noodles',  labelTl: 'Bigas at Pansit', emoji: '🍚', pattern: /kanin|bigas|pansit|miki|bihon|sotanghon|macaroni|spaghetti|pasta|malagkit/i },
  { labelEn: 'Dairy & Eggs',    labelTl: 'Gata at Itlog',   emoji: '🥚', pattern: /gata|itlog|egg|coconut/i },
  { labelEn: 'Condiments',      labelTl: 'Condiments',      emoji: '🧴', pattern: /toyo|patis|suka|asin|paminta|mantika|margarine|ketchup|sauce|asukal|sugar|vetsin|oil/i },
];

function categorize(name: string) {
  for (const c of CATEGORIES) if (c.pattern.test(name)) return c;
  return { labelEn: 'Others', labelTl: 'Iba pa', emoji: '🛒' };
}

function itemPrice(i: ListItem): number {
  return Number(i.actual_price ?? i.est_price) || 0;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ShoppingListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { lang } = useLanguage();
  const insets = useSafeAreaInsets();

  const [editingPrice, setEditingPrice] = useState<number | null>(null);
  const [editingQty, setEditingQty] = useState<number | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [selectedShareIds, setSelectedShareIds] = useState<number[]>([]);
  const priceInputRef = useRef<TextInput>(null);
  const { reward, setReward, handleXpResponse } = useXpReward();

  const listKey = ['shopping-list', id];

  const { data: list, isLoading, refetch, isRefetching } = useQuery({
    queryKey: listKey,
    queryFn: () => client.get(`/shopping-lists/${id}`).then((r) => r.data.list as ListDetail),
    enabled: !!id,
    // Only shared, still-active lists poll — the whole point is watching
    // someone else's checkmarks appear while they shop.
    refetchInterval: (q) => {
      const d = q.state.data;
      return d && d.shares.length > 0 && d.status === 'active' ? 15_000 : false;
    },
  });

  const { data: budget } = useQuery({
    queryKey: ['budget-today'],
    queryFn: async () => {
      try {
        const { data } = await client.get('/budget/today');
        return data?.has_budget ? (data as { has_budget: boolean; budget: number }) : null;
      } catch { return null; }
    },
    staleTime: 60_000,
  });

  const { data: connections } = useQuery({
    queryKey: ['connections-accepted'],
    queryFn: () => client.get('/connections').then((r) => r.data as { data: AcceptedConnection[] }),
    staleTime: 60_000,
    enabled: shareOpen,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: listKey });

  // Check toggle with optimistic cache update so the checkbox is instant.
  const { mutate: patchItem } = useMutation({
    mutationFn: ({ itemId, body }: { itemId: number; body: Record<string, unknown> }) =>
      client.patch(`/shopping-lists/${id}/items/${itemId}`, body),
    onMutate: async ({ itemId, body }) => {
      await qc.cancelQueries({ queryKey: listKey });
      const previous = qc.getQueryData<ListDetail>(listKey);
      if (previous) {
        qc.setQueryData<ListDetail>(listKey, {
          ...previous,
          items: previous.items.map((i) => (i.id === itemId ? { ...i, ...body } as ListItem : i)),
        });
      }
      return { previous };
    },
    onError: (e: any, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(listKey, ctx.previous);
      Alert.alert('Error', e?.response?.data?.message ?? (lang === 'en' ? 'Could not update.' : 'Hindi ma-update.'));
    },
    onSettled: invalidate,
  });

  const { mutate: bulkCheck } = useMutation({
    mutationFn: ({ itemIds, isChecked }: { itemIds: number[]; isChecked: boolean }) =>
      client.post(`/shopping-lists/${id}/items/bulk-check`, { item_ids: itemIds, is_checked: isChecked }),
    onMutate: async ({ itemIds, isChecked }) => {
      await qc.cancelQueries({ queryKey: listKey });
      const previous = qc.getQueryData<ListDetail>(listKey);
      if (previous) {
        const idSet = new Set(itemIds);
        qc.setQueryData<ListDetail>(listKey, {
          ...previous,
          items: previous.items.map((i) => (idSet.has(i.id) ? { ...i, is_checked: isChecked } : i)),
        });
      }
      return { previous };
    },
    onError: (_e, _vars, ctx) => { if (ctx?.previous) qc.setQueryData(listKey, ctx.previous); },
    onSettled: invalidate,
  });

  const { mutate: addItem, isPending: addingItem } = useMutation({
    mutationFn: () => client.post(`/shopping-lists/${id}/items`, {
      name: newItemName.trim(),
      est_price: parseFloat(newItemPrice) || 0,
    }),
    onSuccess: () => {
      setNewItemName('');
      setNewItemPrice('');
      invalidate();
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Could not add the item.'),
  });

  const { mutate: deleteItem } = useMutation({
    mutationFn: (itemId: number) => client.delete(`/shopping-lists/${id}/items/${itemId}`),
    onSettled: invalidate,
  });

  const { mutate: shareTo, isPending: sharing } = useMutation({
    mutationFn: (userIds: number[]) => client.post(`/shopping-lists/${id}/shares`, { user_ids: userIds }),
    onSuccess: () => {
      setSelectedShareIds([]);
      invalidate();
      qc.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
    onError: (e: any) => {
      if (e?.response?.data?.premium_required) {
        setShareOpen(false);
        Alert.alert(
          lang === 'en' ? 'Premium feature' : 'Premium feature',
          lang === 'en'
            ? 'Sharing a shopping list needs uLam Premium. The people you share with do not need it, only you.'
            : 'Kailangan ng uLam Premium para mag-share ng shopping list. Hindi na kailangan ng Premium ng mga sasaluhin mo, ikaw lang.',
          [
            { text: lang === 'en' ? 'Not now' : 'Mamaya na', style: 'cancel' },
            { text: lang === 'en' ? 'See Premium' : 'Tingnan ang Premium', onPress: () => router.push('/upgrade' as any) },
          ],
        );
      } else {
        Alert.alert('Error', e?.response?.data?.message ?? 'Could not share.');
      }
    },
  });

  const { mutate: unshare } = useMutation({
    mutationFn: (userId: number) => client.delete(`/shopping-lists/${id}/shares/${userId}`),
    onSettled: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });

  const { mutate: complete, isPending: completing } = useMutation({
    mutationFn: (body: { log_to_budget?: boolean; use_full_total?: boolean }) =>
      client.post(`/shopping-lists/${id}/complete`, body),
    onSuccess: (response) => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['shopping-lists'] });
      qc.invalidateQueries({ queryKey: ['budget-today'] });
      handleXpResponse(response.data);
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Could not complete the list.'),
  });

  // ── Loading / not found ────────────────────────────────────────────────────

  if (isLoading || !list) {
    return (
      <SafeAreaView className="flex-1 bg-cream-50">
        <View className="flex-row items-center px-4 pt-4 pb-3 gap-3 bg-white border-b border-cream-200">
          <Pressable onPress={() => router.back()} className="p-2 active:opacity-60">
            <Text style={{ fontSize: 20 }}>←</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Skeleton style={{ height: 18, width: 140, marginBottom: 5 }} />
            <Skeleton style={{ height: 11, width: 90 }} />
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 0.5, borderColor: '#F0DEBB', overflow: 'hidden', marginBottom: 16 }}>
              <Skeleton style={{ height: 13, width: 80, margin: 12, borderRadius: 6 }} />
              {[0, 1, 2].map((j) => <SkeletonListItem key={j} />)}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const isOwner = list.my_role === 'owner';
  const isActive = list.status === 'active';
  const isShared = list.shares.length > 0;
  const items = list.items;
  const checkedCount = items.filter((i) => i.is_checked).length;
  const allTotal = list.all_total;
  const boughtTotal = list.bought_total;

  // Group by category, same as the old screen
  const groupMap = new Map<string, { cat: { labelEn: string; labelTl: string; emoji: string }; items: ListItem[] }>();
  for (const cat of [...CATEGORIES, { labelEn: 'Others', labelTl: 'Iba pa', emoji: '🛒' }]) {
    groupMap.set(cat.labelEn, { cat, items: [] });
  }
  items.forEach((i) => groupMap.get(categorize(i.name).labelEn)!.items.push(i));
  const groups = [...groupMap.values()].filter((g) => g.items.length > 0);

  const notBought = items.filter((i) => !i.is_checked);

  const sharedUserIds = new Set(list.shares.map((s) => s.user_id));

  function commitPrice(item: ListItem, raw: string | undefined) {
    const cleaned = (raw ?? '').replace(/[^0-9.]/g, '');
    setEditingPrice(null);
    if (cleaned === '') return;
    patchItem({ itemId: item.id, body: { actual_price: parseFloat(cleaned) || 0 } });
  }

  function commitQty(item: ListItem, raw: string | undefined) {
    setEditingQty(null);
    const trimmed = (raw ?? '').trim();
    if (!trimmed) return;
    patchItem({ itemId: item.id, body: { quantity: trimmed, unit: null } });
  }

  function handleComplete() {
    const logToBudget = list!.type === 'daily';
    if (checkedCount === 0) {
      Alert.alert(
        lang === 'en' ? 'Nothing checked' : 'Walang naka-check',
        lang === 'en'
          ? `No items are checked as bought. Log the full list total of ₱${allTotal.toFixed(0)} instead?`
          : `Walang naka-check na nabili. I-log na lang ang buong ₱${allTotal.toFixed(0)}?`,
        [
          { text: lang === 'en' ? 'Cancel' : 'Kanselahin', style: 'cancel' },
          {
            text: lang === 'en' ? `Log ₱${allTotal.toFixed(0)}` : `I-log ang ₱${allTotal.toFixed(0)}`,
            onPress: () => complete({ log_to_budget: logToBudget, use_full_total: true }),
          },
        ],
      );
      return;
    }
    Alert.alert(
      lang === 'en' ? 'Complete this list?' : 'Kumpletuhin ang listahan?',
      lang === 'en'
        ? `₱${boughtTotal.toFixed(0)} for ${checkedCount} bought item${checkedCount === 1 ? '' : 's'}${logToBudget ? ' will be logged to your budget' : ''}. Unchecked items will be marked "not bought". The list locks afterward.`
        : `₱${boughtTotal.toFixed(0)} para sa ${checkedCount} nabiling item${logToBudget ? ' ang mai-log sa budget mo' : ''}. Ang hindi naka-check ay mamarkahang "hindi nabili". Hindi na ito mababago pagkatapos.`,
      [
        { text: lang === 'en' ? 'Cancel' : 'Kanselahin', style: 'cancel' },
        { text: lang === 'en' ? 'Complete' : 'Kumpletuhin', onPress: () => complete({ log_to_budget: logToBudget }) },
      ],
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      {/* Header */}
      <View className="flex-row items-center px-4 pt-4 pb-3 gap-3 bg-white border-b border-cream-200">
        <Pressable onPress={() => router.back()} className="p-2 active:opacity-60">
          <Text style={{ fontSize: 20 }}>←</Text>
        </Pressable>
        <View className="flex-1">
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 18, color: '#000000' }} numberOfLines={1}>{list.title}</Text>
          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }} numberOfLines={1}>
            {!isOwner
              ? `${lang === 'en' ? 'From' : 'Mula kay'} ${list.owner.name} · `
              : isShared
                ? `${lang === 'en' ? 'Shared with' : 'Kasama'} ${list.shares.length} · `
                : ''}
            {checkedCount}/{items.length} {lang === 'en' ? 'bought' : 'na nabili'} · ₱{allTotal.toFixed(0)}
          </Text>
        </View>
        {isOwner && isActive && (
          <Pressable
            onPress={() => setShareOpen(true)}
            className="w-9 h-9 rounded-full bg-leaf-50 items-center justify-center active:opacity-70"
          >
            <Ionicons name="share-social-outline" size={17} color="#386641" />
          </Pressable>
        )}
        {isActive && checkedCount > 0 && (
          <Pressable
            onPress={() => bulkCheck({ itemIds: items.filter((i) => i.is_checked).map((i) => i.id), isChecked: false })}
            className="px-3 py-1.5 rounded-full bg-cream-200 active:opacity-70"
          >
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A' }}>
              {lang === 'en' ? 'Reset' : 'I-reset'}
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#386641" colors={['#386641']} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* Completed banner */}
        {!isActive && (
          <View style={{ borderRadius: 14, backgroundColor: '#EFF4EC', borderWidth: 1, borderColor: '#B9D0AE', padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 20 }}>✅</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#386641' }}>
                {lang === 'en' ? 'Completed' : 'Tapos na'} · ₱{Number(list.total_spent ?? 0).toFixed(0)} {lang === 'en' ? 'spent' : 'nagastos'}
              </Text>
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginTop: 1 }}>
                {lang === 'en' ? 'This list is locked. Everyone shared can view this summary.' : 'Naka-lock na ang listahan. Nakikita ng lahat ng kasama ang buod na ito.'}
              </Text>
            </View>
          </View>
        )}

        {/* Item groups */}
        {groups.map(({ cat, items: catItems }) => {
          const allDone = catItems.length > 0 && catItems.every((i) => i.is_checked);
          return (
            <View key={cat.labelEn} className="mb-4">
              <View className="flex-row items-center gap-2 mb-2">
                <Text style={{ fontSize: 14 }}>{cat.emoji}</Text>
                <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 14, color: '#000000' }}>
                  {lang === 'en' ? cat.labelEn : cat.labelTl}
                </Text>
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', flex: 1 }}>
                  · {catItems.length} {lang === 'en' ? 'item' : 'item'}
                </Text>
                {isActive && (
                  <Pressable
                    onPress={() => bulkCheck({ itemIds: catItems.map((i) => i.id), isChecked: !allDone })}
                    hitSlop={8}
                    className="flex-row items-center gap-1.5 active:opacity-70"
                  >
                    <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A' }}>
                      {lang === 'en' ? 'Check all' : 'Lahat'}
                    </Text>
                    <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: allDone ? '#386641' : 'transparent', borderColor: allDone ? '#386641' : '#D3C5AB' }}>
                      {allDone && <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>{'✓'}</Text>}
                    </View>
                  </Pressable>
                )}
              </View>
              <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 0.5, borderColor: '#F0DEBB', overflow: 'hidden' }}>
                {catItems.map((item, idx) => {
                  const done = item.is_checked;
                  const isEditPrice = editingPrice === item.id;
                  const isEditQty = editingQty === item.id;
                  const price = itemPrice(item);
                  const qtyStr = [item.quantity, item.unit].filter(Boolean).join(' ');
                  const priceChanged = item.actual_price !== null && Number(item.actual_price) !== Number(item.est_price);
                  const row = (
                    <View
                      style={{
                        flexDirection: 'row', alignItems: 'center',
                        backgroundColor: '#fff',
                        borderBottomWidth: idx < catItems.length - 1 ? 1 : 0,
                        borderBottomColor: '#F9EDD3',
                      }}
                    >
                      {/* Checkbox */}
                      <Pressable
                        onPress={() => isActive && patchItem({ itemId: item.id, body: { is_checked: !done } })}
                        hitSlop={8}
                        style={{ paddingLeft: 16, paddingVertical: 14, paddingRight: 12 }}
                        className="active:opacity-70"
                        disabled={!isActive}
                      >
                        <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? '#386641' : 'transparent', borderColor: done ? '#386641' : '#D3C5AB' }}>
                          {done && <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>✓</Text>}
                        </View>
                      </Pressable>

                      {/* Name + qty + notes */}
                      <View style={{ flex: 1, paddingVertical: 10 }}>
                        <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: done ? '#B0A18C' : '#000000', textDecorationLine: done ? 'line-through' : 'none' }}>
                          {item.name}
                        </Text>
                        {isEditQty ? (
                          <TextInput
                            autoFocus
                            style={{
                              minWidth: 60, maxWidth: 130, marginTop: 2,
                              paddingHorizontal: 7, paddingVertical: 3,
                              borderRadius: 6, borderWidth: 1.5, borderColor: '#6F655A',
                              fontSize: 13, fontFamily: 'NunitoSans_600SemiBold', color: '#000000',
                              backgroundColor: '#EFF4EC',
                            }}
                            defaultValue={qtyStr}
                            placeholder="qty / unit"
                            placeholderTextColor="#B0A18C"
                            returnKeyType="done"
                            onSubmitEditing={(e) => commitQty(item, e.nativeEvent.text)}
                            onEndEditing={(e) => commitQty(item, e.nativeEvent.text)}
                            selectTextOnFocus
                          />
                        ) : (
                          <Pressable
                            onPress={() => isActive && setEditingQty(item.id)}
                            hitSlop={6}
                            className="active:opacity-60"
                            disabled={!isActive}
                          >
                            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#B0A18C', marginTop: 2 }}>
                              {qtyStr || (lang === 'en' ? 'tap to set qty' : 'i-set ang qty')}
                              {item.dish_name ? ` · ${item.dish_name}` : ''}
                            </Text>
                          </Pressable>
                        )}
                        {item.needed_note && (
                          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: '#C4881C', marginTop: 1 }}>
                            {item.needed_note}
                          </Text>
                        )}
                        {isShared && done && item.checked_by && (
                          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: '#6F655A', marginTop: 1 }}>
                            ✓ {item.checked_by.name.split(' ')[0]}
                          </Text>
                        )}
                        {isShared && item.added_by && item.added_by.id !== list.owner_id && (
                          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: '#6F655A', marginTop: 1 }}>
                            + {lang === 'en' ? 'added by' : 'dagdag ni'} {item.added_by.name.split(' ')[0]}
                          </Text>
                        )}
                      </View>

                      {/* Price */}
                      {isEditPrice ? (
                        <TextInput
                          autoFocus
                          style={{
                            width: 72, marginRight: 12, paddingHorizontal: 8, paddingVertical: 6,
                            borderRadius: 8, borderWidth: 1.5, borderColor: '#386641',
                            fontSize: 14, fontFamily: 'NunitoSans_700Bold', color: '#386641',
                            textAlign: 'right', backgroundColor: '#EFF4EC',
                          }}
                          keyboardType="decimal-pad"
                          defaultValue={price > 0 ? String(price) : ''}
                          placeholder="0"
                          placeholderTextColor="#B0A18C"
                          returnKeyType="done"
                          onSubmitEditing={(e) => commitPrice(item, e.nativeEvent.text)}
                          onEndEditing={(e) => commitPrice(item, e.nativeEvent.text)}
                          selectTextOnFocus
                        />
                      ) : (
                        <Pressable
                          onPress={() => isActive && setEditingPrice(item.id)}
                          hitSlop={8}
                          style={{ paddingHorizontal: 12, paddingVertical: 13, alignItems: 'flex-end' }}
                          className="active:opacity-60"
                          disabled={!isActive}
                        >
                          <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: done ? '#D3C5AB' : priceChanged ? '#C4881C' : '#386641' }}>
                            ₱{price.toFixed(0)}
                          </Text>
                          {priceChanged && !done && (
                            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#C4881C', marginTop: 1 }}>
                              {lang === 'en' ? 'edited' : 'binago'}
                            </Text>
                          )}
                        </Pressable>
                      )}
                    </View>
                  );

                  return isOwner && isActive ? (
                    <Swipeable
                      key={item.id}
                      friction={2}
                      rightThreshold={36}
                      renderRightActions={() => <SwipeDelete onDelete={() => deleteItem(item.id)} />}
                    >
                      {row}
                    </Swipeable>
                  ) : (
                    <View key={item.id}>{row}</View>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* Add item (owner or recipient, active lists only) */}
        {isActive && (
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Text style={{ fontSize: 14 }}>➕</Text>
              <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 14, color: '#000000' }}>
                {lang === 'en' ? 'Add item' : 'Dagdag na aytem'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#F0DEBB', paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#000000', fontFamily: 'NunitoSans_400Regular' }}
                placeholder={lang === 'en' ? 'Item name…' : 'Pangalan ng aytem…'}
                placeholderTextColor="#B0A18C"
                value={newItemName}
                onChangeText={setNewItemName}
                returnKeyType="next"
                onSubmitEditing={() => priceInputRef.current?.focus()}
              />
              <TextInput
                ref={priceInputRef}
                style={{ width: 80, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#F0DEBB', paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: '#000000', fontFamily: 'NunitoSans_400Regular' }}
                placeholder="₱0"
                placeholderTextColor="#B0A18C"
                value={newItemPrice}
                onChangeText={(v) => setNewItemPrice(v.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={() => newItemName.trim() && addItem()}
              />
              <Pressable
                onPress={() => newItemName.trim() && addItem()}
                disabled={addingItem}
                style={{ backgroundColor: '#C45E3A', borderRadius: 999, width: 46, alignItems: 'center', justifyContent: 'center', shadowColor: '#C45E3A', shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}
                className="active:opacity-70"
              >
                {addingItem ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="add" size={22} color="#fff" />}
              </Pressable>
            </View>
          </View>
        )}

        {/* Not-bought summary on completed lists */}
        {!isActive && notBought.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 14, color: '#000000', marginBottom: 8 }}>
              {lang === 'en' ? 'Not bought' : 'Hindi nabili'} ({notBought.length})
            </Text>
            <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 0.5, borderColor: '#F0DEBB', overflow: 'hidden' }}>
              {notBought.map((item, idx) => (
                <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: idx < notBought.length - 1 ? 1 : 0, borderBottomColor: '#F9EDD3' }}>
                  <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: '#B0A18C', flex: 1 }}>{item.name}</Text>
                  <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#B0A18C' }}>₱{itemPrice(item).toFixed(0)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Budget vs total note (daily lists only) */}
        {isActive && list.type === 'daily' && budget && allTotal > 0 && (() => {
          const diff = budget.budget - allTotal;
          const over = diff < 0;
          return (
            <View style={{
              borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
              backgroundColor: over ? '#FCEBEB' : '#EFF4EC',
              borderWidth: 1, borderColor: over ? '#F2C1BE' : '#B9D0AE',
              flexDirection: 'row', alignItems: 'center', gap: 10,
            }}>
              <Text style={{ fontSize: 18 }}>{over ? '⚠️' : '✅'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: over ? '#E24B4A' : '#386641' }}>
                  {over
                    ? (lang === 'en' ? `Over budget by ₱${Math.abs(diff).toFixed(0)}` : `Lumampas sa budget ng ₱${Math.abs(diff).toFixed(0)}`)
                    : (lang === 'en' ? `₱${diff.toFixed(0)} remaining in budget` : `₱${diff.toFixed(0)} pa ang natitira sa budget`)}
                </Text>
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: over ? '#E24B4A' : '#6F655A', marginTop: 2 }}>
                  {lang === 'en'
                    ? `Daily budget: ₱${budget.budget.toFixed(0)} · Shopping total: ₱${allTotal.toFixed(0)}`
                    : `Daily budget: ₱${budget.budget.toFixed(0)} · Kabuuan: ₱${allTotal.toFixed(0)}`}
                </Text>
              </View>
            </View>
          );
        })()}

        {/* Totals card: cash to bring + bought so far */}
        <View style={{ backgroundColor: '#3C3A2F', borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: 'rgba(255,248,232,0.78)', marginBottom: 2 }}>
                {lang === 'en' ? 'Cash to bring' : 'Dalhing pera'}
              </Text>
              <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 26, color: 'white' }}>₱{allTotal.toFixed(0)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: 'rgba(255,248,232,0.78)', marginBottom: 2 }}>
                {lang === 'en' ? 'Bought so far' : 'Nabili na'}
              </Text>
              <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 20, color: 'white' }}>
                ₱{boughtTotal.toFixed(0)} · {checkedCount}/{items.length}
              </Text>
            </View>
          </View>
        </View>

        {/* Action button (owner only) */}
        {isOwner && isActive && (
          <Pressable
            onPress={handleComplete}
            disabled={completing || items.length === 0}
            style={{ borderRadius: 14, backgroundColor: '#C45E3A', padding: 16, alignItems: 'center', opacity: completing || items.length === 0 ? 0.5 : 1 }}
            className="active:opacity-80"
          >
            {completing ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#fff' }}>
                {list.type === 'daily'
                  ? (lang === 'en' ? '💾 Save Shopping Log' : '💾 I-save ang Gastos')
                  : (lang === 'en' ? '✅ Complete List' : '✅ Kumpletuhin ang Listahan')}
              </Text>
            )}
          </Pressable>
        )}
      </ScrollView>

      {/* Share modal */}
      <Modal visible={shareOpen} animationType="slide" transparent onRequestClose={() => setShareOpen(false)}>
        <Pressable
          onPress={() => setShareOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', paddingBottom: insets.bottom + 12 }}
          >
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#F9EDD3', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 15, color: '#000000' }}>
                {lang === 'en' ? 'Share with connections' : 'I-share sa mga koneksyon'}
              </Text>
              <Pressable onPress={() => setShareOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={18} color="#6F655A" />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 340 }}>
              {(connections?.data ?? []).length === 0 ? (
                <View className="p-6 items-center">
                  <Text className="text-xs text-ink-soft text-center">
                    {lang === 'en'
                      ? 'No connections yet. Visit a profile and tap Connect first.'
                      : 'Wala ka pang koneksyon. Puntahan muna ang profile at i-tap ang Connect.'}
                  </Text>
                </View>
              ) : (
                (connections?.data ?? []).map((c) => {
                  const alreadyShared = sharedUserIds.has(c.user.id);
                  const selected = selectedShareIds.includes(c.user.id);
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => {
                        if (alreadyShared) {
                          Alert.alert(
                            lang === 'en' ? 'Remove share?' : 'Tanggalin ang share?',
                            lang === 'en'
                              ? `${c.user.name} will no longer see this list.`
                              : `Hindi na makikita ni ${c.user.name} ang listahang ito.`,
                            [
                              { text: lang === 'en' ? 'Cancel' : 'Kanselahin', style: 'cancel' },
                              { text: lang === 'en' ? 'Remove' : 'Tanggalin', style: 'destructive', onPress: () => unshare(c.user.id) },
                            ],
                          );
                        } else {
                          setSelectedShareIds((p) => selected ? p.filter((x) => x !== c.user.id) : [...p, c.user.id]);
                        }
                      }}
                      className="flex-row items-center gap-3 px-4 py-3 border-b border-cream-200 active:opacity-70"
                    >
                      {c.user.avatar ? (
                        <Image source={{ uri: `${API_URL}${c.user.avatar}` }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F9EDD3' }} />
                      ) : (
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF4EC', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#386641' }}>
                            {c.user.name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: '#000000' }}>{c.user.name}</Text>
                        {c.my_label && (
                          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: '#6F655A' }}>{c.my_label}</Text>
                        )}
                      </View>
                      {alreadyShared ? (
                        <View className="rounded-full bg-leaf-50 px-2.5 py-1">
                          <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, color: '#386641' }}>
                            {lang === 'en' ? 'Shared' : 'Naka-share'}
                          </Text>
                        </View>
                      ) : (
                        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? '#386641' : 'transparent', borderColor: selected ? '#386641' : '#D3C5AB' }}>
                          {selected && <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>✓</Text>}
                        </View>
                      )}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
            {selectedShareIds.length > 0 && (
              <View style={{ padding: 16 }}>
                <Pressable
                  onPress={() => shareTo(selectedShareIds)}
                  disabled={sharing}
                  className="w-full rounded-xl bg-brand-600 py-3.5 items-center active:opacity-80"
                >
                  {sharing
                    ? <ActivityIndicator color="white" size="small" />
                    : <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#fff' }}>
                        {lang === 'en' ? `Share with ${selectedShareIds.length}` : `I-share sa ${selectedShareIds.length}`}
                      </Text>}
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <RewardCelebration reward={reward} onDismiss={() => setReward(null)} />
    </SafeAreaView>
  );
}
