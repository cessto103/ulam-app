import client from '@/src/api/client';
import SelectField from '@/src/components/SelectField';
import { useAuth } from '@/src/context/AuthContext';
import { useLanguage } from '@/src/context/LanguageContext';
import { getPhBarangaysForCity, getPhCitiesForRegion, getPhRegions, type PhCity } from '@/src/utils/phLocations';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function errorMessage(e: any, fallback: string): string {
  const errors = e?.response?.data?.errors;
  if (errors) return Object.values(errors).flat().join('\n');
  return e?.response?.data?.message ?? fallback;
}

const HEADER_GRADIENT = ['#CC5027', '#E7653B', '#EC8156'] as const;

export default function LocationScreen() {
  const { user, refreshUser } = useAuth();
  const { lang } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [municipality, setMunicipalityRaw] = useState(user?.municipality ?? '');
  const [barangay, setBarangay]            = useState(user?.barangay ?? '');
  const [province, setProvince]            = useState(user?.province ?? '');
  const [region, setRegionRaw]             = useState(user?.region ?? '');
  const [cityCode, setCityCode]            = useState('');
  const [coords, setCoords]             = useState<{ lat: number; lng: number } | null>(
    user?.latitude != null && user?.longitude != null ? { lat: user.latitude, lng: user.longitude } : null
  );
  const [locating, setLocating] = useState(false);

  const cityOptions = useMemo(() => (region ? getPhCitiesForRegion(region) : []), [region]);
  const barangayOptions = useMemo(() => (cityCode ? getPhBarangaysForCity(cityCode) : []), [cityCode]);

  // Picking a new region invalidates whatever city/barangay were set under
  // the old one (whether picked or GPS-prefilled); picking a new city
  // invalidates the barangay the same way.
  const setRegion = (v: string) => {
    setRegionRaw(v);
    setMunicipalityRaw('');
    setProvince('');
    setCityCode('');
    setBarangay('');
  };

  const setMunicipality = (code: string) => {
    setBarangay('');
    const match = cityOptions.find((c: PhCity) => c.code === code);
    setMunicipalityRaw(match?.name ?? '');
    setCityCode(code);
    setProvince(match?.province ?? '');
  };

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
          // The OS geocoder's names don't reliably match this dataset's exact
          // PSGC spelling/casing, so these bypass the cascading setRegion/
          // setMunicipality wrappers (which look the typed name up in the
          // dataset) and go straight into state. cityCode is left unset —
          // the barangay picker stays empty until the user re-confirms the
          // city via its picker, which is what actually resolves a code.
          setRegionRaw(geocodedRegion);
          setMunicipalityRaw(geocodedMunicipality);
          setProvince(geocodedProvince);
          setBarangay(geocodedBarangay);
          setCityCode('');
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
        <LinearGradient
          colors={HEADER_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + 8,
            paddingBottom: 14,
            paddingHorizontal: 16,
          }}
        >
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() => router.back()}
              className="w-8 h-8 rounded-full items-center justify-center active:opacity-70"
              style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
            >
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </Pressable>
            <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#fff', flex: 1 }}>
              {lang === 'en' ? 'Location' : 'Lokasyon'}
            </Text>
          </View>
        </LinearGradient>

        <ScrollView contentContainerClassName="px-4 pt-4 pb-12" keyboardShouldPersistTaps="handled">
          <View className="rounded-2xl border border-cream-200 bg-white p-4">
            <SelectField
              label={lang === 'en' ? 'Region' : 'Rehiyon'}
              placeholder={lang === 'en' ? 'Select region' : 'Pumili ng rehiyon'}
              value={region}
              options={getPhRegions().map((name) => ({ label: name, value: name }))}
              onSelect={setRegion}
            />

            <SelectField
              label={lang === 'en' ? 'City / Municipality' : 'Lungsod / Munisipyo'}
              placeholder={lang === 'en' ? 'Select city / municipality' : 'Pumili ng lungsod / munisipyo'}
              value={cityCode || municipality}
              options={cityOptions.map((c) => ({ label: c.label, value: c.code }))}
              onSelect={setMunicipality}
              disabled={!region}
              disabledHint={lang === 'en' ? 'Select a region first' : 'Pumili muna ng rehiyon'}
            />

            <SelectField
              label={lang === 'en' ? 'Barangay' : 'Barangay'}
              placeholder={lang === 'en' ? 'Select barangay' : 'Pumili ng barangay'}
              value={barangay}
              options={barangayOptions.map((name) => ({ label: name, value: name }))}
              onSelect={setBarangay}
              disabled={!cityCode}
              disabledHint={lang === 'en' ? 'Select a city first' : 'Pumili muna ng lungsod'}
            />

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
