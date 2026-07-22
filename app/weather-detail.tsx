import client from '@/src/api/client';
import { useLanguage } from '@/src/context/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type WeatherRecipe = {
  id: number;
  title: string;
  author: string;
  rating: number;
  thumbs_count: number;
  image_url: string | null;
};

type WeatherToday = {
  title: string;
  body: string;
  data: {
    weather_category: string;
    variant_type: string;
    consecutive_rain_days: number;
    recipe: WeatherRecipe | null;
    show_upgrade_cta: boolean;
  };
};

const CATEGORY_EMOJI: Record<string, string> = {
  sunny: '☀️',
  cloudy: '☁️',
  light_rain: '🌦️',
  heavy_rain: '🌧️',
  extended_rain: '🌧️',
};

async function fetchWeatherToday(): Promise<WeatherToday> {
  const { data } = await client.get('/weather/today');
  return data;
}

export default function WeatherDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang } = useLanguage();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['weather-today'],
    queryFn: fetchWeatherToday,
    staleTime: 5 * 60_000,
  });

  const emoji = CATEGORY_EMOJI[data?.data.weather_category ?? ''] ?? '🔔';
  const recipe = data?.data.recipe ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: insets.top + 12,
          paddingBottom: 16,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={8} className="active:opacity-70">
          <Text style={{ fontSize: 20, color: '#292522' }}>✕</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#6E7B4A" />
        </View>
      ) : isError || !data ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🔔</Text>
          <Text className="text-sm text-ink-soft text-center">
            {lang === 'en'
              ? "Couldn't load today's weather update."
              : 'Hindi ma-load ang weather update ngayon.'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>{emoji}</Text>
          <Text style={{ fontFamily: 'NunitoSans_800ExtraBold', fontSize: 20, color: '#292522', marginBottom: 12 }}>
            {data.title}
          </Text>
          <Text style={{ fontSize: 15, color: '#292522', lineHeight: 22, marginBottom: 20 }}>
            {data.body}
          </Text>

          {recipe && (
            <Pressable
              onPress={() => router.push(`/recipe/${recipe.id}` as any)}
              className="flex-row gap-3 rounded-2xl border border-cream-300 p-3 active:opacity-80"
              style={{ marginBottom: 20 }}
            >
              {recipe.image_url ? (
                <Image
                  source={{ uri: recipe.image_url }}
                  style={{ width: 64, height: 64, borderRadius: 12 }}
                />
              ) : (
                <View
                  style={{
                    width: 64, height: 64, borderRadius: 12,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: '#FFF8E8',
                  }}
                >
                  <Text style={{ fontSize: 24 }}>🍽️</Text>
                </View>
              )}
              <View className="flex-1 justify-center">
                <Text style={{ fontFamily: 'NunitoSans_800ExtraBold', fontSize: 14, color: '#292522' }} numberOfLines={1}>
                  {recipe.title}
                </Text>
                <Text className="text-xs text-ink-soft mt-0.5">
                  {lang === 'en' ? 'by' : 'ni'} {recipe.author}
                </Text>
                <Text className="text-xs text-ink-soft mt-0.5">
                  ⭐ {recipe.rating.toFixed(1)} · 👍 {recipe.thumbs_count}
                </Text>
              </View>
            </Pressable>
          )}

          {data.data.show_upgrade_cta && (
            <Pressable
              onPress={() => router.push('/upgrade' as any)}
              className="rounded-xl items-center active:opacity-80"
              style={{ backgroundColor: '#C45E3A', paddingVertical: 14 }}
            >
              <Text style={{ fontFamily: 'NunitoSans_800ExtraBold', fontSize: 14, color: '#fff' }}>
                {lang === 'en' ? '⭐ Upgrade to Premium' : '⭐ Mag-Premium'}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </View>
  );
}
