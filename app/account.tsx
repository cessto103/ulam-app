import client from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
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

const DIETARY_OPTIONS = [
  { key: 'vegetarian', label: '🥗 Vegetarian' },
  { key: 'vegan',      label: '🌿 Vegan' },
  { key: 'halal',      label: '🟢 Halal' },
  { key: 'diabetic',   label: '💊 Diabetic-friendly' },
  { key: 'low_sodium', label: '🧂 Low Sodium' },
  { key: 'gluten_free',label: '🌾 Gluten-free' },
];

export default function AccountScreen() {
  const { user, signOut, refreshUser } = useAuth();
  const { lang } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ── Profile ──────────────────────────────────────────────────────────
  const [name, setName]                   = useState(user?.name ?? '');
  const [username, setUsername]           = useState(user?.username ?? '');
  const [bio, setBio]                     = useState(user?.bio ?? '');
  const [householdSize, setHouseholdSize] = useState(user?.household_size ?? 1);
  const [gender, setGender]               = useState<'male' | 'female' | null>(user?.gender ?? null);
  const [dietaryPrefs, setDietaryPrefs]   = useState<string[]>(user?.dietary_preferences ?? []);

  const toggleDietary = (key: string) => {
    setDietaryPrefs((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const { mutate: saveProfile, isPending: savingProfile } = useMutation({
    mutationFn: async () =>
      client.patch('/user/profile', {
        name: name.trim(),
        username: username.trim() || undefined,
        bio: bio.trim() || null,
        household_size: householdSize,
        gender: gender,
        dietary_preferences: dietaryPrefs,
      }),
    onSuccess: async () => {
      await refreshUser();
      Alert.alert(lang === 'en' ? 'Saved' : 'Na-save', lang === 'en' ? 'Profile updated.' : 'Na-update ang profile.');
    },
    onError: (e: any) => Alert.alert(lang === 'en' ? "Couldn't save" : 'Hindi na-save', errorMessage(e, 'Something went wrong.')),
  });

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

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
              {lang === 'en' ? 'My Account' : 'Aking Account'}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerClassName="px-4 pt-4 pb-12" keyboardShouldPersistTaps="handled">
          {/* Profile */}
          <SectionCard title={lang === 'en' ? 'Profile' : 'Profile'}>
            <Text className="text-xs font-medium text-ink-soft mb-1.5">{lang === 'en' ? 'Name' : 'Pangalan'}</Text>
            <TextInput
              className="bg-cream-50 rounded-xl px-4 py-3.5 text-sm text-ink mb-3 border border-cream-200"
              placeholder={lang === 'en' ? 'Full name' : 'Buong pangalan'}
              placeholderTextColor="#B0A18C"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <Text className="text-xs font-medium text-ink-soft mb-1.5">Username</Text>
            <View className="flex-row items-center bg-cream-50 rounded-xl border border-cream-200 mb-3 overflow-hidden">
              <Text className="text-sm text-ink-faint pl-4">@</Text>
              <TextInput
                className="flex-1 px-2 py-3.5 text-sm text-ink"
                placeholder="username"
                placeholderTextColor="#B0A18C"
                value={username}
                onChangeText={(v) => setUsername(v.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text className="text-xs font-medium text-ink-soft mb-1.5">Bio</Text>
            <TextInput
              className="bg-cream-50 rounded-xl px-4 py-3 text-sm text-ink mb-1 border border-cream-200 min-h-[72px]"
              placeholder={lang === 'en' ? 'Write something about yourself...' : 'Isulat ang tungkol sa iyo...'}
              placeholderTextColor="#B0A18C"
              value={bio}
              onChangeText={setBio}
              multiline
              maxLength={300}
            />
            <Text className="text-xs text-ink-soft text-right mb-3">{bio.length}/300</Text>

            <Text className="text-xs font-medium text-ink-soft mb-2">{lang === 'en' ? 'Household Size' : 'Laki ng Pamilya'}</Text>
            <View className="flex-row items-center gap-4 mb-4">
              <Pressable
                onPress={() => setHouseholdSize((s) => Math.max(1, s - 1))}
                className="w-10 h-10 rounded-full bg-cream-200 items-center justify-center active:opacity-70"
              >
                <Text className="text-lg text-ink">−</Text>
              </Pressable>
              <Text className="text-lg font-semibold text-ink min-w-[32px] text-center">{householdSize}</Text>
              <Pressable
                onPress={() => setHouseholdSize((s) => Math.min(20, s + 1))}
                className="w-10 h-10 rounded-full bg-cream-200 items-center justify-center active:opacity-70"
              >
                <Text className="text-lg text-ink">+</Text>
              </Pressable>
              <Text className="text-xs text-ink-soft">
                {lang === 'en' ? (householdSize === 1 ? 'person' : 'people') : 'tao'}
              </Text>
            </View>

            <Text className="text-xs font-medium text-ink-soft mb-2">
              {lang === 'en' ? 'How should we address you?' : 'Paano ka namin tatawagin?'}
            </Text>
            <View className="flex-row gap-2 mb-4">
              <Pressable
                onPress={() => setGender(gender === 'male' ? null : 'male')}
                className={`px-4 py-2 rounded-full border ${gender === 'male' ? 'bg-brand-600 border-brand-600' : 'bg-cream-50 border-cream-200'}`}
              >
                <Text className={`text-xs font-medium ${gender === 'male' ? 'text-white' : 'text-ink-soft'}`}>
                  {lang === 'en' ? '👨 Male' : '👨 Lalaki'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setGender(gender === 'female' ? null : 'female')}
                className={`px-4 py-2 rounded-full border ${gender === 'female' ? 'bg-brand-600 border-brand-600' : 'bg-cream-50 border-cream-200'}`}
              >
                <Text className={`text-xs font-medium ${gender === 'female' ? 'text-white' : 'text-ink-soft'}`}>
                  {lang === 'en' ? '👩 Female' : '👩 Babae'}
                </Text>
              </Pressable>
            </View>

            <Text className="text-xs font-medium text-ink-soft mb-2">Dietary Preferences</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {DIETARY_OPTIONS.map((opt) => {
                const active = dietaryPrefs.includes(opt.key);
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => toggleDietary(opt.key)}
                    className={`rounded-full px-3 py-1.5 ${active ? 'bg-olive-400' : 'bg-cream-200'}`}
                  >
                    <Text className={`text-xs font-medium ${active ? 'text-white' : 'text-ink-soft'}`}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => saveProfile()}
              disabled={savingProfile || !name.trim()}
              className="w-full rounded-xl bg-brand-600 py-3.5 items-center active:opacity-80 disabled:opacity-60"
            >
              {savingProfile ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-sm font-semibold text-white">{lang === 'en' ? 'Save Profile' : 'I-save ang Profile'}</Text>
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

          {/* Danger zone */}
          <View className="rounded-2xl border border-red-200 bg-white p-4 mt-2">
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
