import client from '@/src/api/client';
import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type About = {
  about_title: string;
  about_body: string;
  about_company: string;
  about_company_url: string;
};

export default function AboutScreen() {
  const { lang } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, isLoading } = useQuery({
    queryKey: ['about'],
    queryFn: async () => (await client.get<About>('/about')).data,
    staleTime: 10 * 60_000,
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFCF5' }}>
      <View
        style={{
          paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16,
          backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F9EDD3',
        }}
      >
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="w-8 h-8 rounded-full bg-cream-200 items-center justify-center active:opacity-70">
            <Ionicons name="arrow-back" size={18} color="#000000" />
          </Pressable>
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#000000' }}>
            {lang === 'en' ? 'About the App' : 'Tungkol sa App'}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#386641" style={{ marginTop: 40 }} />
      ) : data ? (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 20, color: '#000000', marginBottom: 12 }}>
            {data.about_title}
          </Text>
          {data.about_body.split('\n').filter((p) => p.trim().length > 0).map((paragraph, i) => (
            <Text
              key={i}
              style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#000000', lineHeight: 22, marginBottom: 12 }}
            >
              {paragraph}
            </Text>
          ))}

          <View style={{ height: 1, backgroundColor: '#F9EDD3', marginVertical: 16 }} />

          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginBottom: 4 }}>
            {lang === 'en' ? 'Created by' : 'Ginawa ni'}
          </Text>
          <Pressable onPress={() => Linking.openURL(data.about_company_url)}>
            <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 15, color: '#E7653B' }}>
              {data.about_company}
            </Text>
          </Pressable>
        </ScrollView>
      ) : (
        <Text className="text-sm text-ink-soft text-center mt-10">
          {lang === 'en' ? 'Could not load this page.' : 'Hindi ma-load ang pahinang ito.'}
        </Text>
      )}
    </View>
  );
}
