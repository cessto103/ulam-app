import client from '@/src/api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '@/src/context/LanguageContext';
import { Skeleton, SkeletonListItem } from '@/src/components/Skeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Per-day storage key so today's list survives leaving the screen / app restarts. */
function todayStorageKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `shopping-list:${d.getFullYear()}-${m}-${dd}`;
}

/** Red delete action revealed by swiping a row left. */
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

type Ingredient = {
  id: number;
  name: string;
  quantity: string;
  unit: string;
  estimated_price: number;
  dish_name: string;
  meal_type: string;
};

type MealPlanItem = {
  id: number;
  meal_type: string;
  dish_name: string;
  name?: string;
  estimated_cost: number | string;
  ingredients: { id: number; name: string; quantity: string; unit: string; estimated_price: number }[];
};

type MealPlan = {
  id: number;
  total_estimated_cost: number | string;
  items: MealPlanItem[];
};

// ─── Category rules ───────────────────────────────────────────────────────────

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

// ─── API ───────────────────────────────────────────────────────────────────────

async function fetchPlan(): Promise<MealPlan | null> {
  try {
    const { data } = await client.get('/meal-plans/today');
    return data.meal_plan ?? null;
  } catch { return null; }
}

async function fetchBudgetToday(): Promise<{ has_budget: boolean; budget: number } | null> {
  try {
    const { data } = await client.get('/budget/today');
    return data?.has_budget ? data : null;
  } catch { return null; }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type CustomItem = { id: string; name: string; price: string };

export default function ShoppingListScreen() {
  const router   = useRouter();
  const qc       = useQueryClient();
  const { lang } = useLanguage();
  const [checked, setChecked]               = useState<Record<string, boolean>>({});
  const [removed, setRemoved]               = useState<Record<string, boolean>>({});
  const [priceOverrides, setPriceOverrides] = useState<Record<string, string>>({});
  const [qtyOverrides, setQtyOverrides]     = useState<Record<string, string>>({});
  const [editingPrice, setEditingPrice]     = useState<string | null>(null);
  const [editingQty, setEditingQty]         = useState<string | null>(null);
  const [customItems, setCustomItems]       = useState<CustomItem[]>([]);
  const [newItemName, setNewItemName]       = useState('');
  const [newItemPrice, setNewItemPrice]     = useState('');
  const [saving, setSaving]                 = useState(false);
  const [refreshing, setRefreshing]         = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['meal-plan-today'] }),
      qc.invalidateQueries({ queryKey: ['budget-today'] }),
    ]);
    setRefreshing(false);
  };
  const [saved, setSaved]                   = useState(false);
  const [hydrated, setHydrated]             = useState(false);
  const priceInputRef = useRef<TextInput>(null);
  const storageKey = todayStorageKey();

  // Restore today's list state (checks, deletions, custom items, edits) on open
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw) {
          const s = JSON.parse(raw);
          setChecked(s.checked ?? {});
          setRemoved(s.removed ?? {});
          setCustomItems(s.customItems ?? []);
          setPriceOverrides(s.priceOverrides ?? {});
          setQtyOverrides(s.qtyOverrides ?? {});
        }
        // drop stale entries from previous days
        const keys = await AsyncStorage.getAllKeys();
        const old = keys.filter(k => k.startsWith('shopping-list:') && k !== storageKey);
        if (old.length) await AsyncStorage.multiRemove(old);
      } catch {}
      setHydrated(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on every change (after initial hydration)
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(
      storageKey,
      JSON.stringify({ checked, removed, customItems, priceOverrides, qtyOverrides }),
    ).catch(() => {});
  }, [hydrated, checked, removed, customItems, priceOverrides, qtyOverrides, storageKey]);

  const { data: plan, isLoading } = useQuery({
    queryKey: ['meal-plan-today'],
    queryFn: fetchPlan,
    staleTime: 300_000,
  });

  const { data: budget } = useQuery({
    queryKey: ['budget-today'],
    queryFn: fetchBudgetToday,
    staleTime: 60_000,
  });

  const allIngredients: Ingredient[] = (plan?.items ?? []).flatMap(item =>
    (item.ingredients ?? []).map(ing => ({
      ...ing,
      dish_name: item.dish_name ?? item.name ?? '',
      meal_type: item.meal_type,
    }))
  ).filter(ing => !removed[`${ing.meal_type}-${ing.id}`]);

  function removeIngredient(key: string) {
    setRemoved(prev => ({ ...prev, [key]: true }));
    setChecked(prev => { const n = { ...prev }; delete n[key]; return n; });
  }

  // Group by category
  const groupMap = new Map<string, { cat: typeof CATEGORIES[0] | { labelEn: string; labelTl: string; emoji: string }; items: Ingredient[] }>();
  const allCats = [...CATEGORIES, { labelEn: 'Others', labelTl: 'Iba pa', emoji: '🛒', pattern: /.*/ }];
  for (const cat of allCats) {
    groupMap.set(cat.labelEn, { cat, items: [] });
  }
  allIngredients.forEach(ing => {
    const c = categorize(ing.name);
    groupMap.get(c.labelEn)!.items.push(ing);
  });

  const groups = [...groupMap.values()].filter(g => g.items.length > 0);

  function effPrice(key: string, base: number): number {
    const ov = priceOverrides[key];
    return ov !== undefined ? (parseFloat(ov) || 0) : base;
  }

  function commitPrice(key: string, raw: string | undefined) {
    setPriceOverrides(p => ({ ...p, [key]: (raw ?? '').replace(/[^0-9.]/g, '') }));
    setEditingPrice(null);
  }

  function effQty(key: string, ing: Ingredient): string {
    return qtyOverrides[key] ?? [ing.quantity, ing.unit].filter(Boolean).join(' ');
  }

  function commitQty(key: string, raw: string | undefined) {
    setQtyOverrides(p => ({ ...p, [key]: (raw ?? '').trim() }));
    setEditingQty(null);
  }

  const customTotal  = customItems.reduce((s, i) => s + (parseFloat(i.price) || 0), 0);
  const total        = allIngredients.reduce((s, i) => {
    const key = `${i.meal_type}-${i.id}`;
    return s + effPrice(key, Number(i.estimated_price));
  }, 0) + customTotal;
  const checkedCount = Object.values(checked).filter(Boolean).length;

  function addCustomItem() {
    if (!newItemName.trim()) return;
    setCustomItems(prev => [...prev, { id: Date.now().toString(), name: newItemName.trim(), price: newItemPrice }]);
    setNewItemName('');
    setNewItemPrice('');
  }

  function removeCustomItem(id: string) {
    setCustomItems(prev => prev.filter(i => i.id !== id));
    setChecked(prev => { const n = { ...prev }; delete n[`custom-${id}`]; return n; });
  }

  async function saveLog() {
    if (total === 0) {
      Alert.alert(
        lang === 'en' ? 'Nothing to save' : 'Walang i-save',
        lang === 'en' ? 'Add items or edit prices first.' : 'Magdagdag muna ng aytem o baguhin ang presyo.',
      );
      return;
    }
    setSaving(true);
    try {
      // Build breakdown per meal type
      const byType: Record<string, number> = {};
      allIngredients.forEach(ing => {
        const key = `${ing.meal_type}-${ing.id}`;
        byType[ing.meal_type] = (byType[ing.meal_type] ?? 0) + effPrice(key, Number(ing.estimated_price));
      });
      if (customTotal > 0) byType['iba pa'] = (byType['iba pa'] ?? 0) + customTotal;
      const breakdown = Object.entries(byType).map(([category, amount]) => ({ category, amount }));

      await client.post('/budget/log', { actual_spent: total, expense_breakdown: breakdown });
      qc.invalidateQueries({ queryKey: ['budget-today'] });
      setSaved(true);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? (lang === 'en' ? 'Could not save. Try again.' : 'Hindi na-save. Subukan ulit.');
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-cream-50">
        <View className="flex-row items-center px-4 pt-4 pb-3 gap-3 bg-white border-b border-cream-200">
          <View className="p-2"><Skeleton style={{ width: 20, height: 20, borderRadius: 10 }} /></View>
          <View style={{ flex: 1 }}>
            <Skeleton style={{ height: 18, width: 120, marginBottom: 5 }} />
            <Skeleton style={{ height: 11, width: 80 }} />
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {[0,1,2,3].map(i => (
            <View key={i} style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 0.5, borderColor: '#F0DEBB', overflow: 'hidden', marginBottom: 16 }}>
              <Skeleton style={{ height: 13, width: 80, margin: 12, borderRadius: 6 }} />
              {[0,1,2].map(j => <SkeletonListItem key={j} />)}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!plan || allIngredients.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-cream-50">
        <View className="flex-row items-center px-4 pt-4 pb-3 gap-3 bg-white border-b border-cream-200">
          <Pressable onPress={() => router.back()} className="p-2 active:opacity-60">
            <Text style={{ fontSize: 20 }}>←</Text>
          </Pressable>
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 18, color: '#000000' }}>Shopping List</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🛒</Text>
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#000000', marginBottom: 8, textAlign: 'center' }}>
            {lang === 'en' ? 'No meal plan yet' : 'Walang meal plan pa'}
          </Text>
          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#6F655A', textAlign: 'center', lineHeight: 20 }}>
            {lang === 'en'
              ? 'Generate a meal plan on the Meal Plan tab first to see your shopping list.'
              : 'Gumawa muna ng meal plan sa Meal Plan tab para makita ang shopping list.'}
          </Text>
        </View>
      </SafeAreaView>
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
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 18, color: '#000000' }}>Shopping List</Text>
          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
            {checkedCount}/{allIngredients.length} {lang === 'en' ? 'bought' : 'na nabili'} · ₱{total.toFixed(0)} {lang === 'en' ? 'total' : 'kabuuan'}
          </Text>
        </View>
        {checkedCount > 0 && (
          <Pressable onPress={() => setChecked({})} className="px-3 py-1.5 rounded-full bg-cream-200 active:opacity-70">
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A' }}>
              {lang === 'en' ? 'Reset' : 'I-reset'}
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#386641" colors={['#386641']} />}
      >
        {groups.map(({ cat, items }) => (
          <View key={cat.labelEn} className="mb-4">
            {(() => {
              const keys = items.map(i => `${i.meal_type}-${i.id}`);
              const allDone = keys.length > 0 && keys.every(k => checked[k]);
              return (
                <View className="flex-row items-center gap-2 mb-2">
                  <Text style={{ fontSize: 14 }}>{cat.emoji}</Text>
                  <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 14, color: '#000000' }}>
                    {lang === 'en' ? cat.labelEn : cat.labelTl}
                  </Text>
                  <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', flex: 1 }}>
                    · {items.length} {lang === 'en' ? 'item' : 'item'}
                  </Text>
                  {/* Check all in this category */}
                  <Pressable
                    onPress={() => setChecked(prev => {
                      const n = { ...prev };
                      keys.forEach(k => { n[k] = !allDone; });
                      return n;
                    })}
                    hitSlop={8}
                    className="flex-row items-center gap-1.5 active:opacity-70"
                  >
                    <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A' }}>
                      {lang === 'en' ? 'Check all' : 'Lahat'}
                    </Text>
                    <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: allDone ? '#386641' : 'transparent', borderColor: allDone ? '#386641' : '#D3C5AB' }}>
                      {allDone && <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>{'\u2713'}</Text>}
                    </View>
                  </Pressable>
                </View>
              );
            })()}
            <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 0.5, borderColor: '#F0DEBB', overflow: 'hidden' }}>
              {items.map((ing, idx) => {
                const key      = `${ing.meal_type}-${ing.id}`;
                const done          = !!checked[key];
                const isEditPrice   = editingPrice === key;
                const isEditQty     = editingQty === key;
                const price         = effPrice(key, Number(ing.estimated_price));
                const qtyStr        = effQty(key, ing);
                const priceChanged  = priceOverrides[key] !== undefined;
                const qtyChanged    = qtyOverrides[key] !== undefined;
                return (
                  <Swipeable
                    key={key}
                    friction={2}
                    rightThreshold={36}
                    renderRightActions={() => <SwipeDelete onDelete={() => removeIngredient(key)} />}
                  >
                  <View
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      backgroundColor: '#fff',
                      borderBottomWidth: idx < items.length - 1 ? 1 : 0,
                      borderBottomColor: '#F9EDD3',
                    }}
                  >
                    {/* Checkbox — tap to toggle */}
                    <Pressable
                      onPress={() => setChecked(prev => ({ ...prev, [key]: !done }))}
                      hitSlop={8}
                      style={{ paddingLeft: 16, paddingVertical: 14, paddingRight: 12 }}
                      className="active:opacity-70"
                    >
                      <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? '#386641' : 'transparent', borderColor: done ? '#386641' : '#D3C5AB' }}>
                        {done && <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>✓</Text>}
                      </View>
                    </Pressable>

                    {/* Ingredient info — name + tappable qty */}
                    <View style={{ flex: 1, paddingVertical: 10 }}>
                      <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: done ? '#B0A18C' : '#000000', textDecorationLine: done ? 'line-through' : 'none' }}>
                        {ing.name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        {isEditQty ? (
                          <TextInput
                            autoFocus
                            style={{
                              minWidth: 60, maxWidth: 130,
                              paddingHorizontal: 7, paddingVertical: 3,
                              borderRadius: 6, borderWidth: 1.5, borderColor: '#6F655A',
                              fontSize: 13, fontFamily: 'NunitoSans_600SemiBold', color: '#000000',
                              backgroundColor: '#EFF4EC',
                            }}
                            defaultValue={qtyStr}
                            placeholder="qty / unit"
                            placeholderTextColor="#B0A18C"
                            returnKeyType="done"
                            onSubmitEditing={e => commitQty(key, e.nativeEvent.text)}
                            onEndEditing={e => commitQty(key, e.nativeEvent.text)}
                            selectTextOnFocus
                          />
                        ) : (
                          <Pressable
                            onPress={() => setEditingQty(key)}
                            hitSlop={6}
                            className="active:opacity-60"
                          >
                            <Text style={{
                              fontFamily: 'NunitoSans_400Regular', fontSize: 13,
                              color: qtyChanged && !done ? '#6F655A' : '#B0A18C',
                              textDecorationLine: qtyChanged && !done ? 'underline' : 'none',
                            }}>
                              {qtyStr || (lang === 'en' ? 'tap to set qty' : 'i-set ang qty')}
                              {ing.dish_name ? ` · ${ing.dish_name}` : ''}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    </View>

                    {/* Price — tap to edit */}
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
                        onSubmitEditing={e => commitPrice(key, e.nativeEvent.text)}
                        onEndEditing={e => commitPrice(key, e.nativeEvent.text)}
                        selectTextOnFocus
                      />
                    ) : (
                      <Pressable
                        onPress={() => setEditingPrice(key)}
                        hitSlop={8}
                        style={{ paddingHorizontal: 12, paddingVertical: 13, alignItems: 'flex-end' }}
                        className="active:opacity-60"
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
                  </Swipeable>
                );
              })}
            </View>
          </View>
        ))}

        {/* Custom "Others" items */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Text style={{ fontSize: 14 }}>➕</Text>
            <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 14, color: '#000000' }}>
              {lang === 'en' ? 'Add item' : 'Dagdag na aytem'}
            </Text>
          </View>
          {customItems.length > 0 && (
            <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 0.5, borderColor: '#F0DEBB', overflow: 'hidden', marginBottom: 10 }}>
              {customItems.map((ci, idx) => {
                const key = `custom-${ci.id}`;
                const done = !!checked[key];
                return (
                  <Swipeable
                    key={ci.id}
                    friction={2}
                    rightThreshold={36}
                    renderRightActions={() => <SwipeDelete onDelete={() => removeCustomItem(ci.id)} />}
                  >
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: idx < customItems.length - 1 ? 1 : 0, borderBottomColor: '#F9EDD3' }}>
                    <Pressable onPress={() => setChecked(p => ({ ...p, [key]: !done }))} style={{ marginRight: 12 }}>
                      <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? '#386641' : 'transparent', borderColor: done ? '#386641' : '#D3C5AB' }}>
                        {done && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>✓</Text>}
                      </View>
                    </Pressable>
                    <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: done ? '#B0A18C' : '#000000', flex: 1, textDecorationLine: done ? 'line-through' : 'none' }}>
                      {ci.name}
                    </Text>
                    <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: done ? '#D3C5AB' : '#386641', marginRight: 10 }}>
                      {ci.price ? `₱${parseFloat(ci.price).toFixed(0)}` : '-'}
                    </Text>
                    <Pressable onPress={() => removeCustomItem(ci.id)} hitSlop={8}>
                      <Text style={{ color: '#E24B4A', fontSize: 16, lineHeight: 18 }}>×</Text>
                    </Pressable>
                  </View>
                  </Swipeable>
                );
              })}
            </View>
          )}
          {/* Input row */}
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
              onChangeText={v => setNewItemPrice(v.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={addCustomItem}
            />
            <Pressable
              onPress={addCustomItem}
              style={{ backgroundColor: '#C45E3A', borderRadius: 999, width: 46, alignItems: 'center', justifyContent: 'center', shadowColor: '#C45E3A', shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}
              className="active:opacity-70"
            >
              <Ionicons name="add" size={22} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Budget vs total note */}
        {budget && total > 0 && (() => {
          const diff = budget.budget - total;
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
                    ? `Daily budget: ₱${budget.budget.toFixed(0)} · Shopping total: ₱${total.toFixed(0)}`
                    : `Daily budget: ₱${budget.budget.toFixed(0)} · Kabuuan: ₱${total.toFixed(0)}`}
                </Text>
              </View>
            </View>
          );
        })()}

        {/* Total */}
        <View style={{ backgroundColor: '#3C3A2F', borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: 'rgba(255,248,232,0.78)', marginBottom: 2 }}>
                {lang === 'en' ? 'Shopping total' : 'Kabuuang gastos'}
              </Text>
              <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 26, color: 'white' }}>₱{total.toFixed(0)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: 'rgba(255,248,232,0.78)', marginBottom: 2 }}>
                {lang === 'en' ? 'Bought' : 'Nabilhin na'}
              </Text>
              <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 20, color: 'white' }}>
                {checkedCount}/{allIngredients.length + customItems.length}
              </Text>
            </View>
          </View>
        </View>

        {/* Save button */}
        {saved ? (
          <View style={{ borderRadius: 14, backgroundColor: '#EFF4EC', borderWidth: 1, borderColor: '#B9D0AE', padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            <Text style={{ fontSize: 18 }}>✅</Text>
            <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#386641' }}>
              {lang === 'en' ? 'Shopping logged!' : 'Nai-log na ang gastos!'}
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={saveLog}
            disabled={saving || total === 0}
            style={{ borderRadius: 14, backgroundColor: '#C45E3A', padding: 16, alignItems: 'center', opacity: saving || total === 0 ? 0.5 : 1 }}
            className="active:opacity-80"
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#fff' }}>
                {lang === 'en' ? '💾 Save Shopping Log' : '💾 I-save ang Gastos'}
              </Text>
            )}
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
