import client from '@/src/api/client';
import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Alert, AppState, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PlanPrice = {
  id: number;
  duration: '7d' | '15d' | '1m' | '1y';
  days: number;
  amount: number;
  price: number;
  currency: 'PHP';
};

type Plan = {
  slug: string;
  name: string;
  tagline: string | null;
  max_stores: number;
  max_items_per_store: number;
  prices: PlanPrice[];
};

type BillingCatalog = {
  provider: string;
  payments_enabled: boolean;
  plans: Plan[];
  subscription: {
    id: number | null;
    status: string;
    plan_slug: string;
    plan_name: string;
    current_period_end: string | null;
    grace_ends_at: string | null;
    cancel_at_period_end: boolean;
  };
  entitlements: {
    'stores.max': number;
    'store_items.max_per_store': number;
    [key: string]: string | number | boolean;
  };
};

const durationLabel: Record<string, { en: string; tl: string }> = {
  '7d': { en: '7 days', tl: '7 araw' },
  '15d': { en: '15 days', tl: '15 araw' },
  '1m': { en: '1 month', tl: '1 buwan' },
  '1y': { en: '1 year', tl: '1 taon' },
};

const planEmoji: Record<string, string> = { free: '🌱', basic: '🏪', suki: '⭐', negosyante: '👑' };

