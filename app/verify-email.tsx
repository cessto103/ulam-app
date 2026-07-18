import { resendEmailVerification, verifyEmail } from '@/src/api/auth';
import BrandLogo from '@/src/components/BrandLogo';
import { FoodDoodles } from '@/src/components/ULamLogo';
import { useAuth } from '@/src/context/AuthContext';
import { useLanguage } from '@/src/context/LanguageContext';
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

export default function VerifyEmailScreen() {
  const { lang } = useLanguage();
  const router = useRouter();
  const { user, refreshUser, signOut } = useAuth();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    setError('');
    try {
      await verifyEmail(code.trim());
      await refreshUser();
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(errorMessage(e, lang === 'en' ? 'Something went wrong. Please try again.' : 'May error. Subukan ulit.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    setResent(false);
    try {
      await resendEmailVerification();
      setResent(true);
    } catch (e: any) {
      setError(errorMessage(e, lang === 'en' ? 'Something went wrong. Please try again.' : 'May error. Subukan ulit.'));
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-cream-100"
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View pointerEvents="none" className="absolute bottom-0 left-0 right-0">
        <FoodDoodles />
      </View>

      <ScrollView contentContainerClassName="flex-grow px-6 py-10" keyboardShouldPersistTaps="handled">
        <View className="items-center mt-2 mb-8">
          <BrandLogo size={44} />
        </View>

        <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 24, color: '#000000', marginBottom: 4 }}>
          {lang === 'en' ? 'Verify your email' : 'I-verify ang iyong email'}
        </Text>
        <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#6E7B4A', marginBottom: 24 }}>
          {lang === 'en'
            ? `We sent a 6-digit code to ${user?.email ?? 'your email'}. Enter it below to finish setting up your account.`
            : `Nagpadala kami ng 6-digit na code sa ${user?.email ?? 'iyong email'}. Ilagay ito para matapos i-set up ang account mo.`}
        </Text>

        {error ? (
          <View className="mb-4 rounded-xl bg-danger-light px-4 py-3">
            <Text className="text-xs text-danger">{error}</Text>
          </View>
        ) : null}

        {resent ? (
          <View className="mb-4 rounded-xl bg-leaf-50 px-4 py-3">
            <Text className="text-xs text-leaf-700">
              {lang === 'en' ? 'A new code is on its way.' : 'Paparating na ang bagong code.'}
            </Text>
          </View>
        ) : null}

        <Text className="text-xs font-semibold text-ink-soft mb-1.5">
          {lang === 'en' ? 'Verification code' : 'Verification code'}
        </Text>
        <TextInput
          className="w-full rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3.5 text-lg text-ink mb-5 text-center"
          style={{ letterSpacing: 8 }}
          placeholder="000000"
          placeholderTextColor="#B0A18C"
          value={code}
          onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
        />

        <Pressable
          onPress={handleVerify}
          disabled={loading || code.length !== 6}
          className="w-full rounded-2xl bg-brand-600 py-4 items-center active:opacity-80 disabled:opacity-60"
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 15, color: 'white' }}>
              {lang === 'en' ? 'Verify' : 'I-verify'}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={handleResend} disabled={resending} className="mt-4 items-center">
          {resending ? (
            <ActivityIndicator color="#E7653B" size="small" />
          ) : (
            <Text className="text-xs font-semibold text-brand-600">
              {lang === 'en' ? 'Resend code' : 'Muling ipadala ang code'}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={() => signOut()} className="mt-8 items-center">
          <Text className="text-xs text-ink-soft">
            {lang === 'en' ? 'Not you? Log out' : 'Hindi ikaw? Mag-log out'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
