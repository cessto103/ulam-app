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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="rounded-2xl border border-cream-200 bg-white p-4 mb-4">
      <Text className="text-xs font-semibold text-ink-soft uppercase mb-3">{title}</Text>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const { user, signOut, refreshUser } = useAuth();
  const { lang, setLang } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ── Location ──────────────────────────────────────────────────────────
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

      // Best-effort prefill from reverse geocoding — user can still edit any field after.
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
        // Reverse geocoding is best-effort; the GPS pin itself still saves below.
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

  // ── Secondary email ──────────────────────────────────────────────────
  const [addingEmail, setAddingEmail]   = useState(false);
  const [newEmail, setNewEmail]         = useState('');
  const [codeStep, setCodeStep]         = useState(false);
  const [code, setCode]                 = useState('');

  const { mutate: requestCode, isPending: requestingCode } = useMutation({
    mutationFn: async () => client.post('/user/secondary-email/request', { email: newEmail.trim() }),
    onSuccess: async () => {
      await refreshUser();
      setCodeStep(true);
    },
    onError: (e: any) => Alert.alert(lang === 'en' ? 'Could not send code' : 'Hindi maipadala', errorMessage(e, 'Something went wrong.')),
  });

  const { mutate: verifyCode, isPending: verifyingCode } = useMutation({
    mutationFn: async () => client.post('/user/secondary-email/verify', { code: code.trim() }),
    onSuccess: async () => {
      await refreshUser();
      setAddingEmail(false);
      setCodeStep(false);
      setNewEmail('');
      setCode('');
      Alert.alert(lang === 'en' ? 'Verified' : 'Na-verify', lang === 'en' ? 'Secondary email confirmed.' : 'Nakumpirma ang secondary email.');
    },
    onError: (e: any) => Alert.alert(lang === 'en' ? 'Verification failed' : 'Hindi na-verify', errorMessage(e, 'Something went wrong.')),
  });

  const { mutate: removeEmail, isPending: removingEmail } = useMutation({
    mutationFn: async () => client.delete('/user/secondary-email'),
    onSuccess: async () => {
      await refreshUser();
      setAddingEmail(false);
      setCodeStep(false);
      setNewEmail('');
      setCode('');
    },
    onError: (e: any) => Alert.alert(lang === 'en' ? 'Error' : 'Error', errorMessage(e, 'Something went wrong.')),
  });

  const isVerified = !!user?.secondary_email_verified_at;
  const isPending  = !!user?.secondary_email && !isVerified;

  // ── Account deletion ──────────────────────────────────────────────────
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);

  const confirmDeleteAccount = () => {
    Alert.alert(
      lang === 'en' ? 'Delete your account?' : 'Burahin ang account?',
      lang === 'en'
        ? 'This permanently deletes everything. There is no way to recover your account afterwards.'
        : 'Permanenteng mabubura ang lahat. Wala nang paraan para maibalik ang iyong account.',
      [
        { text: lang === 'en' ? 'Cancel' : 'Kanselahin', style: 'cancel' },
        {
          text: lang === 'en' ? 'Delete forever' : 'Burahin nang tuluyan',
          style: 'destructive',
          onPress: async () => {
            setDeleteBusy(true);
            try {
              await client.delete('/auth/account', { data: { password: deletePassword } });
              await signOut();
              router.replace('/(auth)/welcome' as any);
            } catch (e: any) {
              Alert.alert(
                lang === 'en' ? 'Could not delete account' : 'Hindi mabura ang account',
                errorMessage(e, lang === 'en' ? 'Something went wrong.' : 'May error.')
              );
            } finally {
              setDeleteBusy(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      lang === 'en' ? 'Log Out' : 'Mag-log Out',
      lang === 'en' ? 'Are you sure you want to log out?' : 'Sigurado ka bang gusto mong mag-log out?',
      [
        { text: lang === 'en' ? 'Cancel' : 'Kanselahin', style: 'cancel' },
        {
          text: lang === 'en' ? 'Log Out' : 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
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
              <Ionicons name="arrow-back" size={18} color="#292522" />
            </Pressable>
            <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#292522', flex: 1 }}>
              {lang === 'en' ? 'Settings' : 'Mga Setting'}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerClassName="px-4 pt-4 pb-12" keyboardShouldPersistTaps="handled">
          {/* Language */}
          <SectionCard title={lang === 'en' ? 'Language' : 'Wika'}>
            <View className="flex-row bg-cream-100 rounded-xl p-1">
              {([
                { key: 'en' as const, label: 'English' },
                { key: 'tl' as const, label: 'Tagalog' },
              ]).map((opt) => {
                const active = lang === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setLang(opt.key)}
                    className={`flex-1 items-center py-2 rounded-lg ${active ? 'bg-brand-500' : ''}`}
                  >
                    <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-ink-soft'}`}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </SectionCard>

          {/* Location */}
          <SectionCard title={lang === 'en' ? 'Location' : 'Lokasyon'}>
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
                      ? (lang === 'en' ? 'Location pinned — tap to update' : 'Na-pin ang lokasyon — i-tap para i-update')
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
          </SectionCard>

          {/* Secondary email */}
          <SectionCard title={lang === 'en' ? 'Secondary Email' : 'Pangalawang Email'}>
            {user?.secondary_email && !addingEmail ? (
              <View>
                <View className="flex-row items-center gap-2 mb-1">
                  <Text className="text-sm font-medium text-ink flex-1">{user.secondary_email}</Text>
                  {isVerified ? (
                    <View className="flex-row items-center gap-1 rounded-full bg-leaf-50 px-2 py-1">
                      <Ionicons name="checkmark-circle" size={12} color="#386641" />
                      <Text className="text-[12px] font-semibold text-leaf-700">{lang === 'en' ? 'Verified' : 'Na-verify'}</Text>
                    </View>
                  ) : (
                    <View className="rounded-full bg-gold-50 px-2 py-1">
                      <Text className="text-[12px] font-semibold text-gold-700">{lang === 'en' ? 'Pending' : 'Naghihintay'}</Text>
                    </View>
                  )}
                </View>

                {isPending && (
                  <Pressable onPress={() => setCodeStep(true)} className="mb-2">
                    <Text className="text-xs text-brand-600 font-medium">{lang === 'en' ? 'Enter verification code' : 'Ilagay ang code'}</Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() => removeEmail()}
                  disabled={removingEmail}
                  className="mt-2 rounded-xl border border-red-200 bg-red-50 py-2.5 items-center active:opacity-70"
                >
                  {removingEmail ? (
                    <ActivityIndicator color="#DC2626" size="small" />
                  ) : (
                    <Text className="text-xs font-semibold text-red-600">{lang === 'en' ? 'Remove' : 'Alisin'}</Text>
                  )}
                </Pressable>
              </View>
            ) : !addingEmail ? (
              <Pressable
                onPress={() => setAddingEmail(true)}
                className="flex-row items-center justify-center gap-2 rounded-xl border border-cream-200 bg-cream-50 py-3 active:opacity-70"
              >
                <Ionicons name="add-circle-outline" size={16} color="#E7653B" />
                <Text className="text-sm font-semibold text-brand-600">{lang === 'en' ? 'Add secondary email' : 'Magdagdag ng email'}</Text>
              </Pressable>
            ) : !codeStep ? (
              <View>
                <TextInput
                  className="bg-cream-50 rounded-xl px-4 py-3.5 text-sm text-ink mb-3 border border-cream-200"
                  placeholder="you@example.com"
                  placeholderTextColor="#B0A18C"
                  value={newEmail}
                  onChangeText={setNewEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => setAddingEmail(false)}
                    className="flex-1 rounded-xl border border-cream-200 py-3 items-center active:opacity-70"
                  >
                    <Text className="text-xs font-semibold text-ink-soft">{lang === 'en' ? 'Cancel' : 'Kanselahin'}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => requestCode()}
                    disabled={requestingCode || !newEmail.trim()}
                    className="flex-1 rounded-xl bg-brand-600 py-3 items-center active:opacity-80 disabled:opacity-60"
                  >
                    {requestingCode ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text className="text-xs font-semibold text-white">{lang === 'en' ? 'Send code' : 'Ipadala ang code'}</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <View>
                <Text className="text-xs text-ink-soft mb-2">
                  {lang === 'en'
                    ? `We sent a 6-digit code to ${user?.secondary_email ?? newEmail}.`
                    : `Nagpadala kami ng 6-digit code sa ${user?.secondary_email ?? newEmail}.`}
                </Text>
                <TextInput
                  className="bg-cream-50 rounded-xl px-4 py-3.5 text-lg tracking-[8px] text-center text-ink mb-3 border border-cream-200"
                  placeholder="000000"
                  placeholderTextColor="#B0A18C"
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <View className="flex-row gap-2 mb-2">
                  <Pressable
                    onPress={() => { setCodeStep(false); setCode(''); }}
                    className="flex-1 rounded-xl border border-cream-200 py-3 items-center active:opacity-70"
                  >
                    <Text className="text-xs font-semibold text-ink-soft">{lang === 'en' ? 'Back' : 'Bumalik'}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => verifyCode()}
                    disabled={verifyingCode || code.length !== 6}
                    className="flex-1 rounded-xl bg-brand-600 py-3 items-center active:opacity-80 disabled:opacity-60"
                  >
                    {verifyingCode ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text className="text-xs font-semibold text-white">{lang === 'en' ? 'Verify' : 'I-verify'}</Text>
                    )}
                  </Pressable>
                </View>
                <Pressable onPress={() => requestCode()} disabled={requestingCode}>
                  <Text className="text-xs text-brand-600 font-medium text-center">{lang === 'en' ? 'Resend code' : 'Muling ipadala'}</Text>
                </Pressable>
              </View>
            )}
          </SectionCard>

          {/* Help & Support */}
          <Pressable
            onPress={() => router.push('/help' as any)}
            className="flex-row items-center gap-3 rounded-2xl border border-cream-200 bg-white p-4 mb-4 active:opacity-70"
          >
            <View className="w-10 h-10 rounded-xl bg-gold-50 items-center justify-center">
              <Text className="text-lg">💬</Text>
            </View>
            <Text className="flex-1 text-sm font-semibold text-ink">
              {lang === 'en' ? 'Help & Support' : 'Tulong at Suporta'}
            </Text>
            <Text className="text-ink-soft text-base">›</Text>
          </Pressable>

          {/* Logout */}
          <Pressable
            onPress={handleLogout}
            className="w-full rounded-xl border border-red-200 bg-red-50 py-3 items-center active:opacity-70"
          >
            <Text className="text-sm font-semibold text-red-600">{lang === 'en' ? 'Log Out' : 'Mag-log Out'}</Text>
          </Pressable>

          {/* Danger zone */}
          <View className="rounded-2xl border border-red-200 bg-white p-4 mt-6">
            <Text className="text-xs font-semibold text-red-600 uppercase mb-2">
              {lang === 'en' ? 'Danger Zone' : 'Mapanganib na Aksyon'}
            </Text>
            <Text className="text-xs text-ink-soft mb-3">
              {lang === 'en'
                ? 'Deleting your account permanently removes your profile, recipes, posts, stores, and all other data. This cannot be undone.'
                : 'Ang pagbura ng account ay permanenteng mag-aalis ng iyong profile, mga recipe, post, tindahan, at lahat ng iba pang datos. Hindi ito maibabalik.'}
            </Text>
            {!deletingAccount ? (
              <Pressable
                onPress={() => setDeletingAccount(true)}
                className="w-full rounded-xl border border-red-300 py-3 items-center active:opacity-70"
              >
                <Text className="text-sm font-semibold text-red-600">
                  {lang === 'en' ? 'Delete Account' : 'Burahin ang Account'}
                </Text>
              </Pressable>
            ) : (
              <View>
                <Text className="text-xs font-medium text-ink-soft mb-1.5">
                  {lang === 'en' ? 'Enter your password to confirm' : 'Ilagay ang password para kumpirmahin'}
                </Text>
                <TextInput
                  className="bg-cream-50 rounded-xl px-4 py-3.5 text-sm text-ink mb-3 border border-cream-200"
                  placeholder="••••••••"
                  placeholderTextColor="#B0A18C"
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  secureTextEntry
                />
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => { setDeletingAccount(false); setDeletePassword(''); }}
                    className="flex-1 rounded-xl border border-cream-200 py-3 items-center active:opacity-70"
                  >
                    <Text className="text-xs font-semibold text-ink-soft">{lang === 'en' ? 'Cancel' : 'Kanselahin'}</Text>
                  </Pressable>
                  <Pressable
                    onPress={confirmDeleteAccount}
                    disabled={deleteBusy || !deletePassword}
                    className="flex-1 rounded-xl py-3 items-center active:opacity-80 disabled:opacity-50"
                    style={{ backgroundColor: '#DC2626' }}
                  >
                    {deleteBusy ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text className="text-xs font-semibold text-white">
                        {lang === 'en' ? 'Delete forever' : 'Burahin nang tuluyan'}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