export default function SubscriptionScreen() {
  const { lang } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const catalog = useQuery<BillingCatalog>({
    queryKey: ['billing-catalog'],
    queryFn: async () => (await client.get('/billing/plans')).data,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') queryClient.invalidateQueries({ queryKey: ['billing-catalog'] });
    });
    return () => listener.remove();
  }, [queryClient]);

  const checkout = useMutation({
    mutationFn: async (priceId: number) =>
      (await client.post<{ checkout_url: string; session_id: string }>('/billing/checkout', { price_id: priceId })).data,
    onSuccess: async ({ checkout_url }) => {
      await WebBrowser.openBrowserAsync(checkout_url, {
        dismissButtonStyle: 'close',
        showTitle: true,
        enableBarCollapsing: true,
      });
      await queryClient.invalidateQueries({ queryKey: ['billing-catalog'] });
      Alert.alert(
        lang === 'en' ? 'Checking payment' : 'Sinusuri ang bayad',
        lang === 'en'
          ? 'Your plan activates after PayMongo confirms the payment. This usually takes only a moment.'
          : 'Magiging active ang plan kapag kinumpirma ng PayMongo ang bayad. Karaniwan ay ilang sandali lamang.',
      );
    },
    onError: (error: any) => Alert.alert(
      lang === 'en' ? 'Checkout unavailable' : 'Hindi available ang checkout',
      error?.response?.data?.message ?? (lang === 'en' ? 'Please try again shortly.' : 'Subukan muli maya-maya.'),
    ),
  });

  const cancel = useMutation({
    mutationFn: async (id: number) => client.post(`/billing/subscriptions/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-catalog'] });
      Alert.alert('', lang === 'en' ? 'Cancellation scheduled for the end of this billing period.' : 'Naka-schedule ang cancellation sa pagtatapos ng billing period.');
    },
  });

  const data = catalog.data;
  const current = data?.subscription;
  const paidPlans = (data?.plans ?? []).filter((plan) => plan.slug !== 'free');

  return (
    <View className="flex-1 bg-cream-50">
      <View style={{ paddingTop: insets.top + 8 }} className="px-4 pb-3 bg-white border-b border-cream-200">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="w-8 h-8 rounded-full bg-cream-200 items-center justify-center">
            <Ionicons name="arrow-back" size={18} color="#000000" />
          </Pressable>
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 17, color: '#000000', flex: 1 }}>
            {lang === 'en' ? 'Seller Subscription' : 'Seller Subscription'}
          </Text>
          <Pressable onPress={() => catalog.refetch()} disabled={catalog.isFetching}>
            <Ionicons name="refresh" size={20} color="#C45E3A" />
          </Pressable>
        </View>
      </View>

      {catalog.isLoading || !data ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#E7653B" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
          refreshControl={<RefreshControl refreshing={catalog.isFetching} onRefresh={() => catalog.refetch()} tintColor="#386641" />}
        >
          <View className="bg-white rounded-2xl border border-cream-200 p-4 mb-4">
            <View className="flex-row items-center gap-3">
              <Text style={{ fontSize: 26 }}>{planEmoji[current?.plan_slug ?? 'free'] ?? '🏪'}</Text>
              <View className="flex-1">
                <Text className="text-xs text-ink-soft">{lang === 'en' ? 'Current plan' : 'Kasalukuyang plan'}</Text>
                <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 19, color: '#000000' }}>{current?.plan_name}</Text>
                <Text className="text-xs text-ink-soft">Status: {current?.status.replace('_', ' ')}</Text>
              </View>
            </View>

            <View className="mt-3 rounded-xl bg-cream-50 p-3">
              <Text className="text-xs text-ink-soft">
                {data.entitlements['stores.max']} {lang === 'en' ? 'store(s)' : 'tindahan'} · {data.entitlements['store_items.max_per_store']} {lang === 'en' ? 'items per store' : 'items bawat tindahan'}
              </Text>
              {current?.current_period_end && (
                <Text className="text-xs text-ink-soft mt-1">
                  {lang === 'en' ? 'Access until' : 'Access hanggang'} {new Date(current.current_period_end).toLocaleDateString()}
                </Text>
              )}
              {current?.status === 'grace_period' && current.grace_ends_at && (
                <Text className="text-xs font-semibold mt-1" style={{ color: '#C4881C' }}>
                  {lang === 'en' ? 'Grace period ends' : 'Matatapos ang grace period'} {new Date(current.grace_ends_at).toLocaleDateString()}
                </Text>
              )}
            </View>

            {current?.id && ['active', 'grace_period'].includes(current.status) && !current.cancel_at_period_end && (
              <Pressable
                className="mt-3 items-center py-2"
                onPress={() => Alert.alert(
                  lang === 'en' ? 'Cancel subscription?' : 'I-cancel ang subscription?',
                  lang === 'en' ? 'Your access continues until the current period ends.' : 'Magpapatuloy ang access hanggang matapos ang kasalukuyang period.',
                  [{ text: lang === 'en' ? 'Keep plan' : 'Panatilihin', style: 'cancel' }, { text: lang === 'en' ? 'Cancel at period end' : 'I-cancel sa period end', style: 'destructive', onPress: () => cancel.mutate(current.id!) }],
                )}
              >
                <Text className="text-xs text-ink-soft">{lang === 'en' ? 'Cancel at period end' : 'I-cancel sa period end'}</Text>
              </Pressable>
            )}
          </View>

          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 18, color: '#000000', marginBottom: 10 }}>
            {lang === 'en' ? 'Choose a seller plan' : 'Pumili ng seller plan'}
          </Text>

          {paidPlans.map((plan) => (
            <View key={plan.slug} className="bg-white rounded-2xl border border-cream-200 p-4 mb-3">
              <View className="flex-row items-center gap-2 mb-1">
                <Text style={{ fontSize: 21 }}>{planEmoji[plan.slug] ?? '🏪'}</Text>
                <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 17, color: '#000000', flex: 1 }}>{plan.name}</Text>
                {current?.plan_slug === plan.slug && <Text className="text-[12px] font-bold text-leaf-700">CURRENT</Text>}
              </View>
              {!!plan.tagline && <Text className="text-xs text-ink-soft mb-1">{plan.tagline}</Text>}
              <Text className="text-xs text-ink-soft mb-3">
                {plan.max_stores} {lang === 'en' ? 'store(s)' : 'tindahan'} · {plan.max_items_per_store} {lang === 'en' ? 'items each' : 'items bawat isa'}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {plan.prices.map((price) => (
                  <Pressable
                    key={price.id}
                    disabled={checkout.isPending || !data.payments_enabled}
                    onPress={() => checkout.mutate(price.id)}
                    className="rounded-xl border border-cream-300 bg-cream-50 px-3 py-2 active:opacity-70 disabled:opacity-50"
                  >
                    <Text className="text-[12px] text-ink-soft">{durationLabel[price.duration]?.[lang === 'en' ? 'en' : 'tl']}</Text>
                    <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 15, color: '#C45E3A' }}>₱{price.price}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          <View className="flex-row items-center justify-center gap-1 mt-2">
            <Ionicons name="shield-checkmark-outline" size={14} color="#6F655A" />
            <Text className="text-[12px] text-ink-soft">{lang === 'en' ? 'Secure checkout powered by PayMongo' : 'Secure checkout gamit ang PayMongo'}</Text>
          </View>
          {!data.payments_enabled && (
            <Text className="mt-2 text-center text-xs text-red-600">
              {lang === 'en' ? 'Checkout is temporarily unavailable.' : 'Pansamantalang hindi available ang checkout.'}
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}
