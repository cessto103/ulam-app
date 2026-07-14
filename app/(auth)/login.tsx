import { login } from '@/src/api/auth';
import LanguageSwitcher from '@/src/components/LanguageSwitcher';
import BrandLogo from '@/src/components/BrandLogo';
import { FoodDoodles } from '@/src/components/ULamLogo';
import { useLanguage } from '@/src/context/LanguageContext';
import { useAuth } from '@/src/context/AuthContext';
import Constants from 'expo-constants';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
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

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!loginValue || !password) return;
    setLoading(true);
    setError('');
    try {
      const { token, user } = await login({ login: loginValue, password });
      await signIn(token, user);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(
        e?.response?.data?.message ??
          (e?.message === 'Network Error'
            ? t('login_network_error')
            : 'Login failed. Check your credentials.')
      );
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
      {/* faint produce line-art footer */}
      <View pointerEvents="none" className="absolute bottom-0 left-0 right-0">
        <FoodDoodles />
      </View>

      <ScrollView
        contentContainerClassName="flex-grow px-6 py-10"
        keyboardShouldPersistTaps="handled"
      >
        {/* Language switcher */}
        <View className="items-end mb-2">
          <LanguageSwitcher tone="warm" />
        </View>

        {/* Logo */}
        <View className="items-center mt-4 mb-8">
          <BrandLogo size={52} />
        </View>

        <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 27, color: '#292522', marginBottom: 2 }}>{t('welcome_back')}</Text>
        <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#6E7B4A', marginBottom: 28 }}>{t('login_subtitle')}</Text>

        {error ? (
          <View className="mb-4 rounded-xl bg-danger-light px-4 py-3">
            <Text className="text-xs text-danger">{error}</Text>
          </View>
        ) : null}

        {/* Email or username */}
        <View className="mb-3">
          <Text className="text-xs font-semibold text-ink-soft mb-1.5">{t('email_or_username')}</Text>
          <TextInput
            className="w-full rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3.5 text-sm text-ink"
            placeholder="juan@email.com / juandelacruz"
            placeholderTextColor="#B0A18C"
            value={loginValue}
            onChangeText={setLoginValue}
            autoCapitalize="none"
            autoComplete="username"
          />
        </View>

        {/* Password */}
        <View className="mb-2">
          <Text className="text-xs font-semibold text-ink-soft mb-1.5">{t('password')}</Text>
          <View className="relative">
            <TextInput
              className="w-full rounded-2xl border border-cream-300 bg-cream-50 pl-4 pr-20 py-3.5 text-sm text-ink"
              placeholder="••••••••"
              placeholderTextColor="#B0A18C"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-0 bottom-0 justify-center px-1"
            >
              <Text className="text-xs font-semibold text-brand-600">
                {showPassword ? t('hide_password') : t('show_password')}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Forgot */}
        <View className="items-end mb-5">
          <Pressable onPress={() => router.push('/(auth)/forgot-password' as any)} hitSlop={8}>
            <Text className="text-xs font-semibold text-brand-600">{t('forgot_password')}</Text>
          </Pressable>
        </View>

        {/* Login button */}
        <Pressable
          onPress={handleLogin}
          disabled={loading}
          className="w-full rounded-2xl bg-brand-600 py-4 items-center active:opacity-80 disabled:opacity-60"
          style={{ shadowColor: '#C45E3A', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 15, color: 'white' }}>{t('login_btn')}</Text>
          )}
        </Pressable>

        {/* Divider */}
        <View className="flex-row items-center gap-3 my-5">
          <View className="flex-1 h-px bg-cream-300" />
          <Text className="text-xs text-ink-soft">{t('or')}</Text>
          <View className="flex-1 h-px bg-cream-300" />
        </View>

        {/* Google (placeholder) */}
        <Pressable className="w-full rounded-2xl border border-cream-300 bg-white py-3.5 items-center flex-row justify-center gap-2 active:opacity-70">
          <Text className="text-sm">🔵</Text>
          <Text className="text-sm text-ink">{t('google_login')}</Text>
        </Pressable>

        {/* Sign up link */}
        <Text className="mt-8 text-center text-xs text-ink-soft">
          {t('no_account')}{' '}
          <Link href="/(auth)/register">
            <Text className="font-semibold text-brand-600">{t('sign_up')}</Text>
          </Link>
        </Text>

        <Text className="mt-6 text-center text-xs text-cream-400">v{APP_VERSION}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
