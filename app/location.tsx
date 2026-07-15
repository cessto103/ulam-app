import client from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

function errorMessage(e: any, fallback: string): string {
  const errors = e?.response?.data?.errors;
  if (errors) return Object.values(errors).flat().join('\n');
  return e?.response?.data?.message ?? fallback;
}

export default function LocationScreen() {
  const { user, refreshUser } = useAuth();
  const { lang } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [municipality, setMunicipality] = useState(user?.municipality ?? '');
  const [barangay, setBarangay]         = useState(user?.barangay ?? '');
  const [province, setProvince]         = useState(user?.province ?? '');
  const [region, setRegion]             = useState(user?.region ?? '');
  const [coords, setCoords]             = useState<{ lat: number; lng: number } | null>(
    user?.latitude != null && user?.longitude != null ? { lat: user.latitude, lng: user.longitude } : null
  );
  const [locating, setLocating] = useState(false);

  const { mutate: saveLocation, isPending: savingLocation } = useMutation({
    mutationFn: async (payload: {
      municipality: string | null; barangay: string | null; province: string | null;
      region: string | null; latitude: number | null; longitude: number | null;
    }) => client.patch('/user/profile', payload),
    onSuccess: async () => {
      await refreshUser();
      Alert.alert(lang === 'en' ? 'Saved' : 'Na-save', lang === 'en' ? 'Location updated.' : 'Na-update ang lokasyon.');
    },
    onError: (e: any) => Alert.alert(lang === 'en' ? "Couldn't save" : 'Hindi na-save', errorMessage(e, 'Something went wrong.')),
  });

  const captureLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          lang === 'en' ? 'Location permission needed' : 'Kailangan ng Pahintulot sa Lokasyon',
          lang === 'en'
            ? 'Please allow location access to set your precise location.'
            : 'Paki-allow ang location access para itakda ang eksaktong lokasyon.'
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoords(newCoords);

      // Best-effort prefill from reverse geocoding, user can still edit any field after.
      let geocodedMunicipality = municipality;
      let geocodedBarangay = barangay;
      let geocodedProvince = province;
      let geocodedRegion = region;
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude: newCoords.lat, longitude: newCoords.lng });
        if (place) {
          geocodedMunicipality = place.city ?? municipality;
          geocodedBarangay = place.district ?? barangay;
          geocodedProvince = place.subregion ?? province;
          geocodedRegion = place.region ?? region;
          setMunicipality(geocodedMunicipality);
          setBarangay(geocodedBarangay);
          setProvince(geocodedProvince);
          setRegion(geocodedRegion);
        }
      } catch {
        // Reverse geocoding is best-effort, the GPS pin itself still saves below.
      }

      saveLocation({
        municipality: geocodedMunicipality.trim() || null,
        barangay: geocodedBarangay.trim() || null,
        province: geocodedProvince.trim() || null,
        region: geocodedRegion.trim() || null,
        latitude: newCoords.lat,
        longitude: newCoords.lng,
      });
    } catch {
      Alert.alert(
        lang === 'en' ? 'Error' : 'Error',
        lang === 'en' ? 'Could not get your location. Try again.' : 'Hindi makuha ang iyong lokasyon. Subukan ulit.'
      );
    } finally {
      setLocating(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
              {lang === 'en' ? 'Location' : 'Lokasyon'}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerClassName="px-4 pt-4 pb-12" keyboardShouldPersistTaps="handled">
          <View className="rounded-2xl border border-cream-200 bg-white p-4">
            <Text className="text-xs font-medium text-ink-soft mb-1.5">{lang === 'en' ? 'City / Municipality' : 'Lungsod / Munisipyo'}</Text>
            <TextInput
              className="bg-cream-50 rounded-xl px-4 py-3.5 text-sm text-ink mb-3 border border-cream-200"
              placeholder="e.g. Antipolo, Marikina, Quezon City"
              placeholderTextColor="#B0A18C"
              value={municipality}
              onChangeText={setMunicipality}
              autoCapitalize="words"
            />

            <Text className="text-xs font-medium text-ink-soft mb-1.5">Barangay</Text>
            <TextInput
              className="bg-cream-50 rounded-xl px-4 py-3.5 text-sm text-ink mb-3 border border-cream-200"
              placeholder={lang === 'en' ? 'Barangay (optional)' : 'Barangay (opsyonal)'}
              placeholderTextColor="#B0A18C"
              value={barangay}
              onChangeText={setBarangay}
              autoCapitalize="words"
            />

            <View className="flex-row gap-3 mb-3">
              <View className="flex-1">
                <Text className="text-xs font-medium text-ink-soft mb-1.5">{lang === 'en' ? 'Province' : 'Probinsya'}</Text>
                <TextInput
                  className="bg-cream-50 rounded-xl px-4 py-3.5 text-sm text-ink border border-cream-200"
                  placeholder="e.g. Rizal"
                  placeholderTextColor="#B0A18C"
                  value={province}
                  onChangeText={setProvince}
                  autoCapitalize="words"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-medium text-ink-soft mb-1.5">{lang === 'en' ? 'Region' : 'Rehiyon'}</Text>
                <TextInput
                  className="bg-cream-50 rounded-xl px-4 py-3.5 text-sm text-ink border border-cream-200"
                  placeholder="e.g. IV-A"
                  placeholderTextColor="#B0A18C"
                  value={region}
                  onChangeText={setRegion}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <Pressable
              onPress={captureLocation}
              disabled={locating || savingLocation}
              className="flex-row items-center justify-center gap-2 rounded-xl border border-leaf-200 bg-leaf-50 py-3 mb-3 active:opacity-70"
            >
              {locating ? (
                <ActivityIndicator color="#386641" size="small" />
              ) : (
                <>
                  <Ionicons name="navigate-outline" size={16} color="#386641" />
                  <Text className="text-sm font-semibold text-leaf-700">
                    {coords
                      ? (lang === 'en' ? 'Location pinned (tap to update)' : 'Na-pin ang lokasyon (i-tap para i-update)')
                      : (lang === 'en' ? 'Use my current location' : 'Gamitin ang kasalukuyang lokasyon')}
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={() => saveLocation({
                municipality: municipality.trim() || null,
                barangay: barangay.trim() || null,
                province: province.trim() || null,
                region: region.trim() || null,
                latitude: coords?.lat ?? null,
                longitude: coords?.lng ?? null,
              })}
              disabled={savingLocation}
              className="w-full rounded-xl bg-brand-600 py-3.5 items-center active:opacity-80 disabled:opacity-60"
            >
              {savingLocation ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-sm font-semibold text-white">{lang === 'en' ? 'Save Location' : 'I-save ang Lokasyon'}</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
