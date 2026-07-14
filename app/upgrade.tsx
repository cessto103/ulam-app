import client from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { useLanguage } from '@/src/context/LanguageContext';
import * as WebBrowser from 'expo-web-browser';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

type Feature = { emoji: string; titleEn: string; titleTl: string; descEn: string; descTl: string; free: boolean };
type RemoteFeature = { emoji: string; title_en: string; title_tl: string; desc_en: string; desc_tl: string; free: boolean };

// Compiled-in fallback — shown until the admin sets a custom list (Content → Monetization).
const DEFAULT_FEATURES: Feature[] = [
  { emoji: '🍳', titleEn: 'AI Meal Planning',   titleTl: 'AI Meal Planning', descEn: 'Get a meal plan every day',                     descTl: 'Humingi ng meal plan araw-araw',            free: false },
  { emoji: '📊', titleEn: 'Budget Tracking',    titleTl: 'Budget Tracking',  descEn: 'Log expenses, track your savings',              descTl: 'Mag-log ng gastos, tingnan ang savings',    free: true  },
  { emoji: '📢', titleEn: 'Price Reporting',    titleTl: 'Price Reporting',  descEn: 'Report and check prices',                       descTl: 'Mag-report at makita ang presyo',           free: true  },
  { emoji: '👥', titleEn: 'Community',          titleTl: 'Komunidad',        descEn: 'Posts, likes, and tips from neighbors',         descTl: 'Mga post, puso, at diskarte ng kapitbahay', free: true  },
  { emoji: '🔓', titleEn: 'Unlimited AI Plans', titleTl: 'Unlimited AI Plans', descEn: 'No limits — as many times as you want',       descTl: 'Walang limitasyon — kahit ilang beses',    free: false },
  { emoji: '⭐', titleEn: 'Premium Recipes',    titleTl: 'Premium Recipes',  descEn: 'Special recipes for the budget-savvy',          descTl: 'Espesyal na mga recipe para sa matipid',    free: false },
  { emoji: '🔔', titleEn: 'Smart Reminders',    titleTl: 'Smart Reminders',  descEn: 'Personalized reminders',                        descTl: 'Personalized na mga paalala',               free: false },
  { emoji: '🚫', titleEn: 'No Ads',             titleTl: 'Walang Ads',       descEn: 'A clean experience, no interruptions',          descTl: 'Malinis na karanasan, walang abala',        free: false },
];

