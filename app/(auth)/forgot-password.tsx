import client from '@/src/api/client';
import BrandLogo from '@/src/components/BrandLogo';
import { FoodDoodles } from '@/src/components/ULamLogo';
import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

function errorMessage(e: any, fallback: string): string {
  const errors = e?.response?.data?.errors;
  if (errors) return Object.values(errors).flat().join('\n');
  return e?.response?.data?.message ?? fallback;
}

export default function ForgotPasswordScreen() {
  const { lang } = useLanguage();
  const router = useRouter();

  const [step, setStep] = useState<'email' | 'reset' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const requestCode = async () => {
    setLoading(true);
    setError('');
    try {
      await client.post('/auth/forgot-password', { email: email.trim() });
      setStep('reset');
    } catch (e: any) {
      setError(errorMessage(e, lang === 'en' ? 'Something went wrong. Please try again.' : 'May error. Subukan ulit.'));
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async () => {
    setLoading(true);
    setError('');
    try {
      await client.post('/auth/reset-password', {
        email: email.trim(),
        code: code.trim(),
        password,
        password_confirmation: passwordConfirm,
      });
      setStep('done');
    } catch (e: any) {
      setError(errorMessage(e, lang === 'en' ? 'Something went wrong. Please try again.' : 'May error. Subukan ulit.'));
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
      <View pointerEvents="none" className="absolute bottom-0 left-0 right-0">
        <FoodDoodles />
      </View>

      <ScrollView contentContainerClassName="flex-grow px-6 py-10" keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={10} className="w-9 h-9 rounded-full bg-cream-200 items-center justify-center active:opacity-70 mb-4">
          <Ionicons name="arrow-back" size={18} color="#292522" />
        </Pressable>

        <View className="items-center mt-2 mb-8">
          <BrandLogo size={44} />
        </View>

        {step === 'email' && (
          <>
            <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 24, color: '#292522', marginBottom: 4 }}>
              {lang === 'en' ? 'Forgot your password?' : 'Nakalimutan ang password?'}
            </Text>
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#6E7B4A', marginBottom: 24 }}>
              {lang === 'en'
                ? "Enter your account's email and we'll send a 6-digit reset code."
                : 'Ilagay ang email ng iyong account at magpapadala kami ng 6-digit na code.'}
            </Text>

            {error ? (
              <View className="mb-4 rounded-xl bg-danger-light px-4 py-3">
                <Text className="text-xs text-danger">{error}</Text>
              </View>
            ) : null}

            <Text className="text-xs font-semibold text-ink-soft mb-1.5">Email</Text>
            <TextInput
              className="w-full rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3.5 text-sm text-ink mb-5"
              placeholder="juan@email.com"
              placeholderTextColor="#B0A18C"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
            />

            <Pressable
              onPress={requestCode}
              disabled={loading || !email.trim()}
              className="w-full rounded-2xl bg-brand-600 py-4 items-center active:opacity-80 disabled:opacity-60"
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 15, color: 'white' }}>
                  {lang === 'en' ? 'Send reset code' : 'Ipadala ang code'}
                </Text>
              )}
            </Pressable>
          </>
        )}

        {step === 'reset' && (
          <>
            <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 24, color: '#292522', marginBottom: 4 }}>
              {lang === 'en' ? 'Check your email' : 'Tingnan ang iyong email'}
            </Text>
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#6E7B4A', marginBottom: 24 }}>
              {lang === 'en'
                ? `We sent a 6-digit code to ${email.trim()}. Enter it below with your new password.`
                : `Nagpadala kami ng 6-digit na code sa ${email.trim()}. Ilagay ito kasama ang bagong password.`}
            </Text>

            {error ? (
              <View className="mb-4 rounded-xl bg-danger-light px-4 py-3">
                <Text className="text-xs text-danger">{error}</Text>
              </View>
            ) : null}

            <Text className="text-xs font-semibold text-ink-soft mb-1.5">{lang === 'en' ? 'Reset code' : 'Reset code'}</Text>
            <TextInput
              className="w-full rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3.5 text-lg text-ink mb-4 text-center"
              style={{ letterSpacing: 8 }}
              placeholder="000000"
              placeholderTextColor="#B0A18C"
              value={code}
              onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
            />

            <Text className="text-xs font-semibold text-ink-soft mb-1.5">{lang === 'en' ? 'New password' : 'Bagong password'}</Text>
            <View className="relative mb-4">
              <TextInput
                className="w-full rounded-2xl border border-cream-300 bg-cream-50 pl-4 pr-20 py-3.5 text-sm text-ink"
                placeholder="••••••••"
                placeholderTextColor="#B0A18C"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-0 bottom-0 justify-center px-1"
              >
                <Text className="text-xs font-semibold text-brand-600">
                  {showPassword ? (lang === 'en' ? 'Hide' : 'Itago') : (lang === 'en' ? 'Show' : 'Ipakita')}
                </Text>
              </Pressable>
            </View>

            <Text className="text-xs font-semibold text-ink-soft mb-1.5">{lang === 'en' ? 'Confirm new password' : 'Ulitin ang bagong password'}</Text>
            <TextInput
              className="w-full rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3.5 text-sm text-ink mb-5"
              placeholder="••••••••"
              placeholderTextColor="#B0A18C"
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              secureTextEntry={!showPassword}
            />

            <Pressable
              onPress={submitReset}
              disabled={loading || code.length !== 6 || !password || !passwordConfirm}
              className="w-full rounded-2xl bg-brand-600 py-4 items-center active:opacity-80 disabled:opacity-60"
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 15, color: 'white' }}>
                  {lang === 'en' ? 'Reset password' : 'I-reset ang password'}
                </Text>
              )}
            </Pressable>

            <Pressable onPress={requestCode} disabled={loading} className="mt-4 items-center">
              <Text className="text-xs font-semibold text-brand-600">
                {lang === 'en' ? 'Resend code' : 'Muling ipadala ang code'}
              </Text>
            </Pressable>
          </>
        )}

        {step === 'done' && (
          <>
            <View className="items-center mb-6">
              <Text style={{ fontSize: 56 }}>✅</Text>
            </View>
            <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 24, color: '#292522', marginBottom: 4, textAlign: 'center' }}>
              {lang === 'en' ? 'Password updated!' : 'Na-update ang password!'}
            </Text>
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#6E7B4A', marginBottom: 24, textAlign: 'center' }}>
              {lang === 'en'
                ? 'You can now log in with your new password.'
                : 'Maaari ka nang mag-login gamit ang bagong password.'}
            </Text>
            <Pressable
              onPress={() => router.replace('/(auth)/login' as any)}
              className="w-full rounded-2xl bg-brand-600 py-4 items-center active:opacity-80"
            >
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 15, color: 'white' }}>
                {lang === 'en' ? 'Back to login' : 'Bumalik sa login'}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
