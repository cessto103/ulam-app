import { register } from '@/src/api/auth';
import LanguageSwitcher from '@/src/components/LanguageSwitcher';
import { useLanguage } from '@/src/context/LanguageContext';
import { useAuth } from '@/src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

function PasswordStrength({ password }: { password: string }) {
  const { t } = useLanguage();
  const len = password.length;
  const hasUpper = /[A-Z]/.test(password);
  const hasNum = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const score = (len >= 8 ? 1 : 0) + (hasUpper ? 1 : 0) + (hasNum ? 1 : 0) + (hasSymbol ? 1 : 0);

  if (!password) return null;

  const colors = ['#E24B4A', '#F4B942', '#F4B942', '#6E7B4A', '#386641'];
  const labels = ['', t('pw_weak'), t('pw_medium'), t('pw_strong'), t('pw_very_strong')];

  return (
    <View className="mt-2">
      <View className="flex-row gap-1">
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            className="flex-1 rounded-sm"
            style={{ height: 3, backgroundColor: i < score ? colors[score] : '#F0DEBB' }}
          />
        ))}
      </View>
      <Text className="text-xs mt-1" style={{ color: colors[score] }}>{labels[score]}</Text>
    </View>
  );
}

/** Terracotta icon pinned inside the left edge of an input. */
function FieldIcon({ name }: { name: keyof typeof Ionicons.glyphMap }) {
  return (
    <View className="absolute left-4 top-0 bottom-0 justify-center z-10" pointerEvents="none">
      <Ionicons name={name} size={17} color="#E7653B" />
    </View>
  );
}

