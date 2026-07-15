import client from '@/src/api/client';
import DayHoursPicker from '@/src/components/DayHoursPicker';
import { useLanguage } from '@/src/context/LanguageContext';
import { defaultStoreHours, StoreHoursValue } from '@/src/types/storeHours';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { uploadStorePhotos } from '@/src/api/tindahan';
import StorePhotoPicker from '@/src/components/StorePhotoPicker';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

type ListingMode = 'store' | 'stall' | 'market';

type MarketOption = {
  id: number;
  name: string;
  type: string;
  barangay: string;
  municipality: string;
};

type Coords = { lat: number; lng: number };

// ─── Constants ────────────────────────────────────────────────────────────────

const MODE_OPTIONS: { key: ListingMode; emoji: string; en: string; tl: string }[] = [
  { key: 'store', emoji: '🏬', en: 'My Store', tl: 'Aking Tindahan' },
  { key: 'stall', emoji: '🛒', en: 'Stall in a Market', tl: 'Puwesto sa Palengke' },
  { key: 'market', emoji: '🏪', en: 'New Market', tl: 'Bagong Palengke' },
];

const MARKET_TYPES: { key: string; emoji: string; en: string; tl: string }[] = [
  { key: 'wet_market', emoji: '🏪', en: 'Wet Market', tl: 'Palengkeng Basa' },
  { key: 'palengke', emoji: '🏪', en: 'Palengke (Public Market)', tl: 'Pampublikong Palengke' },
  { key: 'supermarket', emoji: '🏬', en: 'Supermarket', tl: 'Supermarket' },
  { key: 'grocery', emoji: '🏬', en: 'Grocery', tl: 'Grocery' },
  { key: 'tindahan', emoji: '🛒', en: 'Tindahan', tl: 'Tindahan' },
];

