import { ITEM_CATEGORIES } from '@/src/constants/itemCategories';
import client from '@/src/api/client';
import RewardCelebration, { type Reward } from '@/src/components/RewardCelebration';
import { postMultipart, resizeForUpload } from '@/src/utils/uploadImage';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/src/context/AuthContext';
import { useLanguage } from '@/src/context/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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

const UNITS = ['kg', 'bundle', 'pcs', '100g', 'pack', 'bottle', 'tray', 'lata', 'sachet'];

export default function ReportPriceScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ item?: string }>();

  const [itemName, setItemName]     = useState(params.item ?? '');
  const [category, setCategory]     = useState('');
  const [price, setPrice]           = useState('');
  const [unit, setUnit]             = useState('kg');
  const [municipality, setMunicipality] = useState(user?.municipality ?? '');
  const [loading, setLoading]       = useState(false);
  const [photoUri, setPhotoUri]     = useState<string | null>(null);
  const [success, setSuccess]       = useState(false);
  const [reward, setReward]         = useState<Reward | null>(null);

  const [target, setTarget]         = useState<NearbyTarget | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [targetSearch, setTargetSearch] = useState('');
  const [cityPickerOpen, setCityPickerOpen] = useState(false);

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

  const municipalityOptions = useMemo(() => {
    const set = new Set<string>();
    if (user?.municipality) set.add(user.municipality);
    for (const m of nearbyTargets) {
      if (m.municipality) set.add(m.municipality);
    }
    return Array.from(set);
  }, [nearbyTargets, user?.municipality]);

  const canSubmit = itemName.trim() && category && price && parseFloat(price) > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        item_name:      itemName.trim(),
        category,
        reported_price: parseFloat(price),
        unit,
        municipality,
      };
      if (target?.kind === 'tindahan') body.tindahan_id = target.id;
      else if (target?.kind === 'market') body.market_id = target.id;

      let data: any;
      if (photoUri) {
        const resized = await resizeForUpload(photoUri, 640, 0.7);
        data = await postMultipart('/prices/report', body as Record<string, string | number>, { photo: resized });
      } else {
        ({ data } = await client.post('/prices/report', body));
      }
      setSuccess(true);
      if (data?.xp_earned > 0) {
        setReward({
          xpEarned: data.xp_earned,
          leveledUp: data.leveled_up,
          newLevel: data.new_level,
          newAchievements: data.new_achievements,
        });
      }
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
        <RewardCelebration reward={reward} onDismiss={() => setReward(null)} />
        <Text style={{ fontSize: 56 }} className="mb-4">🎉</Text>
        <Text className="text-lg font-semibold text-ink text-center mb-2">
          {lang === 'en' ? 'Thanks for the report!' : 'Salamat sa report!'}
        </Text>
        <Text className="text-sm text-ink-soft text-center mb-2">
          {lang === 'en'
            ? `Reported the price of ${itemName} in ${municipality}.`
            : `Na-report ang presyo ng ${itemName} sa ${municipality}.`}
        </Text>
        {target?.kind === 'tindahan' && (
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
            setSuccess(false);
          }}
          className="mt-3 py-2"
        >
          <Text className="text-sm text-brand-600 font-medium">
            {lang === 'en' ? 'Report another one' : 'Mag-report pa ng isa'}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'android' ? 30 : 0}
    >
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

        {/* Market / store target (optional) */}
        <View className="mb-4">
          <Text className="text-xs font-semibold text-ink-soft mb-1.5">
            {lang === 'en' ? 'Which market or store? (optional)' : 'Aling palengke o tindahan? (opsyonal)'}
          </Text>
          <Pressable
            onPress={() => setPickerOpen(true)}
            className="w-full flex-row items-center justify-between rounded-xl border border-cream-300 bg-cream-50 px-4 py-3"
          >
            <Text className={`text-sm ${target ? 'text-ink' : 'text-ink-soft'}`} numberOfLines={1}>
              {target
                ? `${TARGET_TYPE_EMOJI[target.type] ?? (target.kind === 'tindahan' ? '🛒' : '🏪')} ${target.name}`
                : (lang === 'en' ? 'General area (no specific store)' : 'Pangkalahatang lugar (walang tiyak na tindahan)')}
            </Text>
            {target ? (
              <Pressable onPress={() => setTarget(null)} hitSlop={8}>
                <Text className="text-xs text-ink-soft">✕</Text>
              </Pressable>
            ) : (
              <Text className="text-xs text-brand-600">{lang === 'en' ? 'Select' : 'Pumili'}</Text>
            )}
          </Pressable>
        </View>

        {/* Price + unit side by side */}
        <View className="flex-row gap-3 mb-4">
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

        {/* Municipality */}
        <View className="mb-8">
          <Text className="text-xs font-semibold text-ink-soft mb-1.5">
            {lang === 'en' ? 'Location (city / municipality)' : 'Lugar (lungsod / munisipyo)'}
          </Text>
          <Pressable
            onPress={() => setCityPickerOpen(true)}
            className="w-full flex-row items-center justify-between rounded-xl border border-cream-300 bg-cream-50 px-4 py-3"
          >
            <Text className="text-sm text-ink">{municipality}</Text>
            <Text className="text-xs text-brand-600">{lang === 'en' ? 'Change' : 'Palitan'}</Text>
          </Pressable>
          <Text className="mt-1 text-xs text-ink-soft">
            {lang === 'en'
              ? 'So people in the same area can find it.'
              : 'Para mahanap ng mga tao sa parehong lugar.'}
          </Text>
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
              <Pressable
                onPress={() => { setTarget(null); setPickerOpen(false); }}
                className="flex-row items-center gap-2 px-4 py-3 border-b border-cream-200 active:opacity-70"
              >
                <Text style={{ fontSize: 16 }}>🌏</Text>
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: '#000000' }}>
                  {lang === 'en' ? 'General area (no specific store)' : 'Pangkalahatang lugar (walang tiyak na tindahan)'}
                </Text>
              </Pressable>
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
                    onPress={() => { setTarget(m); setPickerOpen(false); setTargetSearch(''); }}
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

      <Modal visible={cityPickerOpen} animationType="slide" transparent onRequestClose={() => setCityPickerOpen(false)}>
        <Pressable
          onPress={() => setCityPickerOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', paddingBottom: insets.bottom }}
          >
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#F9EDD3', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 15, color: '#000000' }}>
                {lang === 'en' ? 'Select city / municipality' : 'Pumili ng lungsod / munisipyo'}
              </Text>
              <Pressable onPress={() => setCityPickerOpen(false)} hitSlop={8}>
                <Text className="text-ink-soft text-sm">✕</Text>
              </Pressable>
            </View>
            {municipalityOptions.length > 0 ? (
              <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ paddingBottom: 12 }}>
                {municipalityOptions.map((city) => (
                  <Pressable
                    key={city}
                    onPress={() => { setMunicipality(city); setCityPickerOpen(false); }}
                    className="flex-row items-center justify-between px-4 py-3 border-b border-cream-200 active:opacity-70"
                  >
                    <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: '#000000' }}>{city}</Text>
                    {municipality === city && <Text style={{ color: '#386641' }}>✓</Text>}
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <View style={{ padding: 20 }}>
                <Text className="text-xs text-ink-soft mb-3">
                  {lang === 'en'
                    ? "We don't have your area on file yet. Set it in your profile, or type it below just this once."
                    : 'Wala pa kaming nakatalang lugar mo. I-set ito sa iyong profile, o i-type sa ibaba sa ngayon.'}
                </Text>
                <TextInput
                  className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 text-sm text-ink"
                  placeholder={lang === 'en' ? 'e.g. Antipolo, Davao City...' : 'hal. Antipolo, Davao City...'}
                  placeholderTextColor="#B0A18C"
                  value={municipality}
                  onChangeText={setMunicipality}
                  autoCapitalize="words"
                  onSubmitEditing={() => setCityPickerOpen(false)}
                  returnKeyType="done"
                />
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}
