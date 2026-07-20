import { ITEM_CATEGORIES } from '@/src/constants/itemCategories';
import client from '@/src/api/client';
import RewardCelebration from '@/src/components/RewardCelebration';
import SelectField from '@/src/components/SelectField';
import { postMultipart, resizeForUpload } from '@/src/utils/uploadImage';
import * as ImagePicker from 'expo-image-picker';
import { useLanguage } from '@/src/context/LanguageContext';
import { useXpReward } from '@/src/hooks/useXpReward';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NearbyTarget = {
  id: number;
  kind?: 'market' | 'tindahan';
  name: string;
  type: string;
  barangay: string;
  municipality: string;
};

const TARGET_TYPE_EMOJI: Record<string, string> = {
  palengke: '🏪',
  wet_market: '🏪',
  supermarket: '🏬',
  grocery: '🏬',
  tindahan: '🛒',
};

const CATEGORIES = ITEM_CATEGORIES;

const UNITS = ['kg', 'bundle', 'pcs', '100g', 'liter(s)', 'pack', 'bottle', 'tray', 'lata', 'sachet'];

const HEADER_GRADIENT = ['#CC5027', '#E7653B', '#EC8156'] as const;

export default function ReportPriceScreen() {
  const router = useRouter();
  const { lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    item?: string;
    tindahan_id?: string;
    tindahan_name?: string;
    tindahan_type?: string;
    market_id?: string;
    market_name?: string;
    market_type?: string;
  }>();

  const [itemName, setItemName]     = useState(params.item ?? '');
  const [category, setCategory]     = useState('');
  const [price, setPrice]           = useState('');
  const [unit, setUnit]             = useState('kg');
  const [loading, setLoading]       = useState(false);
  const [photoUri, setPhotoUri]     = useState<string | null>(null);
  const [success, setSuccess]       = useState(false);
  const { reward, setReward, handleXpResponse } = useXpReward();

  // Prepopulation from the Price Checker stall sheet's "Report a price here"
  // button: a market_id means the target is that market (the stall itself,
  // if any, is tracked separately below); a tindahan_id with no market_id
  // means that stall IS the target directly, same as picking a standalone
  // store manually. barangay/municipality are left blank here -- they're
  // only read from the picker's own candidate rows, never for a
  // params-derived selection or the submit payload (the backend resolves
  // address from the DB row by id).
  const [target, setTarget] = useState<NearbyTarget | null>(() => {
    if (params.market_id) {
      return {
        id: Number(params.market_id),
        kind: 'market',
        name: params.market_name ?? '',
        type: params.market_type ?? '',
        barangay: '',
        municipality: '',
      };
    }
    if (params.tindahan_id) {
      return {
        id: Number(params.tindahan_id),
        kind: 'tindahan',
        name: params.tindahan_name ?? '',
        type: params.tindahan_type ?? '',
        barangay: '',
        municipality: '',
      };
    }
    return null;
  });
  const [stall, setStall] = useState<{ id: number; name: string; type: string } | null>(() =>
    params.market_id && params.tindahan_id
      ? { id: Number(params.tindahan_id), name: params.tindahan_name ?? '', type: params.tindahan_type ?? '' }
      : null
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [targetSearch, setTargetSearch] = useState('');

  // No lat/lng params — the API falls back to the signed-in user's own
  // registered municipality (wherever in the Philippines that is), so this
  // list is always regionally relevant instead of a fixed Metro Manila set.
  const { data: nearbyTargets = [] } = useQuery<NearbyTarget[]>({
    queryKey: ['markets-for-report'],
    queryFn: async () => {
      const { data } = await client.get('/markets');
      return data.markets ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const filteredTargets = useMemo(() => {
    const q = targetSearch.trim().toLowerCase();
    if (!q) return nearbyTargets;
    return nearbyTargets.filter(
      (m) => m.name.toLowerCase().includes(q) || m.barangay?.toLowerCase().includes(q)
    );
  }, [nearbyTargets, targetSearch]);

  // Stalls belonging to the chosen market, for the optional "narrow down to
  // a specific stall" field -- stalls-within-a-market never appear in the
  // flat nearbyTargets list above (that's markets + standalone stores only).
  const { data: marketDetail, isLoading: stallsLoading } = useQuery<{ stalls: { id: number; name: string; type: string }[] }>({
    queryKey: ['market-stalls', target?.id],
    queryFn: async () => {
      const { data } = await client.get(`/markets/${target!.id}`);
      return data;
    },
    enabled: target?.kind === 'market',
    staleTime: 5 * 60_000,
  });
  const stalls = marketDetail?.stalls ?? [];

  const canSubmit = itemName.trim() && category && price && parseFloat(price) > 0 && !!target;
  // A stall-scoped report (whether hand-picked here or prepopulated from the
  // Price Checker sheet) always needs owner review, same as picking a
  // standalone store directly -- only a bare market target publishes at once.
  const isTindahanReport = !!stall || target?.kind === 'tindahan';
  const reportedAtName = stall?.name ?? target?.name;

  const handleSubmit = async () => {
    if (!canSubmit || !target) return;
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        item_name:      itemName.trim(),
        category,
        reported_price: parseFloat(price),
        unit,
      };
      if (stall) body.tindahan_id = stall.id;
      else if (target.kind === 'tindahan') body.tindahan_id = target.id;
      else if (target.kind === 'market') body.market_id = target.id;

      let data: any;
      if (photoUri) {
        const resized = await resizeForUpload(photoUri, 640, 0.7);
        data = await postMultipart('/prices/report', body as Record<string, string | number>, { photo: resized });
      } else {
        ({ data } = await client.post('/prices/report', body));
      }
      setSuccess(true);
      handleXpResponse(data ?? {});
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? (lang === 'en' ? 'Could not submit. Try again.' : 'Hindi ma-submit. Subukan ulit.');
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <Text style={{ fontSize: 56 }} className="mb-4">🎉</Text>
        <Text className="text-lg font-semibold text-ink text-center mb-2">
          {lang === 'en' ? 'Thanks for the report!' : 'Salamat sa report!'}
        </Text>
        <Text className="text-sm text-ink-soft text-center mb-2">
          {lang === 'en'
            ? `Reported the price of ${itemName} at ${reportedAtName}.`
            : `Na-report ang presyo ng ${itemName} sa ${reportedAtName}.`}
        </Text>
        {isTindahanReport && (
          <View className="rounded-xl px-4 py-2.5 mb-2" style={{ backgroundColor: '#FDEFC9' }}>
            <Text className="text-xs text-center" style={{ fontFamily: 'NunitoSans_600SemiBold', color: '#9A6A12' }}>
              {lang === 'en'
                ? 'The store owner will review your report before it appears on their price list. Track it in My Price Reports.'
                : 'Irereview muna ng may-ari ng tindahan ang report bago ito lumabas sa price list. Makikita ang status sa My Price Reports.'}
            </Text>
          </View>
        )}
        {!!reward?.xpEarned && (
          <View className="rounded-full bg-leaf-50 px-4 py-1.5 mb-8">
            <Text className="text-sm font-semibold text-ink">
              {lang === 'en' ? `+${reward.xpEarned} XP earned!` : `+${reward.xpEarned} XP nakuha mo!`}
            </Text>
          </View>
        )}
        <Pressable
          onPress={() => router.back()}
          className="w-full rounded-xl bg-brand-600 py-3.5 items-center"
        >
          <Text className="text-sm font-semibold text-white">{lang === 'en' ? 'Back' : 'Bumalik'}</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setItemName('');
            setCategory('');
            setPrice('');
            setUnit('kg');
            setTarget(null);
            setStall(null);
            setSuccess(false);
          }}
          className="mt-3 py-2"
        >
          <Text className="text-sm text-brand-600 font-medium">
            {lang === 'en' ? 'Report another one' : 'Mag-report pa ng isa'}
          </Text>
        </Pressable>

        <RewardCelebration reward={reward} onDismiss={() => setReward(null)} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <LinearGradient
        colors={HEADER_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: insets.top + 8, paddingBottom: 14 }}
      >
        <Pressable onPress={() => router.back()} className="w-8 h-8 rounded-full items-center justify-center active:opacity-70" style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}>
          <Ionicons name="arrow-back" size={18} color="#fff" />
        </Pressable>
        <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#fff' }}>
          {lang === 'en' ? 'Report a Price' : 'Mag-report ng Presyo'}
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerClassName="px-5 py-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >

        {/* Info banner */}
        <View className="bg-leaf-50 rounded-2xl p-4 mb-6 flex-row gap-3">
          <Text style={{ fontSize: 20 }}>📢</Text>
          <Text className="text-xs text-leaf-700 leading-5 flex-1">
            {lang === 'en'
              ? 'Report the price of an item at your market. This helps other families save money. You earn +15 XP for every valid report.'
              : 'I-report ang presyo ng isang sangkap sa iyong palengke. Makakatulong ito sa ibang pamilya na makatipid. Nakakakuha ka ng +15 XP bawat valid na report.'}
          </Text>
        </View>

        {/* Item photo */}
        {(() => {
          const pickPhoto = async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') return;
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
            });
            if (!result.canceled) setPhotoUri(result.assets[0].uri);
          };
          return (
            <View className="mb-4 flex-row items-center gap-3">
              <Pressable
                onPress={pickPhoto}
                style={{ width: 60, height: 60, borderRadius: 30, overflow: 'hidden', backgroundColor: '#F9EDD3', borderWidth: 1, borderColor: '#F0DEBB', alignItems: 'center', justifyContent: 'center' }}
                className="active:opacity-80"
              >
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <Text style={{ fontSize: 20 }}>{'\ud83d\udcf7'}</Text>
                )}
              </Pressable>
              <Text className="text-xs text-ink-soft flex-1">
                {lang === 'en'
                  ? 'Add a photo of the item (optional) to help with uncommon products.'
                  : 'Maglagay ng litrato ng item (opsyonal) para makatulong sa di-kilalang produkto.'}
              </Text>
            </View>
          );
        })()}

        {/* Item name */}
        <View className="mb-4">
          <Text className="text-xs font-semibold text-ink-soft mb-1.5">
            {lang === 'en' ? 'Item name' : 'Pangalan ng sangkap'}
          </Text>
          <TextInput
            className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 text-sm text-ink"
            placeholder={lang === 'en' ? 'e.g. Galunggong, Kamatis, Baboy Liempo...' : 'hal. Galunggong, Kamatis, Baboy Liempo...'}
            placeholderTextColor="#B0A18C"
            value={itemName}
            onChangeText={setItemName}
            autoCapitalize="words"
          />
        </View>

        {/* Category chips */}
        <View className="mb-4">
          <Text className="text-xs font-semibold text-ink-soft mb-2">
            {lang === 'en' ? 'Category' : 'Kategorya'}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.key}
                onPress={() => setCategory(cat.key)}
                className={`rounded-xl border px-3 py-2 ${
                  category === cat.key
                    ? 'bg-olive-400 border-olive-400'
                    : 'bg-cream-50 border-cream-300'
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    category === cat.key ? 'text-white' : 'text-ink-soft'
                  }`}
                >
                  {lang === 'en' ? cat.labelEn : cat.labelTl}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Market / store target (required) */}
        <View className="mb-4">
          <Text className="text-xs font-semibold text-ink-soft mb-1.5">
            {lang === 'en' ? 'Which market or store?' : 'Aling palengke o tindahan?'}
          </Text>
          <Pressable
            onPress={() => setPickerOpen(true)}
            className="w-full flex-row items-center justify-between rounded-xl border border-cream-300 bg-cream-50 px-4 py-3"
          >
            <Text className={`text-sm ${target ? 'text-ink' : 'text-ink-soft'}`} numberOfLines={1}>
              {target
                ? `${TARGET_TYPE_EMOJI[target.type] ?? (target.kind === 'tindahan' ? '🛒' : '🏪')} ${target.name}`
                : (lang === 'en' ? 'Select a market or store' : 'Pumili ng palengke o tindahan')}
            </Text>
            <Text className="text-xs text-brand-600">{target ? (lang === 'en' ? 'Change' : 'Palitan') : (lang === 'en' ? 'Select' : 'Pumili')}</Text>
          </Pressable>
        </View>

        {/* Stall within the chosen market (optional) */}
        {target?.kind === 'market' && (
          <SelectField
            label={lang === 'en' ? 'Stall (optional)' : 'Puwesto (opsyonal)'}
            placeholder={lang === 'en' ? 'Select a specific stall' : 'Pumili ng puwesto'}
            value={stall ? String(stall.id) : ''}
            options={stalls.map((s) => ({
              label: `${TARGET_TYPE_EMOJI[s.type] ?? '🛒'} ${s.name}`,
              value: String(s.id),
            }))}
            onSelect={(v) => {
              const found = stalls.find((s) => String(s.id) === v);
              if (found) setStall(found);
            }}
            disabled={stallsLoading || stalls.length === 0}
            disabledHint={
              stallsLoading
                ? (lang === 'en' ? 'Loading stalls...' : 'Naglo-load ng mga puwesto...')
                : (lang === 'en' ? 'No individual stalls listed at this market' : 'Walang nakalistang puwesto sa palengkeng ito')
            }
            searchPlaceholder={lang === 'en' ? 'Search stall name...' : 'Maghanap ng pangalan ng puwesto...'}
            emptyLabel={lang === 'en' ? 'No stalls found.' : 'Walang nahanap na puwesto.'}
          />
        )}

        {/* Price + unit side by side */}
        <View className="flex-row gap-3 mb-8">
          <View className="flex-1">
            <Text className="text-xs font-semibold text-ink-soft mb-1.5">
              {lang === 'en' ? 'Price (₱)' : 'Presyo (₱)'}
            </Text>
            <View className="flex-row items-center rounded-xl border border-cream-300 bg-cream-50 px-3">
              <Text className="text-sm text-ink-soft mr-1">₱</Text>
              <TextInput
                className="flex-1 py-3 text-sm text-ink"
                value={price}
                onChangeText={(v) => setPrice(v.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#B0A18C"
              />
            </View>
          </View>
          <View className="w-28">
            <Text className="text-xs font-semibold text-ink-soft mb-1.5">Unit</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-1.5"
              className="h-11"
            >
              {UNITS.map((u) => (
                <Pressable
                  key={u}
                  onPress={() => setUnit(u)}
                  className={`rounded-lg border px-2.5 py-1.5 ${
                    unit === u ? 'bg-olive-400 border-olive-400' : 'bg-cream-50 border-cream-300'
                  }`}
                >
                  <Text className={`text-xs font-medium ${unit === u ? 'text-white' : 'text-ink-soft'}`}>
                    {u}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={loading || !canSubmit}
          className="w-full rounded-xl bg-brand-600 py-4 items-center active:opacity-80 disabled:opacity-50"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-sm font-semibold text-white">
              {lang === 'en' ? 'Submit price +15 XP' : 'I-submit ang presyo +15 XP'}
            </Text>
          )}
        </Pressable>

      </ScrollView>

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <Pressable
          onPress={() => setPickerOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', paddingBottom: insets.bottom }}
          >
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#F9EDD3' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 15, color: '#000000' }}>
                  {lang === 'en' ? 'Select market or store' : 'Pumili ng palengke o tindahan'}
                </Text>
                <Pressable onPress={() => setPickerOpen(false)} hitSlop={8}>
                  <Text className="text-ink-soft text-sm">✕</Text>
                </Pressable>
              </View>
              <TextInput
                className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-sm text-ink"
                placeholder={lang === 'en' ? 'Search by name or barangay...' : 'Maghanap sa pangalan o barangay...'}
                placeholderTextColor="#B0A18C"
                value={targetSearch}
                onChangeText={setTargetSearch}
              />
            </View>
            <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ paddingBottom: 12 }}>
              {filteredTargets.length === 0 ? (
                <View className="p-6 items-center">
                  <Text className="text-xs text-ink-soft">
                    {lang === 'en' ? 'No markets or stores found nearby.' : 'Walang nahanap na palengke o tindahan malapit.'}
                  </Text>
                </View>
              ) : (
                filteredTargets.map((m) => (
                  <Pressable
                    key={`${m.kind ?? 'market'}-${m.id}`}
                    onPress={() => { setTarget(m); setStall(null); setPickerOpen(false); setTargetSearch(''); }}
                    className="flex-row items-center gap-2 px-4 py-3 border-b border-cream-200 active:opacity-70"
                  >
                    <Text style={{ fontSize: 16 }}>{TARGET_TYPE_EMOJI[m.type] ?? (m.kind === 'tindahan' ? '🛒' : '🏪')}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: '#000000' }} numberOfLines={1}>
                        {m.name}
                      </Text>
                      <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }} numberOfLines={1}>
                        {m.barangay}{m.kind === 'tindahan' ? ` · ${lang === 'en' ? 'Independent store' : 'Sariling tindahan'}` : ''}
                      </Text>
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}