async function fetchAllMarkets(): Promise<MarketOption[]> {
  try {
    const { data } = await client.get('/markets');
    return data.markets ?? [];
  } catch {
    return [];
  }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AddListingScreen() {
  const { lang } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<ListingMode>('store');

  // Shared fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [hoursEnabled, setHoursEnabled] = useState(false);
  const [storeHours, setStoreHours] = useState<StoreHoursValue>(defaultStoreHours());

  // "New Market" only
  const [marketType, setMarketType] = useState<string>('');

  // "Stall in a Market" only
  const [marketSearch, setMarketSearch] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<MarketOption | null>(null);

  // Location
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [pickedCover, setPickedCover] = useState<string | null>(null);
  const [pickedPhoto, setPickedPhoto] = useState<string | null>(null);

  const { data: markets = [], isLoading: marketsLoading } = useQuery({
    queryKey: ['markets-all-for-listing'],
    queryFn: fetchAllMarkets,
    enabled: mode === 'stall',
    staleTime: 5 * 60_000,
  });

  const filteredMarkets = useMemo(() => {
    const q = marketSearch.trim().toLowerCase();
    if (!q) return markets;
    return markets.filter(
      (m) => m.name.toLowerCase().includes(q) || m.municipality?.toLowerCase().includes(q)
    );
  }, [markets, marketSearch]);

  const captureLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          lang === 'en' ? 'Location permission needed' : 'Kailangan ng Pahintulot sa Lokasyon',
          lang === 'en'
            ? 'Please allow location access so we can pin your store on the map.'
            : 'Paki-allow ang location access para mai-pin namin ang iyong tindahan sa mapa.'
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      Alert.alert(
        lang === 'en' ? 'Error' : 'Error',
        lang === 'en' ? 'Could not get your location. Try again.' : 'Hindi makuha ang iyong lokasyon. Subukan ulit.'
      );
    } finally {
      setLocating(false);
    }
  };

  const { mutate: submitListing, isPending: submitting } = useMutation({
    mutationFn: async () => {
      if (mode === 'market') {
        const { data } = await client.post('/markets', {
          name: name.trim(),
          type: marketType,
          latitude: coords!.lat,
          longitude: coords!.lng,
        });
        return { kind: 'market' as const, id: data.market.id as number };
      }

      const body: Record<string, unknown> = {
        name: name.trim(),
        latitude: coords!.lat,
        longitude: coords!.lng,
      };
      if (description.trim()) body.description = description.trim();
      if (contactNumber.trim()) body.contact_number = contactNumber.trim();
      if (hoursEnabled) body.store_hours = storeHours;
      if (mode === 'stall' && selectedMarket) body.market_id = selectedMarket.id;

      const { data } = await client.post('/tindahan', body);
      const newId = data.tindahan.id as number;
      if (pickedCover || pickedPhoto) {
        try {
          await uploadStorePhotos(newId, { coverUri: pickedCover, photoUri: pickedPhoto });
        } catch {
          // photos can be re-added from Edit Store; don't fail the whole creation
        }
      }
      return { kind: 'tindahan' as const, id: newId };
    },
    onSuccess: (result) => {
      if (result.kind === 'market') {
        router.replace(`/market/${result.id}` as any);
      } else {
        router.replace(`/stall/${result.id}` as any);
      }
    },
    onError: (e: any) => {
      // Seller-tier store cap reached — route to the subscription page.
      if (e?.response?.data?.upgrade_required) {
        Alert.alert(
          lang === 'en' ? 'Store limit reached' : 'Abot na sa limit ng tindahan',
          e?.response?.data?.message ??
            (lang === 'en' ? 'Upgrade your plan to open more stores.' : 'Mag-upgrade para makapagbukas pa ng tindahan.'),
          [
            { text: lang === 'en' ? 'Not now' : 'Mamaya na', style: 'cancel' },
            {
              text: lang === 'en' ? 'View plans' : 'Tingnan ang plans',
              onPress: () => router.push('/subscription' as any),
            },
          ],
        );
        return;
      }
      const msg =
        e?.response?.data?.message ??
        (lang === 'en' ? 'Could not submit. Please try again.' : 'Hindi ma-submit. Subukan ulit.');
      Alert.alert(lang === 'en' ? 'Error' : 'Error', msg);
    },
  });

  const canSubmit =
    name.trim().length > 0 &&
    coords !== null &&
    (mode !== 'stall' || selectedMarket !== null) &&
    (mode !== 'market' || marketType !== '') &&
    !submitting;

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFCF5' }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 14,
          paddingHorizontal: 16,
          backgroundColor: '#E7653B',
        }}
      >
        <View className="flex-row items-center justify-between">
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 18, color: '#fff' }}>
            {lang === 'en' ? 'Add my Store' : 'Idagdag ang Aking Tindahan'}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
            className="active:opacity-70"
          >
            <Ionicons name="close" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'android' ? 30 : 0}
      >
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">

          {/* Mode selector */}
          <View className="flex-row gap-2 mb-5">
            {MODE_OPTIONS.map((opt) => {
              const active = opt.key === mode;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setMode(opt.key)}
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    paddingVertical: 12,
                    paddingHorizontal: 6,
                    alignItems: 'center',
                    backgroundColor: active ? '#6E7B4A' : '#fff',
                    borderWidth: 1,
                    borderColor: active ? '#6E7B4A' : '#F0DEBB',
                  }}
                  className="active:opacity-80"
                >
                  <Text style={{ fontSize: 20, marginBottom: 4 }}>{opt.emoji}</Text>
                  <Text
                    style={{
                      fontFamily: 'NunitoSans_600SemiBold',
                      fontSize: 13,
                      textAlign: 'center',
                      color: active ? '#fff' : '#000000',
                    }}
                  >
                    {lang === 'en' ? opt.en : opt.tl}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ── Stall in a market: market picker ── */}
          {mode === 'stall' && (
            <View className="mb-4">
              <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#000000', marginBottom: 6 }}>
                {lang === 'en' ? 'Which market?' : 'Aling palengke?'}
              </Text>

              {selectedMarket ? (
                <View
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                    backgroundColor: '#EFF4EC', borderRadius: 14, borderWidth: 1, borderColor: '#6E7B4A',
                    padding: 12,
                  }}
                >
                  <Text style={{ fontSize: 18 }}>🏪</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#5E693F' }} numberOfLines={1}>
                      {selectedMarket.name}
                    </Text>
                    <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }} numberOfLines={1}>
                      {selectedMarket.barangay}, {selectedMarket.municipality}
                    </Text>
                  </View>
                  <Pressable onPress={() => setSelectedMarket(null)} className="active:opacity-60" hitSlop={8}>
                    <Text style={{ fontSize: 13, color: '#5E693F', fontFamily: 'NunitoSans_600SemiBold' }}>
                      {lang === 'en' ? 'Change' : 'Palitan'}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <TextInput
                    className="w-full bg-white rounded-xl border border-cream-300 px-4 py-3 text-sm text-ink mb-2"
                    placeholder={lang === 'en' ? 'Search market by name or town...' : 'Hanapin ang palengke sa pangalan o bayan...'}
                    placeholderTextColor="#B0A18C"
                    value={marketSearch}
                    onChangeText={setMarketSearch}
                  />
                  {marketsLoading ? (
                    <ActivityIndicator color="#C45E3A" style={{ marginTop: 8 }} />
                  ) : filteredMarkets.length === 0 ? (
                    <View className="bg-white rounded-xl border border-cream-200 p-4 items-center">
                      <Text className="text-xs text-ink-soft">
                        {lang === 'en' ? 'No markets found. Try "New Market" instead.' : 'Walang nahanap na palengke. Subukan ang "Bagong Palengke".'}
                      </Text>
                    </View>
                  ) : (
                    <View className="bg-white rounded-xl border border-cream-200 overflow-hidden" style={{ maxHeight: 240 }}>
                      <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                        {filteredMarkets.map((m, idx) => (
                          <Pressable
                            key={m.id}
                            onPress={() => setSelectedMarket(m)}
                            style={{
                              flexDirection: 'row', alignItems: 'center', gap: 10,
                              paddingHorizontal: 14, paddingVertical: 12,
                              borderBottomWidth: idx < filteredMarkets.length - 1 ? 1 : 0,
                              borderBottomColor: '#F9EDD3',
                            }}
                            className="active:bg-cream-50"
                          >
                            <Text style={{ fontSize: 16 }}>🏪</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: '#000000' }} numberOfLines={1}>
                                {m.name}
                              </Text>
                              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }} numberOfLines={1}>
                                {m.barangay}, {m.municipality}
                              </Text>
                            </View>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* ── New market: type selector ── */}
          {mode === 'market' && (
            <View className="mb-4">
              <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#000000', marginBottom: 6 }}>
                {lang === 'en' ? 'Market type' : 'Uri ng Palengke'}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {MARKET_TYPES.map((t) => {
                  const active = t.key === marketType;
                  return (
                    <Pressable
                      key={t.key}
                      onPress={() => setMarketType(t.key)}
                      className={`rounded-xl border px-3 py-2 ${active ? 'bg-brand-500 border-brand-500' : 'bg-white border-cream-300'}`}
                    >
                      <Text
                        style={{
                          fontFamily: 'NunitoSans_600SemiBold',
                          fontSize: 13,
                          color: active ? '#fff' : '#000000',
                        }}
                      >
                        {t.emoji} {lang === 'en' ? t.en : t.tl}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Photos (stores and stalls only) */}
          {mode !== 'market' && (
            <StorePhotoPicker
              lang={lang}
              coverUri={pickedCover}
              photoUri={pickedPhoto}
              onPickCover={setPickedCover}
              onPickPhoto={setPickedPhoto}
            />
          )}

          {/* Name */}
          <View className="mb-4">
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#000000', marginBottom: 6 }}>
              {lang === 'en' ? 'Name' : 'Pangalan'}
            </Text>
            <TextInput
              className="w-full bg-white rounded-xl border border-cream-300 px-4 py-3 text-sm text-ink"
              placeholder={
                mode === 'market'
                  ? (lang === 'en' ? 'e.g. Antipolo Public Market' : 'hal. Antipolo Public Market')
                  : (lang === 'en' ? "e.g. Aling Nena's Sari-sari Store" : 'hal. Tindahan ni Aling Nena')
              }
              placeholderTextColor="#B0A18C"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          {/* Store/Stall-only fields */}
          {mode !== 'market' && (
            <>
              <View className="mb-4">
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#000000', marginBottom: 6 }}>
                  {lang === 'en' ? 'Description (optional)' : 'Deskripsyon (opsyonal)'}
                </Text>
                <TextInput
                  className="w-full bg-white rounded-xl border border-cream-300 px-4 py-3 text-sm text-ink"
                  placeholder={lang === 'en' ? 'What do you sell?' : 'Ano ang ibinebenta mo?'}
                  placeholderTextColor="#B0A18C"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  style={{ minHeight: 72, textAlignVertical: 'top' }}
                />
              </View>

              <View className="mb-4">
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#000000', marginBottom: 6 }}>
                  {lang === 'en' ? 'Contact number (optional)' : 'Numero ng Kontak (opsyonal)'}
                </Text>
                <TextInput
                  className="w-full bg-white rounded-xl border border-cream-300 px-4 py-3 text-sm text-ink"
                  placeholder="09XX XXX XXXX"
                  placeholderTextColor="#B0A18C"
                  value={contactNumber}
                  onChangeText={(v) => setContactNumber(v.replace(/[^0-9+ ]/g, ''))}
                  keyboardType="phone-pad"
                />
              </View>

              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#000000' }}>
                    {lang === 'en' ? 'Store hours (optional)' : 'Oras ng Bukas (opsyonal)'}
                  </Text>
                  <Pressable
                    onPress={() => setHoursEnabled((v) => !v)}
                    style={{
                      width: 40, height: 22, borderRadius: 11, padding: 2,
                      backgroundColor: hoursEnabled ? '#6E7B4A' : '#D3C5AB',
                      alignItems: hoursEnabled ? 'flex-end' : 'flex-start',
                    }}
                    className="active:opacity-80"
                  >
                    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' }} />
                  </Pressable>
                </View>
                {hoursEnabled && (
                  <View className="bg-white rounded-xl border border-cream-300 px-3">
                    <DayHoursPicker value={storeHours} onChange={setStoreHours} />
                  </View>
                )}
              </View>
            </>
          )}

          {/* Location capture */}
          <View className="mb-6">
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#000000', marginBottom: 6 }}>
              {lang === 'en' ? 'Location' : 'Lokasyon'}
            </Text>
            {mode !== 'market' && (
              <View style={{ flexDirection: 'row', gap: 8, backgroundColor: '#FEF6E3', borderRadius: 12, padding: 10, marginBottom: 10 }}>
                <Text style={{ fontSize: 14 }}>📌</Text>
                <Text style={{ flex: 1, fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#92700A', lineHeight: 16 }}>
                  {lang === 'en'
                    ? 'You should be at your store to pin its exact location.'
                    : 'Dapat nasa iyong tindahan ka para tumpak ang pag-pin ng lokasyon.'}
                </Text>
              </View>
            )}
            <Pressable
              onPress={captureLocation}
              disabled={locating}
              className="w-full rounded-xl border border-cream-300 bg-white py-3.5 items-center flex-row justify-center gap-2 active:opacity-70"
            >
              {locating ? (
                <ActivityIndicator size="small" color="#C45E3A" />
              ) : (
                <Text style={{ fontSize: 14 }}>📍</Text>
              )}
              <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: '#C45E3A' }}>
                {locating
                  ? (lang === 'en' ? 'Locating...' : 'Hinahanap...')
                  : coords
                    ? (lang === 'en' ? 'Update my location' : 'I-update ang lokasyon')
                    : (lang === 'en' ? 'Use my current location' : 'Gamitin ang kasalukuyang lokasyon')}
              </Text>
            </Pressable>
            {coords && (
              <View className="flex-row items-center gap-1.5 mt-2">
                <Text style={{ fontSize: 13 }}>✅</Text>
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#386641' }}>
                  {lang === 'en' ? 'Location captured' : 'Nakuha ang lokasyon'}
                </Text>
              </View>
            )}
          </View>

          {/* Submit */}
          <Pressable
            onPress={() => submitListing()}
            disabled={!canSubmit}
            className="w-full rounded-xl bg-brand-600 py-4 items-center active:opacity-80 disabled:opacity-50"
            style={{ opacity: canSubmit ? 1 : 0.5 }}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-sm font-semibold text-white">
                {lang === 'en' ? 'Submit listing' : 'I-submit ang Listing'}
              </Text>
            )}
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