export default function RegisterScreen() {
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleRegister = async () => {
    setLoading(true);
    setErrors({});
    try {
      const { token, user } = await register(form);
      await signIn(token, user);
      router.replace('/(tabs)');
    } catch (e: any) {
      const data = e?.response?.data;
      if (data?.errors) {
        const flat: Record<string, string> = {};
        Object.entries(data.errors).forEach(([k, v]: any) => { flat[k] = v[0]; });
        setErrors(flat);
      } else {
        setErrors({ general: data?.message ?? 'Registration failed.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-cream-100"
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'android' ? 30 : 0}
    >
      <ScrollView
        contentContainerClassName="flex-grow px-6 py-8"
        keyboardShouldPersistTaps="handled"
      >
        {/* Top row: back + language */}
        <View className="flex-row justify-between items-center mb-8">
          <Link href="/(auth)/welcome" asChild>
            <Pressable hitSlop={8}>
              <Text className="text-sm font-semibold text-brand-500">{t('back')}</Text>
            </Pressable>
          </Link>
          <LanguageSwitcher tone="warm" />
        </View>

        <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 27, color: '#292522', marginBottom: 2 }}>{t('create_account')}</Text>
        <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#6E7B4A', marginBottom: 28 }}>{t('signup_free')}</Text>

        {errors.general ? (
          <View className="mb-4 rounded-xl bg-danger-light px-4 py-3">
            <Text className="text-xs text-danger">{errors.general}</Text>
          </View>
        ) : null}

        {/* Name */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-ink mb-1.5">{t('full_name')}</Text>
          <View className="relative">
            <FieldIcon name="person" />
            <TextInput
              className={`w-full rounded-2xl border pl-11 pr-4 py-3.5 text-sm text-ink bg-cream-50 ${errors.name ? 'border-danger' : 'border-cream-300'}`}
              placeholder="Juan dela Cruz"
              placeholderTextColor="#B0A18C"
              value={form.name}
              onChangeText={(v) => set('name', v)}
              autoCapitalize="words"
              autoComplete="name"
            />
          </View>
          {errors.name ? <Text className="mt-1 text-xs text-danger">{errors.name}</Text> : null}
        </View>

        {/* Username */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-ink mb-1.5">Username</Text>
          <View className="relative">
            <FieldIcon name="at" />
            <TextInput
              className={`w-full rounded-2xl border pl-11 pr-4 py-3.5 text-sm text-ink bg-cream-50 ${errors.username ? 'border-danger' : 'border-cream-300'}`}
              placeholder="juandc"
              placeholderTextColor="#B0A18C"
              value={form.username}
              onChangeText={(v) => set('username', v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              autoCapitalize="none"
            />
          </View>
          {errors.username ? (
            <Text className="mt-1 text-xs text-danger">{errors.username}</Text>
          ) : form.username.length >= 3 ? (
            <Text className="mt-1 text-xs text-leaf-600">{t('available')}</Text>
          ) : null}
        </View>

        {/* Email */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-ink mb-1.5">{t('email')}</Text>
          <View className="relative">
            <FieldIcon name="mail-outline" />
            <TextInput
              className={`w-full rounded-2xl border pl-11 pr-4 py-3.5 text-sm text-ink bg-cream-50 ${errors.email ? 'border-danger' : 'border-cream-300'}`}
              placeholder="juan@email.com"
              placeholderTextColor="#B0A18C"
              value={form.email}
              onChangeText={(v) => set('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>
          {errors.email ? <Text className="mt-1 text-xs text-danger">{errors.email}</Text> : null}
        </View>

        {/* Password */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-ink mb-1.5">{t('password')}</Text>
          <View className="relative">
            <FieldIcon name="lock-closed" />
            <TextInput
              className={`w-full rounded-2xl border pl-11 pr-20 py-3.5 text-sm text-ink bg-cream-50 ${errors.password ? 'border-danger' : 'border-cream-300'}`}
              placeholder="••••••••"
              placeholderTextColor="#B0A18C"
              value={form.password}
              onChangeText={(v) => set('password', v)}
              secureTextEntry={!showPassword}
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-0 bottom-0 justify-center px-1"
            >
              <Text className="text-xs font-semibold text-ink">
                {showPassword ? t('hide_password') : t('show_password')}
              </Text>
            </Pressable>
          </View>
          <PasswordStrength password={form.password} />
          {errors.password ? <Text className="mt-1 text-xs text-danger">{errors.password}</Text> : null}
        </View>

        {/* Confirm password */}
        <View className="mb-8">
          <Text className="text-sm font-semibold text-ink mb-1.5">{t('confirm_password')}</Text>
          <View className="relative">
            <FieldIcon name="lock-closed" />
            <TextInput
              className={`w-full rounded-2xl border pl-11 pr-20 py-3.5 text-sm text-ink bg-cream-50 ${errors.password_confirmation ? 'border-danger' : 'border-cream-300'}`}
              placeholder="••••••••"
              placeholderTextColor="#B0A18C"
              value={form.password_confirmation}
              onChangeText={(v) => set('password_confirmation', v)}
              secureTextEntry={!showConfirm}
            />
            <Pressable
              onPress={() => setShowConfirm(!showConfirm)}
              className="absolute right-4 top-0 bottom-0 justify-center px-1"
            >
              <Text className="text-xs font-semibold text-ink">
                {showConfirm ? t('hide_password') : t('show_password')}
              </Text>
            </Pressable>
          </View>
          {errors.password_confirmation ? (
            <Text className="mt-1 text-xs text-danger">{errors.password_confirmation}</Text>
          ) : null}
        </View>

        <Pressable
          onPress={handleRegister}
          disabled={loading}
          className="w-full rounded-2xl bg-brand-600 py-4 items-center active:opacity-80 disabled:opacity-60"
          style={{ shadowColor: '#C45E3A', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 15, color: 'white' }}>{t('next_btn')}</Text>
          )}
        </Pressable>

        <Text className="mt-6 text-center text-xs text-ink-soft">
          {t('already_have')}{' '}
          <Link href="/(auth)/login">
            <Text className="font-semibold text-leaf-600">{t('login_link')}</Text>
          </Link>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