export default function UpgradeScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { lang } = useLanguage();
  const [loading, setLoading] = useState<'monthly' | 'yearly' | null>(null);

  const { data: remoteFeatures } = useQuery({
    queryKey: ['premium-features'],
    queryFn: async () => (await client.get<{ features: RemoteFeature[] }>('/premium-features')).data.features,
    staleTime: 30 * 60_000,
    retry: 1,
  });

  const FEATURES: Feature[] = remoteFeatures?.length
    ? remoteFeatures.map((f) => ({
        emoji: f.emoji, titleEn: f.title_en, titleTl: f.title_tl, descEn: f.desc_en, descTl: f.desc_tl, free: f.free,
      }))
    : DEFAULT_FEATURES;

  const handleCheckout = async (plan: 'monthly' | 'yearly') => {
    setLoading(plan);
    try {
      const { data } = await client.post('/upgrade/checkout', { plan });
      await WebBrowser.openBrowserAsync(data.checkout_url);
      // Browser closed — refresh user to pick up premium status if webhook already fired
      await refreshUser();
      if (user?.plan === 'premium') {
        Alert.alert(
          lang === 'en' ? "🎉 You're Premium!" : '🎉 Premium na!',
          lang === 'en' ? 'Congrats on upgrading to uLam Premium!' : 'Maligayang bati sa iyong pag-upgrade sa uLam Premium!',
        );
        router.back();
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? (lang === 'en' ? 'Could not process payment. Please try again.' : 'Hindi ma-proseso ang bayad. Subukan ulit.');
      Alert.alert(lang === 'en' ? 'Payment failed' : 'Hindi nagtagumpay', msg);
    } finally {
      setLoading(null);
    }
  };

  if (user?.plan === 'premium') {
    return (
      <View className="flex-1 bg-cream-50 items-center justify-center px-8">
        <Text style={{ fontSize: 48, marginBottom: 16 }}>⭐</Text>
        <Text className="text-lg font-semibold text-ink mb-2 text-center">
          {lang === 'en' ? "You're already Premium!" : 'Premium ka na!'}
        </Text>
        <Text className="text-sm text-ink-soft text-center leading-5 mb-8">
          {lang === 'en'
            ? 'Enjoy all the Premium features. Thanks for your support!'
            : 'Enjoy mo na ang lahat ng Premium features. Salamat sa iyong support!'}
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="rounded-xl bg-brand-600 px-8 py-3 active:opacity-80"
        >
          <Text className="text-sm font-semibold text-white">{lang === 'en' ? 'Go back' : 'Bumalik'}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-cream-50" contentContainerClassName="pb-12">

      {/* Hero */}
      <View
        className="px-6 pt-14 pb-8 items-center"
        style={{ backgroundColor: '#C45E3A' }}
      >
        <Pressable
          onPress={() => router.back()}
          className="absolute left-4 top-12 w-9 h-9 rounded-full bg-white/20 items-center justify-center active:opacity-70"
        >
          <Text className="text-white text-base">←</Text>
        </Pressable>

        <Text style={{ fontSize: 40, marginBottom: 8 }}>✨</Text>
        <Text style={{ fontFamily: 'Baloo2_800ExtraBold', fontSize: 28, color: 'white', marginBottom: 8, textAlign: 'center' }}>uLam Premium</Text>
        <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 20 }}>
          {lang === 'en'
            ? 'Unlock everything — meal plans, premium recipes, and more.'
            : 'I-unlock ang lahat — meal plans, premium recipes, at higit pa.'}
        </Text>

        {/* Pricing cards */}
        <View className="flex-row gap-3 mt-8 w-full">
          {/* Monthly */}
          <View className="flex-1 bg-white/10 rounded-2xl p-4 border border-white/20">
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.9)', marginBottom: 2 }}>
              {lang === 'en' ? 'Monthly' : 'Buwanin'}
            </Text>
            <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 22, color: 'white' }}>₱59</Text>
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>
              {lang === 'en' ? 'per month' : 'bawat buwan'}
            </Text>
          </View>
          {/* Yearly — highlighted */}
          <View
            className="flex-1 rounded-2xl p-4"
            style={{ backgroundColor: 'rgba(229,162,111,0.18)', borderWidth: 2, borderColor: '#E5A26F' }}
          >
            <View className="flex-row items-center justify-between mb-1">
              <Text style={{ fontSize: 12, color: '#E5A26F' }}>{lang === 'en' ? 'Yearly' : 'Taon-taon'}</Text>
              <View className="rounded-full px-1.5 py-0.5" style={{ backgroundColor: '#E5A26F' }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#3C3A2F' }}>{lang === 'en' ? 'SAVE' : 'MATIPID'}</Text>
              </View>
            </View>
            <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 22, color: 'white' }}>₱499</Text>
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: '#E5A26F' }}>
              {lang === 'en' ? '₱41.58/month' : '₱41.58/buwan'}
            </Text>
          </View>
        </View>
      </View>

      {/* Features */}
      <View className="px-4 pt-5">
        <Text className="text-xs font-medium text-ink-soft uppercase tracking-wider mb-3">
          {lang === 'en' ? 'Included in Premium' : 'Kasama sa Premium'}
        </Text>

        <View className="bg-white rounded-2xl border border-cream-200 overflow-hidden mb-4">
          {FEATURES.map((f, i) => (
            <View
              key={f.titleEn}
              className={`flex-row items-center gap-3 px-4 py-3 ${
                i < FEATURES.length - 1 ? 'border-b border-cream-200' : ''
              }`}
              style={{ opacity: f.free ? 0.55 : 1 }}
            >
              <Text style={{ fontSize: 18, width: 24 }}>{f.emoji}</Text>
              <View className="flex-1">
                <Text className="text-sm font-medium text-ink">{lang === 'en' ? f.titleEn : f.titleTl}</Text>
                <Text className="text-xs text-ink-soft">{lang === 'en' ? f.descEn : f.descTl}</Text>
              </View>
              {f.free ? (
                <Text className="text-xs text-ink-soft">{lang === 'en' ? 'Free' : 'Libre'}</Text>
              ) : (
                <View className="rounded-full bg-leaf-50 px-2 py-0.5">
                  <Text className="text-xs font-semibold text-leaf-700">Premium</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* CTA buttons */}
        <Pressable
          onPress={() => handleCheckout('yearly')}
          disabled={!!loading}
          className="w-full rounded-xl bg-brand-600 py-3.5 items-center mb-3 active:opacity-80 disabled:opacity-60"
          style={{ shadowColor: '#C45E3A', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
        >
          {loading === 'yearly'
            ? <ActivityIndicator color="white" />
            : <Text className="text-sm font-semibold text-white">
                {lang === 'en' ? 'Upgrade via GCash — ₱499/year' : 'Mag-upgrade via GCash — ₱499/taon'}
              </Text>
          }
        </Pressable>

        <Pressable
          onPress={() => handleCheckout('monthly')}
          disabled={!!loading}
          className="w-full rounded-xl border border-cream-300 py-3.5 items-center mb-6 active:opacity-70 disabled:opacity-60"
        >
          {loading === 'monthly'
            ? <ActivityIndicator color="#6E7B4A" />
            : <Text className="text-sm font-medium text-ink-soft">
                {lang === 'en' ? 'Monthly — ₱59/month' : 'Buwanin — ₱59/buwan'}
              </Text>
          }
        </Pressable>

        <Text className="text-xs text-ink-soft text-center leading-5">
          {lang === 'en' ? (
            <>Cancel anytime. No hidden fees.{'\n'}Payments are processed by PayMongo (GCash).</>
          ) : (
            <>Maaaring kanselahin kahit kailan. Walang karagdagang bayad.{'\n'}Ang payment ay pinoproseso ng PayMongo (GCash).</>
          )}
        </Text>
      </View>
    </ScrollView>
  );
}
