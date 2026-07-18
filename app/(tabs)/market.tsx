import client from '@/src/api/client';
import { SkeletonListItem } from '@/src/components/Skeleton';
import { useLanguage } from '@/src/context/LanguageContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useState } from 'react';

type MarketPrice = {
  id: number;
  item_name: string;
  price_per_unit: number;
  unit: string;
  tindahan?: { name: string };
  created_at: string;
};

async function fetchPrices(search: string) {
  const { data } = await client.get('/prices', { params: { search, limit: 30 } });
  return (data.prices ?? []) as MarketPrice[];
}

export default function MarketScreen() {
  const { lang } = useLanguage();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: prices = [], isLoading } = useQuery({
    queryKey: ['market-prices', search],
    queryFn: () => fetchPrices(search),
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['market-prices'] });
    setRefreshing(false);
  };

  return (
    <ScrollView
      className="flex-1 bg-cream-50"
      contentContainerClassName="px-4 py-6"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#386641" colors={['#386641']} />}
    >
      <View className="rounded-2xl bg-brand-500 p-5 mb-5">
        <Text className="text-white font-bold text-base">{lang === 'en' ? 'Market Prices 🏪' : 'Palengke Prices 🏪'}</Text>
        <Text className="text-brand-100 text-xs mt-1">Latest prices from local markets</Text>
      </View>

      <TextInput
        className="w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-sm text-ink mb-4"
        placeholder={lang === 'en' ? 'Search item (e.g. rice, chicken...)' : 'Search item (e.g. bigas, manok...)'}
        placeholderTextColor="#B0A18C"
        value={search}
        onChangeText={setSearch}
      />

      {isLoading ? (
        <View style={{ paddingTop: 8 }}>
          {[0, 1, 2].map((i) => <SkeletonListItem key={i} />)}
        </View>
      ) : prices.length === 0 ? (
        <View className="items-center mt-10">
          <Text className="text-4xl mb-3">🔍</Text>
          <Text className="font-semibold text-ink mb-1">No prices found</Text>
          <Text className="text-xs text-ink-soft text-center">
            Try searching for a different item.
          </Text>
        </View>
      ) : (
        <View className="space-y-2">
          {prices.map((p) => (
            <View key={p.id} className="flex-row items-center justify-between rounded-xl border border-cream-200 bg-white px-4 py-3">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-ink capitalize">{p.item_name}</Text>
                {p.tindahan && (
                  <Text className="text-xs text-ink-soft">{p.tindahan.name}</Text>
                )}
              </View>
              <Text className="text-sm font-bold text-brand-600">
                ₱{Number(p.price_per_unit).toFixed(2)}/{p.unit}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
