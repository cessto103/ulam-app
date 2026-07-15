import client, { API_URL } from '@/src/api/client';
import { uploadStorePhotos } from '@/src/api/tindahan';
import DayHoursPicker from '@/src/components/DayHoursPicker';
import StorePhotoPicker from '@/src/components/StorePhotoPicker';
import { useLanguage } from '@/src/context/LanguageContext';
import { defaultStoreHours, StoreHoursValue } from '@/src/types/storeHours';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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

type Coords = { lat: number; lng: number };

type StoreDetail = {
  id: number;
  name: string;
  description: string | null;
  photo: string | null;
  cover_photo: string | null;
  contact_number: string | null;
  store_hours: StoreHoursValue | null;
  barangay: string | null;
  municipality: string | null;
  latitude: number;
  longitude: number;
};

export default function EditStoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lang } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { data: stall, isLoading } = useQuery<StoreDetail>({
    queryKey: ['stall', id, 'edit'],
    queryFn: async () => {
      const { data } = await client.get(`/tindahan/${id}`);
      return data.tindahan;
    },
    enabled: !!id,
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [hoursEnabled, setHoursEnabled] = useState(false);
  const [storeHours, setStoreHours] = useState<StoreHoursValue>(defaultStoreHours());
  const [newCoords, setNewCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  // Freshly picked local uris (null = keep existing photo)
  const [pickedCover, setPickedCover] = useState<string | null>(null);
  const [pickedPhoto, setPickedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (stall && !hydrated) {
      setName(stall.name);
      setDescription(stall.description ?? '');
      setContactNumber(stall.contact_number ?? '');
      setHoursEnabled(!!stall.store_hours && Object.keys(stall.store_hours).length > 0);
      setStoreHours(stall.store_hours ?? defaultStoreHours());
      setHydrated(true);
    }
  }, [stall, hydrated]);

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
      setNewCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      Alert.alert(
        lang === 'en' ? 'Error' : 'Error',
        lang === 'en' ? 'Could not get your location. Try again.' : 'Hindi makuha ang iyong lokasyon. Subukan ulit.'
      );
    } finally {
      setLocating(false);
    }
  };

  const { mutate: saveStore, isPending: saving } = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
        contact_number: contactNumber.trim() || null,
        store_hours: hoursEnabled ? storeHours : null,
      };
      if (newCoords) {
        body.latitude = newCoords.lat;
        body.longitude = newCoords.lng;
      }
      await client.patch(`/tindahan/${id}`, body);
      if (pickedCover || pickedPhoto) {
        await uploadStorePhotos(Number(id), { coverUri: pickedCover, photoUri: pickedPhoto });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stall', id] });
      router.back();
    },
    onError: (e: any) => {
      const msg =
        e?.response?.data?.message ??
        (lang === 'en' ? 'Could not save changes. Please try again.' : 'Hindi ma-save ang pagbabago. Subukan ulit.');
      Alert.alert(lang === 'en' ? 'Error' : 'Error', msg);
    },
  });

  const canSubmit = name.trim().length > 0 && !saving;

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
            <Ionicons name="arrow-back" size={18} color="#000000" />
          </Pressable>
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#000000', flex: 1 }}>
            {lang === 'en' ? 'Edit Store Info' : 'I-edit ang Impormasyon ng Tindahan'}
          </Text>
        </View>
      </View>

      {isLoading || !hydrated ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#386641" />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'android' ? 30 : 0}
        >
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">

            {/* Photos */}
            <StorePhotoPicker
              lang={lang}
              coverUri={pickedCover ?? (stall?.cover_photo ? `${API_URL}${stall.cover_photo}` : null)}
              photoUri={pickedPhoto ?? (stall?.photo ? `${API_URL}${stall.photo}` : null)}
              onPickCover={setPickedCover}
              onPickPhoto={setPickedPhoto}
            />

            {/* Name */}
            <View className="mb-4">
              <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#000000', marginBottom: 6 }}>
                {lang === 'en' ? 'Name' : 'Pangalan'}
              </Text>
              <TextInput
                className="w-full bg-white rounded-xl border border-cream-300 px-4 py-3 text-sm text-ink"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            {/* Description */}
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

            {/* Contact number */}
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

            {/* Store hours */}
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#000000' }}>
                  {lang === 'en' ? 'Store hours (optional)' : 'Oras ng Bukas (opsyonal)'}
                </Text>
                <Pressable
                  onPress={() => setHoursEnabled((v) => !v)}
                  style={{
                    width: 40, height: 22, borderRadius: 11, padding: 2,
                    backgroundColor: hoursEnabled ? '#386641' : '#D3C5AB',
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

            {/* Location */}
            <View className="mb-6">
              <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#000000', marginBottom: 6 }}>
                {lang === 'en' ? 'Location' : 'Lokasyon'}
              </Text>

              <View style={{ flexDirection: 'row', gap: 8, backgroundColor: '#FEF6E3', borderRadius: 12, padding: 10, marginBottom: 10 }}>
                <Text style={{ fontSize: 14 }}>📌</Text>
                <Text style={{ flex: 1, fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#92700A', lineHeight: 16 }}>
                  {lang === 'en'
                    ? 'You should be at your store to pin its exact location.'
                    : 'Dapat nasa iyong tindahan ka para tumpak ang pag-pin ng lokasyon.'}
                </Text>
              </View>

              {!newCoords && (stall?.barangay || stall?.municipality) && (
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginBottom: 8 }}>
                  {lang === 'en' ? 'Current: ' : 'Kasalukuyan: '}
                  {[stall?.barangay, stall?.municipality].filter(Boolean).join(', ')}
                </Text>
              )}

              <Pressable
                onPress={captureLocation}
                disabled={locating}
                className="w-full rounded-xl border border-cream-300 bg-white py-3.5 items-center flex-row justify-center gap-2 active:opacity-70"
              >
                {locating ? (
                  <ActivityIndicator size="small" color="#386641" />
                ) : (
                  <Text style={{ fontSize: 14 }}>📍</Text>
                )}
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: '#386641' }}>
                  {locating
                    ? (lang === 'en' ? 'Locating...' : 'Hinahanap...')
                    : (lang === 'en' ? 'Update my location' : 'I-update ang lokasyon')}
                </Text>
              </Pressable>
              {newCoords && (
                <View className="flex-row items-center gap-1.5 mt-2">
                  <Text style={{ fontSize: 13 }}>✅</Text>
                  <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#386641' }}>
                    {lang === 'en' ? 'New location captured' : 'Nakuha ang bagong lokasyon'}
                  </Text>
                </View>
              )}
            </View>

            {/* Submit */}
            <Pressable
              onPress={() => saveStore()}
              disabled={!canSubmit}
              className="w-full rounded-xl bg-brand-600 py-4 items-center active:opacity-80"
              style={{ opacity: canSubmit ? 1 : 0.5 }}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-sm font-semibold text-white">
                  {lang === 'en' ? 'Save changes' : 'I-save ang Pagbabago'}
                </Text>
              )}
            </Pressable>

          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
