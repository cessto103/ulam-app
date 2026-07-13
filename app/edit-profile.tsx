import client from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { useLanguage } from '@/src/context/LanguageContext';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

const DIETARY_OPTIONS = [
  { key: 'vegetarian', label: '🥗 Vegetarian' },
  { key: 'vegan',      label: '🌿 Vegan' },
  { key: 'halal',      label: '🟢 Halal' },
  { key: 'diabetic',   label: '💊 Diabetic-friendly' },
  { key: 'low_sodium', label: '🧂 Low Sodium' },
  { key: 'gluten_free',label: '🌾 Gluten-free' },
];

export default function EditProfileScreen() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const { lang } = useLanguage();

  const [name, setName]                       = useState(user?.name ?? '');
  const [username, setUsername]               = useState(user?.username ?? '');
  const [bio, setBio]                         = useState(user?.bio ?? '');
  const [householdSize, setHouseholdSize]     = useState(user?.household_size ?? 1);
  const [dietaryPrefs, setDietaryPrefs]       = useState<string[]>(user?.dietary_preferences ?? []);
  const [saving, setSaving]                   = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
      setUsername(user.username ?? '');
      setBio(user.bio ?? '');
      setHouseholdSize(user.household_size ?? 1);
      setDietaryPrefs(user.dietary_preferences ?? []);
    }
  }, [user?.id]);

  const toggleDietary = (key: string) => {
    setDietaryPrefs((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert(
        lang === 'en' ? 'Name required' : 'Kailangan ng pangalan',
        lang === 'en' ? 'Please fill in your name.' : 'Punan ang iyong pangalan.'
      );
      return;
    }
    setSaving(true);
    try {
      await client.patch('/user/profile', {
        name:                 name.trim(),
        username:             username.trim() || undefined,
        bio:                  bio.trim() || null,
        household_size:       householdSize,
        dietary_preferences:  dietaryPrefs,
      });
      await refreshUser();
      router.back();
    } catch (e: any) {
      const errors = e?.response?.data?.errors;
      const msg = errors
        ? Object.values(errors).flat().join('\n')
        : (e?.response?.data?.message ?? (lang === 'en' ? 'Something went wrong. Please try again.' : 'May error. Subukan ulit.'));
      Alert.alert(lang === 'en' ? 'Couldn\'t save' : 'Hindi na-save', msg);
    } finally {
      setSaving(false);
    }
  };

  const initials = (user?.name ?? 'U').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="px-4 pt-4 pb-12"
      keyboardShouldPersistTaps="handled"
    >
      {/* Avatar */}
      <View className="items-center mb-6">
        <View className="w-20 h-20 rounded-full bg-brand-500 items-center justify-center mb-2">
          <Text className="text-2xl font-bold text-white">{initials}</Text>
        </View>
        <Text className="text-xs text-ink-soft">Avatar upload — coming soon</Text>
      </View>

      {/* Name */}
      <Text className="text-xs font-medium text-ink-soft mb-1.5">{lang === 'en' ? 'Name' : 'Pangalan'}</Text>
      <TextInput
        className="bg-cream-50 rounded-xl px-4 py-3.5 text-sm text-ink mb-4 border border-cream-200"
        placeholder={lang === 'en' ? 'Full name' : 'Buong pangalan'}
        placeholderTextColor="#B0A18C"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />

      {/* Username */}
      <Text className="text-xs font-medium text-ink-soft mb-1.5">Username</Text>
      <View className="flex-row items-center bg-cream-50 rounded-xl border border-cream-200 mb-4 overflow-hidden">
        <Text className="text-sm text-ink-soft pl-4">@</Text>
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

      {/* Bio */}
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
      <Text className="text-xs text-ink-soft text-right mb-4">{bio.length}/300</Text>

      {/* Household size */}
      <Text className="text-xs font-medium text-ink-soft mb-2">{lang === 'en' ? 'Household Size' : 'Laki ng Pamilya'}</Text>
      <View className="flex-row items-center gap-4 mb-4">
        <Pressable
          onPress={() => setHouseholdSize((s) => Math.max(1, s - 1))}
          className="w-10 h-10 rounded-full bg-cream-200 items-center justify-center active:opacity-70"
        >
          <Text className="text-lg text-ink">−</Text>
        </Pressable>
        <Text className="text-lg font-semibold text-ink min-w-[32px] text-center">
          {householdSize}
        </Text>
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

      {/* Dietary preferences */}
      <Text className="text-xs font-medium text-ink-soft mb-2">Dietary Preferences</Text>
      <View className="flex-row flex-wrap gap-2 mb-6">
        {DIETARY_OPTIONS.map((opt) => {
          const active = dietaryPrefs.includes(opt.key);
          return (
            <Pressable
              key={opt.key}
              onPress={() => toggleDietary(opt.key)}
              className={`rounded-full px-3 py-1.5 ${active ? 'bg-olive-400' : 'bg-cream-200'}`}
            >
              <Text className={`text-xs font-medium ${active ? 'text-white' : 'text-ink-soft'}`}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Save button */}
      <Pressable
        onPress={save}
        disabled={saving}
        className="w-full rounded-xl bg-brand-600 py-4 items-center active:opacity-80 disabled:opacity-60"
      >
        {saving ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-sm font-semibold text-white">{lang === 'en' ? 'Save Profile' : 'I-save ang Profile'}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
